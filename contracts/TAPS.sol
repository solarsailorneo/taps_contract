// SPDX-License-Identifier: MITWalletConfig
pragma solidity ^0.8.4;

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

interface IERC721 {
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
}

interface IERC1155 {
    function safeTransferFrom(address from, address to, uint256 id, uint256 value, bytes calldata data) external;
}

interface IERC165 {
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

contract TAPS {
    struct UserWallets {
        address mintingWallet;
        address transactionWallet;
        address socialVault;
        address coldVault;
        address secondaryApprover;
        uint256 lastConfigChange;
    }

    mapping(address => UserWallets) public userWalletConfigs;
    mapping(address => address) public walletToColdMapping;

    enum CommitmentMode { NotSet, SigningCold, NonSigningCold }
    mapping(address => CommitmentMode) public commitmentModes;

    // Events
    event WalletConfigSet(address indexed user);
    event Vaulted(address indexed user, address indexed to, uint256 amount, address tokenAddress, uint256 tokenId);
    event Unvaulted(address indexed user, address indexed to, uint256 amount, address tokenAddress, uint256 tokenId);

    // Define the enum
    enum WalletType { Mint, Transaction, Social, Cold }

    // Define mappings for valid vaulting and unvaulting combinations
    mapping(WalletType => WalletType[]) private validVaultingCombinations;
    mapping(WalletType => WalletType[]) private validUnvaultingCombinations;

    constructor() {
        // Initialize valid combinations for vaulting
        validVaultingCombinations[WalletType.Mint] = [WalletType.Cold, WalletType.Social, WalletType.Transaction];
        validVaultingCombinations[WalletType.Transaction] = [WalletType.Cold, WalletType.Social];
        validVaultingCombinations[WalletType.Social] = [WalletType.Cold];

        // Initialize valid combinations for unvaulting
        validUnvaultingCombinations[WalletType.Cold] = [WalletType.Social, WalletType.Transaction];
        validUnvaultingCombinations[WalletType.Social] = [WalletType.Transaction];
    }

    function setAllWalletAndVaultConfigsSigningCold(
        address _mintingWallet, 
        address _transactionWallet, 
        address _socialVault, 
        address _coldVault, 
        bytes memory mintingWalletSignature,
        bytes memory transactionWalletSignature,
        bytes memory socialVaultSignature,
        bytes memory coldVaultSignature
    ) external {
        _setAllWalletAndVaultConfigs(
            _mintingWallet,
            _transactionWallet,
            _socialVault,
            _coldVault,
            mintingWalletSignature,
            transactionWalletSignature,
            socialVaultSignature,
            coldVaultSignature,
            CommitmentMode.SigningCold
        );
    }

    function setAllWalletAndVaultConfigsNonSigningCold(
        address _mintingWallet, 
        address _transactionWallet, 
        address _socialVault, 
        address _coldVault, 
        bytes memory mintingWalletSignature,
        bytes memory transactionWalletSignature,
        bytes memory socialVaultSignature
    ) external {
        _setAllWalletAndVaultConfigs(
            _mintingWallet,
            _transactionWallet,
            _socialVault,
            _coldVault,
            mintingWalletSignature,
            transactionWalletSignature,
            socialVaultSignature,
            "",
            CommitmentMode.NonSigningCold
        );
    }

    function _setAllWalletAndVaultConfigs(
        address _mintingWallet, 
        address _transactionWallet, 
        address _socialVault, 
        address _coldVault, 
        bytes memory mintingWalletSignature,
        bytes memory transactionWalletSignature,
        bytes memory socialVaultSignature,
        bytes memory coldVaultSignature,
        CommitmentMode mode
    ) private {
        require(commitmentModes[_coldVault] == CommitmentMode.NotSet, "Commitment mode already set");
        require(
            _mintingWallet != _transactionWallet && 
            _mintingWallet != _socialVault && 
            _mintingWallet != _coldVault &&
            _transactionWallet != _socialVault &&
            _transactionWallet != _coldVault &&
            _socialVault != _coldVault,
            "Wallet and vault addresses must be unique"
        );

        // Construct the message that wallets/vaults should have signed
        bytes32 message = keccak256(abi.encodePacked("Approve setup for TAPS Contract at ", address(this)));
        bytes32 ethSignedMessage = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", message));

        // Ensure the recovered addresses match the provided addresses using the verifySignature function
        require(verifySignature(ethSignedMessage, mintingWalletSignature, _mintingWallet), "Minting wallet signature mismatch");
        require(verifySignature(ethSignedMessage, transactionWalletSignature, _transactionWallet), "Transaction wallet signature mismatch");
        require(verifySignature(ethSignedMessage, socialVaultSignature, _socialVault), "Social vault signature mismatch");
        if (mode == CommitmentMode.SigningCold) {
            require(msg.sender == _coldVault, "Transaction must be initiated by the cold vault");
            require(verifySignature(ethSignedMessage, coldVaultSignature, _coldVault), "Cold vault signature mismatch");
        } else {
            require(msg.sender == _socialVault, "Transaction must be initiated by the social vault");
        }

        UserWallets storage config = userWalletConfigs[_coldVault];
        config.mintingWallet = _mintingWallet;
        config.transactionWallet = _transactionWallet;
        config.socialVault = _socialVault;
        config.coldVault = _coldVault;

        // Update reverse mappings
        walletToColdMapping[_mintingWallet] = _coldVault;
        walletToColdMapping[_transactionWallet] = _coldVault;
        walletToColdMapping[_socialVault] = _coldVault;

        commitmentModes[_coldVault] = mode;

        emit WalletConfigSet(_coldVault);
    }

    function swapMintingWallet(address _newMintingWallet, bytes memory newMintingWalletSignature) external {
        _swapWallet(_newMintingWallet, newMintingWalletSignature, WalletType.Mint);
    }

    function swapTransactionWallet(address _newTransactionWallet, bytes memory newTransactionWalletSignature) external {
        _swapWallet(_newTransactionWallet, newTransactionWalletSignature, WalletType.Transaction);
    }

    function swapSocialVault(address _newSocialVault, bytes memory newSocialVaultSignature) external {
        _swapWallet(_newSocialVault, newSocialVaultSignature, WalletType.Social);
    }

    function _swapWallet(address _newWallet, bytes memory newWalletSignature, WalletType walletType) private {
        require(_newWallet != address(0), "Invalid wallet address");

        bytes32 message = keccak256(abi.encodePacked("Approve wallet swap for TAPS Contract at ", address(this)));
        bytes32 ethSignedMessage = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", message));

        require(verifySignature(ethSignedMessage, newWalletSignature, _newWallet), "Wallet signature mismatch");

        address _coldVault = getColdWalletForSender(msg.sender);
        UserWallets storage config = userWalletConfigs[_coldVault];

        CommitmentMode mode = commitmentModes[_coldVault];
        require(
            (mode == CommitmentMode.SigningCold && msg.sender == _coldVault) ||
            (mode == CommitmentMode.NonSigningCold && msg.sender == config.socialVault),
            "Invalid sender for the current mode"
        );

        if (walletType == WalletType.Mint) {
            require(config.mintingWallet != address(0), "Minting wallet not set yet");
            config.mintingWallet = _newWallet;
        } else if (walletType == WalletType.Transaction) {
            require(config.transactionWallet != address(0), "Transaction wallet not set yet");
            config.transactionWallet = _newWallet;
        } else if (walletType == WalletType.Social) {
            require(config.socialVault != address(0), "Social vault not set yet");
            config.socialVault = _newWallet;
        }

        walletToColdMapping[_newWallet] = _coldVault;
    }

    function vaultETH(WalletType _toType) external payable {
        address _coldVault = getColdWalletForSender(msg.sender);
        UserWallets storage config = userWalletConfigs[_coldVault];
        require(msg.value > 0, "Amount should be greater than 0");

        WalletType senderType = _getSenderType(msg.sender, config);
        address destination = _getDestination(_coldVault, _toType);

        // Validate the sender-destination combination using a mapping
        require(isValidVaulting(senderType, _toType), "Invalid sender-destination combination");

        payable(destination).transfer(msg.value);
        emit Vaulted(msg.sender, destination, msg.value, address(0), 0);
    }

    function unvaultETH(WalletType _toType) external payable {
        address _coldVault = getColdWalletForSender(msg.sender);
        UserWallets storage config = userWalletConfigs[_coldVault];
        require(msg.value > 0, "Amount should be greater than 0");

        WalletType senderType = _getSenderType(msg.sender, config);
        address destination = _getDestination(_coldVault, _toType);

        // Validate the sender-destination combination using a mapping
        require(isValidUnvaulting(_coldVault, senderType, _toType), "Invalid sender-destination combination");

        payable(destination).transfer(msg.value);
        emit Unvaulted(msg.sender, destination, msg.value, address(0), 0);
    }

    function isValidVaulting(WalletType senderType, WalletType destinationType) private view returns (bool) {
        WalletType[] memory validDestinations = validVaultingCombinations[senderType];
        for (uint i = 0; i < validDestinations.length; i++) {
            if (validDestinations[i] == destinationType) {
                return true;
            }
        }
        return false;
    }

    function isValidUnvaulting(address _coldVault, WalletType senderType, WalletType destinationType) private view returns (bool) {
        if (commitmentModes[_coldVault] == CommitmentMode.NonSigningCold && senderType == WalletType.Cold) {
            return false; // Disallow unvaulting from cold vault in NonSigningCold mode
        }

        WalletType[] memory validDestinations = validUnvaultingCombinations[senderType];
        for (uint i = 0; i < validDestinations.length; i++) {
            if (validDestinations[i] == destinationType) {
                return true;
            }
        }
        return false;
    }

    function _transferToken(address _from, address _to, address _token, uint256 _amountOrTokenId) internal {
        if (IERC165(_token).supportsInterface(0x80ac58cd)) { // ERC721
            IERC721(_token).safeTransferFrom(_from, _to, _amountOrTokenId);
        } else if (IERC165(_token).supportsInterface(0xd9b67a26)) { // ERC1155
            IERC1155(_token).safeTransferFrom(_from, _to, _amountOrTokenId, 1, "");
        } else { // Assume ERC20
            IERC20(_token).transferFrom(_from, _to, _amountOrTokenId);
        }
    }

    function vaultToken(WalletType _toType, address _token, uint256 _amountOrTokenId) external {
        address _coldVault = getColdWalletForSender(msg.sender);
        UserWallets storage config = userWalletConfigs[_coldVault];
        
        WalletType senderType = _getSenderType(msg.sender, config);
        address destination = _getDestination(_coldVault, _toType);

        // Validate the sender-destination combination using a mapping
        require(isValidVaulting(senderType, _toType), "Invalid sender-destination combination");

        _transferToken(msg.sender, destination, _token, _amountOrTokenId);
        emit Vaulted(msg.sender, destination, _amountOrTokenId, _token, _amountOrTokenId);
    }

    function unvaultToken(WalletType _toType, address _token, uint256 _amountOrTokenId) external {
        address _coldVault = getColdWalletForSender(msg.sender);
        UserWallets storage config = userWalletConfigs[_coldVault];
        
        WalletType senderType = _getSenderType(msg.sender, config);
        address destination = _getDestination(_coldVault, _toType);

        // Validate the sender-destination combination using a mapping
        require(isValidUnvaulting(_coldVault, senderType, _toType), "Invalid sender-destination combination");

        _transferToken(msg.sender, destination, _token, _amountOrTokenId);
        emit Unvaulted(msg.sender, destination, _amountOrTokenId, _token, _amountOrTokenId);
    }

    function _getDestination(address _coldVault, WalletType _toType) internal view returns (address) {
        UserWallets storage config = userWalletConfigs[_coldVault];
        if (_toType == WalletType.Transaction) {
            return config.transactionWallet;
        } else if (_toType == WalletType.Social) {
            return config.socialVault;
        } else if (_toType == WalletType.Cold) {
            return config.coldVault;
        } else {
            revert("Invalid destination wallet type");
        }
    }

    function _getSenderType(address sender, UserWallets storage config) internal view returns (WalletType) {
        if (sender == config.mintingWallet) {
            return WalletType.Mint;
        } else if (sender == config.transactionWallet) {
            return WalletType.Transaction;
        } else if (sender == config.socialVault) {
            return WalletType.Social;
        } else if (sender == config.coldVault) {
            return WalletType.Cold;
        } else {
            revert("Invalid sender wallet type");
        }
    }

    function verifySignature(bytes32 ethSignedMessage, bytes memory signature, address expectedAddress) internal pure returns (bool) {
        (bytes32 r, bytes32 s, uint8 v) = splitSignature(signature);
        address recoveredAddress = ecrecover(ethSignedMessage, v, r, s);
        return recoveredAddress == expectedAddress;
    }

    function splitSignature(bytes memory sig)
        internal
        pure
        returns (bytes32 r, bytes32 s, uint8 v)
    {
        require(sig.length == 65, "Invalid signature length");

        assembly {
            // First 32 bytes, after the length prefix
            r := mload(add(sig, 32))
            // Second 32 bytes
            s := mload(add(sig, 64))
            // Final byte (first byte of the next 32 bytes)
            v := byte(0, mload(add(sig, 96)))
        }

        return (r, s, v);
    }

    function getColdWalletForSender(address sender) public view returns (address) {
        address coldWallet = walletToColdMapping[sender];
        if (coldWallet != address(0)) {
            return coldWallet;
        }
        return sender;
    }

    // Define structs for each token type
    struct ERC20Token {
        address tokenAddress;
        uint256 amount;
    }

    struct ERC721Token {
        address tokenAddress;
        uint256 tokenId;
    }

    struct ERC1155Token {
        address tokenAddress;
        uint256 tokenId;
        uint256 amount;
        bytes data;
    }

    function vaultAll(
        WalletType _toType,
        uint256 ethAmount,
        ERC20Token[] memory erc20Tokens,
        ERC721Token[] memory erc721Tokens,
        ERC1155Token[] memory erc1155Tokens
    ) external payable {
        address _coldVault = getColdWalletForSender(msg.sender);
        UserWallets storage config = userWalletConfigs[_coldVault];
        WalletType senderType = _getSenderType(msg.sender, config);
        address destination = _getDestination(_coldVault, _toType);

        require(isValidVaulting(senderType, _toType), "Invalid sender-destination combination");

        // Transfer ETH
        if (ethAmount > 0) {
            require(msg.value == ethAmount, "Sent ETH does not match specified amount");
            payable(destination).transfer(ethAmount);
            emit Vaulted(msg.sender, destination, ethAmount, address(0), 0);
        }

        // Transfer ERC20 tokens
        for (uint256 i = 0; i < erc20Tokens.length; i++) {
            _transferToken(msg.sender, destination, erc20Tokens[i].tokenAddress, erc20Tokens[i].amount);
            emit Vaulted(msg.sender, destination, erc20Tokens[i].amount, erc20Tokens[i].tokenAddress, erc20Tokens[i].amount);
        }

        // Transfer ERC721 tokens
        for (uint256 i = 0; i < erc721Tokens.length; i++) {
            _transferToken(msg.sender, destination, erc721Tokens[i].tokenAddress, erc721Tokens[i].tokenId);
            emit Vaulted(msg.sender, destination, erc721Tokens[i].tokenId, erc721Tokens[i].tokenAddress, 1);
        }

        // Transfer ERC1155 tokens
        for (uint256 i = 0; i < erc1155Tokens.length; i++) {
            IERC1155(erc1155Tokens[i].tokenAddress).safeTransferFrom(msg.sender, destination, erc1155Tokens[i].tokenId, erc1155Tokens[i].amount, erc1155Tokens[i].data);
            emit Vaulted(msg.sender, destination, erc1155Tokens[i].tokenId, erc1155Tokens[i].tokenAddress, erc1155Tokens[i].amount);
        }
    }

    function unvaultAll(
        WalletType _toType,
        uint256 ethAmount,
        ERC20Token[] memory erc20Tokens,
        ERC721Token[] memory erc721Tokens,
        ERC1155Token[] memory erc1155Tokens
    ) external {
        address _coldVault = getColdWalletForSender(msg.sender);
        UserWallets storage config = userWalletConfigs[_coldVault];
        WalletType senderType = _getSenderType(msg.sender, config);
        address destination = _getDestination(_coldVault, _toType);

        require(isValidUnvaulting(_coldVault, senderType, _toType), "Invalid sender-destination combination");

        // Transfer ETH
        if (ethAmount > 0) {
            payable(msg.sender).transfer(ethAmount);
            emit Unvaulted(msg.sender, destination, ethAmount, address(0), 0);
        }

        // Transfer ERC20 tokens
        for (uint256 i = 0; i < erc20Tokens.length; i++) {
            _transferToken(msg.sender, destination, erc20Tokens[i].tokenAddress, erc20Tokens[i].amount);
            emit Unvaulted(msg.sender, destination, erc20Tokens[i].amount, erc20Tokens[i].tokenAddress, erc20Tokens[i].amount);
        }

        // Transfer ERC721 tokens
        for (uint256 i = 0; i < erc721Tokens.length; i++) {
            _transferToken(msg.sender, destination, erc721Tokens[i].tokenAddress, erc721Tokens[i].tokenId);
            emit Unvaulted(msg.sender, destination, erc721Tokens[i].tokenId, erc721Tokens[i].tokenAddress, 1);
        }

        // Transfer ERC1155 tokens
        for (uint256 i = 0; i < erc1155Tokens.length; i++) {
            IERC1155(erc1155Tokens[i].tokenAddress).safeTransferFrom(destination, msg.sender, erc1155Tokens[i].tokenId, erc1155Tokens[i].amount, erc1155Tokens[i].data);
            emit Unvaulted(msg.sender, destination, erc1155Tokens[i].tokenId, erc1155Tokens[i].tokenAddress, erc1155Tokens[i].amount);
        }
    }
}
