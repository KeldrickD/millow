// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Governance
 * @dev Simple ERC20 governance token for BrickStack with batch airdrop support.
 */
contract Governance is ERC20, Ownable {
    event GovernanceAirdrop(address indexed recipient, uint256 amount);
    event GovernanceBatchAirdrop(uint256 count, uint256 totalAmount);

    constructor() ERC20("BrickStack Governance", "BRICK") Ownable(msg.sender) {
        // Mint 1,000,000 BRICK (18 decimals) to owner by default
        _mint(msg.sender, 1_000_000 * 10 ** decimals());
    }

    /**
     * @dev Owner-only mint, if you want to expand supply in the future.
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev Batch airdrop with custom amounts per recipient.
     * - All arrays must match lengths.
     * - Emits GovernanceAirdrop for each recipient and a final GovernanceBatchAirdrop.
     */
    function airdrop(address[] calldata recipients, uint256[] calldata amounts) external onlyOwner {
        require(recipients.length == amounts.length, "Governance: length mismatch");
        uint256 len = recipients.length;
        require(len > 0, "Governance: empty batch");

        uint256 totalAmount;
        for (uint256 i = 0; i < len; i++) {
            address to = recipients[i];
            uint256 amt = amounts[i];
            require(to != address(0), "Governance: zero recipient");
            require(amt > 0, "Governance: zero amount");

            _transfer(_msgSender(), to, amt);
            totalAmount += amt;
            emit GovernanceAirdrop(to, amt);
        }

        emit GovernanceBatchAirdrop(len, totalAmount);
    }

    /**
     * @dev Airdrop the same amount to every address.
     */
    function airdropEqual(address[] calldata recipients, uint256 amountEach) external onlyOwner {
        require(amountEach > 0, "Governance: zero amountEach");
        uint256 len = recipients.length;
        require(len > 0, "Governance: empty batch");

        uint256 totalAmount = amountEach * len;
        require(balanceOf(_msgSender()) >= totalAmount, "Governance: insufficient owner balance");

        for (uint256 i = 0; i < len; i++) {
            address to = recipients[i];
            require(to != address(0), "Governance: zero recipient");
            _transfer(_msgSender(), to, amountEach);
            emit GovernanceAirdrop(to, amountEach);
        }

        emit GovernanceBatchAirdrop(len, totalAmount);
    }
}
