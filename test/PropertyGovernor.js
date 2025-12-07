const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PropertyGovernor", function () {
  let owner, alice, bob, carol;
  let property, governor;

  const ONE_WEEK = 7 * 24 * 60 * 60;

  beforeEach(async () => {
    [owner, alice, bob, carol] = await ethers.getSigners();

    const Property = await ethers.getContractFactory("Property");
    property = await Property.deploy("https://example.com/{id}.json");
    await property.deployed();

    const PropertyGovernor = await ethers.getContractFactory("PropertyGovernor");
    governor = await PropertyGovernor.deploy(property.address, ONE_WEEK, 10, 2000);
    await governor.deployed();

    await property.setEscrow(owner.address);

    await property.setWhitelisted(alice.address, true);
    await property.setWhitelisted(bob.address, true);
    await property.setWhitelisted(carol.address, true);

    const sharePrice = ethers.utils.parseEther("0.1");
    await property.createProperty(1, 1_000, sharePrice, 500, "Demo Property");

    await property.mintShares(1, alice.address, 600);
    await property.mintShares(1, bob.address, 300);
    await property.mintShares(1, carol.address, 100);
  });

  it("allows a holder to create, vote, and finalize a successful proposal", async () => {
    const tx = await governor.connect(alice).createProposal(1, "Adjust rent", "Propose a 3% rent increase");
    const receipt = await tx.wait();
    const event = receipt.events.find((e) => e.event === "ProposalCreated");
    const proposalId = event.args.proposalId;

    const prop = await governor.getProposal(proposalId);
    expect(prop.propertyId).to.equal(1);
    expect(prop.proposer).to.equal(alice.address);
    expect(prop.finalized).to.equal(false);

    await governor.connect(alice).castVote(proposalId, true);
    await governor.connect(bob).castVote(proposalId, true);
    await governor.connect(carol).castVote(proposalId, false);

    const afterVotes = await governor.getProposal(proposalId);
    expect(afterVotes.forVotes).to.equal(600 + 300);
    expect(afterVotes.againstVotes).to.equal(100);

    await ethers.provider.send("evm_increaseTime", [ONE_WEEK + 1]);
    await ethers.provider.send("evm_mine", []);

    await governor.finalizeProposal(proposalId);
    const finalized = await governor.getProposal(proposalId);
    expect(finalized.finalized).to.equal(true);
    expect(finalized.succeeded).to.equal(true);
  });

  it("rejects proposals from accounts without enough shares", async () => {
    await governor.setMinProposalShares(200);

    await expect(
      governor.connect(carol).createProposal(1, "Not enough stake", "Should fail")
    ).to.be.revertedWith("PropertyGovernor: not enough shares");
  });

  it("prevents double voting and enforces time window", async () => {
    const tx = await governor.connect(alice).createProposal(1, "Test timing", "Check double vote and end time");
    const receipt = await tx.wait();
    const event = receipt.events.find((e) => e.event === "ProposalCreated");
    const proposalId = event.args.proposalId;

    await governor.connect(alice).castVote(proposalId, true);

    await expect(governor.connect(alice).castVote(proposalId, true)).to.be.revertedWith("PropertyGovernor: already voted");

    await ethers.provider.send("evm_increaseTime", [ONE_WEEK + 1]);
    await ethers.provider.send("evm_mine", []);

    await expect(governor.connect(bob).castVote(proposalId, true)).to.be.revertedWith("PropertyGovernor: voting ended");
  });
});

