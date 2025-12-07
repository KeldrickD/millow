const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SmartEscrow", function () {
  let owner, buyer, seller, oracle, other;
  let SmartEscrow, escrow;

  beforeEach(async () => {
    [owner, buyer, seller, oracle, other] = await ethers.getSigners();
    SmartEscrow = await ethers.getContractFactory("SmartEscrow");
    escrow = await SmartEscrow.deploy(owner.address);
    await escrow.deployed();
  });

  async function createSimpleEscrow(totalEth = "3.0", milestoneNames = ["Inspection", "Title", "Closing"]) {
    const totalWei = ethers.utils.parseEther(totalEth);
    const now = await ethers.provider.getBlock("latest");
    const deadline = now.timestamp + 7 * 24 * 60 * 60;

    const tx = await escrow
      .connect(owner)
      .createEscrow(
        buyer.address,
        seller.address,
        1, // propertyId
        totalWei,
        deadline,
        oracle.address,
        milestoneNames
      );
    const rc = await tx.wait();
    const evt = rc.events.find((e) => e.event === "EscrowCreated");
    const escrowId = evt.args.escrowId;
    return { escrowId, totalWei, deadline };
  }

  it("creates escrow, deposits, completes milestones via oracle/owner, releases all funds", async () => {
    const { escrowId, totalWei } = await createSimpleEscrow("3.0", ["M1", "M2", "M3"]);

    await expect(escrow.connect(buyer).deposit(escrowId, { value: totalWei }))
      .to.emit(escrow, "EscrowDeposited")
      .withArgs(escrowId, buyer.address, totalWei);

    const equalSlice = totalWei.div(3);

    // Milestone 0 by oracle
    const msgHash0 = await escrow.milestoneMessageHash(escrowId, 0);
    const sig0 = await oracle.signMessage(ethers.utils.arrayify(msgHash0));
    await expect(escrow.verifyMilestone(escrowId, 0, sig0))
      .to.emit(escrow, "MilestoneCompleted")
      .withArgs(escrowId, 0, oracle.address, equalSlice);

    // Milestone 1 by oracle
    const msgHash1 = await escrow.milestoneMessageHash(escrowId, 1);
    const sig1 = await oracle.signMessage(ethers.utils.arrayify(msgHash1));
    await escrow.verifyMilestone(escrowId, 1, sig1);

    // Milestone 2 force-complete by owner
    await expect(escrow.connect(owner).ownerCompleteMilestone(escrowId, 2)).to.emit(
      escrow,
      "EscrowFullyReleased"
    );

    const [e] = await escrow.getEscrow(escrowId);
    expect(e.released).to.equal(totalWei);
    expect(e.fullyReleased).to.equal(true);
  });

  it("reverts when non-oracle provides signature", async () => {
    const { escrowId } = await createSimpleEscrow();
    const msgHash0 = await escrow.milestoneMessageHash(escrowId, 0);
    const fakeSig = await other.signMessage(ethers.utils.arrayify(msgHash0));
    await expect(escrow.verifyMilestone(escrowId, 0, fakeSig)).to.be.revertedWithCustomError(
      escrow,
      "NotOracle"
    );
  });

  it("allows cancel + refund of remaining funds after deadline", async () => {
    const { escrowId, totalWei } = await createSimpleEscrow("2.0", ["M1", "M2"]);

    await escrow.connect(buyer).deposit(escrowId, { value: totalWei });

    // complete first milestone
    const msgHash0 = await escrow.milestoneMessageHash(escrowId, 0);
    const sig0 = await oracle.signMessage(ethers.utils.arrayify(msgHash0));
    await escrow.verifyMilestone(escrowId, 0, sig0);

    // move time forward
    const block = await ethers.provider.getBlock("latest");
    await ethers.provider.send("evm_setNextBlockTimestamp", [block.timestamp + 8 * 24 * 60 * 60]);
    await ethers.provider.send("evm_mine", []);

    const buyerBalBefore = await ethers.provider.getBalance(buyer.address);
    const tx = await escrow.connect(buyer).cancel(escrowId);
    const rc = await tx.wait();
    const gasUsed = rc.gasUsed.mul(rc.effectiveGasPrice);
    const buyerBalAfter = await ethers.provider.getBalance(buyer.address);

    const expectedRefund = totalWei.div(2);
    const actualRefund = buyerBalAfter.add(gasUsed).sub(buyerBalBefore);
    expect(actualRefund).to.equal(expectedRefund);

    await expect(escrow.cancel(escrowId)).to.be.revertedWithCustomError(escrow, "AlreadyCancelled");
  });
});

