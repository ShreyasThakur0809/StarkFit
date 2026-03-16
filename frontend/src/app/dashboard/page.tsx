"use client";

import { useState, useEffect } from "react";
import { useAccount } from "@/providers/starknet";
import { useStarkFitContract } from "@/lib/hooks";
import { useChallenges } from "@/lib/useContractData";
import {
  fetchPlayerStatus,
  formatTokenAmount,
  getTokenSymbol,
  getTokenDecimals,
  getDaysElapsed,
  type ChallengeData,
  type PlayerStatusData,
} from "@/lib/contract";
import Link from "next/link";

interface MyChallengeInfo {
  challenge: ChallengeData;
  status: PlayerStatusData;
}

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const { claimReward } = useStarkFitContract();
  const { data: allChallenges, loading: loadingChallenges } = useChallenges();
  const [myChallenges, setMyChallenges] = useState<MyChallengeInfo[]>([]);
  const [loadingMy, setLoadingMy] = useState(false);
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [fitnessConnected, setFitnessConnected] = useState<string | null>(null);

  // Fetch player status for each challenge to find the ones user joined
  useEffect(() => {
    if (!allChallenges || !address) {
      setMyChallenges([]);
      return;
    }

    const fetchMyStatuses = async () => {
      setLoadingMy(true);
      const results: MyChallengeInfo[] = [];
      for (const ch of allChallenges) {
        try {
          const status = await fetchPlayerStatus(ch.id, address);
          if (status.isJoined) {
            results.push({ challenge: ch, status });
          }
        } catch {
          // Player not in this challenge
        }
      }
      setMyChallenges(results);
      setLoadingMy(false);
    };

    fetchMyStatuses();
  }, [allChallenges, address]);

  const handleClaimReward = async (challengeId: number) => {
    setClaimingId(challengeId);
    setTxStatus(null);
    try {
      const txHash = await claimReward(challengeId);
      setTxStatus(`Reward claimed! Tx: ${txHash.slice(0, 10)}...`);
    } catch (err: any) {
      setTxStatus(`Error: ${err.message || "Transaction failed"}`);
    } finally {
      setClaimingId(null);
    }
  };

  const handleConnectFitness = (provider: string) => {
    const isGoogle = provider === "google_fit";
    const clientId = isGoogle
      ? process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
      : process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;

    if (!clientId) {
      setFitnessConnected(provider);
      return;
    }

    if (isGoogle) {
      const redirectUri = `${window.location.origin}/api/auth/google-fit/callback`;
      window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent("https://www.googleapis.com/auth/fitness.activity.read")}&access_type=offline`;
    } else {
      const redirectUri = `${window.location.origin}/api/auth/strava/callback`;
      window.location.href = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=activity:read_all`;
    }
  };

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

  const activeChallenges = myChallenges.filter((m) => m.status.isActive);
  const completedChallenges = myChallenges.filter(
    (m) => m.challenge.isEnded && m.status.isActive
  );
  const eliminatedChallenges = myChallenges.filter(
    (m) => !m.status.isActive
  );

  const isLoading = loadingChallenges || loadingMy;

  return (
    <div className="pt-24 px-6 max-w-6xl mx-auto pb-20">
      <h1 className="text-3xl font-bold mb-2">Your Dashboard</h1>
      <p className="text-[var(--text-secondary)] mb-8 font-mono text-sm">
        {address?.slice(0, 10)}...{address?.slice(-8)}
      </p>

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

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="card text-center">
          <div className="text-2xl font-bold gradient-text">
            {isLoading ? "..." : myChallenges.length}
          </div>
          <div className="text-sm text-[var(--text-secondary)]">
            Challenges Joined
          </div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-[var(--accent-green)]">
            {isLoading ? "..." : activeChallenges.length}
          </div>
          <div className="text-sm text-[var(--text-secondary)]">Active</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-blue-400">
            {isLoading ? "..." : completedChallenges.length}
          </div>
          <div className="text-sm text-[var(--text-secondary)]">
            Completed
          </div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-[var(--accent-red)]">
            {isLoading ? "..." : eliminatedChallenges.length}
          </div>
          <div className="text-sm text-[var(--text-secondary)]">
            Eliminated
          </div>
        </div>
      </div>

      {/* My Challenges */}
      <h2 className="text-lg font-semibold mb-4">My Challenges</h2>

      {isLoading && (
        <div className="text-center py-10 text-[var(--text-secondary)]">
          Loading your challenges...
        </div>
      )}

      {!isLoading && myChallenges.length === 0 && (
        <div className="card text-center py-10 mb-8">
          <p className="text-[var(--text-secondary)] mb-4">
            You haven&apos;t joined any challenges yet.
          </p>
          <Link href="/challenges" className="btn-primary text-sm">
            Browse Challenges
          </Link>
        </div>
      )}

      <div className="space-y-4 mb-8">
        {myChallenges.map(({ challenge: ch, status }) => {
          const symbol = getTokenSymbol(ch.token);
          const decimals = getTokenDecimals(ch.token);
          const poolFormatted = formatTokenAmount(ch.totalPool, decimals);
          const currentDay = getDaysElapsed(ch.startTime);
          const canClaim =
            ch.isEnded && status.isActive && !status.hasClaimed;
          const rewardEst =
            ch.activePlayers > 0
              ? formatTokenAmount(
                  ch.totalPool / BigInt(ch.activePlayers),
                  decimals
                )
              : "0";

          return (
            <div
              key={ch.id}
              className="card flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-semibold">
                    Challenge #{ch.id} &mdash;{" "}
                    {ch.stepGoal.toLocaleString()} steps/day
                  </h3>
                  {!status.isActive ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/30 text-red-400">
                      Eliminated
                    </span>
                  ) : ch.isEnded ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/30 text-blue-400">
                      Completed
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/30 text-green-400">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-sm text-[var(--text-secondary)]">
                  Day {currentDay}/{ch.durationDays} &bull; Pool:{" "}
                  {poolFormatted} {symbol} &bull; {ch.activePlayers} survivors
                </p>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  Last verified: Day {status.lastVerifiedDay || "—"}
                </p>
              </div>
              <div className="flex gap-3">
                {canClaim && (
                  <button
                    onClick={() => handleClaimReward(ch.id)}
                    disabled={claimingId === ch.id}
                    className="btn-primary text-sm disabled:opacity-50"
                  >
                    {claimingId === ch.id
                      ? "Claiming..."
                      : `Claim ~${rewardEst} ${symbol}`}
                  </button>
                )}
                {status.hasClaimed && (
                  <span className="text-xs text-green-400 self-center">
                    Claimed
                  </span>
                )}
                <Link
                  href={`/challenges/${ch.id}`}
                  className="btn-secondary text-sm"
                >
                  View
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Fitness Connection */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Fitness Connection</h2>
        <div className="flex gap-4">
          <button
            onClick={() => handleConnectFitness("google_fit")}
            className={`flex-1 p-4 rounded-lg border text-center transition ${
              fitnessConnected === "google_fit"
                ? "border-[var(--accent-green)] bg-green-900/20"
                : "border-[var(--border)] hover:border-[var(--accent-green)]/50"
            }`}
          >
            <div className="font-semibold mb-1">Google Fit</div>
            <div
              className={`text-xs ${
                fitnessConnected === "google_fit"
                  ? "text-green-400"
                  : "text-[var(--text-secondary)]"
              }`}
            >
              {fitnessConnected === "google_fit" ? "Connected" : "Connect"}
            </div>
          </button>
          <button
            onClick={() => handleConnectFitness("strava")}
            className={`flex-1 p-4 rounded-lg border text-center transition ${
              fitnessConnected === "strava"
                ? "border-[var(--accent-green)] bg-green-900/20"
                : "border-[var(--border)] hover:border-[var(--accent-green)]/50"
            }`}
          >
            <div className="font-semibold mb-1">Strava</div>
            <div
              className={`text-xs ${
                fitnessConnected === "strava"
                  ? "text-green-400"
                  : "text-[var(--text-secondary)]"
              }`}
            >
              {fitnessConnected === "strava" ? "Connected" : "Connect"}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
