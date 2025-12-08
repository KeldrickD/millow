"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { useAccount, useChainId, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { PROPERTY_GOVERNOR_ADDRESS, propertyGovernorAbi } from "../lib/contracts";
import { base, baseSepolia } from "wagmi/chains";

type Props = { propertyId: bigint };

export default function PropertyGovernancePanel({ propertyId }: Props) {
  const chainId = useChainId();
  const { address } = useAccount();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const { data: proposalIds } = useReadContract({
    address: PROPERTY_GOVERNOR_ADDRESS,
    abi: propertyGovernorAbi,
    functionName: "getProposalsByProperty",
    args: [propertyId],
    query: { enabled: PROPERTY_GOVERNOR_ADDRESS !== "0x0000000000000000000000000000000000000000" }
  } as any);

  const {
    writeContract: writeGovernor,
    data: txHash,
    isPending: txPending
  } = useWriteContract();
  const { isLoading: txConfirming } = useWaitForTransactionReceipt({ hash: txHash });

  const isWrongNetwork = !isBaseNetwork(chainId);
  const creatingDisabled =
    !address ||
    isWrongNetwork ||
    !PROPERTY_GOVERNOR_ADDRESS ||
    PROPERTY_GOVERNOR_ADDRESS === "0x0000000000000000000000000000000000000000";

  return (
    <section className="bg-white rounded-3xl border border-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-mirage">Governance</h2>
          <p className="text-[11px] text-mirage/50">Proposals and votes for this property.</p>
        </div>
        {isWrongNetwork && (
          <span className="text-[10px] px-2 py-1 rounded-full bg-mirage/5 text-mirage/60 border border-mirage/10">
            Switch to Base Sepolia/Mainnet to vote
          </span>
        )}
      </div>

      <div className="space-y-2">
        {Array.isArray(proposalIds) && proposalIds.length > 0 ? (
          proposalIds
            .slice()
            .reverse()
            .map((id: any) => <ProposalRow key={id.toString()} proposalId={BigInt(id)} disabled={isWrongNetwork} />)
        ) : (
          <div className="text-[11px] text-mirage/60 bg-mirage/2 rounded-2xl px-3 py-2">
            No proposals yet. If you hold shares, you can open a proposal to vote on rent, renovations, or other decisions.
          </div>
        )}
      </div>

      <div className="border-t border-mirage/10 pt-3 space-y-2">
        <p className="text-[11px] font-semibold text-mirage">Open new proposal</p>
        <input
          className="w-full text-xs rounded-2xl border border-mirage/10 px-3 py-2 outline-none focus:border-blaze"
          placeholder="Example: Approve 3% rent increase for next 12 months"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="w-full text-xs rounded-2xl border border-mirage/10 px-3 py-2 outline-none focus:border-blaze min-h-[72px]"
          placeholder="Add context or rationale so other holders know what they’re voting on…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button
          type="button"
          disabled={creatingDisabled || !title.trim() || txPending || txConfirming}
          onClick={() => {
            if (!title.trim()) return;
            writeGovernor({
              address: PROPERTY_GOVERNOR_ADDRESS,
              abi: propertyGovernorAbi,
              functionName: "createProposal",
              args: [propertyId, title.trim(), description.trim()],
              chain: chainId === base.id ? base : baseSepolia,
              account: address as `0x${string}`
            });
          }}
          className="inline-flex items-center justify-center rounded-full px-4 py-1.5 text-[11px] font-semibold text-white bg-deepSea hover:bg-deepSea/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {txPending || txConfirming ? "Submitting…" : "Create proposal"}
        </button>
      </div>
    </section>
  );
}

function ProposalRow({ proposalId, disabled }: { proposalId: bigint; disabled: boolean }) {
  const chainId = useChainId();
  const { address } = useAccount();

  const { data: proposal } = useReadContract({
    address: PROPERTY_GOVERNOR_ADDRESS,
    abi: propertyGovernorAbi,
    functionName: "getProposal",
    args: [proposalId]
  } as any);

  const {
    writeContract: writeGovernor,
    data: txHash,
    isPending
  } = useWriteContract();
  const { isLoading: confirming } = useWaitForTransactionReceipt({ hash: txHash });

  if (!proposal) return null;

  const [id, , proposer, title, description, , endTime, forVotes, againstVotes, finalized, succeeded] = proposal as any;

  const now = Date.now();
  const endMs = Number(endTime) * 1000;
  const isActive = !finalized && endMs > now;
  const isWrongNetwork = !isBaseNetwork(chainId);
  const canVote = !!address && isActive && !disabled && !isWrongNetwork;

  let statusLabel = "";
  if (finalized) {
    statusLabel = succeeded ? "Passed" : "Rejected";
  } else if (isActive) {
    statusLabel = "Voting open";
  } else {
    statusLabel = "Ended, not finalized";
  }

  const handleVote = (support: boolean) => {
    writeGovernor({
      address: PROPERTY_GOVERNOR_ADDRESS,
      abi: propertyGovernorAbi,
      functionName: "castVote",
      args: [proposalId, support],
      chain: chainId === base.id ? base : baseSepolia,
      account: address as `0x${string}`
    });
  };

  const handleFinalize = () => {
    writeGovernor({
      address: PROPERTY_GOVERNOR_ADDRESS,
      abi: propertyGovernorAbi,
      functionName: "finalizeProposal",
      args: [proposalId],
      chain: chainId === base.id ? base : baseSepolia,
      account: address as `0x${string}`
    });
  };

  return (
    <div className="border border-mirage/10 rounded-2xl px-3 py-2 space-y-1">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-mirage truncate">{title || `Proposal #${id.toString()}`}</p>
        <span
          className={`text-[10px] px-2 py-1 rounded-full border ${
            finalized
              ? succeeded
                ? "bg-green-50 border-green-100 text-green-700"
                : "bg-red-50 border-red-100 text-red-700"
              : "bg-mirage/3 border-mirage/10 text-mirage/60"
          }`}
        >
          {statusLabel}
        </span>
      </div>
      {description && <p className="text-[10px] text-mirage/60 line-clamp-2">{description}</p>}
      <div className="flex items-center justify-between text-[10px] text-mirage/60 mt-1">
        <span>
          For: {forVotes.toString()} • Against: {againstVotes.toString()}
        </span>
        <span>
          Ends{" "}
          {formatDistanceToNowStrict(endMs, {
            addSuffix: true
          })}
        </span>
      </div>
      <div className="flex items-center gap-2 mt-1">
        <button
          type="button"
          disabled={!canVote || isPending || confirming}
          onClick={() => handleVote(true)}
          className="text-[10px] px-2.5 py-1 rounded-full bg-blaze text-white hover:bg-blaze/90 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          Vote YES
        </button>
        <button
          type="button"
          disabled={!canVote || isPending || confirming}
          onClick={() => handleVote(false)}
          className="text-[10px] px-2.5 py-1 rounded-full bg-mirage/5 text-mirage hover:bg-mirage/10 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          Vote NO
        </button>
        {!finalized && !isActive && (
          <button
            type="button"
            disabled={isPending || confirming}
            onClick={handleFinalize}
            className="ml-auto text-[10px] px-2.5 py-1 rounded-full bg-deepSea text-white hover:bg-deepSea/90 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Finalize
          </button>
        )}
      </div>
      <p className="text-[10px] text-mirage/50 mt-1">Proposer: {proposer.slice(0, 6)}…{proposer.slice(-4)}</p>
    </div>
  );
}

function isBaseNetwork(chainId?: number) {
  if (!chainId) return false;
  return chainId === 8453 || chainId === 84532;
}

