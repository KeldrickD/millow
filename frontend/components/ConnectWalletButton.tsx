"use client";

import { useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";

function truncate(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function ConnectWalletButton() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { address, isConnecting, isConnected } = useAccount();
  const { connectors, connect, isPending: isConnectingConnector } = useConnect();
  const { disconnect } = useDisconnect();

  if (!mounted) {
    return (
      <button
        type="button"
        disabled
        className="rounded-md border px-3 py-1.5 text-sm opacity-60"
      >
        Connect Wallet
      </button>
    );
  }

  if (!isConnected) {
    const primary = connectors?.[0];
    return (
      <button
        type="button"
        disabled={!primary || isConnecting || isConnectingConnector}
        onClick={() => primary && connect({ connector: primary })}
        className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-60"
      >
        {isConnecting || isConnectingConnector ? "Connecting…" : "Connect Wallet"}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-mono">{truncate(address!)}</span>
      <button
        type="button"
        onClick={() => disconnect()}
        className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
      >
        Disconnect
      </button>
    </div>
  );
}



