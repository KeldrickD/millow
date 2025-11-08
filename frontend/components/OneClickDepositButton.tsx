"use client";

import { useState, useEffect } from "react";
import { useAccount, useChainId, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { VOTE_ESCROW_ADDRESS, voteEscrowAbi } from "../lib/contracts";
import toast from "react-hot-toast";

type Props = {
  propertyId: bigint;
  sharePriceWei: bigint;
  finalized: boolean;
  successful: boolean;
};

export default function OneClickDepositButton({ propertyId, sharePriceWei, finalized, successful }: Props) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [isMounted, setIsMounted] = useState(false);

  // Avoid hydration mismatches by only showing environment-dependent UI after mount
  // (wallet connection, chain id, etc.).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setIsMounted(true); }, []);
  const { writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: txHash,
    onSuccess() {
      if (!txHash) return;
      toast.success("Deposit locked & vote recorded ✅", { id: txHash });
    },
    onError() {
      if (!txHash) return;
      toast.error("Transaction failed", { id: txHash });
    }
  });

  const disabledReason = getDisabledReason({ isConnected, chainId, finalized, successful, sharePriceWei });
  const loading = isPending || isConfirming;

  function onClick() {
    if (disabledReason || !sharePriceWei) return;
    writeContract(
      {
        address: VOTE_ESCROW_ADDRESS as `0x${string}`,
        abi: voteEscrowAbi as any,
        functionName: "voteAndLock",
        args: [propertyId, sharePriceWei],
        value: sharePriceWei,
        chain: baseSepolia
      },
      {
        onSuccess: (hash) => {
          setTxHash(hash);
          toast.loading("Submitting deposit & vote…", { id: hash });
        },
        onError: () => toast.error("Failed to submit transaction")
      }
    );
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={onClick}
        disabled={loading || (isMounted && !!disabledReason)}
        className="group w-full rounded-2xl px-4 py-3 flex flex-col items-center justify-center text-center text-white shadow-md transition disabled:opacity-60 disabled:cursor-not-allowed bg-blaze hover:bg-blaze/90 hover:animate-pulse animate-bounceOnce"
      >
        <span className="text-sm font-semibold">{loading ? "Confirm in your wallet…" : "Deposit & Vote YES"}</span>
        <span className="text-[10px] opacity-80 mt-0.5">Lock &amp; Vote • 1 share</span>
      </button>
      {isMounted && disabledReason && <p className="text-[10px] text-mirage/60 mt-1 text-center">{disabledReason}</p>}
      {address && txHash && (
        <p className="text-[10px] text-mirage/50 mt-1 text-center break-all">Last tx: {txHash.slice(0, 10)}…</p>
      )}
    </div>
  );
}

function getDisabledReason({
  isConnected,
  chainId,
  finalized,
  successful,
  sharePriceWei
}: {
  isConnected: boolean;
  chainId?: number;
  finalized: boolean;
  successful: boolean;
  sharePriceWei: bigint;
}): string | null {
  if (!isConnected) return "Connect your wallet to join this deal.";
  if (!sharePriceWei || sharePriceWei === 0n) return "Share price not configured.";
  if (chainId && chainId !== baseSepolia.id) return "Switch to Base Sepolia to deposit & vote.";
  if (finalized && successful) return "Deal is already successful.";
  if (finalized && !successful) return "Deal has been cancelled or failed. Deposits are closed.";
  return null;
}


