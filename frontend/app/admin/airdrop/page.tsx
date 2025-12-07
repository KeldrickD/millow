"use client";

import { useMemo, useState } from "react";
import { useAccount, useChainId, usePublicClient, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import toast from "react-hot-toast";
import { GOVERNANCE_ADDRESS, governanceAbi } from "../../../lib/contracts";
import { fetchPropertyHolders } from "../../../lib/indexer";
import { idFromPropertyKey } from "../../../lib/slug";

function parseAddresses(input: string): `0x${string}`[] {
  return input
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => /^0x[a-fA-F0-9]{40}$/.test(s)) as `0x${string}`[];
}

function toWei(amount: string): bigint | null {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return null;
  return BigInt(Math.round(n * 1e18));
}

export default function AirdropPage() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const chainId = useChainId();
  const [mode, setMode] = useState<"equal" | "custom">("equal");
  const [addressesInput, setAddressesInput] = useState("");
  const [amountEach, setAmountEach] = useState("10");
  const [customAmounts, setCustomAmounts] = useState("");
  const [loadLabel, setLoadLabel] = useState("");
  const [loadingHolders, setLoadingHolders] = useState(false);

  const recipients = useMemo(() => parseAddresses(addressesInput), [addressesInput]);
  const customValues = useMemo(
    () =>
      customAmounts
        .split(/[\s,]+/)
        .map((s) => s.trim())
        .filter(Boolean),
    [customAmounts]
  );
  const allowedChains = [84532, 8453];
  const wrongChain = chainId !== undefined && !allowedChains.includes(chainId);

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });
  const busy = isPending || isConfirming;

  const canSubmit =
    !busy &&
    recipients.length > 0 &&
    ((mode === "equal" && toWei(amountEach)) ||
      (mode === "custom" && customValues.length === recipients.length && customValues.every((v) => toWei(v))));

  function submitEqual() {
    const amtWei = toWei(amountEach);
    if (!amtWei || recipients.length === 0) {
      toast.error("Enter recipients and amount");
      return;
    }
    writeContract(
      {
        address: GOVERNANCE_ADDRESS,
        abi: governanceAbi as any,
        functionName: "airdropEqual",
        args: [recipients, amtWei]
      },
      {
        onSuccess(hash) {
          toast.loading("Sending equal airdrop…", { id: hash });
        },
        onError(err) {
          console.error(err);
          toast.error("Failed to submit airdrop");
        }
      }
    );
  }

  function submitCustom() {
    if (recipients.length === 0 || customValues.length !== recipients.length) {
      toast.error("Recipients and amounts must align");
      return;
    }
    const amountsWei = customValues.map((v) => toWei(v) || 0n);
    if (amountsWei.some((v) => v <= 0)) {
      toast.error("Amounts must be > 0");
      return;
    }
    writeContract(
      {
        address: GOVERNANCE_ADDRESS,
        abi: governanceAbi as any,
        functionName: "airdrop",
        args: [recipients, amountsWei]
      },
      {
        onSuccess(hash) {
          toast.loading("Sending custom airdrop…", { id: hash });
        },
        onError(err) {
          console.error(err);
          toast.error("Failed to submit airdrop");
        }
      }
    );
  }

  async function loadHolders() {
    if (!publicClient) return;
    try {
      setLoadingHolders(true);
      const pid = idFromPropertyKey(loadLabel);
      const holders = await fetchPropertyHolders(publicClient, pid);
      if (!holders.length) {
        toast.error("No holders found for this property.");
        return;
      }
      setAddressesInput(holders.map((h) => h.holder).join("\n"));
      toast.success(`Loaded ${holders.length} holder(s)`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load holders");
    } finally {
      setLoadingHolders(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    if (mode === "equal") submitEqual();
    else submitCustom();
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 space-y-6">
      <header className="space-y-1">
        <p className="text-[11px] uppercase tracking-wide text-mirage/60">Admin</p>
        <h1 className="text-2xl font-bold text-mirage">BRICK Airdrop</h1>
        <p className="text-sm text-mirage/70">
          Distribute governance tokens to investors. Paste addresses, choose equal or custom amounts, and submit as the contract owner.
        </p>
        <p className="text-[11px] text-mirage/50">
          Connected: <span className="font-mono">{address ?? "—"}</span>
          {wrongChain && <span className="ml-2 text-red-500">Wrong network. Switch to Base or Base Sepolia.</span>}
        </p>
      </header>

      <form onSubmit={onSubmit} className="space-y-5 rounded-3xl border border-white bg-white p-4 shadow-sm">
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-mirage/70">Recipient addresses</label>
          <textarea
            className="min-h-[140px] w-full rounded-2xl border border-mirage/10 bg-wildSand/60 px-3 py-2 text-xs font-mono text-mirage focus:border-deepSea focus:outline-none"
            placeholder={`0xabc...\n0xdef...\n0x123...`}
            value={addressesInput}
            onChange={(e) => setAddressesInput(e.target.value)}
          />
          <p className="text-[10px] text-mirage/50">One per line or comma separated. Future: auto-fill from indexer.</p>
        </div>

        <div className="rounded-2xl border border-wildSand bg-white px-3 py-3 space-y-2">
          <p className="text-[10px] text-mirage/60 font-semibold">Load holders from property label/ID</p>
          <input
            value={loadLabel}
            onChange={(e) => setLoadLabel(e.target.value)}
            placeholder="123 Main St... or property ID"
            className="w-full text-xs px-3 py-2 rounded-lg border border-wildSand bg-wildSand/50 focus:outline-none focus:border-deepSea"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadHolders}
              disabled={loadingHolders}
              className="rounded-full bg-deepSea px-3 py-1.5 text-[11px] font-semibold text-white disabled:bg-mirage/30"
            >
              {loadingHolders ? "Loading…" : "Load holders into form"}
            </button>
            {loadingHolders && <span className="text-[11px] text-mirage/60">Scanning transfers…</span>}
          </div>
          <p className="text-[10px] text-mirage/50">
            Uses on-chain ERC-1155 transfer logs (no backend) to find all holders with a balance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[11px]">
          <button
            type="button"
            className={`rounded-full px-3 py-1 font-medium ${mode === "equal" ? "bg-blaze text-white" : "bg-wildSand text-mirage/70"}`}
            onClick={() => setMode("equal")}
          >
            Equal amount
          </button>
          <button
            type="button"
            className={`rounded-full px-3 py-1 font-medium ${mode === "custom" ? "bg-blaze text-white" : "bg-wildSand text-mirage/70"}`}
            onClick={() => setMode("custom")}
          >
            Custom per address
          </button>
          <span className="text-[11px] text-mirage/50">Recipients: {recipients.length}</span>
        </div>

        {mode === "equal" ? (
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-mirage/70">Amount per address (BRICK)</label>
            <input
              type="number"
              min="0"
              step="0.0001"
              className="w-44 rounded-2xl border border-mirage/10 bg-wildSand/60 px-3 py-2 text-sm text-mirage focus:border-deepSea focus:outline-none"
              value={amountEach}
              onChange={(e) => setAmountEach(e.target.value)}
            />
          </div>
        ) : (
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-mirage/70">Custom amounts (BRICK, same order as addresses)</label>
            <textarea
              className="min-h-[100px] w-full rounded-2xl border border-mirage/10 bg-wildSand/60 px-3 py-2 text-xs font-mono text-mirage focus:border-deepSea focus:outline-none"
              placeholder={`100\n50\n25`}
              value={customAmounts}
              onChange={(e) => setCustomAmounts(e.target.value)}
            />
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit || wrongChain}
          className={`rounded-full px-4 py-2 text-xs font-semibold text-white transition ${
            canSubmit && !wrongChain ? "bg-deepSea hover:bg-deepSea/90" : "bg-mirage/20 text-mirage/50 cursor-not-allowed"
          }`}
        >
          {busy ? "Sending airdrop…" : mode === "equal" ? "Airdrop equal amounts" : "Airdrop custom amounts"}
        </button>

        {txHash && (
          <p className="text-[11px] text-mirage/60">
            Tx:{" "}
            <a className="underline text-blaze" href={`https://sepolia.basescan.org/tx/${txHash}`} target="_blank" rel="noreferrer">
              View on BaseScan
            </a>{" "}
            {isSuccess && "• Confirmed"}
          </p>
        )}
      </form>
    </main>
  );
}


