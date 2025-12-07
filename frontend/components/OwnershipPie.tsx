"use client";

import { useAccount, useReadContract } from "wagmi";
import { PROPERTY_ADDRESS, propertyAbi } from "../lib/contracts";

export default function OwnershipPie({ propertyId }: { propertyId: bigint }) {
  const { address } = useAccount();

  const { data: totalSupply } = useReadContract({
    address: PROPERTY_ADDRESS,
    abi: propertyAbi,
    functionName: "totalSupply",
    args: [propertyId],
  } as any);

  const { data: userBal } = useReadContract({
    address: PROPERTY_ADDRESS,
    abi: propertyAbi,
    functionName: "balanceOf",
    args: [address ?? "0x0000000000000000000000000000000000000000", propertyId],
    query: { enabled: !!address },
  } as any);

  const total = BigInt(totalSupply ?? 0n);
  const yours = BigInt(userBal ?? 0n);
  const others = total > yours ? total - yours : 0n;
  const yourPct = total > 0n ? Number((yours * 10000n) / total) / 100 : 0;

  return (
    <section className="space-y-3 rounded-3xl border border-white bg-white p-4">
      <h2 className="text-sm font-semibold text-mirage">Ownership</h2>
      <div className="flex items-center gap-4">
        <div className="relative h-20 w-20">
          <div
            className="h-full w-full rounded-full"
            style={{
              backgroundImage: `conic-gradient(#FF5B04 ${yourPct}%, #075056 ${yourPct}% 100%)`,
            }}
          />
          <div className="absolute inset-3 flex items-center justify-center rounded-full bg-wildSand text-[11px] font-semibold text-mirage">
            {yourPct.toFixed(1)}%
          </div>
        </div>
        <div className="flex-1 space-y-1 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blaze" />
            <span className="font-semibold text-mirage/85">You</span>
            <span className="ml-auto font-mono text-mirage/70">{yours.toString()} shares</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-deepSea" />
            <span className="font-semibold text-mirage/85">Others</span>
            <span className="ml-auto font-mono text-mirage/70">{others.toString()} shares</span>
          </div>
        </div>
      </div>
      <p className="text-[10px] text-mirage/55">
        Snapshot from ERC-1155 balances. Full holder breakdown would require an indexer/subgraph.
      </p>
    </section>
  );
}


