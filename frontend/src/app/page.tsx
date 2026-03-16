"use client";

import Link from "next/link";
import { useAccount } from "@/providers/starknet";

export default function Home() {
  const { isConnected } = useAccount();

  return (
    <div className="pt-16">
      {/* Hero */}
      <section className="min-h-[90vh] flex flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--bg-card)] border border-[var(--border)] text-sm text-[var(--text-secondary)]">
          <div className="pulse-dot" />
          Built on Starknet
        </div>

        <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
          Stake. Walk.{" "}
          <span className="gradient-text">Earn.</span>
        </h1>

        <p className="text-xl text-[var(--text-secondary)] max-w-2xl mb-10">
          Join crypto fitness challenges where you stake ETH to commit to daily
          steps. Hit your goals or lose your stake. Survivors split the prize
          pool.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/challenges" className="btn-primary text-lg">
            Explore Challenges
          </Link>
          <Link href="/markets" className="btn-secondary text-lg">
            Prediction Markets
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-8 mt-20 max-w-2xl w-full">
          <div className="text-center">
            <div className="text-3xl font-bold gradient-text">7,000</div>
            <div className="text-sm text-[var(--text-secondary)] mt-1">
              Daily Step Goal
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold gradient-text">30</div>
            <div className="text-sm text-[var(--text-secondary)] mt-1">
              Day Challenges
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold gradient-text">0</div>
            <div className="text-sm text-[var(--text-secondary)] mt-1">
              Gas Fees
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-16">
            How It Works
          </h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              {
                step: "01",
                title: "Stake",
                desc: "Join a challenge by staking ETH or WBTC",
              },
              {
                step: "02",
                title: "Connect",
                desc: "Link Google Fit or Strava for step tracking",
              },
              {
                step: "03",
                title: "Walk",
                desc: "Hit 7,000 steps daily to stay in the game",
              },
              {
                step: "04",
                title: "Earn",
                desc: "Survivors split the entire prize pool",
              },
            ].map((item) => (
              <div key={item.step} className="card text-center glow">
                <div className="text-4xl font-bold text-[var(--accent-green)] mb-3">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-[var(--text-secondary)] text-sm">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Prediction Markets Section */}
      <section className="py-20 px-6 bg-[var(--bg-secondary)]">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">Prediction Markets</h2>
          <p className="text-[var(--text-secondary)] text-lg max-w-2xl mx-auto mb-10">
            Think a player will fail? Bet on it. Spectators can place YES/NO
            bets on whether any participant will complete their challenge.
          </p>
          <div className="card max-w-md mx-auto text-left">
            <div className="text-sm text-[var(--text-secondary)] mb-2">
              Example Market
            </div>
            <div className="font-semibold mb-4">
              Will Alice complete the 30-day challenge?
            </div>
            <div className="flex gap-4">
              <div className="flex-1 rounded-lg bg-green-900/30 border border-green-500/30 p-3 text-center">
                <div className="text-green-400 font-bold">YES</div>
                <div className="text-sm text-[var(--text-secondary)]">
                  2.0 ETH
                </div>
              </div>
              <div className="flex-1 rounded-lg bg-red-900/30 border border-red-500/30 p-3 text-center">
                <div className="text-red-400 font-bold">NO</div>
                <div className="text-sm text-[var(--text-secondary)]">
                  1.0 ETH
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to Put Your Steps Where Your Stake Is?</h2>
        <p className="text-[var(--text-secondary)] mb-8">
          Gasless transactions. No ETH needed for gas. Powered by AVNU Paymaster.
        </p>
        <Link
          href={isConnected ? "/challenges" : "#"}
          className="btn-primary text-lg"
        >
          {isConnected ? "Browse Challenges" : "Connect Wallet to Start"}
        </Link>
      </section>
    </div>
  );
}
