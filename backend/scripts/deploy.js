const hre = require("hardhat");

async function main() {
  try {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", balance.toString());

    console.log("Deploying ComplianceMultisig...");
    const officers = [
      deployer.address, 
      "0x1111111111111111111111111111111111111111", 
      "0x2222222222222222222222222222222222222222"
    ];
    const threshold = 2; // 2 out of 3

    const ComplianceMultisig = await hre.ethers.getContractFactory("ComplianceMultisig");
    
    // Explicit transaction sending
    const multisigDeployTx = await ComplianceMultisig.getDeployTransaction(officers, threshold);
    const multisigTx = await deployer.sendTransaction(multisigDeployTx);
    console.log("Multisig Tx Sent! Hash:", multisigTx.hash);
    
    const multisigReceipt = await multisigTx.wait();
    const multisigAddress = multisigReceipt.contractAddress;
    console.log("ComplianceMultisig deployed to:", multisigAddress);

    console.log("Deploying VelumToken...");
    const tokenName = "Velum Token";
    const tokenSymbol = "VELUM";
    const flagThreshold = 10000;

    const VelumToken = await hre.ethers.getContractFactory("VelumToken");
    
    const tokenDeployTx = await VelumToken.getDeployTransaction(
      tokenName,
      tokenSymbol,
      multisigAddress,
      flagThreshold
    );
    const tokenTx = await deployer.sendTransaction(tokenDeployTx);
    console.log("Token Tx Sent! Hash:", tokenTx.hash);
    
    const tokenReceipt = await tokenTx.wait();
    const tokenAddress = tokenReceipt.contractAddress;
    console.log("VelumToken deployed to:", tokenAddress);
  } catch (error) {
      console.error("FATAL ERROR DURING DEPLOYMENT:", error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
