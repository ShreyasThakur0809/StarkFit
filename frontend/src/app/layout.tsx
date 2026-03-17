import type { Metadata } from "next";
import "./globals.css";
import { StarknetProvider } from "@/providers/starknet";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Commit. Move. Win. ",
  description:
    "Stake your commitment. Hit your daily step goal or get eliminated. The last ones standing take the entire pot.",
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
