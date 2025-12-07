"use client";

import { useState } from "react";
import { useAccount, useChainId, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { PROPERTY_DEX_ADDRESS, propertyDexAbi, USDC_ADDRESS, erc20Abi } from "../lib/contracts";

type Props = { propertyId: bigint };

export default function PropertyDexPanel({ propertyId }: Props) {
  const chainId = useChainId();
  const { address } = useAccount();
  const isWrongNetwork = !isBaseNetwork(chainId);

  const { data: pool } = useReadContract({
    address: PROPERTY_DEX_ADDRESS,
    abi: propertyDexAbi,
    functionName: "getPool",
    args: [propertyId],
    query: {
      enabled:
        PROPERTY_DEX_ADDRESS !==
        "0x0000000000000000000000000000000000000000"
    }
  } as any);

  const { data: usdcBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  } as any);

  const { data: usdcAllowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "allowance",
    args: address ? [address, PROPERTY_DEX_ADDRESS] : undefined,
    query: { enabled: !!address }
  } as any);

  const [buyAmount, setBuyAmount] = useState("");
  const [sellAmount, setSellAmount] = useState("");

  const { writeContract: writeDex, data: txHash, isPending: txPending } = useWriteContract();
  const { isLoading: txConfirming } = useWaitForTransactionReceipt({ hash: txHash });

  const { writeContract: writeUsdc, data: approveHash, isPending: approvePending } = useWriteContract();
  const { isLoading: approveConfirming } = useWaitForTransactionReceipt({ hash: approveHash });

  if (
    !pool ||
    (Array.isArray(pool) && pool[0] === false) ||
    PROPERTY_DEX_ADDRESS === "0x0000000000000000000000000000000000000000"
  ) {
    return (
      <section className="bg-white rounded-3xl border border-white p-4 space-y-2">
        <p className="text-sm font-semibold text-mirage">Secondary market</p>
        <p className="text-[11px] text-mirage/60">
          No liquidity pool exists for this property yet. When the protocol seeds a pool, you’ll be able to trade shares here.
        </p>
      </section>
    );
  }

  const [exists, , shareReserve, stableReserve, feeBps] = pool as any;
  const stableReserveF = Number(formatUnits(stableReserve as bigint, 6));
  const shareReserveF = Number(shareReserve as bigint);
  const pricePerShare = shareReserveF > 0 ? stableReserveF / shareReserveF : undefined;
  const hasAllowance = usdcAllowance && (usdcAllowance as bigint) > 0n;
  const disabled = !address || isWrongNetwork || txPending || txConfirming || approvePending || approveConfirming;

  const handleApprove = () => {
    if (!address) return;
    const amt = parseUnits("1000000", 6);
    writeUsdc({
      address: USDC_ADDRESS,
      abi: erc20Abi,
      functionName: "approve",
      args: [PROPERTY_DEX_ADDRESS, amt]
    });
  };

  const handleBuy = () => {
    if (!buyAmount.trim()) return;
    const amt = parseUnits(buyAmount, 6);
    writeDex({
      address: PROPERTY_DEX_ADDRESS,
      abi: propertyDexAbi,
      functionName: "swapStableForShares",
      args: [propertyId, amt, 0n]
    });
  };

  const handleSell = () => {
    if (!sellAmount.trim()) return;
    const sharesIn = BigInt(sellAmount);
    writeDex({
      address: PROPERTY_DEX_ADDRESS,
      abi: propertyDexAbi,
      functionName: "swapSharesForStable",
      args: [propertyId, sharesIn, 0n]
    });
  };

  return (
    <section className="bg-white rounded-3xl border border-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-mirage">Secondary market</p>
          <p className="text-[11px] text-mirage/60">Trade your shares against protocol-supplied USDC liquidity.</p>
        </div>
        {isWrongNetwork && (
          <span className="text-[10px] px-2 py-1 rounded-full bg-mirage/5 text-mirage/60 border border-mirage/10">
            Switch to Base Sepolia/Mainnet to trade
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 text-[11px]">
        <MetricCard label="Pool USDC" value={`${stableReserveF.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC`} />
        <MetricCard label="Pool shares" value={shareReserveF.toLocaleString()} />
        <MetricCard label="Implied price" value={pricePerShare ? `${pricePerShare.toFixed(2)} USDC / share` : "–"} />
        <MetricCard label="Pool fee" value={`${(feeBps as number) / 100}% per swap`} />
      </div>

      {address && (
        <p className="text-[10px] text-mirage/50">
          Your USDC: {usdcBalance ? Number(formatUnits(usdcBalance as bigint, 6)).toFixed(2) : "0.00"}
        </p>
      )}

      {!hasAllowance && address && (
        <button
          type="button"
          onClick={handleApprove}
          disabled={disabled}
          className="w-full rounded-full bg-deepSea text-white text-[11px] font-semibold py-1.5 hover:bg-deepSea/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {approvePending || approveConfirming ? "Approving…" : "Approve USDC for trading"}
        </button>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
        <div className="space-y-1">
          <p className="font-semibold text-mirage">Buy shares</p>
          <input
            className="w-full rounded-2xl border border-mirage/10 px-3 py-1.5 text-xs outline-none focus:border-blaze"
            placeholder="Amount in USDC (e.g., 250)"
            value={buyAmount}
            onChange={(e) => setBuyAmount(e.target.value)}
          />
          <button
            type="button"
            onClick={handleBuy}
            disabled={disabled || !hasAllowance || !buyAmount.trim()}
            className="w-full rounded-full bg-blaze text-white text-[11px] font-semibold py-1.5 hover:bg-blaze/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {txPending || txConfirming ? "Swapping…" : "Buy with USDC"}
          </button>
        </div>

        <div className="space-y-1">
          <p className="font-semibold text-mirage">Sell shares</p>
          <input
            className="w-full rounded-2xl border border-mirage/10 px-3 py-1.5 text-xs outline-none focus:border-blaze"
            placeholder="Shares to sell (e.g., 10)"
            value={sellAmount}
            onChange={(e) => setSellAmount(e.target.value)}
          />
          <button
            type="button"
            onClick={handleSell}
            disabled={disabled || !sellAmount.trim()}
            className="w-full rounded-full bg-mirage/90 text-white text-[11px] font-semibold py-1.5 hover:bg-mirage disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {txPending || txConfirming ? "Swapping…" : "Sell for USDC"}
          </button>
        </div>
      </div>
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-mirage/2 rounded-2xl px-3 py-2">
      <p className="text-mirage/50">{label}</p>
      <p className="text-mirage font-semibold mt-0.5">{value}</p>
    </div>
  );
}

function isBaseNetwork(chainId?: number) {
  if (!chainId) return false;
  return chainId === 8453 || chainId === 84532;
}

