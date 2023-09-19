// SPDX-License-Identifier: MITWalletConfig
pragma solidity ^0.8.0;

// ERC20 Interface
interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

// ERC721 Interface
interface IERC721 {
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
}

// ERC1155 Interface
interface IERC1155 {
    function safeTransferFrom(address from, address to, uint256 id, uint256 value, bytes calldata data) external;
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

    uint256 public cooldownPeriod = 1 days;

    // Events
    event WalletConfigSet(address indexed user);
    event Vaulted(address indexed user, address indexed from, address indexed to, uint256 amount, address tokenAddress, uint256 tokenId);
    event Unvaulted(address indexed user, address indexed from, address indexed to, uint256 amount, address tokenAddress, uint256 tokenId);



    function createUserWallets(address _mintingWallet, address _transactionWallet) external onlyColdWallet {
        require(_mintingWallet != address(0) && _transactionWallet != address(0), "Invalid wallet addresses");
        require(userWalletConfigs[msg.sender].mintingWallet == address(0) && userWalletConfigs[msg.sender].transactionWallet == address(0), "Wallets already created");

        userWalletConfigs[msg.sender].mintingWallet = _mintingWallet;
        userWalletConfigs[msg.sender].transactionWallet = _transactionWallet;
    }

    // function createOrUpdateWallets(address _mintingWallet, address _transactionWallet) external onlyColdWallet {
    //     if (_mintingWallet != address(0)) {
    //         userWalletConfigs[msg.sender].mintingWallet = _mintingWallet;
    //     }

    //     if (_transactionWallet != address(0)) {
    //         userWalletConfigs[msg.sender].transactionWallet = _transactionWallet;
    //     }
    // }

    function swapMintingWallet(address _user, address _newMintingWallet) external onlyColdWallet {
        require(_newMintingWallet != address(0), "Invalid minting wallet address");
        require(userWalletConfigs[_user].mintingWallet != address(0), "No existing minting wallet to swap");

        userWalletConfigs[_user].mintingWallet = _newMintingWallet;
    }

    function swapTransactionWallet(address _user, address _newTransactionWallet) external onlyColdWallet {
        require(_newTransactionWallet != address(0), "Invalid transaction wallet address");
        require(userWalletConfigs[_user].transactionWallet != address(0), "No existing transaction wallet to swap");

        userWalletConfigs[_user].transactionWallet = _newTransactionWallet;
    }

    function setColdWallet(address _coldWallet) external {
        require(userWalletConfigs[msg.sender].coldVault == address(0), "Cold wallet already set");
        require(isValidWallet(_coldWallet), "Invalid cold wallet");
        userWalletConfigs[msg.sender].coldVault = _coldWallet;
    }

    function setSocialWallet(address _socialWallet) external {
        require(userWalletConfigs[msg.sender].coldVault == msg.sender, "Only the cold wallet can set the social wallet");
        require(userWalletConfigs[msg.sender].socialVault == address(0), "Social wallet already set");
        require(isValidWallet(_socialWallet), "Invalid social wallet");
        userWalletConfigs[msg.sender].socialVault = _socialWallet;
    }

    function setSocialAndColdVaults(address _socialVault, address _coldVault, address _secondaryApprover) external onlyColdWallet() {
        require(isValidWallet(_socialVault), "Invalid social vault");
        require(isValidWallet(_coldVault), "Invalid cold vault");
        require(block.timestamp > userWalletConfigs[msg.sender].lastConfigChange + cooldownPeriod, "Configuration change cooldown active");

        userWalletConfigs[msg.sender].socialVault = _socialVault;
        userWalletConfigs[msg.sender].coldVault = _coldVault;
        userWalletConfigs[msg.sender].secondaryApprover = _secondaryApprover;
        userWalletConfigs[msg.sender].lastConfigChange = block.timestamp;
    }

    function isValidWallet(address _wallet) public view returns (bool) {
        // Ensure it's an EOA (no associated bytecode)
        uint256 size;
        assembly { size := extcodesize(_wallet) }
        if (size > 0) return false;

        return true;
    }

    function setWalletConfig(address _mintingWallet, address _transactionWallet, address _socialVault, address _coldVault) external {
        UserWallets storage config = userWalletConfigs[msg.sender];
        config.mintingWallet = _mintingWallet;
        config.transactionWallet = _transactionWallet;
        config.socialVault = _socialVault;
        config.coldVault = _coldVault;

        emit WalletConfigSet(msg.sender);
    }

    modifier notColdOrSocial(address _wallet) {
        require(_wallet != userWalletConfigs[msg.sender].coldVault && _wallet != userWalletConfigs[msg.sender].socialVault, "Cannot use cold or social vault for this operation");
        _;
    }

    modifier onlyColdWallet() {
        require(msg.sender == userWalletConfigs[msg.sender].coldVault, "Only the cold wallet can perform this operation");
        _;
    }

    function vaultETH(address _from, address _to, uint256 _amount) external notColdOrSocial(_from) {
        UserWallets storage config = userWalletConfigs[msg.sender];
        require(_from != config.coldVault, "Cannot send from cold vault");
        require(_to != config.mintingWallet, "Cannot send to minting wallet");
        require(_amount > 0, "Amount should be greater than 0");

        payable(_to).transfer(_amount);

        emit Vaulted(msg.sender, _from, _to, _amount, address(0), 0);
    }

    function vaultToken(address _token, address _from, address _to, uint256 _amountOrTokenId, bool isERC721, bool isERC1155) external notColdOrSocial(_from) {
        UserWallets storage config = userWalletConfigs[msg.sender];
        require(_from != config.coldVault, "Cannot send from cold vault");
        require(_to != config.mintingWallet, "Cannot send to minting wallet");

        if (isERC721) {
            IERC721(_token).safeTransferFrom(_from, _to, _amountOrTokenId);
        } else if (isERC1155) {
            IERC1155(_token).safeTransferFrom(_from, _to, _amountOrTokenId, 1, "");
        } else {
            IERC20(_token).transferFrom(_from, _to, _amountOrTokenId);
        }

        emit Vaulted(msg.sender, _from, _to, _amountOrTokenId, _token, _amountOrTokenId);
    }

    function unvaultETH(address _from, address _to, uint256 _amount) external notColdOrSocial(_from) {
        UserWallets storage config = userWalletConfigs[msg.sender];
        require(_from != config.transactionWallet && _from != config.socialVault, "Cannot send from these wallets");
        require(_amount > 0, "Amount should be greater than 0");

        payable(_to).transfer(_amount);

        emit Unvaulted(msg.sender, _from, _to, _amount, address(0), 0);
    }

    function unvaultToken(address _token, address _from, address _to, uint256 _amountOrTokenId, bool isERC721, bool isERC1155) external notColdOrSocial(_from) {
        UserWallets storage config = userWalletConfigs[msg.sender];
        require(_from != config.transactionWallet && _from != config.socialVault, "Cannot send from these wallets");

        if (isERC721) {
            IERC721(_token).safeTransferFrom(_from, _to, _amountOrTokenId);
        } else if (isERC1155) {
            IERC1155(_token).safeTransferFrom(_from, _to, _amountOrTokenId, 1, "");
        } else {
            IERC20(_token).transferFrom(_from, _to, _amountOrTokenId);
        }

        emit Unvaulted(msg.sender, _from, _to, _amountOrTokenId, _token, _amountOrTokenId);
    }
}
