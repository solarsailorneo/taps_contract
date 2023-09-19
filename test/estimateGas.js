const { ethers } = require("hardhat");

async function estimateDeploymentCost() {
    const Filum = await ethers.getContractFactory("Filum");
    const transaction = Filum.getDeployTransaction("TokenName", "TokenSymbol", "https://defaulturi.com/");
    
    const gasPrice = await ethers.provider.getGasPrice();
    const gasEstimate = await ethers.provider.estimateGas(transaction);

    console.log(`Gas used for deployment: ${gasEstimate.toString()}`);
    console.log(`Estimated cost in Ether: ${ethers.utils.formatEther(gasEstimate.mul(gasPrice))}`);
}

estimateDeploymentCost();
