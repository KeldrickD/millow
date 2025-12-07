// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IPropertyToken {
    function properties(uint256 id) external view returns (bool, uint256, uint256, uint16, string memory);
    function isWhitelisted(address account) external view returns (bool);
    function mintShares(uint256 id, address to, uint256 amount) external;
    function sharePriceWei(uint256 id) external view returns (uint256);
}

interface IGov {
    function balanceOf(address account) external view returns (uint256);
}

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

    IPropertyToken public propertyToken;
    IGov public governance;
    uint256 public minGovBalance;

    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => uint256)) public lockedAmount;
    mapping(uint256 => address[]) public investors;
    mapping(uint256 => mapping(address => bool)) public isInvestor;

    uint256[] private _allPropertyIds;
    mapping(uint256 => bool) private _propertyKnown;
    mapping(uint256 => bool) private _isActive;

    event PropertyProposed(uint256 indexed propertyId, address indexed seller, uint256 targetWei, uint256 deadline, string description);
    event VoteLocked(uint256 indexed propertyId, address indexed investor, uint256 amountWei);
    event BuyTriggered(uint256 indexed propertyId, uint256 totalPaidWei);
    event ProposalFinalized(uint256 indexed propertyId, bool successful);
    event Refunded(uint256 indexed propertyId, address indexed investor, uint256 amount);

    constructor(address property_, address governance_, uint256 minGovBalance_) Ownable(msg.sender) {
        propertyToken = IPropertyToken(property_);
        governance = IGov(governance_);
        minGovBalance = minGovBalance_;
    }

    function _registerProperty(uint256 propertyId) internal {
        if (!_propertyKnown[propertyId]) {
            _propertyKnown[propertyId] = true;
            _allPropertyIds.push(propertyId);
        }
        _isActive[propertyId] = true;
    }

    function getAllPropertyIds() external view returns (uint256[] memory) {
        return _allPropertyIds;
    }

    function getActivePropertyIds() external view returns (uint256[] memory ids) {
        uint256 len = _allPropertyIds.length;
        uint256 count;
        for (uint256 i; i < len; ++i) {
            if (_isActive[_allPropertyIds[i]]) count++;
        }
        ids = new uint256[](count);
        uint256 idx;
        for (uint256 i; i < len; ++i) {
            uint256 pid = _allPropertyIds[i];
            if (_isActive[pid]) {
                ids[idx++] = pid;
            }
        }
    }

    function _propose(uint256 propertyId, address seller, uint256 targetWei, uint256 deadline, string calldata description) internal {
        require(seller != address(0), "seller=0");
        require(targetWei > 0, "target=0");
        require(deadline > block.timestamp, "deadline past");
        (bool exists,, , ,) = propertyToken.properties(propertyId);
        require(exists, "unknown property");
        Proposal storage p = proposals[propertyId];
        require(!p.exists, "already proposed");
        p.exists = true;
        p.seller = seller;
        p.targetPriceWei = targetWei;
        p.description = description;
        p.deadline = deadline;
        p.totalLocked = 0;
        p.finalized = false;
        p.successful = false;
        _registerProperty(propertyId);
        emit PropertyProposed(propertyId, seller, targetWei, deadline, description);
    }

    function proposeProperty(uint256 propertyId, address seller, uint256 targetWei, uint256 deadline, string calldata description) external onlyOwner {
        _propose(propertyId, seller, targetWei, deadline, description);
    }

    function proposePropertyByAddress(address /*propertyAddress*/, address seller, uint256 targetWei, uint256 deadline, string calldata description) external onlyOwner {
        // For compatibility; propertyId should be passed by frontend via idFromPropertyKey
        revert("use proposeProperty");
    }

    function getProposal(uint256 propertyId) external view returns (
        bool, address, uint256, string memory, uint256, uint256, bool, bool
    ) {
        Proposal memory p = proposals[propertyId];
        return (p.exists, p.seller, p.targetPriceWei, p.description, p.totalLocked, p.deadline, p.finalized, p.successful);
    }

    // Typed struct return for frontend/indexer convenience
    function getProposalStruct(uint256 propertyId) external view returns (Proposal memory) {
        return proposals[propertyId];
    }

    // User position helper: returns locked ETH and allocated shares for a user
    struct UserPosition {
        uint256 lockedWei;
        uint256 allocatedShares;
    }

    function getUserPosition(uint256 propertyId, address user) external view returns (UserPosition memory) {
        uint256 locked = lockedAmount[propertyId][user];
        uint256 price = propertyToken.sharePriceWei(propertyId);
        uint256 shares = price > 0 ? locked / price : 0;
        return UserPosition({ lockedWei: locked, allocatedShares: shares });
    }

    function voteAndLock(uint256 propertyId, uint256 amountWei) external payable {
        Proposal storage p = proposals[propertyId];
        require(p.exists, "no proposal");
        require(!p.finalized, "finalized");
        require(block.timestamp <= p.deadline, "deadline passed");
        require(msg.value == amountWei && amountWei > 0, "invalid value");
        require(governance.balanceOf(msg.sender) >= minGovBalance, "insufficient gov");
        // Optional whitelist check - ensure receiver can receive shares later
        require(propertyToken.isWhitelisted(msg.sender), "not whitelisted");

        lockedAmount[propertyId][msg.sender] += amountWei;
        p.totalLocked += amountWei;

        if (!isInvestor[propertyId][msg.sender]) {
            isInvestor[propertyId][msg.sender] = true;
            investors[propertyId].push(msg.sender);
        }

        emit VoteLocked(propertyId, msg.sender, amountWei);
    }

    function triggerBuy(uint256 propertyId) external onlyOwner nonReentrant {
        Proposal storage p = proposals[propertyId];
        require(p.exists, "no proposal");
        require(!p.finalized, "finalized");
        require(p.totalLocked >= p.targetPriceWei, "target not met");

        uint256 price = propertyToken.sharePriceWei(propertyId);
        require(price > 0, "price=0");

        // Mint shares to investors (proportional to their deposits)
        address[] memory list = investors[propertyId];
        for (uint256 i = 0; i < list.length; i++) {
            address inv = list[i];
            uint256 amount = lockedAmount[propertyId][inv];
            if (amount > 0) {
                uint256 shares = amount / price;
                if (shares > 0) {
                    propertyToken.mintShares(propertyId, inv, shares);
                }
                lockedAmount[propertyId][inv] = 0;
            }
        }

        // Payout ETH to seller
        uint256 payout = p.totalLocked;
        p.totalLocked = 0;
        (bool ok,) = p.seller.call{value: payout}("");
        require(ok, "payout failed");

        p.finalized = true;
        p.successful = true;
        _isActive[propertyId] = false;
        emit BuyTriggered(propertyId, payout);
        emit ProposalFinalized(propertyId, true);
    }

    function cancelProperty(uint256 propertyId) external onlyOwner {
        Proposal storage p = proposals[propertyId];
        require(p.exists, "no proposal");
        require(!p.finalized, "finalized");
        p.finalized = true;
        p.successful = false;
        _isActive[propertyId] = false;
        emit ProposalFinalized(propertyId, false);
    }

    function refund(uint256 propertyId) external nonReentrant {
        Proposal storage p = proposals[propertyId];
        require(p.exists, "no proposal");
        require(p.finalized && !p.successful, "not refundable");
        uint256 amount = lockedAmount[propertyId][msg.sender];
        require(amount > 0, "nothing to refund");
        // adjust totals
        if (p.totalLocked >= amount) {
            p.totalLocked -= amount;
        } else {
            p.totalLocked = 0;
        }
        lockedAmount[propertyId][msg.sender] = 0;
        (bool ok,) = msg.sender.call{value: amount}("");
        require(ok, "refund failed");
        emit Refunded(propertyId, msg.sender, amount);
    }
}
