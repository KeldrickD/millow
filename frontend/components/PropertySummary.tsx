"use client";

import { useReadContract } from "wagmi";
import { formatEther } from "viem";
import { PROPERTY_ADDRESS, VOTE_ESCROW_ADDRESS, propertyAbi, voteEscrowAbi } from "../lib/contracts";

export default function PropertySummary({ propertyId }: { propertyId: bigint }) {
  const { data: meta } = useReadContract({
    address: PROPERTY_ADDRESS,
    abi: propertyAbi,
    functionName: "propertyMetadata",
    args: [propertyId],
    query: { enabled: !!PROPERTY_ADDRESS && propertyAbi.length > 0, refetchInterval: 4000 }
  } as any);

  const { data: proposal } = useReadContract({
    address: VOTE_ESCROW_ADDRESS,
    abi: voteEscrowAbi,
    functionName: "getProposal",
    args: [propertyId],
    query: { enabled: !!VOTE_ESCROW_ADDRESS && voteEscrowAbi.length > 0, refetchInterval: 4000 }
  } as any);

  if (!meta || !proposal) {
    return (
      <section style={{ border: "1px solid #eee", borderRadius: 8, padding: 16 }}>
        <div style={{ fontWeight: 600 }}>Property #{propertyId.toString()}</div>
        <div style={{ color: "#999" }}>Connect ABIs and addresses to load data.</div>
      </section>
    );
  }

  const [
    exists,
    seller,
    targetPriceWei,
    description,
    totalLocked,
    deadline,
    finalized,
    successful
  ] = proposal as any;

  const info = meta as any;

  return (
    <section style={{ border: "1px solid #eee", borderRadius: 8, padding: 16 }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>
        Property #{propertyId.toString()} – {info.metadataURI || "34-Unit Apartment"}
      </div>
      <div style={{ color: "#666", fontSize: 14, marginBottom: 8 }}>{description}</div>
      <div style={{ fontSize: 14, lineHeight: "22px" }}>
        <div>Target: {formatEther(targetPriceWei)} ETH</div>
        <div>Locked: {formatEther(totalLocked)} ETH</div>
        <div>Share price: {formatEther(info.sharePriceWei)} ETH</div>
        <div>Max shares: {String(info.maxShares)}</div>
        <div>Yield (mock): {info.yieldBps / 100}%</div>
        <div>
          Status: {finalized ? (successful ? "Purchased" : "Cancelled") : "Funding in progress"}
        </div>
      </div>
    </section>
  );
}


