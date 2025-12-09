"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { base, baseSepolia } from "viem/chains";
import { createPublicClient, http } from "viem";
import { fetchGlobalActivity, type ActivityItem } from "../lib/indexer";

type Bigish = bigint;

export interface MyPropertyActivity {
  totalDepositedWei: Bigish;
  totalYieldClaimed: Bigish;
  dexBuys: number;
  dexSells: number;
  dexNetShares: Bigish;
  hasAnyActivity: boolean;
}

const EMPTY_ACTIVITY: MyPropertyActivity = {
  totalDepositedWei: 0n,
  totalYieldClaimed: 0n,
  dexBuys: 0,
  dexSells: 0,
  dexNetShares: 0n,
  hasAnyActivity: false
};

export function useMyPropertyActivity(propertyId: bigint) {
  const { address, chainId } = useAccount();
  const [activity, setActivity] = useState<MyPropertyActivity>(EMPTY_ACTIVITY);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) {
      setActivity(EMPTY_ACTIVITY);
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

        const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL ?? "https://sepolia.base.org";

        const client = createPublicClient({
          chain,
          transport: http(rpcUrl)
        }) as any;

        const events: ActivityItem[] = await fetchGlobalActivity(client);
        const perProperty = events.filter(
          (evt) => evt.propertyId !== undefined && BigInt(evt.propertyId) === propertyId
        );

        let totalDepositedWei: Bigish = 0n;
        let totalYieldClaimed: Bigish = 0n;
        let dexBuys = 0;
        let dexSells = 0;
        let dexNetShares: Bigish = 0n;

        const addrLc = address.toLowerCase();

        for (const evt of perProperty) {
          switch (evt.kind) {
            case "deposit": {
              const investor = (evt.args?.investor ?? evt.args?.user ?? "") as string;
              if (investor && investor.toLowerCase() === addrLc) {
                const amt = evt.args?.amountWei ?? evt.args?.amount ?? 0n;
                try {
                  totalDepositedWei += typeof amt === "bigint" ? amt : BigInt(amt);
                } catch {
                  /* noop */
                }
              }
              break;
            }
            case "yield-claimed": {
              const user = (evt.args?.user ?? "") as string;
              if (user && user.toLowerCase() === addrLc) {
                const amt = evt.args?.amount ?? 0n;
                try {
                  totalYieldClaimed += typeof amt === "bigint" ? amt : BigInt(amt);
                } catch {
                  /* noop */
                }
              }
              break;
            }
            case "dex_buy": {
              const trader = (evt.args?.trader ?? "") as string;
              if (trader && trader.toLowerCase() === addrLc) {
                dexBuys += 1;
                const sharesOut = evt.args?.sharesOut ?? 0n;
                try {
                  dexNetShares += typeof sharesOut === "bigint" ? sharesOut : BigInt(sharesOut);
                } catch {
                  /* noop */
                }
              }
              break;
            }
            case "dex_sell": {
              const trader = (evt.args?.trader ?? "") as string;
              if (trader && trader.toLowerCase() === addrLc) {
                dexSells += 1;
                const sharesIn = evt.args?.sharesIn ?? 0n;
                try {
                  dexNetShares -= typeof sharesIn === "bigint" ? sharesIn : BigInt(sharesIn);
                } catch {
                  /* noop */
                }
              }
              break;
            }
            default:
              break;
          }
        }

        const hasAnyActivity =
          totalDepositedWei > 0n || totalYieldClaimed > 0n || dexBuys > 0 || dexSells > 0;

        if (!cancelled) {
          setActivity({
            totalDepositedWei,
            totalYieldClaimed,
            dexBuys,
            dexSells,
            dexNetShares,
            hasAnyActivity
          });
        }
      } catch {
        if (!cancelled) {
          setActivity(EMPTY_ACTIVITY);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [address, chainId, propertyId.toString()]);

  return { ...activity, loading, hasWallet: !!address };
}

