"use client";

import Link from "next/link";
import WaitlistBanner from "../components/WaitlistBanner";

export default function LandingPage() {
  return (
    <div className="bg-wildSand min-h-screen">
      <main className="mx-auto max-w-6xl px-4 py-8 space-y-12">
        {/* Hero */}
        <section className="grid gap-8 md:grid-cols-[1.6fr,1.4fr] items-center">
          <div className="space-y-5">
            <span className="inline-flex items-center gap-2 rounded-full bg-white border border-white px-3 py-1 text-[11px] text-mirage/70">
              <span className="h-1.5 w-1.5 rounded-full bg-[#ff5b04]" />
              Live demo on Base Sepolia • Testnet only
            </span>
            <h1 className="text-3xl md:text-4xl font-bold text-mirage leading-tight">
              Fractional real estate that{" "}
              <span className="text-[#ff5b04]">actually lives on-chain.</span>
            </h1>
            <p className="text-sm text-mirage/70 max-w-xl">
              BrickStack lets you back real properties on Base with as little as one share, track rent in real time, and
              trade your stake like a liquid asset — all from a familiar, Zillow-style interface.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/explore"
                className="inline-flex items-center justify-center rounded-full bg-[#ff5b04] text-white text-xs font-semibold px-4 py-2 hover:bg-[#ff5b04]/90 transition"
              >
                Explore live demo deals
              </Link>
              <a
                href="https://www.loom.com/share/your-demo-id-here"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-full border border-mirage/10 bg-white text-xs font-semibold text-mirage px-4 py-2 hover:bg-mirage/5 transition"
              >
                Watch demo flow
              </a>
            </div>
            <ul className="grid grid-cols-2 gap-3 text-[11px] text-mirage/70 max-w-md">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-deepSea" />
                <span>Tokenized property shares (ERC-1155 on Base)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-deepSea" />
                <span>On-chain rent distribution in stablecoins</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-deepSea" />
                <span>Built-in DEX for property share liquidity</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-deepSea" />
                <span>Rent-to-own for tenants who want equity</span>
              </li>
            </ul>
          </div>

          {/* Simple “screenshot-style” card */}
          <div className="relative">
            <div className="rounded-3xl bg-white border border-white shadow-sm p-4 space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[11px] text-mirage/50">Featured deal</p>
                  <p className="text-xs font-semibold text-mirage">1770 Boulder Walk Ln SE, Atlanta</p>
                </div>
                <span className="inline-flex items-center rounded-full bg-deepSea/10 text-deepSea text-[10px] px-2 py-1">
                  Raising 120 ETH
                </span>
              </div>
              <div className="rounded-2xl overflow-hidden h-40 bg-mirage/10">
                <div className="h-full w-full bg-gradient-to-tr from-mirage/60 via-[#ff5b04]/40 to-deepSea/50" />
              </div>
              <div className="grid grid-cols-3 gap-2 text-[10px]">
                <Metric label="Target raise" value="120 ETH" />
                <Metric label="Share price" value="0.25 ETH / share" />
                <Metric label="Status" value="Funding in progress" />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-mirage/60">
                  <span>72 ETH backed</span>
                  <span>60%</span>
                </div>
                <div className="h-2 rounded-full bg-mirage/10 overflow-hidden">
                  <div className="h-full w-[60%] bg-deepSea" />
                </div>
              </div>
              <button className="w-full rounded-full bg-[#ff5b04] text-white text-[11px] font-semibold py-2 hover:bg-[#ff5b04]/90 transition">
                Back this deal on testnet
              </button>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-mirage">How BrickStack works</h2>
          <div className="grid md:grid-cols-3 gap-3 text-[11px] text-mirage/80">
            <StepCard
              title="1. List a property"
              body="Agents and developers upload photos and details, set target raise, share price, and deadline. BrickStack mints ERC-1155 shares on Base and opens the round."
            />
            <StepCard
              title="2. Back in one click"
              body="Investors connect a wallet, review the metrics, and click “Back this deal”. ETH is locked into smart escrow and counted toward the raise."
            />
            <StepCard
              title="3. Own, earn, and exit"
              body="Once funded, shares mint to backers. Hold to earn rent in stablecoins, trade via the built-in DEX, or use rent-to-own agreements to accumulate equity."
            />
          </div>
        </section>

        {/* Differentiators */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-mirage">Why this is different</h2>
          <div className="grid md:grid-cols-3 gap-3 text-[11px] text-mirage/80">
            <FeatureCard
              title="On-chain rental yield"
              body="Rent flows into a yield vault and is claimable per share in stablecoins. No spreadsheets, no manual distributions."
            />
            <FeatureCard
              title="Built-in property DEX"
              body="Buy and sell property shares against USDC, with live market pricing and implied property value on every listing."
            />
            <FeatureCard
              title="Programmable rent-to-own"
              body="Tenants can sign smart rent-to-own agreements where each payment mints equity tokens instead of vanishing as rent."
            />
            <FeatureCard
              title="Smart escrow, not paper escrow"
              body="Milestone-based smart escrow with oracle hooks. Funds only move when inspections and build stages are verified."
            />
            <FeatureCard
              title="Per-property governance"
              body="Shareholders vote on renovations, rent changes, and refinancing directly on-chain. Voting power = ownership."
            />
            <FeatureCard
              title="Base-native & composable"
              body="Built on Base with clean ABIs and indexer-friendly events so partners can plug into BrickStack via APIs and SDKs."
            />
          </div>
        </section>

        {/* Testnet demo + waitlist */}
        <section className="space-y-4">
          <div className="rounded-3xl bg-white border border-white p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-[11px] text-mirage/80">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-mirage">Try the full flow on Base Sepolia</p>
              <p className="text-mirage/70 max-w-xl">
                Today, BrickStack runs on Base Sepolia so you can back a demo property, trigger smart escrow, claim mock
                rent, and trade property shares without risking real capital. Mainnet deals will follow once legal and
                compliance rails are live.
              </p>
            </div>
            <Link
              href="/explore"
              className="inline-flex items-center justify-center rounded-full bg-[#ff5b04] text-white text-xs font-semibold px-4 py-2 hover:bg-[#ff5b04]/90 transition shrink-0"
            >
              Explore the testnet demo
            </Link>
          </div>

          <div className="max-w-xl">
            <WaitlistBanner />
          </div>
        </section>

        {/* FAQ */}
        <section className="space-y-3 pb-10">
          <h2 className="text-sm font-semibold text-mirage">FAQ</h2>
          <dl className="space-y-3 text-[11px] text-mirage/80">
            <QA
              q="Is this live with real properties yet?"
              a="Right now we’re on Base Sepolia with demo properties so you can try the full flow with testnet funds. Mainnet launches will come after legal and compliance partners are locked in."
            />
            <QA
              q="Do I need to be an accredited investor?"
              a="For the demo, no. For real properties, eligibility will depend on the jurisdiction and deal structure. BrickStack is being designed to integrate KYC/AML and region-specific rules via partners."
            />
            <QA
              q="What wallet do I need?"
              a="Any wallet that supports Base works: MetaMask, Coinbase Wallet, Rainbow and others. Just connect and switch to Base or Base Sepolia."
            />
            <QA
              q="Why Base?"
              a="Base gives us low fees, EVM compatibility, and a path to mainstream adoption via Coinbase. It’s the right place to bring real-world assets on-chain."
            />
          </dl>
        </section>
      </main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-wildSand border border-wildSand px-2 py-1.5">
      <p className="text-[10px] text-mirage/50">{label}</p>
      <p className="text-[11px] font-semibold text-mirage mt-0.5">{value}</p>
    </div>
  );
}

function StepCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-3xl bg-white border border-white px-3 py-3 space-y-1">
      <p className="text-[11px] font-semibold text-mirage">{title}</p>
      <p className="text-[11px] text-mirage/70">{body}</p>
    </div>
  );
}

function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-3xl bg-white border border-white px-3 py-3 space-y-1">
      <p className="text-[11px] font-semibold text-mirage">{title}</p>
      <p className="text-[11px] text-mirage/70">{body}</p>
    </div>
  );
}

function QA({ q, a }: { q: string; a: string }) {
  return (
    <div className="rounded-3xl bg-white border border-white px-3 py-3">
      <dt className="text-[11px] font-semibold text-mirage">{q}</dt>
      <dd className="text-[11px] text-mirage/70 mt-1">{a}</dd>
    </div>
  );
}

