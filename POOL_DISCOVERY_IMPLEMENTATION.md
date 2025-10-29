# Pool Discovery Implementation

## Overview

CreditRamp now fetches available Blend pools dynamically from the **Reward Zone** using the official Blend SDK. This implementation follows the recommendation from the Blend Capital team.

## How It Works

### 1. Reward Zone Concept

The **Reward Zone** is a list of pools that are eligible to earn BLND emissions. These pools have:
- ✅ Active backstop funding
- ✅ Passed threshold requirements  
- ✅ Been validated by the protocol

**Important**: Being in the reward zone doesn't guarantee safety, but it does validate that the backstop has funds.

### 2. Implementation Flow

```typescript
// Step 1: Load Backstop Configuration
const backstopConfig = await BackstopConfig.load(
  network,
  testnetContracts.ids.backstopV2
);

// Step 2: Get Pool IDs from Reward Zone
const poolIds = backstopConfig.rewardZone; // Array of pool addresses

// Step 3: Load Each Pool
const pools = await Promise.all(
  poolIds.map(poolId => Pool.load(network, poolId, timestamp))
);
```

### 3. Data Structure

Each loaded pool contains:

```typescript
interface BlendPool {
  id: string;                    // Pool contract address
  name: string;                  // Pool name
  reserves: Map<string, PoolReserve>;  // Assets in the pool
  totalValueLocked: bigint;      // Total TVL in USD (7 decimals)
  backstopModule: string;        // Backstop contract address
  status: 'active' | 'paused' | 'frozen';
}

interface PoolReserve {
  assetId: string;               // Asset contract address
  symbol: string;                // Asset symbol (USDC, XLM, etc.)
  supplyApr: number;             // Supply APR in basis points
  borrowApr: number;             // Borrow APR in basis points
  totalSupply: bigint;           // Total supplied
  totalBorrow: bigint;           // Total borrowed
  utilizationRate: number;       // Utilization %
  collateralFactor: number;      // Collateral factor %
  liquidationFactor: number;     // Liquidation factor %
}
```

## Code References

### Blend Protocol Sources

**Backstop Contract** (Reward Zone Function):
- https://github.com/blend-capital/blend-contracts-v2/blob/main/backstop/src/contract.rs#L78-L79

**JS SDK** (BackstopConfig):
- https://github.com/blend-capital/blend-sdk-js/blob/main/src/backstop/backstop_config.ts#L16

### CreditRamp Implementation

**Main Pool Loading** (`lib/blend.ts`):
```typescript
export async function loadMultiplePools(network: NetworkConfig): Promise<BlendPool[]> {
  const backstopConfig = await BackstopConfig.load(
    blendNetwork,
    testnetContracts.ids.backstopV2
  );
  
  console.log(`Found ${backstopConfig.rewardZone.length} pools in reward zone`);
  
  const pools = await Promise.all(
    backstopConfig.rewardZone.map(poolId => loadPool(network, poolId))
  );
  
  return pools.filter(pool => pool !== null);
}
```

**Individual Pool Loading**:
```typescript
export async function loadPool(network: NetworkConfig, poolId: string): Promise<BlendPool> {
  const timestamp = Math.floor(Date.now() / 1000);
  const pool = await Pool.load(blendNetwork, poolId, timestamp);
  
  // Convert SDK data to our format
  const reserves = new Map();
  for (const [assetId, reserve] of pool.reserves) {
    reserves.set(getAssetSymbol(assetId), {
      assetId: reserve.assetId,
      symbol: getAssetSymbol(assetId),
      supplyApr: Math.round(reserve.supplyApr * 100),
      borrowApr: Math.round(reserve.borrowApr * 100),
      totalSupply: reserve.totalSupply(),
      totalBorrow: reserve.totalLiabilities(),
      // ... more fields
    });
  }
  
  return {
    id: poolId,
    name: pool.config.name,
    reserves,
    totalValueLocked: BigInt(Math.floor(pool.estimates.totalSupply * 1e7)),
    backstopModule: pool.config.backstop,
    status: pool.config.status === 0 ? 'active' : 'paused',
  };
}
```

## Testnet Configuration

Current testnet contract addresses (`lib/contracts/testnet.contracts.json`):

```json
{
  "network": "testnet",
  "ids": {
    "backstopV2": "CBHWKF4RHIKOKSURAKXSJRIIA7RJAMJH4VHRVPYGUF4AJ5L544LYZ35X",
    "testnetV2Pool": "CDDG7DLOWSHRYQ2HWGZEZ4UTR7LPTKFFHN3QUCSZEXOWOPARMONX6T65",
    "poolFactoryV2": "CDSMKKCWEAYQW4DAUSH3XGRMIVIJB44TZ3UA5YCRHT6MP4LWEWR4GYV6",
    "usdcToken": "CAQCFVLOBK5GIULPNZRGATJJMIZL5BSP7X5YJVMGCPTUEPFM4AVSRCJU",
    "xlmToken": "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
    "blendToken": "CB22KRA3YZVCNCQI64JQ5WE7UY2VAV7WFLK6A2JN3HEX56T2EDAFO7QF",
    "wethToken": "CAZAQB3D7KSLSNOSQKYD2V4JP5V2Y3B4RDJZRLBFCCIXDCTE3WHSY3UE",
    "wbtcToken": "CAP5AMC2OHNVREO66DFIN6DHJMPOBAJ2KCDDIMFBR7WWJH5RZBFM3UEI"
  }
}
```

Source: https://github.com/blend-capital/blend-utils/blob/main/testnet.contracts.json

## Error Handling

The implementation includes fallback logic:

1. **Primary**: Load all pools from reward zone
2. **Fallback**: If reward zone fails, load single known testnet pool
3. **Final Fallback**: Return empty array if all fails

```typescript
try {
  const backstopConfig = await BackstopConfig.load(...);
  return await loadPoolsFromRewardZone(backstopConfig);
} catch (error) {
  console.warn('Reward zone failed, using fallback pool');
  try {
    const pool = await loadPool(network, KNOWN_POOL_ID);
    return [pool];
  } catch (fallbackError) {
    console.error('All pool loading failed');
    return [];
  }
}
```

## Frontend Display

Pools are displayed in `/components/PoolCards.tsx`:

```tsx
<PoolCards pools={blendPools} onSelectAsset={handleAssetSelect} />
```

Each pool card shows:
- Pool name and TVL
- Pool status (active/paused)
- Asset cards with:
  - Supply APR (green)
  - Borrow APR (red)
  - Utilization rate
  - Collateral factor
  - Total supply/borrow
  - **3% CreditRamp fee disclosure**

## Testing

To test the pool discovery:

```bash
# Start dev server
pnpm dev

# Open browser to http://localhost:3000
# Connect Freighter wallet
# Observe console logs:
# - "🔍 Fetching available pools from reward zone..."
# - "✅ Found X pools in reward zone: [...]"
# - "✅ Successfully loaded X pools"
```

## Benefits of This Approach

### ✅ Dynamic Discovery
- No hardcoded pool list
- Automatically discovers new pools
- Always up-to-date with reward zone

### ✅ Validated Pools
- Only shows pools with backstop funding
- Reduces risk of showing abandoned pools
- Aligned with Blend's recommendations

### ✅ Real Data
- Fetches live APRs from chain
- Accurate TVL and utilization
- Real-time pool status

### ✅ Scalable
- Works with any number of pools
- Handles pool additions/removals automatically
- Same code works on testnet and mainnet

## Next Steps

### Phase 1: Testing (Current)
- [x] Implement pool discovery from reward zone
- [x] Display pools in UI
- [ ] Test with actual wallet connection
- [ ] Verify APRs match Blend UI

### Phase 2: Enhancements
- [ ] Add pool filtering (by TVL, APR, asset)
- [ ] Add pool search
- [ ] Cache pool data (avoid repeated RPC calls)
- [ ] Add loading states and skeletons

### Phase 3: Production
- [ ] Monitor reward zone changes
- [ ] Track pool health metrics
- [ ] Alert on pool status changes
- [ ] Mainnet deployment

## Resources

- [Blend Capital Docs](https://docs.blend.capital/)
- [Blend SDK GitHub](https://github.com/blend-capital/blend-sdk-js)
- [Blend Contracts V2](https://github.com/blend-capital/blend-contracts-v2)
- [Blend Utils (Contract Addresses)](https://github.com/blend-capital/blend-utils)
- [Stellar Testnet Explorer](https://stellar.expert/explorer/testnet)

---

**Implementation Date**: October 29, 2024  
**Status**: ✅ Complete  
**Based On**: Blend Capital team recommendation
