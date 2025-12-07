"use client";

import { FormEvent, useState } from "react";
import { useAccount, useChainId, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { parseUnits } from "viem";
import { RENT_TO_OWN_ADDRESS, rentToOwnAbi } from "../../../lib/contracts";
import { idFromPropertyKey } from "../../../lib/slug";

const SUPPORTED_CHAINS = [baseSepolia.id, base.id];

export default function AdminRentToOwnPage() {
  const chainId = useChainId();
  const { address } = useAccount();

  const [createLoading, setCreateLoading] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [createStatus, setCreateStatus] = useState<string | null>(null);
  const [payStatus, setPayStatus] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState({
    propertyLabel: "",
    tenant: "",
    landlord: "",
    paymentAmount: "",
    equityPerPayment: "",
    maxPayments: ""
  });

  const [payAgreementId, setPayAgreementId] = useState<string>("");

  const { writeContract: writeCreate, data: createHash } = useWriteContract();
  const { writeContract: writePay, data: payHash } = useWriteContract();

  const createReceipt = useWaitForTransactionReceipt({ hash: createHash, query: { enabled: Boolean(createHash) } });
  const payReceipt = useWaitForTransactionReceipt({ hash: payHash, query: { enabled: Boolean(payHash) } });

  if (createReceipt.isSuccess && createHash && createLoading) {
    setCreateStatus("Agreement created successfully.");
    setCreateLoading(false);
  }
  if (payReceipt.isSuccess && payHash && payLoading) {
    setPayStatus("Payment submitted successfully.");
    setPayLoading(false);
  }

  const wrongNetwork = !SUPPORTED_CHAINS.includes(chainId ?? 0);

  function onChangeCreate(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setCreateForm((prev) => ({ ...prev, [name]: value }));
  }

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    if (!address) {
      setCreateStatus("Connect a wallet first.");
      return;
    }
    if (!RENT_TO_OWN_ADDRESS) {
      setCreateStatus("RENT_TO_OWN_ADDRESS not configured.");
      return;
    }
    if (wrongNetwork) {
      setCreateStatus("Switch to Base Sepolia/Mainnet to create an agreement.");
      return;
    }

    try {
      const { propertyLabel, tenant, landlord, paymentAmount, equityPerPayment, maxPayments } = createForm;
      const propertyId = idFromPropertyKey(propertyLabel);
      const paymentAmountRaw = parseUnits(paymentAmount || "0", 6);
      const equity = BigInt(equityPerPayment || "0");
      const maxP = BigInt(maxPayments || "0");

      setCreateLoading(true);
      setCreateStatus("Signing createAgreement transaction…");

      writeCreate(
        {
          address: RENT_TO_OWN_ADDRESS,
          abi: rentToOwnAbi,
          functionName: "createAgreement",
          args: [tenant as `0x${string}`, landlord as `0x${string}`, propertyId, paymentAmountRaw, equity, maxP],
          chain: chainId === base.id ? base : baseSepolia,
          account: address as `0x${string}`
        },
        {
          onError(err) {
            console.error(err);
            setCreateLoading(false);
            setCreateStatus("Transaction failed or rejected.");
          }
        }
      );
    } catch (err) {
      console.error(err);
      setCreateLoading(false);
      setCreateStatus("Invalid input; check amounts and addresses.");
    }
  };

  const handlePay = (e: FormEvent) => {
    e.preventDefault();
    if (!address) {
      setPayStatus("Connect a wallet first.");
      return;
    }
    if (!RENT_TO_OWN_ADDRESS) {
      setPayStatus("RENT_TO_OWN_ADDRESS not configured.");
      return;
    }
    if (wrongNetwork) {
      setPayStatus("Switch to Base Sepolia/Base Mainnet to pay.");
      return;
    }

    try {
      const id = BigInt(payAgreementId || "0");
      setPayLoading(true);
      setPayStatus("Signing payment transaction…");

      writePay(
        {
          address: RENT_TO_OWN_ADDRESS,
          abi: rentToOwnAbi,
          functionName: "pay",
          args: [id],
          chain: chainId === base.id ? base : baseSepolia,
          account: address as `0x${string}`
        },
        {
          onError(err) {
            console.error(err);
            setPayLoading(false);
            setPayStatus("Payment failed or rejected.");
          }
        }
      );
    } catch (err) {
      console.error(err);
      setPayLoading(false);
      setPayStatus("Invalid agreement ID.");
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-mirage">Admin · Rent-to-Own</h1>
        <p className="text-xs text-mirage/60">Create and manage rent-to-own agreements for existing tokenized properties.</p>
        {wrongNetwork && (
          <p className="text-[11px] mt-2 text-red-600">Wrong network. Switch to Base Sepolia or Base mainnet to perform write actions.</p>
        )}
      </header>

      <section className="bg-white rounded-3xl border border-white p-4 space-y-4">
        <h2 className="text-sm font-semibold text-mirage">Create agreement</h2>
        <p className="text-[11px] text-mirage/60">
          Use the exact property label used when creating the listing so the derived ID matches the ERC-1155 series.
        </p>
        <form onSubmit={handleCreate} className="grid gap-3 text-xs md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="block text-[11px] text-mirage/60 mb-1">Property label</label>
            <input
              name="propertyLabel"
              value={createForm.propertyLabel}
              onChange={onChangeCreate}
              placeholder="1770 Boulder Walk Ln SE, Atlanta, GA 30316"
              className="w-full rounded-xl border border-mirage/10 px-3 py-2 text-xs bg-mirage/2"
              required
            />
          </div>
          <div>
            <label className="block text-[11px] text-mirage/60 mb-1">Tenant wallet</label>
            <input
              name="tenant"
              value={createForm.tenant}
              onChange={onChangeCreate}
              placeholder="0x..."
              className="w-full rounded-xl border border-mirage/10 px-3 py-2 text-xs bg-mirage/2"
              required
            />
          </div>
          <div>
            <label className="block text-[11px] text-mirage/60 mb-1">Landlord wallet</label>
            <input
              name="landlord"
              value={createForm.landlord}
              onChange={onChangeCreate}
              placeholder="0x..."
              className="w-full rounded-xl border border-mirage/10 px-3 py-2 text-xs bg-mirage/2"
              required
            />
          </div>
          <div>
            <label className="block text-[11px] text-mirage/60 mb-1">Payment amount (USDC)</label>
            <input
              name="paymentAmount"
              value={createForm.paymentAmount}
              onChange={onChangeCreate}
              placeholder="1500"
              className="w-full rounded-xl border border-mirage/10 px-3 py-2 text-xs bg-mirage/2"
              required
            />
          </div>
          <div>
            <label className="block text-[11px] text-mirage/60 mb-1">Equity shares per payment</label>
            <input
              name="equityPerPayment"
              value={createForm.equityPerPayment}
              onChange={onChangeCreate}
              placeholder="10"
              className="w-full rounded-xl border border-mirage/10 px-3 py-2 text-xs bg-mirage/2"
              required
            />
          </div>
          <div>
            <label className="block text-[11px] text-mirage/60 mb-1">Max payments</label>
            <input
              name="maxPayments"
              value={createForm.maxPayments}
              onChange={onChangeCreate}
              placeholder="120"
              className="w-full rounded-xl border border-mirage/10 px-3 py-2 text-xs bg-mirage/2"
              required
            />
          </div>
          <div className="md:col-span-2 flex items-center justify-between gap-3 mt-2">
            <button
              type="submit"
              disabled={wrongNetwork || createLoading}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                wrongNetwork || createLoading ? "bg-mirage/10 text-mirage/40 cursor-not-allowed" : "bg-deepSea text-white hover:brightness-110"
              }`}
            >
              {createLoading ? "Creating…" : "Create rent-to-own agreement"}
            </button>
            {createStatus && <p className="text-[10px] text-mirage/60">{createStatus}</p>}
          </div>
        </form>
      </section>

      <section className="bg-white rounded-3xl border border-white p-4 space-y-4">
        <h2 className="text-sm font-semibold text-mirage">Debug · Pay as tenant</h2>
        <p className="text-[11px] text-mirage/60">
          Switch your wallet to the tenant and submit a payment for an existing agreement ID. Ensure USDC approval to the RentToOwn contract.
        </p>
        <form onSubmit={handlePay} className="flex flex-col gap-2 md:flex-row md:items-center">
          <input
            value={payAgreementId}
            onChange={(e) => setPayAgreementId(e.target.value)}
            placeholder="Agreement ID"
            className="flex-1 rounded-xl border border-mirage/10 px-3 py-2 text-xs bg-mirage/2"
            required
          />
          <button
            type="submit"
            disabled={wrongNetwork || payLoading}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
              wrongNetwork || payLoading ? "bg-mirage/10 text-mirage/40 cursor-not-allowed" : "bg-blaze text-white hover:brightness-110"
            }`}
          >
            {payLoading ? "Paying…" : "Pay installment"}
          </button>
        </form>
        {payStatus && <p className="text-[10px] text-mirage/60 mt-1">{payStatus}</p>}
      </section>
    </div>
  );
}

