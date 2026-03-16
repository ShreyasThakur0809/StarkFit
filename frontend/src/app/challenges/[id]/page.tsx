"use client";

import { useParams } from "next/navigation";
import { useAccount } from "@/providers/starknet";
import { useStarkFitContract } from "@/lib/hooks";
import { useChallenge, usePlayerStatus } from "@/lib/useContractData";
import {
  formatTokenAmount,
  getTokenSymbol,
  getTokenDecimals,
  getDaysElapsed,
} from "@/lib/contract";
import { useState } from "react";
import Link from "next/link";

export default function ChallengeDetailPage() {
  const params = useParams();
  const challengeId = Number(params.id);
  const { address, isConnected } = useAccount();
  const { joinChallenge } = useStarkFitContract();
  const {
    data: challenge,
    loading,
    error,
    refetch: refetchChallenge,
  } = useChallenge(challengeId);
  const { data: myStatus, refetch: refetchStatus } = usePlayerStatus(
    challengeId,
    address
  );

  const [fitnessProvider, setFitnessProvider] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [txStatus, setTxStatus] = useState<string | null>(null);

  const handleJoinChallenge = async () => {
    if (!fitnessProvider || !challenge) return;
    setIsJoining(true);
    setTxStatus(null);
    try {
      const txHash = await joinChallenge(
        challengeId,
        challenge.token,
        formatTokenAmount(challenge.stakeAmount, getTokenDecimals(challenge.token))
      );
      setTxStatus(`Joined! Tx: ${txHash.slice(0, 10)}...`);
      refetchChallenge();
      refetchStatus();
    } catch (err: any) {
      setTxStatus(`Error: ${err.message || "Transaction failed"}`);
    } finally {
      setIsJoining(false);
    }
  };

  const handleConnectGoogleFit = () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setFitnessProvider("google_fit");
      return;
    }
    const redirectUri = `${window.location.origin}/api/auth/google-fit/callback`;
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent("https://www.googleapis.com/auth/fitness.activity.read")}&access_type=offline`;
  };

  const handleConnectStrava = () => {
    const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
    if (!clientId) {
      setFitnessProvider("strava");
      return;
    }
    const redirectUri = `${window.location.origin}/api/auth/strava/callback`;
    window.location.href = `https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=activity:read_all`;
  };

  if (loading) {
    return (
      <div className="pt-24 px-6 max-w-4xl mx-auto text-center text-[var(--text-secondary)]">
        Loading challenge from Starknet...
      </div>
    );
  }

  if (error || !challenge) {
    return (
      <div className="pt-24 px-6 max-w-4xl mx-auto text-center">
        <p className="text-[var(--accent-red)] mb-4">
          {error || "Challenge not found"}
        </p>
        <Link href="/challenges" className="btn-secondary text-sm">
          Back to Challenges
        </Link>
      </div>
    );
  }

  const symbol = getTokenSymbol(challenge.token);
  const decimals = getTokenDecimals(challenge.token);
  const stakeFormatted = formatTokenAmount(challenge.stakeAmount, decimals);
  const poolFormatted = formatTokenAmount(challenge.totalPool, decimals);
  const currentDay = getDaysElapsed(challenge.startTime);
  const potentialReward =
    challenge.activePlayers > 0
      ? formatTokenAmount(
          challenge.totalPool / BigInt(challenge.activePlayers),
          decimals
        )
      : "0";
  const alreadyJoined = myStatus?.isJoined ?? false;

  return (
    <div className="pt-24 px-6 max-w-4xl mx-auto pb-20">
      <Link
        href="/challenges"
        className="text-[var(--text-secondary)] hover:text-white transition text-sm mb-6 inline-block"
      >
        &larr; Back to Challenges
      </Link>

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

      {/* Header */}
      <div className="card glow mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Challenge #{challenge.id}</h1>
          <span
            className={`px-3 py-1 rounded-full text-sm border ${
              challenge.isEnded
                ? "bg-gray-900/30 text-gray-400 border-gray-500/30"
                : "bg-green-900/30 text-green-400 border-green-500/30"
            }`}
          >
            {challenge.isEnded
              ? "Ended"
              : `Day ${currentDay} / ${challenge.durationDays}`}
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
              {poolFormatted} {symbol}
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
              {potentialReward} {symbol}
            </div>
          </div>
        </div>

        {/* Day progress bar */}
        <div className="mt-6">
          <div className="flex justify-between text-xs text-[var(--text-secondary)] mb-1">
            <span>Progress</span>
            <span>
              {Math.min(
                100,
                Math.round((currentDay / challenge.durationDays) * 100)
              )}
              %
            </span>
          </div>
          <div className="w-full h-3 bg-[var(--bg-secondary)] rounded-full">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-[var(--accent-green)] to-[var(--accent-blue)]"
              style={{
                width: `${Math.min(100, (currentDay / challenge.durationDays) * 100)}%`,
              }}
            />
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Join / Status */}
        <div className="card">
          {alreadyJoined ? (
            <>
              <h2 className="text-lg font-semibold mb-4">Your Status</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-secondary)]">Status</span>
                  {myStatus?.isActive ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-green-900/30 text-green-400">
                      Active
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-1 rounded-full bg-red-900/30 text-red-400">
                      Eliminated
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-secondary)]">
                    Last Verified Day
                  </span>
                  <span className="font-semibold">
                    {myStatus?.lastVerifiedDay || "—"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-secondary)]">Claimed</span>
                  <span className="font-semibold">
                    {myStatus?.hasClaimed ? "Yes" : "No"}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold mb-4">
                Join This Challenge
              </h2>
              {!isConnected ? (
                <p className="text-[var(--text-secondary)]">
                  Connect your wallet to join.
                </p>
              ) : challenge.isEnded ? (
                <p className="text-[var(--text-secondary)]">
                  This challenge has ended.
                </p>
              ) : (
                <>
                  <div className="mb-4 p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)]">
                    <div className="text-sm text-[var(--text-secondary)]">
                      Required Stake
                    </div>
                    <div className="font-bold text-lg">
                      {stakeFormatted} {symbol}
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="text-sm text-[var(--text-secondary)] mb-2">
                      Connect Fitness Tracker
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={handleConnectGoogleFit}
                        className={`flex-1 p-3 rounded-lg border transition ${
                          fitnessProvider === "google_fit"
                            ? "border-[var(--accent-green)] bg-green-900/20"
                            : "border-[var(--border)] hover:border-[var(--accent-green)]/50"
                        }`}
                      >
                        <div className="font-semibold text-sm">Google Fit</div>
                        {fitnessProvider === "google_fit" && (
                          <div className="text-xs text-green-400 mt-1">
                            Connected
                          </div>
                        )}
                      </button>
                      <button
                        onClick={handleConnectStrava}
                        className={`flex-1 p-3 rounded-lg border transition ${
                          fitnessProvider === "strava"
                            ? "border-[var(--accent-green)] bg-green-900/20"
                            : "border-[var(--border)] hover:border-[var(--accent-green)]/50"
                        }`}
                      >
                        <div className="font-semibold text-sm">Strava</div>
                        {fitnessProvider === "strava" && (
                          <div className="text-xs text-green-400 mt-1">
                            Connected
                          </div>
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleJoinChallenge}
                    disabled={!fitnessProvider || isJoining}
                    className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isJoining
                      ? "Staking..."
                      : `Stake ${stakeFormatted} ${symbol} & Join`}
                  </button>
                  <p className="text-xs text-[var(--text-secondary)] mt-2 text-center">
                    Gasless — powered by AVNU Paymaster
                  </p>
                </>
              )}
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

      {/* Challenge Info */}
      <div className="card mt-6">
        <h2 className="text-lg font-semibold mb-4">Challenge Details</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-[var(--text-secondary)]">Creator</span>
            <p className="font-mono mt-1">
              {challenge.creator.slice(0, 10)}...{challenge.creator.slice(-6)}
            </p>
          </div>
          <div>
            <span className="text-[var(--text-secondary)]">Token</span>
            <p className="font-semibold mt-1">{symbol}</p>
          </div>
          <div>
            <span className="text-[var(--text-secondary)]">
              Started
            </span>
            <p className="mt-1">
              {challenge.startTime > 0
                ? new Date(challenge.startTime * 1000).toLocaleDateString()
                : "—"}
            </p>
          </div>
          <div>
            <span className="text-[var(--text-secondary)]">Status</span>
            <p className="mt-1">
              {challenge.isEnded
                ? "Ended"
                : challenge.isActive
                  ? "Active"
                  : "Inactive"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
