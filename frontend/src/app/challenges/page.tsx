"use client";

import { useState } from "react";
import { useAccount } from "@/providers/starknet";
import { useStarkFitContract } from "@/lib/hooks";
import { useChallenges } from "@/lib/useContractData";
import {
  formatTokenAmount,
  getTokenSymbol,
  getTokenDecimals,
  getDaysLeft,
} from "@/lib/contract";
import { SUPPORTED_TOKENS } from "@/lib/constants";
import Link from "next/link";

export default function ChallengesPage() {
  const { isConnected } = useAccount();
  const { createChallenge } = useStarkFitContract();
  const { data: challenges, loading, error, refetch } = useChallenges();
  const [showCreate, setShowCreate] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    token: SUPPORTED_TOKENS[0].symbol,
    stakeAmount: "1",
    durationDays: 30,
    stepGoal: 7000,
  });

  const handleCreateChallenge = async () => {
    setIsCreating(true);
    setTxStatus(null);
    try {
      const tokenAddress = SUPPORTED_TOKENS.find(t => t.symbol === createForm.token)!.address;
      const txHash = await createChallenge(
        tokenAddress,
        createForm.stakeAmount,
        createForm.durationDays,
        createForm.stepGoal
      );
      setTxStatus(`Challenge created! Tx: ${txHash.slice(0, 10)}...`);
      setShowCreate(false);
      // Wait for state to be indexed before refetching
      setTimeout(() => refetch(), 3000);
    } catch (err: any) {
      setTxStatus(`Error: ${err.message || "Transaction failed"}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="pt-24 px-6 max-w-6xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Active Challenges</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Join a challenge and start earning
          </p>
        </div>
        {isConnected && (
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="btn-primary"
          >
            + Create Challenge
          </button>
        )}
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

      {/* Create Challenge Form */}
      {showCreate && (
        <div className="card mb-8 glow">
          <h3 className="text-lg font-semibold mb-4">Create New Challenge</h3>
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">
                Token
              </label>
              <select
                value={createForm.token}
                onChange={(e) =>
                  setCreateForm({ ...createForm, token: e.target.value })
                }
                className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-white"
              >
                {SUPPORTED_TOKENS.map((t) => (
                  <option key={t.symbol} value={t.symbol}>
                    {t.symbol}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">
                Stake Amount
              </label>
              <input
                type="number"
                step="0.001"
                value={createForm.stakeAmount}
                onChange={(e) =>
                  setCreateForm({ ...createForm, stakeAmount: e.target.value })
                }
                className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">
                Duration (days)
              </label>
              <input
                type="number"
                value={createForm.durationDays}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    durationDays: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">
                Step Goal
              </label>
              <input
                type="number"
                value={createForm.stepGoal}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    stepGoal: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-white"
              />
            </div>
          </div>
          <button
            onClick={handleCreateChallenge}
            disabled={isCreating}
            className="btn-primary mt-4"
          >
            {isCreating ? "Creating..." : "Create Challenge"}
          </button>
        </div>
      )}

      {/* Loading / Error / Empty states */}
      {loading && (
        <div className="text-center py-20 text-[var(--text-secondary)]">
          Loading challenges from Starknet...
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
      {!loading && !error && challenges?.length === 0 && (
        <div className="text-center py-20 text-[var(--text-secondary)]">
          <p className="text-xl mb-2">No challenges yet</p>
          <p>Be the first to create one!</p>
        </div>
      )}

      {/* Challenge Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {challenges?.map((ch) => {
          const symbol = getTokenSymbol(ch.token);
          const decimals = getTokenDecimals(ch.token);
          const stakeFormatted = formatTokenAmount(ch.stakeAmount, decimals);
          const poolFormatted = formatTokenAmount(ch.totalPool, decimals);
          const daysLeft = getDaysLeft(ch.startTime, ch.durationDays);
          const survivalRate =
            ch.totalPlayers > 0
              ? Math.round((ch.activePlayers / ch.totalPlayers) * 100)
              : 100;

          return (
            <div
              key={ch.id}
              className="card hover:border-[var(--accent-green)]/30 transition"
            >
              <div className="flex items-center justify-between mb-4">
                <span
                  className={`text-sm px-2 py-1 rounded-md border ${
                    ch.isEnded
                      ? "bg-gray-900/30 text-gray-400 border-gray-500/30"
                      : ch.isActive
                        ? "bg-green-900/30 text-green-400 border-green-500/30"
                        : "bg-yellow-900/30 text-yellow-400 border-yellow-500/30"
                  }`}
                >
                  {ch.isEnded ? "Ended" : ch.isActive ? "Active" : "Inactive"}
                </span>
                <span className="text-sm text-[var(--text-secondary)]">
                  {ch.isEnded ? "Completed" : `${daysLeft} days left`}
                </span>
              </div>

              <h3 className="text-lg font-semibold mb-1">
                {ch.stepGoal.toLocaleString()} Steps / Day
              </h3>
              <p className="text-sm text-[var(--text-secondary)] mb-4">
                {ch.durationDays}-day challenge
              </p>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    Stake
                  </div>
                  <div className="font-semibold">
                    {stakeFormatted} {symbol}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    Prize Pool
                  </div>
                  <div className="font-semibold gradient-text">
                    {poolFormatted} {symbol}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    Players
                  </div>
                  <div className="font-semibold">
                    {ch.activePlayers}/{ch.totalPlayers}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    Survival Rate
                  </div>
                  <div className="font-semibold">{survivalRate}%</div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 bg-[var(--bg-secondary)] rounded-full mb-4">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-[var(--accent-green)] to-[var(--accent-blue)]"
                  style={{
                    width: `${ch.totalPlayers > 0 ? survivalRate : 100}%`,
                  }}
                />
              </div>

              <Link
                href={`/challenges/${ch.id}`}
                className="btn-primary w-full block text-center text-sm"
              >
                {isConnected
                  ? ch.isEnded
                    ? "View Results"
                    : "Join Challenge"
                  : "View Details"}
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
