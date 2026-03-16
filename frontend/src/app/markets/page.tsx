"use client";

import { useState } from "react";
import { useAccount } from "@/providers/starknet";

const MOCK_MARKETS = [
  {
    id: 1,
    challengeId: 1,
    playerAddress: "0x01a2...f3b4",
    yesPool: "2.5",
    noPool: "1.2",
    token: "ETH",
    isResolved: false,
    currentDay: 8,
    totalDays: 30,
  },
  {
    id: 2,
    challengeId: 1,
    playerAddress: "0x05c6...d7e8",
    yesPool: "0.8",
    noPool: "3.1",
    token: "ETH",
    isResolved: false,
    currentDay: 8,
    totalDays: 30,
  },
  {
    id: 3,
    challengeId: 2,
    playerAddress: "0x09f0...a1b2",
    yesPool: "1.0",
    noPool: "1.0",
    token: "ETH",
    isResolved: true,
    outcome: true,
    currentDay: 14,
    totalDays: 14,
  },
];

export default function MarketsPage() {
  const { isConnected } = useAccount();
  const [betAmounts, setBetAmounts] = useState<Record<number, string>>({});

  const getYesPercent = (yes: string, no: string) => {
    const total = parseFloat(yes) + parseFloat(no);
    return total > 0 ? Math.round((parseFloat(yes) / total) * 100) : 50;
  };

  return (
    <div className="pt-24 px-6 max-w-6xl mx-auto pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Prediction Markets</h1>
        <p className="text-[var(--text-secondary)] mt-1">
          Bet on whether players will complete their challenges
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {MOCK_MARKETS.map((market) => {
          const yesPercent = getYesPercent(market.yesPool, market.noPool);
          return (
            <div key={market.id} className="card">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-[var(--text-secondary)]">
                  Challenge #{market.challengeId}
                </span>
                {market.isResolved ? (
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      market.outcome
                        ? "bg-green-900/30 text-green-400"
                        : "bg-red-900/30 text-red-400"
                    }`}
                  >
                    {market.outcome ? "Completed" : "Eliminated"}
                  </span>
                ) : (
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-900/30 text-blue-400">
                    Day {market.currentDay}/{market.totalDays}
                  </span>
                )}
              </div>

              <h3 className="font-semibold mb-1">
                Will {market.playerAddress} complete?
              </h3>

              {/* Probability bar */}
              <div className="my-4">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-green-400">YES {yesPercent}%</span>
                  <span className="text-red-400">NO {100 - yesPercent}%</span>
                </div>
                <div className="w-full h-3 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-green-500"
                    style={{ width: `${yesPercent}%` }}
                  />
                  <div
                    className="h-full bg-red-500"
                    style={{ width: `${100 - yesPercent}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                <div className="text-center p-2 rounded-lg bg-green-900/20 border border-green-500/20">
                  <div className="text-[var(--text-secondary)]">YES Pool</div>
                  <div className="font-bold text-green-400">
                    {market.yesPool} {market.token}
                  </div>
                </div>
                <div className="text-center p-2 rounded-lg bg-red-900/20 border border-red-500/20">
                  <div className="text-[var(--text-secondary)]">NO Pool</div>
                  <div className="font-bold text-red-400">
                    {market.noPool} {market.token}
                  </div>
                </div>
              </div>

              {!market.isResolved && isConnected && (
                <>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Amount"
                    value={betAmounts[market.id] || ""}
                    onChange={(e) =>
                      setBetAmounts({
                        ...betAmounts,
                        [market.id]: e.target.value,
                      })
                    }
                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-white text-sm mb-3"
                  />
                  <div className="flex gap-2">
                    <button className="flex-1 py-2 rounded-lg bg-green-600 hover:bg-green-500 transition text-sm font-semibold">
                      Bet YES
                    </button>
                    <button className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 transition text-sm font-semibold">
                      Bet NO
                    </button>
                  </div>
                </>
              )}

              {market.isResolved && (
                <button className="btn-primary w-full text-sm">
                  Claim Winnings
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
