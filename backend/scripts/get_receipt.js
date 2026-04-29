const hre = require("hardhat");
async function main() {
  const provider = hre.ethers.provider;
  console.log("Fetching receipt...");
  const receipt = await provider.getTransactionReceipt("0xe3c81b686713df285c95f93c664db6e73d87a2cd5a2c8481bbb6c6104dfb963d");
  if (receipt) {
    console.log("Multisig deployed to:", receipt.contractAddress);
  } else {
    console.log("Not mined yet. You can check Etherscan for 0x1c84c3b6a5d634b83116001668c848e7c2d568f7aeee6e6fec24d55452b9a37f");
  }
}
main();
