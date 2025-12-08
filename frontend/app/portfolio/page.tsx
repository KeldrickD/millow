"use client";

import Link from "next/link";
import { formatEther, formatUnits } from "viem";
import { usePortfolio } from "../../hooks/usePortfolio";
import { useMyTrades } from "../../hooks/useMyTrades";

export default function PortfolioPage() {
  const { address, positions, properties, rtoAgreements, loading, error } = usePortfolio();
  const { trades, loading: tradesLoading, hasWallet } = useMyTrades();
  const dexTrades = (trades ?? []).filter(
    (t): t is DexTrade => t.kind === "dex_buy" || t.kind === "dex_sell"
  );

  if (!address) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10 space-y-2">
        <h1 className="text-2xl font-bold text-mirage">My Portfolio</h1>
        <p className="text-sm text-mirage/70">Connect your wallet to see your positions.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-mirage">My Portfolio</h1>
        <p className="text-xs text-mirage/60">
          Connected as <span className="font-mono">{address}</span>
        </p>
        <p className="text-xs text-mirage/60">On-chain holdings, pending yield, and rent-to-own agreements.</p>
      </header>

      {loading && <p className="text-xs text-mirage/60">Loading your portfolio…</p>}
      {error && <p className="text-xs text-red-500">Error: {error}</p>}

      {!loading && !error && positions.length === 0 && rtoAgreements.length === 0 && (
        <p className="text-xs text-mirage/60">No positions yet. Back a deal or enroll in rent-to-own to see it here.</p>
      )}

      {!loading && !error && (
        <>
          <OwnershipSection positions={positions} />
          <RentToOwnAgreementsSection agreements={rtoAgreements} properties={properties} />
          <MyTradesSection trades={dexTrades} loading={tradesLoading} hasWallet={hasWallet} />
        </>
      )}
    </main>
  );
}

function OwnershipSection({ positions }: { positions: any[] }) {
  if (!positions || positions.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-mirage">Owned shares</h2>
      <div className="overflow-hidden rounded-3xl border border-white bg-white shadow-sm">
        <table className="min-w-full border-collapse text-xs">
          <thead className="bg-wildSand/80">
            <tr>
              <Th>Property</Th>
              <Th>Shares</Th>
              <Th>Pending yield (USDC)</Th>
              <Th>Status</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {positions.map((entry: any, idx: number) => {
              const p = entry.property;
              const label = p?.label ?? `Property #${entry.propertyId.toString()}`;
              const status = p
                ? p.finalized
                  ? p.successful
                    ? "Successful"
                    : "Failed"
                  : "Funding"
                : "Unknown";

              const pendingUsdc = formatEther(entry.pendingYield);

              return (
                <tr key={`${entry.propertyId.toString()}-${idx}`} className="border-t border-mirage/5">
                  <Td>
                    <div className="flex flex-col">
                      <span className="font-semibold text-mirage">{label}</span>
                      <span className="font-mono text-[10px] text-mirage/50">ID {entry.propertyId.toString()}</span>
                    </div>
                  </Td>
                  <Td>{entry.shares.toString()}</Td>
                  <Td>{pendingUsdc}</Td>
                  <Td>{status}</Td>
                  <Td className="text-right">
                    <Link
                      href={`/property/${entry.propertyId.toString()}`}
                      className="rounded-full bg-deepSea px-3 py-1 text-[11px] font-semibold text-white hover:bg-deepSea/90"
                    >
                      View
                    </Link>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RentToOwnAgreementsSection({ agreements, properties }: { agreements: any[]; properties: any[] }) {
  if (!agreements || agreements.length === 0) {
    return (
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-mirage">Rent-to-own agreements</h2>
        <div className="bg-white rounded-3xl border border-dashed border-mirage/15 px-4 py-4 text-xs text-mirage/60">
          You don&apos;t have any active rent-to-own agreements yet. Back a deal or ask an admin to enroll you in a rent-to-own plan.
        </div>
      </section>
    );
  }

  const labelById = new Map<string, string>();
  for (const p of properties) {
    const id = (p as any).propertyId ?? (p as any).id ?? 0n;
    const label = (p as any).label ?? (p as any).metadataURI ?? `Property #${id.toString()}`;
    labelById.set(id.toString(), label);
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-mirage">Rent-to-own agreements</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {agreements.map((a: any, idx: number) => {
          const agreementId = a.agreementId as bigint;
          const propertyId = a.propertyId as bigint;
          const paymentAmount = a.paymentAmount as bigint;
          const equitySharesPerPayment = a.equitySharesPerPayment as bigint;
          const maxPayments = a.maxPayments as bigint;
          const tenant = a.tenant as string;
          const landlord = a.landlord as string;

          const paymentAmountDisplay = `${formatUnits(paymentAmount, 6)} USDC`;
          const label = labelById.get(propertyId.toString()) ?? `Property #${propertyId.toString()}`;

          return (
            <article
              key={`${agreementId.toString()}-${idx}`}
              className="bg-white rounded-3xl border border-white px-4 py-4 text-xs flex flex-col gap-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <p className="text-[11px] text-mirage/50">Rent-to-own</p>
                  <Link href={`/property/${propertyId.toString()}`} className="text-sm font-semibold text-mirage hover:text-blaze">
                    {label}
                  </Link>
                </div>
                <span className="text-[10px] px-2 py-1 rounded-full bg-mirage/5 text-mirage/70 border border-mirage/10">
                  Agreement #{agreementId.toString()}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-1">
                <Metric label="Payment" value={paymentAmountDisplay} />
                <Metric label="Equity / payment" value={`${equitySharesPerPayment.toString()} shares`} />
                <Metric label="Max payments" value={maxPayments.toString()} />
                <Metric label="Tenant" value={`${tenant.slice(0, 6)}…${tenant.slice(-4)}`} />
                <Metric label="Landlord" value={`${landlord.slice(0, 6)}…${landlord.slice(-4)}`} />
              </div>

              <p className="text-[10px] text-mirage/50 mt-1">
                Make payments from the property page under “Rent-to-own plan.” After all payments complete, the full share allocation is yours.
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-mirage/2 rounded-2xl px-3 py-2">
      <p className="text-[10px] text-mirage/50">{label}</p>
      <p className="text-[11px] font-semibold text-mirage mt-0.5 truncate">{value}</p>
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-mirage/60">
      {children}
    </th>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={`px-3 py-2 align-top text-[11px] text-mirage/80 ${className ?? ""}`}>
      {children}
    </td>
  );
}

type DexTrade = {
  kind: "dex_buy" | "dex_sell";
  txHash?: string;
  args: Record<string, any>;
  propertyId?: bigint;
};

function hasTxHash(trade: DexTrade): trade is DexTrade & { txHash: string } {
  return typeof (trade as any).txHash === "string";
}

function MyTradesSection({
  trades,
  loading,
  hasWallet
}: {
  trades: DexTrade[];
  loading: boolean;
  hasWallet: boolean;
}) {
  const safeTrades = trades ?? [];
  return (
    <section className="space-y-3 mt-4">
      <h2 className="text-sm font-semibold text-mirage">My trades</h2>
      {!hasWallet && <p className="text-xs text-mirage/60">Connect your wallet to see your DEX trade history.</p>}
      {hasWallet && loading && <p className="text-xs text-mirage/60">Loading your trades…</p>}
      {hasWallet && !loading && safeTrades.length === 0 && (
        <div className="text-xs text-mirage/60 bg-white rounded-2xl border border-white px-3 py-3">
          You haven’t traded any property shares on the DEX yet.
          <br />
          Head to{" "}
          <Link href="/explore" className="text-blaze font-semibold underline-offset-2 underline">
            Explore
          </Link>{" "}
          to find a property and try buying or selling shares.
        </div>
      )}
      {hasWallet && !loading && safeTrades.length > 0 && (
        <div className="bg-white rounded-3xl border border-white px-3 py-3 space-y-2">
          {safeTrades.map((t, idx) => {
            const key = hasTxHash(t) ? `${t.txHash}-${idx}` : `${idx}`;
            return <MyTradeRow key={key} trade={t} />;
          })}
        </div>
      )}
    </section>
  );
}

function MyTradeRow({ trade }: { trade: DexTrade }) {
  const date = new Date(Number(trade.args.timestamp ?? 0) * 1000 || Date.now());
  const isBuy = trade.kind === "dex_buy";
  const stable = isBuy ? (trade.args.stableIn as bigint) : (trade.args.stableOut as bigint);
  const stableFormatted = Number(formatUnits(stable, 6)).toFixed(2);
  const shares = isBuy ? (trade.args.sharesOut as bigint) : (trade.args.sharesIn as bigint);
  const propertyId = trade.propertyId ?? 0n;

  return (
    <div className="flex items-center justify-between text-[11px] text-mirage/80">
      <div className="flex flex-col">
        <span className="font-semibold">{isBuy ? "Bought" : "Sold"} {shares.toString()} shares</span>
        <span className="text-mirage/60">
          for {stableFormatted} USDC • {date.toLocaleString()}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href={`/property/${propertyId.toString()}`}
          className="text-[10px] px-2 py-1 rounded-full border border-mirage/10 text-mirage/70 hover:border-deepSea hover:text-deepSea transition"
        >
          View property
        </Link>
        <a
          href={`https://sepolia.basescan.org/tx/${trade.txHash}`}
          target="_blank"
          rel="noreferrer"
          className="text-[10px] text-mirage/50 hover:text-mirage underline underline-offset-2"
        >
          Etherscan
        </a>
      </div>
    </div>
  );
}
