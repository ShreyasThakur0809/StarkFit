// Contract addresses - set via env or update after deployment
export const STARKFIT_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_STARKFIT_CONTRACT_ADDRESS ||
  "0x0000000000000000000000000000000000000000000000000000000000000000";

// Starknet Sepolia token addresses
export const ETH_ADDRESS =
  "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";
export const WBTC_ADDRESS =
  "0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac";

export const STEP_GOAL = 7000;
export const DEFAULT_DURATION_DAYS = 30;

export const SUPPORTED_TOKENS = [
  { symbol: "ETH", address: ETH_ADDRESS, decimals: 18 },
  { symbol: "WBTC", address: WBTC_ADDRESS, decimals: 8 },
];
