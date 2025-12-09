"use client";

import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { formatUnits } from "viem";
import { PROPERTY_ADDRESS, propertyAbi, PROPERTY_DEX_ADDRESS, propertyDexAbi } from "../lib/contracts";

export type DexMetrics = {
  hasPool: boolean;
  impliedPriceUsdc?: number;
  impliedMarketCapUsdc?: number;
  shareReserve: bigint;
  stableReserve: bigint;
};

export function useDexMetrics(propertyId: bigint) {
  const publicClient = usePublicClient();
  const [metrics, setMetrics] = useState<DexMetrics | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!publicClient) return;
      if (!PROPERTY_DEX_ADDRESS || PROPERTY_DEX_ADDRESS === "0x0000000000000000000000000000000000000000") {
        setMetrics({ hasPool: false, shareReserve: 0n, stableReserve: 0n });
        return;
      }
      try {
        const pool = await (publicClient as any).readContract({
          address: PROPERTY_DEX_ADDRESS,
          abi: propertyDexAbi,
          functionName: "getPool",
          args: [propertyId],
          chainId: publicClient.chain?.id
        });
        const exists = pool[0] as boolean;
        const shareReserve = pool[2] as bigint;
        const stableReserve = pool[3] as bigint;
        if (!exists || shareReserve === 0n || stableReserve === 0n) {
          if (!cancelled) setMetrics({ hasPool: false, shareReserve, stableReserve });
          return;
        }
        const shareReserveF = Number(shareReserve);
        const stableReserveF = Number(formatUnits(stableReserve, 6));
        const impliedPriceUsdc = shareReserveF > 0 ? stableReserveF / shareReserveF : undefined;
        const totalSupply = (await (publicClient as any).readContract({
          address: PROPERTY_ADDRESS,
          abi: propertyAbi,
          functionName: "totalSupply",
          args: [propertyId],
          chainId: publicClient.chain?.id
        })) as bigint;
        const impliedMarketCapUsdc = impliedPriceUsdc !== undefined ? impliedPriceUsdc * Number(totalSupply) : undefined;
        if (!cancelled) {
          setMetrics({
            hasPool: true,
            impliedPriceUsdc,
            impliedMarketCapUsdc,
            shareReserve,
            stableReserve
          });
        }
      } catch {
        if (!cancelled) setMetrics({ hasPool: false, shareReserve: 0n, stableReserve: 0n });
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [publicClient, propertyId]);

  return metrics;
}

