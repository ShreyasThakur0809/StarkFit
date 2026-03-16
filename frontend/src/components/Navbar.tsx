"use client";

import Link from "next/link";
import { useStarkZap } from "@/providers/starknet";
import { useState } from "react";

export function Navbar() {
  const { address, isConnected, isConnecting, connectCartridge, disconnect } =
    useStarkZap();
  const [showMenu, setShowMenu] = useState(false);

  const shortAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--border)] bg-[var(--bg-primary)]/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-bold gradient-text">
            StarkFit
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/challenges"
              className="text-[var(--text-secondary)] hover:text-white transition"
            >
              Challenges
            </Link>
            <Link
              href="/markets"
              className="text-[var(--text-secondary)] hover:text-white transition"
            >
              Markets
            </Link>
            <Link
              href="/dashboard"
              className="text-[var(--text-secondary)] hover:text-white transition"
            >
              Dashboard
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Gasless badge */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--bg-card)] border border-[var(--border)] text-xs text-[var(--text-secondary)]">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-[var(--accent-green)]"
            >
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
            Gasless via AVNU
          </div>

          {isConnected ? (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-[var(--accent-green)]/30 transition"
              >
                <div className="pulse-dot" />
                <span className="text-sm font-mono">{shortAddress}</span>
              </button>
              {showMenu && (
                <div className="absolute right-0 top-12 card min-w-[160px]">
                  <Link
                    href="/dashboard"
                    className="block px-4 py-2 text-sm hover:text-[var(--accent-green)] transition"
                    onClick={() => setShowMenu(false)}
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={() => {
                      disconnect();
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-[var(--accent-red)] hover:opacity-80 transition"
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={connectCartridge}
              disabled={isConnecting}
              className="btn-primary text-sm"
            >
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
