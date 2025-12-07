import "./globals.css";
import Providers from "../components/Providers";
import NetworkWarning from "../components/NetworkWarning";
import DevEscrowDebug from "../components/DevEscrowDebug";
import SiteHeader from "../components/SiteHeader";
export const metadata = {
  title: "BrickStack",
  description: "Fractional real estate marketplace (MVP)"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-wildSand text-mirage">
        <Providers>
          <SiteHeader />
          <NetworkWarning />
          <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
          <DevEscrowDebug />
        </Providers>
      </body>
    </html>
  );
}

