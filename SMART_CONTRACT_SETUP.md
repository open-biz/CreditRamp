# CreditRamp Smart Contract Setup

## Overview

CreditRamp uses the Blend Protocol SDK to interact with lending pools on Stellar. This document outlines the smart contract architecture, deployment process, and fee collection mechanism.

## Architecture

### No Custom Smart Contract Needed

**Key Insight**: CreditRamp does NOT need to deploy a custom smart contract. Instead, we use:

1. **Blend Protocol Contracts** (already deployed on Stellar)
2. **Atomic Transactions** (native Stellar feature)
3. **Standard Payment Operations** (for fee collection)

This approach is:
- ✅ More secure (no custom contract to audit)
- ✅ Lower cost (no contract deployment fees)
- ✅ Simpler to maintain
- ✅ Transparent to users

## Components

### 1. Blend SDK Integration

**Package**: `@blend-capital/blend-sdk`

```bash
pnpm add @blend-capital/blend-sdk
```

**Key Classes**:
- `PoolContractV2` - Interact with Blend lending pools
- `PoolFactoryContractV2` - Deploy new pools (admin only)
- `ReserveConfigV2` - Configure pool reserves

### 2. Contract Addresses

**Location**: `lib/contracts/*.contracts.json`

**Testnet Addresses** (to be updated):
```json
{
  "poolFactoryV2": "CAQXEOMK7VKY5GGXVXVMXNXVXVXVXVXVXVXVXVXVXVXVXVXVXVXVXVXV",
  "oraclemock": "CBXVXVXVXVXVXVXVXVXVXVXVXVXVXVXVXVXVXVXVXVXVXVXVXVXVXVXV",
  "creditRampFeeCollector": "GCREDITRAMPFEEADDRESS..."
}
```

### 3. Fee Collection Address

**Setup Required**:
1. Create a dedicated Stellar account for fee collection
2. Consider using multi-sig for security
3. Update `creditRampFeeCollector` in contract configs

**Recommended**: Use a 2-of-3 multi-sig wallet with:
- CreditRamp operations key
- CreditRamp finance key
- Cold storage backup key

## Transaction Flow

### Supply with Fee Collection

When a user supplies collateral to a Blend pool:

```typescript
// 1. Calculate fee (3%)
const feeAmount = (amount * 300n) / 10000n;
const netAmount = amount - feeAmount;

// 2. Build atomic transaction
const tx = new TransactionBuilder(account, {
  fee: '100',
  networkPassphrase: network.passphrase,
})
  // Operation 1: Transfer fee to CreditRamp
  .addOperation(Operation.payment({
    destination: CREDITRAMP_FEE_ADDRESS,
    asset: asset,
    amount: (Number(feeAmount) / 1e7).toString(),
  }))
  // Operation 2: Supply to Blend pool
  .addOperation(poolContract.call(
    'supply',
    Address.fromString(user),
    nativeToScVal(asset, { type: 'address' }),
    nativeToScVal(netAmount, { type: 'i128' })
  ))
  .setTimeout(30)
  .build();

// 3. Sign and submit
const signedTx = await signTx(tx.toXDR(), user, network.passphrase);
const result = await server.submitTransaction(signedTx);
```

### Key Benefits

**Atomic Execution**:
- Both operations succeed or both fail
- User never loses fee without successful supply
- No partial states possible

**Transparency**:
- User sees full transaction before signing
- Fee amount clearly visible
- Can verify on Stellar Explorer

**Security**:
- Uses battle-tested Blend contracts
- No custom contract attack surface
- Standard Stellar operations

## Installation & Setup

### Step 1: Install Dependencies

```bash
pnpm install
```

This installs:
- `@blend-capital/blend-sdk` - Blend Protocol SDK
- `@stellar/stellar-sdk` - Stellar SDK
- Other dependencies

### Step 2: Configure Contract Addresses

**Update**: `lib/contracts/testnet.contracts.json`

Get real addresses from:
- [Blend Testnet Docs](https://docs.blend.capital/)
- [Blend GitHub](https://github.com/blend-capital/blend-contracts)

```json
{
  "ids": {
    "poolFactoryV2": "ACTUAL_POOL_FACTORY_ADDRESS",
    "oraclemock": "ACTUAL_ORACLE_ADDRESS",
    "creditRampFeeCollector": "YOUR_FEE_COLLECTION_ADDRESS"
  }
}
```

### Step 3: Set Up Fee Collection Account

**Create Account**:
```bash
# Generate keypair
stellar keys generate creditramp-fees --network testnet

# Fund account (testnet)
curl "https://friendbot.stellar.org?addr=YOUR_PUBLIC_KEY"
```

**Configure Multi-Sig** (Recommended):
```typescript
import { Operation, TransactionBuilder } from '@stellar/stellar-sdk';

// Add signers
const tx = new TransactionBuilder(account, {
  fee: '100',
  networkPassphrase: Networks.TESTNET,
})
  .addOperation(Operation.setOptions({
    signer: {
      ed25519PublicKey: SIGNER_2_PUBLIC_KEY,
      weight: 1
    }
  }))
  .addOperation(Operation.setOptions({
    signer: {
      ed25519PublicKey: SIGNER_3_PUBLIC_KEY,
      weight: 1
    }
  }))
  .addOperation(Operation.setOptions({
    masterWeight: 1,
    lowThreshold: 2,
    medThreshold: 2,
    highThreshold: 2
  }))
  .setTimeout(30)
  .build();
```

### Step 4: Update Environment Variables

**`.env.local`**:
```bash
# Stellar Network
STELLAR_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
STELLAR_RPC_URL=https://soroban-testnet.stellar.org
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org

# CreditRamp Fee Collection
CREDITRAMP_FEE_ADDRESS=GCREDITRAMP...
CREDITRAMP_FEE_BPS=300

# Blend Contracts
BLEND_POOL_FACTORY=CAQXEOMK...
BLEND_ORACLE=CBXVXVXV...
```

## Usage

### Load Pool Data

```typescript
import { loadMultiplePools } from '@/lib/blend';

const pools = await loadMultiplePools({
  passphrase: Networks.TESTNET,
  horizonUrl: 'https://horizon-testnet.stellar.org',
  rpcUrl: 'https://soroban-testnet.stellar.org',
});

// Access pool data
pools.forEach(pool => {
  console.log(`Pool: ${pool.name}`);
  console.log(`TVL: $${Number(pool.totalValueLocked) / 1e7}`);
  
  pool.reserves.forEach((reserve, symbol) => {
    console.log(`${symbol}: ${reserve.supplyApr / 100}% APR`);
  });
});
```

### Supply with Fee

```typescript
import { supplyCollateral, CREDITRAMP_FEE_BPS } from '@/lib/blend';

const amount = BigInt(1000 * 1e7); // $1,000
const feeAmount = (amount * BigInt(CREDITRAMP_FEE_BPS)) / 10000n;
const netAmount = amount - feeAmount;

console.log(`Supplying: $${Number(amount) / 1e7}`);
console.log(`Fee (3%): $${Number(feeAmount) / 1e7}`);
console.log(`Net to pool: $${Number(netAmount) / 1e7}`);

const result = await supplyCollateral(
  poolId,
  USDC_ASSET,
  amount,
  userAddress,
  network
);

console.log(`Transaction: ${result.hash}`);
console.log(`Fee collected: ${result.feeCollected}`);
```

### Deploy New Pool (Admin)

```typescript
import { BlendDeploymentService } from '@/lib/blendDeployment';

const deployService = new BlendDeploymentService('testnet');

const poolData = {
  name: 'CreditRamp SMB Pool',
  network: 'testnet',
  backstopTakeRate: 0.1,
  maxPositions: 4,
  minCollateral: 100,
  selectedAssets: [
    {
      id: 'USDC',
      symbol: 'USDC',
      name: 'USD Coin',
      address: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
      decimals: 7
    }
  ],
  riskParameters: {
    preset: 'balanced'
  },
  emissions: []
};

const result = await deployService.deployPool(poolData, adminKeypair);
console.log(`Pool deployed: ${result.poolAddress}`);
```

## Fee Management

### Withdraw Collected Fees

```typescript
import { Operation, TransactionBuilder } from '@stellar/stellar-sdk';

// Build withdrawal transaction
const tx = new TransactionBuilder(feeAccount, {
  fee: '100',
  networkPassphrase: Networks.TESTNET,
})
  .addOperation(Operation.payment({
    destination: TREASURY_ADDRESS,
    asset: USDC_ASSET,
    amount: withdrawAmount.toString()
  }))
  .setTimeout(30)
  .build();

// Sign with required signers (multi-sig)
tx.sign(signer1Keypair);
tx.sign(signer2Keypair);

// Submit
const result = await server.submitTransaction(tx);
```

### Monitor Fee Collection

```typescript
// Query fee account balance
const account = await server.loadAccount(CREDITRAMP_FEE_ADDRESS);

account.balances.forEach(balance => {
  if (balance.asset_type !== 'native') {
    console.log(`${balance.asset_code}: ${balance.balance}`);
  }
});

// Query recent payments
const payments = await server
  .payments()
  .forAccount(CREDITRAMP_FEE_ADDRESS)
  .order('desc')
  .limit(100)
  .call();

let totalFeesCollected = 0;
payments.records.forEach(payment => {
  if (payment.type === 'payment' && payment.to === CREDITRAMP_FEE_ADDRESS) {
    totalFeesCollected += parseFloat(payment.amount);
  }
});

console.log(`Total fees collected: $${totalFeesCollected}`);
```

## Security Considerations

### Fee Collection Account

**Best Practices**:
1. Use multi-sig (2-of-3 or 3-of-5)
2. Store private keys in hardware wallets
3. Implement withdrawal limits
4. Regular security audits
5. Monitor for suspicious activity

### Transaction Validation

**Before Submission**:
```typescript
// Validate inputs
if (amount <= 0) throw new Error('Invalid amount');
if (!isValidAddress(userAddress)) throw new Error('Invalid address');

// Check pool capacity
const pool = await loadPool(network, poolId);
const reserve = pool.reserves.get(assetSymbol);
if (!reserve) throw new Error('Asset not supported');

const availableCapacity = reserve.supply_cap - reserve.totalSupply;
if (netAmount > availableCapacity) {
  throw new Error('Exceeds pool capacity');
}

// Verify fee calculation
const expectedFee = (amount * BigInt(CREDITRAMP_FEE_BPS)) / 10000n;
if (feeAmount !== expectedFee) {
  throw new Error('Fee calculation mismatch');
}
```

### Error Handling

```typescript
try {
  const result = await supplyCollateral(...);
  return { success: true, result };
} catch (error) {
  if (error.message.includes('insufficient balance')) {
    return { success: false, error: 'Insufficient balance' };
  } else if (error.message.includes('pool capacity')) {
    return { success: false, error: 'Pool at capacity' };
  } else {
    console.error('Supply error:', error);
    return { success: false, error: 'Transaction failed' };
  }
}
```

## Testing

### Unit Tests

```typescript
import { calculateFee } from '@/lib/blendDeployment';

describe('Fee Calculation', () => {
  it('should calculate 3% fee correctly', () => {
    const amount = BigInt(1000 * 1e7);
    const { feeAmount, netAmount } = calculateFee(amount);
    
    expect(feeAmount).toBe(BigInt(30 * 1e7)); // 3%
    expect(netAmount).toBe(BigInt(970 * 1e7)); // 97%
  });
});
```

### Integration Tests

```bash
# Test on testnet
pnpm test:integration

# Expected output:
# ✓ Connect wallet
# ✓ Load pools
# ✓ Calculate fees
# ✓ Submit supply transaction
# ✓ Verify fee collection
# ✓ Verify pool balance
```

## Monitoring & Analytics

### Key Metrics

**Track in Database**:
```sql
CREATE TABLE fee_collections (
  id SERIAL PRIMARY KEY,
  transaction_hash VARCHAR(64) NOT NULL,
  user_address VARCHAR(56) NOT NULL,
  asset_code VARCHAR(12) NOT NULL,
  gross_amount BIGINT NOT NULL,
  fee_amount BIGINT NOT NULL,
  net_amount BIGINT NOT NULL,
  pool_id VARCHAR(56) NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Query total fees
SELECT 
  asset_code,
  SUM(fee_amount) / 1e7 as total_fees_usd
FROM fee_collections
GROUP BY asset_code;
```

### Dashboard Metrics

- Total fees collected (by asset)
- Daily/weekly/monthly revenue
- Average transaction size
- Number of unique users
- Pool utilization rates
- APR trends

## Troubleshooting

### Common Issues

**1. "Contract not found"**
- Verify contract addresses in `contracts/*.json`
- Check network configuration
- Ensure using correct network (testnet vs mainnet)

**2. "Insufficient balance"**
- User needs more funds
- Check asset balance, not just XLM
- Account for transaction fees

**3. "Transaction failed"**
- Check simulation results
- Verify all parameters
- Ensure pool has capacity
- Check asset is enabled in pool

**4. "Fee address invalid"**
- Update `creditRampFeeCollector` in config
- Verify address format (starts with 'G')
- Ensure account exists and is funded

## Next Steps

1. **Install Blend SDK**: `pnpm install`
2. **Get Contract Addresses**: From Blend docs/GitHub
3. **Create Fee Account**: Generate and fund
4. **Update Configs**: Set all addresses
5. **Test on Testnet**: Run integration tests
6. **Deploy to Mainnet**: After thorough testing

---

**Status**: Ready for implementation
**Dependencies**: Blend SDK installation required
**Security**: Multi-sig recommended for fee account
