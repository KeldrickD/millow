// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "./Property.sol";

/**
 * @title PropertyDex
 * @dev Simple constant-product AMM for Property ERC1155 shares <-> stablecoin.
 *
 * - One pool per propertyId.
 * - Protocol-owned liquidity: only owner can create and add/remove liquidity.
 * - Users can swap USDC -> shares and shares -> USDC against the pool.
 *
 * NOTE: For V1 this is intentionally minimal and demo-oriented.
 */
contract PropertyDex is Ownable, ReentrancyGuard, ERC1155Holder {
    IERC20 public immutable stableToken;
    Property public immutable propertyToken;

    struct Pool {
        bool exists;
        uint256 propertyId;
        uint256 shareReserve;
        uint256 stableReserve;
        uint16 feeBps;
    }

    mapping(uint256 => Pool) public pools;
    uint256[] private _poolPropertyIds;

    event PoolCreated(uint256 indexed propertyId, uint256 shareReserve, uint256 stableReserve, uint16 feeBps);
    event LiquidityAdded(uint256 indexed propertyId, uint256 shareAmount, uint256 stableAmount);
    event LiquidityRemoved(uint256 indexed propertyId, uint256 shareAmount, uint256 stableAmount);
    event SwapStableForShares(uint256 indexed propertyId, address indexed trader, uint256 stableIn, uint256 sharesOut);
    event SwapSharesForStable(uint256 indexed propertyId, address indexed trader, uint256 sharesIn, uint256 stableOut);

    constructor(address stableToken_, address propertyToken_) Ownable(msg.sender) {
        require(stableToken_ != address(0), "PropertyDex: stable zero");
        require(propertyToken_ != address(0), "PropertyDex: property zero");
        stableToken = IERC20(stableToken_);
        propertyToken = Property(propertyToken_);
    }

    function getPool(uint256 propertyId) external view returns (Pool memory) {
        return pools[propertyId];
    }

    function getAllPoolPropertyIds() external view returns (uint256[] memory) {
        return _poolPropertyIds;
    }

    function createPool(uint256 propertyId, uint256 initialShareAmount, uint256 initialStableAmount, uint16 feeBps)
        external
        onlyOwner
        nonReentrant
    {
        require(!pools[propertyId].exists, "PropertyDex: pool exists");
        require(initialShareAmount > 0, "PropertyDex: zero shares");
        require(initialStableAmount > 0, "PropertyDex: zero stable");
        require(feeBps <= 1000, "PropertyDex: fee too high");

        Property.PropertyInfo memory info = propertyToken.propertyMetadata(propertyId);
        require(info.exists, "PropertyDex: unknown property");

        propertyToken.safeTransferFrom(msg.sender, address(this), propertyId, initialShareAmount, "");
        bool ok = stableToken.transferFrom(msg.sender, address(this), initialStableAmount);
        require(ok, "PropertyDex: stable transfer failed");

        pools[propertyId] = Pool({
            exists: true,
            propertyId: propertyId,
            shareReserve: initialShareAmount,
            stableReserve: initialStableAmount,
            feeBps: feeBps
        });

        _poolPropertyIds.push(propertyId);
        emit PoolCreated(propertyId, initialShareAmount, initialStableAmount, feeBps);
    }

    function addLiquidity(uint256 propertyId, uint256 shareAmount, uint256 stableAmount)
        external
        onlyOwner
        nonReentrant
    {
        Pool storage pool = pools[propertyId];
        require(pool.exists, "PropertyDex: no pool");
        require(shareAmount > 0 && stableAmount > 0, "PropertyDex: zero amount");

        propertyToken.safeTransferFrom(msg.sender, address(this), propertyId, shareAmount, "");
        bool ok = stableToken.transferFrom(msg.sender, address(this), stableAmount);
        require(ok, "PropertyDex: stable transfer failed");

        pool.shareReserve += shareAmount;
        pool.stableReserve += stableAmount;
        emit LiquidityAdded(propertyId, shareAmount, stableAmount);
    }

    function removeLiquidity(uint256 propertyId, uint256 shareAmount, uint256 stableAmount)
        external
        onlyOwner
        nonReentrant
    {
        Pool storage pool = pools[propertyId];
        require(pool.exists, "PropertyDex: no pool");
        require(shareAmount <= pool.shareReserve, "PropertyDex: share > reserve");
        require(stableAmount <= pool.stableReserve, "PropertyDex: stable > reserve");

        if (shareAmount > 0) {
            pool.shareReserve -= shareAmount;
            propertyToken.safeTransferFrom(address(this), msg.sender, propertyId, shareAmount, "");
        }
        if (stableAmount > 0) {
            pool.stableReserve -= stableAmount;
            bool ok = stableToken.transfer(msg.sender, stableAmount);
            require(ok, "PropertyDex: stable transfer failed");
        }

        emit LiquidityRemoved(propertyId, shareAmount, stableAmount);
    }

    function _getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut, uint16 feeBps)
        internal
        pure
        returns (uint256)
    {
        require(reserveIn > 0 && reserveOut > 0, "PropertyDex: bad reserves");
        uint256 fee = 10_000 - feeBps;
        uint256 amountInWithFee = amountIn * fee / 10_000;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = reserveIn + amountInWithFee;
        return numerator / denominator;
    }

    function swapStableForShares(uint256 propertyId, uint256 stableIn, uint256 minSharesOut) external nonReentrant {
        require(stableIn > 0, "PropertyDex: zero in");
        Pool storage pool = pools[propertyId];
        require(pool.exists, "PropertyDex: no pool");

        bool ok = stableToken.transferFrom(msg.sender, address(this), stableIn);
        require(ok, "PropertyDex: stable transfer failed");

        uint256 sharesOut = _getAmountOut(stableIn, pool.stableReserve, pool.shareReserve, pool.feeBps);
        require(sharesOut >= minSharesOut, "PropertyDex: slippage");
        require(sharesOut <= pool.shareReserve, "PropertyDex: insufficient liquidity");

        pool.stableReserve += stableIn;
        pool.shareReserve -= sharesOut;

        propertyToken.safeTransferFrom(address(this), msg.sender, propertyId, sharesOut, "");
        emit SwapStableForShares(propertyId, msg.sender, stableIn, sharesOut);
    }

    function swapSharesForStable(uint256 propertyId, uint256 shareIn, uint256 minStableOut) external nonReentrant {
        require(shareIn > 0, "PropertyDex: zero in");
        Pool storage pool = pools[propertyId];
        require(pool.exists, "PropertyDex: no pool");

        propertyToken.safeTransferFrom(msg.sender, address(this), propertyId, shareIn, "");

        uint256 stableOut = _getAmountOut(shareIn, pool.shareReserve, pool.stableReserve, pool.feeBps);
        require(stableOut >= minStableOut, "PropertyDex: slippage");
        require(stableOut <= pool.stableReserve, "PropertyDex: insufficient liquidity");

        pool.shareReserve += shareIn;
        pool.stableReserve -= stableOut;

        bool ok = stableToken.transfer(msg.sender, stableOut);
        require(ok, "PropertyDex: stable transfer failed");

        emit SwapSharesForStable(propertyId, msg.sender, shareIn, stableOut);
    }
}

