"use client";

import { useEffect, useState } from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { baseSepolia } from "wagmi/chains";

export default function NetworkWarning() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();

  if (!mounted) return null;
  const wrong = isConnected && chainId !== undefined && chainId !== baseSepolia.id;
  if (!wrong) return null;

  return (
    <div className="bg-red-50 border-b border-red-200 py-2">
      <div className="mx-auto max-w-5xl px-4 text-xs text-red-700 flex items-center justify-between">
        <span>
          You are on the wrong network. Please switch to <strong>Sepolia</strong> to interact with BrickStack.
        </span>
        <button
          type="button"
          onClick={() => switchChain?.({ chainId: baseSepolia.id })}
          disabled={isPending}
          className="ml-3 rounded-md border border-red-300 px-2 py-1 text-red-700 hover:bg-red-100"
        >
          {isPending ? "Switching…" : "Switch to Base Sepolia"}
        </button>
      </div>
    </div>
  );
}



