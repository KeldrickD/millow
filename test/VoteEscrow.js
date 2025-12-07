const { expect } = require("chai");
const { ethers } = require("hardhat");

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), "ether");
};

describe("BrickStack MVP - VoteEscrow", function () {
  let deployer, seller, investor1, investor2;
  let governance, property, voteEscrow;

  const propertyId = 1;
  const maxShares = 1000;
  const sharePriceEth = 0.1;
  const sharePriceWei = tokens(sharePriceEth);
  const targetPriceWei = tokens(1); // 1 ETH target for the test
  const yieldBps = 500;
  const metadataURI = "Test Property";

  beforeEach(async () => {
    [deployer, seller, investor1, investor2] = await ethers.getSigners();

    // Deploy governance token
    const Governance = await ethers.getContractFactory("Governance");
    governance = await Governance.deploy();

    // Deploy property (ERC1155)
    const Property = await ethers.getContractFactory("Property");
    property = await Property.deploy("https://example.com/{id}.json");

    // Create property series
    await property.createProperty(
      propertyId,
      maxShares,
      sharePriceWei,
      yieldBps,
      metadataURI
    );

    // Deploy escrow/vote
    const VoteEscrow = await ethers.getContractFactory("VoteEscrow");
    voteEscrow = await VoteEscrow.deploy(
      property.address,
      governance.address,
      0 // min governance balance for ease in tests
    );

    // Wire minting, whitelist
    await property.setEscrow(voteEscrow.address);
    await property.setWhitelisted(deployer.address, true);
    await property.setWhitelisted(seller.address, true);
    await property.setWhitelisted(investor1.address, true);
    await property.setWhitelisted(investor2.address, true);

    // Propose property
    const deadline = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
    await voteEscrow.proposeProperty(
      propertyId,
      seller.address,
      targetPriceWei,
      deadline,
      "Test deal"
    );
  });

  it("accepts deposits, finalizes, and mints shares", async () => {
    // investor1 deposits 0.5 ETH => 5 shares
    await voteEscrow.connect(investor1).voteAndLock(propertyId, tokens(0.5), {
      value: tokens(0.5),
    });
    // investor2 deposits 0.5 ETH => 5 shares
    await voteEscrow.connect(investor2).voteAndLock(propertyId, tokens(0.5), {
      value: tokens(0.5),
    });

    const proposalBefore = await voteEscrow.getProposal(propertyId);
    expect(proposalBefore[4]).to.equal(tokens(1)); // totalLocked

    const sellerBalanceBefore = await ethers.provider.getBalance(
      seller.address
    );

    // finalize and trigger buy (owner)
    await voteEscrow.triggerBuy(propertyId);

    const sellerBalanceAfter = await ethers.provider.getBalance(
      seller.address
    );
    expect(sellerBalanceAfter.sub(sellerBalanceBefore)).to.equal(tokens(1));

    // investors claim shares automatically in triggerBuy (minted)
    expect(await property.balanceOf(investor1.address, propertyId)).to.equal(
      ethers.BigNumber.from(5)
    );
    expect(await property.balanceOf(investor2.address, propertyId)).to.equal(
      ethers.BigNumber.from(5)
    );
  });

  it("refunds if cancelled", async () => {
    await voteEscrow.connect(investor1).voteAndLock(propertyId, tokens(0.2), {
      value: tokens(0.2),
    });
    const balBefore = await ethers.provider.getBalance(investor1.address);

    await voteEscrow.cancelProperty(propertyId);
    const tx = await voteEscrow.connect(investor1).refund(propertyId);
    const receipt = await tx.wait();
    const gasUsed = receipt.gasUsed;
    const effectiveGasPrice = receipt.effectiveGasPrice || receipt.gasPrice;
    const fee = gasUsed.mul(effectiveGasPrice);

    const balAfter = await ethers.provider.getBalance(investor1.address);
    // balAfter ≈ balBefore + 0.2 ETH - fee
    expect(balAfter.add(fee).sub(balBefore)).to.equal(tokens(0.2));
  });
});


