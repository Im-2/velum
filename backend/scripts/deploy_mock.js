const hre = require("hardhat");

async function main() {
  const Mock = await hre.ethers.getContractFactory("FHEMock");
  const mock = await Mock.deploy();
  console.log("MOCK_ADDRESS=" + mock.target);
}

main().catch(console.error);
