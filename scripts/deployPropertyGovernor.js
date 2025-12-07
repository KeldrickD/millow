const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying PropertyGovernor with:", deployer.address);

  const propertyAddress = process.env.PROPERTY_ADDRESS;
  if (!propertyAddress) {
    throw new Error("PROPERTY_ADDRESS env not set");
  }

  const votingPeriod = 7 * 24 * 60 * 60; // 1 week
  const minProposalShares = 10; // adjust as needed
  const quorumBps = 2000; // 20%

  const Governor = await ethers.getContractFactory("PropertyGovernor");
  const governor = await Governor.deploy(propertyAddress, votingPeriod, minProposalShares, quorumBps);
  await governor.deployed();

  console.log("PropertyGovernor deployed to:", governor.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

