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
            const message = ethers.utils.solidityKeccak256(["string", "address"], ["Approve setup for TAPS Contract at ", taps.address]);
            const messageHashBytes = ethers.utils.arrayify(message);

            const mintingWalletSignature = await mintWallet.signMessage(messageHashBytes);
            const transactionWalletSignature = await transactionWallet.signMessage(messageHashBytes);
            const socialVaultSignature = await socialVault.signMessage(messageHashBytes);
            const coldVaultSignature = await coldVault.signMessage(messageHashBytes);

            await taps.connect(coldVault).setAllWalletAndVaultConfigsSigningCold(
                mintWallet.address, 
                transactionWallet.address, 
                socialVault.address, 
                coldVault.address, 
                mintingWalletSignature,
                transactionWalletSignature,
                socialVaultSignature,
                coldVaultSignature
            );
        
            const userWallets = await taps.userWalletConfigs(coldVault.address);
            expect(userWallets.coldVault).to.equal(coldVault.address);
            expect(userWallets.socialVault).to.equal(socialVault.address);
            expect(userWallets.mintingWallet).to.equal(mintWallet.address);
            expect(userWallets.transactionWallet).to.equal(transactionWallet.address);
        });

        it("Should allow a user to set all wallet and vault configs in NonSigningCold mode", async function () {
            const message = ethers.utils.solidityKeccak256(["string", "address"], ["Approve setup for TAPS Contract at ", taps.address]);
            const messageHashBytes = ethers.utils.arrayify(message);

            const mintingWalletSignature = await mintWallet.signMessage(messageHashBytes);
            const transactionWalletSignature = await transactionWallet.signMessage(messageHashBytes);
            const socialVaultSignature = await socialVault.signMessage(messageHashBytes);

            await taps.connect(socialVault).setAllWalletAndVaultConfigsNonSigningCold(
                mintWallet.address, 
                transactionWallet.address, 
                socialVault.address, 
                coldVault.address, 
                mintingWalletSignature,
                transactionWalletSignature,
                socialVaultSignature
            );
        
            const userWallets = await taps.userWalletConfigs(coldVault.address);
            expect(userWallets.coldVault).to.equal(coldVault.address);
            expect(userWallets.socialVault).to.equal(socialVault.address);
            expect(userWallets.mintingWallet).to.equal(mintWallet.address);
            expect(userWallets.transactionWallet).to.equal(transactionWallet.address);
        });

        const generateSignatures = async (includeCold = true) => {
            const message = ethers.utils.solidityKeccak256(["string", "address"], ["Approve setup for TAPS Contract at ", taps.address]);
            const messageHashBytes = ethers.utils.arrayify(message);
    
            const mintingWalletSignature = await mintWallet.signMessage(messageHashBytes);
            const transactionWalletSignature = await transactionWallet.signMessage(messageHashBytes);
            const socialVaultSignature = await socialVault.signMessage(messageHashBytes);
            const coldVaultSignature = includeCold ? await coldVault.signMessage(messageHashBytes) : null;
    
            return { mintingWalletSignature, transactionWalletSignature, socialVaultSignature, coldVaultSignature };
        };

        it("Should revert for invalid signatures in SigningCold mode", async function () {
            const { mintingWalletSignature, transactionWalletSignature, socialVaultSignature, coldVaultSignature } = await generateSignatures();
        
            // Modify one of the signatures to make it invalid
            const invalidSignature = ethers.utils.hexlify(ethers.utils.randomBytes(65));
            await expect(
                taps.connect(coldVault).setAllWalletAndVaultConfigsSigningCold(
                    mintWallet.address, 
                    transactionWallet.address, 
                    socialVault.address, 
                    coldVault.address, 
                    invalidSignature, // Using the invalid signature here
                    transactionWalletSignature,
                    socialVaultSignature,
                    coldVaultSignature
                )
            ).to.be.revertedWith("Minting wallet signature mismatch"); // Assuming your contract reverts with this message
        });
        
        it("Should revert for invalid signatures in NonSigningCold mode", async function () {
            const { mintingWalletSignature, transactionWalletSignature, socialVaultSignature } = await generateSignatures(false);
        
            // Modify one of the signatures to make it invalid
            const invalidSignature = ethers.utils.hexlify(ethers.utils.randomBytes(65));
            await expect(
                taps.connect(socialVault).setAllWalletAndVaultConfigsNonSigningCold(
                    mintWallet.address, 
                    transactionWallet.address, 
                    socialVault.address, 
                    coldVault.address, 
                    invalidSignature, // Using the invalid signature here
                    transactionWalletSignature,
                    socialVaultSignature
                )
            ).to.be.revertedWith("Minting wallet signature mismatch"); // Assuming your contract reverts with this message
        });        

        it("Should not allow setting the same address for mint and transaction wallets", async function () {
            const { mintingWalletSignature, transactionWalletSignature, socialVaultSignature, coldVaultSignature } = await generateSignatures();
            await expect(taps.connect(coldVault).setAllWalletAndVaultConfigsSigningCold(mintWallet.address, mintWallet.address, socialVault.address, coldVault.address, mintingWalletSignature, transactionWalletSignature, socialVaultSignature, coldVaultSignature)).to.be.revertedWith("Wallet and vault addresses must be unique");
        });

        it("Should not allow the same address for mint and social vaults", async function () {
            const { mintingWalletSignature, transactionWalletSignature, socialVaultSignature, coldVaultSignature } = await generateSignatures();
            await expect(taps.connect(coldVault).setAllWalletAndVaultConfigsSigningCold(mintWallet.address, transactionWallet.address, mintWallet.address, coldVault.address, mintingWalletSignature, transactionWalletSignature, socialVaultSignature, coldVaultSignature)).to.be.revertedWith("Wallet and vault addresses must be unique");
        });
    
        it("Should not allow the same address for mint and cold vaults", async function () {
            const { mintingWalletSignature, transactionWalletSignature, socialVaultSignature, coldVaultSignature } = await generateSignatures();
            await expect(taps.connect(coldVault).setAllWalletAndVaultConfigsSigningCold(coldVault.address, transactionWallet.address, socialVault.address, coldVault.address, mintingWalletSignature, transactionWalletSignature, socialVaultSignature, coldVaultSignature)).to.be.revertedWith("Wallet and vault addresses must be unique");
        });
    
        it("Should not allow the same address for transaction and social vaults", async function () {
            const { mintingWalletSignature, transactionWalletSignature, socialVaultSignature, coldVaultSignature } = await generateSignatures();
            await expect(taps.connect(coldVault).setAllWalletAndVaultConfigsSigningCold(mintWallet.address, socialVault.address, socialVault.address, coldVault.address, mintingWalletSignature, transactionWalletSignature, socialVaultSignature, coldVaultSignature)).to.be.revertedWith("Wallet and vault addresses must be unique");
        });
    
        it("Should not allow the same address for transaction and cold vaults", async function () {
            const { mintingWalletSignature, transactionWalletSignature, socialVaultSignature, coldVaultSignature } = await generateSignatures();
            await expect(taps.connect(coldVault).setAllWalletAndVaultConfigsSigningCold(mintWallet.address, coldVault.address, socialVault.address, coldVault.address, mintingWalletSignature, transactionWalletSignature, socialVaultSignature, coldVaultSignature)).to.be.revertedWith("Wallet and vault addresses must be unique");
        });
    
        it("Should not allow the same address for social and cold vaults", async function () {
            const { mintingWalletSignature, transactionWalletSignature, socialVaultSignature, coldVaultSignature } = await generateSignatures();
            await expect(taps.connect(coldVault).setAllWalletAndVaultConfigsSigningCold(mintWallet.address, transactionWallet.address, coldVault.address, coldVault.address, mintingWalletSignature, transactionWalletSignature, socialVaultSignature, coldVaultSignature)).to.be.revertedWith("Wallet and vault addresses must be unique");
        });
        
    });

    describe("Wallet Swapping in SigningCold Mode", function() {
        beforeEach(async function() {
            const message = ethers.utils.solidityKeccak256(["string", "address"], ["Approve setup for TAPS Contract at ", taps.address]);
            const messageHashBytes = ethers.utils.arrayify(message);

            const mintingWalletSignature = await mintWallet.signMessage(messageHashBytes);
            const transactionWalletSignature = await transactionWallet.signMessage(messageHashBytes);
            const socialVaultSignature = await socialVault.signMessage(messageHashBytes);
            const coldVaultSignature = await coldVault.signMessage(messageHashBytes);

            await taps.connect(coldVault).setAllWalletAndVaultConfigsSigningCold(
                mintWallet.address, 
                transactionWallet.address, 
                socialVault.address, 
                coldVault.address, 
                mintingWalletSignature,
                transactionWalletSignature,
                socialVaultSignature,
                coldVaultSignature
            );
        });
    
        it("Allows the cold vault to swap the minting wallet", async function() {
            // Generate a signature from mintWallet2 to approve the swap
            const swapMessage = ethers.utils.solidityKeccak256(["string", "address"], ["Approve minting wallet swap for TAPS Contract at ", taps.address]);
            const swapMessageHashBytes = ethers.utils.arrayify(swapMessage);
            const mintWallet2Signature = await mintWallet2.signMessage(swapMessageHashBytes);
    
            await taps.connect(coldVault).swapMintingWallet(mintWallet2.address, mintWallet2Signature);
            const userWallets = await taps.userWalletConfigs(coldVault.address);
            expect(userWallets.mintingWallet).to.equal(mintWallet2.address);
        });

        it("Allows the cold vault to swap the transaction wallet", async function() {
            // Generate a signature from transactionWallet2 to approve the swap
            const swapMessage = ethers.utils.solidityKeccak256(["string", "address"], ["Approve transaction wallet swap for TAPS Contract at ", taps.address]);
            const swapMessageHashBytes = ethers.utils.arrayify(swapMessage);
            const transactionWallet2Signature = await transactionWallet2.signMessage(swapMessageHashBytes);
        
            await taps.connect(coldVault).swapTransactionWallet(transactionWallet2.address, transactionWallet2Signature);
            const userWallets = await taps.userWalletConfigs(coldVault.address);
            expect(userWallets.transactionWallet).to.equal(transactionWallet2.address);
        });

        it("Allows the cold vault to swap the social vault", async function() {
            // Generate a signature from socialVault2 to approve the swap
            const swapMessage = ethers.utils.solidityKeccak256(["string", "address"], ["Approve social vault swap for TAPS Contract at ", taps.address]);
            const swapMessageHashBytes = ethers.utils.arrayify(swapMessage);
            const socialVault2Signature = await socialVault2.signMessage(swapMessageHashBytes);
        
            await taps.connect(coldVault).swapSocialVault(socialVault2.address, socialVault2Signature);
            const userWallets = await taps.userWalletConfigs(coldVault.address);
            expect(userWallets.socialVault).to.equal(socialVault2.address);
        });        

        it("Rejects attempts by non-cold vaults to swap the minting wallet", async function() {
            // Generate a signature from mintWallet2 as a placeholder
            const swapMessage = ethers.utils.solidityKeccak256(["string", "address"], ["Approve minting wallet swap for TAPS Contract at ", taps.address]);
            const swapMessageHashBytes = ethers.utils.arrayify(swapMessage);
            const mintWallet2Signature = await mintWallet2.signMessage(swapMessageHashBytes);
        
            await expect(taps.connect(mintWallet).swapMintingWallet(mintWallet2.address, mintWallet2Signature)).to.be.revertedWith("Only the cold vault can perform this operation in SigningCold mode");
            await expect(taps.connect(transactionWallet).swapMintingWallet(mintWallet2.address, mintWallet2Signature)).to.be.revertedWith("Only the cold vault can perform this operation in SigningCold mode");
            await expect(taps.connect(socialVault).swapMintingWallet(mintWallet2.address, mintWallet2Signature)).to.be.revertedWith("Only the cold vault can perform this operation in SigningCold mode");
        });        

        it("Rejects attempts by non-cold vaults to swap the transaction wallet", async function() {
            // Generate a signature from transactionWallet2 to approve the swap
            const swapMessage = ethers.utils.solidityKeccak256(["string", "address"], ["Approve transaction wallet swap for TAPS Contract at ", taps.address]);
            const swapMessageHashBytes = ethers.utils.arrayify(swapMessage);
            const transactionWallet2Signature = await transactionWallet2.signMessage(swapMessageHashBytes);
        
            await expect(taps.connect(mintWallet).swapTransactionWallet(transactionWallet2.address, transactionWallet2Signature)).to.be.revertedWith("Only the cold vault can perform this operation in SigningCold mode");
            await expect(taps.connect(socialVault).swapTransactionWallet(transactionWallet2.address, transactionWallet2Signature)).to.be.revertedWith("Only the cold vault can perform this operation in SigningCold mode");
        });
        
        it("Rejects swapping to an invalid minting wallet address", async function() {
            // Generate a signature from AddressZero (though it's invalid, just to follow the function's signature)
            const swapMessage = ethers.utils.solidityKeccak256(["string", "address"], ["Approve minting wallet swap for TAPS Contract at ", taps.address]);
            const swapMessageHashBytes = ethers.utils.arrayify(swapMessage);
            const zeroAddressSignature = "0x"; // This is a placeholder since AddressZero can't sign a message
        
            await expect(taps.connect(coldVault).swapMintingWallet(ethers.constants.AddressZero, zeroAddressSignature)).to.be.revertedWith("Invalid minting wallet address");
        });
        
        it("Rejects swapping to an invalid transaction wallet address", async function() {
            // Generate a signature from AddressZero (though it's invalid, just to follow the function's signature)
            const swapMessage = ethers.utils.solidityKeccak256(["string", "address"], ["Approve transaction wallet swap for TAPS Contract at ", taps.address]);
            const swapMessageHashBytes = ethers.utils.arrayify(swapMessage);
            const zeroAddressSignature = "0x"; // This is a placeholder since AddressZero can't sign a message
        
            await expect(taps.connect(coldVault).swapTransactionWallet(ethers.constants.AddressZero, zeroAddressSignature)).to.be.revertedWith("Invalid transaction wallet address");
        });
        
    });

    describe("Wallet Swapping in NonSigningCold Mode", function() {
        beforeEach(async function() {
            const message = ethers.utils.solidityKeccak256(["string", "address"], ["Approve setup for TAPS Contract at ", taps.address]);
            const messageHashBytes = ethers.utils.arrayify(message);
    
            const mintingWalletSignature = await mintWallet.signMessage(messageHashBytes);
            const transactionWalletSignature = await transactionWallet.signMessage(messageHashBytes);
            const socialVaultSignature = await socialVault.signMessage(messageHashBytes);
    
            await taps.connect(socialVault).setAllWalletAndVaultConfigsNonSigningCold(
                mintWallet.address, 
                transactionWallet.address, 
                socialVault.address, 
                coldVault.address, 
                mintingWalletSignature,
                transactionWalletSignature,
                socialVaultSignature
            );
        });
    
        it("Allows the social vault to swap the minting wallet", async function() {
            const swapMessage = ethers.utils.solidityKeccak256(["string", "address"], ["Approve minting wallet swap for TAPS Contract at ", taps.address]);
            const swapMessageHashBytes = ethers.utils.arrayify(swapMessage);
            const mintWallet2Signature = await mintWallet2.signMessage(swapMessageHashBytes);

            await taps.connect(socialVault).swapMintingWallet(mintWallet2.address, mintWallet2Signature);
            const userWallets = await taps.userWalletConfigs(coldVault.address);
            expect(userWallets.mintingWallet).to.equal(mintWallet2.address);
        });
    
        it("Allows the social vault to swap the transaction wallet", async function() {
            const swapMessage = ethers.utils.solidityKeccak256(["string", "address"], ["Approve transaction wallet swap for TAPS Contract at ", taps.address]);
            const swapMessageHashBytes = ethers.utils.arrayify(swapMessage);
            const transactionWallet2Signature = await transactionWallet2.signMessage(swapMessageHashBytes);
        
            await taps.connect(socialVault).swapTransactionWallet(transactionWallet2.address, transactionWallet2Signature);
            const userWallets = await taps.userWalletConfigs(coldVault.address);
            expect(userWallets.transactionWallet).to.equal(transactionWallet2.address);
        });
    
        it("Allows the social vault to swap the social vault", async function() {
            const swapMessage = ethers.utils.solidityKeccak256(["string", "address"], ["Approve social vault swap for TAPS Contract at ", taps.address]);
            const swapMessageHashBytes = ethers.utils.arrayify(swapMessage);
            const socialVault2Signature = await socialVault2.signMessage(swapMessageHashBytes);
        
            await taps.connect(socialVault).swapSocialVault(socialVault2.address, socialVault2Signature);
            const userWallets = await taps.userWalletConfigs(coldVault.address);
            expect(userWallets.socialVault).to.equal(socialVault2.address);
        });        
    
        it("Rejects attempts by non-social vaults to swap the transaction wallet", async function() {
            const swapMessage = ethers.utils.solidityKeccak256(["string", "address"], ["Approve transaction wallet swap for TAPS Contract at ", taps.address]);
            const swapMessageHashBytes = ethers.utils.arrayify(swapMessage);
            const transactionWallet2Signature = await transactionWallet2.signMessage(swapMessageHashBytes);
        
            await expect(taps.connect(mintWallet).swapTransactionWallet(transactionWallet2.address, transactionWallet2Signature)).to.be.revertedWith("Only the social vault can perform this operation in NonSigningCold mode");
            await expect(taps.connect(coldVault).swapTransactionWallet(transactionWallet2.address, transactionWallet2Signature)).to.be.revertedWith("Only the social vault can perform this operation in NonSigningCold mode");
        });
    
        it("Rejects swapping to an invalid minting wallet address", async function() {
            const swapMessage = ethers.utils.solidityKeccak256(["string", "address"], ["Approve minting wallet swap for TAPS Contract at ", taps.address]);
            const swapMessageHashBytes = ethers.utils.arrayify(swapMessage);
            const zeroAddressSignature = "0x"; // This is a placeholder since AddressZero can't sign a message
        
            await expect(taps.connect(socialVault).swapMintingWallet(ethers.constants.AddressZero, zeroAddressSignature)).to.be.revertedWith("Invalid minting wallet address");
        });
    
        it("Rejects swapping to an invalid transaction wallet address", async function() {
            const swapMessage = ethers.utils.solidityKeccak256(["string", "address"], ["Approve transaction wallet swap for TAPS Contract at ", taps.address]);
            const swapMessageHashBytes = ethers.utils.arrayify(swapMessage);
            const zeroAddressSignature = "0x"; // This is a placeholder since AddressZero can't sign a message
        
            await expect(taps.connect(socialVault).swapTransactionWallet(ethers.constants.AddressZero, zeroAddressSignature)).to.be.revertedWith("Invalid transaction wallet address");
        });

        it("Rejects attempts by non-social vaults to swap the minting wallet", async function() {
            const swapMessage = ethers.utils.solidityKeccak256(["string", "address"], ["Approve minting wallet swap for TAPS Contract at ", taps.address]);
            const swapMessageHashBytes = ethers.utils.arrayify(swapMessage);
            const mintWallet2Signature = await mintWallet2.signMessage(swapMessageHashBytes);
    
            await expect(taps.connect(mintWallet).swapMintingWallet(mintWallet2.address, mintWallet2Signature)).to.be.revertedWith("Only the social vault can perform this operation in NonSigningCold mode");
            await expect(taps.connect(transactionWallet).swapMintingWallet(mintWallet2.address, mintWallet2Signature)).to.be.revertedWith("Only the social vault can perform this operation in NonSigningCold mode");
            await expect(taps.connect(coldVault).swapMintingWallet(mintWallet2.address, mintWallet2Signature)).to.be.revertedWith("Only the social vault can perform this operation in NonSigningCold mode");
        });
    });

    describe("Wallet Swapping Without setting wallets and vaults first in SigningCold Mode", function() {
        it("Should not allow swapping minting wallet if no existing minting wallet", async function () {
            // Generate a signature from mintWallet2 to approve the swap
            const swapMessage = ethers.utils.solidityKeccak256(["string", "address"], ["Approve minting wallet swap for TAPS Contract at ", taps.address]);
            const swapMessageHashBytes = ethers.utils.arrayify(swapMessage);
            const mintWallet2Signature = await mintWallet2.signMessage(swapMessageHashBytes);
    
            await expect(taps.connect(coldVault).swapMintingWallet(mintWallet2.address, mintWallet2Signature)).to.be.revertedWith("Invalid mode or sender");
        });
    
        it("Should not allow swapping transaction wallet if no existing transaction wallet", async function () {
            // Generate a signature from transactionWallet2 to approve the swap
            const swapMessage = ethers.utils.solidityKeccak256(["string", "address"], ["Approve transaction wallet swap for TAPS Contract at ", taps.address]);
            const swapMessageHashBytes = ethers.utils.arrayify(swapMessage);
            const transactionWallet2Signature = await transactionWallet2.signMessage(swapMessageHashBytes);
    
            await expect(taps.connect(coldVault).swapTransactionWallet(transactionWallet2.address, transactionWallet2Signature)).to.be.revertedWith("Invalid mode or sender");
        });
    
        it("Should not allow swapping social vault if no existing social vault", async function () {
            // Generate a signature from socialVault2 to approve the swap
            const swapMessage = ethers.utils.solidityKeccak256(["string", "address"], ["Approve social vault swap for TAPS Contract at ", taps.address]);
            const swapMessageHashBytes = ethers.utils.arrayify(swapMessage);
            const socialVault2Signature = await socialVault2.signMessage(swapMessageHashBytes);
    
            await expect(taps.connect(coldVault).swapSocialVault(socialVault2.address, socialVault2Signature)).to.be.revertedWith("Invalid mode or sender");
        });
    });
    

    describe("Wallet Swapping Without setting wallets and vaults first in NonSigningCold Mode", function() {
        it("Should not allow swapping minting wallet if no existing minting wallet", async function () {
            // Generate a signature from mintWallet2 to approve the swap
            const swapMessage = ethers.utils.solidityKeccak256(["string", "address"], ["Approve minting wallet swap for TAPS Contract at ", taps.address]);
            const swapMessageHashBytes = ethers.utils.arrayify(swapMessage);
            const mintWallet2Signature = await mintWallet2.signMessage(swapMessageHashBytes);
    
            await expect(taps.connect(socialVault).swapMintingWallet(mintWallet2.address, mintWallet2Signature)).to.be.revertedWith("Invalid mode or sender");
        });
    
        it("Should not allow swapping transaction wallet if no existing transaction wallet", async function () {
            // Generate a signature from transactionWallet2 to approve the swap
            const swapMessage = ethers.utils.solidityKeccak256(["string", "address"], ["Approve transaction wallet swap for TAPS Contract at ", taps.address]);
            const swapMessageHashBytes = ethers.utils.arrayify(swapMessage);
            const transactionWallet2Signature = await transactionWallet2.signMessage(swapMessageHashBytes);
    
            await expect(taps.connect(socialVault).swapTransactionWallet(transactionWallet2.address, transactionWallet2Signature)).to.be.revertedWith("Invalid mode or sender");
        });
    
        it("Should not allow swapping social vault if no existing social vault", async function () {
            // Generate a signature from socialVault2 to approve the swap
            const swapMessage = ethers.utils.solidityKeccak256(["string", "address"], ["Approve social vault swap for TAPS Contract at ", taps.address]);
            const swapMessageHashBytes = ethers.utils.arrayify(swapMessage);
            const socialVault2Signature = await socialVault2.signMessage(swapMessageHashBytes);
    
            await expect(taps.connect(socialVault).swapSocialVault(socialVault2.address, socialVault2Signature)).to.be.revertedWith("Invalid mode or sender");
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
        const amountToSendBeforeEach = ethers.utils.parseEther("5"); // 5 Ether
    
        beforeEach(async function() {
            const message = ethers.utils.solidityKeccak256(["string", "address"], ["Approve setup for TAPS Contract at ", taps.address]);
            const messageHashBytes = ethers.utils.arrayify(message);
    
            const mintingWalletSignature = await mintWallet.signMessage(messageHashBytes);
            const transactionWalletSignature = await transactionWallet.signMessage(messageHashBytes);
            const socialVaultSignature = await socialVault.signMessage(messageHashBytes);
            const coldVaultSignature = await coldVault.signMessage(messageHashBytes);
    
            await taps.connect(coldVault).setAllWalletAndVaultConfigsSigningCold(
                mintWallet.address, 
                transactionWallet.address, 
                socialVault.address, 
                coldVault.address, 
                mintingWalletSignature,
                transactionWalletSignature,
                socialVaultSignature,
                coldVaultSignature
            );

            // // Get the default signer 
            // const [deployer] = await ethers.getSigners();

            // // Send some Ether to the coldVault so it has funds to vault
            // await deployer.sendTransaction({
            //     to: coldVault.address,
            //     value: amountToSendBeforeEach.toString()  // Convert the BigNumber to a string
            // });

            // // Send some Ether to the mintWallet so it has funds to vault
            // await deployer.sendTransaction({
            //     to: mintWallet.address,
            //     value: amountToSendBeforeEach.toString()  // Convert the BigNumber to a string
            // });
        });
    
        // Vaulting Scenarios
        it("Should not allow vaulting from cold vault", async function () {
            await expect(taps.connect(coldVault).vaultETH(WalletType.Transaction, { value: amountToSend })).to.be.revertedWith("Invalid sender-destination combination");
        });
    
        it("Should allow vaulting from minting wallet to cold vault", async function () {
            await taps.connect(mintWallet).vaultETH(WalletType.Cold, { value: amountToSend });
        });
    
        it("Should allow vaulting from minting wallet to social vault", async function () {
            await taps.connect(mintWallet).vaultETH(WalletType.Social, { value: amountToSend });
        });
    
        it("Should allow vaulting from minting wallet to transaction wallet", async function () {
            await taps.connect(mintWallet).vaultETH(WalletType.Transaction, { value: amountToSend });
        });
    
        it("Should allow vaulting from transaction wallet to cold vault", async function () {
            await taps.connect(transactionWallet).vaultETH(WalletType.Cold, { value: amountToSend });
        });
    
        it("Should allow vaulting from transaction wallet to social vault", async function () {
            await taps.connect(transactionWallet).vaultETH(WalletType.Social, { value: amountToSend });
        });
    
        it("Should allow vaulting from social vault to cold vault", async function () {
            await taps.connect(socialVault).vaultETH(WalletType.Cold, { value: amountToSend });
        });
    
        // Unvaulting Scenarios
        it("Should not allow unvaulting to minting wallet", async function () {
            await expect(taps.connect(coldVault).unvaultETH(WalletType.Minting, { value: amountToSend })).to.be.revertedWith("Invalid destination wallet type");
        });
    
        it("Should allow unvaulting from cold vault to social vault", async function () {
            await taps.connect(coldVault).unvaultETH(WalletType.Social, { value: amountToSend });
        });
    
        it("Should allow unvaulting from cold vault to transaction wallet", async function () {
            await taps.connect(coldVault).unvaultETH(WalletType.Transaction, { value: amountToSend });
        });
    
        it("Should allow unvaulting from social vault to transaction wallet", async function () {
            await taps.connect(socialVault).unvaultETH(WalletType.Transaction, { value: amountToSend });
        });
    
        // Invalid Unvaulting Scenarios
        it("Should not allow unvaulting from transaction wallet", async function () {
            await expect(taps.connect(transactionWallet).unvaultETH(WalletType.Cold, { value: amountToSend })).to.be.revertedWith("Invalid sender-destination combination");
        });
    
        it("Should not allow unvaulting from minting wallet", async function () {
            await expect(taps.connect(mintWallet).unvaultETH(WalletType.Cold, { value: amountToSend })).to.be.revertedWith("Invalid sender-destination combination");
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
            const message = ethers.utils.solidityKeccak256(["string", "address"], ["Approve setup for TAPS Contract at ", taps.address]);
            const messageHashBytes = ethers.utils.arrayify(message);
    
            const mintingWalletSignature = await mintWallet.signMessage(messageHashBytes);
            const transactionWalletSignature = await transactionWallet.signMessage(messageHashBytes);
            const socialVaultSignature = await socialVault.signMessage(messageHashBytes);
    
            await taps.connect(socialVault).setAllWalletAndVaultConfigsNonSigningCold(
                mintWallet.address, 
                transactionWallet.address, 
                socialVault.address, 
                coldVault.address, 
                mintingWalletSignature,
                transactionWalletSignature,
                socialVaultSignature
            );

            // Get the default signer
            const [deployer] = await ethers.getSigners();

            // Send some Ether to the coldVault so it has funds to vault
            await deployer.sendTransaction({
                to: coldVault.address,
                value: amountToSend.toString()  // Convert the BigNumber to a string
            });
        });
    
        // Vaulting Scenarios
        it("Should not allow vaulting from cold vault", async function () {
            await expect(taps.connect(coldVault).vaultETH(WalletType.Transaction, { value: amountToSend })).to.be.revertedWith("Invalid sender-destination combination");
        });
    
        it("Should allow vaulting from minting wallet to cold vault", async function () {
            await taps.connect(mintWallet).vaultETH(WalletType.Cold, { value: amountToSend });
        });
    
        it("Should allow vaulting from minting wallet to social vault", async function () {
            await taps.connect(mintWallet).vaultETH(WalletType.Social, { value: amountToSend });
        });
    
        it("Should allow vaulting from minting wallet to transaction wallet", async function () {
            await taps.connect(mintWallet).vaultETH(WalletType.Transaction, { value: amountToSend });
        });
    
        it("Should allow vaulting from transaction wallet to cold vault", async function () {
            await taps.connect(transactionWallet).vaultETH(WalletType.Cold, { value: amountToSend });
        });
    
        it("Should allow vaulting from transaction wallet to social vault", async function () {
            await taps.connect(transactionWallet).vaultETH(WalletType.Social, { value: amountToSend });
        });
    
        it("Should allow vaulting from social vault to cold vault", async function () {
            await taps.connect(socialVault).vaultETH(WalletType.Cold, { value: amountToSend });
        });

        it("Should not allow unvaulting to minting wallet", async function () {
            await expect(taps.connect(socialVault).unvaultETH(WalletType.Minting, { value: amountToSend })).to.be.revertedWith("Invalid destination wallet type");
        });
    
        it("Should not allow unvaulting from cold vault to social vault", async function () {
            await expect(taps.connect(coldVault).unvaultETH(WalletType.Social, { value: amountToSend })).to.be.revertedWith("Invalid sender-destination combination");
        });
    
        it("Should not allow unvaulting from cold vault to transaction wallet", async function () {
            await expect(taps.connect(coldVault).unvaultETH(WalletType.Transaction, { value: amountToSend })).to.be.revertedWith("Invalid sender-destination combination");
        });
    
        // Unvaulting Scenarios    
        it("Should allow unvaulting from social vault to transaction wallet", async function () {
            await taps.connect(socialVault).unvaultETH(WalletType.Transaction, { value: amountToSend });
        });
    
        // Invalid Unvaulting Scenarios
        it("Should not allow unvaulting from transaction wallet", async function () {
            await expect(taps.connect(transactionWallet).unvaultETH(WalletType.Cold, { value: amountToSend })).to.be.revertedWith("Invalid sender-destination combination");
        });
    
        it("Should not allow unvaulting from minting wallet", async function () {
            await expect(taps.connect(mintWallet).unvaultETH(WalletType.Cold, { value: amountToSend })).to.be.revertedWith("Invalid sender-destination combination");
        });
    });
    
    describe("Token Vaulting and Unvaulting in SigningCold mode ERC721A", function() {
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
    
            const message = ethers.utils.solidityKeccak256(["string", "address"], ["Approve setup for TAPS Contract at ", taps.address]);
            const messageHashBytes = ethers.utils.arrayify(message);
    
            const mintingWalletSignature = await mintWallet.signMessage(messageHashBytes);
            const transactionWalletSignature = await transactionWallet.signMessage(messageHashBytes);
            const socialVaultSignature = await socialVault.signMessage(messageHashBytes);
            const coldVaultSignature = await coldVault.signMessage(messageHashBytes);
    
            await taps.connect(coldVault).setAllWalletAndVaultConfigsSigningCold(
                mintWallet.address, 
                transactionWallet.address, 
                socialVault.address, 
                coldVault.address, 
                mintingWalletSignature,
                transactionWalletSignature,
                socialVaultSignature,
                coldVaultSignature
            );

        });
    
        it("Should not allow vaulting tokens from cold vault", async function () {
            await expect(taps.connect(coldVault).vaultToken(WalletType.Transaction, erc721a.address, FIRST_TOKEN_ID))
                .to.be.revertedWith("Invalid sender-destination combination");
        });
    
        it("Should allow vaulting tokens from minting wallet to cold vault", async function () {
            await erc721a.connect(mintWallet).approve(taps.address, FIRST_TOKEN_ID);
            await taps.connect(mintWallet).vaultToken(WalletType.Cold, erc721a.address, FIRST_TOKEN_ID);
            expect(await erc721a.ownerOf(FIRST_TOKEN_ID)).to.equal(coldVault.address);
        });

        it("Should allow vaulting tokens from transaction wallet to cold vault", async function () {
            const tokenId = FIRST_TOKEN_ID + 1; // The next token ID after mintWallet's token
            await erc721a.connect(transactionWallet).approve(taps.address, tokenId);
            await taps.connect(transactionWallet).vaultToken(WalletType.Cold, erc721a.address, tokenId);
            expect(await erc721a.ownerOf(tokenId)).to.equal(coldVault.address);
        });

        it("Should allow vaulting tokens from social vault to cold vault", async function () {
            const tokenId = FIRST_TOKEN_ID + 2; // The next token ID after transactionWallet's token
            await erc721a.connect(socialVault).approve(taps.address, tokenId);
            await taps.connect(socialVault).vaultToken(WalletType.Cold, erc721a.address, tokenId);
            expect(await erc721a.ownerOf(tokenId)).to.equal(coldVault.address);
        });

        it("Should not allow unvaulting tokens from cold vault to minting wallet", async function () {
            const tokenId = FIRST_TOKEN_ID + 3; // The token ID minted to coldVault
            await expect(taps.connect(coldVault).unvaultToken(WalletType.Minting, erc721a.address, tokenId)).to.be.revertedWith("Invalid destination wallet type");;
        });
        

        it("Should allow unvaulting tokens from cold vault to transaction wallet", async function () {
            const tokenId = FIRST_TOKEN_ID + 3; // Assuming we're using the same token as the previous test
            await erc721a.connect(coldVault).approve(taps.address, tokenId);
            await taps.connect(coldVault).unvaultToken(WalletType.Transaction, erc721a.address, tokenId);
            expect(await erc721a.ownerOf(tokenId)).to.equal(transactionWallet.address);
        });

        it("Should allow unvaulting tokens from cold vault to social vault", async function () {
            const tokenId = FIRST_TOKEN_ID + 3; // Assuming we're using the same token as the previous tests
            await erc721a.connect(coldVault).approve(taps.address, tokenId);
            await taps.connect(coldVault).unvaultToken(WalletType.Social, erc721a.address, tokenId);
            expect(await erc721a.ownerOf(tokenId)).to.equal(socialVault.address);
        });
    });
    
    describe("Token Vaulting and Unvaulting in NonSigningCold mode ERC721A", function() {
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
    
            const message = ethers.utils.solidityKeccak256(["string", "address"], ["Approve setup for TAPS Contract at ", taps.address]);
            const messageHashBytes = ethers.utils.arrayify(message);
    
            const mintingWalletSignature = await mintWallet.signMessage(messageHashBytes);
            const transactionWalletSignature = await transactionWallet.signMessage(messageHashBytes);
            const socialVaultSignature = await socialVault.signMessage(messageHashBytes);
    
            await taps.connect(socialVault).setAllWalletAndVaultConfigsNonSigningCold(
                mintWallet.address, 
                transactionWallet.address, 
                socialVault.address, 
                coldVault.address, 
                mintingWalletSignature,
                transactionWalletSignature,
                socialVaultSignature
            );
        });
    
        it("Should not allow vaulting tokens from cold vault", async function () {
            await expect(taps.connect(socialVault).vaultToken(WalletType.Transaction, erc721a.address, FIRST_TOKEN_ID))
                .to.be.revertedWith("Invalid sender-destination combination");
        });
    
        it("Should allow vaulting tokens from minting wallet to cold vault", async function () {
            await erc721a.connect(mintWallet).approve(taps.address, FIRST_TOKEN_ID);
            await taps.connect(mintWallet).vaultToken(WalletType.Cold, erc721a.address, FIRST_TOKEN_ID);
            expect(await erc721a.ownerOf(FIRST_TOKEN_ID)).to.equal(coldVault.address);
        });

        it("Should allow vaulting tokens from transaction wallet to cold vault", async function () {
            const tokenId = FIRST_TOKEN_ID + 1; // The next token ID after mintWallet's token
            await erc721a.connect(transactionWallet).approve(taps.address, tokenId);
            await taps.connect(transactionWallet).vaultToken(WalletType.Cold, erc721a.address, tokenId);
            expect(await erc721a.ownerOf(tokenId)).to.equal(coldVault.address);
        });

        it("Should allow vaulting tokens from social vault to cold vault", async function () {
            const tokenId = FIRST_TOKEN_ID + 2; // The next token ID after transactionWallet's token
            await erc721a.connect(socialVault).approve(taps.address, tokenId);
            await taps.connect(socialVault).vaultToken(WalletType.Cold, erc721a.address, tokenId);
            expect(await erc721a.ownerOf(tokenId)).to.equal(coldVault.address);
        });

        it("Should not allow unvaulting tokens from cold vault to minting wallet", async function () {
            const tokenId = FIRST_TOKEN_ID + 3; // The token ID minted to coldVault
            await erc721a.connect(coldVault).approve(taps.address, tokenId);
            await expect(taps.connect(coldVault).unvaultToken(WalletType.Minting, erc721a.address, tokenId)).to.be.revertedWith("Invalid destination wallet type");;
        });
        
        it("Should not allow unvaulting tokens from cold vault to transaction wallet", async function () {
            const tokenId = FIRST_TOKEN_ID + 3; // Assuming we're using the same token as the previous test
            await erc721a.connect(coldVault).approve(taps.address, tokenId);
            await expect(taps.connect(coldVault).unvaultToken(WalletType.Transaction, erc721a.address, tokenId))
                .to.be.revertedWith("Invalid sender-destination combination");
        });
    
        it("Should not allow unvaulting tokens from cold vault to social vault", async function () {
            const tokenId = FIRST_TOKEN_ID + 3; // Assuming we're using the same token as the previous tests
            await erc721a.connect(coldVault).approve(taps.address, tokenId);
            await expect(taps.connect(coldVault).unvaultToken(WalletType.Social, erc721a.address, tokenId))
                .to.be.revertedWith("Invalid sender-destination combination");
        });
    });

    describe("Token Vaulting and Unvaulting in SigningCold mode ERC1155", function() {
        const WalletType = {
            Minting: 0,
            Transaction: 1,
            Social: 2,
            Cold: 3
        };
    
        const FIRST_TOKEN_ID = 0;
        const MINT_AMOUNT = 1;
    
        let erc1155;
    
        const MOCK_DATA = ethers.utils.randomBytes(32); // mock data for the mint function
        
        beforeEach(async function() {
            ERC1155 = await ethers.getContractFactory("MyCollectible1155");
            erc1155 = await ERC1155.deploy();
            await erc1155.deployed();
        
            await erc1155.connect(mintWallet).mint(mintWallet.address, FIRST_TOKEN_ID, MINT_AMOUNT, MOCK_DATA);
            await erc1155.connect(transactionWallet).mint(transactionWallet.address, FIRST_TOKEN_ID, MINT_AMOUNT, MOCK_DATA);
            await erc1155.connect(socialVault).mint(socialVault.address, FIRST_TOKEN_ID, MINT_AMOUNT, MOCK_DATA);
            await erc1155.connect(coldVault).mint(coldVault.address, FIRST_TOKEN_ID, MINT_AMOUNT, MOCK_DATA);
    
            const balance = await erc1155.balanceOf(mintWallet.address, FIRST_TOKEN_ID);
            expect(balance).to.equal(MINT_AMOUNT);

    
            const message = ethers.utils.solidityKeccak256(["string", "address"], ["Approve setup for TAPS Contract at ", taps.address]);
            const messageHashBytes = ethers.utils.arrayify(message);
    
            const mintingWalletSignature = await mintWallet.signMessage(messageHashBytes);
            const transactionWalletSignature = await transactionWallet.signMessage(messageHashBytes);
            const socialVaultSignature = await socialVault.signMessage(messageHashBytes);
            const coldVaultSignature = await coldVault.signMessage(messageHashBytes);
    
            await taps.connect(coldVault).setAllWalletAndVaultConfigsSigningCold(
                mintWallet.address, 
                transactionWallet.address, 
                socialVault.address, 
                coldVault.address, 
                mintingWalletSignature,
                transactionWalletSignature,
                socialVaultSignature,
                coldVaultSignature
            );
        });
    
        it("Should not allow vaulting tokens from cold vault", async function () {
            await expect(taps.connect(coldVault).vaultToken(WalletType.Transaction, erc1155.address, FIRST_TOKEN_ID))
                .to.be.revertedWith("Invalid sender-destination combination");
        });
    
        it("Should allow vaulting tokens from minting wallet to cold vault", async function () {
            await erc1155.connect(mintWallet).approve(taps.address, FIRST_TOKEN_ID);
            await taps.connect(mintWallet).vaultToken(WalletType.Cold, erc1155.address, FIRST_TOKEN_ID);
            expect(await erc1155.ownerOf(FIRST_TOKEN_ID)).to.equal(coldVault.address);
        });

        it("Should allow vaulting tokens from transaction wallet to cold vault", async function () {
            const tokenId = FIRST_TOKEN_ID + 1; // The next token ID after mintWallet's token
            await erc1155.connect(transactionWallet).approve(taps.address, tokenId);
            await taps.connect(transactionWallet).vaultToken(WalletType.Cold, erc1155.address, tokenId);
            expect(await erc1155.ownerOf(tokenId)).to.equal(coldVault.address);
        });

        it("Should allow vaulting tokens from social vault to cold vault", async function () {
            const tokenId = FIRST_TOKEN_ID + 2; // The next token ID after transactionWallet's token
            await erc1155.connect(socialVault).approve(taps.address, tokenId);
            await taps.connect(socialVault).vaultToken(WalletType.Cold, erc1155.address, tokenId);
            expect(await erc1155.ownerOf(tokenId)).to.equal(coldVault.address);
        });

        it("Should not allow unvaulting tokens from cold vault to minting wallet", async function () {
            const tokenId = FIRST_TOKEN_ID + 3; // The token ID minted to coldVault
            await expect(taps.connect(coldVault).unvaultToken(WalletType.Minting, erc1155.address, tokenId)).to.be.revertedWith("Invalid destination wallet type");;
        });
        

        it("Should allow unvaulting tokens from cold vault to transaction wallet", async function () {
            const tokenId = FIRST_TOKEN_ID + 3; // Assuming we're using the same token as the previous test
            await erc1155.connect(coldVault).approve(taps.address, tokenId);
            await taps.connect(coldVault).unvaultToken(WalletType.Transaction, erc1155.address, tokenId);
            expect(await erc1155.ownerOf(tokenId)).to.equal(transactionWallet.address);
        });

        it("Should allow unvaulting tokens from cold vault to social vault", async function () {
            const tokenId = FIRST_TOKEN_ID + 3; // Assuming we're using the same token as the previous tests
            await erc1155.connect(coldVault).approve(taps.address, tokenId);
            await taps.connect(coldVault).unvaultToken(WalletType.Social, erc1155.address, tokenId);
            expect(await erc1155.ownerOf(tokenId)).to.equal(socialVault.address);
        });
    });
    
    describe("Token Vaulting and Unvaulting in NonSigningCold mode ERC1155", function() {
        const WalletType = {
            Minting: 0,
            Transaction: 1,
            Social: 2,
            Cold: 3
        };
    
        const FIRST_TOKEN_ID = 0;
        const MINT_AMOUNT = 1;
    
        let erc1155;
    
        const MOCK_DATA = ethers.utils.randomBytes(32); // mock data for the mint function
        
        beforeEach(async function() {
            ERC1155 = await ethers.getContractFactory("MyCollectible1155");
            erc1155 = await ERC1155.deploy();
            await erc1155.deployed();
        
            await erc1155.connect(mintWallet).mint(mintWallet.address, FIRST_TOKEN_ID, MINT_AMOUNT, MOCK_DATA);
            await erc1155.connect(transactionWallet).mint(transactionWallet.address, FIRST_TOKEN_ID, MINT_AMOUNT, MOCK_DATA);
            await erc1155.connect(socialVault).mint(socialVault.address, FIRST_TOKEN_ID, MINT_AMOUNT, MOCK_DATA);
            await erc1155.connect(coldVault).mint(coldVault.address, FIRST_TOKEN_ID, MINT_AMOUNT, MOCK_DATA);

            const balance = await erc1155.balanceOf(mintWallet.address, FIRST_TOKEN_ID);
            expect(balance).to.equal(MINT_AMOUNT);
        
            const message = ethers.utils.solidityKeccak256(["string", "address"], ["Approve setup for TAPS Contract at ", taps.address]);
            const messageHashBytes = ethers.utils.arrayify(message);
    
            const mintingWalletSignature = await mintWallet.signMessage(messageHashBytes);
            const transactionWalletSignature = await transactionWallet.signMessage(messageHashBytes);
            const socialVaultSignature = await socialVault.signMessage(messageHashBytes);
    
            await taps.connect(socialVault).setAllWalletAndVaultConfigsNonSigningCold(
                mintWallet.address, 
                transactionWallet.address, 
                socialVault.address, 
                coldVault.address, 
                mintingWalletSignature,
                transactionWalletSignature,
                socialVaultSignature
            );
        });
        
    
        it("Should allow vaulting tokens from minting wallet to cold vault", async function () {
            await erc1155.connect(mintWallet).setApprovalForAll(taps.address, true);
            await taps.connect(mintWallet).vaultToken(WalletType.Cold, erc1155.address, FIRST_TOKEN_ID);
            const balance = await erc1155.balanceOf(coldVault.address, FIRST_TOKEN_ID);
            expect(balance).to.equal(MINT_AMOUNT + 1);
        });
    
        it("Should allow vaulting tokens from transaction wallet to cold vault", async function () {
            const tokenId = FIRST_TOKEN_ID + 1; // The next token ID after mintWallet's token
            await erc1155.connect(transactionWallet).setApprovalForAll(taps.address, true);
            await taps.connect(transactionWallet).vaultToken(WalletType.Cold, erc1155.address, tokenId);
            const balance = await erc1155.balanceOf(coldVault.address, FIRST_TOKEN_ID);
            expect(balance).to.equal(MINT_AMOUNT + 1);
        });
    
        it("Should allow vaulting tokens from social vault to cold vault", async function () {
            const tokenId = FIRST_TOKEN_ID + 2; // The next token ID after transactionWallet's token
            await erc1155.connect(socialVault).setApprovalForAll(taps.address, true);
            await taps.connect(socialVault).vaultToken(WalletType.Cold, erc1155.address, tokenId);
            const balance = await erc1155.balanceOf(coldVault.address, tokenId);
            expect(balance).to.equal(MINT_AMOUNT + 1);
        });

        it("Should not allow unvaulting tokens from cold vault to minting wallet", async function () {
            const tokenId = FIRST_TOKEN_ID + 3; // The token ID minted to coldVault
            await erc1155.connect(coldVault).setApprovalForAll(taps.address, true);
            await expect(taps.connect(coldVault).unvaultToken(WalletType.Minting, erc1155.address, tokenId)).to.be.revertedWith("Invalid destination wallet type");
            
            const balance = await erc1155.balanceOf(coldVault.address, tokenId);
            expect(balance).to.equal(MINT_AMOUNT + 1);
        });
        
        it("Should not allow unvaulting tokens from cold vault to transaction wallet", async function () {
            const tokenId = FIRST_TOKEN_ID + 3; // Assuming we're using the same token as the previous test
            await erc1155.connect(coldVault).setApprovalForAll(taps.address, true);
            await expect(taps.connect(coldVault).unvaultToken(WalletType.Transaction, erc1155.address, tokenId))
                .to.be.revertedWith("Invalid sender-destination combination");
            
            const balance = await erc1155.balanceOf(coldVault.address, tokenId);
            expect(balance).to.equal(MINT_AMOUNT + 1);
        });
    
        it("Should not allow unvaulting tokens from cold vault to social vault", async function () {
            const tokenId = FIRST_TOKEN_ID + 3; // Assuming we're using the same token as the previous tests
            await erc1155.connect(coldVault).setApprovalForAll(taps.address, true);
            await expect(taps.connect(coldVault).unvaultToken(WalletType.Social, erc1155.address, tokenId))
                .to.be.revertedWith("Invalid sender-destination combination");
            
            const balance = await erc1155.balanceOf(coldVault.address, tokenId);
            expect(balance).to.equal(MINT_AMOUNT + 1);
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
