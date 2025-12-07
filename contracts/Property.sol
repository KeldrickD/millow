// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IProperty {
    struct PropertyInfo {
        bool exists;
        uint256 maxShares;
        uint256 sharePriceWei;
        uint16 yieldBps;
        string metadataURI;
    }
}

contract Property is ERC1155, Ownable {
    struct PropertyInfo {
        bool exists;
        uint256 maxShares;
        uint256 sharePriceWei;
        uint16 yieldBps;
        string metadataURI;
    }

    address public escrow;
    mapping(address => bool) private _extraMinters;

    mapping(uint256 => PropertyInfo) public properties;
    mapping(uint256 => uint256) private _totalSupply;
    mapping(address => bool) private _whitelist;

    event EscrowUpdated(address indexed escrow);
    event PropertySeriesCreated(
        uint256 indexed id,
        uint256 maxShares,
        uint256 sharePriceWei,
        uint16 yieldBps,
        string metadataURI
    );
    event SharesMinted(uint256 indexed id, address indexed to, uint256 amount);
    event WhitelistUpdated(address indexed account, bool allowed);
    event ExtraMinterUpdated(address indexed account, bool allowed);

    modifier onlyEscrow() {
        require(msg.sender == escrow, "Property: not escrow");
        _;
    }

    constructor(string memory baseUri) ERC1155(baseUri) Ownable(msg.sender) {}

    function setEscrow(address e) external onlyOwner {
        escrow = e;
        emit EscrowUpdated(e);
    }

    function setExtraMinter(address account, bool allowed) external onlyOwner {
        _extraMinters[account] = allowed;
        emit ExtraMinterUpdated(account, allowed);
    }

    function setWhitelisted(address account, bool allowed) external onlyOwner {
        _whitelist[account] = allowed;
        emit WhitelistUpdated(account, allowed);
    }

    function isWhitelisted(address account) external view returns (bool) {
        return _whitelist[account];
    }

    function createProperty(
        uint256 propertyId,
        uint256 maxShares_,
        uint256 sharePriceWei_,
        uint16 yieldBps_,
        string memory metadataURI_
    ) external onlyOwner {
        require(!properties[propertyId].exists, "Property: already exists");
        require(maxShares_ > 0, "Property: maxShares=0");
        require(sharePriceWei_ > 0, "Property: price=0");

        properties[propertyId] = PropertyInfo({
            exists: true,
            maxShares: maxShares_,
            sharePriceWei: sharePriceWei_,
            yieldBps: yieldBps_,
            metadataURI: metadataURI_
        });

        emit PropertySeriesCreated(
            propertyId,
            maxShares_,
            sharePriceWei_,
            yieldBps_,
            metadataURI_
        );
    }

    function totalSupply(uint256 id) external view returns (uint256) {
        return _totalSupply[id];
    }

    function maxShares(uint256 id) external view returns (uint256) {
        return properties[id].maxShares;
    }

    function sharePriceWei(uint256 id) external view returns (uint256) {
        return properties[id].sharePriceWei;
    }

    function propertyMetadata(uint256 id) external view returns (PropertyInfo memory) {
        return properties[id];
    }

    function mintShares(uint256 id, address to, uint256 amount) external {
        require(msg.sender == escrow || _extraMinters[msg.sender], "Property: caller not minter");
        require(to != address(0), "Property: mint to zero");
        PropertyInfo memory info = properties[id];
        require(info.exists, "Property: unknown id");
        require(_whitelist[to], "Property: not whitelisted");
        require(_totalSupply[id] + amount <= info.maxShares, "Property: exceeds max");
        _totalSupply[id] += amount;
        _mint(to, id, amount, "");
        emit SharesMinted(id, to, amount);
    }

}
