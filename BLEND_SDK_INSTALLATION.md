# Blend SDK Installation Guide

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

This will install the newly added `@blend-capital/blend-sdk` package.

### 2. Get Blend Contract Addresses

You need to update the contract addresses in the configuration files with real Blend testnet addresses.

**Find addresses at**:
- [Blend Docs](https://docs.blend.capital/)
- [Blend GitHub Deployments](https://github.com/blend-capital/blend-contracts/tree/main/deployments)

**Update these files**:
- `lib/contracts/testnet.contracts.json`
- `lib/contracts/mainnet.contracts.json`
- `lib/contracts/futurenet.contracts.json`

### 3. Create CreditRamp Fee Collection Account

```bash
# Generate keypair for fee collection
stellar keys generate creditramp-fees --network testnet

# Output will show:
# Public Key: GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
# Secret Key: SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Fund the account (testnet only)
curl "https://friendbot.stellar.org?addr=YOUR_PUBLIC_KEY"
```

**Update** `lib/contracts/testnet.contracts.json`:
```json
{
  "ids": {
    "creditRampFeeCollector": "YOUR_PUBLIC_KEY_HERE"
  }
}
```

### 4. Update Contract Addresses

**Example** (replace with real addresses):

```json
{
  "network": "testnet",
  "ids": {
    "poolFactoryV2": "CBGTG3KSHYSIO7AFJYDUDYRIEO3VY3GWCWK7AAAAAAAAAAAAAAAAA",
    "oraclemock": "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    "blendToken": "CD25MNVTZDL4Y3XBCPCJXGXATV5WUHHOWMYFF4YBZEIPBN4KWFCJKBDX",
    "usdcToken": "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
    "creditRampFeeCollector": "GCREDITRAMP_YOUR_ACTUAL_FEE_ADDRESS_HERE"
  }
}
```

## What Was Added

### New Files

1. **`lib/blendDeployment.ts`**
   - Blend SDK integration
   - Pool deployment service
   - Fee calculation utilities
   - Transaction building

2. **`lib/contracts/*.contracts.json`**
   - Contract address configurations
   - Network-specific settings
   - Fee collector addresses

3. **`SMART_CONTRACT_SETUP.md`**
   - Complete setup guide
   - Transaction flow documentation
   - Security best practices
   - Testing instructions

### Updated Files

1. **`package.json`**
   - Added `@blend-capital/blend-sdk` dependency

2. **`lib/blend.ts`**
   - Enhanced pool data structures
   - 3% fee calculation logic
   - Atomic transaction design

## Usage Example

### Load Pools with Real Data

Once Blend SDK is installed and configured:

```typescript
import { BlendDeploymentService } from '@/lib/blendDeployment';

const service = new BlendDeploymentService('testnet');

// Get fee collector address
const feeAddress = service.getFeeCollectorAddress();
console.log('Fees collected to:', feeAddress);

// Calculate fee for transaction
const amount = BigInt(1000 * 1e7); // $1,000
const { feeAmount, netAmount } = service.calculateFee(amount);

console.log(`Gross: $${Number(amount) / 1e7}`);
console.log(`Fee (3%): $${Number(feeAmount) / 1e7}`);
console.log(`Net: $${Number(netAmount) / 1e7}`);
```

### Supply with Fee Collection

```typescript
import { supplyCollateral, CREDITRAMP_FEE_BPS } from '@/lib/blend';

// This will create an atomic transaction:
// 1. Transfer 3% fee to CreditRamp
// 2. Supply 97% to Blend pool

const result = await supplyCollateral(
  poolId,
  USDC_ASSET,
  amount,
  userAddress,
  network
);

console.log('Transaction hash:', result.hash);
console.log('Fee collected:', result.feeCollected);
console.log('Net supplied:', result.netSupplied);
```

## Verification

### Check Installation

```bash
# Verify Blend SDK is installed
pnpm list @blend-capital/blend-sdk

# Should output:
# @blend-capital/blend-sdk 1.0.0
```

### Test Configuration

```typescript
import testnetContracts from '@/lib/contracts/testnet.contracts.json';

console.log('Pool Factory:', testnetContracts.ids.poolFactoryV2);
console.log('Fee Collector:', testnetContracts.ids.creditRampFeeCollector);

// Verify addresses are not placeholder values
if (testnetContracts.ids.creditRampFeeCollector.includes('REPLACE')) {
  console.error('❌ Fee collector address not configured!');
} else {
  console.log('✅ Configuration looks good');
}
```

## Next Steps

1. **Run**: `pnpm install`
2. **Get**: Real Blend contract addresses from docs
3. **Create**: Fee collection account
4. **Update**: All contract configuration files
5. **Test**: On testnet with small amounts
6. **Monitor**: Fee collection on Stellar Expert

## Troubleshooting

### "Cannot find module '@blend-capital/blend-sdk'"

**Solution**: Run `pnpm install` to install dependencies.

### "Contract addresses not configured"

**Solution**: Update `lib/contracts/testnet.contracts.json` with real addresses from Blend docs.

### "Fee address invalid"

**Solution**: 
1. Generate a new Stellar keypair
2. Fund it on testnet
3. Update `creditRampFeeCollector` in config

### Where to Find Blend Addresses?

**Option 1**: Blend Documentation
- Visit: https://docs.blend.capital/
- Look for "Contract Addresses" or "Deployments"

**Option 2**: Blend GitHub
- Repo: https://github.com/blend-capital/blend-contracts
- Check: `deployments/` folder or README

**Option 3**: Stellar Expert
- Visit: https://stellar.expert/explorer/testnet
- Search for "Blend" contracts
- Copy contract addresses

## Important Notes

⚠️ **Testnet Only**: Current implementation is restricted to testnet for safety.

⚠️ **Placeholder Addresses**: The contract addresses in the JSON files are placeholders. You MUST replace them with real addresses before the app will work.

⚠️ **Fee Collection**: Set up a secure multi-sig wallet for the fee collector address before going to mainnet.

⚠️ **SDK Version**: Using `@blend-capital/blend-sdk` v1.0.0. Check for updates regularly.

## Resources

- **Blend Docs**: https://docs.blend.capital/
- **Blend GitHub**: https://github.com/blend-capital/blend-contracts
- **Blend Discord**: https://discord.com/invite/a6CDBQQcjW
- **Stellar Docs**: https://developers.stellar.org/
- **Soroban Docs**: https://soroban.stellar.org/docs

---

**Status**: Ready for installation
**Action Required**: Run `pnpm install` and update contract addresses
