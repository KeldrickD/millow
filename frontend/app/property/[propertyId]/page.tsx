"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useReadContract } from "wagmi";
import { formatEther } from "viem";
import { idFromPropertyKey } from "../../../lib/slug";
import {
  PROPERTY_ADDRESS,
  VOTE_ESCROW_ADDRESS,
  propertyAbi,
  voteEscrowAbi,
} from "../../../lib/contracts";
import { fetchIpfsJson, ipfsToHttp } from "../../../lib/ipfs";
import { getPropertyImages } from "../../../lib/listingMedia";
import OneClickDepositButton from "../../../components/OneClickDepositButton";
import EscrowActions from "../../../components/EscrowActions";
import InvestorPosition from "../../../components/InvestorPosition";
import FinancialSection from "../../../components/FinancialSection";
import OwnershipPie from "../../../components/OwnershipPie";
import ActivityFeed from "../../../components/ActivityFeed";
import RentToOwnPanel from "../../../components/RentToOwnPanel";
import PropertyGovernancePanel from "../../../components/PropertyGovernancePanel";
import PropertyDexPanel from "../../../components/PropertyDexPanel";
import PropertyMyActivity from "../../../components/PropertyMyActivity";

type PropertyMeta = {
  label: string;
  description?: string;
  images: string[];
  attributes?: {
    targetEth?: string;
    sharePriceEth?: string;
    maxShares?: string;
    yieldBps?: string;
    days?: string;
  };
};

export default function PropertyPage() {
  const params = useParams();
  const rawParam = decodeURIComponent(String(params?.propertyId || "1"));

  let propertyId: bigint;
  if (rawParam.startsWith("0x")) propertyId = BigInt(rawParam);
  else if (/[^0-9]/.test(rawParam)) propertyId = idFromPropertyKey(rawParam);
  else propertyId = BigInt(Number(rawParam || 1));

  const slugLabel = /[^0-9]/.test(rawParam) ? rawParam : "";

  const { data: propCfg } = useReadContract({
    address: PROPERTY_ADDRESS,
    abi: propertyAbi,
    functionName: "properties",
    args: [propertyId],
  } as any);

  const { data: proposal } = useReadContract({
    address: VOTE_ESCROW_ADDRESS,
    abi: voteEscrowAbi,
    functionName: "getProposal",
    args: [propertyId],
  } as any);

  let maxShares = 0n;
  let sharePriceWei = 0n;
  let yieldBps = 0;
  let metadataURI = "";

  if (propCfg && Array.isArray(propCfg)) {
    maxShares = propCfg[1] as bigint;
    sharePriceWei = propCfg[2] as bigint;
    yieldBps = Number(propCfg[3] ?? 0);
    metadataURI = propCfg[4] as string;
  }

  let targetWei = 0n;
  let raisedWei = 0n;
  let fundingDeadline = 0n;
  let finalized = false;
  let successful = false;

  if (proposal && Array.isArray(proposal)) {
    targetWei = toBig((proposal as any)[2]);
    raisedWei = toBig((proposal as any)[4]);
    fundingDeadline = proposal[5] as bigint;
    finalized = proposal[6] as boolean;
    successful = proposal[7] as boolean;
  }

  const meta = usePropertyMetadata(metadataURI);
  const localImages = useLocalImages(propertyId);
  const label = meta.label || slugLabel || `Property #${propertyId.toString()}`;
  const images = meta.images.length > 0 ? meta.images : localImages;
  const displayLabel = label;
  const heroImage =
    images[0] ??
    "https://images.pexels.com/photos/259588/pexels-photo-259588.jpeg?auto=compress&cs=tinysrgb&w=1200";

  const chainSharePriceEth = sharePriceWei > 0n ? formatEther(sharePriceWei) : "";
  const chainTargetEth = targetWei > 0n ? formatEther(targetWei) : "";
  const chainRaisedEth = formatEther(raisedWei);

  const metaTargetEth = meta.targetEth;
  const metaSharePriceEth = meta.sharePriceEth;
  const metaMaxShares = meta.maxShares;

  const uiTargetEth = metaTargetEth && metaTargetEth !== "0" ? metaTargetEth : chainTargetEth || "–";
  const uiSharePriceEth = metaSharePriceEth && metaSharePriceEth !== "0" ? metaSharePriceEth : chainSharePriceEth || "0";
  const uiMaxShares =
    typeof metaMaxShares === "number" && !Number.isNaN(metaMaxShares)
      ? String(metaMaxShares)
      : maxShares > 0n
      ? maxShares.toString()
      : "–";
  const uiRaisedEth = chainRaisedEth || "0";

  const displayTargetEth = uiTargetEth;
  const displaySharePrice = uiSharePriceEth;
  const displayMaxShares = uiMaxShares;
  const displayYieldBps = yieldBps ? `${yieldBps} bps` : meta.yieldBps ? `${meta.yieldBps} bps` : "–";

  const progress =
    uiTargetEth && uiTargetEth !== "–"
      ? (() => {
          try {
            const t = parseFloat(uiTargetEth);
            const r = parseFloat(uiRaisedEth);
            if (!t || t <= 0) return 0;
            return Math.min((r / t) * 100, 100);
          } catch {
            return 0;
          }
        })()
      : 0;

  const deadlineDate = fundingDeadline > 0n ? new Date(Number(fundingDeadline) * 1000) : null;
  const deadlineMs = deadlineDate ? deadlineDate.getTime() : null;

  const sharePriceMismatch = chainSharePriceEth && metaSharePriceEth && chainSharePriceEth !== metaSharePriceEth;
  const maxSharesMismatch =
    maxShares > 0n && metaMaxShares !== undefined && maxShares.toString() !== String(metaMaxShares);
  const hasConfigMismatch = sharePriceMismatch || maxSharesMismatch;
  const sharePriceMissingOnChain = sharePriceWei === 0n;

  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  useEffect(() => {
    if (!deadlineMs || finalized) {
      setTimeLeft(null);
      return;
    }

    function update() {
      const diff = deadlineMs - Date.now();
      if (diff <= 0) {
        setTimeLeft("Ended");
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (diff / (1000 * 60 * 60)) % 24
      );
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      setTimeLeft(`${days}d ${hours}h ${minutes}m`);
    }

    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [deadlineMs, finalized]);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  function openAt(i: number) {
    if (!images.length) return;
    setLightboxIndex(i);
    setLightboxOpen(true);
  }
  function prev() {
    if (!images.length) return;
    setLightboxIndex((i) => (i - 1 + images.length) % images.length);
  }
  function next() {
    if (!images.length) return;
    setLightboxIndex((i) => (i + 1) % images.length);
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <section className="space-y-4 md:space-y-5">
        <div className="overflow-hidden rounded-3xl bg-mirage/10">
          <button
            type="button"
            className="relative block h-60 w-full md:h-80"
            onClick={() => openAt(0)}
            aria-label="Open gallery"
          >
            <Image
              src={heroImage}
              alt={displayLabel}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 80vw"
            />
          </button>
        </div>
        <div>
          <h1 className="text-xl font-bold text-mirage md:text-3xl flex items-center gap-2 flex-wrap">
            {label || `Property #${propertyId.toString()}`}
            {hasConfigMismatch && (
              <span className="inline-flex items-center rounded-full bg-blazeOrange/10 px-2 py-0.5 text-[10px] font-medium text-blazeOrange">
                On-chain config differs from listing
              </span>
            )}
          </h1>
          <p className="mt-1 text-[11px] text-mirage/60">
            Tokenized deal on Base • ERC-1155 ID:{" "}
            <span className="font-mono">
              {propertyId.toString().slice(0, 12)}…
            </span>
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs md:grid-cols-4">
          <Stat label="Target raise" value={`${uiTargetEth} ETH`} />
          <Stat
            label="Share price"
            value={`${uiSharePriceEth} ETH / share`}
          />
          <Stat label="Max shares" value={uiMaxShares} />
          <Stat
            label="Funding deadline"
            value={
              deadlineDate
                ? deadlineDate.toLocaleDateString()
                : "TBD"
            }
          />
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]">
        <div className="space-y-4 md:space-y-5">
          <div className="space-y-3 rounded-3xl border border-white bg-white p-4">
            <h2 className="text-sm font-semibold text-mirage">
              Property details
            </h2>
            <p className="text-xs leading-relaxed text-mirage/75 whitespace-pre-line">
              {meta.description || "No description provided."}
            </p>
          </div>

          <FinancialSection
            targetEth={displayTargetEth}
            sharePriceEth={displaySharePrice}
            maxShares={displayMaxShares}
            estYieldBps={displayYieldBps}
          />

          <OwnershipPie propertyId={propertyId} />
        </div>

        <div className="space-y-4 md:space-y-5">
          <aside className="space-y-4 rounded-3xl border border-white bg-white p-4 shadow-sm">
            <div className="space-y-1">
              <p className="text-[11px] text-mirage/60">Deal status</p>
              <p className="text-sm font-semibold text-mirage">
                {finalized
                  ? successful
                    ? "✅ Successful"
                    : "❌ Failed"
                  : "⏳ Funding in progress"}
              </p>
              {timeLeft && (
                <p className="text-[11px] text-mirage/60">
                  Time remaining:{" "}
                  <span className="font-semibold text-mirage">
                    {timeLeft}
                  </span>
                </p>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[11px] text-mirage/70">
                <span>
                  {uiRaisedEth} / {uiTargetEth} ETH raised
                </span>
                <span>{progress.toFixed(1)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-mirage/10">
                <div
                  className="h-full bg-deepSea transition-all"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            </div>
            <OneClickDepositButton
              propertyId={propertyId}
              sharePriceWei={sharePriceWei}
              finalized={finalized}
              successful={successful}
              targetWei={targetWei}
              raisedWei={raisedWei}
              sharePriceMissingOnChain={sharePriceMissingOnChain}
            />
            <EscrowActions propertyId={propertyId} />
          </aside>

          <InvestorPosition propertyId={propertyId} />

          <PropertyMyActivity propertyId={propertyId} />

          <RentToOwnPanel propertyId={propertyId} />

          <PropertyDexPanel propertyId={propertyId} />
          <PropertyGovernancePanel propertyId={propertyId} />

          <ActivityFeed propertyId={propertyId} />
        </div>
      </section>

      {lightboxOpen && images.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-mirage/70 px-3 py-1 text-xs text-white hover:bg-mirage/90"
            onClick={() => setLightboxOpen(false)}
          >
            Close
          </button>
          <button
            type="button"
            className="absolute left-3 text-3xl text-white/80 md:left-8"
            onClick={prev}
            aria-label="Previous photo"
          >
            ‹
          </button>
          <div className="relative w-[90vw] h-[80vh] max-w-[90vw] max-h-[80vh]">
            <Image
              src={images[lightboxIndex]}
              alt={`${displayLabel} ${lightboxIndex + 1}`}
              fill
              className="rounded-2xl object-contain shadow-2xl"
              sizes="90vw"
              unoptimized
            />
          </div>
          <button
            type="button"
            className="absolute right-3 text-3xl text-white/80 md:right-8"
            onClick={next}
            aria-label="Next photo"
          >
            ›
          </button>
          <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-2">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setLightboxIndex(i)}
                className={`h-2 w-2 rounded-full ${
                  i === lightboxIndex ? "bg-white" : "bg-white/40"
                }`}
                aria-label={`Go to image ${i + 1}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white bg-white px-3 py-2">
      <p className="text-[10px] text-mirage/50">{label}</p>
      <p className="text-xs font-semibold text-mirage">{value}</p>
    </div>
  );
}

function toBig(v: any): bigint {
  if (typeof v === "bigint") return v;
  if (v === null || v === undefined) return 0n;
  try {
    return BigInt(v as any);
  } catch {
    return 0n;
  }
}

function useLocalImages(propertyId: bigint) {
  const [imgs, setImgs] = useState<string[]>([]);
  useEffect(() => {
    try {
      setImgs(getPropertyImages(propertyId));
    } catch {
      setImgs([]);
    }
  }, [propertyId]);
  return imgs;
}

function usePropertyMetadata(metadataURI: string | undefined) {
  const [data, setData] = useState<{
    label: string;
    images: string[];
    description?: string;
    targetEth?: string;
    sharePriceEth?: string;
    maxShares?: number;
    days?: number;
  }>({
    label: "",
    images: [],
  });

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!metadataURI) return;

      // Plain string (used as label only)
      if (!/^ipfs:|^https?:/i.test(metadataURI)) {
        if (!cancelled) {
          setData((prev) => ({
            ...prev,
            label: metadataURI,
          }));
        }
        return;
      }

      try {
        const json = await fetchIpfsJson<any>(metadataURI);

        const images = Array.isArray(json.images) ? json.images.map((u: string) => ipfsToHttp(u)) : [];

        const label = String(json.label ?? json.name ?? "");
        const description = typeof json.description === "string" ? json.description : undefined;

        const targetEth =
          typeof json.targetEth === "string" || typeof json.targetEth === "number" ? String(json.targetEth) : undefined;

        const sharePriceEth =
          typeof json.sharePriceEth === "string" || typeof json.sharePriceEth === "number"
            ? String(json.sharePriceEth)
            : undefined;

        const maxShares =
          typeof json.maxShares === "number"
            ? json.maxShares
            : typeof json.maxShares === "string"
            ? Number(json.maxShares)
            : undefined;

        const days =
          typeof json.days === "number"
            ? json.days
            : typeof json.days === "string"
            ? Number(json.days)
            : undefined;

        if (!cancelled) {
          setData({
            label,
            images,
            description,
            targetEth,
            sharePriceEth,
            maxShares,
            days,
          });
        }
      } catch {
        if (!cancelled) {
          setData({
            label: "",
            images: [],
          });
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [metadataURI]);

  return data;
}


