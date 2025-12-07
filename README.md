# BrickStack – Fractional Real Estate + Deals OS

BrickStack is a full-stack platform for tokenizing real estate deals, managing escrow, distributing yield, and running governance onchain. It ships Solidity contracts, Hardhat scripts, and a Next.js 14 app for admins, sellers, and investors.

## 🏗️ Architecture & Capabilities

### Smart Contracts
- **Property.sol** – ERC-1155 fractional series per property (max shares, share price, yield bps, metadata, whitelist).
- **VoteEscrow.sol** – Deal coordination (propose, deposit/vote with ETH, finalize/cancel, refunds) and registry of property IDs.
- **PropertyYieldVault.sol** – Rent/yield deposits and pro-rata claims (dividends-per-share).
- **Governance.sol** – BRICK ERC-20 with airdrop helpers; balances can gate actions.
- **MockUSDC.sol** – 6-decimal test token for yield.
- **SmartEscrow.sol** – Milestoned escrow with oracle-signed verification and staged releases.
- **RentToOwn.sol** – RTO agreements with upfront, installments, and ownership transfer.
- **PropertyDex.sol** – Simple secondary marketplace for property shares.
- **PropertyGovernor.sol** – (placeholder) property-specific governor wiring.

### Frontend (Next.js 14 / App Router)
- Wallet onboarding via RainbowKit (wagmi + viem).
- Admin suite: access control, governance airdrops, listings, property registry, escrow simulator, yield console, rent-to-own, escrow ops, proposal simulator, and waitlist intake API.
- Investor UX: explore listings, property detail with deposit/vote, activity feed, ownership pie, deal timeline, claim yield, and portfolio view.
- IPFS helpers for media/metadata uploads; typed hooks for onchain reads/writes.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm
- Wallet (MetaMask/Coinbase) on Base Sepolia for testing

### Install
```bash
npm install
cd frontend && npm install
```

### Environment
Create a root `.env` (Hardhat + defaults):
```env
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/...
PRIVATE_KEY=0xYourPrivateKey
SELLER_ADDRESS=0xOptionalSeller
```

Frontend `.env` keys (env or `.env.local` inside `frontend/`):
```env
NEXT_PUBLIC_PROPERTY_ADDRESS=0x...
NEXT_PUBLIC_VOTE_ESCROW_ADDRESS=0x...
NEXT_PUBLIC_YIELD_VAULT_ADDRESS=0x...
NEXT_PUBLIC_USDC_ADDRESS=0x...
NEXT_PUBLIC_GOVERNANCE_ADDRESS=0x...
NEXT_PUBLIC_SMART_ESCROW_ADDRESS=0x...
NEXT_PUBLIC_RENT_TO_OWN_ADDRESS=0x...
NEXT_PUBLIC_PROPERTY_GOVERNOR_ADDRESS=0x...
NEXT_PUBLIC_PROPERTY_DEX_ADDRESS=0x...
NEXT_PUBLIC_PINATA_GATEWAY=https://your-subdomain.mypinata.cloud
PINATA_JWT=pinata_jwt_for_uploads
```
The frontend ships Base Sepolia fallbacks in `frontend/lib/contracts.ts`; set envs in production.

### Build & Run
```bash
# Compile contracts
npx hardhat compile

# Run Hardhat tests
npx hardhat test

# Frontend
cd frontend
npm run dev   # or npm run build && npm start
```

## 🧪 Test Coverage (Hardhat)
- Core deal flow (`test/coreFlow.js`)
- Vote escrow, refunds, max shares, gates (`test/VoteEscrow.js`, `test/governanceGate.js`, `test/maxShares.js`)
- Yield vault deposits/claims (`test/yieldVault.js`)
- Governance airdrops (`test/governanceAirdrop.js`)
- New modules: Property DEX, Governor, RentToOwn, SmartEscrow (`test/PropertyDex.js`, `test/PropertyGovernor.js`, `test/RentToOwn.js`, `test/SmartEscrow.js`)

## 📦 Deployment
- Base Sepolia: `npx hardhat run scripts/deploy.js --network baseSepolia`
- Additional scripts for modular deploys:
  - `scripts/deployPropertyDex.js`
  - `scripts/deployPropertyGovernor.js`
  - `scripts/deployRentToOwn.js`
  - `scripts/deploySmartEscrow.js`
  - `scripts/seedDemoProperty.js`
- After deploying, copy addresses into `frontend/lib/contracts.ts` or set the corresponding `NEXT_PUBLIC_*` envs, then redeploy the Next.js app.

## ✅ Manual QA Flow (Base Sepolia)
1) **Create listing**: `/admin/listing/new` (images + deal terms). Verify cards on home + `/admin/properties`.  
2) **Gate + airdrop**: `/admin/access` to whitelist wallets; `/admin/airdrop` to send BRICK.  
3) **Investor deposits/votes**: property detail → Deposit & Vote. Confirm progress bar, activity feed entries, and share allocation.  
4) **Finalize or cancel**: Admin triggers buy or cancels; check minted ERC-1155 balances or refund path.  
5) **Yield cycle**: `/admin/sim` or `/admin/yield` to deposit rent (MockUSDC); investors claim.  
6) **Escrow/RTO**: `/admin/escrow` to create/advance escrow milestones; `/admin/rto` for rent-to-own agreements.  
7) **Secondary**: DEX panel for listings/swaps of property shares.  

## 📚 Project Structure
```
contracts/            # Solidity (Property, VoteEscrow, YieldVault, Gov, MockUSDC, DEX, RTO, SmartEscrow, Governor)
scripts/              # Deploy + seed scripts
test/                 # Hardhat tests for all modules
frontend/             # Next.js 14 app (app router, components, hooks, lib)
  app/                # Pages: admin tools, explore, property, portfolio, api/waitlist
  components/         # UI + onchain widgets (escrow actions, property panels, charts)
  hooks/              # Typed wagmi hooks for reads/writes
  lib/                # ABIs, addresses, IPFS helpers, indexer utilities
```

## 🔒 Security Notes
- OZ `Ownable` + `ReentrancyGuard`; whitelist enforced on ERC-1155 transfers.
- Funds stay in escrow until finalization; refunds for failed deals.
- Yield claims are pull-based; governance token can gate critical paths.
- Production hardening still required: audits, stricter access control on yield/escrow, KYC/AML, timelocks/multisig, monitoring/indexing.

## 📝 License
MIT
