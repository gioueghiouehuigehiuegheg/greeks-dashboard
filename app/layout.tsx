import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Greeks Dashboard · Options Second-Order Exposure",
  description: "Live GEX, DEX, VEX, and Charm by strike. Black-Scholes + Schwab API.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
