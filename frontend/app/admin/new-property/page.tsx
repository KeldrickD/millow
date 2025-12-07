"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import { baseSepolia } from "wagmi/chains";
import { VOTE_ESCROW_ADDRESS, voteEscrowAbi, PROPERTY_ADDRESS, propertyAbi } from "../../../lib/contracts";
import { idFromPropertyKey } from "../../../lib/slug";
import toast from "react-hot-toast";

export default function NewPropertyPage() {
  const { address } = useAccount();

  const { data: owner } = useReadContract({
    address: VOTE_ESCROW_ADDRESS,
    abi: voteEscrowAbi,
    functionName: "owner"
  } as any);

  const isOwner = !!address && !!owner && (address as string).toLowerCase() === (owner as string).toLowerCase();

  const [propertyLabel, setPropertyLabel] = useState("");
  const [target, setTarget] = useState("1");
  const [sharePrice, setSharePrice] = useState("0.1");
  const [maxShares, setMaxShares] = useState("1000");
  const [yieldBps, setYieldBps] = useState("500");
  const [days, setDays] = useState("7");
  const [seller, setSeller] = useState("");
  const [description, setDescription] = useState("New property proposal");

  const { writeContract, isPending } = useWriteContract();
  const [createHash, setCreateHash] = useState<`0x${string}` | undefined>();
  const [proposeHash, setProposeHash] = useState<`0x${string}` | undefined>();
  const [submitting, setSubmitting] = useState(false);

  // Do not early-return here; keeps hook order stable

  function handleCreate() {
    try {
      const targetWei = parseEther(target);
      const deadline = BigInt(Math.floor(Date.now() / 1000) + Number(days) * 24 * 60 * 60);
      const pid = idFromPropertyKey(propertyLabel);
      const sharePriceWei = parseEther(sharePrice);
      const max = BigInt(maxShares);
      const ybps = Number(yieldBps);
      setSubmitting(true);

      // create ERC-1155 series first (best-effort, but pass explicit gas & chain)
      payloadRef.current = { pid, targetWei, deadline, description };
      writeContract(
        {
          address: PROPERTY_ADDRESS as `0x${string}`,
          abi: propertyAbi as any,
          functionName: "createProperty",
          args: [pid, max, sharePriceWei, ybps, propertyLabel],
          chain: baseSepolia,
          gas: 500000n
        } as any,
        {
          onSuccess: (hash) => { setCreateHash(hash); toast.loading("Creating ERC-1155 series…", { id: `cp-${hash}` }); },
          onError: () => {
            // property might already exist – still attempt proposal and finish
            const payload = payloadRef.current;
            if (payload) submitProposal(payload);
            else setSubmitting(false);
          }
        }
      );
    } catch {
      toast.error("Invalid input");
      setSubmitting(false);
    }
  }

  const payloadRef = useRef<{ pid: bigint; targetWei: bigint; deadline: bigint; description: string } | null>(null);

  function submitProposal(payload: { pid: bigint; targetWei: bigint; deadline: bigint; description: string }) {
    const sellerAddr =
      seller && seller.trim().length > 0
        ? (seller as `0x${string}`)
        : ((address as `0x${string}` | undefined) ?? "0x0000000000000000000000000000000000000000");
    writeContract(
      {
        address: VOTE_ESCROW_ADDRESS as `0x${string}`,
        abi: voteEscrowAbi as any,
        functionName: "proposeProperty",
        args: [payload.pid, sellerAddr, payload.targetWei, payload.deadline, payload.description],
        chain: baseSepolia,
        gas: 350000n
      } as any,
      {
        onSuccess: (hash) => { setProposeHash(hash); toast.loading("Creating proposal…", { id: hash }); payloadRef.current = null; },
        onError: () => { toast.error("Failed to create proposal"); setSubmitting(false); }
      }
    );
  }

  const { isSuccess: createSuccess, isError: createError } = useWaitForTransactionReceipt({
    hash: createHash,
  });

  const { isSuccess: proposeSuccess, isError: proposeError } = useWaitForTransactionReceipt({
    hash: proposeHash,
  });

  useEffect(() => {
    if (createSuccess && createHash) {
      toast.success("ERC-1155 created ✅", { id: `cp-${createHash}` });
      submitProposal(payloadRef.current);
    }
    if (createError) {
      setSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createSuccess, createError, createHash]);

  useEffect(() => {
    if (proposeSuccess && proposeHash) {
      toast.success("Proposal created ✅", { id: proposeHash });
      setSubmitting(false);
      // Nudge the UI to reflect the new deal immediately with a cache-busting qs
      setTimeout(() => {
        try {
          window.location.assign(`/admin/properties?r=${Date.now()}`);
        } catch {}
      }, 300);
    }
    if (proposeError && proposeHash) {
      toast.error("Proposal failed", { id: proposeHash });
      setSubmitting(false);
    }
  }, [proposeSuccess, proposeError, proposeHash]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 space-y-4">
      <h1 className="text-2xl font-bold">New Property Proposal</h1>
      {!isOwner && (
        <div className="border rounded-md p-3 text-sm text-red-600">Only the contract owner can create proposals.</div>
      )}
      <div className="space-y-3 text-sm">
        <label className="block">
          <span className="text-xs text-gray-600">Property Label (e.g., 123 Main St, Atlanta, GA 30331)</span>
          <input value={propertyLabel} onChange={(e) => setPropertyLabel(e.target.value)} className="mt-1 w-full border rounded-md px-2 py-1 text-sm" placeholder="123 Main St, Atlanta, GA 30331" />
        </label>
        <label className="block">
          <span className="text-xs text-gray-600">Target raise (ETH)</span>
          <input value={target} onChange={(e) => setTarget(e.target.value)} className="mt-1 w-full border rounded-md px-2 py-1 text-sm" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-gray-600">Share price (ETH)</span>
            <input value={sharePrice} onChange={(e) => setSharePrice(e.target.value)} className="mt-1 w-full border rounded-md px-2 py-1 text-sm" />
          </label>
          <label className="block">
            <span className="text-xs text-gray-600">Max shares</span>
            <input value={maxShares} onChange={(e) => setMaxShares(e.target.value)} className="mt-1 w-full border rounded-md px-2 py-1 text-sm" />
          </label>
        </div>
        <label className="block">
          <span className="text-xs text-gray-600">Yield Bps (mock)</span>
          <input value={yieldBps} onChange={(e) => setYieldBps(e.target.value)} className="mt-1 w-full border rounded-md px-2 py-1 text-sm" />
        </label>
        <label className="block">
          <span className="text-xs text-gray-600">Funding window (days)</span>
          <input value={days} onChange={(e) => setDays(e.target.value)} className="mt-1 w-full border rounded-md px-2 py-1 text-sm" />
        </label>
        <label className="block">
          <span className="text-xs text-gray-600">Seller wallet</span>
          <input value={seller} onChange={(e) => setSeller(e.target.value)} className="mt-1 w-full border rounded-md px-2 py-1 text-sm" placeholder="0x..." />
        </label>
        <label className="block">
          <span className="text-xs text-gray-600">Description</span>
          <input value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 w-full border rounded-md px-2 py-1 text-sm" />
        </label>
      </div>
      <button type="button" disabled={!isOwner || isPending || submitting} onClick={handleCreate} className="rounded-md bg-emerald-600 text-white px-4 py-2 text-sm disabled:bg-gray-300">
        {isPending || submitting ? "Creating…" : "Create Proposal"}
      </button>
      <button
        type="button"
        disabled={!isOwner || isPending || submitting}
        onClick={() => {
          try {
            const pid = idFromPropertyKey(propertyLabel);
            const targetWei = parseEther(target);
            const deadline = BigInt(Math.floor(Date.now() / 1000) + Number(days) * 24 * 60 * 60);
            const desc = description;
            submitProposal({ pid, targetWei, deadline, description: desc });
          } catch {
            toast.error("Invalid input");
          }
        }}
        className="ml-2 rounded-md border px-4 py-2 text-sm disabled:opacity-50"
      >
        Submit Proposal Now
      </button>
    </main>
  );
}


