"use client";

import { useState } from "react";
import { useAccount } from "@/providers/starknet";
import { useStarkFitContract } from "@/lib/hooks";
import { useMarkets } from "@/lib/useContractData";
import {
  formatTokenAmount,
  getTokenSymbol,
  getTokenDecimals,
} from "@/lib/contract";

export default function MarketsPage() {
  const { isConnected } = useAccount();
  const { betYes, betNo, claimWinnings } = useStarkFitContract();
  const { data: markets, loading, error, refetch } = useMarkets();
  const [betAmounts, setBetAmounts] = useState<Record<number, string>>({});
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>(
    {}
  );
  const [txStatus, setTxStatus] = useState<string | null>(null);

  const setLoading = (key: string, value: boolean) =>
    setLoadingStates((prev) => ({ ...prev, [key]: value }));

  const handleBetYes = async (marketId: number, tokenAddress: string) => {
    const amount = betAmounts[marketId];
    if (!amount || parseFloat(amount) <= 0) return;
    setLoading(`yes-${marketId}`, true);
    setTxStatus(null);
    try {
      const txHash = await betYes(marketId, tokenAddress, amount);
      setTxStatus(`Bet YES placed! Tx: ${txHash.slice(0, 10)}...`);
      setBetAmounts((prev) => ({ ...prev, [marketId]: "" }));
      refetch();
    } catch (err: any) {
      setTxStatus(`Error: ${err.message || "Transaction failed"}`);
    } finally {
      setLoading(`yes-${marketId}`, false);
    }
  };

  const handleBetNo = async (marketId: number, tokenAddress: string) => {
    const amount = betAmounts[marketId];
    if (!amount || parseFloat(amount) <= 0) return;
    setLoading(`no-${marketId}`, true);
    setTxStatus(null);
    try {
      const txHash = await betNo(marketId, tokenAddress, amount);
      setTxStatus(`Bet NO placed! Tx: ${txHash.slice(0, 10)}...`);
      setBetAmounts((prev) => ({ ...prev, [marketId]: "" }));
      refetch();
    } catch (err: any) {
      setTxStatus(`Error: ${err.message || "Transaction failed"}`);
    } finally {
      setLoading(`no-${marketId}`, false);
    }
  };

  const handleClaimWinnings = async (marketId: number) => {
    setLoading(`claim-${marketId}`, true);
    setTxStatus(null);
    try {
      const txHash = await claimWinnings(marketId);
      setTxStatus(`Winnings claimed! Tx: ${txHash.slice(0, 10)}...`);
      refetch();
    } catch (err: any) {
      setTxStatus(`Error: ${err.message || "Transaction failed"}`);
    } finally {
      setLoading(`claim-${marketId}`, false);
    }
  };

  return (
    <div className="pt-24 px-6 max-w-6xl mx-auto pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Prediction Markets</h1>
        <p className="text-[var(--text-secondary)] mt-1">
          Bet on whether players will complete their challenges
        </p>
      </div>

      {/* Status message */}
      {txStatus && (
        <div
          className={`mb-6 p-3 rounded-lg text-sm ${
            txStatus.startsWith("Error")
              ? "bg-red-900/30 border border-red-500/30 text-red-400"
              : "bg-green-900/30 border border-green-500/30 text-green-400"
          }`}
        >
          {txStatus}
        </div>
      )}

      {/* Loading / Error / Empty */}
      {loading && (
        <div className="text-center py-20 text-[var(--text-secondary)]">
          Loading markets from Starknet...
        </div>
      )}
      {error && (
        <div className="text-center py-20">
          <p className="text-[var(--accent-red)] mb-4">{error}</p>
          <button onClick={refetch} className="btn-secondary text-sm">
            Retry
          </button>
        </div>
      )}
      {!loading && !error && markets?.length === 0 && (
        <div className="text-center py-20 text-[var(--text-secondary)]">
          <p className="text-xl mb-2">No prediction markets yet</p>
          <p>Markets are created when players join challenges.</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {markets?.map((market) => {
          const symbol = getTokenSymbol(market.token);
          const decimals = getTokenDecimals(market.token);
          const yesFormatted = formatTokenAmount(market.yesPool, decimals);
          const noFormatted = formatTokenAmount(market.noPool, decimals);
          const totalPool = market.yesPool + market.noPool;
          const yesPercent =
            totalPool > 0n
              ? Number((market.yesPool * 100n) / totalPool)
              : 50;
          const shortPlayer = `${market.player.slice(0, 8)}...${market.player.slice(-4)}`;

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
                    Open
                  </span>
                )}
              </div>

              <h3 className="font-semibold mb-1">
                Will {shortPlayer} complete?
              </h3>

              {/* Probability bar */}
              <div className="my-4">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-green-400">YES {yesPercent}%</span>
                  <span className="text-red-400">
                    NO {100 - yesPercent}%
                  </span>
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
                    {yesFormatted} {symbol}
                  </div>
                </div>
                <div className="text-center p-2 rounded-lg bg-red-900/20 border border-red-500/20">
                  <div className="text-[var(--text-secondary)]">NO Pool</div>
                  <div className="font-bold text-red-400">
                    {noFormatted} {symbol}
                  </div>
                </div>
              </div>

              {!market.isResolved && isConnected && (
                <>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={`Amount in ${symbol}`}
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
                    <button
                      onClick={() => handleBetYes(market.id, market.token)}
                      disabled={loadingStates[`yes-${market.id}`]}
                      className="flex-1 py-2 rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-50 transition text-sm font-semibold"
                    >
                      {loadingStates[`yes-${market.id}`]
                        ? "Placing..."
                        : "Bet YES"}
                    </button>
                    <button
                      onClick={() => handleBetNo(market.id, market.token)}
                      disabled={loadingStates[`no-${market.id}`]}
                      className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 transition text-sm font-semibold"
                    >
                      {loadingStates[`no-${market.id}`]
                        ? "Placing..."
                        : "Bet NO"}
                    </button>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-2 text-center">
                    Gasless via AVNU Paymaster
                  </p>
                </>
              )}

              {market.isResolved && isConnected && (
                <button
                  onClick={() => handleClaimWinnings(market.id)}
                  disabled={loadingStates[`claim-${market.id}`]}
                  className="btn-primary w-full text-sm disabled:opacity-50"
                >
                  {loadingStates[`claim-${market.id}`]
                    ? "Claiming..."
                    : "Claim Winnings"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
