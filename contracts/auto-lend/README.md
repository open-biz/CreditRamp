# Soroban Project

## Project Structure

This repository uses the recommended structure for a Soroban project:
```text
.
├── contracts
│   └── hello_world
│       ├── src
│       │   ├── lib.rs
│       │   └── test.rs

### Key Features

- **3% Protocol Fee**: Automatically deducts 3% from supplied amounts
- **Seamless Blend Integration**: Calls Blend pool's `submit` function
- **Treasury Management**: Fees collected to designated treasury address
- **Authorization Security**: Requires user signature for all operations
- **Transparent Fee Query**: Public functions to view treasury and fee rate

### Contract Functions

#### `initialize(treasury: Address)`
Sets up the contract with a treasury address for fee collection. Can only be called once.

**Example**:
```rust
client.initialize(&treasury_address);
```

#### `auto_lend(amount, pool_id, asset, from, to) -> i128`
Main function that:
1. Takes `amount` USDC from `from` address
2. Calculates 3% fee: `fee = amount * 300 / 10000`
3. Sends fee to treasury
4. Supplies remaining 97% to Blend pool on behalf of `to`
5. Returns net amount supplied

**Parameters**:
- `amount`: Total USDC amount in stroops (7 decimals)
- `pool_id`: Blend pool contract address
- `asset`: USDC token contract address
- `from`: User's address (requires auth)
- `to`: Recipient address in Blend pool

**Returns**: Net amount supplied after fee

**Example**:
```rust
let net_supplied = client.auto_lend(
    &10_000_0000000i128,  // 10,000 USDC
    &blend_pool_address,
    &usdc_token_address,
    &user_address,
    &user_address,
);
// net_supplied = 9,700 USDC (after 3% fee)
```

#### `get_treasury() -> Address`
Returns the current treasury address.

#### `get_fee_bps() -> i128`
Returns the fee in basis points (300 = 3%).

## Build & Deploy

### Prerequisites

```bash
# Install Stellar CLI
curl -fsSL https://cli-assets.stellar.org/install.sh | sh

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32-unknown-unknown
```

### Build Contract

```bash
cd contracts/auto-lend/contracts/hello-world
stellar contract build
```

This creates: `target/wasm32-unknown-unknown/release/hello_world.wasm`

### Run Tests

```bash
cargo test
```

### Deploy to Testnet

```bash
# Deploy contract
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/hello_world.wasm \
  --source YOUR_SECRET_KEY \
  --network testnet

# Output: CONTRACT_ID (e.g., CA...)

# Initialize with treasury
stellar contract invoke \
  --id CONTRACT_ID \
  --source YOUR_SECRET_KEY \
  --network testnet \
  -- \
  initialize \
  --treasury TREASURY_ADDRESS
```

### Example Usage on Testnet

```bash
# Supply 1,000 USDC through auto-lend (with 3% fee)
stellar contract invoke \
  --id CONTRACT_ID \
  --source USER_SECRET_KEY \
  --network testnet \
  -- \
  auto_lend \
  --amount 10000000000 \
  --pool_id BLEND_POOL_ADDRESS \
  --asset USDC_TOKEN_ADDRESS \
  --from USER_PUBLIC_KEY \
  --to USER_PUBLIC_KEY

# Query treasury
stellar contract invoke \
  --id CONTRACT_ID \
  --network testnet \
  -- \
  get_treasury

# Query fee rate
stellar contract invoke \
  --id CONTRACT_ID \
  --network testnet \
  -- \
  get_fee_bps
```

## Integration with Frontend

Update `lib/blend.ts`:

```typescript
import { Contract, SorobanRpc, xdr, Address } from '@stellar/stellar-sdk';

const AUTO_LEND_CONTRACT_ID = 'CA...'; // Your deployed contract

export async function autoLendWithFee(
  amount: bigint,
  poolId: string,
  assetAddress: string,
  userAddress: string,
  network: NetworkConfig
) {
  const server = new SorobanRpc.Server(network.rpcUrl);
  const account = await server.getAccount(userAddress);
  
  const contract = new Contract(AUTO_LEND_CONTRACT_ID);
  
  // Build transaction
  const tx = new TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: network.passphrase,
  })
    .addOperation(
      contract.call(
        'auto_lend',
        Address.fromString(userAddress).toScVal(),
        xdr.ScVal.scvI128(new xdr.Int128Parts({ lo: amount, hi: 0n })),
        Address.fromString(poolId).toScVal(),
        Address.fromString(assetAddress).toScVal(),
        Address.fromString(userAddress).toScVal(),
        Address.fromString(userAddress).toScVal()
      )
    )
    .setTimeout(30)
    .build();

  // Sign with wallet
  const signedTx = await signTransaction(tx);
  
  // Submit
  const result = await server.sendTransaction(signedTx);
  return result;
}
```

## Fee Economics

### Revenue Model

With 3% protocol fee:

| TVL | Monthly Turnover | Monthly Revenue | Annual Revenue |
|-----|------------------|-----------------|----------------|
| $1M | 20% | $6,000 | $72,000 |
| $10M | 20% | $60,000 | $720,000 |
| $50M | 20% | $300,000 | $3,600,000 |

### Fee Distribution

Example: User supplies $10,000 USDC

1. **User pays**: $10,000 USDC
2. **Protocol fee**: $300 USDC (3%) → Treasury
3. **To Blend pool**: $9,700 USDC (97%)
4. **User earns**: APR on $9,700 (e.g., 7.5% = $727.50/year)

**Net to user**: $727.50 - $300 = **$427.50 profit/year**

Still better than 0.5% traditional savings account ($50/year on $10k)!

## Security Considerations

### Authorization
- Uses `require_auth()` to ensure only the user can move their funds
- Treasury address cannot be changed after initialization

### Fee Validation
- Fee calculation: `(amount * 300) / 10000` prevents overflow
- Uses i128 for safe arithmetic on large amounts

### Blend Integration
- Approves exact amount needed for pool
- Verifies pool address before invoking
- Returns actual amount supplied for transparency

### Testing
Run comprehensive tests:
```bash
cargo test --features testutils
```

## Contract Addresses

### Testnet
- **Contract ID**: `TBD` (deploy and update)
- **Treasury**: `TBD` (set during initialization)
- **Blend Pool**: `CDDG7DLOWSHRYQ2HWGZEZ4UTR7LPTKFFHN3QUCSZEXOWOPARMONX6T65`
- **USDC Token**: `CAQCFVLOBK5GIULPNZRGATJJMIZL5BSP7X5YJVMGCPTUEPFM4AVSRCJU`

### Mainnet
- **Status**: Not deployed yet
- Requires audit before mainnet deployment

## Roadmap

### Phase 1 (Current)
- **Basic auto-lend with 3% fee**
- **Treasury management**
- **Unit tests**

### Phase 2
- **Integration tests with Blend testnet**
- **Fee optimization (dynamic fees based on TVL)**
- **Multi-asset support (XLM, wBTC, wETH)**

### Phase 3
- **Governance for fee adjustments**
- **Revenue sharing for BLND stakers**
- **Security audit**

### Phase 4
- **Mainnet deployment**
- **DAO treasury management**

## Resources

- **Soroban Docs**: https://developers.stellar.org/docs/build/smart-contracts
- **Blend Capital**: https://blend.capital/
- **Stellar CLI**: https://github.com/stellar/stellar-cli

## License

MIT License - See LICENSE file for details

---

**Built for Stellar Hackathon** 