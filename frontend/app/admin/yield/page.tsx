"use client";

import { useState } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { parseUnits } from "viem";
import { YIELD_VAULT_ADDRESS, yieldVaultAbi, USDC_ADDRESS, erc20Abi, voteEscrowAbi, VOTE_ESCROW_ADDRESS } from "../../../lib/contracts";
import { idFromPropertyKey } from "../../../lib/slug";
import toast from "react-hot-toast";

export default function YieldAdminPage() {
  const { address } = useAccount();
  const [propertyLabel, setPropertyLabel] = useState("");
  const [amount, setAmount] = useState("100"); // USDC amount (6dp)

  const { data: owner } = useReadContract({
    address: VOTE_ESCROW_ADDRESS,
    abi: voteEscrowAbi,
    functionName: "owner"
  } as any);

  const isOwner = !!address && !!owner && (address as string).toLowerCase() === (owner as string).toLowerCase();
  const { writeContract, isPending } = useWriteContract();

  if (!YIELD_VAULT_ADDRESS || !USDC_ADDRESS) {
    return <main className="mx-auto max-w-3xl px-4 py-10 text-sm">Set NEXT_PUBLIC_YIELD_VAULT_ADDRESS and NEXT_PUBLIC_USDC_ADDRESS to use this page.</main>;
  }

  if (!isOwner) {
    return <main className="mx-auto max-w-3xl px-4 py-10 text-sm text-red-500">Owner only.</main>;
  }

  function handleApprove() {
    try {
      const amt = parseUnits(amount, 6);
      writeContract(
        { address: USDC_ADDRESS as `0x${string}`, abi: erc20Abi as any, functionName: "approve", args: [YIELD_VAULT_ADDRESS, amt] },
        { onSuccess: (hash) => toast.loading("Approving USDC…", { id: hash }), onError: () => toast.error("Approval failed") }
      );
    } catch { toast.error("Invalid amount"); }
  }

  function handleDeposit() {
    try {
      const amt = parseUnits(amount, 6);
      const pid = idFromPropertyKey(propertyLabel);
      writeContract(
        { address: YIELD_VAULT_ADDRESS as `0x${string}`, abi: yieldVaultAbi as any, functionName: "depositYield", args: [pid, amt] },
        { onSuccess: (hash) => toast.loading("Depositing yield…", { id: hash }), onError: () => toast.error("Deposit failed") }
      );
    } catch { toast.error("Invalid input"); }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 space-y-4">
      <h1 className="text-2xl font-bold">Deposit Yield</h1>
      <div className="space-y-3 text-sm">
        <label className="block">
          <span className="text-xs text-gray-600">Property Label (e.g., 123 Main St, Atlanta, GA 30331)</span>
          <input value={propertyLabel} onChange={(e) => setPropertyLabel(e.target.value)} className="mt-1 w-full border rounded-md px-2 py-1 text-sm" placeholder="123 Main St, Atlanta, GA 30331" />
        </label>
        <label className="block">
          <span className="text-xs text-gray-600">Amount (USDC)</span>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 w-full border rounded-md px-2 py-1 text-sm" />
        </label>
      </div>
      <div className="flex gap-3">
        <button onClick={handleApprove} disabled={isPending} className="rounded-md border px-4 py-2 text-sm">Approve USDC</button>
        <button onClick={handleDeposit} disabled={isPending} className="rounded-md bg-emerald-600 text-white px-4 py-2 text-sm disabled:bg-gray-300">Deposit Yield</button>
      </div>
    </main>
  );
}


