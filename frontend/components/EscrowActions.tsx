"use client";

import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { sepolia } from "wagmi/chains";
import { VOTE_ESCROW_ADDRESS, voteEscrowAbi } from "../lib/contracts";
import toast from "react-hot-toast";

export default function EscrowActions({ propertyId }: { propertyId: number }) {
  const pid = BigInt(propertyId);
  const { address } = useAccount();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  // Deal state
  const { data: proposal } = useReadContract({
    address: VOTE_ESCROW_ADDRESS,
    abi: voteEscrowAbi,
    functionName: "getProposal",
    args: [pid]
  } as any);

  let finalized = false;
  let successful = false;
  let targetPriceWei: bigint | undefined;
  let totalLocked: bigint | undefined;
  if (proposal && Array.isArray(proposal)) {
    targetPriceWei = proposal[2] as bigint;
    totalLocked = proposal[4] as bigint;
    finalized = proposal[6] as boolean;
    successful = proposal[7] as boolean;
  }

  // Admin detection via owner()
  const { data: owner } = useReadContract({
    address: VOTE_ESCROW_ADDRESS,
    abi: [{ type: "function", name: "owner", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] }] as const,
    functionName: "owner"
  } as any);
  const isAdmin = !!address && !!owner && (address as string).toLowerCase() === (owner as string).toLowerCase();

  const { writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });
  const busy = isPending || isConfirming;

  function handleTriggerBuy() {
    if (!isAdmin) return;
    writeContract(
      { address: VOTE_ESCROW_ADDRESS as `0x${string}`, abi: voteEscrowAbi as any, functionName: "triggerBuy", args: [pid] as const, account: address as `0x${string}` | undefined, chain: sepolia },
      { onSuccess: (hash) => { setTxHash(hash); toast.loading("Triggering buy…", { id: hash }); }, onError: () => toast.error("Failed to submit transaction") }
    );
  }

  function handleCancel() {
    if (!isAdmin) return;
    writeContract(
      { address: VOTE_ESCROW_ADDRESS as `0x${string}`, abi: voteEscrowAbi as any, functionName: "cancelProperty", args: [pid] as const, account: address as `0x${string}` | undefined, chain: sepolia },
      { onSuccess: (hash) => { setTxHash(hash); toast.loading("Cancelling…", { id: hash }); }, onError: () => toast.error("Failed to submit transaction") }
    );
  }

  function handleRefund() {
    writeContract(
      { address: VOTE_ESCROW_ADDRESS as `0x${string}`, abi: voteEscrowAbi as any, functionName: "refund", args: [pid] as const, account: address as `0x${string}` | undefined, chain: sepolia },
      { onSuccess: (hash) => { setTxHash(hash); toast.loading("Submitting refund…", { id: hash }); }, onError: () => toast.error("Failed to submit transaction") }
    );
  }

  return (
    <div className="border rounded-xl p-4 space-y-3 text-sm">
      <h3 className="font-semibold">Escrow Actions</h3>

      {!finalized && isAdmin && (
        <div className="space-y-2">
          <button type="button" onClick={handleTriggerBuy} disabled={busy} className="w-full rounded-md bg-emerald-600 text-white py-2 disabled:bg-gray-300">
            {busy ? "Processing..." : "Trigger Buy (Finalize Deal)"}
          </button>
          <button type="button" onClick={handleCancel} disabled={busy} className="w-full rounded-md bg-red-500 text-white py-2 disabled:bg-gray-300">
            {busy ? "Processing..." : "Cancel Deal"}
          </button>
          <p className="text-xs text-gray-500">Only the contract owner can see these buttons.</p>
        </div>
      )}

      {finalized && !successful && (
        <div className="space-y-2">
          <button type="button" onClick={handleRefund} disabled={busy} className="w-full rounded-md bg-orange-500 text-white py-2 disabled:bg-gray-300">
            {busy ? "Processing..." : "Claim Refund"}
          </button>
          <p className="text-xs text-gray-500">The raise was cancelled or failed. You can reclaim your locked ETH.</p>
        </div>
      )}

      {finalized && successful && (
        <p className="text-xs text-gray-500">Deal finalized successfully. Refunds are disabled; investors receive their shares.</p>
      )}

      {txHash && (
        <p className="text-xs text-gray-500 break-all">Last tx: {txHash} {isConfirmed && <span className="ml-1 text-emerald-600">✅ Confirmed</span>}</p>
      )}
    </div>
  );
}


