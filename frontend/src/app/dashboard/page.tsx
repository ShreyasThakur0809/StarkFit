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

interface FitnessStatus {
  google_fit: boolean;
  strava: boolean;
  connected: boolean;
  source: string | null;
}

interface VerifyResult {
  steps: number;
  source: string;
  submitted: boolean;
  txHash?: string;
  error?: string;
  message?: string;
}

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const { claimReward } = useStarkFitContract();
  const { data: allChallenges, loading: loadingChallenges, refetch: refetchChallenges } = useChallenges();
  const [myChallenges, setMyChallenges] = useState<MyChallengeInfo[]>([]);
  const [loadingMy, setLoadingMy] = useState(false);
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [fitness, setFitness] = useState<FitnessStatus | null>(null);
  const [verifyingId, setVerifyingId] = useState<number | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);

  // Check fitness connection status
  useEffect(() => {
    fetch("/api/fitness/status")
      .then((r) => r.json())
      .then(setFitness)
      .catch(() => {});
  }, []);

  // Handle redirect from OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "true") {
      // Re-check fitness status after OAuth redirect
      fetch("/api/fitness/status")
        .then((r) => r.json())
        .then(setFitness)
        .catch(() => {});
      // Clean URL
      window.history.replaceState({}, "", "/dashboard");
    }
  }, []);

  // Fetch player status for each challenge
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

  const handleVerifySteps = async (challengeId: number) => {
    setVerifyingId(challengeId);
    setVerifyResult(null);
    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await fetch("/api/fitness/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId,
          playerAddress: address,
          date: today,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setVerifyResult({ steps: 0, source: "none", submitted: false, error: data.error });
      } else {
        setVerifyResult(data);
        if (data.submitted) {
          // Refresh challenge data after on-chain submission
          setTimeout(() => refetchChallenges(), 3000);
        }
      }
    } catch (err: any) {
      setVerifyResult({ steps: 0, source: "none", submitted: false, error: err.message });
    } finally {
      setVerifyingId(null);
    }
  };

  const handleConnectFitness = (provider: string) => {
    const isGoogle = provider === "google_fit";
    const clientId = isGoogle
      ? process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
      : process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;

    if (!clientId) {
      // Demo mode — no API keys configured
      setTxStatus(
        `${isGoogle ? "Google Fit" : "Strava"} API keys not configured. Add ${isGoogle ? "NEXT_PUBLIC_GOOGLE_CLIENT_ID" : "NEXT_PUBLIC_STRAVA_CLIENT_ID"} to .env.local.`
      );
      return;
    }

    if (isGoogle) {
      const redirectUri = `${window.location.origin}/api/auth/google-fit/callback`;
      const scope = "https://www.googleapis.com/auth/fitness.activity.read";
      window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;
    } else {
      const redirectUri = `${window.location.origin}/api/auth/strava/callback`;
      window.location.href = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=activity:read_all`;
    }
  };

  const handleDisconnectFitness = async () => {
    // Clear fitness cookies by calling a simple endpoint
    document.cookie = "google_fit_token=; path=/; max-age=0";
    document.cookie = "google_fit_refresh=; path=/; max-age=0";
    document.cookie = "strava_token=; path=/; max-age=0";
    document.cookie = "strava_refresh=; path=/; max-age=0";
    setFitness({ google_fit: false, strava: false, connected: false, source: null });
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

  const activeChallenges = myChallenges.filter((m) => m.status.isActive && !m.challenge.isEnded);
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

      {/* Status messages */}
      {txStatus && (
        <div
          className={`mb-4 p-3 rounded-lg text-sm ${
            txStatus.startsWith("Error")
              ? "bg-red-900/30 border border-red-500/30 text-red-400"
              : "bg-green-900/30 border border-green-500/30 text-green-400"
          }`}
        >
          {txStatus}
        </div>
      )}

      {verifyResult && (
        <div
          className={`mb-4 p-4 rounded-lg text-sm ${
            verifyResult.error
              ? "bg-red-900/30 border border-red-500/30 text-red-400"
              : "bg-blue-900/30 border border-blue-500/30 text-blue-300"
          }`}
        >
          {verifyResult.error ? (
            <p>{verifyResult.error}</p>
          ) : (
            <div>
              <p className="font-semibold mb-1">
                Steps today: {verifyResult.steps.toLocaleString()} (via{" "}
                {verifyResult.source === "google_fit" ? "Google Fit" : "Strava"})
              </p>
              {verifyResult.submitted ? (
                <p className="text-green-400">
                  Submitted on-chain! Tx: {verifyResult.txHash?.slice(0, 14)}...
                </p>
              ) : (
                <p className="text-yellow-400">
                  {verifyResult.message || "Not submitted on-chain"}
                </p>
              )}
            </div>
          )}
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
          <div className="text-sm text-[var(--text-secondary)]">Completed</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-[var(--accent-red)]">
            {isLoading ? "..." : eliminatedChallenges.length}
          </div>
          <div className="text-sm text-[var(--text-secondary)]">Eliminated</div>
        </div>
      </div>

      {/* Fitness Connection */}
      <div className="card mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Fitness Tracker</h2>
          {fitness?.connected && (
            <button
              onClick={handleDisconnectFitness}
              className="text-xs text-[var(--text-secondary)] hover:text-[var(--accent-red)] transition"
            >
              Disconnect
            </button>
          )}
        </div>

        {fitness?.connected ? (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-green-900/20 border border-green-500/20">
            <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
            <div>
              <span className="font-medium text-green-400">
                {fitness.source === "google_fit" ? "Google Fit" : "Strava"}
              </span>
              <span className="text-sm text-[var(--text-secondary)]">
                {" "}connected — your steps are being tracked
              </span>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            <button
              onClick={() => handleConnectFitness("google_fit")}
              className="flex items-center gap-3 p-4 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-blue-500/40 transition text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                G
              </div>
              <div>
                <div className="font-medium text-sm">Google Fit</div>
                <div className="text-xs text-[var(--text-secondary)]">
                  Connect to sync step data
                </div>
              </div>
            </button>
            <button
              onClick={() => handleConnectFitness("strava")}
              className="flex items-center gap-3 p-4 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-orange-500/40 transition text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                S
              </div>
              <div>
                <div className="font-medium text-sm">Strava</div>
                <div className="text-xs text-[var(--text-secondary)]">
                  Estimate steps from activities
                </div>
              </div>
            </button>
          </div>
        )}
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
              <div className="flex gap-3 items-center">
                {/* Verify Steps button — only for active challenges with fitness connected */}
                {status.isActive && !ch.isEnded && fitness?.connected && (
                  <button
                    onClick={() => handleVerifySteps(ch.id)}
                    disabled={verifyingId === ch.id}
                    className="btn-secondary text-sm disabled:opacity-50"
                  >
                    {verifyingId === ch.id
                      ? "Verifying..."
                      : "Verify Steps"}
                  </button>
                )}
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
    </div>
  );
}
