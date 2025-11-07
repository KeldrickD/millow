"use client";

import { useEffect, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { PROPERTY_ADDRESS, VOTE_ESCROW_ADDRESS, propertyAbi, voteEscrowAbi } from "../lib/contracts";
import { formatEther } from "viem";

export default function InvestorPosition({ propertyId }: { propertyId: number }) {
  const pid = BigInt(propertyId);
  const { address, isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const zero = "0x0000000000000000000000000000000000000000";

  const showConnected = mounted && isConnected && !!address;

  // Proposal state
  const { data: proposal } = useReadContract({
    address: VOTE_ESCROW_ADDRESS,
    abi: voteEscrowAbi,
    functionName: "getProposal",
    args: [pid]
  } as any);

  let finalized = false;
  let successful = false;
  if (proposal && Array.isArray(proposal)) {
    finalized = proposal[6] as boolean;
    successful = proposal[7] as boolean;
  }

  // Locked ETH in escrow for this property
  const { data: lockedWei } = useReadContract({
    address: VOTE_ESCROW_ADDRESS,
    abi: voteEscrowAbi,
    functionName: "lockedAmount",
    args: [pid, (address || zero) as `0x${string}`],
    query: { enabled: showConnected }
  } as any);

  // Share price from Property
  const { data: sharePriceWei } = useReadContract({
    address: PROPERTY_ADDRESS,
    abi: propertyAbi,
    functionName: "sharePriceWei",
    args: [pid],
    query: { enabled: true }
  } as any);

  // Actual ERC-1155 balance
  const { data: erc1155BalanceRaw } = useReadContract({
    address: PROPERTY_ADDRESS,
    abi: propertyAbi,
    functionName: "balanceOf",
    args: [(address || zero) as `0x${string}`, pid],
    query: { enabled: showConnected }
  } as any);

  const lockedEth = formatEther((lockedWei as bigint) ?? 0n);
  const entitledShares = sharePriceWei && (sharePriceWei as bigint) > 0n && lockedWei
    ? Number((lockedWei as bigint) / (sharePriceWei as bigint))
    : 0;
  const erc1155Shares = Number((erc1155BalanceRaw as bigint) ?? 0n);

  const hasUnclaimedRefund = finalized && !successful && ((lockedWei as bigint) ?? 0n) > 0n;
  const hasLockedButUnminted = finalized && successful && entitledShares > 0 && erc1155Shares === 0;

  return (
    <section style={{ border: "1px solid #eee", borderRadius: 8, padding: 16 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Your Position</div>
      <div style={{ fontSize: 14, lineHeight: "22px" }}>
        <div className="flex justify-between"><span>Total deposited (escrow)</span> <span className="font-semibold">{showConnected ? `${lockedEth} ETH` : "–"}</span></div>
        <div className="flex justify-between"><span>Entitled shares (pre-mint)</span> <span className="font-semibold">{showConnected ? entitledShares : "–"}</span></div>
        <div className="flex justify-between"><span>ERC-1155 shares (owned)</span> <span className="font-semibold">{showConnected ? erc1155Shares : "–"}</span></div>
      </div>
      <div className="pt-2" style={{ borderTop: "1px solid #eee", marginTop: 8, fontSize: 12, color: "#666" }}>
        {!showConnected && <p>Connect wallet to see your position.</p>}
        {showConnected && hasUnclaimedRefund && (
          <p>⚠️ Deal was cancelled/failed and you still have funds in escrow. Use <span className="font-semibold">Claim Refund</span> in Escrow Actions.</p>
        )}
        {showConnected && hasLockedButUnminted && (
          <p>✅ Deal succeeded, but your ERC-1155 shares may not have reflected yet. This should update after finalization.</p>
        )}
        {showConnected && !finalized && (
          <p>⏳ Deal is still funding. Your deposit is locked until the raise is finalized or cancelled.</p>
        )}
        {showConnected && finalized && successful && erc1155Shares > 0 && (
          <p>🎉 You now hold fractional shares in the Property ERC-1155 contract.</p>
        )}
      </div>
    </section>
  );
}


