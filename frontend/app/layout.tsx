import "./globals.css";
import Providers from "../components/Providers";
import ConnectWalletButton from "../components/ConnectWalletButton";
import NetworkWarning from "../components/NetworkWarning";
export const metadata = {
  title: "BrickStack",
  description: "Fractional real estate marketplace (MVP)"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-wildSand text-mirage">
        <Providers>
          <header className="border-b border-white/60 bg-white/80 backdrop-blur">
            <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-blaze text-white flex items-center justify-center text-xs font-bold">
                  BS
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="font-semibold text-sm">BrickStack</span>
                  <span className="text-[10px] text-mirage/60">Tokenized real estate marketplace</span>
                </div>
              </div>
              <ConnectWalletButton />
            </div>
          </header>
          <NetworkWarning />
          <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        </Providers>
      </body>
    </html>
  );
}

