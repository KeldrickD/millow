"use client";

import { useState } from "react";
import { formatEther, formatUnits } from "viem";
import { useWatchContractEvent } from "wagmi";
import {
  VOTE_ESCROW_ADDRESS,
  YIELD_VAULT_ADDRESS,
  PROPERTY_DEX_ADDRESS,
  voteEscrowAbi,
  yieldVaultAbi,
  propertyDexAbi,
} from "../lib/contracts";

type FeedItem = {
  id: string;
  label: string;
  detail: string;
};

export default function ActivityFeed({ propertyId }: { propertyId: bigint }) {
  const [items, setItems] = useState<FeedItem[]>([]);

  function push(label: string, detail: string) {
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;
    setItems((prev) => {
      const next = [{ id, label, detail }, ...prev];
      return next.slice(0, 10);
    });
  }

  useWatchContractEvent({
    address: VOTE_ESCROW_ADDRESS,
    abi: voteEscrowAbi,
    eventName: "VoteLocked",
    onLogs(logs) {
      logs.forEach((log: any) => {
        const [id, investor, amount] = log.args;
        if (BigInt(id) !== propertyId) return;
        push("Deposit locked", `${formatEther(amount)} ETH by ${String(investor).slice(0, 6)}…`);
      });
    },
  } as any);

  useWatchContractEvent({
    address: VOTE_ESCROW_ADDRESS,
    abi: voteEscrowAbi,
    eventName: "BuyTriggered",
    onLogs(logs) {
      logs.forEach((log: any) => {
        const [id, total] = log.args;
        if (BigInt(id) !== propertyId) return;
        push("Deal finalized", `${formatEther(total)} ETH sent to seller`);
      });
    },
  } as any);

  useWatchContractEvent({
    address: VOTE_ESCROW_ADDRESS,
    abi: voteEscrowAbi,
    eventName: "PropertyCancelled",
    onLogs(logs) {
      logs.forEach((log: any) => {
        const [id] = log.args;
        if (BigInt(id) !== propertyId) return;
        push("Deal cancelled", "Refunds are now available to investors.");
      });
    },
  } as any);

  useWatchContractEvent({
    address: YIELD_VAULT_ADDRESS,
    abi: yieldVaultAbi,
    eventName: "YieldDeposited",
    onLogs(logs) {
      logs.forEach((log: any) => {
        const [id, amount] = log.args;
        if (BigInt(id) !== propertyId) return;
        push("Rent deposited", `${formatUnits(amount, 6)} USDC added to vault`);
      });
    },
  } as any);

  useWatchContractEvent({
    address: YIELD_VAULT_ADDRESS,
    abi: yieldVaultAbi,
    eventName: "YieldClaimed",
    onLogs(logs) {
      logs.forEach((log: any) => {
        const [id, user, amount] = log.args;
        if (BigInt(id) !== propertyId) return;
        push("Yield claimed", `${formatUnits(amount, 6)} USDC by ${String(user).slice(0, 6)}…`);
      });
    },
  } as any);

  useWatchContractEvent({
    address: PROPERTY_DEX_ADDRESS,
    abi: propertyDexAbi,
    eventName: "SwapStableForShares",
    onLogs(logs) {
      logs.forEach((log: any) => {
        const [id, trader, stableIn, sharesOut] = log.args;
        if (BigInt(id) !== propertyId) return;
        push(
          "Secondary buy",
          `${short(trader)} bought ${sharesOut.toString()} shares for ${formatUnits(stableIn, 6)} USDC`
        );
      });
    },
  } as any);

  useWatchContractEvent({
    address: PROPERTY_DEX_ADDRESS,
    abi: propertyDexAbi,
    eventName: "SwapSharesForStable",
    onLogs(logs) {
      logs.forEach((log: any) => {
        const [id, trader, sharesIn, stableOut] = log.args;
        if (BigInt(id) !== propertyId) return;
        push(
          "Secondary sell",
          `${short(trader)} sold ${sharesIn.toString()} shares for ${formatUnits(stableOut, 6)} USDC`
        );
      });
    },
  } as any);

  return (
    <section className="space-y-2 rounded-3xl border border-white bg-white p-4">
      <h2 className="text-sm font-semibold text-mirage">Activity</h2>
      {items.length === 0 ? (
        <p className="text-[11px] text-mirage/60">
          No on-chain activity yet for this deal. Once investors start backing it, you’ll see deposits, finalizations, and
          rent events here in real time.
        </p>
      ) : (
        <ul className="max-h-40 space-y-1 overflow-auto pr-1 text-[11px]">
          {items.map((item) => (
            <li key={item.id} className="rounded-2xl bg-wildSand/70 px-3 py-2">
              <p className="font-semibold text-mirage">{item.label}</p>
              <p className="text-mirage/70">{item.detail}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function short(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}


