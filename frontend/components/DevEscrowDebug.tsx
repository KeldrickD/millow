"use client";

import { useChainId, useReadContract } from "wagmi";
import { VOTE_ESCROW_ADDRESS, voteEscrowAbi } from "../lib/contracts";

export default function DevEscrowDebug() {
  const chainId = useChainId();
  const { data: allIds } = useReadContract({
    address: VOTE_ESCROW_ADDRESS,
    abi: voteEscrowAbi,
    functionName: "getAllPropertyIds"
  });

  if (process.env.NODE_ENV === "production") return null;

  const ids = (allIds as readonly bigint[] | undefined) ?? [];

  return (
    <div className="fixed bottom-2 right-2 bg-white/90 border border-mirage/10 rounded-lg px-3 py-2 text-[10px] text-mirage/80 space-y-1 shadow">
      <div>chainId: {chainId}</div>
      <div>escrow: {VOTE_ESCROW_ADDRESS}</div>
      <div>allIds: {ids.length ? ids.map((i) => i.toString()).join(", ") : "none"}</div>
    </div>
  );
}


