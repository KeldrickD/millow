"use client";

import { useEffect, useState } from "react";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId, useSwitchChain } from "wagmi";
import { sepolia } from "wagmi/chains";
import { parseEther, formatEther } from "viem";
import { PROPERTY_ADDRESS, VOTE_ESCROW_ADDRESS, propertyAbi, voteEscrowAbi } from "../lib/contracts";
import toast from "react-hot-toast";

export default function DepositAndVoteForm({ propertyId }: { propertyId: number }) {
  const [amount, setAmount] = useState("");
  const { address: account } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const { data: sharePriceWei } = useReadContract({
    address: PROPERTY_ADDRESS,
    abi: propertyAbi,
    functionName: "sharePriceWei",
    args: [BigInt(propertyId)],
    query: { enabled: Boolean(PROPERTY_ADDRESS) }
  } as any);

  const { writeContract, isPending } = useWriteContract();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount) return;
    let value: bigint;
    try {
      value = parseEther(amount);
    } catch {
      toast.error("Invalid ETH amount");
      return;
    }

    if (chainId !== sepolia.id) {
      try {
        await switchChain?.({ chainId: sepolia.id });
      } catch {
        toast.error("Please switch to Sepolia to continue");
        return;
      }
    }
    writeContract(
      {
        address: VOTE_ESCROW_ADDRESS as `0x${string}`,
        abi: voteEscrowAbi as any,
        functionName: "voteAndLock",
        args: [BigInt(propertyId), value] as const,
        value,
        account: account as `0x${string}` | undefined,
        chain: sepolia
      },
      {
        onSuccess: (hash) => {
          setTxHash(hash);
          toast.loading("Transaction submitted…", { id: hash });
        },
        onError: () => toast.error("Failed to submit transaction")
      }
    );
  }

  const { isSuccess, isError } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isSuccess && txHash) {
      toast.success("Transaction confirmed ✅", { id: txHash });
    }
  }, [isSuccess, txHash]);

  useEffect(() => {
    if (isError && txHash) {
      toast.error("Transaction failed", { id: txHash });
    }
  }, [isError, txHash]);

  return (
    <section style={{ border: "1px solid #eee", borderRadius: 8, padding: 16 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Deposit & Vote YES</div>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 8 }}>
        <input
          type="number"
          step="0.001"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount in ETH"
          style={{ border: "1px solid #ccc", borderRadius: 6, padding: "8px 10px" }}
        />
        {sharePriceWei && (
          <div style={{ fontSize: 12, color: "#666" }}>
            Share price: {formatEther(sharePriceWei as bigint)} ETH
          </div>
        )}
        <button
          type="submit"
          disabled={isPending || !VOTE_ESCROW_ADDRESS}
          style={{ border: "1px solid #000", borderRadius: 8, padding: "8px 12px" }}
        >
          {isPending ? "Submitting..." : "Deposit & Vote"}
        </button>
      </form>
    </section>
  );
}


