"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { StarkZap, StarkSigner, type WalletInterface } from "starkzap";
import type { Call } from "starknet";

interface StarkZapContextType {
  sdk: StarkZap | null;
  wallet: WalletInterface | null;
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  connect: (privateKey: string) => Promise<void>;
  connectCartridge: () => Promise<void>;
  disconnect: () => void;
  execute: (calls: Call[], sponsored?: boolean) => Promise<string>;
}

const StarkZapContext = createContext<StarkZapContextType>({
  sdk: null,
  wallet: null,
  address: null,
  isConnected: false,
  isConnecting: false,
  connect: async () => {},
  connectCartridge: async () => {},
  disconnect: () => {},
  execute: async () => "",
});

export function useStarkZap() {
  return useContext(StarkZapContext);
}

// Re-export for backward compatibility in components
export function useAccount() {
  const { address, isConnected } = useStarkZap();
  return { address, isConnected };
}

export function StarknetProvider({ children }: { children: ReactNode }) {
  const [sdk] = useState(
    () =>
      new StarkZap({
        network: "sepolia",
        paymaster: {
          nodeUrl: "https://starknet.paymaster.avnu.fi",
          // In production, use a backend proxy to hide the API key
          // apiKey: process.env.NEXT_PUBLIC_AVNU_API_KEY,
        },
      })
  );
  const [wallet, setWallet] = useState<WalletInterface | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Connect with private key (dev/testing)
  const connect = useCallback(
    async (privateKey: string) => {
      setIsConnecting(true);
      try {
        const signer = new StarkSigner(privateKey);
        const w = await sdk.connectWallet({
          account: { signer },
          feeMode: "sponsored",
        });
        await w.ensureReady({ deploy: "if_needed" });
        setWallet(w);
        setAddress(w.address.toString());
      } finally {
        setIsConnecting(false);
      }
    },
    [sdk]
  );

  // Connect with Cartridge Controller (social login - best UX)
  const connectCartridge = useCallback(async () => {
    setIsConnecting(true);
    try {
      const w = await sdk.connectCartridge({
        policies: [
          {
            target: process.env.NEXT_PUBLIC_STARKFIT_CONTRACT_ADDRESS || "0x0",
            method: "join_challenge",
          },
          {
            target: process.env.NEXT_PUBLIC_STARKFIT_CONTRACT_ADDRESS || "0x0",
            method: "claim_reward",
          },
          {
            target: process.env.NEXT_PUBLIC_STARKFIT_CONTRACT_ADDRESS || "0x0",
            method: "create_market",
          },
          {
            target: process.env.NEXT_PUBLIC_STARKFIT_CONTRACT_ADDRESS || "0x0",
            method: "bet_yes",
          },
          {
            target: process.env.NEXT_PUBLIC_STARKFIT_CONTRACT_ADDRESS || "0x0",
            method: "bet_no",
          },
          {
            target: process.env.NEXT_PUBLIC_STARKFIT_CONTRACT_ADDRESS || "0x0",
            method: "claim_winnings",
          },
        ],
      });
      setWallet(w);
      setAddress(w.address.toString());
    } finally {
      setIsConnecting(false);
    }
  }, [sdk]);

  const disconnect = useCallback(() => {
    setWallet(null);
    setAddress(null);
  }, []);

  // Execute contract calls with gasless transactions via AVNU Paymaster
  const execute = useCallback(
    async (calls: Call[], sponsored = true): Promise<string> => {
      if (!wallet) throw new Error("Wallet not connected");
      const tx = await wallet.execute(calls, {
        ...(sponsored && { feeMode: "sponsored" }),
      });
      await tx.wait();
      return tx.hash;
    },
    [wallet]
  );

  return (
    <StarkZapContext.Provider
      value={{
        sdk,
        wallet,
        address,
        isConnected: !!wallet,
        isConnecting,
        connect,
        connectCartridge,
        disconnect,
        execute,
      }}
    >
      {children}
    </StarkZapContext.Provider>
  );
}
