const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PropertyYieldVault - multi property distribution", function () {
  let owner, user1, user2;
  let property, usdc, vault;

  beforeEach(async () => {
    [owner, user1, user2] = await ethers.getSigners();

    const Property = await ethers.getContractFactory("Property");
    property = await Property.deploy("https://global.example/{id}.json");
    await property.deployed();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy("Mock USDC", "mUSDC", 6);
    await usdc.deployed();

    const Vault = await ethers.getContractFactory("PropertyYieldVault");
    vault = await Vault.deploy(usdc.address, property.address);
    await vault.deployed();

    // Set vault deployer as escrow for minting test shares
    await (await property.setEscrow(owner.address)).wait();
    await (await property.setWhitelisted(user1.address, true)).wait();
    await (await property.setWhitelisted(user2.address, true)).wait();
  });

  it("splits rent correctly across two properties and two users", async () => {
    const pid1 = 1;
    const pid2 = 2;
    const sharePrice = ethers.utils.parseEther("0.1");
    await (await property.createProperty(pid1, 1000, sharePrice, 500, "Prop 1")).wait();
    await (await property.createProperty(pid2, 1000, sharePrice, 500, "Prop 2")).wait();

    // mint shares: pid1: u1=10 u2=30; pid2: u1=50 u2=50
    await (await property.mintShares(pid1, user1.address, 10)).wait();
    await (await property.mintShares(pid1, user2.address, 30)).wait();
    await (await property.mintShares(pid2, user1.address, 50)).wait();
    await (await property.mintShares(pid2, user2.address, 50)).wait();

    const dec = await usdc.decimals();
    const dep1 = ethers.utils.parseUnits("400", dec);
    const dep2 = ethers.utils.parseUnits("1000", dec);

    await (await usdc.mint(owner.address, dep1.add(dep2))).wait();
    await (await usdc.approve(vault.address, dep1.add(dep2))).wait();

    await (await vault.depositYield(pid1, dep1)).wait(); // 400
    await (await vault.depositYield(pid2, dep2)).wait(); // 1000

    const exp1u1 = ethers.utils.parseUnits("100", dec);  // 25% of 400
    const exp1u2 = ethers.utils.parseUnits("300", dec);  // 75% of 400
    const exp2u1 = ethers.utils.parseUnits("500", dec);  // 50% of 1000
    const exp2u2 = ethers.utils.parseUnits("500", dec);  // 50% of 1000

    expect(await vault.pendingYield(pid1, user1.address)).to.equal(exp1u1);
    expect(await vault.pendingYield(pid1, user2.address)).to.equal(exp1u2);
    expect(await vault.pendingYield(pid2, user1.address)).to.equal(exp2u1);
    expect(await vault.pendingYield(pid2, user2.address)).to.equal(exp2u2);

    await (await vault.connect(user1).claimYield(pid1)).wait();
    await (await vault.connect(user1).claimYield(pid2)).wait();
    await (await vault.connect(user2).claimYield(pid1)).wait();
    await (await vault.connect(user2).claimYield(pid2)).wait();

    expect(await usdc.balanceOf(user1.address)).to.equal(exp1u1.add(exp2u1));
    expect(await usdc.balanceOf(user2.address)).to.equal(exp1u2.add(exp2u2));

    expect(await vault.pendingYield(pid1, user1.address)).to.equal(0);
    expect(await vault.pendingYield(pid2, user1.address)).to.equal(0);
    expect(await vault.pendingYield(pid1, user2.address)).to.equal(0);
    expect(await vault.pendingYield(pid2, user2.address)).to.equal(0);
  });
});


