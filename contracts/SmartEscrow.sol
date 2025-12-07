// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title SmartEscrow
 * @dev Milestone-based escrow with oracle-signed completion.
 *
 * - Owner creates an escrow with buyer, seller, total amount, propertyId, oracle, deadline, and N milestones.
 * - Buyer deposits the full amount in ETH.
 * - For each milestone, an oracle signs a message; verifyMilestone() checks signature and releases that milestone's slice.
 * - Owner can force-complete milestones (for admin / demo cases) via ownerCompleteMilestone().
 * - Owner or buyer can cancel before all milestones complete; remaining funds refunded to buyer.
 */
contract SmartEscrow is Ownable, ReentrancyGuard {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    struct Escrow {
        bool exists;
        address buyer;
        address seller;
        uint256 propertyId;
        uint256 totalAmount;
        uint256 deposited;
        uint256 released;
        uint256 deadline;
        address oracle;
        bool cancelled;
        bool fullyReleased;
    }

    struct Milestone {
        string name;
        bool completed;
        uint256 completedAt;
    }

    mapping(uint256 => Escrow) public escrows;
    mapping(uint256 => Milestone[]) public milestones;

    uint256 public nextEscrowId = 1;

    event EscrowCreated(
        uint256 indexed escrowId,
        address indexed buyer,
        address indexed seller,
        uint256 propertyId,
        uint256 totalAmount,
        uint256 deadline,
        address oracle,
        uint256 milestonesCount
    );

    event EscrowDeposited(uint256 indexed escrowId, address indexed buyer, uint256 amount);

    event MilestoneCompleted(
        uint256 indexed escrowId,
        uint256 indexed milestoneIndex,
        address indexed completedBy,
        uint256 amountReleased
    );

    event EscrowCancelled(uint256 indexed escrowId, address indexed cancelledBy, uint256 refundedAmount);

    event EscrowFullyReleased(uint256 indexed escrowId, uint256 totalReleased);

    error EscrowNotFound();
    error EscrowAlreadyExists();
    error NotBuyer();
    error NotOracle();
    error AlreadyCompleted();
    error AlreadyCancelled();
    error AlreadyFullyReleased();
    error InvalidAmount();
    error InvalidMilestone();
    error TooEarly();
    error NothingToRefund();

    constructor(address initialOwner) Ownable(initialOwner) {}

    function createEscrow(
        address buyer,
        address seller,
        uint256 propertyId,
        uint256 totalAmount,
        uint256 deadline,
        address oracle,
        string[] calldata milestoneNames
    ) external onlyOwner returns (uint256 escrowId) {
        require(buyer != address(0) && seller != address(0), "SmartEscrow: zero addr");
        require(oracle != address(0), "SmartEscrow: oracle zero");
        require(totalAmount > 0, "SmartEscrow: total zero");
        require(deadline > block.timestamp, "SmartEscrow: deadline in past");
        require(milestoneNames.length > 0, "SmartEscrow: no milestones");

        escrowId = nextEscrowId++;
        Escrow storage e = escrows[escrowId];
        if (e.exists) revert EscrowAlreadyExists();

        e.exists = true;
        e.buyer = buyer;
        e.seller = seller;
        e.propertyId = propertyId;
        e.totalAmount = totalAmount;
        e.deposited = 0;
        e.released = 0;
        e.deadline = deadline;
        e.oracle = oracle;
        e.cancelled = false;
        e.fullyReleased = false;

        Milestone[] storage ms = milestones[escrowId];
        for (uint256 i = 0; i < milestoneNames.length; i++) {
            ms.push(Milestone({name: milestoneNames[i], completed: false, completedAt: 0}));
        }

        emit EscrowCreated(
            escrowId,
            buyer,
            seller,
            propertyId,
            totalAmount,
            deadline,
            oracle,
            milestoneNames.length
        );
    }

    modifier onlyExisting(uint256 escrowId) {
        if (!escrows[escrowId].exists) revert EscrowNotFound();
        _;
    }

    function deposit(uint256 escrowId) external payable nonReentrant onlyExisting(escrowId) {
        Escrow storage e = escrows[escrowId];
        if (msg.sender != e.buyer) revert NotBuyer();
        if (e.cancelled || e.fullyReleased) revert AlreadyCancelled();
        if (msg.value == 0) revert InvalidAmount();

        e.deposited += msg.value;
        if (e.deposited > e.totalAmount) revert InvalidAmount();

        emit EscrowDeposited(escrowId, msg.sender, msg.value);
    }

    function _milestoneSlice(uint256 escrowId, uint256 milestoneIndex) internal view returns (uint256) {
        Escrow storage e = escrows[escrowId];
        Milestone[] storage ms = milestones[escrowId];
        uint256 n = ms.length;
        if (milestoneIndex >= n) revert InvalidMilestone();

        uint256 baseSlice = e.totalAmount / n;
        uint256 remainder = e.totalAmount - (baseSlice * n);

        if (milestoneIndex == n - 1) {
            return baseSlice + remainder;
        } else {
            return baseSlice;
        }
    }

    function milestoneMessageHash(uint256 escrowId, uint256 milestoneIndex) public view returns (bytes32) {
        return keccak256(abi.encodePacked("SMART_ESCROW_MILESTONE", address(this), escrowId, milestoneIndex));
    }

    function verifyMilestone(uint256 escrowId, uint256 milestoneIndex, bytes calldata signature)
        external
        nonReentrant
        onlyExisting(escrowId)
    {
        Escrow storage e = escrows[escrowId];
        if (e.cancelled) revert AlreadyCancelled();
        if (e.fullyReleased) revert AlreadyFullyReleased();

        Milestone[] storage ms = milestones[escrowId];
        if (milestoneIndex >= ms.length) revert InvalidMilestone();
        Milestone storage m = ms[milestoneIndex];
        if (m.completed) revert AlreadyCompleted();

        bytes32 msgHash = milestoneMessageHash(escrowId, milestoneIndex).toEthSignedMessageHash();
        address recovered = ECDSA.recover(msgHash, signature);
        if (recovered != e.oracle) revert NotOracle();

        _completeMilestone(escrowId, milestoneIndex, e.oracle);
    }

    function ownerCompleteMilestone(uint256 escrowId, uint256 milestoneIndex)
        external
        nonReentrant
        onlyOwner
        onlyExisting(escrowId)
    {
        Escrow storage e = escrows[escrowId];
        if (e.cancelled) revert AlreadyCancelled();
        if (e.fullyReleased) revert AlreadyFullyReleased();

        Milestone[] storage ms = milestones[escrowId];
        if (milestoneIndex >= ms.length) revert InvalidMilestone();
        Milestone storage m = ms[milestoneIndex];
        if (m.completed) revert AlreadyCompleted();

        _completeMilestone(escrowId, milestoneIndex, msg.sender);
    }

    function _completeMilestone(uint256 escrowId, uint256 milestoneIndex, address completedBy) internal {
        Escrow storage e = escrows[escrowId];
        Milestone[] storage ms = milestones[escrowId];
        Milestone storage m = ms[milestoneIndex];

        uint256 slice = _milestoneSlice(escrowId, milestoneIndex);
        require(e.deposited - e.released >= slice, "SmartEscrow: insufficient escrow balance");

        m.completed = true;
        m.completedAt = block.timestamp;
        e.released += slice;

        (bool ok, ) = e.seller.call{value: slice}("");
        require(ok, "SmartEscrow: seller transfer failed");

        emit MilestoneCompleted(escrowId, milestoneIndex, completedBy, slice);

        if (e.released == e.totalAmount) {
          e.fullyReleased = true;
          emit EscrowFullyReleased(escrowId, e.released);
        }
    }

    function cancel(uint256 escrowId) external nonReentrant onlyExisting(escrowId) {
        Escrow storage e = escrows[escrowId];
        if (e.cancelled) revert AlreadyCancelled();
        if (e.fullyReleased) revert AlreadyFullyReleased();

        if (msg.sender != owner() && msg.sender != e.buyer) {
            revert NotBuyer();
        }

        if (msg.sender == e.buyer && block.timestamp < e.deadline) {
            revert TooEarly();
        }

        uint256 remaining = e.deposited - e.released;
        if (remaining == 0) revert NothingToRefund();

        e.cancelled = true;

        (bool ok, ) = e.buyer.call{value: remaining}("");
        require(ok, "SmartEscrow: refund failed");

        emit EscrowCancelled(escrowId, msg.sender, remaining);
    }

    function getEscrow(uint256 escrowId) external view returns (Escrow memory e, Milestone[] memory ms) {
        if (!escrows[escrowId].exists) revert EscrowNotFound();
        e = escrows[escrowId];
        ms = milestones[escrowId];
    }

    receive() external payable {
        revert("SmartEscrow: direct ETH not allowed");
    }

    fallback() external payable {
        revert("SmartEscrow: invalid call");
    }
}

