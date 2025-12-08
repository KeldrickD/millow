"use client";

import { useState } from "react";
import { useWatchContractEvent } from "wagmi";
import { VOTE_ESCROW_ADDRESS, voteEscrowAbi } from "../lib/contracts";
import { formatEther } from "viem";

type FeedItem =
  | { type: "deposit"; propertyId: bigint; amountWei: bigint; user: `0x${string}`; txHash?: `0x${string}` }
  | { type: "finalized"; propertyId: bigint; success: boolean; txHash?: `0x${string}` };

export default function FundingFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);

  // Deposit events
  useWatchContractEvent({
    address: VOTE_ESCROW_ADDRESS,
    abi: voteEscrowAbi as any,
    eventName: "VoteLocked",
    onLogs(logs) {
      const typedLogs = logs as Array<{ args: any; transactionHash?: `0x${string}` }>;
      setItems((prev) => {
        const next = [...prev];
        for (const log of typedLogs) {
          const args = log.args as any;
          next.unshift({
            type: "deposit",
            propertyId: args.propertyId as bigint,
            amountWei: args.amountWei as bigint,
            user: args.investor as `0x${string}`,
            txHash: log.transactionHash as `0x${string}`
          });
        }
        return next.slice(0, 20);
      });
    }
  });

  // Finalization events
  useWatchContractEvent({
    address: VOTE_ESCROW_ADDRESS,
    abi: voteEscrowAbi as any,
    eventName: "BuyTriggered",
    onLogs(logs) {
      const typedLogs = logs as Array<{ args: any; transactionHash?: `0x${string}` }>;
      setItems((prev) => {
        const next = [...prev];
        for (const log of typedLogs) {
          const args = log.args as any;
          next.unshift({
            type: "finalized",
            propertyId: args.propertyId as bigint,
            success: true,
            txHash: log.transactionHash as `0x${string}`
          });
        }
        return next.slice(0, 20);
      });
    }
  });

  if (!items.length) return null;

  return (
    <aside className="mt-8 bg-white/80 rounded-3xl border border-white px-4 py-3 text-xs max-w-sm">
      <p className="font-semibold mb-2">Live funding activity</p>
      <div className="space-y-1 max-h-56 overflow-y-auto">
        {items.map((item, idx) => (
          <FeedRow key={idx} item={item} />
        ))}
      </div>
    </aside>
  );
}

function FeedRow({ item }: { item: FeedItem }) {
  if (item.type === "deposit") {
    return (
      <div className="flex justify-between gap-2 text-[11px] text-mirage/80">
        <span>
          <span className="font-semibold">+{formatEther(item.amountWei)} ETH</span> into property #
          {item.propertyId.toString().slice(0, 6)}…
        </span>
        <span className="text-mirage/40">{item.user.slice(0, 6)}…{item.user.slice(-4)}</span>
      </div>
    );
  }
  return (
    <div className="flex justify-between gap-2 text-[11px] text-mirage/80">
      <span>Deal #{item.propertyId.toString().slice(0, 6)}… finalized ✅</span>
    </div>
  );
}


