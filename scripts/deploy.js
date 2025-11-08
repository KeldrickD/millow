// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

const tokens = (n) => {
  return (hre.ethers.parseUnits
    ? hre.ethers.parseUnits(n.toString(), 'ether')
    : hre.ethers.utils.parseUnits(n.toString(), 'ether'));
};

const waitDeployed = async (contract) => {
  if (typeof contract.waitForDeployment === 'function') {
    await contract.waitForDeployment();
  } else if (typeof contract.deployed === 'function') {
    await contract.deployed();
  }
};

const resolveAddress = async (contract) => {
  if (typeof contract.getAddress === 'function') {
    return await contract.getAddress();
  }
  return contract.target || contract.address;
};

async function main() {
  const signers = await hre.ethers.getSigners();
  const deployer = signers[0];
  const envSeller = process.env.SELLER_ADDRESS;
  const sellerAddress = envSeller && envSeller !== "" ? envSeller : (signers[1]?.address || deployer.address);

  console.log(`Deployer: ${deployer.address}`);
  console.log(`Seller:   ${sellerAddress}`);

  // Deploy Governance token
  const Governance = await hre.ethers.getContractFactory("Governance");
  const governance = await Governance.deploy();
  await waitDeployed(governance);
  console.log(`Governance deployed at: ${await resolveAddress(governance)}`);

  // Deploy Property (ERC1155)
  const Property = await hre.ethers.getContractFactory("Property");
  const property = await Property.deploy("https://example.com/metadata/{id}.json");
  await waitDeployed(property);
  console.log(`Property deployed at: ${await resolveAddress(property)}`);

  // Create property #1 config
  const propertyId = 1;
  const maxShares = 1000;
  const sharePriceWei = tokens(0.1); // 0.1 ETH per share
  const yieldBps = 500; // 5% mock yield
  const metadataURI = "34-Unit Apt • Value-add • NOI $250k • Target $2.5M";

  let tx = await property.createProperty(
    propertyId,
    maxShares,
    sharePriceWei,
    yieldBps,
    metadataURI,
    { gasLimit: 500000 }
  );
  await tx.wait();
  console.log(`Property #${propertyId} created.`);

  // Deploy VoteEscrow
  const minGovBalance = 0; // for MVP ease; set >0 to enforce holding BRICK
  const VoteEscrow = await hre.ethers.getContractFactory("VoteEscrow");
  const voteEscrow = await VoteEscrow.deploy(
    await resolveAddress(property),
    await resolveAddress(governance),
    minGovBalance
  );
  await waitDeployed(voteEscrow);
  console.log(`VoteEscrow deployed at: ${await resolveAddress(voteEscrow)}`);

  // Wire escrow as minter on Property
  tx = await property.setEscrow(await resolveAddress(voteEscrow), { gasLimit: 200000 });
  await tx.wait();
  console.log(`Property escrow set.`);

  // Whitelist deployer and seller for transfers/mint reception
  tx = await property.setWhitelisted(deployer.address, true, { gasLimit: 150000 });
  await tx.wait();
  tx = await property.setWhitelisted(sellerAddress, true, { gasLimit: 150000 });
  await tx.wait();
  console.log(`Whitelisted deployer and seller.`);

  // Propose the property deal
  const targetPriceWei = tokens(100); // e.g., 100 ETH funding target for MVP
  const deadline = Math.floor(Date.now() / 1000) + 14 * 24 * 60 * 60; // 14 days
  tx = await voteEscrow.proposeProperty(
    propertyId,
    sellerAddress,
    targetPriceWei,
    deadline,
    "34-unit apartment acquisition on Base",
    { gasLimit: 400000 }
  );
  await tx.wait();
  console.log(`Property proposal created.`);

  // Deploy MockUSDC (rent token) and Yield vault
  const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
  const usdc = await MockUSDC.deploy();
  await waitDeployed(usdc);
  console.log(`MockUSDC deployed at: ${await resolveAddress(usdc)}`);

  const PropertyYieldVault = await hre.ethers.getContractFactory("PropertyYieldVault");
  const vault = await PropertyYieldVault.deploy(
    await resolveAddress(usdc),
    await resolveAddress(property)
  );
  await waitDeployed(vault);
  console.log(`YieldVault deployed at: ${await resolveAddress(vault)}`);

  console.log("Deployment complete.");
  console.log({
    Governance: await resolveAddress(governance),
    Property: await resolveAddress(property),
    VoteEscrow: await resolveAddress(voteEscrow),
    MockUSDC: await resolveAddress(usdc),
    YieldVault: await resolveAddress(vault),
    propertyId,
    sharePriceWei: sharePriceWei.toString(),
    maxShares,
    targetPriceWei: targetPriceWei.toString(),
    deadline
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
