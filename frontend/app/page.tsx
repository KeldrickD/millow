"use client";

import Link from "next/link";
import { useReadContract } from "wagmi";
import { VOTE_ESCROW_ADDRESS, voteEscrowAbi, PROPERTY_ADDRESS, propertyAbi } from "../lib/contracts";
import { formatEther } from "viem";

export default function HomePage() { return <HomeContent />; }

function HomeContent() {
  const propertyId = 1n;

  const { data: proposal } = useReadContract({
    address: VOTE_ESCROW_ADDRESS,
    abi: voteEscrowAbi,
    functionName: "getProposal",
    args: [propertyId],
    query: { enabled: Boolean(VOTE_ESCROW_ADDRESS) }
  } as any);

  const { data: sharePrice } = useReadContract({
    address: PROPERTY_ADDRESS,
    abi: propertyAbi,
    functionName: "sharePriceWei",
    args: [propertyId],
    query: { enabled: Boolean(PROPERTY_ADDRESS) }
  } as any);

  let body = (
    <div style={{ color: "#999" }}>Connect ABIs/addresses to load deal data.</div>
  );

  if (proposal && sharePrice) {
    const [, , targetPriceWei, , totalLocked, deadline, finalized, successful] = proposal as any;
    const pct = Number(totalLocked) > 0 && Number(targetPriceWei) > 0
      ? Math.min(100, (Number(totalLocked) / Number(targetPriceWei)) * 100)
      : 0;

    body = (
      <section style={{ border: "1px solid #eee", borderRadius: 8, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
          <span>Target raise</span>
          <span>{formatEther(targetPriceWei)} ETH</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginTop: 4 }}>
          <span>Raised</span>
          <span>{formatEther(totalLocked)} ETH</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginTop: 4 }}>
          <span>Share price</span>
          <span>{formatEther(sharePrice as bigint)} ETH</span>
        </div>
        <div style={{ marginTop: 8 }}>
          <div style={{ width: "100%", background: "#eee", borderRadius: 9999, height: 8 }}>
            <div style={{ width: `${pct}%`, background: "#000", height: 8, borderRadius: 9999 }} />
          </div>
          <div style={{ marginTop: 4, fontSize: 12, color: "#666" }}>{pct.toFixed(1)}% funded</div>
        </div>
        <div style={{ marginTop: 6, fontSize: 12, color: "#666" }}>
          Status: {finalized ? (successful ? "Purchased" : "Cancelled") : "Funding in progress"}
        </div>
      </section>
    );
  }

  return (
    <main className="space-y-4">
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>BrickStack</h1>
      <p style={{ color: "#666" }}>
        Fractional ownership marketplace • V1 – single 34-unit test property.
      </p>
      {body}
      <div>
        <Link href="/property/1" style={{ border: "1px solid #000", padding: "8px 12px", borderRadius: 8 }}>
          View Deal
        </Link>
      </div>
    </main>
  );
}


