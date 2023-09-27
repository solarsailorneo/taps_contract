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
    mapping(address => address) public mintToColdMapping;
    mapping(address => address) public transactionToColdMapping;
    mapping(address => address) public socialToColdMapping;


    enum CommitmentMode { NotSet, SigningCold, NonSigningCold }
    mapping(address => CommitmentMode) public commitmentModes;


    uint256 public cooldownPeriod = 1 days;

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
        require(commitmentModes[_coldVault] == CommitmentMode.NotSet, "Commitment mode already set");
        require(msg.sender == _coldVault, "Transaction must be initiated by the cold vault");
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
        require(verifySignature(ethSignedMessage, coldVaultSignature, _coldVault), "Cold vault signature mismatch");

        UserWallets storage config = userWalletConfigs[_coldVault];
        config.mintingWallet = _mintingWallet;
        config.transactionWallet = _transactionWallet;
        config.socialVault = _socialVault;
        config.coldVault = _coldVault;

        // Update reverse mappings
        mintToColdMapping[_mintingWallet] = _coldVault;
        transactionToColdMapping[_transactionWallet] = _coldVault;
        socialToColdMapping[_socialVault] = _coldVault;

        commitmentModes[_coldVault] = CommitmentMode.SigningCold;

        emit WalletConfigSet(_coldVault);
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
        require(commitmentModes[_coldVault] == CommitmentMode.NotSet, "Commitment mode already set");
        require(msg.sender == _socialVault, "Transaction must be initiated by the social vault");
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

        UserWallets storage config = userWalletConfigs[_coldVault];
        config.mintingWallet = _mintingWallet;
        config.transactionWallet = _transactionWallet;
        config.socialVault = _socialVault;
        config.coldVault = _coldVault;

        // Update reverse mappings
        mintToColdMapping[_mintingWallet] = _coldVault;
        transactionToColdMapping[_transactionWallet] = _coldVault;
        socialToColdMapping[_socialVault] = _coldVault;

        commitmentModes[_coldVault] = CommitmentMode.NonSigningCold;

        emit WalletConfigSet(_coldVault);
    }

    function swapMintingWallet(address _newMintingWallet, bytes memory newMintingWalletSignature) external {
        require(_newMintingWallet != address(0), "Invalid minting wallet address");

        // Construct the message that the new minting wallet should have signed
        bytes32 message = keccak256(abi.encodePacked("Approve minting wallet swap for TAPS Contract at ", address(this)));
        bytes32 ethSignedMessage = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", message));

        // Ensure the recovered address from the signature matches the new minting wallet address
        require(verifySignature(ethSignedMessage, newMintingWalletSignature, _newMintingWallet), "New minting wallet signature mismatch");

        address _coldVault = getColdWalletForSender(msg.sender);
        UserWallets storage config = userWalletConfigs[_coldVault];

        if (commitmentModes[_coldVault] == CommitmentMode.SigningCold) {
            require(msg.sender == _coldVault, "Only the cold vault can perform this operation in SigningCold mode");
        } else if (commitmentModes[_coldVault] == CommitmentMode.NonSigningCold) {
            require(msg.sender == config.socialVault, "Only the social vault can perform this operation in NonSigningCold mode");
        } else {
            revert("Invalid mode or sender");
        }

        require(config.mintingWallet != address(0), "Minting wallet not set yet");
        require(_newMintingWallet != config.transactionWallet && _newMintingWallet != config.socialVault && _newMintingWallet != config.coldVault, "Address already in use");

        config.mintingWallet = _newMintingWallet;
    }

    function swapTransactionWallet(address _newTransactionWallet, bytes memory newTransactionWalletSignature) external {
        require(_newTransactionWallet != address(0), "Invalid transaction wallet address");

        // Construct the message that the new transaction wallet should have signed
        bytes32 message = keccak256(abi.encodePacked("Approve transaction wallet swap for TAPS Contract at ", address(this)));
        bytes32 ethSignedMessage = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", message));

        // Ensure the recovered address from the signature matches the new transaction wallet address
        require(verifySignature(ethSignedMessage, newTransactionWalletSignature, _newTransactionWallet), "New transaction wallet signature mismatch");

        address _coldVault = getColdWalletForSender(msg.sender);
        UserWallets storage config = userWalletConfigs[_coldVault];

        if (commitmentModes[_coldVault] == CommitmentMode.SigningCold) {
            require(msg.sender == _coldVault, "Only the cold vault can perform this operation in SigningCold mode");
        } else if (commitmentModes[_coldVault] == CommitmentMode.NonSigningCold) {
            require(msg.sender == config.socialVault, "Only the social vault can perform this operation in NonSigningCold mode");
        } else {
            revert("Invalid mode or sender");
        }

        require(config.transactionWallet != address(0), "Transaction wallet not set yet");
        require(_newTransactionWallet != config.mintingWallet && _newTransactionWallet != config.socialVault && _newTransactionWallet != config.coldVault, "Address already in use");

        config.transactionWallet = _newTransactionWallet;
    }

    function swapSocialVault(address _newSocialVault, bytes memory newSocialVaultSignature) external {
        require(_newSocialVault != address(0), "Invalid social vault address");

        // Construct the message that the new social vault should have signed
        bytes32 message = keccak256(abi.encodePacked("Approve social vault swap for TAPS Contract at ", address(this)));
        bytes32 ethSignedMessage = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", message));

        // Ensure the recovered address from the signature matches the new social vault address
        require(verifySignature(ethSignedMessage, newSocialVaultSignature, _newSocialVault), "New social vault signature mismatch");

        address _coldVault = getColdWalletForSender(msg.sender);
        UserWallets storage config = userWalletConfigs[_coldVault];

        if (commitmentModes[_coldVault] == CommitmentMode.SigningCold) {
            require(msg.sender == _coldVault, "Only the cold vault can perform this operation in SigningCold mode");
        } else if (commitmentModes[_coldVault] == CommitmentMode.NonSigningCold) {
            require(msg.sender == config.socialVault, "Only the social vault can perform this operation in NonSigningCold mode");
        } else {
            revert("Invalid mode or sender");
        }

        require(config.socialVault != address(0), "Social vault not set yet");
        require(_newSocialVault != config.mintingWallet && _newSocialVault != config.transactionWallet && _newSocialVault != config.coldVault, "Address already in use");

        config.socialVault = _newSocialVault;
    }

    function _isValidWallet(address _wallet) internal view returns (bool) {
        // Ensure it's an EOA (no associated bytecode)
        uint256 size;
        assembly { size := extcodesize(_wallet) }
        if (size > 0) return false;

        return true;
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
        // If the sender is a cold vault, return its own address
        if (sender != address(0) && (mintToColdMapping[sender] == address(0) && transactionToColdMapping[sender] == address(0) && socialToColdMapping[sender] == address(0))) {
            return sender;
        }

        if (mintToColdMapping[sender] != address(0)) {
            return mintToColdMapping[sender];
        } else if (transactionToColdMapping[sender] != address(0)) {
            return transactionToColdMapping[sender];
        } else if (socialToColdMapping[sender] != address(0)) {
            return socialToColdMapping[sender];
        } else {
            revert("Sender not associated with any cold wallet");
        }
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
            emit Unvaulted(destination, msg.sender, ethAmount, address(0), 0);
        }

        // Transfer ERC20 tokens
        for (uint256 i = 0; i < erc20Tokens.length; i++) {
            _transferToken(destination, msg.sender, erc20Tokens[i].tokenAddress, erc20Tokens[i].amount);
            emit Unvaulted(destination, msg.sender, erc20Tokens[i].amount, erc20Tokens[i].tokenAddress, erc20Tokens[i].amount);
        }

        // Transfer ERC721 tokens
        for (uint256 i = 0; i < erc721Tokens.length; i++) {
            _transferToken(destination, msg.sender, erc721Tokens[i].tokenAddress, erc721Tokens[i].tokenId);
            emit Unvaulted(destination, msg.sender, erc721Tokens[i].tokenId, erc721Tokens[i].tokenAddress, 1);
        }

        // Transfer ERC1155 tokens
        for (uint256 i = 0; i < erc1155Tokens.length; i++) {
            IERC1155(erc1155Tokens[i].tokenAddress).safeTransferFrom(destination, msg.sender, erc1155Tokens[i].tokenId, erc1155Tokens[i].amount, erc1155Tokens[i].data);
            emit Unvaulted(destination, msg.sender, erc1155Tokens[i].tokenId, erc1155Tokens[i].tokenAddress, erc1155Tokens[i].amount);
        }
    }

}
