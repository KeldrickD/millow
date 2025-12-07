const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RentToOwn", function () {
  let owner, tenant, landlord, other;
  let MockUSDC, usdc;
  let Property, property;
  let RentToOwn, rto;

  beforeEach(async () => {
    [owner, tenant, landlord, other] = await ethers.getSigners();

    // Deploy MockUSDC (6 decimals)
    MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy("Mock USDC", "mUSDC", 6);
    await usdc.deployed();

    // Deploy Property
    Property = await ethers.getContractFactory("Property");
    property = await Property.deploy("https://example.com/{id}.json");
    await property.deployed();

    // Set dummy escrow
    await property.connect(owner).setEscrow(owner.address);

    // Whitelist tenant + landlord + RentToOwn to hold shares
    await property.connect(owner).setWhitelisted(tenant.address, true);
    await property.connect(owner).setWhitelisted(landlord.address, true);

    // Create property series
    const propertyId = 1;
    const maxShares = 10000;
    const sharePriceWei = ethers.utils.parseEther("0.1");
    const yieldBps = 500;
    await property
      .connect(owner)
      .createProperty(propertyId, maxShares, sharePriceWei, yieldBps, "Test Property");

    // Deploy RentToOwn
    RentToOwn = await ethers.getContractFactory("RentToOwn");
    rto = await RentToOwn.deploy(usdc.address, property.address, owner.address);
    await rto.deployed();

    // Allow RentToOwn to mint shares
    await property.connect(owner).setExtraMinter(rto.address, true);
    await property.connect(owner).setWhitelisted(rto.address, true);

    // Mint stablecoin to tenant
    const mintAmount = ethers.utils.parseUnits("10000", 6);
    await usdc.connect(owner).mint(tenant.address, mintAmount);
  });

  it("creates a rent-to-own agreement and mints shares on each payment", async () => {
    const propertyId = 1;
    const paymentAmount = ethers.utils.parseUnits("1000", 6);
    const equitySharesPerPayment = 10;
    const maxPayments = 3;

    const tx = await rto
      .connect(owner)
      .createAgreement(
        tenant.address,
        landlord.address,
        propertyId,
        paymentAmount,
        equitySharesPerPayment,
        maxPayments
      );
    const rc = await tx.wait();
    const evt = rc.events.find((e) => e.event === "AgreementCreated");
    const agreementId = evt.args.agreementId;

    await usdc.connect(tenant).approve(rto.address, paymentAmount.mul(maxPayments));

    const landlordBalanceBefore = await usdc.balanceOf(landlord.address);

    for (let i = 1; i <= maxPayments; i++) {
      await expect(rto.connect(tenant).pay(agreementId))
        .to.emit(rto, "PaymentMade")
        .withArgs(agreementId, tenant.address, paymentAmount, i, equitySharesPerPayment);
    }

    const landlordBalanceAfter = await usdc.balanceOf(landlord.address);
    expect(landlordBalanceAfter.sub(landlordBalanceBefore)).to.equal(paymentAmount.mul(maxPayments));

    const balance = await property.balanceOf(tenant.address, propertyId);
    expect(balance).to.equal(equitySharesPerPayment * maxPayments);

    const agreement = await rto.getAgreement(agreementId);
    expect(agreement.paymentsMade).to.equal(maxPayments);
    expect(agreement.active).to.equal(false);
  });

  it("prevents payments after agreement completed or terminated", async () => {
    const propertyId = 1;
    const paymentAmount = ethers.utils.parseUnits("100", 6);
    const equitySharesPerPayment = 5;
    const maxPayments = 1;

    const tx = await rto
      .connect(owner)
      .createAgreement(
        tenant.address,
        landlord.address,
        propertyId,
        paymentAmount,
        equitySharesPerPayment,
        maxPayments
      );
    const rc = await tx.wait();
    const evt = rc.events.find((e) => e.event === "AgreementCreated");
    const agreementId = evt.args.agreementId;

    await usdc.connect(tenant).approve(rto.address, paymentAmount.mul(2));

    await rto.connect(tenant).pay(agreementId);

    await expect(rto.connect(tenant).pay(agreementId)).to.be.revertedWithCustomError(rto, "NotActive");

    await expect(rto.connect(owner).terminate(agreementId)).to.be.revertedWithCustomError(rto, "NotActive");
  });
});

