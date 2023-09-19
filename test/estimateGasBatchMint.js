const { ethers } = require("hardhat");

async function estimateBatchMintingGas() {
    const [deployer] = await ethers.getSigners();

    // Deploy the contract
    const Filum = await ethers.getContractFactory("Filum");
    const contract = await Filum.deploy("TokenName", "TokenSymbol", "https://defaulturi.com/");
    await contract.deployed();

    // Owner mints multiple tokens in batch using batchMintByOwner
    const tx = await contract.batchMintByOwner(); // Call batchMintByOwner function
    const receipt = await tx.wait();
    const gasUsed = receipt.gasUsed;

    console.log(`Gas used for batch minting by owner: ${gasUsed.toString()}`);

    // Calculate estimated cost
    const gasPrice = ethers.utils.parseUnits("30", "gwei"); // 30 Gwei
    const cost = gasUsed.mul(gasPrice);
    const costInEther = ethers.utils.formatEther(cost);
    console.log(`Estimated cost in Ether for batch minting by owner: ${costInEther}`);
}

estimateBatchMintingGas();
