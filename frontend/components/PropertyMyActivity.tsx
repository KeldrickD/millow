"use client";

import { formatEther, formatUnits } from "viem";
import { useAccount } from "wagmi";
import { useMyPropertyActivity } from "../hooks/useMyPropertyActivity";

export default function PropertyMyActivity({ propertyId }: { propertyId: bigint }) {
  const { address } = useAccount();
  const {
    totalDepositedWei,
    totalYieldClaimed,
    dexBuys,
    dexSells,
    dexNetShares,
    hasAnyActivity,
    loading,
    hasWallet
  } = useMyPropertyActivity(propertyId);

  if (!hasWallet) {
    return (
      <Card>
        <Title>My activity</Title>
        <p className="text-xs text-mirage/70">Connect your wallet to see how you’ve interacted with this property.</p>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <Title>My activity</Title>
        <p className="text-xs text-mirage/70">Loading your on-chain activity…</p>
      </Card>
    );
  }

  if (!hasAnyActivity) {
    return (
      <Card>
        <Title>My activity</Title>
        <p className="text-xs text-mirage/70">You haven’t backed, traded, or claimed rent on this property yet.</p>
        <p className="mt-1 text-[11px] text-mirage/60">
          Use <span className="font-semibold">Back this deal</span> or the DEX panel to get exposure.
        </p>
      </Card>
    );
  }

  const depositedEth =
    totalDepositedWei > 0n ? Number(formatEther(totalDepositedWei)).toFixed(4) : "0.0000";
  const claimedUsdc =
    totalYieldClaimed > 0n ? Number(formatUnits(totalYieldClaimed, 6)).toFixed(2) : "0.00";

  return (
    <Card>
      <div className="flex items-center justify-between">
        <Title>My activity</Title>
        {address && <span className="text-[10px] text-mirage/50 font-mono">{shorten(address)}</span>}
      </div>

      <div className="grid grid-cols-2 gap-3 mt-2">
        <ActivityStat
          label="Backed this deal"
          value={`${depositedEth} ETH`}
          helper="Total ETH you locked into escrow."
        />
        <ActivityStat
          label="DEX trades"
          value={`${dexBuys} buys • ${dexSells} sells`}
          helper={
            dexNetShares === 0n
              ? "Net position unchanged from trading."
              : dexNetShares > 0n
              ? `Net +${dexNetShares.toString()} shares via trading.`
              : `Net ${dexNetShares.toString()} shares (sold more than bought).`
          }
        />
        <ActivityStat
          label="Rent claimed"
          value={`${claimedUsdc} USDC`}
          helper="Total rent you’ve withdrawn from this property."
        />
        <ActivityStat label="Overall engagement" value="Active" helper="You’ve already interacted with this asset." />
      </div>
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-3xl border border-white bg-white p-4 shadow-sm text-mirage/80">{children}</div>;
}

function Title({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-semibold text-mirage">{children}</p>;
}

function ActivityStat({
  label,
  value,
  helper
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="rounded-2xl border border-white bg-mirage/2 px-3 py-2">
      <p className="text-[10px] text-mirage/50">{label}</p>
      <p className="text-xs font-semibold text-mirage mt-0.5">{value}</p>
      {helper && <p className="text-[10px] text-mirage/50 mt-0.5">{helper}</p>}
    </div>
  );
}

function shorten(addr: string) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

