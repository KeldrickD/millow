# Live Loop Testing Guide

This document provides a step-by-step guide for testing the full BrickStack flow on Base Sepolia testnet.

## Prerequisites

- Base Sepolia testnet ETH (get from [faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet))
- Governance tokens (mint via admin or deploy script)
- Two test wallets (for multi-investor testing)
- Contracts deployed to Base Sepolia
- Frontend running and connected to Base Sepolia
- Whitelist the test wallets and (if required) distribute governance tokens via `/admin/access`

## Test Flow

### Step 1: Create Property Listing

**Action:**
1. Navigate to `/admin/listing/new`
2. Upload 2-3 property images
3. Fill in form:
   - **Property Label:** `123 Main St, San Francisco, CA`
   - **Target Raise:** `10` ETH
   - **Share Price:** `0.1` ETH
   - **Max Shares:** `100`
   - **Yield BPS:** `500` (5%)
   - **Funding Window:** `14` days
   - **Seller Wallet:** (leave empty to use connected wallet)
4. Click "Create Listing"
5. Wait for both transactions to confirm:
   - `createProperty` (ERC-1155 series creation)
   - `proposeProperty` (proposal creation)

**Expected Results:**
- ✅ Success toasts appear
- ✅ Redirect to `/admin/properties` shows new property
- ✅ Marketplace home page (`/`) shows property card with:
  - Correct image
  - Label: "123 Main St, San Francisco, CA"
  - Target: "10 ETH"
  - Share price: "0.1 ETH / share"
  - Status: "Funding"
  - Progress: "0%"

**Verify on-chain:**
- Check BaseScan for `PropertySeriesCreated` event
- Check BaseScan for `PropertyProposed` event
- Call `VoteEscrow.getProposal(propertyId)` - should return proposal data

---

### Step 2: Investor A Deposits

**Action:**
1. Connect **Wallet A** (must have governance tokens)
2. Navigate to property detail page: `/property/123 Main St, San Francisco, CA`
3. Review property details
4. Click "Deposit & Vote YES" button
5. Confirm transaction in wallet
6. Wait for confirmation

**Expected Results:**
- ✅ Transaction succeeds
- ✅ Toast: "Deposit locked & vote recorded ✅"
- ✅ Deal status bar updates:
  - Raised: "0.1 / 10 ETH"
  - Progress: "1.0%"
- ✅ ActivityFeed shows new entry:
  - Event: `VoteLocked`
  - Investor: Wallet A address
  - Amount: 0.1 ETH
- ✅ InvestorPosition section shows:
  - Locked ETH: 0.1 ETH
  - Allocated Shares: 1 share
  - ERC-1155 Balance: 0 shares (not minted yet)
- ✅ OwnershipPie shows:
  - "You": 100% (only investor so far)
  - Visual slice for your position

**Verify on-chain:**
- Check BaseScan for `VoteLocked` event
- Call `VoteEscrow.lockedAmount(propertyId, walletA)` - should return 0.1 ETH
- Call `VoteEscrow.getUserPosition(propertyId, walletA)` - should return locked and shares

---

### Step 3: Investor B Deposits (Second Wallet)

**Action:**
1. **Switch to Wallet B** (different wallet, also needs governance tokens)
2. Connect Wallet B
3. Navigate to same property detail page
4. Click "Deposit & Vote YES" button
5. Deposit **0.3 ETH** (3 shares worth)
6. Confirm transaction

**Expected Results:**
- ✅ Transaction succeeds
- ✅ Deal status bar updates:
  - Raised: "0.4 / 10 ETH"
  - Progress: "4.0%"
- ✅ ActivityFeed shows **two** entries:
  - First: Wallet A, 0.1 ETH
  - Second: Wallet B, 0.3 ETH
- ✅ **From Wallet B's perspective:**
  - InvestorPosition shows: 0.3 ETH locked, 3 shares allocated
  - OwnershipPie shows:
    - "You": 75% (3 out of 4 total shares)
    - "Others": 25% (1 share from Wallet A)
- ✅ **From Wallet A's perspective:**
  - OwnershipPie shows:
    - "You": 25% (1 out of 4 total shares)
    - "Others": 75% (3 shares from Wallet B)

**Verify on-chain:**
- Check BaseScan for second `VoteLocked` event
- Call `VoteEscrow.totalLocked(propertyId)` - should return 0.4 ETH
- Call `VoteEscrow.getUserPosition(propertyId, walletB)` - should return 0.3 ETH, 3 shares

---

### Step 4: Finalize Deal (Trigger Buy)

**Action:**
1. **Switch to admin wallet** (owner of VoteEscrow contract)
2. Navigate to property detail page
3. Scroll to "Escrow Actions" section
4. Click "Trigger Buy" button
5. Confirm transaction
6. Wait for confirmation

**Expected Results:**
- ✅ Transaction succeeds
- ✅ Toast: "Deal finalized ✅"
- ✅ Deal status changes:
  - Status: "✅ Successful"
  - Progress bar: 100% (if target was met)
- ✅ ActivityFeed shows:
  - `BuyTriggered` event
  - `ProposalFinalized` event (successful: true)
- ✅ **For Wallet A:**
  - InvestorPosition shows:
    - Locked ETH: 0 ETH (cleared)
    - ERC-1155 Balance: **1 share** (minted!)
- ✅ **For Wallet B:**
  - InvestorPosition shows:
    - Locked ETH: 0 ETH (cleared)
    - ERC-1155 Balance: **3 shares** (minted!)
- ✅ Property no longer appears in active listings (`/`)
- ✅ Property still visible in `/admin/properties` with "Successful" status

**Verify on-chain:**
- Check BaseScan for `BuyTriggered` and `ProposalFinalized` events
- Call `Property.balanceOf(walletA, propertyId)` - should return 1
- Call `Property.balanceOf(walletB, propertyId)` - should return 3
- Call `VoteEscrow.getProposal(propertyId)` - `finalized` and `successful` should be `true`
- Check seller wallet received ETH (should equal total locked amount)

---

### Step 5: Deposit + Claim Yield

**Action:**
1. **As admin**, navigate to `/admin/yield`
2. Enter property label: `123 Main St, San Francisco, CA`
3. Enter yield amount: `100` USDC
4. Click "Deposit Yield"
5. Wait for transaction confirmation
6. **As Investor A**, navigate to property detail page
7. Check InvestorPosition section
8. Click "Claim Yield" button
9. Confirm transaction

**Expected Results:**
- ✅ Admin transaction succeeds
- ✅ Toast: "Yield deposited ✅"
- ✅ ActivityFeed shows `YieldDeposited` event
- ✅ **For Investor A (1 share out of 4 total):**
  - InvestorPosition shows:
    - Pending Yield: **25 USDC** (1/4 of 100 USDC)
  - Click "Claim Yield"
  - Receive 25 USDC in wallet
  - Toast: "Yield claimed ✅"
  - ActivityFeed shows `YieldClaimed` event
- ✅ **For Investor B (3 shares out of 4 total):**
  - InvestorPosition shows:
    - Pending Yield: **75 USDC** (3/4 of 100 USDC)
  - Can claim 75 USDC
- ✅ OwnershipPie doesn't change (yield doesn't affect ownership)

**Verify on-chain:**
- Check BaseScan for `YieldDeposited` event
- Check BaseScan for `YieldClaimed` events
- Call `PropertyYieldVault.pendingYield(propertyId, walletA)` - should return 0 after claim
- Verify USDC balance in wallets increased

---

### Step 6: Failed Deal Refund (Optional)

**Action:**
1. Create a new property proposal (small target, short deadline)
2. Have an investor deposit
3. **As admin**, click "Cancel Property"
4. **As investor**, click "Refund" button
5. Confirm transaction

**Expected Results:**
- ✅ Deal status shows: "❌ Failed"
- ✅ Investor can see "Refund Available" in InvestorPosition
- ✅ Click "Refund" returns locked ETH
- ✅ ActivityFeed shows `Refunded` event
- ✅ InvestorPosition shows 0 locked ETH

**Verify on-chain:**
- Check BaseScan for `ProposalFinalized` (successful: false)
- Check BaseScan for `Refunded` event
- Verify ETH returned to investor wallet

---

## Troubleshooting

### Transaction Fails

- **"Insufficient governance balance"** - Mint governance tokens to wallet
- **"Not whitelisted"** - Admin must whitelist wallet in Property contract
- **"Target not met"** - Ensure total locked >= target before triggering buy
- **"Deadline passed"** - Create new proposal with future deadline

### UI Not Updating

- Check browser console for errors
- Verify network is Base Sepolia
- Refresh page to force data refetch
- Check BaseScan to confirm on-chain state

### Images Not Loading

- Verify IPFS gateway is accessible
- Check `NEXT_PUBLIC_PINATA_GATEWAY` env variable
- Images may take a few seconds to propagate on IPFS

---

## Success Criteria

✅ All transactions execute successfully  
✅ UI reflects on-chain state accurately  
✅ Events appear in ActivityFeed  
✅ Ownership calculations are correct  
✅ Yield distribution is pro-rata  
✅ Refunds work for failed deals  
✅ No console errors or warnings  

If all steps pass, the core flow is working correctly! 🎉

