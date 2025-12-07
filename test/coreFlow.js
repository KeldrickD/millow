const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BrickStack core flow", function () {
  let owner, seller, investor1, investor2;
  let property;
  let governance;
  let voteEscrow;
  let usdc;
  let yieldVault;

  beforeEach(async () => {
    [owner, seller, investor1, investor2] = await ethers.getSigners();

    const Property = await ethers.getContractFactory("Property");
    property = await Property.deploy("https://base-uri.example/");
    await property.deployed();

    const Governance = await ethers.getContractFactory("Governance");
    governance = await Governance.deploy();
    await governance.deployed();

    const VoteEscrow = await ethers.getContractFactory("VoteEscrow");
    voteEscrow = await VoteEscrow.deploy(property.address, governance.address, 0);
    await voteEscrow.deployed();

    await (await property.setEscrow(voteEscrow.address)).wait();

    await (await property.setWhitelisted(investor1.address, true)).wait();
    await (await property.setWhitelisted(investor2.address, true)).wait();
    await (await property.setWhitelisted(seller.address, true)).wait();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy("Mock USDC", "mUSDC", 6);
    await usdc.deployed();

    const PropertyYieldVault = await ethers.getContractFactory("PropertyYieldVault");
    yieldVault = await PropertyYieldVault.deploy(usdc.address, property.address);
    await yieldVault.deployed();
  });

  it("runs full lifecycle: create → fund → finalize → yield → cancel+refund", async () => {
    const propertyId1 = 1;
    const propertyId2 = 2;
    const maxShares = 1000;
    const sharePriceWei = ethers.utils.parseEther("0.1");
    const yieldBps = 500;

    await (await property.createProperty(propertyId1, maxShares, sharePriceWei, yieldBps, "Deal 1")).wait();
    await (await property.createProperty(propertyId2, maxShares, sharePriceWei, yieldBps, "Deal 2")).wait();

    const now = (await ethers.provider.getBlock("latest")).timestamp;
    const deadline = now + 7 * 24 * 60 * 60;
    const target1 = ethers.utils.parseEther("10");
    const target2 = ethers.utils.parseEther("5");

    await (await voteEscrow.proposeProperty(propertyId1, seller.address, target1, deadline, "Deal 1")).wait();
    await (await voteEscrow.proposeProperty(propertyId2, seller.address, target2, deadline, "Deal 2")).wait();

    let allIds = await voteEscrow.getAllPropertyIds();
    expect(allIds.length).to.equal(2);

    let activeIds = await voteEscrow.getActivePropertyIds();
    expect(activeIds.length).to.equal(2);

    const dep1 = ethers.utils.parseEther("4");
    const dep2 = ethers.utils.parseEther("6");
    await (await voteEscrow.connect(investor1).voteAndLock(propertyId1, dep1, { value: dep1 })).wait();
    await (await voteEscrow.connect(investor2).voteAndLock(propertyId1, dep2, { value: dep2 })).wait();

    const p1 = await voteEscrow.getProposal(propertyId1);
    expect(p1[4]).to.equal(dep1.add(dep2));

    const sellerBalBefore = await ethers.provider.getBalance(seller.address);
    await (await voteEscrow.triggerBuy(propertyId1)).wait();
    const sellerBalAfter = await ethers.provider.getBalance(seller.address);
    expect(sellerBalAfter.sub(sellerBalBefore)).to.equal(dep1.add(dep2));

    const totalSupply1 = await property.totalSupply(propertyId1);
    expect(totalSupply1).to.equal(dep1.add(dep2).div(sharePriceWei));

    const bal1 = await property.balanceOf(investor1.address, propertyId1);
    const bal2 = await property.balanceOf(investor2.address, propertyId1);
    expect(bal1).to.equal(dep1.div(sharePriceWei));
    expect(bal2).to.equal(dep2.div(sharePriceWei));

    // Yield
    const yieldAmount = ethers.BigNumber.from("1000000000"); // 1000 USDC (6 dp)
    await (await usdc.mint(owner.address, yieldAmount)).wait();
    await (await usdc.approve(yieldVault.address, yieldAmount)).wait();
    await (await yieldVault.depositYield(propertyId1, yieldAmount)).wait();

    const expected1 = ethers.BigNumber.from("400000000"); // 400 USDC
    const expected2 = ethers.BigNumber.from("600000000"); // 600 USDC
    expect(await yieldVault.pendingYield(propertyId1, investor1.address)).to.equal(expected1);
    expect(await yieldVault.pendingYield(propertyId1, investor2.address)).to.equal(expected2);

    await (await yieldVault.connect(investor1).claimYield(propertyId1)).wait();
    await (await yieldVault.connect(investor2).claimYield(propertyId1)).wait();
    expect(await usdc.balanceOf(investor1.address)).to.equal(expected1);
    expect(await usdc.balanceOf(investor2.address)).to.equal(expected2);

    // Property 2 cancel + refund
    const dep2a = ethers.utils.parseEther("1");
    const dep2b = ethers.utils.parseEther("1.5");
    await (await voteEscrow.connect(investor1).voteAndLock(propertyId2, dep2a, { value: dep2a })).wait();
    await (await voteEscrow.connect(investor2).voteAndLock(propertyId2, dep2b, { value: dep2b })).wait();

    await (await voteEscrow.cancelProperty(propertyId2)).wait();

    const li1 = await voteEscrow.lockedAmount(propertyId2, investor1.address);
    const li2 = await voteEscrow.lockedAmount(propertyId2, investor2.address);
    expect(li1).to.equal(dep2a);
    expect(li2).to.equal(dep2b);

    await (await voteEscrow.connect(investor1).refund(propertyId2)).wait();
    await (await voteEscrow.connect(investor2).refund(propertyId2)).wait();

    const p2final = await voteEscrow.getProposal(propertyId2);
    expect(p2final[4]).to.equal(0);

    activeIds = await voteEscrow.getActivePropertyIds();
    expect(activeIds.length).to.equal(0);
  });
});


