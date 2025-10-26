#!/bin/bash
set -e

echo "🚀 CreditRamp Auto-Lend Contract Deployment"
echo "============================================"
echo ""

# Treasury address
TREASURY="GAYA77PB7HRJ42SK4WIFF75FM625NRBJY54IMVO4MGIER3ILW53QBSD3"

# Check if identity exists
if ! stellar keys address creditrampdefault &>/dev/null; then
  echo "❌ No creditrampdefault identity found. Please set up your wallet:"
  echo "   stellar keys generate creditrampdefault --network testnet"
  exit 1
fi

USER_ADDRESS=$(stellar keys address creditrampdefault)
echo "👤 Deploying as: $USER_ADDRESS"
echo "💰 Treasury address: $TREASURY"
echo ""

# Build the contract (from workspace root)
echo "📦 Building contract..."
cd contracts/hello-world
stellar contract build
cd ../..

# Stellar CLI builds to wasm32v1-none target (relative to auto-lend dir)
WASM_FILE="target/wasm32v1-none/release/hello_world.wasm"

if [ ! -f "$WASM_FILE" ]; then
  echo "❌ Build failed: WASM file not found at $WASM_FILE"
  exit 1
fi

echo "✅ Build complete"
echo ""

# Deploy the contract
echo "🚀 Deploying to testnet..."
CONTRACT_ID=$(stellar contract deploy \
  --wasm "$WASM_FILE" \
  --source creditrampdefault \
  --network testnet)

echo "✅ Contract deployed!"
echo "📝 Contract ID: $CONTRACT_ID"
echo ""

# Initialize the contract
echo "🔧 Initializing contract with treasury..."
stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source creditrampdefault \
  --network testnet \
  -- \
  initialize \
  --treasury "$TREASURY"

echo "✅ Contract initialized!"
echo ""

# Save contract ID
cd ../..
echo "$CONTRACT_ID" > deployed-contract-id.txt

echo "======================================"
echo "🎉 Deployment Complete!"
echo ""
echo "Contract ID: $CONTRACT_ID"
echo "Treasury: $TREASURY"
echo "Fee: 3%"
echo ""
echo "📋 Next steps:"
echo "1. Add contract ID to testnet.contracts.json"
echo "2. Update frontend to use contract ID"
echo "3. Test auto-lend function"
echo ""
echo "Saved contract ID to: deployed-contract-id.txt"
