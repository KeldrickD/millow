"use client";

import { useAccount, useReadContract } from "wagmi";
import { formatEther } from "viem";
import { PROPERTY_ADDRESS, VOTE_ESCROW_ADDRESS, propertyAbi, voteEscrowAbi } from "../../../lib/contracts";

export default function PropertiesAdminPage() {
  const { address } = useAccount();

  const { data: owner } = useReadContract({
    address: VOTE_ESCROW_ADDRESS,
    abi: voteEscrowAbi,
    functionName: "owner"
  } as any);

  const isOwner = !!address && !!owner && (address as string).toLowerCase() === (owner as string).toLowerCase();

  const { data: allIds } = useReadContract({
    address: VOTE_ESCROW_ADDRESS,
    abi: voteEscrowAbi,
    functionName: "getAllPropertyIds",
    query: { refetchInterval: 4000 }
  } as any);

  const ids = (allIds as bigint[] | undefined) ?? [];

  if (!isOwner) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10">
        <p className="text-sm text-red-500">Only the contract owner can view the full properties table.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Admin • Properties</h1>
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">Overview of all ERC-1155 property IDs, deal config, and raise status.</p>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400">Last refresh: {new Date().toLocaleTimeString()}</span>
            <button
              onClick={() => { try { window.location.assign(`/admin/properties?r=${Date.now()}`); } catch {} }}
              className="text-xs border rounded px-2 py-1"
            >
              Refresh
            </button>
          </div>
        </div>
      </header>

      {ids.length === 0 ? (
        <p className="text-sm text-gray-500">No properties yet.</p>
      ) : (
        <table className="w-full text-xs border border-gray-200 rounded-md overflow-hidden">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-left">Label</th>
              <th className="px-3 py-2 text-right">Max shares</th>
              <th className="px-3 py-2 text-right">Share price</th>
              <th className="px-3 py-2 text-right">Yield bps</th>
              <th className="px-3 py-2 text-right">Target / Raised (ETH)</th>
              <th className="px-3 py-2 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {ids.map((id) => (
              <PropertyRow key={id.toString()} propertyId={id} />
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

function PropertyRow({ propertyId }: { propertyId: bigint }) {
  const { data: propCfg } = useReadContract({
    address: PROPERTY_ADDRESS,
    abi: propertyAbi,
    functionName: "properties",
    args: [propertyId]
  } as any);

  const { data: proposal } = useReadContract({
    address: VOTE_ESCROW_ADDRESS,
    abi: voteEscrowAbi,
    functionName: "getProposal",
    args: [propertyId],
    query: { refetchInterval: 4000 }
  } as any);

  let exists = false;
  let maxShares = 0n;
  let sharePriceWei = 0n;
  let yieldBps = 0n;
  let label = "";

  if (propCfg && Array.isArray(propCfg)) {
    exists = propCfg[0] as boolean;
    maxShares = propCfg[1] as bigint;
    sharePriceWei = propCfg[2] as bigint;
    yieldBps = propCfg[3] as bigint;
    label = propCfg[4] as string;
  }

  let targetWei = 0n;
  let raisedWei = 0n;
  let finalized = false;
  let successful = false;
  if (proposal && Array.isArray(proposal)) {
    targetWei = proposal[2] as bigint; // matching your getProposal layout
    raisedWei = proposal[4] as bigint;
    finalized = proposal[6] as boolean;
    successful = proposal[7] as boolean;
  }

  const sharePriceEth = formatEther(sharePriceWei);
  const targetEth = formatEther(targetWei);
  const raisedEth = formatEther(raisedWei);

  let status = "Draft";
  if (exists && targetWei > 0n) status = "Funding";
  if (finalized && successful) status = "Successful";
  if (finalized && !successful) status = "Failed";

  return (
    <tr className="border-t border-gray-200">
      <td className="px-3 py-2 align-top font-mono text-[10px]">{propertyId.toString().slice(0, 10)}…</td>
      <td className="px-3 py-2 align-top max-w-xs"><div className="truncate">{label || "—"}</div></td>
      <td className="px-3 py-2 text-right align-top">{maxShares.toString()}</td>
      <td className="px-3 py-2 text-right align-top">{sharePriceEth} ETH</td>
      <td className="px-3 py-2 text-right align-top">{(yieldBps as bigint).toString()}</td>
      <td className="px-3 py-2 text-right align-top">{raisedEth} / {targetEth}</td>
      <td className="px-3 py-2 text-center align-top">
        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] border border-gray-200">{status}</span>
      </td>
    </tr>
  );
}


