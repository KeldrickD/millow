"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, parseUnits, formatUnits } from "viem";
import { baseSepolia } from "wagmi/chains";
import toast from "react-hot-toast";
import {
  PROPERTY_ADDRESS,
  VOTE_ESCROW_ADDRESS,
  YIELD_VAULT_ADDRESS,
  MOCK_USDC_ADDRESS,
  propertyAbi,
  voteEscrowAbi,
  yieldVaultAbi,
  mockUsdcAbi,
} from "../../../lib/contracts";
import { idFromPropertyKey } from "../../../lib/slug";

export default function SimulatePage() {
  const { address } = useAccount();

  const { data: owner } = useReadContract({
    address: VOTE_ESCROW_ADDRESS,
    abi: voteEscrowAbi,
    functionName: "owner",
  } as any);

  const isOwner = !!address && !!owner && (address as string).toLowerCase() === (owner as string).toLowerCase();

  const { data: usdcBalanceRaw } = useReadContract({
    address: MOCK_USDC_ADDRESS,
    abi: mockUsdcAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  } as any);

  const { data: decimals } = useReadContract({
    address: MOCK_USDC_ADDRESS,
    abi: mockUsdcAbi,
    functionName: "decimals",
  } as any);

  const [usdcDecimals, setUsdcDecimals] = useState(6);
  useEffect(() => {
    if (typeof decimals === "number") setUsdcDecimals(decimals);
  }, [decimals]);

  const usdcBalance = usdcBalanceRaw !== undefined ? formatUnits(usdcBalanceRaw as bigint, usdcDecimals) : "0";

  const { data: allowanceRaw } = useReadContract({
    address: MOCK_USDC_ADDRESS,
    abi: mockUsdcAbi,
    functionName: "allowance",
    args: address && YIELD_VAULT_ADDRESS ? [address, YIELD_VAULT_ADDRESS] : undefined,
    query: { enabled: Boolean(address && YIELD_VAULT_ADDRESS) },
  } as any);

  const allowance = allowanceRaw !== undefined ? Number(formatUnits(allowanceRaw as bigint, usdcDecimals)) : 0;

  const { writeContract, isPending } = useWriteContract();
  const [mintHash, setMintHash] = useState<`0x${string}` | undefined>();
  const [createHash, setCreateHash] = useState<`0x${string}` | undefined>();
  const [approveHash, setApproveHash] = useState<`0x${string}` | undefined>();
  const [proposeHash, setProposeHash] = useState<`0x${string}` | undefined>();
  const [yieldHash, setYieldHash] = useState<`0x${string}` | undefined>();
  const [proposing, setProposing] = useState(false);

  const [label, setLabel] = useState("123 Main St, Test City");
  const [targetEth, setTargetEth] = useState("1");
  const [sharePriceEth, setSharePriceEth] = useState("0.1");
  const [maxShares, setMaxShares] = useState("100");
  const [yieldBps, setYieldBps] = useState("500");
  const [days, setDays] = useState("3");
  const [seller, setSeller] = useState("");
  const [yieldAmount, setYieldAmount] = useState("100");

  const [propertyIdPreview, setPropertyIdPreview] = useState<bigint | null>(null);
  useEffect(() => {
    if (!label) { setPropertyIdPreview(null); return; }
    setPropertyIdPreview(idFromPropertyKey(label));
  }, [label]);

  // NOTE: Do not early-return before hooks; we will render a notice instead.

  function mintUsdc() {
    if (!address) return;
    const amount = parseUnits("1000", usdcDecimals);
    writeContract(
      { address: MOCK_USDC_ADDRESS as `0x${string}`, abi: mockUsdcAbi as any, functionName: "mint", args: [address, amount], chain: baseSepolia, gas: 100000n } as any,
      { onSuccess: (hash) => { setMintHash(hash); toast.loading("Minting test USDC…", { id: hash }); }, onError: () => toast.error("Mint failed") }
    );
  }

  function approveUsdc() {
    if (!address || !YIELD_VAULT_ADDRESS) return;
    const amount = parseUnits("1000000", usdcDecimals);
    writeContract(
      { address: MOCK_USDC_ADDRESS as `0x${string}`, abi: mockUsdcAbi as any, functionName: "approve", args: [YIELD_VAULT_ADDRESS, amount], chain: baseSepolia, gas: 120000n } as any,
      { onSuccess: (hash) => { setApproveHash(hash); toast.loading("Approving USDC for YieldVault…", { id: hash }); }, onError: () => toast.error("USDC approve failed") }
    );
  }

  function createTestDeal() {
    try {
      const id = idFromPropertyKey(label);
      const targetWei = parseEther(targetEth);
      const sharePriceWei = parseEther(sharePriceEth);
      const max = BigInt(maxShares);
      const deadline = BigInt(Math.floor(Date.now() / 1000) + Number(days) * 24 * 60 * 60);
      const description = `SIM: ${label}`;
      const sellerAddr = seller || address;

      if (!sellerAddr) { toast.error("Seller address required (or connect wallet)"); return; }

      writeContract(
        { address: PROPERTY_ADDRESS as `0x${string}`, abi: propertyAbi as any, functionName: "createProperty", args: [id, max, sharePriceWei, BigInt(yieldBps), label], chain: baseSepolia, gas: 500000n } as any,
        { onSuccess: (hash) => { setCreateHash(hash); toast.loading("Creating ERC-1155 test property…", { id: hash }); }, onError: () => toast.error("Failed to create property") }
      );

      // After create is confirmed, we will propose (see receipt watcher below)
      // Store derived inputs for later propose call
      setProposing(true);
      proposePayloadRef.current = { id, sellerAddr, targetWei, deadline, description };
    } catch {
      toast.error("Invalid inputs for test deal");
    }
  }

  // Stable holder for propose payload across renders
  const proposePayloadRef = useRef<{ id: bigint; sellerAddr: string; targetWei: bigint; deadline: bigint; description: string } | null>(null);

  const createReceipt = useWaitForTransactionReceipt({ hash: createHash, query: { enabled: Boolean(createHash) } });
  const mintReceipt = useWaitForTransactionReceipt({ hash: mintHash, query: { enabled: Boolean(mintHash) } });
  const approveReceipt = useWaitForTransactionReceipt({ hash: approveHash, query: { enabled: Boolean(approveHash) } });
  const proposeReceipt = useWaitForTransactionReceipt({ hash: proposeHash, query: { enabled: Boolean(proposeHash) } });
  const yieldReceipt = useWaitForTransactionReceipt({ hash: yieldHash, query: { enabled: Boolean(yieldHash) } });

  useEffect(() => {
    if (!createReceipt.isSuccess || !createHash) return;
    const payload = proposePayloadRef.current;
    if (!payload) { setProposing(false); return; }
    const { id, sellerAddr, targetWei, deadline, description } = payload;
    writeContract(
      {
        address: VOTE_ESCROW_ADDRESS as `0x${string}`,
        abi: voteEscrowAbi as any,
        functionName: "proposeProperty",
        args: [id, sellerAddr, targetWei, deadline, description],
        chain: baseSepolia,
        gas: 350000n
      } as any,
      {
        onSuccess: (hash) => { setProposeHash(hash); toast.loading("Creating test proposal…", { id: hash }); setProposing(false); },
        onError: () => { toast.error("Failed to create proposal"); setProposing(false); }
      }
    );
  }, [createReceipt.isSuccess, createHash, writeContract]);

  useEffect(() => {
    if (mintReceipt.isSuccess && mintHash) toast.success("USDC minted ✅", { id: mintHash });
    if (mintReceipt.isError && mintHash) toast.error("Mint failed", { id: mintHash });
  }, [mintReceipt.isSuccess, mintReceipt.isError, mintHash]);

  useEffect(() => {
    if (approveReceipt.isSuccess && approveHash) toast.success("USDC approved ✅", { id: approveHash });
    if (approveReceipt.isError && approveHash) toast.error("Approve failed", { id: approveHash });
  }, [approveReceipt.isSuccess, approveReceipt.isError, approveHash]);

  useEffect(() => {
    if (proposeReceipt.isSuccess && proposeHash) toast.success("Proposal created ✅", { id: proposeHash });
    if (proposeReceipt.isError && proposeHash) toast.error("Proposal failed", { id: proposeHash });
  }, [proposeReceipt.isSuccess, proposeReceipt.isError, proposeHash]);

  function seedYield() {
    try {
      const id = idFromPropertyKey(label);
      const amount = parseUnits(yieldAmount, usdcDecimals);
      writeContract(
        { address: YIELD_VAULT_ADDRESS as `0x${string}`, abi: yieldVaultAbi as any, functionName: "depositYield", args: [id, amount], chain: baseSepolia, gas: 180000n } as any,
        { onSuccess: (hash) => { setYieldHash(hash); toast.loading("Depositing test yield…", { id: hash }); }, onError: () => toast.error("Failed to deposit yield") }
      );
    } catch { toast.error("Invalid yield amount"); }
  }

  useEffect(() => {
    if (yieldReceipt.isSuccess && yieldHash) toast.success("Yield deposited ✅", { id: yieldHash });
    if (yieldReceipt.isError && yieldHash) toast.error("Deposit failed", { id: yieldHash });
  }, [yieldReceipt.isSuccess, yieldReceipt.isError, yieldHash]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Admin • Simulation Mode</h1>
        <p className="text-xs text-gray-500">Mint test USDC, create a fake property + proposal, and seed yield.</p>
      </header>
      {!isOwner && (
        <div className="border rounded-xl p-4 text-sm text-red-600">Only the contract owner can use simulation mode.</div>
      )}

      <section className="border rounded-xl p-4 space-y-3 text-sm">
        <h2 className="font-semibold text-sm">1. Test USDC</h2>
        <p className="text-xs text-gray-500">Your USDC balance: <span className="font-semibold">{usdcBalance}</span></p>
        <button type="button" onClick={mintUsdc} className="mt-2 rounded-md bg-slate-800 text-white px-3 py-1.5 text-xs" disabled={!isOwner}>Mint 1000 test USDC</button>
      </section>

      <section className="border rounded-xl p-4 space-y-3 text-sm">
        <h2 className="font-semibold text-sm">2. Create Test Deal</h2>
        <label className="block"><span className="text-xs text-gray-600">Property label</span>
          <input value={label} onChange={(e) => setLabel(e.target.value)} className="mt-1 w-full border rounded-md px-2 py-1 text-sm" />
          {propertyIdPreview && (<p className="mt-1 text-[10px] text-gray-500">Derived ID: <code>{propertyIdPreview.toString()}</code></p>)}
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="text-xs text-gray-600">Target raise (ETH)</span>
            <input value={targetEth} onChange={(e) => setTargetEth(e.target.value)} className="mt-1 w-full border rounded-md px-2 py-1 text-sm" />
          </label>
          <label className="block"><span className="text-xs text-gray-600">Share price (ETH)</span>
            <input value={sharePriceEth} onChange={(e) => setSharePriceEth(e.target.value)} className="mt-1 w-full border rounded-md px-2 py-1 text-sm" />
          </label>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <label className="block"><span className="text-xs text-gray-600">Max shares</span>
            <input value={maxShares} onChange={(e) => setMaxShares(e.target.value)} className="mt-1 w-full border rounded-md px-2 py-1 text-sm" />
          </label>
          <label className="block"><span className="text-xs text-gray-600">Yield bps</span>
            <input value={yieldBps} onChange={(e) => setYieldBps(e.target.value)} className="mt-1 w-full border rounded-md px-2 py-1 text-sm" />
          </label>
          <label className="block"><span className="text-xs text-gray-600">Funding window (days)</span>
            <input value={days} onChange={(e) => setDays(e.target.value)} className="mt-1 w-full border rounded-md px-2 py-1 text-sm" />
          </label>
        </div>
        <label className="block"><span className="text-xs text-gray-600">Seller wallet (optional)</span>
          <input value={seller} onChange={(e) => setSeller(e.target.value)} className="mt-1 w-full border rounded-md px-2 py-1 text-sm" placeholder={address ?? "0xSeller..."} />
        </label>
        <button type="button" disabled={!isOwner || isPending || proposing} onClick={createTestDeal} className="mt-3 rounded-md bg-emerald-600 text-white px-3 py-1.5 text-xs disabled:bg-gray-300">{isPending || proposing ? "Submitting…" : "Create ERC-1155 + Proposal"}</button>
      </section>

      <section className="border rounded-xl p-4 space-y-3 text-sm">
        <h2 className="font-semibold text-sm">3. Seed Test Yield</h2>
        <p className="text-xs text-gray-500">Current allowance for YieldVault: <span className="font-semibold">{allowance}</span> USDC</p>
        <div className="flex gap-2">
          <button type="button" onClick={approveUsdc} className="rounded-md bg-slate-800 text-white px-3 py-1.5 text-xs" disabled={!isOwner}>Approve USDC for YieldVault</button>
        </div>
        <label className="block mt-3"><span className="text-xs text-gray-600">Yield amount (USDC)</span>
          <input value={yieldAmount} onChange={(e) => setYieldAmount(e.target.value)} className="mt-1 w-full border rounded-md px-2 py-1 text-sm" />
        </label>
        <button type="button" onClick={seedYield} disabled={!isOwner || Number(yieldAmount || "0") > allowance || isPending} className="mt-3 rounded-md bg-indigo-600 text-white px-3 py-1.5 text-xs disabled:bg-gray-300">Deposit yield for this property</button>
        {Number(yieldAmount || "0") > allowance && (
          <p className="mt-1 text-[10px] text-red-500">Allowance is too low. Click “Approve USDC for YieldVault” first.</p>
        )}
      </section>
    </main>
  );
}


