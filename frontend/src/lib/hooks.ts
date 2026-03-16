"use client";

import { useCallback } from "react";
import { useStarkZap } from "@/providers/starknet";
import { STARKFIT_CONTRACT_ADDRESS, ETH_ADDRESS } from "./constants";
import type { Call } from "starknet";

// Helper to convert ETH amount to wei (u256)
function ethToWei(amount: string): { low: string; high: string } {
  const wei = BigInt(Math.floor(parseFloat(amount) * 1e18));
  return {
    low: (wei & BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF")).toString(),
    high: (wei >> BigInt(128)).toString(),
  };
}

export function useStarkFitContract() {
  const { execute, address } = useStarkZap();

  const createChallenge = useCallback(
    async (
      token: string,
      stakeAmount: string,
      durationDays: number,
      stepGoal: number
    ) => {
      const amount = ethToWei(stakeAmount);
      const calls: Call[] = [
        {
          contractAddress: STARKFIT_CONTRACT_ADDRESS,
          entrypoint: "create_challenge",
          calldata: [
            token,
            amount.low,
            amount.high,
            durationDays.toString(),
            stepGoal.toString(),
          ],
        },
      ];
      return execute(calls);
    },
    [execute]
  );

  const joinChallenge = useCallback(
    async (challengeId: number, token: string, stakeAmount: string) => {
      const amount = ethToWei(stakeAmount);
      // First approve the contract to spend tokens, then join
      const calls: Call[] = [
        {
          contractAddress: token,
          entrypoint: "approve",
          calldata: [STARKFIT_CONTRACT_ADDRESS, amount.low, amount.high],
        },
        {
          contractAddress: STARKFIT_CONTRACT_ADDRESS,
          entrypoint: "join_challenge",
          calldata: [challengeId.toString()],
        },
      ];
      return execute(calls);
    },
    [execute]
  );

  const claimReward = useCallback(
    async (challengeId: number) => {
      const calls: Call[] = [
        {
          contractAddress: STARKFIT_CONTRACT_ADDRESS,
          entrypoint: "claim_reward",
          calldata: [challengeId.toString()],
        },
      ];
      return execute(calls);
    },
    [execute]
  );

  const betYes = useCallback(
    async (marketId: number, token: string, amount: string) => {
      const amountWei = ethToWei(amount);
      const calls: Call[] = [
        {
          contractAddress: token,
          entrypoint: "approve",
          calldata: [STARKFIT_CONTRACT_ADDRESS, amountWei.low, amountWei.high],
        },
        {
          contractAddress: STARKFIT_CONTRACT_ADDRESS,
          entrypoint: "bet_yes",
          calldata: [marketId.toString(), amountWei.low, amountWei.high],
        },
      ];
      return execute(calls);
    },
    [execute]
  );

  const betNo = useCallback(
    async (marketId: number, token: string, amount: string) => {
      const amountWei = ethToWei(amount);
      const calls: Call[] = [
        {
          contractAddress: token,
          entrypoint: "approve",
          calldata: [STARKFIT_CONTRACT_ADDRESS, amountWei.low, amountWei.high],
        },
        {
          contractAddress: STARKFIT_CONTRACT_ADDRESS,
          entrypoint: "bet_no",
          calldata: [marketId.toString(), amountWei.low, amountWei.high],
        },
      ];
      return execute(calls);
    },
    [execute]
  );

  const claimWinnings = useCallback(
    async (marketId: number) => {
      const calls: Call[] = [
        {
          contractAddress: STARKFIT_CONTRACT_ADDRESS,
          entrypoint: "claim_winnings",
          calldata: [marketId.toString()],
        },
      ];
      return execute(calls);
    },
    [execute]
  );

  return {
    createChallenge,
    joinChallenge,
    claimReward,
    betYes,
    betNo,
    claimWinnings,
  };
}
