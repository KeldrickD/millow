"use client";

import { useAccount } from "wagmi";
import { base, baseSepolia } from "viem/chains";

export default function NetworkBadge() {
  const { chainId } = useAccount();

  let label = "Not connected";
  let tone: "testnet" | "mainnet" | "wrong" | "disconnected" = "disconnected";

  if (chainId) {
    if (chainId === base.id) {
      label = "Base Mainnet";
      tone = "mainnet";
    } else if (chainId === baseSepolia.id) {
      label = "Base Sepolia • TESTNET";
      tone = "testnet";
    } else {
      label = "Wrong network";
      tone = "wrong";
    }
  }

  const bg =
    tone === "mainnet"
      ? "bg-deepSea/10 text-deepSea border-deepSea/30"
      : tone === "testnet"
      ? "bg-[#ff5b04]/5 text-[#ff5b04] border-[#ff5b04]/40"
      : tone === "wrong"
      ? "bg-red-50 text-red-600 border-red-200"
      : "bg-mirage/5 text-mirage/60 border-mirage/10";

  return (
    <div
      className={`hidden md:flex items-center gap-1 px-2 py-1 rounded-full text-[10px] border ${bg}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      <span>{label}</span>
    </div>
  );
}

