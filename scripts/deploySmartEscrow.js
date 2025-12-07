const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying SmartEscrow with deployer:", deployer.address);

  const SmartEscrow = await ethers.getContractFactory("SmartEscrow");
  const escrow = await SmartEscrow.deploy(deployer.address);
  await escrow.deployed();

  console.log("SmartEscrow deployed to:", escrow.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

