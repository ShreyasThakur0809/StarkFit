"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { StarkZap, type WalletInterface } from "starkzap";

// Inline Call type — avoids importing the heavy starknet package
interface Call {
  contractAddress: string;
  entrypoint: string;
  calldata?: string[] | number[];
}

// Browser wallet types (injected by extensions like Ready, Argent X, Braavos)
interface StarknetWindowWallet {
  id: string;
  name: string;
  icon: string;
  version: string;
  isConnected: boolean;
  account?: any;
  provider?: any;
  request?: (call: any) => Promise<any>;
  enable?: (options?: any) => Promise<string[]>;
}

interface StarkZapContextType {
  sdk: StarkZap | null;
  wallet: WalletInterface | null;
  browserWallet: StarknetWindowWallet | null;
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  availableWallets: StarknetWindowWallet[];
  connectBrowserWallet: (wallet: StarknetWindowWallet) => Promise<void>;
  connectCartridge: () => Promise<void>;
  disconnect: () => void;
  execute: (calls: Call[], sponsored?: boolean) => Promise<string>;
}

const StarkZapContext = createContext<StarkZapContextType>({
  sdk: null,
  wallet: null,
  browserWallet: null,
  address: null,
  isConnected: false,
  isConnecting: false,
  availableWallets: [],
  connectBrowserWallet: async () => {},
  connectCartridge: async () => {},
  disconnect: () => {},
  execute: async () => "",
});

export function useStarkZap() {
  return useContext(StarkZapContext);
}

export function useAccount() {
  const { address, isConnected } = useStarkZap();
  return { address, isConnected };
}

function discoverWallets(): StarknetWindowWallet[] {
  if (typeof window === "undefined") return [];
  const wallets: StarknetWindowWallet[] = [];
  // Wallets inject at window.starknet_<id> (e.g. starknet_argentX, starknet_braavos, starknet_ready)
  for (const key of Object.keys(window)) {
    if (key.startsWith("starknet_")) {
      const w = (window as any)[key];
      if (w && typeof w === "object" && (w.id || w.name)) {
        wallets.push(w as StarknetWindowWallet);
      }
    }
  }
  // Also check legacy window.starknet
  const legacy = (window as any).starknet;
  if (legacy && typeof legacy === "object" && legacy.id) {
    if (!wallets.find((w) => w.id === legacy.id)) {
      wallets.push(legacy as StarknetWindowWallet);
    }
  }
  return wallets;
}

export function StarknetProvider({ children }: { children: ReactNode }) {
  const [sdk] = useState(
    () =>
      new StarkZap({
        network: "sepolia",
        paymaster: {
          nodeUrl: "https://starknet.paymaster.avnu.fi",
        },
      })
  );
  const [wallet, setWallet] = useState<WalletInterface | null>(null);
  const [browserWallet, setBrowserWallet] =
    useState<StarknetWindowWallet | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [availableWallets, setAvailableWallets] = useState<
    StarknetWindowWallet[]
  >([]);

  // Discover installed browser wallets
  useEffect(() => {
    // Wallets may take a moment to inject
    const detect = () => setAvailableWallets(discoverWallets());
    detect();
    const timer = setTimeout(detect, 500);
    return () => clearTimeout(timer);
  }, []);

  // Connect browser extension wallet (Ready, Argent X, Braavos, etc.)
  const connectBrowserWallet = useCallback(
    async (selectedWallet: StarknetWindowWallet) => {
      setIsConnecting(true);
      try {
        let accounts: string[] = [];
        if (selectedWallet.request) {
          // SNIP-compliant wallet
          const result = await selectedWallet.request({
            type: "wallet_requestAccounts",
          });
          accounts = Array.isArray(result) ? result : [result];
        } else if (selectedWallet.enable) {
          // Legacy wallet
          accounts = await selectedWallet.enable();
        }

        const addr = accounts[0];
        if (!addr) throw new Error("No account returned from wallet");

        setBrowserWallet(selectedWallet);
        setAddress(addr);
        setWallet(null); // not a StarkZap wallet
      } finally {
        setIsConnecting(false);
      }
    },
    []
  );

  // Connect with Cartridge Controller via StarkZap (social login)
  const connectCartridge = useCallback(async () => {
    setIsConnecting(true);
    try {
      const contractAddr =
        process.env.NEXT_PUBLIC_STARKFIT_CONTRACT_ADDRESS || "0x0";
      const w = await sdk.connectCartridge({
        policies: [
          { target: contractAddr, method: "join_challenge" },
          { target: contractAddr, method: "claim_reward" },
          { target: contractAddr, method: "create_market" },
          { target: contractAddr, method: "bet_yes" },
          { target: contractAddr, method: "bet_no" },
          { target: contractAddr, method: "claim_winnings" },
        ],
      });
      setWallet(w);
      setBrowserWallet(null);
      setAddress(w.address.toString());
    } finally {
      setIsConnecting(false);
    }
  }, [sdk]);

  const disconnect = useCallback(() => {
    setWallet(null);
    setBrowserWallet(null);
    setAddress(null);
  }, []);

  // Execute contract calls — routes to StarkZap wallet or browser wallet
  const execute = useCallback(
    async (calls: Call[], sponsored = true): Promise<string> => {
      // StarkZap wallet (Cartridge)
      if (wallet) {
        const tx = await wallet.execute(calls, {
          ...(sponsored && { feeMode: "sponsored" }),
        });
        await tx.wait();
        return tx.hash;
      }

      // Browser extension wallet (Ready, Argent X, Braavos)
      if (browserWallet) {
        // Try account.execute first (most wallets set this after enable)
        if (browserWallet.account?.execute) {
          const result = await browserWallet.account.execute(calls);
          return result.transaction_hash || result;
        }

        // SNIP standard: wallet_addInvokeTransaction
        if (browserWallet.request) {
          // Convert calls to SNIP format (snake_case fields)
          const snipCalls = calls.map((c: any) => ({
            contract_address: c.contractAddress || c.contract_address,
            entry_point: c.entrypoint || c.entry_point,
            calldata: c.calldata || [],
          }));
          const result = await browserWallet.request({
            type: "wallet_addInvokeTransaction",
            params: { calls: snipCalls },
          });
          return typeof result === "object"
            ? result.transaction_hash
            : result;
        }

        throw new Error("Wallet does not support transaction execution");
      }

      throw new Error("No wallet connected");
    },
    [wallet, browserWallet]
  );

  return (
    <StarkZapContext.Provider
      value={{
        sdk,
        wallet,
        browserWallet,
        address,
        isConnected: !!wallet || !!browserWallet,
        isConnecting,
        availableWallets,
        connectBrowserWallet,
        connectCartridge,
        disconnect,
        execute,
      }}
    >
      {children}
    </StarkZapContext.Provider>
  );
}
