"use client";

import { useEffect, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import type { Address, PublicClient } from "viem";
import {
  fetchAllPropertySummaries,
  fetchUserPortfolio,
  fetchUserRentToOwnAgreements,
  type PropertySummary,
  type UserHolding
} from "../lib/indexer";

export type PortfolioEntry = UserHolding & { property: PropertySummary | null };

export function usePortfolio() {
  const { address } = useAccount();
  const publicClient = usePublicClient() as PublicClient | undefined;

  const [positions, setPositions] = useState<PortfolioEntry[]>([]);
  const [properties, setProperties] = useState<PropertySummary[]>([]);
  const [rtoAgreements, setRtoAgreements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!address || !publicClient) return;
      setLoading(true);
      setError(null);

      try {
        const [holdings, props, rto] = await Promise.all([
          fetchUserPortfolio(publicClient, address as Address),
          fetchAllPropertySummaries(publicClient),
          fetchUserRentToOwnAgreements(publicClient, address as Address)
        ]);

        if (cancelled) return;

        const map = new Map<bigint, PropertySummary>();
        for (const p of props) map.set(p.propertyId, p);

        const entries: PortfolioEntry[] = holdings.map((h) => ({
          ...h,
          property: map.get(h.propertyId) ?? null
        }));

        setPositions(entries);
        setProperties(props);
        setRtoAgreements(rto);
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? "Failed to load portfolio");
        setPositions([]);
        setProperties([]);
        setRtoAgreements([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [address, publicClient]);

  return { address, positions, properties, rtoAgreements, loading, error };
}
