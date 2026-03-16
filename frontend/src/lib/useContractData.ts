"use client";

import { useState, useEffect, useCallback } from "react";
import {
  fetchAllChallenges,
  fetchChallenge,
  fetchPlayerStatus,
  fetchAllMarkets,
  fetchMarket,
  type ChallengeData,
  type PlayerStatusData,
  type MarketData,
} from "./contract";

interface UseDataResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// Fetch all challenges
export function useChallenges(): UseDataResult<ChallengeData[]> {
  const [data, setData] = useState<ChallengeData[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const challenges = await fetchAllChallenges();
      setData(challenges);
    } catch (err: any) {
      setError(err.message || "Failed to fetch challenges");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}

// Fetch a single challenge
export function useChallenge(id: number): UseDataResult<ChallengeData> {
  const [data, setData] = useState<ChallengeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const challenge = await fetchChallenge(id);
      setData(challenge);
    } catch (err: any) {
      setError(err.message || "Failed to fetch challenge");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}

// Fetch player status for a challenge
export function usePlayerStatus(
  challengeId: number,
  playerAddress: string | null
): UseDataResult<PlayerStatusData> {
  const [data, setData] = useState<PlayerStatusData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!playerAddress) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const status = await fetchPlayerStatus(challengeId, playerAddress);
      setData(status);
    } catch (err: any) {
      setError(err.message || "Failed to fetch player status");
    } finally {
      setLoading(false);
    }
  }, [challengeId, playerAddress]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}

// Fetch all markets
export function useMarkets(): UseDataResult<MarketData[]> {
  const [data, setData] = useState<MarketData[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const markets = await fetchAllMarkets();
      setData(markets);
    } catch (err: any) {
      setError(err.message || "Failed to fetch markets");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}
