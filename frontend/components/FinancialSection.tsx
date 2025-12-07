"use client";

type RowProps = {
  label: string;
  value: string;
  hint?: string;
};

function Row({ label, value, hint }: RowProps) {
  return (
    <div className="flex items-start justify-between gap-3 text-xs">
      <div>
        <p className="text-[11px] font-semibold text-mirage/70">{label}</p>
        {hint && <p className="text-[10px] text-mirage/50">{hint}</p>}
      </div>
      <p className="shrink-0 font-semibold text-mirage">{value}</p>
    </div>
  );
}

export default function FinancialSection({
  targetEth,
  sharePriceEth,
  maxShares,
  estYieldBps,
}: {
  targetEth: string;
  sharePriceEth: string;
  maxShares: string;
  estYieldBps?: string;
}) {
  return (
    <section className="space-y-3 rounded-3xl border border-white bg-white p-4">
      <h2 className="text-sm font-semibold text-mirage">Financials</h2>
      <Row
        label="Target raise"
        value={`${targetEth} ETH`}
        hint="Total capital being raised to purchase this property."
      />
      <Row
        label="Share price"
        value={`${sharePriceEth} ETH / share`}
        hint="Minimum on-chain unit. 1 share = pro-rata claim on rents + upside."
      />
      <Row
        label="Max shares"
        value={maxShares}
        hint="Hard cap on ERC-1155 supply. No dilution beyond this."
      />
      {estYieldBps && (
        <Row
          label="Target yield"
          value={`${(Number(estYieldBps) / 100).toFixed(2)}%`}
          hint="Sponsor-stated net yield after expenses."
        />
      )}
    </section>
  );
}


