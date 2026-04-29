const hre = require("hardhat");
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying VelumToken with:", deployer.address);
  const tokenName = "Velum Token";
  const tokenSymbol = "VELUM";
  const multisigAddress = "0xC68DBa05bB7e5e219d142F63aC7C12B91F443EF9";
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
}
main();
