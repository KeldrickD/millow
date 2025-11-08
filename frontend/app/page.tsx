"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useReadContract } from "wagmi";
import { VOTE_ESCROW_ADDRESS, voteEscrowAbi, PROPERTY_ADDRESS, propertyAbi } from "../lib/contracts";
import { formatEther } from "viem";
import { getPropertyImages } from "../lib/listingMedia";
import FundingFeed from "../components/FundingFeed";

export default function MarketplaceHome() {
  const [search, setSearch] = useState("");
  const { data: active } = useReadContract({
    address: VOTE_ESCROW_ADDRESS,
    abi: voteEscrowAbi,
    functionName: "getActivePropertyIds",
    query: { refetchInterval: 4000 }
  } as any);

  const ids = (active as bigint[] | undefined) ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      <section className="space-y-4">
        <h1 className="text-3xl md:text-4xl font-bold text-mirage">Discover tokenized deals like you browse houses.</h1>
        <p className="text-sm text-mirage/70 max-w-2xl">
          Each listing is a real estate deal: view photos, read the numbers, then lock ETH and vote in one click.
        </p>
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 bg-white rounded-xl border border-white shadow-sm flex items-center px-3 py-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by address, city, or label…"
              className="flex-1 bg-transparent text-sm outline-none"
            />
          </div>
          <Link href="/admin/listing/new" className="text-xs px-4 py-2 rounded-full bg-blaze text-white self-start hover:bg-blaze/90">
            New Listing
          </Link>
        </div>
      </section>
      <section className="grid md:grid-cols-[3fr,1.3fr] gap-6 items-start">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {ids.length === 0 && <p className="text-sm text-mirage/60">No active deals yet. Check back soon.</p>}
          {ids.map((id) => (
            <PropertyCard key={id.toString()} propertyId={id} />
          ))}
        </div>
        <FundingFeed />
      </section>
    </div>
  );
}

function PropertyCard({ propertyId }: { propertyId: bigint }) {
  const { data: proposal } = useReadContract({
    address: VOTE_ESCROW_ADDRESS,
    abi: voteEscrowAbi,
    functionName: "getProposal",
    args: [propertyId],
    query: { refetchInterval: 4000 }
  } as any);

  const { data: propCfg } = useReadContract({
    address: PROPERTY_ADDRESS,
    abi: propertyAbi,
    functionName: "properties",
    args: [propertyId],
    query: { refetchInterval: 4000 }
  } as any);

  const images = useLocalImages(propertyId);

  // Always call hooks in the same order; compute with safe fallbacks
  // getProposal returns: [exists, seller, targetPriceWei, description, totalLocked, deadline, finalized, successful]
  const targetWei = toBig(proposal ? (proposal as any)[2] : 0n);
  const raisedWei = toBig(proposal ? (proposal as any)[4] : 0n);
  const finalized = proposal ? ((proposal as any)[6] as boolean) : false;
  const successful = proposal ? ((proposal as any)[7] as boolean) : false;
  const metadataURI = propCfg ? ((propCfg as any)[4] as string) : undefined;
  const sharePriceWei = toBig(propCfg ? (propCfg as any)[2] : 0n);
  const maxShares = toBig(propCfg ? (propCfg as any)[1] : 0n);

  const targetEth = formatEther(targetWei);
  const raisedEth = formatEther(raisedWei);
  const sharePriceEth = formatEther(sharePriceWei);
  const progress = targetWei > 0n ? Number((raisedWei * 100n) / targetWei) : 0;
  const status = finalized ? (successful ? "Successful" : "Failed") : "Funding";

  const meta = usePropertyMetadata(metadataURI);
  const label = meta.label || (propCfg ? ((propCfg as any)[4] as string) : "");
  const img = meta.images[0] || images[0] || "https://images.pexels.com/photos/1115804/pexels-photo-1115804.jpeg?auto=compress&cs=tinysrgb&w=800";

  return (
    <Link
      href={`/property/${encodeURIComponent(label || propertyId.toString())}`}
      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-white hover:shadow-lg hover:scale-[1.02] transition-all"
    >
      <div className="h-40 w-full overflow-hidden">
        <img src={img} alt={label} className="h-full w-full object-cover" />
      </div>
      <div className="p-3 space-y-2">
        <div className="flex justify-between items-start gap-2">
          <h2 className="text-sm font-semibold line-clamp-2">{label}</h2>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${status === "Funding" ? "border-blaze/40 text-blaze" : "border-deepSea/30 text-deepSea"} bg-deepSea/5`}>
            {status}
          </span>
        </div>
        <p className="text-[11px] text-mirage/60">
          {sharePriceEth} ETH / share • Max {maxShares.toString()} shares
        </p>
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-mirage/70">
            <span>
              {raisedEth} / {targetEth} ETH
            </span>
            <span>{progress.toFixed(1)}%</span>
          </div>
          <div className="relative h-1.5 w-full rounded-full bg-mirage/10 overflow-hidden">
            <div className="h-full bg-deepSea" style={{ width: `${Math.min(progress, 100)}%` }} />
            <span className="absolute inset-0 text-[9px] text-white/90 flex items-center justify-center pointer-events-none">
              {progress.toFixed(1)}% funded
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function useLocalImages(propertyId: bigint) {
  const [imgs, setImgs] = useState<string[]>([]);
  useEffect(() => {
    try {
      setImgs(getPropertyImages(propertyId));
    } catch {}
  }, [propertyId]);
  return imgs;
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
      // If plain text, treat as label
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
