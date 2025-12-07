// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./Property.sol";

/**
 * @title RentToOwn
 * @dev Simple rent-to-own agreements powered by stablecoin payments + ERC1155 shares.
 *
 * - Owner creates an agreement: tenant, landlord, propertyId, paymentAmount, equitySharesPerPayment, maxPayments.
 * - Tenant calls pay(agreementId); contract pulls stablecoin from tenant and sends it to landlord.
 * - For each payment, equitySharesPerPayment property shares are minted to tenant via Property.mintShares.
 * - When maxPayments is reached, agreement is completed.
 */
contract RentToOwn is Ownable, ReentrancyGuard {
    IERC20 public immutable paymentToken;
    Property public immutable property;

    struct Agreement {
        bool exists;
        address tenant;
        address landlord;
        uint256 propertyId;
        uint256 paymentAmount;
        uint256 equitySharesPerPayment;
        uint256 maxPayments;
        uint256 paymentsMade;
        bool active;
        bool terminated;
    }

    uint256 public nextAgreementId = 1;
    mapping(uint256 => Agreement) public agreements;

    event AgreementCreated(
        uint256 indexed agreementId,
        address indexed tenant,
        address indexed landlord,
        uint256 propertyId,
        uint256 paymentAmount,
        uint256 equitySharesPerPayment,
        uint256 maxPayments
    );

    event PaymentMade(
        uint256 indexed agreementId,
        address indexed tenant,
        uint256 paymentAmount,
        uint256 newPaymentsMade,
        uint256 mintedShares
    );

    event AgreementCompleted(uint256 indexed agreementId);
    event AgreementTerminated(uint256 indexed agreementId, address indexed by);

    error AgreementNotFound();
    error NotTenant();
    error NotActive();
    error AlreadyTerminated();
    error MaxPaymentsReached();

    constructor(address paymentToken_, address property_, address initialOwner) Ownable(initialOwner) {
        require(paymentToken_ != address(0), "RentToOwn: paymentToken zero");
        require(property_ != address(0), "RentToOwn: property zero");
        paymentToken = IERC20(paymentToken_);
        property = Property(property_);
    }

    modifier onlyExisting(uint256 agreementId) {
        if (!agreements[agreementId].exists) revert AgreementNotFound();
        _;
    }

    function createAgreement(
        address tenant,
        address landlord,
        uint256 propertyId,
        uint256 paymentAmount,
        uint256 equitySharesPerPayment,
        uint256 maxPayments
    ) external onlyOwner returns (uint256 agreementId) {
        require(tenant != address(0) && landlord != address(0), "RentToOwn: zero addr");
        require(paymentAmount > 0, "RentToOwn: payment zero");
        require(equitySharesPerPayment > 0, "RentToOwn: shares zero");
        require(maxPayments > 0, "RentToOwn: maxPayments zero");

        Property.PropertyInfo memory info = property.propertyMetadata(propertyId);
        require(info.exists, "RentToOwn: unknown property");

        agreementId = nextAgreementId++;
        Agreement storage a = agreements[agreementId];
        a.exists = true;
        a.tenant = tenant;
        a.landlord = landlord;
        a.propertyId = propertyId;
        a.paymentAmount = paymentAmount;
        a.equitySharesPerPayment = equitySharesPerPayment;
        a.maxPayments = maxPayments;
        a.paymentsMade = 0;
        a.active = true;
        a.terminated = false;

        emit AgreementCreated(
            agreementId,
            tenant,
            landlord,
            propertyId,
            paymentAmount,
            equitySharesPerPayment,
            maxPayments
        );
    }

    function getAgreement(uint256 agreementId) external view onlyExisting(agreementId) returns (Agreement memory) {
        return agreements[agreementId];
    }

    function pay(uint256 agreementId) external nonReentrant onlyExisting(agreementId) {
        Agreement storage a = agreements[agreementId];
        if (!a.active) revert NotActive();
        if (a.terminated) revert AlreadyTerminated();
        if (msg.sender != a.tenant) revert NotTenant();
        if (a.paymentsMade >= a.maxPayments) revert MaxPaymentsReached();

        bool ok = paymentToken.transferFrom(msg.sender, address(this), a.paymentAmount);
        require(ok, "RentToOwn: transferFrom failed");

        ok = paymentToken.transfer(a.landlord, a.paymentAmount);
        require(ok, "RentToOwn: forward failed");

        property.mintShares(a.propertyId, a.tenant, a.equitySharesPerPayment);

        a.paymentsMade += 1;

        emit PaymentMade(agreementId, a.tenant, a.paymentAmount, a.paymentsMade, a.equitySharesPerPayment);

        if (a.paymentsMade == a.maxPayments) {
            a.active = false;
            emit AgreementCompleted(agreementId);
        }
    }

    function terminate(uint256 agreementId) external onlyOwner onlyExisting(agreementId) {
        Agreement storage a = agreements[agreementId];
        if (!a.active) revert NotActive();
        if (a.terminated) revert AlreadyTerminated();

        a.active = false;
        a.terminated = true;

        emit AgreementTerminated(agreementId, msg.sender);
    }
}

