"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount, useChainId, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { parseUnits, formatUnits } from "viem";
import toast from "react-hot-toast";
import {
  PROPERTY_ADDRESS,
  VOTE_ESCROW_ADDRESS,
  GOVERNANCE_ADDRESS,
  propertyAbi,
  voteEscrowAbi,
  erc20Abi
} from "../../../lib/contracts";

function isAddress(value: string) {
  return /^0x[a-fA-F0-9]{40}$/i.test(value.trim());
}

export default function AccessAdminPage() {
  const { address } = useAccount();
  const chainId = useChainId();
  const [wlAddress, setWlAddress] = useState("");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("100");

  const { data: owner } = useReadContract({
    address: VOTE_ESCROW_ADDRESS,
    abi: voteEscrowAbi,
    functionName: "owner"
  } as any);

  const { data: minGovBalance } = useReadContract({
    address: VOTE_ESCROW_ADDRESS,
    abi: voteEscrowAbi,
    functionName: "minGovBalance"
  } as any);

  const normalizedWl = wlAddress.trim();
  const { data: wlStatus, refetch: refetchWhitelist } = useReadContract({
    address: PROPERTY_ADDRESS,
    abi: propertyAbi,
    functionName: "isWhitelisted",
    args: isAddress(normalizedWl) ? [normalizedWl as `0x${string}`] : undefined,
    query: { enabled: isAddress(normalizedWl) }
  } as any);

  const isOwner = !!address && !!owner && (address as string).toLowerCase() === (owner as string).toLowerCase();
  const allowedChains = [baseSepolia.id, 8453];
  const wrongChain = chainId !== undefined && !allowedChains.includes(chainId);

  const { writeContract, isPending } = useWriteContract();
  const [wlTxHash, setWlTxHash] = useState<`0x${string}` | undefined>();
  const [govTxHash, setGovTxHash] = useState<`0x${string}` | undefined>();

  const wlReceipt = useWaitForTransactionReceipt({
    hash: wlTxHash,
    query: { enabled: Boolean(wlTxHash) }
  });
  useEffect(() => {
    if (wlReceipt.isSuccess && wlTxHash) {
      toast.success("Whitelist updated ✅", { id: wlTxHash });
      refetchWhitelist?.();
    }
  }, [wlReceipt.isSuccess, wlTxHash, refetchWhitelist]);
  useEffect(() => {
    if (wlReceipt.isError && wlTxHash) {
      toast.error("Whitelist update failed", { id: wlTxHash });
    }
  }, [wlReceipt.isError, wlTxHash]);

  const { data: govDecimals } = useReadContract({
    address: GOVERNANCE_ADDRESS,
    abi: erc20Abi,
    functionName: "decimals",
    query: { enabled: Boolean(GOVERNANCE_ADDRESS) }
  } as any);
  const decimals = typeof govDecimals === "number" ? govDecimals : 18;

  const { data: govBalanceRaw, refetch: refetchGovBalance } = useReadContract({
    address: GOVERNANCE_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address && GOVERNANCE_ADDRESS ? [address] : undefined,
    query: { enabled: Boolean(address && GOVERNANCE_ADDRESS) }
  } as any);
  const govBalance = useMemo(() => {
    if (!govBalanceRaw) return "0";
    try {
      return formatUnits(govBalanceRaw as bigint, decimals);
    } catch {
      return "0";
    }
  }, [govBalanceRaw, decimals]);

  const govReceipt = useWaitForTransactionReceipt({
    hash: govTxHash,
    query: { enabled: Boolean(govTxHash) }
  });
  useEffect(() => {
    if (govReceipt.isSuccess && govTxHash) {
      toast.success("Governance tokens sent ✅", { id: govTxHash });
      refetchGovBalance?.();
    }
  }, [govReceipt.isSuccess, govTxHash, refetchGovBalance]);
  useEffect(() => {
    if (govReceipt.isError && govTxHash) {
      toast.error("Transfer failed", { id: govTxHash });
    }
  }, [govReceipt.isError, govTxHash]);

  function updateWhitelist(allowed: boolean) {
    if (!address) {
      toast.error("Connect a wallet first.");
      return;
    }
    if (!isOwner) {
      toast.error("Only the contract owner can whitelist wallets.");
      return;
    }
    if (wrongChain) {
      toast.error("Wrong network. Switch to Base or Base Sepolia.");
      return;
    }
    if (!isAddress(normalizedWl)) {
      toast.error("Enter a valid wallet address (0x...).");
      return;
    }
    writeContract(
      {
        address: PROPERTY_ADDRESS as `0x${string}`,
        abi: propertyAbi as any,
        functionName: "setWhitelisted",
        args: [normalizedWl as `0x${string}`, allowed],
        chain: baseSepolia,
        account: address as `0x${string}`
      },
      {
        onSuccess: (hash) => {
          setWlTxHash(hash);
          toast.loading("Updating whitelist…", { id: hash });
        },
        onError: () => toast.error("Failed to submit whitelist tx")
      }
    );
  }

  function sendGovernance() {
    if (!GOVERNANCE_ADDRESS) {
      toast.error("Set NEXT_PUBLIC_GOVERNANCE_ADDRESS first.");
      return;
    }
    if (!isOwner) {
      toast.error("Only the token owner can distribute governance.");
      return;
    }
    if (wrongChain) {
      toast.error("Wrong network. Switch to Base or Base Sepolia.");
      return;
    }
    const target = recipient.trim();
    if (!isAddress(target)) {
      toast.error("Enter a valid recipient wallet.");
      return;
    }
    if (!address) {
      toast.error("Connect a wallet first.");
      return;
    }
    try {
      const value = parseUnits(amount || "0", decimals);
      writeContract(
        {
          address: GOVERNANCE_ADDRESS as `0x${string}`,
          abi: erc20Abi as any,
          functionName: "transfer",
          args: [target as `0x${string}`, value],
          chain: baseSepolia,
          account: address as `0x${string}`
        },
        {
          onSuccess: (hash) => {
            setGovTxHash(hash);
            toast.loading("Sending governance tokens…", { id: hash });
          },
          onError: () => toast.error("Transfer failed to submit")
        }
      );
    } catch {
      toast.error("Invalid amount");
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 space-y-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-mirage/60">Admin</p>
        <h1 className="text-2xl font-bold text-mirage">Access Control</h1>
        <p className="text-sm text-mirage/70">
          Whitelist investor wallets for ERC-1155 receipt and distribute governance tokens required for deposits.
        </p>
        <div className="text-[11px] text-mirage/60">
          Need to reward holders? <a href="/admin/airdrop" className="underline text-blaze">Go to BRICK Airdrop</a>
        </div>
        <div className="text-[11px] text-mirage/50">
          Connected: {(address as string | undefined) ?? "—"} · Owner: {(owner as string | undefined) ?? "—"} · Min gov balance
          required: {minGovBalance?.toString?.() ?? "0"} wei{" "}
          {wrongChain && <span className="text-red-500">• Wrong network. Switch to Base or Base Sepolia.</span>}
        </div>
      </header>

      {!isOwner && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          Connect the VoteEscrow owner wallet to manage whitelist and governance distribution.
        </div>
      )}

      <section className="rounded-2xl border border-white bg-white p-4 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-mirage">Whitelist wallets</h2>
          <span className="text-[11px] text-mirage/60">Property contract @ {PROPERTY_ADDRESS.slice(0, 10)}…</span>
        </div>
        <label className="block text-xs text-mirage/70">
          Wallet address
          <input
            value={wlAddress}
            onChange={(e) => setWlAddress(e.target.value)}
            placeholder="0xabc..."
            className="mt-1 w-full rounded-md border px-2 py-2 text-sm"
          />
        </label>
        {isAddress(normalizedWl) && (
          <p className="text-[11px] text-mirage/60">
            Current status: {wlStatus ? "✅ whitelisted" : "🚫 not whitelisted"}
          </p>
        )}
        <div className="flex gap-3">
          <button
            type="button"
            disabled={!isOwner || isPending || wrongChain}
            onClick={() => updateWhitelist(true)}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm text-white disabled:bg-mirage/20"
          >
            Add to whitelist
          </button>
          <button
            type="button"
            disabled={!isOwner || isPending || wrongChain}
            onClick={() => updateWhitelist(false)}
            className="rounded-md border px-4 py-2 text-sm text-mirage disabled:opacity-50"
          >
            Remove from whitelist
          </button>
        </div>
        {wlTxHash && (
          <p className="text-[11px] text-mirage/60 break-all">
            Last tx: {wlTxHash} · <a className="underline" href={`https://sepolia.basescan.org/tx/${wlTxHash}`} target="_blank" rel="noreferrer">View</a>
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-white bg-white p-4 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-mirage">Distribute governance tokens</h2>
          <span className="text-[11px] text-mirage/60">
            Governance: {GOVERNANCE_ADDRESS ? `${GOVERNANCE_ADDRESS.slice(0, 10)}…` : "set env var"}
          </span>
        </div>
        {!GOVERNANCE_ADDRESS && (
          <p className="text-xs text-red-600">Set NEXT_PUBLIC_GOVERNANCE_ADDRESS to enable transfers.</p>
        )}
        {GOVERNANCE_ADDRESS && (
          <>
            <p className="text-xs text-mirage/70">Your balance: {govBalance} BRICK</p>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block text-xs text-mirage/70">
                Recipient wallet
                <input
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="0xrecipient..."
                  className="mt-1 w-full rounded-md border px-2 py-2 text-sm"
                />
              </label>
              <label className="block text-xs text-mirage/70">
                Amount (BRICK)
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mt-1 w-full rounded-md border px-2 py-2 text-sm"
                />
              </label>
            </div>
            <button
              type="button"
              disabled={!isOwner || isPending || wrongChain}
              onClick={sendGovernance}
              className="rounded-md bg-deepSea px-4 py-2 text-sm text-white disabled:bg-mirage/20"
            >
              Send tokens
            </button>
            {govTxHash && (
              <p className="text-[11px] text-mirage/60 break-all">
                Last transfer: {govTxHash} · <a className="underline" href={`https://sepolia.basescan.org/tx/${govTxHash}`} target="_blank" rel="noreferrer">View</a>
              </p>
            )}
          </>
        )}
      </section>
    </main>
  );
}


