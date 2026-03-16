import type { Metadata } from "next";
import "./globals.css";
import { StarknetProvider } from "@/providers/starknet";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "StarkFit - Stake. Walk. Earn.",
  description:
    "Crypto fitness challenges on Starknet. Stake ETH, complete daily steps, split the prize pool.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <StarknetProvider>
          <Navbar />
          <main>{children}</main>
        </StarknetProvider>
      </body>
    </html>
  );
}
