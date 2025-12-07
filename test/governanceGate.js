const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Governance gate on VoteEscrow", function () {
  let owner, seller, investor;
  let governance, property, voteEscrow;

  beforeEach(async () => {
    [owner, seller, investor] = await ethers.getSigners();

    const Governance = await ethers.getContractFactory("Governance");
    governance = await Governance.deploy();
    await governance.deployed();

    const Property = await ethers.getContractFactory("Property");
    property = await Property.deploy("ipfs://{id}.json");
    await property.deployed();

    const VoteEscrow = await ethers.getContractFactory("VoteEscrow");
    // set minGovBalance = 100 ether
    voteEscrow = await VoteEscrow.deploy(property.address, governance.address, ethers.utils.parseEther("100"));
    await voteEscrow.deployed();

    await (await property.setEscrow(voteEscrow.address)).wait();
    await (await property.setWhitelisted(investor.address, true)).wait();
    await (await property.setWhitelisted(seller.address, true)).wait();

    const propertyId = 1;
    const sharePrice = ethers.utils.parseEther("0.1");
    await (await property.createProperty(propertyId, 1000, sharePrice, 500, "Test")).wait();

    const deadline = (await ethers.provider.getBlock("latest")).timestamp + 7 * 24 * 60 * 60;
    await (await voteEscrow.proposeProperty(propertyId, seller.address, ethers.utils.parseEther("1"), deadline, "Deal")).wait();
  });

  it("reverts voteAndLock if investor lacks min governance balance", async () => {
    const propertyId = 1;
    const amount = ethers.utils.parseEther("0.1");
    await expect(
      voteEscrow.connect(investor).voteAndLock(propertyId, amount, { value: amount })
    ).to.be.revertedWith("insufficient gov");
  });

  it("allows voteAndLock after investor receives governance tokens", async () => {
    const propertyId = 1;
    const amount = ethers.utils.parseEther("0.2");
    // transfer 200 governance tokens to investor
    await (await governance.transfer(investor.address, ethers.utils.parseEther("200"))).wait();
    await expect(
      voteEscrow.connect(investor).voteAndLock(propertyId, amount, { value: amount })
    ).to.emit(voteEscrow, "VoteLocked");
  });
});


