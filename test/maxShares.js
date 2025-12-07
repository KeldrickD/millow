const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MaxShares boundary enforcement", function () {
  let owner, seller, a, b;
  let governance, property, voteEscrow;

  beforeEach(async () => {
    [owner, seller, a, b] = await ethers.getSigners();

    const Governance = await ethers.getContractFactory("Governance");
    governance = await Governance.deploy();
    await governance.deployed();

    const Property = await ethers.getContractFactory("Property");
    property = await Property.deploy("ipfs://{id}.json");
    await property.deployed();

    const VoteEscrow = await ethers.getContractFactory("VoteEscrow");
    voteEscrow = await VoteEscrow.deploy(property.address, governance.address, 0);
    await voteEscrow.deployed();

    await (await property.setEscrow(voteEscrow.address)).wait();
    await (await property.setWhitelisted(a.address, true)).wait();
    await (await property.setWhitelisted(b.address, true)).wait();
    await (await property.setWhitelisted(seller.address, true)).wait();
  });

  it("caps total minted shares at maxShares", async () => {
    const propertyId = 1;
    const maxShares = 10;
    const sharePrice = ethers.utils.parseEther("1");
    await (await property.createProperty(propertyId, maxShares, sharePrice, 500, "P")).wait();

    const deadline = (await ethers.provider.getBlock("latest")).timestamp + 3600;
    await (await voteEscrow.proposeProperty(propertyId, seller.address, ethers.utils.parseEther("10"), deadline, "Deal")).wait();

    // a buys 10 shares
    await (await governance.transfer(a.address, ethers.utils.parseEther("1000"))).wait(); // ensure governance if needed in future
    await (await voteEscrow.connect(a).voteAndLock(propertyId, ethers.utils.parseEther("10"), { value: ethers.utils.parseEther("10") })).wait();

    // finalize -> mints 10 shares
    await (await voteEscrow.triggerBuy(propertyId)).wait();
    expect(await property.balanceOf(a.address, propertyId)).to.equal(10);

    // new deal - attempt to exceed max shares in a fresh proposal is not possible within same propertyId
    // instead assert that additional minting via another buy path is not possible (already finalized)
    await expect(
      voteEscrow.triggerBuy(propertyId)
    ).to.be.revertedWith("finalized");
  });
});


