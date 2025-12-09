"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { createPublicClient, http } from "viem";
import { base, baseSepolia } from "viem/chains";
import { fetchGlobalActivity, type ActivityItem } from "../lib/indexer";

export function useMyTrades() {
  const { address, chainId } = useAccount();
  const [trades, setTrades] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) {
      setTrades([]);
      return;
    }
    let cancelled = false;
    async function run() {
      setLoading(true);
      try {
        const chain =
          chainId === base.id || chainId === baseSepolia.id
            ? chainId === base.id
              ? base
              : baseSepolia
            : baseSepolia;
        const rpcUrl =
          process.env.NEXT_PUBLIC_RPC_URL ??
          "https://sepolia.base.org";
        const client = createPublicClient({
          chain,
          transport: http(rpcUrl)
        }) as any;

        const events = await fetchGlobalActivity(client);
        const mine = events.filter((evt) => {
          if (evt.kind === "dex_buy") {
            return (evt.args.trader as string).toLowerCase() === address.toLowerCase();
          }
          if (evt.kind === "dex_sell") {
            return (evt.args.trader as string).toLowerCase() === address.toLowerCase();
          }
          return false;
        });
        if (!cancelled) setTrades(mine);
      } catch {
        if (!cancelled) setTrades([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [address, chainId]);

  return { trades, loading, hasWallet: !!address };
}

