"use client";

import { useReadContract } from "wagmi";
import { formatEther } from "viem";
import { VOTE_ESCROW_ADDRESS, voteEscrowAbi } from "../lib/contracts";

export default function DealProgress({ propertyId }: { propertyId: number }) {
  const { data: proposal } = useReadContract({
    address: VOTE_ESCROW_ADDRESS,
    abi: voteEscrowAbi,
    functionName: "getProposal",
    args: [BigInt(propertyId)],
    query: { enabled: !!VOTE_ESCROW_ADDRESS && voteEscrowAbi.length > 0, refetchInterval: 4000 }
  } as any);

  if (!proposal) return null;

  const [, , targetPriceWei, , totalLocked, , finalized, successful] = proposal as any;
  const target = Number(targetPriceWei);
  const locked = finalized && !successful ? 0 : Number(totalLocked);
  const pct = target > 0 ? Math.min(100, (locked / target) * 100) : 0;

  return (
    <section style={{ border: "1px solid #eee", borderRadius: 8, padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
        <span>Funding Progress</span>
        <span>{formatEther(BigInt(locked))} / {formatEther(targetPriceWei)} ETH</span>
      </div>
      <div style={{ width: "100%", background: "#eee", borderRadius: 9999, height: 8, marginTop: 8 }}>
        <div
          style={{ width: `${pct}%`, background: "#000", height: 8, borderRadius: 9999 }}
        />
      </div>
    </section>
  );
}


