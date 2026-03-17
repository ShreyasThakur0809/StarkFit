# StarkFit

**Stake. Walk. Earn.** A crypto fitness challenge platform on Starknet where users stake tokens, complete daily walking goals, and survivors split the prize pool.

Built with **StarkZap SDK** + **AVNU Paymaster** for fully gasless transactions.

---

## How It Works

```
1. STAKE    →  Join a challenge by staking STRK, ETH, or WBTC
2. CONNECT  →  Link Google Fit or Strava for step tracking
3. WALK     →  Hit your daily step goal to stay alive
4. EARN     →  Miss a day? Eliminated. Survivors split the pot.
```

### Prediction Markets

Spectators can bet YES/NO on whether a player will complete their challenge. Winners take the losing side's pool proportionally.

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│  Frontend (Next.js 14 + React 18 + Tailwind v4) │
│                                                   │
│  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  StarkZap    │  │  Fitness APIs            │  │
│  │  SDK         │  │  Google Fit / Strava     │  │
│  │  + Cartridge │  │  OAuth → Cookie → Verify │  │
│  │  Controller  │  └──────────────────────────┘  │
│  └──────┬───────┘                                 │
│         │ gasless via AVNU Paymaster              │
└─────────┼─────────────────────────────────────────┘
          │
┌─────────▼─────────────────────────────────────────┐
│  Smart Contract (Cairo on Starknet Sepolia)       │
│                                                    │
│  Challenges: create, join, submit_steps, claim     │
│  Markets:    create, bet_yes, bet_no, claim        │
│  Oracle:     step verification + auto-elimination  │
└────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Tech |
|-------|------|
| Smart Contract | Cairo (Scarb 2.16.1) + OpenZeppelin ERC20 |
| Frontend | Next.js 14, React 18, Tailwind CSS v4 |
| Wallet | StarkZap SDK — Cartridge Controller (social login) + browser wallets (Ready, Argent X, Braavos) |
| Gasless Tx | AVNU Paymaster via StarkZap |
| Fitness Data | Google Fit API, Strava API (OAuth 2.0) |
| Oracle | Server-side step verification → on-chain `submit_steps` |
| Network | Starknet Sepolia testnet |

---

## Smart Contract

**Address:** `0x05cb1f3a819665bbe2d36a65c3f4b4b3b07cec41b7bbb627909b564c2fc55ca1`

### Key Functions

| Function | Access | Description |
|----------|--------|-------------|
| `create_challenge` | Anyone | Create a challenge with token, stake amount, duration, step goal |
| `join_challenge` | Anyone | Stake tokens and join (ERC20 `transfer_from`) |
| `submit_steps` | Oracle only | Submit verified steps; auto-eliminates if below goal |
| `end_challenge` | Oracle/Owner | End the challenge period |
| `claim_reward` | Survivors | Claim proportional share of prize pool |
| `create_market` | Anyone | Create a YES/NO prediction market on a player |
| `bet_yes` / `bet_no` | Anyone | Stake tokens on the outcome |
| `resolve_market` | Oracle/Owner | Resolve based on player survival |
| `claim_winnings` | Winners | Claim proportional share of market pool |

---

## Project Structure

```
Starkfit/
├── contracts/                # Cairo smart contract
│   ├── src/
│   │   ├── lib.cairo
│   │   └── starkfit.cairo    # Main contract (~540 lines)
│   └── Scarb.toml
├── frontend/                 # Next.js app
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx              # Landing page
│   │   │   ├── challenges/           # Browse + create challenges
│   │   │   ├── markets/              # Prediction markets
│   │   │   ├── dashboard/            # User dashboard + fitness
│   │   │   └── api/
│   │   │       ├── auth/             # OAuth callbacks (Google, Strava)
│   │   │       └── fitness/          # Step fetch, verify, status
│   │   ├── components/
│   │   │   └── Navbar.tsx            # Wallet connect modal
│   │   ├── providers/
│   │   │   └── starknet.tsx          # StarkZap + browser wallet provider
│   │   └── lib/
│   │       ├── contract.ts           # On-chain reads via RPC
│   │       ├── hooks.ts              # Contract write hooks
│   │       ├── useContractData.ts    # React data hooks
│   │       ├── abi.ts                # Contract ABI
│   │       └── constants.ts          # Token addresses, config
│   └── package.json
├── scripts/
│   └── deploy.mjs            # Deployment script
└── .env.local                 # Credentials (gitignored)
```

---

## Quick Start

### Prerequisites

- Node.js 18+
- [Scarb 2.16.1](https://docs.swmansion.com/scarb/) (for contract compilation)

### 1. Install

```bash
cd Starkfit/frontend
npm install
```

### 2. Configure

Create `.env.local` in the project root (see `.env.local` template):

```env
# Required
NEXT_PUBLIC_STARKNET_RPC=<Alchemy Starknet Sepolia RPC>
NEXT_PUBLIC_STARKFIT_CONTRACT_ADDRESS=0x05cb1f3a819665bbe2d36a65c3f4b4b3b07cec41b7bbb627909b564c2fc55ca1

# Oracle (for step verification)
ORACLE_PRIVATE_KEY=<private key>
ORACLE_ADDRESS=<address>

# Fitness APIs
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<secret>
NEXT_PUBLIC_STRAVA_CLIENT_ID=<from strava.com/settings/api>
STRAVA_CLIENT_SECRET=<secret>
```

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Build Contract (optional)

```bash
cd contracts
scarb build
```

---

## Gasless Transactions

All user transactions are **gasless** via AVNU Paymaster through the StarkZap SDK. Users never need STRK/ETH for gas fees.

```typescript
const sdk = new StarkZap({
  network: "sepolia",
  paymaster: { nodeUrl: "https://starknet.paymaster.avnu.fi" },
});
```

---

## Fitness Verification Flow

```
User clicks "Verify Steps"
        │
        ▼
  /api/fitness/verify
        │
        ├── Reads fitness token from HTTP-only cookie
        ├── Fetches steps from Google Fit or estimates from Strava
        ├── Oracle submits steps on-chain via submit_steps()
        │
        ▼
  Smart contract auto-eliminates if steps < goal
```

- **Google Fit** — direct step count from `com.google.step_count.delta`
- **Strava** — estimates steps from walk/run distance (~1,300 steps/km walk, ~1,400/km run)

---

## Supported Tokens

| Token | Address (Sepolia) |
|-------|-------------------|
| STRK | `0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d` |
| ETH | `0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7` |
| WBTC | `0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac` |

---

## License

MIT
