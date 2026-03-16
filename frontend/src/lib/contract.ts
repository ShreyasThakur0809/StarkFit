import { RpcProvider, Contract } from "starknet";
import { STARKFIT_ABI } from "./abi";
import { STARKFIT_CONTRACT_ADDRESS } from "./constants";

const RPC_URL =
  process.env.NEXT_PUBLIC_STARKNET_RPC ||
  "https://starknet-sepolia.public.blastapi.io";

let _provider: RpcProvider | null = null;
let _contract: Contract | null = null;

export function getProvider(): RpcProvider {
  if (!_provider) {
    _provider = new RpcProvider({ nodeUrl: RPC_URL });
  }
  return _provider;
}

export function getContract(): Contract {
  if (!_contract) {
    _contract = new Contract({
      abi: STARKFIT_ABI,
      address: STARKFIT_CONTRACT_ADDRESS,
      providerOrAccount: getProvider(),
    });
  }
  return _contract;
}

export interface ChallengeData {
  id: number;
  creator: string;
  token: string;
  stakeAmount: bigint;
  durationDays: number;
  stepGoal: number;
  startTime: number;
  activePlayers: number;
  totalPlayers: number;
  totalPool: bigint;
  isActive: boolean;
  isEnded: boolean;
}

export interface PlayerStatusData {
  isJoined: boolean;
  isActive: boolean;
  hasClaimed: boolean;
  lastVerifiedDay: number;
}

export interface MarketData {
  id: number;
  challengeId: number;
  player: string;
  token: string;
  yesPool: bigint;
  noPool: bigint;
  isResolved: boolean;
  outcome: boolean;
}

function parseBool(val: any): boolean {
  if (typeof val === "boolean") return val;
  if (typeof val === "bigint") return val !== 0n;
  if (typeof val === "number") return val !== 0;
  return !!val;
}

function parseU256(val: any): bigint {
  if (typeof val === "bigint") return val;
  if (val && typeof val === "object" && "low" in val) {
    return BigInt(val.low) + (BigInt(val.high) << 128n);
  }
  return BigInt(val || 0);
}

export function parseChallenge(raw: any): ChallengeData {
  return {
    id: Number(raw.id),
    creator: "0x" + BigInt(raw.creator).toString(16),
    token: "0x" + BigInt(raw.token).toString(16),
    stakeAmount: parseU256(raw.stake_amount),
    durationDays: Number(raw.duration_days),
    stepGoal: Number(raw.step_goal),
    startTime: Number(raw.start_time),
    activePlayers: Number(raw.active_players),
    totalPlayers: Number(raw.total_players),
    totalPool: parseU256(raw.total_pool),
    isActive: parseBool(raw.is_active),
    isEnded: parseBool(raw.is_ended),
  };
}

export function parsePlayerStatus(raw: any): PlayerStatusData {
  return {
    isJoined: parseBool(raw.is_joined),
    isActive: parseBool(raw.is_active),
    hasClaimed: parseBool(raw.has_claimed),
    lastVerifiedDay: Number(raw.last_verified_day),
  };
}

export function parseMarket(raw: any): MarketData {
  return {
    id: Number(raw.id),
    challengeId: Number(raw.challenge_id),
    player: "0x" + BigInt(raw.player).toString(16),
    token: "0x" + BigInt(raw.token).toString(16),
    yesPool: parseU256(raw.yes_pool),
    noPool: parseU256(raw.no_pool),
    isResolved: parseBool(raw.is_resolved),
    outcome: parseBool(raw.outcome),
  };
}

// Format wei to human-readable ETH/token amount
export function formatTokenAmount(wei: bigint, decimals: number = 18): string {
  const divisor = 10n ** BigInt(decimals);
  const whole = wei / divisor;
  const remainder = wei % divisor;
  const decimal = remainder.toString().padStart(decimals, "0").slice(0, 4);
  return `${whole}.${decimal}`.replace(/\.?0+$/, "") || "0";
}

// Get token symbol from address
export function getTokenSymbol(tokenAddress: string): string {
  const normalized = tokenAddress.toLowerCase();
  if (
    normalized.includes("049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7")
  ) {
    return "ETH";
  }
  if (
    normalized.includes("03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac")
  ) {
    return "WBTC";
  }
  return "TOKEN";
}

export function getTokenDecimals(tokenAddress: string): number {
  return getTokenSymbol(tokenAddress) === "WBTC" ? 8 : 18;
}

// Calculate days elapsed since start_time
export function getDaysElapsed(startTime: number): number {
  if (startTime === 0) return 0;
  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, Math.floor((now - startTime) / 86400));
}

export function getDaysLeft(startTime: number, durationDays: number): number {
  return Math.max(0, durationDays - getDaysElapsed(startTime));
}

// ===== Contract read functions =====

export async function fetchChallengeCount(): Promise<number> {
  const contract = getContract();
  const result = await contract.get_challenge_count();
  return Number(result);
}

export async function fetchChallenge(id: number): Promise<ChallengeData> {
  const contract = getContract();
  const result = await contract.get_challenge(id);
  return parseChallenge(result);
}

export async function fetchAllChallenges(): Promise<ChallengeData[]> {
  const count = await fetchChallengeCount();
  if (count === 0) return [];
  const promises = Array.from({ length: count }, (_, i) =>
    fetchChallenge(i + 1)
  );
  return Promise.all(promises);
}

export async function fetchPlayerStatus(
  challengeId: number,
  playerAddress: string
): Promise<PlayerStatusData> {
  const contract = getContract();
  const result = await contract.get_player_status(challengeId, playerAddress);
  return parsePlayerStatus(result);
}

export async function fetchMarketCount(): Promise<number> {
  const contract = getContract();
  const result = await contract.get_market_count();
  return Number(result);
}

export async function fetchMarket(id: number): Promise<MarketData> {
  const contract = getContract();
  const result = await contract.get_market(id);
  return parseMarket(result);
}

export async function fetchAllMarkets(): Promise<MarketData[]> {
  const count = await fetchMarketCount();
  if (count === 0) return [];
  const promises = Array.from({ length: count }, (_, i) =>
    fetchMarket(i + 1)
  );
  return Promise.all(promises);
}
