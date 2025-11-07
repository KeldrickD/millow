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
      <body style={{ fontFamily: "Inter, system-ui, Arial, sans-serif" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "24px" }}>
          {/* Client providers: React Query + wagmi */}
          {/* Using a client component inside the Server Layout is supported */}
          {/* to provide context to all client pages/components. */}
          <Providers>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontWeight: 600, fontSize: 18 }}>BrickStack</span>
              <ConnectWalletButton />
            </div>
            <NetworkWarning />
            {children}
          </Providers>
        </div>
      </body>
    </html>
  );
}


