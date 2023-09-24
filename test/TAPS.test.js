const { expect } = require("chai");

describe("TAPS", function () {
    let TAPS, taps;
    const CommitmentMode = {
        NotSet: 0,
        SigningCold: 1,
        NonSigningCold: 2
    };

    beforeEach(async function () {
        TAPS = await ethers.getContractFactory("TAPS");
        taps = await TAPS.deploy();
        [coldVault, socialVault, socialVault2, mintWallet, mintWallet2, transactionWallet, transactionWallet2, attacker, attackerSocial] = await ethers.getSigners();
    });

    describe("Setup Vaults and Wallets", function() {
        it("Should allow a user to set all wallet and vault configs in SigningCold mode", async function () {
            await taps.connect(coldVault).setAllWalletAndVaultConfigs(mintWallet.address, transactionWallet.address, socialVault.address, coldVault.address, CommitmentMode.SigningCold);
            const userWallets = await taps.userWalletConfigs(coldVault.address);
            expect(userWallets.coldVault).to.equal(coldVault.address);
            expect(userWallets.socialVault).to.equal(socialVault.address);
            expect(userWallets.mintingWallet).to.equal(mintWallet.address);
            expect(userWallets.transactionWallet).to.equal(transactionWallet.address);
        });

        it("Should allow a user to set all wallet and vault configs in NonSigningCold mode", async function () {
            await taps.connect(socialVault).setAllWalletAndVaultConfigs(mintWallet.address, transactionWallet.address, socialVault.address, coldVault.address, CommitmentMode.NonSigningCold);
            const userWallets = await taps.userWalletConfigs(coldVault.address);
            expect(userWallets.coldVault).to.equal(coldVault.address);
            expect(userWallets.socialVault).to.equal(socialVault.address);
            expect(userWallets.mintingWallet).to.equal(mintWallet.address);
            expect(userWallets.transactionWallet).to.equal(transactionWallet.address);
        });

        it("Should not allow setting the same address for mint and transaction wallets", async function () {
            await expect(taps.connect(coldVault).setAllWalletAndVaultConfigs(mintWallet.address, mintWallet.address, socialVault.address, coldVault.address, CommitmentMode.SigningCold)).to.be.revertedWith("Wallet and vault addresses must be unique");
        });
        it("Should not allow a user to set wallet and vault configs more than once", async function () {
            await taps.connect(coldVault).setAllWalletAndVaultConfigs(mintWallet.address, transactionWallet.address, socialVault.address, coldVault.address, CommitmentMode.SigningCold);
            await expect(taps.connect(coldVault).setAllWalletAndVaultConfigs(mintWallet2.address, transactionWallet2.address, socialVault2.address, coldVault.address, CommitmentMode.SigningCold)).to.be.revertedWith("Commitment mode already set");
        });

        it("Should not allow the same address for mint and transaction wallets", async function () {
            await expect(taps.connect(coldVault).setAllWalletAndVaultConfigs(mintWallet.address, mintWallet.address, socialVault.address, coldVault.address, CommitmentMode.SigningCold)).to.be.revertedWith("Wallet and vault addresses must be unique");
        });

        it("Should not allow the same address for mint and social vaults", async function () {
            await expect(taps.connect(coldVault).setAllWalletAndVaultConfigs(mintWallet.address, transactionWallet.address, mintWallet.address, coldVault.address, CommitmentMode.SigningCold)).to.be.revertedWith("Wallet and vault addresses must be unique");
        });

        it("Should not allow the same address for mint and cold vaults", async function () {
            await expect(taps.connect(coldVault).setAllWalletAndVaultConfigs(coldVault.address, transactionWallet.address, socialVault.address, coldVault.address, CommitmentMode.SigningCold)).to.be.revertedWith("Wallet and vault addresses must be unique");
        });

        it("Should not allow the same address for transaction and social vaults", async function () {
            await expect(taps.connect(coldVault).setAllWalletAndVaultConfigs(mintWallet.address, socialVault.address, socialVault.address, coldVault.address, CommitmentMode.SigningCold)).to.be.revertedWith("Wallet and vault addresses must be unique");
        });

        it("Should not allow the same address for transaction and cold vaults", async function () {
            await expect(taps.connect(coldVault).setAllWalletAndVaultConfigs(mintWallet.address, coldVault.address, socialVault.address, coldVault.address, CommitmentMode.SigningCold)).to.be.revertedWith("Wallet and vault addresses must be unique");
        });

        it("Should not allow the same address for social and cold vaults", async function () {
            await expect(taps.connect(coldVault).setAllWalletAndVaultConfigs(mintWallet.address, transactionWallet.address, coldVault.address, coldVault.address, CommitmentMode.SigningCold)).to.be.revertedWith("Wallet and vault addresses must be unique");
        });
        
    });

    describe("Wallet Swapping in SigningCold Mode", function() {
        beforeEach(async function() {
            await taps.connect(coldVault).setAllWalletAndVaultConfigs(mintWallet.address, transactionWallet.address, socialVault.address, coldVault.address, CommitmentMode.SigningCold);
        });
    
        it("Should allow cold vault to swap minting wallet", async function () {
            await taps.connect(coldVault).swapMintingWallet(coldVault.address, mintWallet2.address);
            const userWallets = await taps.userWalletConfigs(coldVault.address);
            expect(userWallets.mintingWallet).to.equal(mintWallet2.address);
        });
    
        it("Should allow cold vault to swap transaction wallet", async function () {
            await taps.connect(coldVault).swapTransactionWallet(coldVault.address, transactionWallet2.address);
            const userWallets = await taps.userWalletConfigs(coldVault.address);
            expect(userWallets.transactionWallet).to.equal(transactionWallet2.address);
        });
    
        it("Should allow cold vault to swap social vault", async function () {
            await taps.connect(coldVault).swapSocialVault(coldVault.address, socialVault2.address);
            const userWallets = await taps.userWalletConfigs(coldVault.address);
            expect(userWallets.socialVault).to.equal(socialVault2.address);
        });
    
        it("Should not allow minting wallet to swap minting wallet", async function () {
            await expect(taps.connect(mintWallet).swapMintingWallet(coldVault.address, mintWallet2.address)).to.be.revertedWith("Only the cold vault can perform this operation in SigningCold mode");
        });
    
        it("Should not allow transaction wallet to swap mint wallet", async function () {
            await expect(taps.connect(transactionWallet).swapMintingWallet(coldVault.address, mintWallet2.address)).to.be.revertedWith("Only the cold vault can perform this operation in SigningCold mode");
        });
    
        it("Should not allow transaction wallet to swap transaction wallet", async function () {
            await expect(taps.connect(transactionWallet).swapTransactionWallet(coldVault.address, transactionWallet2.address)).to.be.revertedWith("Only the cold vault can perform this operation in SigningCold mode");
        });
    
        it("Should not allow social vault to swap minting wallet", async function () {
            await expect(taps.connect(socialVault).swapMintingWallet(coldVault.address, mintWallet2.address)).to.be.revertedWith("Only the cold vault can perform this operation in SigningCold mode");
        });
    
        it("Should not allow social wallet to swap transaction wallet", async function () {
            await expect(taps.connect(socialVault).swapTransactionWallet(coldVault.address, transactionWallet2.address)).to.be.revertedWith("Only the cold vault can perform this operation in SigningCold mode");
        });
    
        it("Should not allow swapping to an invalid minting wallet address", async function () {
            await expect(taps.connect(coldVault).swapMintingWallet(coldVault.address, ethers.constants.AddressZero)).to.be.revertedWith("Invalid minting wallet address");
        });
    
        it("Should not allow swapping to an invalid transaction wallet address", async function () {
            await expect(taps.connect(coldVault).swapTransactionWallet(coldVault.address, ethers.constants.AddressZero)).to.be.revertedWith("Invalid transaction wallet address");
        });
    });

    describe("Wallet Swapping in NonSigningCold Mode", function() {
        beforeEach(async function() {
            await taps.connect(socialVault).setAllWalletAndVaultConfigs(mintWallet.address, transactionWallet.address, socialVault.address, coldVault.address, CommitmentMode.NonSigningCold);
        });
    
        it("Should allow social vault to swap minting wallet", async function () {
            await taps.connect(socialVault).swapMintingWallet(coldVault.address, mintWallet2.address);
            const userWallets = await taps.userWalletConfigs(coldVault.address);
            expect(userWallets.mintingWallet).to.equal(mintWallet2.address);
        });
    
        it("Should allow social vault to swap transaction wallet", async function () {
            await taps.connect(socialVault).swapTransactionWallet(coldVault.address, transactionWallet2.address);
            const userWallets = await taps.userWalletConfigs(coldVault.address);
            expect(userWallets.transactionWallet).to.equal(transactionWallet2.address);
        });
    
        it("Should allow social vault to swap social vault", async function () {
            await taps.connect(socialVault).swapSocialVault(coldVault.address, socialVault2.address);
            const userWallets = await taps.userWalletConfigs(coldVault.address);
            expect(userWallets.socialVault).to.equal(socialVault2.address);
        });
    
        it("Should not allow cold vault to swap minting wallet", async function () {
            await expect(taps.connect(coldVault).swapMintingWallet(coldVault.address, mintWallet2.address)).to.be.revertedWith("Only the social vault can perform this operation in NonSigningCold mode");
        });
    
        it("Should not allow transaction wallet to swap mint wallet", async function () {
            await expect(taps.connect(transactionWallet).swapMintingWallet(coldVault.address, mintWallet2.address)).to.be.revertedWith("Only the social vault can perform this operation in NonSigningCold mode");
        });
    
        it("Should not allow transaction wallet to swap transaction wallet", async function () {
            await expect(taps.connect(transactionWallet).swapTransactionWallet(coldVault.address, transactionWallet2.address)).to.be.revertedWith("Only the social vault can perform this operation in NonSigningCold mode");
        });
    
        it("Should not allow minting wallet to swap minting wallet", async function () {
            await expect(taps.connect(mintWallet).swapMintingWallet(coldVault.address, mintWallet2.address)).to.be.revertedWith("Only the social vault can perform this operation in NonSigningCold mode");
        });
    
        it("Should not allow minting wallet to swap transaction wallet", async function () {
            await expect(taps.connect(mintWallet).swapTransactionWallet(coldVault.address, transactionWallet2.address)).to.be.revertedWith("Only the social vault can perform this operation in NonSigningCold mode");
        });
    
        it("Should not allow swapping to an invalid minting wallet address", async function () {
            await expect(taps.connect(socialVault).swapMintingWallet(coldVault.address, ethers.constants.AddressZero)).to.be.revertedWith("Invalid minting wallet address");
        });
    
        it("Should not allow swapping to an invalid transaction wallet address", async function () {
            await expect(taps.connect(socialVault).swapTransactionWallet(coldVault.address, ethers.constants.AddressZero)).to.be.revertedWith("Invalid transaction wallet address");
        });
    });

    describe("Wallet Swapping Without setting wallets and vaults first in SigningCold Mode", function() {
        it("Should not allow swapping minting wallet if no existing minting wallet", async function () {
            await expect(taps.connect(coldVault).swapMintingWallet(coldVault.address, mintWallet2.address)).to.be.revertedWith("Minting wallet not set yet");
        });
    
        it("Should not allow swapping transaction wallet if no existing transaction wallet", async function () {
            await expect(taps.connect(coldVault).swapTransactionWallet(coldVault.address, transactionWallet2.address)).to.be.revertedWith("Transaction wallet not set yet");
        });
    
        it("Should not allow swapping social vault if no existing social vault", async function () {
            await expect(taps.connect(coldVault).swapSocialVault(coldVault.address, socialVault2.address)).to.be.revertedWith("Social vault not set yet");
        });
    });

    describe("Wallet Swapping Without setting wallets and vaults first in NonSigningCold Mode", function() {
        it("Should not allow swapping minting wallet if no existing minting wallet", async function () {
            await expect(taps.connect(socialVault).swapMintingWallet(coldVault.address, mintWallet2.address)).to.be.revertedWith("Minting wallet not set yet");
        });
    
        it("Should not allow swapping transaction wallet if no existing transaction wallet", async function () {
            await expect(taps.connect(socialVault).swapTransactionWallet(coldVault.address, transactionWallet2.address)).to.be.revertedWith("Transaction wallet not set yet");
        });
    
        it("Should not allow swapping social vault if no existing social vault", async function () {
            await expect(taps.connect(socialVault).swapSocialVault(coldVault.address, socialVault2.address)).to.be.revertedWith("Social vault not set yet");
        });
    });    

    describe("Vaulting and Unvaulting in SigningCold Mode", function() {
        const WalletType = {
            Minting: 0,
            Transaction: 1,
            Social: 2,
            Cold: 3
        };
    
        const amountToSend = ethers.utils.parseEther("1"); // 1 Ether
    
        beforeEach(async function() {
            await taps.connect(coldVault).setAllWalletAndVaultConfigs(mintWallet.address, transactionWallet.address, socialVault.address, coldVault.address, CommitmentMode.SigningCold);
        });
    
        // Vaulting Scenarios
        it("Should not allow vaulting from cold vault", async function () {
            await expect(taps.connect(coldVault).vaultETH(coldVault.address, WalletType.Transaction, { value: amountToSend })).to.be.revertedWith("Invalid sender-destination combination");
        });
    
        it("Should allow vaulting from minting wallet to cold vault", async function () {
            await taps.connect(mintWallet).vaultETH(coldVault.address, WalletType.Cold, { value: amountToSend });
        });
    
        it("Should allow vaulting from minting wallet to social vault", async function () {
            await taps.connect(mintWallet).vaultETH(coldVault.address, WalletType.Social, { value: amountToSend });
        });
    
        it("Should allow vaulting from minting wallet to transaction wallet", async function () {
            await taps.connect(mintWallet).vaultETH(coldVault.address, WalletType.Transaction, { value: amountToSend });
        });
    
        it("Should allow vaulting from transaction wallet to cold vault", async function () {
            await taps.connect(transactionWallet).vaultETH(coldVault.address, WalletType.Cold, { value: amountToSend });
        });
    
        it("Should allow vaulting from transaction wallet to social vault", async function () {
            await taps.connect(transactionWallet).vaultETH(coldVault.address, WalletType.Social, { value: amountToSend });
        });
    
        it("Should allow vaulting from social vault to cold vault", async function () {
            await taps.connect(socialVault).vaultETH(coldVault.address, WalletType.Cold, { value: amountToSend });
        });
    
        // Unvaulting Scenarios
        it("Should not allow unvaulting to minting wallet", async function () {
            await expect(taps.connect(coldVault).unvaultETH(coldVault.address, WalletType.Minting, { value: amountToSend })).to.be.revertedWith("Invalid destination wallet type");
        });
    
        it("Should allow unvaulting from cold vault to social vault", async function () {
            await taps.connect(coldVault).unvaultETH(coldVault.address, WalletType.Social, { value: amountToSend });
        });
    
        it("Should allow unvaulting from cold vault to transaction wallet", async function () {
            await taps.connect(coldVault).unvaultETH(coldVault.address, WalletType.Transaction, { value: amountToSend });
        });
    
        it("Should allow unvaulting from social vault to transaction wallet", async function () {
            await taps.connect(socialVault).unvaultETH(coldVault.address, WalletType.Transaction, { value: amountToSend });
        });
    
        // Invalid Unvaulting Scenarios
        it("Should not allow unvaulting from transaction wallet", async function () {
            await expect(taps.connect(transactionWallet).unvaultETH(coldVault.address, WalletType.Cold, { value: amountToSend })).to.be.revertedWith("Invalid sender-destination combination");
        });
    
        it("Should not allow unvaulting from minting wallet", async function () {
            await expect(taps.connect(mintWallet).unvaultETH(coldVault.address, WalletType.Cold, { value: amountToSend })).to.be.revertedWith("Invalid sender-destination combination");
        });
    });

    describe("Vaulting and Unvaulting in NonSigningCold Mode", function() {
        const WalletType = {
            Minting: 0,
            Transaction: 1,
            Social: 2,
            Cold: 3
        };
    
        const amountToSend = ethers.utils.parseEther("1"); // 1 Ether
    
        beforeEach(async function() {
            await taps.connect(socialVault).setAllWalletAndVaultConfigs(mintWallet.address, transactionWallet.address, socialVault.address, coldVault.address, CommitmentMode.NonSigningCold);
        });
    
        // Vaulting Scenarios
        it("Should not allow vaulting from cold vault", async function () {
            await expect(taps.connect(coldVault).vaultETH(coldVault.address, WalletType.Transaction, { value: amountToSend })).to.be.revertedWith("Invalid sender-destination combination");
        });
    
        it("Should allow vaulting from minting wallet to cold vault", async function () {
            await taps.connect(mintWallet).vaultETH(coldVault.address, WalletType.Cold, { value: amountToSend });
        });
    
        it("Should allow vaulting from minting wallet to social vault", async function () {
            await taps.connect(mintWallet).vaultETH(coldVault.address, WalletType.Social, { value: amountToSend });
        });
    
        it("Should allow vaulting from minting wallet to transaction wallet", async function () {
            await taps.connect(mintWallet).vaultETH(coldVault.address, WalletType.Transaction, { value: amountToSend });
        });
    
        it("Should allow vaulting from transaction wallet to cold vault", async function () {
            await taps.connect(transactionWallet).vaultETH(coldVault.address, WalletType.Cold, { value: amountToSend });
        });
    
        it("Should allow vaulting from transaction wallet to social vault", async function () {
            await taps.connect(transactionWallet).vaultETH(coldVault.address, WalletType.Social, { value: amountToSend });
        });
    
        it("Should allow vaulting from social vault to cold vault", async function () {
            await taps.connect(socialVault).vaultETH(coldVault.address, WalletType.Cold, { value: amountToSend });
        });
    
        // Unvaulting Scenarios
        it("Should not allow unvaulting to minting wallet", async function () {
            await expect(taps.connect(coldVault).unvaultETH(coldVault.address, WalletType.Minting, { value: amountToSend })).to.be.revertedWith("Invalid destination wallet type");
        });
    
        it("Should not allow unvaulting from cold vault to social vault in NonSigningCold mode", async function () {
            await expect(taps.connect(coldVault).unvaultETH(coldVault.address, WalletType.Social, { value: amountToSend })).to.be.revertedWith("Invalid sender-destination combination");
        });

        it("Should not allow unvaulting from cold vault to transaction wallet in NonSigningCold mode", async function () {
            await expect(taps.connect(coldVault).unvaultETH(coldVault.address, WalletType.Transaction, { value: amountToSend })).to.be.revertedWith("Invalid sender-destination combination");
        });
    
        it("Should allow unvaulting from social vault to transaction wallet", async function () {
            await taps.connect(socialVault).unvaultETH(coldVault.address, WalletType.Transaction, { value: amountToSend });
        });
    
        // Invalid Unvaulting Scenarios
        it("Should not allow unvaulting from transaction wallet", async function () {
            await expect(taps.connect(transactionWallet).unvaultETH(coldVault.address, WalletType.Cold, { value: amountToSend })).to.be.revertedWith("Invalid sender-destination combination");
        });
    
        it("Should not allow unvaulting from minting wallet", async function () {
            await expect(taps.connect(mintWallet).unvaultETH(coldVault.address, WalletType.Cold, { value: amountToSend })).to.be.revertedWith("Invalid sender-destination combination");
        });
    });

    describe("Token Vaulting and Unvaulting in SigningCold mode", function() {
        const WalletType = {
            Minting: 0,
            Transaction: 1,
            Social: 2,
            Cold: 3
        };
    
        const FIRST_TOKEN_ID = 0;
        const MINT_AMOUNT = 1;
    
        let erc721a;
    
        beforeEach(async function() {
            ERC721A = await ethers.getContractFactory("MyNFT");
            erc721a = await ERC721A.deploy("ERC721A", "ERC721A", 1000);
            await erc721a.deployed();
    
            await erc721a.connect(mintWallet).mint(mintWallet.address, MINT_AMOUNT);
            await erc721a.connect(transactionWallet).mint(transactionWallet.address, MINT_AMOUNT);
            await erc721a.connect(socialVault).mint(socialVault.address, MINT_AMOUNT);
            await erc721a.connect(coldVault).mint(coldVault.address, MINT_AMOUNT);
    
            expect(await erc721a.ownerOf(FIRST_TOKEN_ID)).to.equal(mintWallet.address);
    
            await taps.connect(coldVault).setAllWalletAndVaultConfigs(mintWallet.address, transactionWallet.address, socialVault.address, coldVault.address, CommitmentMode.SigningCold);
        });
    
        it("Should not allow vaulting tokens from cold vault", async function () {
            await expect(taps.connect(coldVault).vaultToken(coldVault.address, WalletType.Transaction, erc721a.address, FIRST_TOKEN_ID))
                .to.be.revertedWith("Invalid sender-destination combination");
        });
    
        it("Should allow vaulting tokens from minting wallet to cold vault", async function () {
            await erc721a.connect(mintWallet).approve(taps.address, FIRST_TOKEN_ID);
            await taps.connect(mintWallet).vaultToken(coldVault.address, WalletType.Cold, erc721a.address, FIRST_TOKEN_ID);
            expect(await erc721a.ownerOf(FIRST_TOKEN_ID)).to.equal(coldVault.address);
        });

        it("Should allow vaulting tokens from transaction wallet to cold vault", async function () {
            const tokenId = FIRST_TOKEN_ID + 1; // The next token ID after mintWallet's token
            await erc721a.connect(transactionWallet).approve(taps.address, tokenId);
            await taps.connect(transactionWallet).vaultToken(coldVault.address, WalletType.Cold, erc721a.address, tokenId);
            expect(await erc721a.ownerOf(tokenId)).to.equal(coldVault.address);
        });

        it("Should allow vaulting tokens from social vault to cold vault", async function () {
            const tokenId = FIRST_TOKEN_ID + 2; // The next token ID after transactionWallet's token
            await erc721a.connect(socialVault).approve(taps.address, tokenId);
            await taps.connect(socialVault).vaultToken(coldVault.address, WalletType.Cold, erc721a.address, tokenId);
            expect(await erc721a.ownerOf(tokenId)).to.equal(coldVault.address);
        });

        it("Should not allow unvaulting tokens from cold vault to minting wallet", async function () {
            const tokenId = FIRST_TOKEN_ID + 3; // The token ID minted to coldVault
            await expect(taps.connect(coldVault).unvaultToken(coldVault.address, WalletType.Minting, erc721a.address, tokenId)).to.be.revertedWith("Invalid destination wallet type");;
        });
        

        it("Should allow unvaulting tokens from cold vault to transaction wallet", async function () {
            const tokenId = FIRST_TOKEN_ID + 3; // Assuming we're using the same token as the previous test
            await erc721a.connect(coldVault).approve(taps.address, tokenId);
            await taps.connect(coldVault).unvaultToken(coldVault.address, WalletType.Transaction, erc721a.address, tokenId);
            expect(await erc721a.ownerOf(tokenId)).to.equal(transactionWallet.address);
        });

        it("Should allow unvaulting tokens from cold vault to social vault", async function () {
            const tokenId = FIRST_TOKEN_ID + 3; // Assuming we're using the same token as the previous tests
            await erc721a.connect(coldVault).approve(taps.address, tokenId);
            await taps.connect(coldVault).unvaultToken(coldVault.address, WalletType.Social, erc721a.address, tokenId);
            expect(await erc721a.ownerOf(tokenId)).to.equal(socialVault.address);
        });
    });
    
    describe("Token Vaulting and Unvaulting in NonSigningCold mode", function() {
        const WalletType = {
            Minting: 0,
            Transaction: 1,
            Social: 2,
            Cold: 3
        };
    
        const FIRST_TOKEN_ID = 0;
        const MINT_AMOUNT = 1;
    
        let erc721a;
    
        beforeEach(async function() {
            ERC721A = await ethers.getContractFactory("MyNFT");
            erc721a = await ERC721A.deploy("ERC721A", "ERC721A", 1000);
            await erc721a.deployed();
    
            await erc721a.connect(mintWallet).mint(mintWallet.address, MINT_AMOUNT);
            await erc721a.connect(transactionWallet).mint(transactionWallet.address, MINT_AMOUNT);
            await erc721a.connect(socialVault).mint(socialVault.address, MINT_AMOUNT);
            await erc721a.connect(coldVault).mint(coldVault.address, MINT_AMOUNT);
    
            expect(await erc721a.ownerOf(FIRST_TOKEN_ID)).to.equal(mintWallet.address);
    
            await taps.connect(socialVault).setAllWalletAndVaultConfigs(mintWallet.address, transactionWallet.address, socialVault.address, coldVault.address, CommitmentMode.NonSigningCold);
        });
    
        it("Should not allow vaulting tokens from cold vault", async function () {
            await expect(taps.connect(socialVault).vaultToken(coldVault.address, WalletType.Transaction, erc721a.address, FIRST_TOKEN_ID))
                .to.be.revertedWith("Invalid sender-destination combination");
        });
    
        it("Should allow vaulting tokens from minting wallet to cold vault", async function () {
            await erc721a.connect(mintWallet).approve(taps.address, FIRST_TOKEN_ID);
            await taps.connect(mintWallet).vaultToken(coldVault.address, WalletType.Cold, erc721a.address, FIRST_TOKEN_ID);
            expect(await erc721a.ownerOf(FIRST_TOKEN_ID)).to.equal(coldVault.address);
        });

        it("Should allow vaulting tokens from transaction wallet to cold vault", async function () {
            const tokenId = FIRST_TOKEN_ID + 1; // The next token ID after mintWallet's token
            await erc721a.connect(transactionWallet).approve(taps.address, tokenId);
            await taps.connect(transactionWallet).vaultToken(coldVault.address, WalletType.Cold, erc721a.address, tokenId);
            expect(await erc721a.ownerOf(tokenId)).to.equal(coldVault.address);
        });

        it("Should allow vaulting tokens from social vault to cold vault", async function () {
            const tokenId = FIRST_TOKEN_ID + 2; // The next token ID after transactionWallet's token
            await erc721a.connect(socialVault).approve(taps.address, tokenId);
            await taps.connect(socialVault).vaultToken(coldVault.address, WalletType.Cold, erc721a.address, tokenId);
            expect(await erc721a.ownerOf(tokenId)).to.equal(coldVault.address);
        });

        it("Should not allow unvaulting tokens from cold vault to minting wallet", async function () {
            const tokenId = FIRST_TOKEN_ID + 3; // The token ID minted to coldVault
            await erc721a.connect(coldVault).approve(taps.address, tokenId);
            await expect(taps.connect(coldVault).unvaultToken(coldVault.address, WalletType.Minting, erc721a.address, tokenId)).to.be.revertedWith("Invalid destination wallet type");;
        });
        
        it("Should not allow unvaulting tokens from cold vault to transaction wallet", async function () {
            const tokenId = FIRST_TOKEN_ID + 3; // Assuming we're using the same token as the previous test
            await erc721a.connect(coldVault).approve(taps.address, tokenId);
            await expect(taps.connect(coldVault).unvaultToken(coldVault.address, WalletType.Transaction, erc721a.address, tokenId))
                .to.be.revertedWith("Invalid sender-destination combination");
        });
    
        it("Should not allow unvaulting tokens from cold vault to social vault", async function () {
            const tokenId = FIRST_TOKEN_ID + 3; // Assuming we're using the same token as the previous tests
            await erc721a.connect(coldVault).approve(taps.address, tokenId);
            await expect(taps.connect(coldVault).unvaultToken(coldVault.address, WalletType.Social, erc721a.address, tokenId))
                .to.be.revertedWith("Invalid sender-destination combination");
        });
    });

    describe("Changing Vaults and wallets Attack Scenarios", function() {
        beforeEach(async function() {
            await taps.connect(socialVault).setAllWalletAndVaultConfigs(mintWallet.address, transactionWallet.address, socialVault.address, coldVault.address, CommitmentMode.NonSigningCold);
        });
    
        it("Should not allow attacker to swap minting wallet", async function () {
            await expect(taps.connect(attacker).swapMintingWallet(coldVault.address, mintWallet2.address)).to.be.revertedWith("Only the social vault can perform this operation in NonSigningCold mode");
        });
    
        it("Should not allow attacker to swap transaction wallet", async function () {
            await expect(taps.connect(attacker).swapTransactionWallet(coldVault.address, transactionWallet2.address)).to.be.revertedWith("Only the social vault can perform this operation in NonSigningCold mode");
        });
    
        it("Should not allow attacker to swap social vault", async function () {
            await expect(taps.connect(attacker).swapSocialVault(coldVault.address, socialVault2.address)).to.be.revertedWith("Only the social vault can perform this operation in NonSigningCold mode");
        });
    
        it("Should allow attacker to set themselves as cold vault but can't do anything with it", async function () {
            // await taps.connect(attacker).registerAsColdVault();
            // const attackerWallets = await taps.userWalletConfigs(attacker.address);
            // expect(attackerWallets.coldVault).to.equal(attacker.address);
        
            // Try to swap minting wallet for another user
            await expect(taps.connect(attacker).swapMintingWallet(coldVault.address, mintWallet2.address)).to.be.reverted;
        
            // Try to swap transaction wallet for another user
            await expect(taps.connect(attacker).swapTransactionWallet(coldVault.address, transactionWallet2.address)).to.be.reverted;
        
            // Try to swap social vault for another user
            await expect(taps.connect(attacker).swapSocialVault(coldVault.address, socialVault.address)).to.be.reverted;
        });
    
        it("Should not allow attacker to set wallet configurations for another user", async function () {
            await expect(taps.connect(attacker).setAllWalletAndVaultConfigs(attacker.address, attacker.address, attacker.address, attacker.address, CommitmentMode.SigningCold)).to.be.reverted;
        });
    });

    describe("Impersonation Attack Scenarios", function() {
        const WalletType = {
            Minting: 0,
            Transaction: 1,
            Social: 2,
            Cold: 3
        };

        const amountToSend = ethers.utils.parseEther("1"); // 1 Ether

        beforeEach(async function() {
            // Deploy a new TAPS contract for each test
            TAPS = await ethers.getContractFactory("TAPS");
            [coldVault, socialVault, mintWallet, mintWallet2, transactionWallet, transactionWallet2, attacker] = await ethers.getSigners();
            taps = await TAPS.deploy();
        });
    
        it("Should not allow attacker to impersonate and vault assets from mint wallet", async function () {
            // Legitimate user sets up their configuration
            await taps.connect(coldVault).registerAsColdVault();
            await taps.connect(coldVault).setSocialVault(socialVault.address);
            await taps.connect(coldVault).setMintAndTransactionWallets(mintWallet.address, transactionWallet.address);
        
            // Attacker tries to set up their own configuration using the same addresses
            await taps.connect(attacker).registerAsColdVault();
            await taps.connect(attacker).setMintAndTransactionWallets(mintWallet.address, transactionWallet.address); // This should fail since wallets are already created
        
            // Attacker tries to vault assets from the mint wallet
            await expect(taps.connect(mintWallet).vaultETH(mintWallet.address, WalletType.Transaction, { value: amountToSend })).to.be.revertedWith("Invalid sender wallet type");
        });
        
        it("Should not allow attacker to impersonate and unvault assets from transaction wallet", async function () {
            // Legitimate user sets up their configuration
            await taps.connect(coldVault).registerAsColdVault();
            await taps.connect(coldVault).setSocialVault(socialVault.address);
            await taps.connect(coldVault).setMintAndTransactionWallets(mintWallet.address, transactionWallet.address);
        
            // Attacker tries to set up their own configuration using the same addresses
            await taps.connect(attacker).registerAsColdVault();
            await taps.connect(attacker).setMintAndTransactionWallets(mintWallet.address, transactionWallet.address); // This should fail since wallets are already created
        
            // Attacker tries to unvault assets from the transaction wallet
            await expect(taps.connect(attacker).unvaultETH(transactionWallet.address, WalletType.Cold, { value: amountToSend })).to.be.revertedWith("Invalid sender wallet type");
        });
    
        // Similarly, you can add tests for vaultToken and unvaultToken functions.
    });
    
});
