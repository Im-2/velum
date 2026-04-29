const { ethers } = require("ethers");
require("dotenv").config();
const fs = require("fs");

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  const artifact = JSON.parse(fs.readFileSync("./artifacts/contracts/PseudoFHEVelum.sol/PseudoFHEVelum.json"));
  
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const contract = await factory.deploy();
  
  console.log("STEALTH_VLM_ADDRESS=" + contract.target);
  
  // Wait for deployment
  await contract.waitForDeployment();
  console.log("Deployed! Now minting...");
  
  const mintTx = await contract.mint(wallet.address, ethers.parseEther("1000000"));
  console.log("Mint Tx Sent: " + mintTx.hash);
}

main().catch(console.error);
