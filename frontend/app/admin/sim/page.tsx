"use client";

import { useState } from "react";
import { useAccount, useChainId, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, parseUnits } from "viem";
import {
  MOCK_USDC_ADDRESS,
  YIELD_VAULT_ADDRESS,
  VOTE_ESCROW_ADDRESS,
  mockUsdcAbi,
  yieldVaultAbi,
  voteEscrowAbi
} from "../../../lib/contracts";
import { idFromPropertyKey } from "../../../lib/slug";
import toast from "react-hot-toast";

export default function AdminSimPage() {
  const { address } = useAccount();
  const chainId = useChainId();
  const wrongChain = chainId !== undefined && chainId !== 84532 && chainId !== 8453;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      <header>
        <h1 className="text-xl font-bold text-mirage">Admin Simulation Tools</h1>
        <p className="mt-1 text-xs text-mirage/60">
          Owner-only shortcuts to faucet mock USDC, seed yield, and simulate funding for demos and QA.
        </p>
        <p className="mt-1 text-[11px] text-mirage/50">
          Connected as <span className="font-mono">{address ?? "Not connected"}</span>
          {wrongChain && <span className="ml-2 text-red-500">Wrong network. Switch to Base or Base Sepolia.</span>}
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <MockUsdcFaucet disabled={wrongChain} />
        <YieldSeeder disabled={wrongChain} />
        <QuickFundingSimulator disabled={wrongChain} />
      </div>
    </main>
  );
}

function MockUsdcFaucet({ disabled }: { disabled: boolean }) {
  const { address } = useAccount();
  const [amount, setAmount] = useState("1000");
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });
  const working = isPending || isLoading;

  function onMint(e: React.FormEvent) {
    e.preventDefault();
    if (!address || !amount) return;
    const value = parseUnits(amount, 6); // MockUSDC is 6 decimals
    writeContract(
      { address: MOCK_USDC_ADDRESS, abi: mockUsdcAbi as any, functionName: "mint", args: [address, value] } as any,
      {
        onSuccess: (hash) => toast.loading("Minting mock USDC…", { id: hash }),
        onError: () => toast.error("Mint failed"),
      }
    );
  }

  return (
    <section className="rounded-3xl border border-white bg-white p-4 space-y-3">
      <h2 className="text-sm font-semibold text-mirage">1. Mock USDC faucet</h2>
      <p className="text-[11px] text-mirage/60">Mint test USDC to your wallet for rent/yield simulation.</p>
      <form onSubmit={onMint} className="space-y-2">
        <div className="space-y-1">
          <label className="text-[11px] text-mirage/70">Amount (USDC tokens)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-2xl border border-mirage/10 bg-wildSand/60 px-3 py-1 text-xs text-mirage focus:border-deepSea focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={!address || working || disabled}
          className={`rounded-full px-4 py-2 text-xs font-semibold text-white transition ${
            !address || working || disabled
              ? "bg-mirage/20 text-mirage/50 cursor-not-allowed"
              : "bg-deepSea hover:bg-deepSea/90"
          }`}
        >
          {working ? "Minting…" : "Mint to my wallet"}
        </button>
      </form>
      {txHash && (
        <p className="text-[11px] text-mirage/60">
          Tx:{" "}
          <a
            href={`https://sepolia.basescan.org/tx/${txHash}`}
            target="_blank"
            rel="noreferrer"
            className="text-blaze underline"
          >
            View on BaseScan
          </a>{" "}
          {isSuccess && "• Confirmed"}
        </p>
      )}
    </section>
  );
}

function YieldSeeder({ disabled }: { disabled: boolean }) {
  const { address } = useAccount();
  const [labelOrId, setLabelOrId] = useState("");
  const [amount, setAmount] = useState("250");
  const decimals = 6; // MockUSDC decimals

  const { writeContract: writeUsdc, data: approveHash, isPending: approvePending } = useWriteContract();
  const { writeContract: writeVault, data: depositHash, isPending: depositPending } = useWriteContract();

  const { isLoading: approveLoading, isSuccess: approveSuccess } = useWaitForTransactionReceipt({ hash: approveHash });
  const { isLoading: depositLoading, isSuccess: depositSuccess } = useWaitForTransactionReceipt({ hash: depositHash });

  const workingApprove = approvePending || approveLoading;
  const workingDeposit = depositPending || depositLoading;

  function parsePropertyId(): bigint | null {
    if (!labelOrId.trim()) return null;
    const raw = labelOrId.trim();
    if (/^\d+$/.test(raw)) return BigInt(raw);
    return idFromPropertyKey(raw);
  }

  function onApprove(e: React.FormEvent) {
    e.preventDefault();
    if (!address) return;
    writeUsdc(
      {
        address: MOCK_USDC_ADDRESS,
        abi: mockUsdcAbi as any,
        functionName: "approve",
        args: [YIELD_VAULT_ADDRESS, BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff")]
      } as any,
      {
        onSuccess: (hash) => toast.loading("Approving USDC…", { id: hash }),
        onError: () => toast.error("Approve failed"),
      }
    );
  }

  function onDeposit(e: React.FormEvent) {
    e.preventDefault();
    const propertyId = parsePropertyId();
    if (propertyId === null || !amount) return;
    const value = parseUnits(amount, decimals);
    writeVault(
      {
        address: YIELD_VAULT_ADDRESS,
        abi: yieldVaultAbi as any,
        functionName: "depositYield",
        args: [propertyId, value]
      } as any,
      {
        onSuccess: (hash) => toast.loading("Depositing yield…", { id: hash }),
        onError: () => toast.error("Deposit failed"),
      }
    );
  }

  return (
    <section className="rounded-3xl border border-white bg-white p-4 space-y-3">
      <h2 className="text-sm font-semibold text-mirage">2. Seed rent / yield</h2>
      <p className="text-[11px] text-mirage/60">Deposit USDC to a property’s yield vault using a human label or ERC-1155 ID.</p>

      <form className="space-y-2" onSubmit={onDeposit}>
        <div className="space-y-1">
          <label className="text-[11px] text-mirage/70">Property label or ID</label>
          <input
            type="text"
            value={labelOrId}
            onChange={(e) => setLabelOrId(e.target.value)}
            placeholder="1770 Boulder Walk Ln SE, Atlanta, GA 30316"
            className="w-full rounded-2xl border border-mirage/10 bg-wildSand/60 px-3 py-1 text-xs text-mirage focus:border-deepSea focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] text-mirage/70">Yield deposit (USDC)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-2xl border border-mirage/10 bg-wildSand/60 px-3 py-1 text-xs text-mirage focus:border-deepSea focus:outline-none"
          />
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onApprove}
            disabled={!address || workingApprove || disabled}
            className={`rounded-full px-3 py-2 text-[11px] font-semibold text-white transition ${
              !address || workingApprove || disabled
                ? "bg-mirage/20 text-mirage/50 cursor-not-allowed"
                : "bg-deepSea hover:bg-deepSea/90"
            }`}
          >
            {workingApprove ? "Approving…" : "Approve USDC"}
          </button>

          <button
            type="submit"
            disabled={!address || workingDeposit || disabled}
            className={`rounded-full px-3 py-2 text-[11px] font-semibold text-white transition ${
              !address || workingDeposit || disabled
                ? "bg-mirage/20 text-mirage/50 cursor-not-allowed"
                : "bg-blazeOrange hover:bg-blazeOrange/90"
            }`}
          >
            {workingDeposit ? "Depositing…" : "Deposit yield"}
          </button>
        </div>
      </form>

      {(approveHash || depositHash) && (
        <div className="space-y-1 text-[11px] text-mirage/60 pt-1">
          {approveHash && (
            <p>
              Approve tx:{" "}
              <a className="text-blaze underline" href={`https://sepolia.basescan.org/tx/${approveHash}`} target="_blank" rel="noreferrer">
                View
              </a>{" "}
              {approveSuccess && "• Confirmed"}
            </p>
          )}
          {depositHash && (
            <p>
              Deposit tx:{" "}
              <a className="text-blaze underline" href={`https://sepolia.basescan.org/tx/${depositHash}`} target="_blank" rel="noreferrer">
                View
              </a>{" "}
              {depositSuccess && "• Confirmed"}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function QuickFundingSimulator({ disabled }: { disabled: boolean }) {
  const { address } = useAccount();
  const [labelOrId, setLabelOrId] = useState("");
  const [ethAmount, setEthAmount] = useState("0.25");

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });
  const working = isPending || isLoading;

  function parsePropertyId(): bigint | null {
    if (!labelOrId.trim()) return null;
    const raw = labelOrId.trim();
    if (/^\d+$/.test(raw)) return BigInt(raw);
    return idFromPropertyKey(raw);
  }

  function onLock(e: React.FormEvent) {
    e.preventDefault();
    const propertyId = parsePropertyId();
    if (!propertyId || !ethAmount) return;
    const value = parseEther(ethAmount);
    writeContract(
      {
        address: VOTE_ESCROW_ADDRESS,
        abi: voteEscrowAbi as any,
        functionName: "voteAndLock",
        args: [propertyId, value],
        value
      } as any,
      {
        onSuccess: (hash) => toast.loading("Locking ETH & voting…", { id: hash }),
        onError: () => toast.error("Deposit failed"),
      }
    );
  }

  return (
    <section className="rounded-3xl border border-white bg-white p-4 space-y-3">
      <h2 className="text-sm font-semibold text-mirage">3. Quick funding simulator</h2>
      <p className="text-[11px] text-mirage/60">
        Lock ETH into a deal with this wallet to quickly demonstrate funding progress and test the escrow flow.
      </p>

      <form className="space-y-2" onSubmit={onLock}>
        <div className="space-y-1">
          <label className="text-[11px] text-mirage/70">Property label or ID</label>
          <input
            type="text"
            value={labelOrId}
            onChange={(e) => setLabelOrId(e.target.value)}
            placeholder="1770 Boulder Walk Ln SE, Atlanta, GA 30316"
            className="w-full rounded-2xl border border-mirage/10 bg-wildSand/60 px-3 py-1 text-xs text-mirage focus:border-deepSea focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] text-mirage/70">Deposit amount (ETH)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={ethAmount}
            onChange={(e) => setEthAmount(e.target.value)}
            className="w-full rounded-2xl border border-mirage/10 bg-wildSand/60 px-3 py-1 text-xs text-mirage focus:border-deepSea focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={!address || working || disabled}
          className={`rounded-full px-4 py-2 text-xs font-semibold text-white transition ${
            !address || working || disabled
              ? "bg-mirage/20 text-mirage/50 cursor-not-allowed"
              : "bg-blazeOrange hover:bg-blazeOrange/90"
          }`}
        >
          {working ? "Locking…" : "Deposit & vote (simulate)"}
        </button>
      </form>

      {txHash && (
        <p className="text-[11px] text-mirage/60">
          Tx:{" "}
          <a className="text-blaze underline" href={`https://sepolia.basescan.org/tx/${txHash}`} target="_blank" rel="noreferrer">
            View on BaseScan
          </a>{" "}
          {isSuccess && "• Confirmed"}
        </p>
      )}
    </section>
  );
}

