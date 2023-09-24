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

    function setAllWalletAndVaultConfigs(
        address _mintingWallet, 
        address _transactionWallet, 
        address _socialVault, 
        address _coldVault, 
        CommitmentMode _mode
    ) external {
        require(commitmentModes[_coldVault] == CommitmentMode.NotSet, "Commitment mode already set");
        
        if (_mode == CommitmentMode.SigningCold) {
            require(msg.sender == _coldVault, "For SigningCold mode, transaction must be initiated by the cold vault");
        } else if (_mode == CommitmentMode.NonSigningCold) {
            require(msg.sender == _socialVault, "For NonSigningCold mode, transaction must be initiated by the social vault");
        } else {
            revert("Invalid commitment mode");
        }

        require(
            _mintingWallet != _transactionWallet && 
            _mintingWallet != _socialVault && 
            _mintingWallet != _coldVault &&
            _transactionWallet != _socialVault &&
            _transactionWallet != _coldVault &&
            _socialVault != _coldVault,
            "Wallet and vault addresses must be unique"
        );

        UserWallets storage config = userWalletConfigs[_coldVault];
        config.mintingWallet = _mintingWallet;
        config.transactionWallet = _transactionWallet;
        config.socialVault = _socialVault;
        config.coldVault = _coldVault;

        commitmentModes[_coldVault] = _mode;

        emit WalletConfigSet(_coldVault);
    }

    function swapMintingWallet(address _coldVault, address _newMintingWallet) external {
        UserWallets storage config = userWalletConfigs[_coldVault];
        require(config.mintingWallet != address(0), "Minting wallet not set yet");
        require(_newMintingWallet != address(0), "Invalid minting wallet address");
        require(_newMintingWallet != config.transactionWallet && _newMintingWallet != config.socialVault && _newMintingWallet != config.coldVault, "Address already in use");

        if (commitmentModes[_coldVault] == CommitmentMode.SigningCold) {
            require(msg.sender == _coldVault, "Only the cold vault can perform this operation in SigningCold mode");
        } else if (commitmentModes[_coldVault] == CommitmentMode.NonSigningCold) {
            require(msg.sender == config.socialVault, "Only the social vault can perform this operation in NonSigningCold mode");
        }

        config.mintingWallet = _newMintingWallet;
    }

    function swapTransactionWallet(address _coldVault, address _newTransactionWallet) external {
        UserWallets storage config = userWalletConfigs[_coldVault];
        require(config.transactionWallet != address(0), "Transaction wallet not set yet");
        require(_newTransactionWallet != address(0), "Invalid transaction wallet address");
        require(_newTransactionWallet != config.mintingWallet && _newTransactionWallet != config.socialVault && _newTransactionWallet != config.coldVault, "Address already in use");

        if (commitmentModes[_coldVault] == CommitmentMode.SigningCold) {
            require(msg.sender == _coldVault, "Only the cold vault can perform this operation in SigningCold mode");
        } else if (commitmentModes[_coldVault] == CommitmentMode.NonSigningCold) {
            require(msg.sender == config.socialVault, "Only the social vault can perform this operation in NonSigningCold mode");
        }

        config.transactionWallet = _newTransactionWallet;
    }

    function swapSocialVault(address _coldVault, address _newSocialVault) external {
        UserWallets storage config = userWalletConfigs[_coldVault];
        require(config.socialVault != address(0), "Social vault not set yet");
        require(_newSocialVault != address(0), "Invalid social vault address");
        require(_newSocialVault != config.mintingWallet && _newSocialVault != config.transactionWallet && _newSocialVault != config.coldVault, "Address already in use");

        if (commitmentModes[_coldVault] == CommitmentMode.SigningCold) {
            require(msg.sender == _coldVault, "Only the cold vault can perform this operation in SigningCold mode");
        } else if (commitmentModes[_coldVault] == CommitmentMode.NonSigningCold) {
            require(msg.sender == config.socialVault, "Only the social vault can perform this operation in NonSigningCold mode");
        }

        config.socialVault = _newSocialVault;
    }

    function _isValidWallet(address _wallet) internal view returns (bool) {
        // Ensure it's an EOA (no associated bytecode)
        uint256 size;
        assembly { size := extcodesize(_wallet) }
        if (size > 0) return false;

        return true;
    }

    function vaultETH(address _coldVault, WalletType _toType) external payable {
        UserWallets storage config = userWalletConfigs[_coldVault];
        require(msg.value > 0, "Amount should be greater than 0");

        WalletType senderType = _getSenderType(msg.sender, config);
        address destination = _getDestination(_coldVault, _toType);

        // Validate the sender-destination combination using a mapping
        require(isValidVaulting(senderType, _toType), "Invalid sender-destination combination");

        payable(destination).transfer(msg.value);
        emit Vaulted(msg.sender, destination, msg.value, address(0), 0);
    }

    function unvaultETH(address _coldVault, WalletType _toType) external payable {
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

    function vaultToken(address _coldVault, WalletType _toType, address _token, uint256 _amountOrTokenId) external {
        UserWallets storage config = userWalletConfigs[_coldVault];
        
        WalletType senderType = _getSenderType(msg.sender, config);
        address destination = _getDestination(_coldVault, _toType);

        // Validate the sender-destination combination using a mapping
        require(isValidVaulting(senderType, _toType), "Invalid sender-destination combination");

        _transferToken(msg.sender, destination, _token, _amountOrTokenId);
        emit Vaulted(msg.sender, destination, _amountOrTokenId, _token, _amountOrTokenId);
    }

    function unvaultToken(address _coldVault, WalletType _toType, address _token, uint256 _amountOrTokenId) external {
        UserWallets storage config = userWalletConfigs[_coldVault];
        
        WalletType senderType = _getSenderType(msg.sender, config);
        address destination = _getDestination(_coldVault, _toType);

        // Validate the sender-destination combination using a mapping
        require(isValidUnvaulting(_coldVault, senderType, _toType), "Invalid sender-destination combination");

        _transferToken(msg.sender, destination, _token, _amountOrTokenId);
        emit Unvaulted(msg.sender, destination, _amountOrTokenId, _token, _amountOrTokenId);
    }

    modifier onlyColdVault() {
        require(msg.sender == userWalletConfigs[msg.sender].coldVault, "Only the cold vault can perform this operation");
        _;
    }

    modifier validSenderWalletType(address _coldVault, WalletType _type) {
        require(
            (msg.sender == userWalletConfigs[_coldVault].mintingWallet && _type == WalletType.Mint) ||
            (msg.sender == userWalletConfigs[_coldVault].transactionWallet && _type == WalletType.Transaction) ||
            (msg.sender == userWalletConfigs[_coldVault].socialVault && _type == WalletType.Social) ||
            (msg.sender == userWalletConfigs[_coldVault].coldVault && _type == WalletType.Cold),
            "Invalid sender wallet type"
        );
        _;
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

}
