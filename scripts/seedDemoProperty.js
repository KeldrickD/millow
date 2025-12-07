/* eslint-disable no-console */
const hre = require("hardhat");

const tokens = (n) => {
  return hre.ethers.parseUnits
    ? hre.ethers.parseUnits(n.toString(), "ether")
    : hre.ethers.utils.parseUnits(n.toString(), "ether");
};
const units6 = (n) => {
  return hre.ethers.parseUnits
    ? hre.ethers.parseUnits(n.toString(), 6)
    : hre.ethers.utils.parseUnits(n.toString(), 6);
};
const waitDeployed = async (c) => {
  if (typeof c.waitForDeployment === "function") {
    await c.waitForDeployment();
  } else if (typeof c.deployed === "function") {
    await c.deployed();
  }
};
const addr = async (c) => (typeof c.getAddress === "function" ? await c.getAddress() : c.target || c.address);

async function main() {
  const [deployer, investorA, investorB, seller] = await hre.ethers.getSigners();

  console.log("=== Seeding full demo environment ===");
  console.log("Deployer:", deployer.address);
  console.log("InvestorA:", investorA.address);
  console.log("InvestorB:", investorB.address);
  console.log("Seller   :", seller ? seller.address : deployer.address);

  // 1) Deploy core tokens/contracts
  const Governance = await hre.ethers.getContractFactory("Governance");
  const governance = await Governance.deploy();
  await waitDeployed(governance);

  const Property = await hre.ethers.getContractFactory("Property");
  const property = await Property.deploy("https://example.com/metadata/{id}.json");
  await waitDeployed(property);

  const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
  const usdc = await MockUSDC.deploy("Mock USDC", "mUSDC", 6);
  await waitDeployed(usdc);

  const propertyId = BigInt(process.env.DEMO_PROPERTY_ID || Math.floor(Date.now() / 1000));
  const maxShares = 10_000;
  const sharePriceWei = tokens(0.1); // 0.1 ETH / share
  const yieldBps = 500;
  const metadataURI = "1770 Boulder Walk Ln SE, Atlanta, GA 30316";

  await (await property.createProperty(propertyId, maxShares, sharePriceWei, yieldBps, metadataURI)).wait();

  const minGovBalance = 0;
  const VoteEscrow = await hre.ethers.getContractFactory("VoteEscrow");
  const voteEscrow = await VoteEscrow.deploy(await addr(property), await addr(governance), minGovBalance);
  await waitDeployed(voteEscrow);
  await (await property.setEscrow(await addr(voteEscrow))).wait();

  const PropertyYieldVault = await hre.ethers.getContractFactory("PropertyYieldVault");
  const vault = await PropertyYieldVault.deploy(await addr(usdc), await addr(property));
  await waitDeployed(vault);

  const PropertyDex = await hre.ethers.getContractFactory("PropertyDex");
  const dex = await PropertyDex.deploy(await addr(usdc), await addr(property));
  await waitDeployed(dex);

  // 2) Whitelist + extra minter so owner can seed liquidity
  const sellerAddr = seller ? seller.address : deployer.address;
  const toWhitelist = [deployer.address, investorA.address, investorB.address, sellerAddr, await addr(dex)];
  for (const w of toWhitelist) {
    await (await property.setWhitelisted(w, true)).wait();
  }
  await (await property.setExtraMinter(deployer.address, true)).wait();

  // 3) Propose property
  const targetWei = tokens(2); // 2 ETH raise target for demo
  const deadline = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
  await (
    await voteEscrow.proposeProperty(
      propertyId,
      sellerAddr,
      targetWei,
      deadline,
      "1770 Boulder Walk • East Atlanta GEM"
    )
  ).wait();

  // 4) Mint stable + governance to wallets
  const govMint = tokens(50_000);
  await (await governance.mint(investorA.address, govMint)).wait();
  await (await governance.mint(investorB.address, govMint)).wait();

  const usdcMint = units6(50_000);
  for (const w of [deployer.address, investorA.address, investorB.address]) {
    await (await usdc.mint(w, usdcMint)).wait();
  }

  // 5) Seed demo shares for liquidity (owner as extra minter)
  const liquidityShares = 2_000;
  await (await property.mintShares(propertyId, deployer.address, liquidityShares)).wait();

  // 6) Investors lock ETH (funding)
  await (
    await voteEscrow.connect(investorA).voteAndLock(propertyId, tokens(1), { value: tokens(1) })
  ).wait();
  await (
    await voteEscrow.connect(investorB).voteAndLock(propertyId, tokens(1), { value: tokens(1) })
  ).wait();

  // 7) Finalize funding -> mints shares to investors, pays seller
  await (await voteEscrow.triggerBuy(propertyId)).wait();

  // 8) Seed yield (needs supply > 0)
  await (await usdc.approve(await addr(vault), units6(1_000))).wait();
  await (await vault.depositYield(propertyId, units6(1_000))).wait();

  // 9) Seed DEX liquidity (protocol-owned)
  await (await property.setApprovalForAll(await addr(dex), true)).wait();
  await (await usdc.approve(await addr(dex), units6(20_000))).wait();
  await (await dex.createPool(propertyId, 1_000, units6(10_000), 30)).wait(); // 0.30% fee

  // 10) Summary
  const summary = {
    network: hre.network.name,
    propertyId: propertyId.toString(),
    addresses: {
      Governance: await addr(governance),
      Property: await addr(property),
      VoteEscrow: await addr(voteEscrow),
      YieldVault: await addr(vault),
      MockUSDC: await addr(usdc),
      PropertyDex: await addr(dex)
    },
    urls: {
      property: `/property/${propertyId.toString()}`,
      portfolio: `/portfolio`,
      explore: `/explore`
    }
  };
  console.log("=== Demo seeded ===");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

