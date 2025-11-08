// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./Property.sol";

/**
 * @title PropertyYieldVault
 * @dev Simple per-share yield distribution vault for ERC-1155 properties.
 * Admin deposits rent (ERC20). Holders can claim proportionally by shares.
 */
contract PropertyYieldVault is Ownable {
    IERC20 public immutable rentToken;
    Property public immutable property;

    uint256 public constant PRECISION = 1e18;

    // Accumulated rent per share for each propertyId
    mapping(uint256 => uint256) public rentPerShare;
    // Snapshot of rentPerShare paid for user
    mapping(uint256 => mapping(address => uint256)) public userRentPerSharePaid;
    // Unclaimed amounts tracked per user
    mapping(uint256 => mapping(address => uint256)) public userUnclaimed;

    event YieldDeposited(uint256 indexed propertyId, uint256 amount);
    event YieldClaimed(uint256 indexed propertyId, address indexed user, uint256 amount);

    constructor(address rentToken_, address property_) Ownable(msg.sender) {
        require(rentToken_ != address(0) && property_ != address(0), "zero addr");
        rentToken = IERC20(rentToken_);
        property = Property(property_);
    }

    function idFromAddress(address propertyAddress) public pure returns (uint256) {
        return uint256(uint160(propertyAddress));
    }

    function depositYield(uint256 propertyId, uint256 amount) external onlyOwner {
        require(amount > 0, "zero amount");

        bool ok = rentToken.transferFrom(msg.sender, address(this), amount);
        require(ok, "transfer failed");

        uint256 totalShares = property.totalSupply(propertyId);
        require(totalShares > 0, "no shares");

        rentPerShare[propertyId] += (amount * PRECISION) / totalShares;
        emit YieldDeposited(propertyId, amount);
    }

    function _updateUser(uint256 propertyId, address user) internal {
        uint256 shares = property.balanceOf(user, propertyId);
        uint256 current = rentPerShare[propertyId];
        uint256 paid = userRentPerSharePaid[propertyId][user];

        if (shares > 0) {
            uint256 delta = current - paid;
            if (delta > 0) {
                uint256 addAmount = (shares * delta) / PRECISION;
                userUnclaimed[propertyId][user] += addAmount;
            }
        }

        userRentPerSharePaid[propertyId][user] = current;
    }

    function pendingYield(uint256 propertyId, address user) public view returns (uint256) {
        uint256 shares = property.balanceOf(user, propertyId);
        uint256 current = rentPerShare[propertyId];
        uint256 paid = userRentPerSharePaid[propertyId][user];
        uint256 pending = userUnclaimed[propertyId][user];

        if (shares == 0) return pending;
        if (current <= paid) return pending;

        uint256 delta = current - paid;
        uint256 addAmount = (shares * delta) / PRECISION;
        return pending + addAmount;
    }

    // Address-based helpers
    function depositYieldByAddress(address propertyAddress, uint256 amount) external onlyOwner {
        this.depositYield(idFromAddress(propertyAddress), amount);
    }

    function pendingYieldByAddress(address propertyAddress, address user) external view returns (uint256) {
        return pendingYield(idFromAddress(propertyAddress), user);
    }

    function claimYieldByAddress(address propertyAddress) external {
        this.claimYield(idFromAddress(propertyAddress));
    }

    function claimYield(uint256 propertyId) external {
        _updateUser(propertyId, msg.sender);
        uint256 amount = userUnclaimed[propertyId][msg.sender];
        require(amount > 0, "nothing to claim");
        userUnclaimed[propertyId][msg.sender] = 0;

        bool ok = rentToken.transfer(msg.sender, amount);
        require(ok, "transfer failed");
        emit YieldClaimed(propertyId, msg.sender, amount);
    }
}


