// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./Property.sol";

/**
 * @title VoteEscrow
 * @dev Escrow + simple governance check for BrickStack.
 *
 * Flow for each propertyId:
 *  - Owner calls proposeProperty(...) to set seller, target price, description, deadline.
 *  - Governance token holders call voteAndLock(propertyId, amountWei) sending ETH.
 *      * Requires governanceToken.balanceOf(msg.sender) >= minGovBalance.
 *      * Requires amountWei == msg.value and is multiple of sharePrice.
 *  - When ready, DAO/owner calls triggerBuy(propertyId) if totalLocked >= targetPriceWei:
 *      * Sends all locked ETH to seller.
 *      * Mints ERC1155 property shares pro-rata based on locked ETH.
 *  - If the deal is cancelled, owner calls cancelProperty(propertyId).
 *      * Then investors can call refund(propertyId) to get their locked ETH back.
 */
contract VoteEscrow is Ownable, ReentrancyGuard {
    struct Proposal {
        bool exists;
        address seller;
        uint256 targetPriceWei;
        string description;
        uint256 totalLocked;
        uint256 deadline;
        bool finalized;
        bool successful;
    }

    Property public immutable propertyToken;
    IERC20 public immutable governanceToken;
    uint256 public minGovBalance;

    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => address[]) public investors;
    mapping(uint256 => mapping(address => uint256)) public lockedAmount;

    event PropertyProposed(
        uint256 indexed propertyId,
        address indexed seller,
        uint256 targetPriceWei,
        uint256 deadline,
        string description
    );

    event VoteLocked(
        uint256 indexed propertyId,
        address indexed investor,
        uint256 amountWei
    );

    event BuyTriggered(
        uint256 indexed propertyId,
        uint256 totalPaidWei
    );

    event PropertyCancelled(uint256 indexed propertyId);

    event Refunded(
        uint256 indexed propertyId,
        address indexed investor,
        uint256 amountWei
    );

    constructor(
        address propertyToken_,
        address governanceToken_,
        uint256 minGovBalance_
    ) Ownable(msg.sender) {
        require(propertyToken_ != address(0), "VoteEscrow: propertyToken zero");
        require(governanceToken_ != address(0), "VoteEscrow: governanceToken zero");

        propertyToken = Property(propertyToken_);
        governanceToken = IERC20(governanceToken_);
        minGovBalance = minGovBalance_;
    }

    function setMinGovBalance(uint256 newMin) external onlyOwner {
        minGovBalance = newMin;
    }

    function proposeProperty(
        uint256 propertyId,
        address seller,
        uint256 targetPriceWei,
        uint256 deadline,
        string calldata description
    ) external onlyOwner {
        require(seller != address(0), "VoteEscrow: seller zero");
        require(targetPriceWei > 0, "VoteEscrow: targetPrice zero");
        require(deadline > block.timestamp, "VoteEscrow: deadline in past");

        Property.PropertyInfo memory info = propertyToken.propertyMetadata(propertyId);
        require(info.exists, "VoteEscrow: unknown property");

        Proposal storage p = proposals[propertyId];
        require(!p.exists, "VoteEscrow: proposal already exists");

        p.exists = true;
        p.seller = seller;
        p.targetPriceWei = targetPriceWei;
        p.description = description;
        p.deadline = deadline;
        p.totalLocked = 0;
        p.finalized = false;
        p.successful = false;

        emit PropertyProposed(propertyId, seller, targetPriceWei, deadline, description);
    }

    function voteAndLock(uint256 propertyId, uint256 amountWei)
        external
        payable
        nonReentrant
    {
        require(msg.value == amountWei, "VoteEscrow: amount != msg.value");

        Proposal storage p = proposals[propertyId];
        require(p.exists, "VoteEscrow: no proposal");
        require(!p.finalized, "VoteEscrow: already finalized");
        require(block.timestamp <= p.deadline, "VoteEscrow: voting closed");
        require(amountWei > 0, "VoteEscrow: zero amount");

        require(
            governanceToken.balanceOf(msg.sender) >= minGovBalance,
            "VoteEscrow: insufficient governance tokens"
        );

        uint256 sharePrice = propertyToken.sharePriceWei(propertyId);
        require(sharePrice > 0, "VoteEscrow: share price not set");
        require(
            amountWei % sharePrice == 0,
            "VoteEscrow: amount not multiple of sharePrice"
        );

        uint256 sharesRequested = amountWei / sharePrice;

        uint256 currentSupply = propertyToken.totalSupply(propertyId);
        uint256 max = propertyToken.maxShares(propertyId);
        require(
            currentSupply + sharesRequested <= max,
            "VoteEscrow: exceeds maxShares"
        );

        if (lockedAmount[propertyId][msg.sender] == 0) {
            investors[propertyId].push(msg.sender);
        }

        lockedAmount[propertyId][msg.sender] += amountWei;
        p.totalLocked += amountWei;

        emit VoteLocked(propertyId, msg.sender, amountWei);
    }

    function triggerBuy(uint256 propertyId) external nonReentrant onlyOwner {
        Proposal storage p = proposals[propertyId];
        require(p.exists, "VoteEscrow: no proposal");
        require(!p.finalized, "VoteEscrow: already finalized");
        require(
            p.totalLocked >= p.targetPriceWei,
            "VoteEscrow: funding below target"
        );

        p.finalized = true;
        p.successful = true;

        uint256 totalToSend = p.totalLocked;

        (bool ok, ) = p.seller.call{value: totalToSend}("");
        require(ok, "VoteEscrow: seller transfer failed");

        uint256 sharePrice = propertyToken.sharePriceWei(propertyId);
        address[] storage addrs = investors[propertyId];

        for (uint256 i = 0; i < addrs.length; i++) {
            address investor = addrs[i];
            uint256 amount = lockedAmount[propertyId][investor];
            if (amount == 0) continue;

            uint256 shares = amount / sharePrice;
            lockedAmount[propertyId][investor] = 0;

            if (shares > 0) {
                propertyToken.mintShares(propertyId, investor, shares);
            }
        }

        emit BuyTriggered(propertyId, totalToSend);
    }

    function cancelProperty(uint256 propertyId) external onlyOwner {
        Proposal storage p = proposals[propertyId];
        require(p.exists, "VoteEscrow: no proposal");
        require(!p.finalized, "VoteEscrow: already finalized");

        p.finalized = true;
        p.successful = false;

        emit PropertyCancelled(propertyId);
    }

    function refund(uint256 propertyId) external nonReentrant {
        Proposal storage p = proposals[propertyId];
        require(p.exists, "VoteEscrow: no proposal");
        require(p.finalized, "VoteEscrow: not finalized");
        require(!p.successful, "VoteEscrow: deal successful, no refunds");

        uint256 amount = lockedAmount[propertyId][msg.sender];
        require(amount > 0, "VoteEscrow: nothing to refund");

        // Decrease totalLocked to reflect funds being withdrawn post-cancellation
        // Safe underflow due to bounds enforced above
        if (p.totalLocked >= amount) {
            p.totalLocked -= amount;
        } else {
            p.totalLocked = 0;
        }

        lockedAmount[propertyId][msg.sender] = 0;

        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "VoteEscrow: refund transfer failed");

        emit Refunded(propertyId, msg.sender, amount);
    }

    function getProposal(uint256 propertyId)
        external
        view
        returns (
            bool exists,
            address seller,
            uint256 targetPriceWei,
            string memory description,
            uint256 totalLocked,
            uint256 deadline,
            bool finalized,
            bool successful
        )
    {
        Proposal memory p = proposals[propertyId];
        return (
            p.exists,
            p.seller,
            p.targetPriceWei,
            p.description,
            p.totalLocked,
            p.deadline,
            p.finalized,
            p.successful
        );
    }

    receive() external payable {
        revert("VoteEscrow: use voteAndLock");
    }

    fallback() external payable {
        revert("VoteEscrow: invalid call");
    }
}


