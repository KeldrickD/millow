"use client";

import { useAccount, useReadContract } from "wagmi";
import { formatEther, formatUnits } from "viem";
import {
  PROPERTY_ADDRESS,
  VOTE_ESCROW_ADDRESS,
  YIELD_VAULT_ADDRESS,
  propertyAbi,
  voteEscrowAbi,
  yieldVaultAbi
} from "../../lib/contracts";

export default function PortfolioPage() {
  const { address, isConnected } = useAccount();

  const { data: allIds } = useReadContract({
    address: VOTE_ESCROW_ADDRESS,
    abi: voteEscrowAbi as any,
    functionName: "getAllPropertyIds"
  });

  const ids = (allIds as bigint[] | undefined) ?? [];

  if (!isConnected || !address) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-sm text-mirage/70">Connect your wallet to see your portfolio.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 space-y-4">
      <h1 className="text-2xl font-bold">Your Portfolio</h1>
      <p className="text-xs text-mirage/60">Positions where you hold ERC-1155 shares or unclaimed yield.</p>

      <div className="space-y-3">
        {ids.map((id) => (
          <PortfolioRow key={id.toString()} propertyId={id} account={address as `0x${string}`} />
        ))}
      </div>
    </main>
  );
}

function PortfolioRow({ propertyId, account }: { propertyId: bigint; account: `0x${string}` }) {
  const { data: propCfg } = useReadContract({
    address: PROPERTY_ADDRESS,
    abi: propertyAbi as any,
    functionName: "properties",
    args: [propertyId]
  });

  const { data: balanceRaw } = useReadContract({
    address: PROPERTY_ADDRESS,
    abi: propertyAbi as any,
    functionName: "balanceOf",
    args: [account, propertyId]
  });

  const { data: pendingRaw } = useReadContract({
    address: YIELD_VAULT_ADDRESS as `0x${string}`,
    abi: yieldVaultAbi as any,
    functionName: "pendingYield",
    args: [propertyId, account]
  });

  let label = "";
  let sharePriceWei = 0n;
  if (propCfg && Array.isArray(propCfg)) {
    sharePriceWei = (propCfg as any)[2] as bigint;
    label = (propCfg as any)[4] as string;
  }

  const balance = (balanceRaw as bigint | undefined) ?? 0n;
  const pending = (pendingRaw as bigint | undefined) ?? 0n;

  if (balance === 0n && pending === 0n) return null;

  const sharePriceEth = formatEther(sharePriceWei);
  const pendingUsd = formatUnits(pending, 6);

  return (
    <div className="bg-white rounded-2xl border border-white px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-xs">
      <div>
        <p className="font-semibold">{label || `Property #${propertyId}`}</p>
        <p className="text-[11px] text-mirage/60 mt-0.5">
          {balance.toString()} shares • {sharePriceEth} ETH / share
        </p>
      </div>
      <div className="flex gap-6">
        <div>
          <p className="text-[10px] text-mirage/50">Position value (ETH)</p>
          <p className="font-semibold">{formatEther(sharePriceWei * balance)}</p>
        </div>
        <div>
          <p className="text-[10px] text-mirage/50">Unclaimed yield (USDC)</p>
          <p className="font-semibold">{pendingUsd}</p>
        </div>
      </div>
    </div>
  );
}


