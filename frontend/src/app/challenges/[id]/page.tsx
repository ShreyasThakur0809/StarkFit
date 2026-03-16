"use client";

import { useParams } from "next/navigation";
import { useAccount } from "@/providers/starknet";
import { useState } from "react";
import Link from "next/link";

// Mock data
const MOCK_PLAYERS = [
  { address: "0x01a2...f3b4", steps: 8234, day: 8, active: true },
  { address: "0x05c6...d7e8", steps: 9102, day: 8, active: true },
  { address: "0x09f0...a1b2", steps: 7500, day: 8, active: true },
  { address: "0x0d34...c5d6", steps: 3200, day: 5, active: false },
  { address: "0x0e78...e9f0", steps: 6900, day: 7, active: false },
];

export default function ChallengeDetailPage() {
  const params = useParams();
  const { address, isConnected } = useAccount();
  const [fitnessProvider, setFitnessProvider] = useState<string | null>(null);

  const challenge = {
    id: params.id,
    token: "ETH",
    stakeAmount: "0.01",
    durationDays: 30,
    stepGoal: 7000,
    activePlayers: 3,
    totalPlayers: 5,
    totalPool: "0.05",
    isActive: true,
    startDay: 1,
    currentDay: 8,
  };

  const potentialReward = (
    parseFloat(challenge.totalPool) / challenge.activePlayers
  ).toFixed(4);

  return (
    <div className="pt-24 px-6 max-w-4xl mx-auto pb-20">
      <Link
        href="/challenges"
        className="text-[var(--text-secondary)] hover:text-white transition text-sm mb-6 inline-block"
      >
        &larr; Back to Challenges
      </Link>

      {/* Header */}
      <div className="card glow mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">
            Challenge #{challenge.id}
          </h1>
          <span className="px-3 py-1 rounded-full bg-green-900/30 text-green-400 border border-green-500/30 text-sm">
            Day {challenge.currentDay} / {challenge.durationDays}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <div className="text-sm text-[var(--text-secondary)]">
              Step Goal
            </div>
            <div className="text-xl font-bold">
              {challenge.stepGoal.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-sm text-[var(--text-secondary)]">
              Prize Pool
            </div>
            <div className="text-xl font-bold gradient-text">
              {challenge.totalPool} {challenge.token}
            </div>
          </div>
          <div>
            <div className="text-sm text-[var(--text-secondary)]">
              Survivors
            </div>
            <div className="text-xl font-bold">
              {challenge.activePlayers}/{challenge.totalPlayers}
            </div>
          </div>
          <div>
            <div className="text-sm text-[var(--text-secondary)]">
              Your Reward (est.)
            </div>
            <div className="text-xl font-bold text-[var(--accent-green)]">
              {potentialReward} {challenge.token}
            </div>
          </div>
        </div>

        {/* Day progress bar */}
        <div className="mt-6">
          <div className="flex justify-between text-xs text-[var(--text-secondary)] mb-1">
            <span>Progress</span>
            <span>
              {Math.round((challenge.currentDay / challenge.durationDays) * 100)}%
            </span>
          </div>
          <div className="w-full h-3 bg-[var(--bg-secondary)] rounded-full">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-[var(--accent-green)] to-[var(--accent-blue)]"
              style={{
                width: `${(challenge.currentDay / challenge.durationDays) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Join / Fitness Connection */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Join This Challenge</h2>
          {!isConnected ? (
            <p className="text-[var(--text-secondary)]">
              Connect your wallet to join.
            </p>
          ) : (
            <>
              <div className="mb-4 p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)]">
                <div className="text-sm text-[var(--text-secondary)]">
                  Required Stake
                </div>
                <div className="font-bold text-lg">
                  {challenge.stakeAmount} {challenge.token}
                </div>
              </div>

              <div className="mb-4">
                <div className="text-sm text-[var(--text-secondary)] mb-2">
                  Connect Fitness Tracker
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setFitnessProvider("google_fit")}
                    className={`flex-1 p-3 rounded-lg border transition ${
                      fitnessProvider === "google_fit"
                        ? "border-[var(--accent-green)] bg-green-900/20"
                        : "border-[var(--border)] hover:border-[var(--accent-green)]/50"
                    }`}
                  >
                    <div className="font-semibold text-sm">Google Fit</div>
                  </button>
                  <button
                    onClick={() => setFitnessProvider("strava")}
                    className={`flex-1 p-3 rounded-lg border transition ${
                      fitnessProvider === "strava"
                        ? "border-[var(--accent-green)] bg-green-900/20"
                        : "border-[var(--border)] hover:border-[var(--accent-green)]/50"
                    }`}
                  >
                    <div className="font-semibold text-sm">Strava</div>
                  </button>
                </div>
              </div>

              <button
                className="btn-primary w-full"
                disabled={!fitnessProvider}
              >
                Stake {challenge.stakeAmount} {challenge.token} &amp; Join
              </button>
            </>
          )}
        </div>

        {/* Prediction Market */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Prediction Market</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Bet on whether players will complete this challenge
          </p>
          <Link
            href={`/markets?challenge=${challenge.id}`}
            className="btn-secondary w-full block text-center"
          >
            View Markets for This Challenge
          </Link>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="card mt-6">
        <h2 className="text-lg font-semibold mb-4">Players</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-[var(--text-secondary)]">
                <th className="pb-3">Player</th>
                <th className="pb-3">Today&apos;s Steps</th>
                <th className="pb-3">Last Verified</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_PLAYERS.map((player, i) => (
                <tr
                  key={i}
                  className="border-t border-[var(--border)]"
                >
                  <td className="py-3 font-mono text-sm">{player.address}</td>
                  <td className="py-3">
                    <span
                      className={
                        player.steps >= challenge.stepGoal
                          ? "text-[var(--accent-green)]"
                          : "text-[var(--accent-red)]"
                      }
                    >
                      {player.steps.toLocaleString()}
                    </span>
                  </td>
                  <td className="py-3 text-[var(--text-secondary)]">
                    Day {player.day}
                  </td>
                  <td className="py-3">
                    {player.active ? (
                      <span className="text-xs px-2 py-1 rounded-full bg-green-900/30 text-green-400">
                        Active
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded-full bg-red-900/30 text-red-400">
                        Eliminated
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
