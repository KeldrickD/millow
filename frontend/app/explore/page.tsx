"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useReadContract } from "wagmi";
import { VOTE_ESCROW_ADDRESS, voteEscrowAbi, PROPERTY_ADDRESS, propertyAbi } from "../../lib/contracts";
import { formatEther } from "viem";
import { getPropertyImages } from "../../lib/listingMedia";
import { fetchIpfsJson, ipfsToHttp } from "../../lib/ipfs";
import { useDexMetrics } from "../../hooks/useDexMetrics";
import WaitlistBanner from "../../components/WaitlistBanner";

export default function ExplorePage() {
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
      <WaitlistBanner />
      <section className="space-y-3">
        <h1 className="text-3xl md:text-4xl font-bold text-mirage">Explore tokenized deals</h1>
        <p className="text-sm text-mirage/70 max-w-2xl">
          Browse live fractional property offerings on Base. Connect your wallet to back a deal and track your portfolio.
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
        </div>
      </section>

      <section className="space-y-4">
        {ids.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-mirage/15 bg-white p-4">
            <p className="text-sm font-semibold text-mirage">No active deals right now.</p>
            <p className="mt-1 text-[11px] text-mirage/60">
              Check back soon—new tokenized properties will appear here as they go live.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {ids.map((id) => (
              <PropertyCard key={id.toString()} propertyId={id} search={search} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function PropertyCard({ propertyId, search }: { propertyId: bigint; search: string }) {
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
  const dex = useDexMetrics(propertyId);

  const matchesSearch =
    !label ||
    search.trim().length === 0 ||
    label.toLowerCase().includes(search.trim().toLowerCase());
  if (!matchesSearch) return null;

  return (
    <Link
      href={`/property/${encodeURIComponent(label || propertyId.toString())}`}
      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-white hover:shadow-lg hover:scale-[1.02] transition-all"
    >
      <div className="relative h-40 w-full overflow-hidden">
        <Image
          src={img}
          alt={label}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
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
        {dex?.hasPool && dex.impliedPriceUsdc !== undefined && (
          <p className="text-[11px] text-mirage/60">
            Market: {dex.impliedPriceUsdc.toFixed(2)} USDC / share
          </p>
        )}
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
      if (!/^ipfs:|^https?:/i.test(metadataURI)) {
        if (!cancelled) setData({ label: metadataURI, images: [] });
        return;
      }
      try {
        const json = await fetchIpfsJson<any>(metadataURI);
        const images = Array.isArray(json.images) ? json.images.map((u: string) => ipfsToHttp(u)) : [];
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

