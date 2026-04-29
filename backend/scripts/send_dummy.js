const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const hashes = [];
  for(let i=0; i<5; i++) {
    const tx = await deployer.sendTransaction({
      to: deployer.address,
      value: 0,
      data: "0x" + [...Array(64)].map(() => Math.floor(Math.random() * 16).toString(16)).join('')
    });
    hashes.push(tx.hash);
  }
  console.log("REAL_HASHES=", JSON.stringify(hashes));
}

main().catch(console.error);
