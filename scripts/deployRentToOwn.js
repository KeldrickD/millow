const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying RentToOwn with deployer:", deployer.address);

  const paymentToken = process.env.USDC_ADDRESS || process.env.NEXT_PUBLIC_USDC_ADDRESS;
  const propertyAddress = process.env.PROPERTY_ADDRESS || process.env.NEXT_PUBLIC_PROPERTY_ADDRESS;

  if (!paymentToken || !propertyAddress) {
    throw new Error("Set USDC_ADDRESS and PROPERTY_ADDRESS env vars for deployment");
  }

  const RentToOwn = await ethers.getContractFactory("RentToOwn");
  const rto = await RentToOwn.deploy(paymentToken, propertyAddress, deployer.address);
  await rto.deployed();

  console.log("RentToOwn deployed to:", rto.address);

  // Allow RentToOwn to mint shares
  const property = await ethers.getContractAt("Property", propertyAddress);
  const tx = await property.setExtraMinter(rto.address, true);
  await tx.wait();
  console.log("RentToOwn added as extra minter on Property");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


