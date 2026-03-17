"use client";

import Link from "next/link";
import { useStarkZap } from "@/providers/starknet";
import { useState } from "react";

export function Navbar() {
  const {
    address,
    isConnected,
    isConnecting,
    availableWallets,
    connectBrowserWallet,
    connectCartridge,
    disconnect,
  } = useStarkZap();
  const [showMenu, setShowMenu] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [error, setError] = useState("");

  const shortAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "";

  const handleBrowserWallet = async (wallet: any) => {
    setError("");
    try {
      await connectBrowserWallet(wallet);
      setShowConnectModal(false);
    } catch (e: any) {
      setError(e.message?.slice(0, 150) || "Connection failed");
    }
  };

  const handleCartridgeConnect = async () => {
    setError("");
    try {
      await connectCartridge();
      setShowConnectModal(false);
    } catch (e: any) {
      setError(e.message?.slice(0, 150) || "Connection failed");
    }
  };

  return (
    <>
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
                onClick={() => setShowConnectModal(true)}
                disabled={isConnecting}
                className="btn-primary text-sm"
              >
                {isConnecting ? "Connecting..." : "Connect Wallet"}
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Connect Wallet Modal */}
      {showConnectModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => {
            setShowConnectModal(false);
            setError("");
          }}
        >
          <div
            className="card max-w-sm w-full mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">Connect Wallet</h2>
              <button
                onClick={() => {
                  setShowConnectModal(false);
                  setError("");
                }}
                className="text-[var(--text-secondary)] hover:text-white transition text-xl leading-none"
              >
                &times;
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/20 text-sm text-[var(--accent-red)]">
                {error}
              </div>
            )}

            <div className="space-y-2.5">
              {/* Detected browser wallets (Ready, Argent X, Braavos, etc.) */}
              {availableWallets.map((w) => (
                <button
                  key={w.id}
                  onClick={() => handleBrowserWallet(w)}
                  disabled={isConnecting}
                  className="w-full flex items-center gap-3 p-3.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-[var(--accent-green)]/40 transition text-left"
                >
                  {w.icon ? (
                    <img
                      src={w.icon}
                      alt={w.name}
                      className="w-9 h-9 rounded-lg shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold shrink-0">
                      {w.name?.[0] || "?"}
                    </div>
                  )}
                  <div>
                    <div className="font-medium text-sm">{w.name}</div>
                    <div className="text-xs text-[var(--text-secondary)]">
                      Browser extension
                    </div>
                  </div>
                </button>
              ))}

              {/* Cartridge Controller via StarkZap */}
              <button
                onClick={handleCartridgeConnect}
                disabled={isConnecting}
                className="w-full flex items-center gap-3 p-3.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-[var(--accent-green)]/40 transition text-left"
              >
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center text-lg font-bold text-white shrink-0">
                  C
                </div>
                <div>
                  <div className="font-medium text-sm">
                    Cartridge Controller
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    Social login &mdash; Google, X, email
                  </div>
                </div>
              </button>

              {availableWallets.length === 0 && (
                <p className="text-xs text-[var(--text-secondary)] text-center pt-2">
                  No browser wallets detected. Install Ready, Argent X, or
                  Braavos to connect, or use Cartridge above.
                </p>
              )}

              <p className="text-[10px] text-[var(--text-secondary)] text-center pt-1">
                All transactions are gasless via AVNU Paymaster
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
