"use client";

import { useState, useEffect } from "react";
import { useAccount, useChainId, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { formatEther, parseEther } from "viem";
import { VOTE_ESCROW_ADDRESS, voteEscrowAbi } from "../lib/contracts";
import toast from "react-hot-toast";

type Props = {
  propertyId: bigint;
  sharePriceWei: bigint;
  finalized: boolean;
  successful: boolean;
  targetWei: bigint;
  raisedWei: bigint;
  sharePriceMissingOnChain?: boolean;
};

const BIG_DEPOSIT_THRESHOLD_WEI = parseEther("1"); // confirmation for large single-click deposits

export default function OneClickDepositButton({
  propertyId,
  sharePriceWei,
  finalized,
  successful,
  targetWei,
  raisedWei,
  sharePriceMissingOnChain
}: Props) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [isMounted, setIsMounted] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Avoid hydration mismatches by only showing environment-dependent UI after mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setIsMounted(true);
  }, []);
  const { writeContract, isPending } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({
    hash: txHash,
    query: { enabled: Boolean(txHash) }
  });
  useEffect(() => {
    if (receipt.isSuccess && txHash) {
      toast.success("Deposit locked & vote recorded ✅", { id: txHash });
    }
  }, [receipt.isSuccess, txHash]);
  useEffect(() => {
    if (receipt.isError && txHash) {
      toast.error("Transaction failed", { id: txHash });
    }
  }, [receipt.isError, txHash]);

  const sharePriceMissing = sharePriceMissingOnChain || sharePriceWei === 0n;
  const remainingWei = targetWei > 0n && raisedWei < targetWei ? targetWei - raisedWei : 0n;
  const fullyFunded = targetWei > 0n && remainingWei === 0n;
  const overMax = remainingWei > 0n && sharePriceWei > remainingWei;

  const disabledReason = getDisabledReason({
    isConnected,
    chainId,
    finalized,
    successful,
    sharePriceWei,
    sharePriceMissing,
    fullyFunded,
    overMax,
    remainingWei
  });
  const loading = isPending || receipt.isLoading;

  const sharePriceEth = sharePriceWei > 0n ? formatEther(sharePriceWei) : "0";
  const remainingEth = remainingWei > 0n ? formatEther(remainingWei) : "0";

  async function submitDeposit() {
    if (disabledReason || !sharePriceWei || sharePriceMissing) return;
    setError(null);
    writeContract(
      {
        address: VOTE_ESCROW_ADDRESS as `0x${string}`,
        abi: voteEscrowAbi as any,
        functionName: "voteAndLock",
        args: [propertyId, sharePriceWei],
        value: sharePriceWei,
        chain: chainId === base.id ? base : baseSepolia
      },
      {
        onSuccess: (hash) => {
          setTxHash(hash);
          toast.loading("Submitting deposit & vote…", { id: hash });
        },
        onError: (e) => {
          const msg = (e as any)?.shortMessage ?? (e as any)?.message ?? "Failed to submit transaction";
          toast.error("Failed to submit transaction");
          setError(msg);
        }
      }
    );
  }

  async function onClick() {
    if (disabledReason || !sharePriceWei || sharePriceMissing) return;
    if (sharePriceWei >= BIG_DEPOSIT_THRESHOLD_WEI) {
      setShowConfirm(true);
      return;
    }
    await submitDeposit();
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={onClick}
        disabled={loading || (isMounted && (!!disabledReason || sharePriceMissing))}
        className="group w-full rounded-2xl px-4 py-3 flex flex-col items-center justify-center text-center text-white shadow-md transition disabled:opacity-60 disabled:cursor-not-allowed bg-blaze hover:bg-blaze/90 hover:animate-pulse animate-bounceOnce"
      >
        <span className="text-sm font-semibold">{loading ? "Processing…" : "Back this deal"}</span>
      </button>
      {isMounted && !loading && !disabledReason && !sharePriceMissing && (
        <p className="text-[11px] text-mirage/60 mt-1 text-center">
          One-click backs exactly <span className="font-semibold">{sharePriceEth} ETH</span> of this deal.
          {remainingWei > 0n && ` ~${remainingEth} ETH capacity remains before the target is hit.`}
        </p>
      )}
      {isMounted && disabledReason && <p className="text-[10px] text-mirage/60 mt-1 text-center">{disabledReason}</p>}
      {isMounted && !disabledReason && sharePriceMissing && (
        <p className="text-[10px] text-mirage/60 mt-1 text-center">
          Admin must configure the on-chain share price before investors can back this deal.
        </p>
      )}
      {address && txHash && (
        <p className="text-[10px] text-mirage/50 mt-1 text-center break-all">Last tx: {txHash.slice(0, 10)}…</p>
      )}
      {error && <p className="text-[10px] text-red-500 mt-1 text-center">{error}</p>}

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-3xl border border-white max-w-sm w-full p-4 text-xs text-mirage/80 space-y-3">
            <p className="text-sm font-semibold text-mirage">Confirm large backing</p>
            <p>
              You’re about to back this deal with <span className="font-semibold">{sharePriceEth} ETH.</span>
            </p>
            <p className="text-mirage/60">
              Make sure you’ve reviewed the property details and understand the risks. This is on testnet now, but flows
              will be identical on mainnet.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="px-3 py-1.5 rounded-full text-[11px] bg-mirage/5 text-mirage/70 hover:bg-mirage/10"
                onClick={() => setShowConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-3 py-1.5 rounded-full text-[11px] bg-blaze text-white hover:bg-blaze/90"
                onClick={async () => {
                  setShowConfirm(false);
                  await submitDeposit();
                }}
              >
                Yes, back this deal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getDisabledReason({
  isConnected,
  chainId,
  finalized,
  successful,
  sharePriceWei,
  sharePriceMissing,
  fullyFunded,
  overMax,
  remainingWei
}: {
  isConnected: boolean;
  chainId?: number;
  finalized: boolean;
  successful: boolean;
  sharePriceWei: bigint;
  sharePriceMissing: boolean;
  fullyFunded: boolean;
  overMax: boolean;
  remainingWei: bigint;
}): string | null {
  const allowedChains = [baseSepolia.id, base.id]; // Base Sepolia, Base mainnet
  if (!isConnected) return "Connect your wallet to join this deal.";
  if (sharePriceMissing) return "Share price not configured.";
  if (chainId && !allowedChains.includes(chainId)) return "Wrong network. Switch to Base or Base Sepolia.";
  if (fullyFunded) return "Funding target reached.";
  if (overMax) return `Only ${remainingWei > 0n ? formatEther(remainingWei) : "0"} ETH capacity remains.`;
  if (finalized && successful) return "Deal is already successful.";
  if (finalized && !successful) return "Deal has been cancelled or failed. Deposits are closed.";
  return null;
}


