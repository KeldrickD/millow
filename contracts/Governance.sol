// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title Governance
 * @dev Simple ERC20 governance token. Mints fixed supply to deployer.
 */
contract Governance is ERC20 {
    constructor() ERC20("BrickStack Governance", "BRICK") {
        // 1,000,000 tokens with 18 decimals
        _mint(msg.sender, 1_000_000 ether);
    }
}


