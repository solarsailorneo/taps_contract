const { expect } = require("chai");

describe("TAPS", function () {
    let TAPS, taps, Wallet, coldWallet, addr1, addr2, addr3, attacker;

    beforeEach(async function () {
        TAPS = await ethers.getContractFactory("TAPS");
        Wallet = await ethers.getContractFactory("Wallet");
        [coldWallet, socialWallet, addr1, addr2, addr3, attacker] = await ethers.getSigners();
        taps = await TAPS.deploy();
    });

    describe("Initial Setup", function() {
        beforeEach(async function() {
            const tx = await taps.connect(coldWallet).setColdWallet(coldWallet.address);
            const receipt = await tx.wait();
            console.log(`Gas used for setColdWallet: ${receipt.gasUsed.toString()}`);
            await taps.connect(coldWallet).setSocialWallet(socialWallet.address);
            // console.log(`Gas used for setColdWallet: ${receipt.gasUsed.toString()}`);
        });

        it("Should have set the cold wallet correctly", async function () {
            const userWallets = await taps.userWalletConfigs(coldWallet.address);
            expect(userWallets.coldVault).to.equal(coldWallet.address);
        });

        it("Should have set the social wallet correctly", async function () {
            const userWallets = await taps.userWalletConfigs(coldWallet.address);
            expect(userWallets.socialVault).to.equal(socialWallet.address);
        });

        it("Should allow a user to create minting and transaction wallets", async function () {
            await taps.connect(coldWallet).createOrUpdateWallets();
            const userWallets = await taps.userWalletConfigs(coldWallet.address);
            expect(userWallets.mintingWallet).to.not.equal(ethers.constants.AddressZero);
            expect(userWallets.transactionWallet).to.not.equal(ethers.constants.AddressZero);
        });

        it("Should not allow a user to create wallets more than once", async function () {
            await taps.connect(coldWallet).createOrUpdateWallets();
            await expect(taps.connect(coldWallet).createOrUpdateWallets()).to.be.revertedWith("Wallets already created");
        });
        
    });

    describe("Wallet Swapping", function() {
        beforeEach(async function() {
            const tx = await taps.connect(coldWallet).setColdWallet(coldWallet.address);
            const receipt = await tx.wait();
            console.log(`Gas used for setColdWallet: ${receipt.gasUsed.toString()}`);
            await taps.connect(coldWallet).setSocialWallet(socialWallet.address);
            await taps.connect(coldWallet).createOrUpdateWallets();
        });
    
        it("Should allow cold wallet to swap minting wallet", async function () {
            const newMintingWallet = addr2.address;
            await taps.connect(coldWallet).swapMintingWallet(coldWallet.address, newMintingWallet);
            const userWallets = await taps.userWalletConfigs(coldWallet.address);
            expect(userWallets.mintingWallet).to.equal(newMintingWallet);
        });
    
        it("Should allow cold wallet to swap transaction wallet", async function () {
            const newTransactionWallet = addr3.address;
            await taps.connect(coldWallet).swapTransactionWallet(coldWallet.address, newTransactionWallet);
            const userWallets = await taps.userWalletConfigs(coldWallet.address);
            expect(userWallets.transactionWallet).to.equal(newTransactionWallet);
        });
    
        it("Should not allow non-cold wallet to swap minting wallet", async function () {
            await expect(taps.connect(addr1).swapMintingWallet(coldWallet.address, addr2.address)).to.be.revertedWith("Only the cold wallet can perform this operation");
        });
    
        it("Should not allow non-cold wallet to swap transaction wallet", async function () {
            await expect(taps.connect(addr1).swapTransactionWallet(coldWallet.address, addr3.address)).to.be.revertedWith("Only the cold wallet can perform this operation");
        });
    
        it("Should not allow swapping to an invalid minting wallet address", async function () {
            await expect(taps.connect(coldWallet).swapMintingWallet(coldWallet.address, ethers.constants.AddressZero)).to.be.revertedWith("Invalid minting wallet address");
        });
    
        it("Should not allow swapping to an invalid transaction wallet address", async function () {
            await expect(taps.connect(coldWallet).swapTransactionWallet(coldWallet.address, ethers.constants.AddressZero)).to.be.revertedWith("Invalid transaction wallet address");
        });
    
        it("Should not allow swapping minting wallet if no existing minting wallet", async function () {
            // Assuming addr1 has no existing minting wallet
            await expect(taps.connect(coldWallet).swapMintingWallet(addr1.address, addr2.address)).to.be.revertedWith("No existing minting wallet to swap");
        });
    
        it("Should not allow swapping transaction wallet if no existing transaction wallet", async function () {
            // Assuming addr1 has no existing transaction wallet
            await expect(taps.connect(coldWallet).swapTransactionWallet(addr1.address, addr3.address)).to.be.revertedWith("No existing transaction wallet to swap");
        });
    });
    

    // describe("Other Tests", function() {
    //     beforeEach(async function() {
    //         it("Should allow a user to create minting and transaction wallets", async function () {
    //             await taps.connect(coldWallet).createOrUpdateWallets();
    //             const userWallets = await taps.userWalletConfigs(coldWallet.address);
    //             expect(userWallets.mintingWallet).to.not.equal(ethers.constants.AddressZero);
    //             expect(userWallets.transactionWallet).to.not.equal(ethers.constants.AddressZero);
    //         });

    //         it("Should not allow a user to create wallets more than once", async function () {
    //             await taps.connect(coldWallet).createOrUpdateWallets();
    //             await expect(taps.connect(coldWallet).createOrUpdateWallets()).to.be.revertedWith("Wallets already created");
    //         });

    //         it("Should allow setting of social and cold vaults", async function () {
    //             await taps.connect(coldWallet).setSocialAndColdVaults(addr1.address, addr2.address, addr3.address);
    //             const userWallets = await taps.userWalletConfigs(coldWallet.address);
    //             expect(userWallets.socialVault).to.equal(addr1.address);
    //             expect(userWallets.coldVault).to.equal(addr2.address);
    //         });
    //     });
    // });

    describe("Vaulting and Unvaulting", function() {
        beforeEach(async function() {
            const tx = await taps.connect(coldWallet).setColdWallet(coldWallet.address);
            const receipt = await tx.wait();
            console.log(`Gas used for setColdWallet: ${receipt.gasUsed.toString()}`);
            await taps.connect(coldWallet).setSocialWallet(socialWallet.address);
            // console.log(`Gas used for setColdWallet: ${receipt.gasUsed.toString()}`);
        });

        it("Should not allow vaulting from cold vault", async function () {
            const userWallets = await taps.userWalletConfigs(coldWallet.address);
            await expect(taps.connect(coldWallet).vaultETH(userWallets.coldVault, userWallets.transactionWallet, 1)).to.be.revertedWith("Cannot use cold or social vault for this operation");
        });

        it("Should not allow unvaulting from social vault", async function () {
            const userWallets = await taps.userWalletConfigs(coldWallet.address);
            await expect(taps.connect(coldWallet).unvaultETH(userWallets.socialVault, userWallets.mintingWallet, 1)).to.be.revertedWith("Cannot use cold or social vault for this operation");
        });

        // Add more tests for tokens, different scenarios, etc.
    });

    describe("Attack Scenarios", function() {
        beforeEach(async function() {
            const tx = await taps.connect(coldWallet).setColdWallet(coldWallet.address);
            const receipt = await tx.wait();
            console.log(`Gas used for setColdWallet: ${receipt.gasUsed.toString()}`);
            await taps.connect(coldWallet).setSocialWallet(socialWallet.address);
            // console.log(`Gas used for setColdWallet: ${receipt.gasUsed.toString()}`);
        });

        it("Should not allow attacker to change social and cold vaults", async function () {
            await expect(taps.connect(attacker).setSocialAndColdVaults(attacker.address, attacker.address, attacker.address)).to.be.revertedWith("Only the cold wallet can perform this operation");
        });

        // Add more tests simulating different attack scenarios.
    });
});
