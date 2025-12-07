const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PropertyDex", function () {
  let owner, alice, bob;
  let property, usdc, dex;

  const PROPERTY_ID = 1;

  beforeEach(async () => {
    [owner, alice, bob] = await ethers.getSigners();

    const Property = await ethers.getContractFactory("Property");
    property = await Property.deploy("https://example.com/{id}.json");
    await property.deployed();

    await property.setEscrow(owner.address);

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy("MockUSD", "mUSD", 6);
    await usdc.deployed();

    await usdc.mint(owner.address, ethers.utils.parseUnits("10000", 6));
    await usdc.mint(alice.address, ethers.utils.parseUnits("1000", 6));
    await usdc.mint(bob.address, ethers.utils.parseUnits("1000", 6));

    await property.setWhitelisted(owner.address, true);
    await property.setWhitelisted(alice.address, true);
    await property.setWhitelisted(bob.address, true);

    const sharePrice = ethers.utils.parseEther("0.1");
    await property.createProperty(PROPERTY_ID, 10_000, sharePrice, 500, "Test Property");

    await property.mintShares(PROPERTY_ID, owner.address, 5000);
    await property.mintShares(PROPERTY_ID, alice.address, 500);
    await property.mintShares(PROPERTY_ID, bob.address, 500);

    const PropertyDex = await ethers.getContractFactory("PropertyDex");
    dex = await PropertyDex.deploy(usdc.address, property.address);
    await dex.deployed();

    await property.setWhitelisted(dex.address, true);
    await property.setApprovalForAll(dex.address, true);
    await usdc.connect(owner).approve(dex.address, ethers.utils.parseUnits("10000", 6));

    await dex.createPool(PROPERTY_ID, 1000, ethers.utils.parseUnits("10000", 6), 30);
  });

  it("creates pool with correct reserves", async () => {
    const pool = await dex.getPool(PROPERTY_ID);
    expect(pool.exists).to.equal(true);
    expect(pool.shareReserve).to.equal(1000);
    expect(pool.stableReserve).to.equal(ethers.utils.parseUnits("10000", 6));
  });

  it("allows user to swap stable -> shares", async () => {
    const amountIn = ethers.utils.parseUnits("1000", 6);
    await usdc.connect(alice).approve(dex.address, amountIn);

    const beforeShares = await property.balanceOf(alice.address, PROPERTY_ID);
    const beforeUsdcPool = await usdc.balanceOf(dex.address);

    await dex.connect(alice).swapStableForShares(PROPERTY_ID, amountIn, 0);

    const afterShares = await property.balanceOf(alice.address, PROPERTY_ID);
    const afterUsdcPool = await usdc.balanceOf(dex.address);

    expect(afterUsdcPool.sub(beforeUsdcPool)).to.equal(amountIn);
    expect(afterShares).to.be.gt(beforeShares);
  });

  it("allows user to swap shares -> stable", async () => {
    await property.connect(bob).setApprovalForAll(dex.address, true);
    await property.mintShares(PROPERTY_ID, bob.address, 200);

    const sharesIn = 100;
    const beforeUsdc = await usdc.balanceOf(bob.address);

    await dex.connect(bob).swapSharesForStable(PROPERTY_ID, sharesIn, 0);

    const afterUsdc = await usdc.balanceOf(bob.address);
    expect(afterUsdc).to.be.gt(beforeUsdc);
  });
});

