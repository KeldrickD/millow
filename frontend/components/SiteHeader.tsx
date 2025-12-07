"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ConnectWalletButton from "./ConnectWalletButton";
import NetworkBadge from "./NetworkBadge";

type NavLink = {
  href: string;
  label: string;
  matchStartsWith?: boolean;
};

const links: NavLink[] = [
  { href: "/", label: "Marketplace", matchStartsWith: true },
  { href: "/explore", label: "Explore", matchStartsWith: true },
  { href: "/portfolio", label: "Portfolio", matchStartsWith: true },
  { href: "/admin/properties", label: "Admin", matchStartsWith: true },
  { href: "/admin/rto", label: "RTO", matchStartsWith: true },
  { href: "/admin/escrow", label: "Escrow", matchStartsWith: true },
  { href: "/admin/sim", label: "Sim tools", matchStartsWith: true }
];

function isActive(pathname: string, href: string, matchStartsWith?: boolean) {
  if (matchStartsWith) {
    return pathname === href || pathname.startsWith(href + "/");
  }
  return pathname === href;
}

export default function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-white/70 bg-wildSand/90 backdrop-blur-md shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:py-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blaze text-xs font-bold text-white">
            BS
          </div>
          <div className="hidden flex-col leading-tight md:flex">
            <span className="text-sm font-semibold text-mirage">BrickStack</span>
            <span className="text-[10px] text-mirage/60">Tokenized real estate marketplace</span>
          </div>
        </Link>

        <nav className="flex items-center gap-3 text-xs font-medium text-mirage/70 md:gap-5 md:text-sm">
          {links.map((l) => {
            const active = isActive(pathname || "/", l.href, l.matchStartsWith);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "rounded-full border-b-2 border-blaze px-2 pb-0.5 text-blaze font-semibold"
                    : "px-2 hover:text-deepSea transition-colors"
                }
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <NetworkBadge />
          <ConnectWalletButton />
        </div>
      </div>
    </header>
  );
}
