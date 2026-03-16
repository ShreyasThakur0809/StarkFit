"use client";

import { useState } from "react";
import { useAccount } from "@/providers/starknet";
import Link from "next/link";

// Mock data for demo
const MOCK_CHALLENGES = [
  {
    id: 1,
    token: "ETH",
    stakeAmount: "0.01",
    durationDays: 30,
    stepGoal: 7000,
    activePlayers: 12,
    totalPlayers: 15,
    totalPool: "0.15",
    isActive: true,
    daysLeft: 22,
  },
  {
    id: 2,
    token: "ETH",
    stakeAmount: "0.05",
    durationDays: 14,
    stepGoal: 10000,
    activePlayers: 5,
    totalPlayers: 8,
    totalPool: "0.40",
    isActive: true,
    daysLeft: 7,
  },
  {
    id: 3,
    token: "WBTC",
    stakeAmount: "0.001",
    durationDays: 7,
    stepGoal: 7000,
    activePlayers: 20,
    totalPlayers: 20,
    totalPool: "0.02",
    isActive: true,
    daysLeft: 5,
  },
];

export default function ChallengesPage() {
  const { isConnected } = useAccount();
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    token: "ETH",
    stakeAmount: "0.01",
    durationDays: 30,
    stepGoal: 7000,
  });

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
                <option value="ETH">ETH</option>
                <option value="WBTC">WBTC</option>
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
                    durationDays: parseInt(e.target.value),
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
                    stepGoal: parseInt(e.target.value),
                  })
                }
                className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-white"
              />
            </div>
          </div>
          <button className="btn-primary mt-4">Create Challenge</button>
        </div>
      )}

      {/* Challenge Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {MOCK_CHALLENGES.map((challenge) => (
          <div key={challenge.id} className="card hover:border-[var(--accent-green)]/30 transition">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm px-2 py-1 rounded-md bg-green-900/30 text-green-400 border border-green-500/30">
                Active
              </span>
              <span className="text-sm text-[var(--text-secondary)]">
                {challenge.daysLeft} days left
              </span>
            </div>

            <h3 className="text-lg font-semibold mb-1">
              {challenge.stepGoal.toLocaleString()} Steps / Day
            </h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              {challenge.durationDays}-day challenge
            </p>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-xs text-[var(--text-secondary)]">
                  Stake
                </div>
                <div className="font-semibold">
                  {challenge.stakeAmount} {challenge.token}
                </div>
              </div>
              <div>
                <div className="text-xs text-[var(--text-secondary)]">
                  Prize Pool
                </div>
                <div className="font-semibold gradient-text">
                  {challenge.totalPool} {challenge.token}
                </div>
              </div>
              <div>
                <div className="text-xs text-[var(--text-secondary)]">
                  Players
                </div>
                <div className="font-semibold">
                  {challenge.activePlayers}/{challenge.totalPlayers}
                </div>
              </div>
              <div>
                <div className="text-xs text-[var(--text-secondary)]">
                  Survival Rate
                </div>
                <div className="font-semibold">
                  {Math.round(
                    (challenge.activePlayers / challenge.totalPlayers) * 100
                  )}
                  %
                </div>
              </div>
            </div>

            {/* Progress bar showing survival */}
            <div className="w-full h-2 bg-[var(--bg-secondary)] rounded-full mb-4">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-[var(--accent-green)] to-[var(--accent-blue)]"
                style={{
                  width: `${(challenge.activePlayers / challenge.totalPlayers) * 100}%`,
                }}
              />
            </div>

            <Link
              href={`/challenges/${challenge.id}`}
              className="btn-primary w-full block text-center text-sm"
            >
              {isConnected ? "Join Challenge" : "View Details"}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
