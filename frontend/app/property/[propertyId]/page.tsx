"use client";

import { useParams } from "next/navigation";
import { useReadContract } from "wagmi";
import { formatEther } from "viem";
import { idFromPropertyKey } from "../../../lib/slug";
import {
  PROPERTY_ADDRESS,
  VOTE_ESCROW_ADDRESS,
  propertyAbi,
  voteEscrowAbi
} from "../../../lib/contracts";
import InvestorPosition from "../../../components/InvestorPosition";
import EscrowActions from "../../../components/EscrowActions";
import OneClickDepositButton from "../../../components/OneClickDepositButton";
import { useEffect, useState } from "react";

export default function PropertyPage() {
  const params = useParams();
  const raw = String(params?.propertyId || "1");
  let propertyId: bigint;
  if (raw.startsWith("0x")) propertyId = BigInt(raw);
  else if (/[^0-9]/.test(raw)) propertyId = idFromPropertyKey(raw);
  else propertyId = BigInt(Number(raw || 1));

  const { data: propCfg } = useReadContract({
    address: PROPERTY_ADDRESS,
    abi: propertyAbi,
    functionName: "properties",
    args: [propertyId]
  } as any);

  const { data: proposal } = useReadContract({
    address: VOTE_ESCROW_ADDRESS,
    abi: voteEscrowAbi,
    functionName: "getProposal",
    args: [propertyId]
  } as any);

  let label = "";
  let maxShares = 0n;
  let sharePriceWei = 0n;
  let metadataURI = "";
  if (propCfg && Array.isArray(propCfg)) {
    maxShares = propCfg[1] as bigint;
    sharePriceWei = propCfg[2] as bigint;
    metadataURI = propCfg[4] as string;
  }

  let targetWei = 0n;
  let raisedWei = 0n;
  let fundingDeadline = 0n;
  let finalized = false;
  let successful = false;
  if (proposal && Array.isArray(proposal)) {
    targetWei = toBig((proposal as any)[0]);
    raisedWei = toBig((proposal as any)[1]);
    fundingDeadline = proposal[3] as bigint;
    finalized = proposal[6] as boolean;
    successful = proposal[7] as boolean;
  }

  const meta = usePropertyMetadata(metadataURI);
  label = meta.label || label;
  const heroImage = meta.images[0] || "https://images.pexels.com/photos/259588/pexels-photo-259588.jpeg?auto=compress&cs=tinysrgb&w=1200";

  const sharePriceEth = formatEther(sharePriceWei);
  const targetEth = formatEther(targetWei);
  const raisedEth = formatEther(raisedWei);
  const progress = targetWei > 0n ? Number((raisedWei * 100n) / targetWei) : 0;
  const deadlineDate = fundingDeadline > 0n ? new Date(Number(fundingDeadline) * 1000) : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      <section className="space-y-4">
        <div className="rounded-3xl overflow-hidden h-64 md:h-80 bg-mirage/10">
          <img src={heroImage} alt={label} className="w-full h-full object-cover" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-mirage">
            {label || `Property #${propertyId.toString()}`}
          </h1>
          <p className="text-xs text-mirage/60 mt-1">
            Tokenized deal on Base • ERC-1155 ID: <span className="font-mono">{propertyId.toString().slice(0, 12)}…</span>
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <Stat label="Target raise" value={`${targetEth} ETH`} />
          <Stat label="Share price" value={`${sharePriceEth} ETH / share`} />
          <Stat label="Max shares" value={maxShares.toString()} />
          <Stat label="Funding deadline" value={deadlineDate ? deadlineDate.toLocaleDateString() : "TBD"} />
        </div>
      </section>

      <section className="grid md:grid-cols-[2fr,1fr] gap-6">
        <div className="bg-white rounded-3xl border border-white p-4 space-y-3">
          <h2 className="text-sm font-semibold">Property details</h2>
          <p className="text-xs text-mirage/70">
            This section can be wired to real metadata: photos, beds/baths, rent roll, sponsor info, NOI, etc.
          </p>
        </div>
        <div className="space-y-4">
          <aside className="bg-white rounded-3xl shadow-sm border border-white p-4 space-y-4">
            <div className="space-y-1">
              <p className="text-xs text-mirage/60">Deal status</p>
              <p className="text-sm font-semibold">
                {finalized ? (successful ? "✅ Successful" : "❌ Failed") : "⏳ Funding in progress"}
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[11px] text-mirage/70">
                <span>
                  {raisedEth} / {targetEth} ETH raised
                </span>
                <span>{progress.toFixed(1)}%</span>
              </div>
              <div className="h-2 w-full bg-mirage/10 rounded-full overflow-hidden">
                <div className="h-full bg-deepSea" style={{ width: `${Math.min(progress, 100)}%` }} />
              </div>
            </div>
            <OneClickDepositButton propertyId={propertyId} sharePriceWei={sharePriceWei} finalized={finalized} successful={successful} />
            <EscrowActions propertyId={propertyId} />
          </aside>
          <InvestorPosition propertyId={propertyId} />
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl border border-white px-3 py-2">
      <p className="text-[10px] text-mirage/50">{label}</p>
      <p className="text-xs font-semibold text-mirage mt-0.5">{value}</p>
    </div>
  );
}

function toBig(v: any): bigint {
  if (typeof v === "bigint") return v;
  if (v === null || v === undefined) return 0n;
  try { return BigInt(v as any); } catch { return 0n; }
}

function usePropertyMetadata(metadataURI: string | undefined) {
  const [data, setData] = useState<{ label: string; images: string[] }>({ label: "", images: [] });
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!metadataURI) return;
      if (!/^ipfs:|^https?:/i.test(metadataURI)) {
        if (!cancelled) setData({ label: metadataURI, images: [] });
        return;
      }
      try {
        const url = toHttpUrl(metadataURI);
        const res = await fetch(url);
        const json = await res.json();
        const images = Array.isArray(json.images) ? json.images.map((u: string) => toHttpUrl(u)) : [];
        const label = String(json.label ?? json.name ?? "");
        if (!cancelled) setData({ label, images });
      } catch {
        if (!cancelled) setData({ label: "", images: [] });
      }
    }
    run();
    return () => { cancelled = true; };
  }, [metadataURI]);
  return data;
}

function toHttpUrl(uri: string) {
  if (!uri) return uri;
  if (uri.startsWith("ipfs://")) {
    const cidPath = uri.replace("ipfs://", "");
    return `https://gateway.pinata.cloud/ipfs/${cidPath}`;
  }
  return uri;
}

