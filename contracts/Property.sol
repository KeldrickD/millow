// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Property
 * @dev ERC1155 token representing fractional property shares.
 * Each propertyId is a separate "series" of fungible shares.
 *
 * - Owner can create properties and set config.
 * - Only the designated escrow contract can mint shares.
 * - Whitelist enforced on mint/transfers.
 * - getYield() returns a mock monthly yield per share (e.g. 5% of share price).
 */
contract Property is ERC1155, Ownable {
    address public escrow;

    struct PropertyInfo {
        bool exists;
        uint256 maxShares;
        uint256 sharePriceWei;
        uint16 yieldBps;
        string metadataURI;
    }

    mapping(uint256 => PropertyInfo) public properties;
    mapping(uint256 => uint256) private _totalSupply;
    mapping(address => bool) private _whitelist;

    event PropertyCreated(
        uint256 indexed propertyId,
        uint256 maxShares,
        uint256 sharePriceWei,
        uint16 yieldBps,
        string metadataURI
    );

    event SharesMinted(
        uint256 indexed propertyId,
        address indexed to,
        uint256 amount
    );

    event WhitelistUpdated(address indexed account, bool whitelisted);
    event EscrowUpdated(address indexed escrow);

    modifier onlyEscrow() {
        require(msg.sender == escrow, "Property: caller is not escrow");
        _;
    }

    constructor(string memory globalURI) ERC1155(globalURI) Ownable(msg.sender) {}

    // Helpers
    function idFromAddress(address propertyAddress) public pure returns (uint256) {
        return uint256(uint160(propertyAddress));
    }

    function setEscrow(address newEscrow) external onlyOwner {
        require(newEscrow != address(0), "Property: zero escrow");
        escrow = newEscrow;
        emit EscrowUpdated(newEscrow);
    }

    function setWhitelisted(address account, bool allowed) external onlyOwner {
        _whitelist[account] = allowed;
        emit WhitelistUpdated(account, allowed);
    }

    function isWhitelisted(address account) external view returns (bool) {
        return _whitelist[account];
    }

    function _createProperty(
        uint256 propertyId,
        uint256 maxShares_,
        uint256 sharePriceWei_,
        uint16 yieldBps_,
        string memory metadataURI_
    ) internal {
        require(!properties[propertyId].exists, "Property: already exists");
        require(maxShares_ > 0, "Property: maxShares zero");
        require(sharePriceWei_ > 0, "Property: sharePrice zero");

        properties[propertyId] = PropertyInfo({
            exists: true,
            maxShares: maxShares_,
            sharePriceWei: sharePriceWei_,
            yieldBps: yieldBps_,
            metadataURI: metadataURI_
        });

        emit PropertyCreated(
            propertyId,
            maxShares_,
            sharePriceWei_,
            yieldBps_,
            metadataURI_
        );
    }

    function createProperty(
        uint256 propertyId,
        uint256 maxShares_,
        uint256 sharePriceWei_,
        uint16 yieldBps_,
        string memory metadataURI_
    ) external onlyOwner {
        _createProperty(propertyId, maxShares_, sharePriceWei_, yieldBps_, metadataURI_);
    }

    function createPropertyFromAddress(
        address propertyAddress,
        uint256 maxShares_,
        uint256 sharePriceWei_,
        uint16 yieldBps_,
        string memory metadataURI_
    ) external onlyOwner {
        uint256 propertyId = idFromAddress(propertyAddress);
        _createProperty(propertyId, maxShares_, sharePriceWei_, yieldBps_, metadataURI_);
    }

    function mintShares(
        uint256 propertyId,
        address to,
        uint256 amount
    ) external onlyEscrow {
        require(to != address(0), "Property: mint to zero");
        require(_whitelist[to], "Property: recipient not whitelisted");

        PropertyInfo memory info = properties[propertyId];
        require(info.exists, "Property: unknown property");
        require(
            _totalSupply[propertyId] + amount <= info.maxShares,
            "Property: exceeds maxShares"
        );

        _totalSupply[propertyId] += amount;
        _mint(to, propertyId, amount, "");
        emit SharesMinted(propertyId, to, amount);
    }

    function totalSupply(uint256 propertyId) external view returns (uint256) {
        return _totalSupply[propertyId];
    }

    function maxShares(uint256 propertyId) external view returns (uint256) {
        return properties[propertyId].maxShares;
    }

    function sharePriceWei(uint256 propertyId) external view returns (uint256) {
        return properties[propertyId].sharePriceWei;
    }

    function yieldBps(uint256 propertyId) external view returns (uint16) {
        return properties[propertyId].yieldBps;
    }

    function propertyMetadata(uint256 propertyId)
        external
        view
        returns (PropertyInfo memory)
    {
        return properties[propertyId];
    }

    function getYield(uint256 propertyId) external view returns (uint256) {
        PropertyInfo memory info = properties[propertyId];
        require(info.exists, "Property: unknown property");
        return (info.sharePriceWei * info.yieldBps) / 10_000;
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) public override {
        if (to != address(0)) {
            require(_whitelist[to], "Property: recipient not whitelisted");
        }
        super.safeTransferFrom(from, to, id, amount, data);
    }

    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) public override {
        if (to != address(0)) {
            require(_whitelist[to], "Property: recipient not whitelisted");
        }
        super.safeBatchTransferFrom(from, to, ids, amounts, data);
    }
}


