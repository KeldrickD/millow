# BrickStack MVP - Fractional Real Estate (ERC-1155)

This upgrades the original Millow project into a minimal, deployable MVP for fractional real estate ownership:

- Property shares as ERC-1155 (`Property.sol`)
- Escrow + vote via deposits (`VoteEscrow.sol`)
- Simple governance token (`Governance.sol`)
- Hardhat tests and deploy script for Sepolia

Frontend (Next.js + wagmi) is scaffolded separately (recommended in a `frontend/` folder).

## Stack

- Solidity ^0.8.20
- OpenZeppelin Contracts ^5
- Hardhat
- Ethers v6 (via Hardhat)

## Setup

1) Install deps

```bash
npm install
```

2) Configure env for Sepolia (optional)

Create `.env`:

```
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/yourKey
PRIVATE_KEY=0xyourprivatekey
```

## Contracts

- `contracts/Property.sol` - ERC-1155 fractional shares; whitelist; per-property config
- `contracts/VoteEscrow.sol` - deposit ETH to vote/lock; finalize purchase; mint shares or refund
- `contracts/Governance.sol` - ERC-20 governance token with fixed 1M supply

## Run tests

```bash
npx hardhat test
```

## Deploy to Sepolia

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

The deploy script will:

- Deploy `Governance`, `Property`, `VoteEscrow`
- Create `propertyId=1` with 1,000 shares at 0.1 ETH
- Propose acquisition with a target (default 100 ETH) and 14d deadline
- Whitelist deployer and seller for transfers

## Next.js Frontend (recommended separate folder)

Create a new Next.js app (in `frontend/`):

```bash
npm create next-app@latest frontend --ts
cd frontend
npm install wagmi viem @rainbow-me/rainbowkit
```

Wire wagmi to Sepolia/Base, add ABIs from `artifacts/` after compile, and implement:

- Dashboard: show property, target, total locked, deadline
- Deposit form (calls `voteAndLock(propertyId, amount)` with `value`)
- Admin buttons to `triggerBuy` or `cancelProperty`
- Investor view: locked amount and ERC-1155 balance

See components outline in the issue description for reference.