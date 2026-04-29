const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying Stealth VLM with:", deployer.address);

  const Token = await hre.ethers.getContractFactory("PseudoFHEVelum");
  const token = await Token.deploy();
  await token.waitForDeployment();
  
  const address = token.target;
  console.log("STEALTH_VLM_ADDRESS=" + address);

  // Mint 1,000,000 tokens to the deployer
  const mintTx = await token.mint(deployer.address, hre.ethers.parseEther("1000000"));
  await mintTx.wait();
  console.log("Minted 1,000,000 VLM to deployer!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
