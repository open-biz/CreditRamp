# Blend Protocol Integration

## Overview

CreditRamp integrates with the Blend Protocol on Stellar to provide SMBs with access to DeFi lending pools. This document outlines the integration architecture, fee structure, and smart contract implementation strategy.

## Architecture

### Components

1. **Blend Pool Service** (`lib/blend.ts`)
   - Fetches pool data from Blend testnet
   - Manages pool reserves and APR calculations
   - Handles supply/borrow transactions

2. **Pool Cards UI** (`components/PoolCards.tsx`)
   - Displays available lending pools
   - Shows APR, utilization, and pool metrics
   - Interactive asset selection

3. **Fee Collection System**
   - 3% intermediary fee on all supply transactions
   - Collected before funds reach Blend pool

## Fee Structure

### CreditRamp Intermediary Fee

**Rate**: 3% (300 basis points)

**Application**: Applied to all supply (lend) transactions

**Calculation**:
```typescript
const feeAmount = (amount * 300) / 10000;  // 3%
const netAmount = amount - feeAmount;       // Amount supplied to pool
```

**Example**:
- User supplies: $1,000 USDC
- CreditRamp fee: $30 USDC (3%)
- Net to Blend pool: $970 USDC

### Fee Collection Address

```
CREDITRAMP_FEE_ADDRESS = 'GCREDITRAMPFEEADDRESS...'
```

**TODO**: Replace with actual Stellar address for fee collection

## Smart Contract Implementation

### Transaction Flow

When a user supplies collateral, CreditRamp creates a **single atomic transaction** with two operations:

#### Operation 1: Fee Transfer
```typescript
Operation.payment({
  destination: CREDITRAMP_FEE_ADDRESS,
  asset: asset,
  amount: feeAmount,
})
```

#### Operation 2: Supply to Blend
```typescript
poolContract.call(
  'supply',
  Address.fromString(user),
  nativeToScVal(asset, { type: 'address' }),
  nativeToScVal(netAmount, { type: 'i128' })
)
```

### Benefits of Atomic Transactions

1. **All-or-nothing**: Both operations succeed or both fail
2. **No partial states**: User never loses fee without supply succeeding
3. **Gas efficient**: Single transaction fee
4. **Transparent**: User sees full transaction before signing

## Blend Pool Data Structure

### Pool Interface

```typescript
interface BlendPool {
  id: string;                    // Pool contract address
  name: string;                  // Human-readable name
  reserves: Map<string, PoolReserve>;
  totalValueLocked: bigint;      // Total TVL across all assets
  backstopModule: string;        // Backstop contract address
  status: 'active' | 'paused' | 'frozen';
}
```

### Reserve Interface

```typescript
interface PoolReserve {
  assetId: string;               // Asset identifier
  symbol: string;                // e.g., 'USDC', 'XLM'
  supplyApr: number;             // In basis points (750 = 7.5%)
  borrowApr: number;             // In basis points
  totalSupply: bigint;           // Total supplied to pool
  totalBorrow: bigint;           // Total borrowed from pool
  utilizationRate: number;       // Percentage (0-100)
  collateralFactor: number;      // Percentage (0-100)
  liquidationFactor: number;     // Percentage (0-100)
}
```

## Current Implementation Status

### ✅ Completed

- [x] Pool data structure definitions
- [x] Fee calculation logic (3%)
- [x] Pool cards UI component
- [x] APR display for multiple assets
- [x] Utilization and collateral factor display
- [x] Mock pool data for testnet

### 🚧 In Progress

- [ ] Real Blend SDK integration
- [ ] Actual pool data fetching from Soroban RPC
- [ ] Transaction signing and submission
- [ ] Fee collection address setup

### 📋 TODO

1. **Integrate Blend SDK**
   ```bash
   pnpm add @blend-capital/blend-sdk
   ```

2. **Replace Mock Data**
   - Connect to Soroban RPC endpoint
   - Fetch real pool data from Blend contracts
   - Query reserve states and APRs

3. **Implement Real Transactions**
   - Build atomic transactions with fee + supply
   - Sign with Freighter wallet
   - Submit to Stellar testnet
   - Handle transaction results

4. **Set Up Fee Collection**
   - Create dedicated Stellar account for fees
   - Implement fee withdrawal mechanism
   - Add fee reporting/analytics

5. **Add Error Handling**
   - Transaction failures
   - Insufficient balance
   - Pool capacity limits
   - Network errors

## Blend Protocol Resources

### Official Documentation
- [Blend Docs](https://docs.blend.capital/)
- [Blend Contracts](https://github.com/blend-capital/blend-contracts)
- [Blend SDK](https://github.com/blend-capital/blend-contract-sdk)

### Testnet Information
- **Network**: Stellar Testnet
- **RPC URL**: `https://soroban-testnet.stellar.org`
- **Horizon URL**: `https://horizon-testnet.stellar.org`
- **Network Passphrase**: `Test SDF Network ; September 2015`

### Example Pool ID
```
CCS5ACKIDOIVW2QMWBF7H3ZM4ZIH2Q2NP7I3P3GH7YXXGN7I3WND3D6G
```

## Fee Revenue Model

### Revenue Calculation

For a pool with $1M TVL and 3% fee:
- Monthly volume (assuming 20% turnover): $200,000
- Monthly fee revenue: $6,000
- Annual fee revenue: $72,000

### Fee Distribution (Future)

Consider implementing tiered fee structure:
- **Standard**: 3% for all users
- **Premium**: 2% for high-volume users (>$100k/month)
- **Enterprise**: 1.5% for institutional partners

## Security Considerations

1. **Fee Address Security**
   - Use multi-sig wallet for fee collection
   - Implement withdrawal limits
   - Regular security audits

2. **Transaction Safety**
   - Validate all inputs before transaction
   - Check pool capacity before supply
   - Verify asset addresses

3. **Smart Contract Risks**
   - Blend protocol audits: See `audits/` folder in Blend repo
   - Monitor pool health factors
   - Implement emergency pause mechanism

## Testing Strategy

### Unit Tests
- Fee calculation accuracy
- Transaction building logic
- Pool data parsing

### Integration Tests
- End-to-end supply flow
- Fee collection verification
- Error handling scenarios

### Testnet Testing
- Deploy to Stellar testnet
- Test with real Blend pools
- Verify fee collection
- Monitor transaction success rates

## Monitoring & Analytics

### Key Metrics to Track

1. **Volume Metrics**
   - Total supply volume
   - Fee revenue collected
   - Average transaction size

2. **Pool Metrics**
   - APR trends
   - Utilization rates
   - TVL changes

3. **User Metrics**
   - Active lenders
   - Retention rate
   - Average position size

## Next Steps

1. **Phase 1: Real Data Integration** (Week 1-2)
   - Integrate Blend SDK
   - Fetch real pool data
   - Display live APRs

2. **Phase 2: Transaction Implementation** (Week 3-4)
   - Build atomic transactions
   - Implement fee collection
   - Test on testnet

3. **Phase 3: Production Readiness** (Week 5-6)
   - Security audit
   - Performance optimization
   - Monitoring setup

4. **Phase 4: Mainnet Launch** (Week 7-8)
   - Deploy to mainnet
   - Launch with limited pools
   - Monitor and iterate

---

**Last Updated**: October 26, 2025
**Status**: Development - Testnet Phase
**Contact**: dev@creditramp.io
