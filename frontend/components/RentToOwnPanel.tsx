"use client";

import { useEffect, useState } from "react";
import { formatUnits } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import { useRentToOwnAgreement } from "../hooks/useRentToOwnAgreement";
import { fetchRentToOwnAgreementsForProperty } from "../lib/indexer";

export default function RentToOwnPanel({ propertyId }: { propertyId: bigint }) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [agreementId, setAgreementId] = useState<bigint | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!publicClient) return;
      try {
        setLoading(true);
        setLoadError(null);
        const agreements = await fetchRentToOwnAgreementsForProperty(publicClient as any, propertyId);
        if (cancelled) return;
        if (agreements.length > 0) {
          const latest = agreements[agreements.length - 1];
          setAgreementId(latest.agreementId);
        } else {
          setAgreementId(null);
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError("Failed to load rent-to-own data.");
          setAgreementId(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [propertyId, publicClient]);

  const {
    agreement,
    totalPayments,
    paymentsMade,
    equityPerPayment,
    totalEquity,
    progress,
    pay,
    txPending
  } = useRentToOwnAgreement(agreementId ?? undefined);

  if (loading) {
    return (
      <aside className="bg-white rounded-3xl border border-white p-4 text-xs text-mirage/70">
        Loading rent-to-own plan…
      </aside>
    );
  }

  if (loadError || !agreementId || !agreement) {
    return (
      <aside className="bg-white rounded-3xl border border-white p-4 text-xs text-mirage/60">
        <p className="font-semibold text-sm mb-1">Rent-to-own</p>
        <p>No active rent-to-own plan is configured for this property yet.</p>
      </aside>
    );
  }

  const paymentAmount = (agreement as any).paymentAmount as bigint;
  const paymentAmountDisplay = `${formatUnits(paymentAmount, 6)} USDC`;
  const active: boolean = (agreement as any).active;
  const terminated: boolean = (agreement as any).terminated;

  const statusLabel = terminated ? "Terminated" : !active ? "Completed" : "Active";

  const canPay = active && !terminated && !!address && !txPending;

  return (
    <aside className="bg-white rounded-3xl border border-white p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-mirage/50">Rent-to-own plan</p>
          <p className="text-sm font-semibold text-mirage">{paymentAmountDisplay} / payment</p>
        </div>
        <span className="text-[10px] px-2 py-1 rounded-full bg-mirage/5 text-mirage/70 border border-mirage/10">
          {statusLabel}
        </span>
      </div>

      <div className="space-y-1 text-[11px] text-mirage/70">
        <p>
          Payments: <span className="font-semibold text-mirage">{paymentsMade} / {totalPayments}</span>
        </p>
        <p>
          Equity per payment: <span className="font-semibold text-mirage">{equityPerPayment} shares</span>
        </p>
        <p>
          Total equity so far: <span className="font-semibold text-mirage">{totalEquity} shares</span>
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-[11px] text-mirage/70">
          <span>Progress toward full ownership</span>
          <span>{progress.toFixed(1)}%</span>
        </div>
        <div className="h-2 w-full bg-mirage/10 rounded-full overflow-hidden">
          <div className="h-full bg-deepSea" style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
      </div>

      <button
        type="button"
        disabled={!canPay}
        onClick={() => pay()}
        className={`w-full text-xs font-semibold rounded-full px-4 py-2 transition ${
          canPay ? "bg-blaze text-white hover:brightness-110" : "bg-mirage/10 text-mirage/40 cursor-not-allowed"
        }`}
      >
        {txPending ? "Processing payment…" : "Pay next installment"}
      </button>

      {!address && <p className="text-[10px] text-mirage/50">Connect a wallet as the tenant to make payments.</p>}
      <p className="text-[10px] text-mirage/50">
        You must approve this contract to spend your USDC before the first payment (see Sim tools or your wallet approvals).
      </p>
    </aside>
  );
}

