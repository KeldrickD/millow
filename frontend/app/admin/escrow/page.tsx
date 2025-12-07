"use client";

import { useState } from "react";
import { useAccount, useChainId, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import { SMART_ESCROW_ADDRESS, smartEscrowAbi } from "../../../lib/contracts";

export default function EscrowAdminPage() {
  const { address } = useAccount();
  const chainId = useChainId();
  const wrongChain = chainId !== undefined && chainId !== 84532 && chainId !== 8453;

  const [buyer, setBuyer] = useState("");
  const [seller, setSeller] = useState("");
  const [oracle, setOracle] = useState("");
  const [propertyId, setPropertyId] = useState("0");
  const [totalEth, setTotalEth] = useState("1.0");
  const [days, setDays] = useState("7");
  const [milestonesCsv, setMilestonesCsv] = useState("Inspection,Title,Closing");

  const [depositEscrowId, setDepositEscrowId] = useState("");
  const [depositAmount, setDepositAmount] = useState("1.0");
  const [completeEscrowId, setCompleteEscrowId] = useState("");
  const [completeIndex, setCompleteIndex] = useState("");
  const [createdEscrowId, setCreatedEscrowId] = useState<bigint | null>(null);

  const { data: escrowData } = useReadContract({
    address: SMART_ESCROW_ADDRESS,
    abi: smartEscrowAbi,
    functionName: "getEscrow",
    args: createdEscrowId ? [createdEscrowId] : undefined
  } as any);

  const { writeContract, data: txHash } = useWriteContract();
  const { isLoading: txPending } = useWaitForTransactionReceipt({ hash: txHash });

  function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (wrongChain) return;
    const milestoneNames = milestonesCsv
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const totalWei = parseEther(totalEth || "0");
    const nowSec = Math.floor(Date.now() / 1000);
    const deadline = BigInt(nowSec + Number(days || "7") * 86400);

    writeContract(
      {
        address: SMART_ESCROW_ADDRESS,
        abi: smartEscrowAbi as any,
        functionName: "createEscrow",
        args: [
          buyer as `0x${string}`,
          seller as `0x${string}`,
          BigInt(propertyId || "0"),
          totalWei,
          deadline,
          oracle as `0x${string}`,
          milestoneNames
        ]
      },
      {
        onSuccess: (hash) => {
          console.log("createEscrow tx:", hash);
        }
      }
    );
  }

  function onDeposit(e: React.FormEvent) {
    e.preventDefault();
    if (!depositEscrowId || wrongChain) return;
    const value = parseEther(depositAmount || "0");
    writeContract({
      address: SMART_ESCROW_ADDRESS,
      abi: smartEscrowAbi as any,
      functionName: "deposit",
      args: [BigInt(depositEscrowId)],
      value
    });
  }

  function onForceComplete(e: React.FormEvent) {
    e.preventDefault();
    if (!completeEscrowId || !completeIndex || wrongChain) return;
    writeContract({
      address: SMART_ESCROW_ADDRESS,
      abi: smartEscrowAbi as any,
      functionName: "ownerCompleteMilestone",
      args: [BigInt(completeEscrowId), BigInt(completeIndex)]
    });
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <h1 className="text-xl font-semibold text-mirage">Smart Escrow Admin</h1>
      <p className="text-[11px] text-mirage/60">
        Connected: {address ?? "—"} {wrongChain && <span className="text-red-500">• Wrong network. Switch to Base or Base Sepolia.</span>}
      </p>

      <section className="bg-white rounded-3xl border border-white p-4 space-y-3">
        <h2 className="text-sm font-semibold">Create new escrow</h2>
        <form onSubmit={onCreate} className="space-y-3 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-mirage/60">Buyer address</span>
              <input className="w-full rounded-xl border px-2 py-1 text-xs" value={buyer} onChange={(e) => setBuyer(e.target.value)} />
            </label>
            <label className="space-y-1">
              <span className="text-mirage/60">Seller address</span>
              <input className="w-full rounded-xl border px-2 py-1 text-xs" value={seller} onChange={(e) => setSeller(e.target.value)} />
            </label>
            <label className="space-y-1">
              <span className="text-mirage/60">Oracle address</span>
              <input className="w-full rounded-xl border px-2 py-1 text-xs" value={oracle} onChange={(e) => setOracle(e.target.value)} />
            </label>
            <label className="space-y-1">
              <span className="text-mirage/60">Property ID (optional)</span>
              <input className="w-full rounded-xl border px-2 py-1 text-xs" value={propertyId} onChange={(e) => setPropertyId(e.target.value)} />
            </label>
            <label className="space-y-1">
              <span className="text-mirage/60">Total (ETH)</span>
              <input className="w-full rounded-xl border px-2 py-1 text-xs" value={totalEth} onChange={(e) => setTotalEth(e.target.value)} />
            </label>
            <label className="space-y-1">
              <span className="text-mirage/60">Deadline (days from now)</span>
              <input className="w-full rounded-xl border px-2 py-1 text-xs" value={days} onChange={(e) => setDays(e.target.value)} />
            </label>
          </div>
          <label className="space-y-1 block">
            <span className="text-mirage/60">Milestones (comma separated)</span>
            <input
              className="w-full rounded-xl border px-2 py-1 text-xs"
              value={milestonesCsv}
              onChange={(e) => setMilestonesCsv(e.target.value)}
              placeholder="Inspection,Title,Closing"
            />
          </label>
          <button
            type="submit"
            className="px-3 py-1.5 rounded-full text-xs font-semibold bg-blaze text-white disabled:opacity-60"
            disabled={txPending || wrongChain}
          >
            {txPending ? "Creating..." : "Create escrow"}
          </button>
        </form>
      </section>

      <section className="bg-white rounded-3xl border border-white p-4 space-y-3">
        <h2 className="text-sm font-semibold">Buyer deposit</h2>
        <form onSubmit={onDeposit} className="flex flex-col md:flex-row gap-3 text-xs items-end">
          <label className="space-y-1 flex-1">
            <span className="text-mirage/60">Escrow ID</span>
            <input className="w-full rounded-xl border px-2 py-1 text-xs" value={depositEscrowId} onChange={(e) => setDepositEscrowId(e.target.value)} />
          </label>
          <label className="space-y-1 flex-1">
            <span className="text-mirage/60">Amount (ETH)</span>
            <input className="w-full rounded-xl border px-2 py-1 text-xs" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} />
          </label>
          <button
            type="submit"
            className="px-3 py-1.5 rounded-full text-xs font-semibold bg-deepSea text-white disabled:opacity-60"
            disabled={wrongChain}
          >
            Deposit
          </button>
        </form>
      </section>

      <section className="bg-white rounded-3xl border border-white p-4 space-y-3">
        <h2 className="text-sm font-semibold">Force-complete milestone (owner)</h2>
        <form onSubmit={onForceComplete} className="flex flex-col md:flex-row gap-3 text-xs items-end">
          <label className="space-y-1 flex-1">
            <span className="text-mirage/60">Escrow ID</span>
            <input className="w-full rounded-xl border px-2 py-1 text-xs" value={completeEscrowId} onChange={(e) => setCompleteEscrowId(e.target.value)} />
          </label>
          <label className="space-y-1 flex-1">
            <span className="text-mirage/60">Milestone index (0-based)</span>
            <input className="w-full rounded-xl border px-2 py-1 text-xs" value={completeIndex} onChange={(e) => setCompleteIndex(e.target.value)} />
          </label>
          <button
            type="submit"
            className="px-3 py-1.5 rounded-full text-xs font-semibold bg-deepSea text-white disabled:opacity-60"
            disabled={wrongChain}
          >
            Mark complete
          </button>
        </form>
      </section>

      {createdEscrowId && escrowData && (
        <section className="bg-white rounded-3xl border border-white p-4 space-y-2 text-xs">
          <h2 className="text-sm font-semibold">Last created escrow</h2>
          <p className="text-mirage/70">Escrow ID: {createdEscrowId.toString()}</p>
          <p className="text-mirage/70">Buyer: {(escrowData as any)[0].buyer}</p>
          <p className="text-mirage/70">Seller: {(escrowData as any)[0].seller}</p>
          <p className="text-mirage/70">Total: {formatEth((escrowData as any)[0].totalAmount)} ETH</p>
          <p className="text-mirage/70">Deposited: {formatEth((escrowData as any)[0].deposited)} ETH</p>
          <p className="text-mirage/70">Released: {formatEth((escrowData as any)[0].released)} ETH</p>
        </section>
      )}
    </div>
  );
}

function formatEth(v: bigint) {
  try {
    return (Number(v) / 1e18).toString();
  } catch {
    return "0";
  }
}

