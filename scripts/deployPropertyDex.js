const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying PropertyDex with:", deployer.address);

  const stable = process.env.USDC_ADDRESS || process.env.NEXT_PUBLIC_USDC_ADDRESS;
  const property = process.env.PROPERTY_ADDRESS || process.env.NEXT_PUBLIC_PROPERTY_ADDRESS;
  if (!stable || !property) {
    throw new Error("Set USDC_ADDRESS and PROPERTY_ADDRESS env vars for deployment");
  }

  const Dex = await ethers.getContractFactory("PropertyDex");
  const dex = await Dex.deploy(stable, property);
  await dex.deployed();

  console.log("PropertyDex deployed to:", dex.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

