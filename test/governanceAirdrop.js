const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Governance Airdrop Engine", function () {
  async function deployGovernanceFixture() {
    const [owner, alice, bob, charlie, attacker] = await ethers.getSigners();

    const Governance = await ethers.getContractFactory("Governance");
    const gov = await Governance.deploy();
    await gov.deployed?.();

    return { owner, alice, bob, charlie, attacker, gov };
  }

  it("owner can airdrop custom amounts", async () => {
    const { owner, alice, bob, gov } = await deployGovernanceFixture();

    const ownerStart = await gov.balanceOf(owner.address);

    const recipients = [alice.address, bob.address];
    const amounts = [
      ethers.utils.parseEther("100"),
      ethers.utils.parseEther("50"),
    ];

    const tx = await gov.connect(owner).airdrop(recipients, amounts);
    await tx.wait();

    const aliceBal = await gov.balanceOf(alice.address);
    const bobBal = await gov.balanceOf(bob.address);
    const ownerEnd = await gov.balanceOf(owner.address);

    expect(aliceBal).to.equal(amounts[0]);
    expect(bobBal).to.equal(amounts[1]);

    const total = amounts[0].add(amounts[1]);
    expect(ownerEnd).to.equal(ownerStart.sub(total));
  });

  it("owner can airdrop equal amount to many", async () => {
    const { owner, alice, bob, charlie, gov } = await deployGovernanceFixture();

    const ownerStart = await gov.balanceOf(owner.address);

    const recipients = [alice.address, bob.address, charlie.address];
    const amountEach = ethers.utils.parseEther("10");
    const total = amountEach.mul(recipients.length);

    const tx = await gov.connect(owner).airdropEqual(recipients, amountEach);
    await tx.wait();

    for (const r of recipients) {
      const bal = await gov.balanceOf(r);
      expect(bal).to.equal(amountEach);
    }

    const ownerEnd = await gov.balanceOf(owner.address);
    expect(ownerEnd).to.equal(ownerStart.sub(total));
  });

  it("non-owner cannot airdrop", async () => {
    const { alice, gov } = await deployGovernanceFixture();

    await expect(
      gov.connect(alice).airdropEqual([alice.address], ethers.utils.parseEther("1"))
    ).to.be.revertedWithCustomError(gov, "OwnableUnauthorizedAccount").withArgs(alice.address);
  });

  it("reverts on bad input", async () => {
    const { owner, alice, gov } = await deployGovernanceFixture();

    await expect(
      gov.connect(owner).airdrop([alice.address], [])
    ).to.be.revertedWith("Governance: length mismatch");

    await expect(
      gov.connect(owner).airdropEqual([], ethers.utils.parseEther("1"))
    ).to.be.revertedWith("Governance: empty batch");
  });
});


