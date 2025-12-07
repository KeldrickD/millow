# BrickStack - Fractional Real Estate Marketplace

A blockchain marketplace for fractional real estate ownership. Tokenize properties into ERC-1155 fractional shares with automated rental yield distribution.

## 🏗️ Architecture

### Smart Contracts

- **`Property.sol`** - ERC-1155 token for fractional property shares
  - One token ID per property
  - Configurable max shares, share price, yield basis points
  - Whitelist for compliance
  - Only escrow contract can mint shares

- **`VoteEscrow.sol`** - Voting + escrow mechanism
  - Propose property acquisitions with target price and deadline
  - Investors deposit ETH to vote/lock funds
  - Admin can finalize successful deals (mint shares, transfer ETH to seller)
  - Failed deals enable refunds
  - Registry for all properties

- **`Governance.sol`** - ERC-20 governance token (1M supply)
  - Required minimum balance to vote on properties
  - Simple token-gated voting

- **`MockUSDC.sol`** - Mock stablecoin for testing yield distribution (6 decimals)

- **`PropertyYieldVault.sol`** - Rental yield distribution
  - Admin deposits ERC-20 tokens (rent)
  - Investors claim pro-rata share based on ERC-1155 holdings
  - Uses "dividends per share" pattern

### Frontend

- **Next.js 14** (App Router) with TypeScript
- **Wagmi + Viem** for Web3 interactions
- **Tailwind CSS** for styling
- **React Hot Toast** for notifications
- **IPFS** (Pinata/Web3.Storage) for image and metadata storage

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- MetaMask or Coinbase Wallet
- Base Sepolia testnet ETH (for testing)

### Installation

1. **Clone and install dependencies:**

```bash
npm install
cd frontend && npm install
```

2. **Configure environment variables:**

Create `.env` in the root directory:

```env
# Hardhat / Contract Deployment
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
PRIVATE_KEY=0xYourPrivateKeyHere
SELLER_ADDRESS=0xOptionalSellerAddress

# Frontend (optional, for IPFS)
NEXT_PUBLIC_PINATA_GATEWAY=https://your-subdomain.mypinata.cloud
PINATA_JWT=your_pinata_jwt_token
NEXT_PUBLIC_GOVERNANCE_ADDRESS=0xYourGovernanceTokenAddress
```

3. **Compile contracts:**

```bash
npx hardhat compile
```

4. **Whitelist & governance setup (owner wallet):**

- Connect with the VoteEscrow owner wallet
- Visit `/admin/access`
- Whitelist investor wallets so they can receive ERC-1155 shares
- Distribute governance tokens (BRICK) if `minGovBalance` is non-zero

## 🧪 Testing

### Run Hardhat Tests

```bash
npx hardhat test
```

The test suite (`test/coreFlow.js`) covers:
- Property creation and registration
- Proposal creation
- Multiple investor deposits
- Successful deal finalization (share minting)
- Failed deal refunds
- Yield distribution and claiming

### Run Frontend Linting

```bash
cd frontend
npm run lint
```

## 📦 Deployment

### Deploy to Base Sepolia (Testnet)

1. **Get Base Sepolia ETH:**
   - Use the [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet)

2. **Deploy contracts:**

```bash
npx hardhat run scripts/deploy.js --network baseSepolia
```

The deploy script will:
- Deploy all contracts (Governance, Property, VoteEscrow, MockUSDC, PropertyYieldVault)
- Configure escrow and whitelist
- Create an initial test property
- Print all deployed contract addresses

3. **Update frontend contract addresses:**

Copy the deployed addresses to `frontend/lib/contracts.ts`:

```typescript
export const PROPERTY_ADDRESS = "0x...";
export const VOTE_ESCROW_ADDRESS = "0x...";
// etc.
```

4. **Start the frontend:**

```bash
cd frontend
npm run dev
```

Visit `http://localhost:3000`

### Deploy to Base Mainnet

1. Update `hardhat.config.js` with mainnet RPC URL
2. Ensure you have sufficient ETH for gas
3. Run deploy script with mainnet network:

```bash
npx hardhat run scripts/deploy.js --network baseMainnet
```

## ✅ Live Loop Testing Checklist

Test the full flow end-to-end on Base Sepolia:

### 1. Create Listing

- [ ] Navigate to `/admin/listing/new`
- [ ] Upload property images
- [ ] Fill in property details:
  - Property label (address)
  - Target raise (ETH)
  - Share price (ETH)
  - Max shares
  - Yield BPS
  - Funding window (days)
- [ ] Submit and wait for transactions
- [ ] **Verify:**
  - Marketplace home page shows the new property card
  - Card displays correct image, label, target, share price
  - Admin → Properties page shows the same ID and numbers

### 2. Investor A Deposits

- [ ] Connect Wallet A (with governance tokens)
- [ ] Navigate to property detail page
- [ ] Click "Deposit & Vote YES" button
- [ ] Confirm transaction
- [ ] **Verify:**
  - Deal status bar updates with new raised amount
  - Progress percentage increases
  - ActivityFeed logs a `VoteLocked` event
  - InvestorPosition shows locked ETH and allocated shares
  - OwnershipPie shows non-zero "You" slice

### 3. Investor B Deposits (Second Wallet)

- [ ] Switch to Wallet B (different wallet)
- [ ] Connect and deposit on the same property
- [ ] **Verify:**
  - ActivityFeed appends another `VoteLocked` event
  - OwnershipPie updates to show both investors
  - "You" vs "Others" percentages are correct

### 4. Finalize Deal (Trigger Buy)

- [ ] Switch to admin wallet (owner)
- [ ] Navigate to property detail page
- [ ] Click "Trigger Buy" button
- [ ] Confirm transaction
- [ ] **Verify:**
  - Deal status flips to ✅ "Successful"
  - ActivityFeed shows "ProposalFinalized" event
  - ERC-1155 balances are minted (check InvestorPosition)
  - Shares match expected math: `lockedWei / sharePriceWei`
  - Property is no longer in active listings

### 5. Deposit + Claim Yield

- [ ] Navigate to `/admin/yield` or `/admin/simulate`
- [ ] Enter property label/ID
- [ ] Enter yield amount (USDC)
- [ ] Approve USDC for YieldVault (if needed)
- [ ] Deposit yield
- [ ] **Verify:**
  - ActivityFeed shows "YieldDeposited" event
  - InvestorPosition shows pending yield amount
  - Click "Claim Yield" button
  - Receive USDC in wallet
  - ActivityFeed shows "YieldClaimed" event
  - OwnershipPie doesn't change (as expected)

### 6. Failed Deal Refund

- [ ] Create a new property proposal
- [ ] Have an investor deposit
- [ ] As admin, click "Cancel Property"
- [ ] **Verify:**
  - Deal status shows ❌ "Failed"
  - Investor can click "Refund" button
  - ETH is returned to investor
  - ActivityFeed shows "Refunded" event

## 🔧 Development

### Local Development with Hardhat Network

1. **Start local Hardhat node:**

```bash
npx hardhat node
```

2. **Deploy to local network:**

```bash
npx hardhat run scripts/deploy.js --network localhost
```

3. **Update frontend to point to localhost:**

In `frontend/lib/wagmiConfig.ts`, add localhost chain:

```typescript
import { hardhat } from 'wagmi/chains';

export const chains = [hardhat];
```

4. **Start frontend:**

```bash
cd frontend
npm run dev
```

### Contract View Functions

The contracts expose helpful view functions for frontend/indexer integration:

**VoteEscrow:**
- `getProposalStruct(uint256 propertyId)` - Returns typed `Proposal` struct
- `getUserPosition(uint256 propertyId, address user)` - Returns `UserPosition` with locked ETH and allocated shares
- `getAllPropertyIds()` - Returns all registered property IDs
- `getActivePropertyIds()` - Returns only active (non-finalized) property IDs

**PropertyYieldVault:**
- `pendingYield(uint256 propertyId, address user)` - Returns claimable yield amount

### Event Indexing

Key events for indexer/backend integration:

**VoteEscrow:**
- `PropertyProposed` - New property listing
- `VoteLocked` - Investor deposit
- `BuyTriggered` - Deal finalized successfully
- `ProposalFinalized` - Deal finalized (success or failure)
- `Refunded` - Investor refund

**PropertyYieldVault:**
- `YieldDeposited` - Admin deposits rent
- `YieldClaimed` - Investor claims yield

**Property:**
- `PropertySeriesCreated` - New ERC-1155 series
- `SharesMinted` - Shares minted to investor

## 📚 Project Structure

```
.
├── contracts/          # Solidity smart contracts
│   ├── Property.sol
│   ├── VoteEscrow.sol
│   ├── Governance.sol
│   ├── MockUSDC.sol
│   └── PropertyYieldVault.sol
├── scripts/            # Deployment scripts
│   └── deploy.js
├── test/               # Hardhat tests
│   └── coreFlow.js
├── frontend/           # Next.js frontend
│   ├── app/            # Next.js App Router pages
│   ├── components/     # React components
│   ├── lib/            # Utilities, contracts, config
│   └── public/         # Static assets
├── hardhat.config.js   # Hardhat configuration
└── README.md
```

## 🔒 Security Notes

- Contracts use OpenZeppelin's `Ownable` and `ReentrancyGuard`
- Whitelist enforced on ERC-1155 transfers
- Governance token required for voting
- All user funds are escrowed until deal finalization
- Failed deals enable refunds

**⚠️ This is an MVP for testing. For production:**
- Conduct comprehensive security audit
- Add access control for yield deposits
- Implement proper KYC/AML compliance
- Add timelock for admin functions
- Consider multi-sig for admin operations

## 📝 License

MIT

## 🤝 Contributing

This is an MVP project. For production use, please:
1. Conduct security audits
2. Add comprehensive test coverage
3. Implement proper compliance measures
4. Set up monitoring and indexing infrastructure
