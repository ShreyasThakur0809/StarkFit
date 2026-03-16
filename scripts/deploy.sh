#!/bin/bash
# StarkFit Contract Deployment Script
# Usage: ./scripts/deploy.sh
#
# Prerequisites:
#   1. Set env vars in frontend/.env.local:
#      - NEXT_PUBLIC_STARKNET_RPC (Alchemy RPC URL)
#      - DEPLOYER_PRIVATE_KEY (wallet private key)
#      - DEPLOYER_ADDRESS (wallet address)
#   2. Have STRK tokens on Sepolia for gas
#   3. Install starkli: curl https://get.starkli.sh | sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Load env from frontend/.env.local
if [ -f "$PROJECT_DIR/frontend/.env.local" ]; then
  export $(grep -v '^#' "$PROJECT_DIR/frontend/.env.local" | grep -v '^$' | xargs)
fi

RPC_URL="${NEXT_PUBLIC_STARKNET_RPC:-https://starknet-sepolia.public.blastapi.io}"
PRIVATE_KEY="$DEPLOYER_PRIVATE_KEY"
DEPLOYER="$DEPLOYER_ADDRESS"

if [ -z "$PRIVATE_KEY" ] || [ -z "$DEPLOYER" ]; then
  echo "Error: Set DEPLOYER_PRIVATE_KEY and DEPLOYER_ADDRESS in frontend/.env.local"
  exit 1
fi

echo "==> Building contracts..."
cd "$PROJECT_DIR/contracts"
export PATH="$HOME/.local/bin:$PATH"
scarb build

echo ""
echo "==> Declaring contract class..."
# The compiled Sierra JSON is in target/dev/
SIERRA_FILE="$PROJECT_DIR/contracts/target/dev/starkfit_contracts_StarkFit.contract_class.json"
CASM_FILE="$PROJECT_DIR/contracts/target/dev/starkfit_contracts_StarkFit.compiled_contract_class.json"

if [ ! -f "$SIERRA_FILE" ]; then
  echo "Error: Sierra file not found at $SIERRA_FILE"
  echo "Available files:"
  ls "$PROJECT_DIR/contracts/target/dev/"
  exit 1
fi

CLASS_HASH=$(starkli declare "$SIERRA_FILE" "$CASM_FILE" \
  --rpc "$RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  --account "$DEPLOYER" \
  --watch 2>&1 | tail -1)

echo "Class hash: $CLASS_HASH"

echo ""
echo "==> Deploying contract..."
echo "   Owner: $DEPLOYER"
echo "   Oracle: $DEPLOYER (same for hackathon)"

# Constructor args: owner, oracle (both set to deployer for demo)
CONTRACT_ADDRESS=$(starkli deploy "$CLASS_HASH" \
  "$DEPLOYER" "$DEPLOYER" \
  --rpc "$RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  --account "$DEPLOYER" \
  --watch 2>&1 | tail -1)

echo ""
echo "========================================="
echo "Contract deployed!"
echo "Address: $CONTRACT_ADDRESS"
echo "========================================="
echo ""
echo "Add this to frontend/.env.local:"
echo "NEXT_PUBLIC_STARKFIT_CONTRACT_ADDRESS=$CONTRACT_ADDRESS"
