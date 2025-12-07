// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IProperty1155 {
    function totalSupply(uint256 id) external view returns (uint256);
    function balanceOf(address account, uint256 id) external view returns (uint256);
}

contract PropertyYieldVault is Ownable, ReentrancyGuard {
    IERC20 public immutable rentToken;
    IProperty1155 public immutable property;

    uint256 private constant PRECISION = 1e18;

    mapping(uint256 => uint256) public rentPerShare; // propertyId => accumulated rent per share (scaled)
    mapping(uint256 => mapping(address => uint256)) public userRentPerSharePaid; // propertyId => user => value
    mapping(uint256 => mapping(address => uint256)) public userUnclaimed; // propertyId => user => token amount

    event YieldDeposited(uint256 indexed propertyId, uint256 amount);
    event YieldClaimed(uint256 indexed propertyId, address indexed user, uint256 amount);

    constructor(address token, address property1155) Ownable(msg.sender) {
        rentToken = IERC20(token);
        property = IProperty1155(property1155);
    }

    function depositYield(uint256 propertyId, uint256 amount) external onlyOwner nonReentrant {
        require(amount > 0, "amount=0");
        uint256 supply = property.totalSupply(propertyId);
        require(supply > 0, "no shares");

        require(rentToken.transferFrom(msg.sender, address(this), amount), "transferFrom failed");
        rentPerShare[propertyId] += (amount * PRECISION) / supply;
        emit YieldDeposited(propertyId, amount);
    }

    function pendingYield(uint256 propertyId, address user) public view returns (uint256) {
        uint256 shares = property.balanceOf(user, propertyId);
        uint256 current = rentPerShare[propertyId];
        uint256 paid = userRentPerSharePaid[propertyId][user];
        uint256 earned = userUnclaimed[propertyId][user];
        if (shares > 0 && current > paid) {
            uint256 delta = current - paid;
            earned += (shares * delta) / PRECISION;
        }
        return earned;
    }

    function claimYield(uint256 propertyId) external nonReentrant {
        _updateUser(propertyId, msg.sender);
        uint256 amount = userUnclaimed[propertyId][msg.sender];
        require(amount > 0, "nothing to claim");
        userUnclaimed[propertyId][msg.sender] = 0;
        require(rentToken.transfer(msg.sender, amount), "transfer failed");
        emit YieldClaimed(propertyId, msg.sender, amount);
    }

    function _updateUser(uint256 propertyId, address user) internal {
        uint256 shares = property.balanceOf(user, propertyId);
        uint256 current = rentPerShare[propertyId];
        uint256 paid = userRentPerSharePaid[propertyId][user];
        if (shares > 0 && current > paid) {
            uint256 delta = current - paid;
            uint256 addAmount = (shares * delta) / PRECISION;
            userUnclaimed[propertyId][user] += addAmount;
        }
        userRentPerSharePaid[propertyId][user] = current;
    }
}
