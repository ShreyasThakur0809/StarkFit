"use client";

import { useAccount } from "@/providers/starknet";
import Link from "next/link";

// Mock data
const MOCK_MY_CHALLENGES = [
  {
    id: 1,
    stepGoal: 7000,
    durationDays: 30,
    currentDay: 8,
    stakeAmount: "0.01",
    token: "ETH",
    totalPool: "0.15",
    activePlayers: 12,
    myStatus: "active",
    todaySteps: 8234,
  },
  {
    id: 2,
    stepGoal: 10000,
    durationDays: 14,
    currentDay: 14,
    stakeAmount: "0.05",
    token: "ETH",
    totalPool: "0.40",
    activePlayers: 5,
    myStatus: "completed",
    todaySteps: 0,
    reward: "0.08",
  },
];

const WEEKLY_STEPS = [
  { day: "Mon", steps: 8432 },
  { day: "Tue", steps: 9101 },
  { day: "Wed", steps: 7234 },
  { day: "Thu", steps: 11203 },
  { day: "Fri", steps: 6890 },
  { day: "Sat", steps: 8756 },
  { day: "Sun", steps: 7500 },
];

export default function DashboardPage() {
  const { address, isConnected } = useAccount();

  if (!isConnected) {
    return (
      <div className="pt-24 px-6 max-w-4xl mx-auto text-center">
        <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
        <p className="text-[var(--text-secondary)] mb-8">
          Connect your wallet to view your dashboard.
        </p>
      </div>
    );
  }

  const maxSteps = Math.max(...WEEKLY_STEPS.map((d) => d.steps));

  return (
    <div className="pt-24 px-6 max-w-6xl mx-auto pb-20">
      <h1 className="text-3xl font-bold mb-2">Your Dashboard</h1>
      <p className="text-[var(--text-secondary)] mb-8 font-mono text-sm">
        {address?.slice(0, 10)}...{address?.slice(-8)}
      </p>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="card text-center">
          <div className="text-2xl font-bold gradient-text">2</div>
          <div className="text-sm text-[var(--text-secondary)]">
            Challenges Joined
          </div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-[var(--accent-green)]">1</div>
          <div className="text-sm text-[var(--text-secondary)]">Active</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-[var(--accent-yellow)]">
            0.08 ETH
          </div>
          <div className="text-sm text-[var(--text-secondary)]">
            Total Earned
          </div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold">8,234</div>
          <div className="text-sm text-[var(--text-secondary)]">
            Steps Today
          </div>
        </div>
      </div>

      {/* Weekly Steps Chart */}
      <div className="card mb-8">
        <h2 className="text-lg font-semibold mb-4">This Week&apos;s Steps</h2>
        <div className="flex items-end gap-3 h-40">
          {WEEKLY_STEPS.map((day) => (
            <div key={day.day} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs text-[var(--text-secondary)]">
                {day.steps >= 7000 ? day.steps.toLocaleString() : ""}
              </span>
              <div
                className={`w-full rounded-t-lg transition ${
                  day.steps >= 7000
                    ? "bg-gradient-to-t from-[var(--accent-green)] to-[var(--accent-blue)]"
                    : "bg-red-500/60"
                }`}
                style={{
                  height: `${(day.steps / maxSteps) * 100}%`,
                  minHeight: "8px",
                }}
              />
              <span className="text-xs text-[var(--text-secondary)]">
                {day.day}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <div className="w-3 h-3 rounded-sm bg-red-500/60" />
          Below 7,000 goal
          <div className="w-3 h-3 rounded-sm bg-[var(--accent-green)] ml-4" />
          Goal met
        </div>
      </div>

      {/* My Challenges */}
      <h2 className="text-lg font-semibold mb-4">My Challenges</h2>
      <div className="space-y-4">
        {MOCK_MY_CHALLENGES.map((ch) => (
          <div key={ch.id} className="card flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="font-semibold">
                  Challenge #{ch.id} &mdash; {ch.stepGoal.toLocaleString()} steps/day
                </h3>
                {ch.myStatus === "active" ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/30 text-green-400">
                    Active
                  </span>
                ) : ch.myStatus === "completed" ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/30 text-blue-400">
                    Completed
                  </span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/30 text-red-400">
                    Eliminated
                  </span>
                )}
              </div>
              <p className="text-sm text-[var(--text-secondary)]">
                Day {ch.currentDay}/{ch.durationDays} &bull; Pool:{" "}
                {ch.totalPool} {ch.token} &bull; {ch.activePlayers} survivors
              </p>
              {ch.myStatus === "active" && (
                <p className="text-sm mt-1">
                  Today:{" "}
                  <span
                    className={
                      ch.todaySteps >= ch.stepGoal
                        ? "text-[var(--accent-green)] font-semibold"
                        : "text-[var(--accent-yellow)] font-semibold"
                    }
                  >
                    {ch.todaySteps.toLocaleString()} steps
                  </span>
                </p>
              )}
            </div>
            <div className="flex gap-3">
              {ch.myStatus === "completed" && ch.reward && (
                <button className="btn-primary text-sm">
                  Claim {ch.reward} {ch.token}
                </button>
              )}
              <Link
                href={`/challenges/${ch.id}`}
                className="btn-secondary text-sm"
              >
                View
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Fitness Connection */}
      <div className="card mt-8">
        <h2 className="text-lg font-semibold mb-4">Fitness Connection</h2>
        <div className="flex gap-4">
          <button className="flex-1 p-4 rounded-lg border border-[var(--accent-green)] bg-green-900/20 text-center">
            <div className="font-semibold mb-1">Google Fit</div>
            <div className="text-xs text-green-400">Connected</div>
          </button>
          <button className="flex-1 p-4 rounded-lg border border-[var(--border)] hover:border-[var(--accent-green)]/50 transition text-center">
            <div className="font-semibold mb-1">Strava</div>
            <div className="text-xs text-[var(--text-secondary)]">
              Connect
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
