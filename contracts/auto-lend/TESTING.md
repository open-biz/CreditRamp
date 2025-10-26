# Testing CreditRamp Auto-Lend Contract

## Contract Details
- **Contract ID**: `CAYBZMMV2QQS6AZ4AE7F432MOWC2QAD3B5D5WWOAV6467PMMERZ63ISP`
- **Treasury**: `GAYA77PB7HRJ42SK4WIFF75FM625NRBJY54IMVO4MGIER3ILW53QBSD3`
- **Deployer**: `GDPAKHOPTOHM3JY2C6GHIFOHYTPH7YGI4ENGF7RP5PPQIFK3FI5GT436`
- **Network**: Stellar Testnet

## Query Functions (No Authorization Required)

### Get Treasury Address
```bash
stellar contract invoke \
  --id CAYBZMMV2QQS6AZ4AE7F432MOWC2QAD3B5D5WWOAV6467PMMERZ63ISP \
  --network testnet \
  -- \
  get_treasury
```

Expected output: `GAYA77PB7HRJ42SK4WIFF75FM625NRBJY54IMVO4MGIER3ILW53QBSD3`

### Get Fee Basis Points
```bash
stellar contract invoke \
  --id CAYBZMMV2QQS6AZ4AE7F432MOWC2QAD3B5D5WWOAV6467PMMERZ63ISP \
  --network testnet \
  -- \
  get_fee_bps
```

Expected output: `300` (3%)

## Main Function: auto_lend

### Prerequisites
1. User must have USDC balance
2. User must approve the contract to spend USDC
3. Blend pool must be operational

### Test Command
```bash
# Replace GDPAK... with your test wallet address
stellar contract invoke \
  --id CAYBZMMV2QQS6AZ4AE7F432MOWC2QAD3B5D5WWOAV6467PMMERZ63ISP \
  --source creditrampdefault \
  --network testnet \
  -- \
  auto_lend \
  --amount 10000000 \
  --pool_id CDDG7DLOWSHRYQ2HWGZEZ4UTR7LPTKFFHN3QUCSZEXOWOPARMONX6T65 \
  --asset CAQCFVLOBK5GIULPNZRGATJJMIZL5BSP7X5YJVMGCPTUEPFM4AVSRCJU \
  --from GDPAKHOPTOHM3JY2C6GHIFOHYTPH7YGI4ENGF7RP5PPQIFK3FI5GT436 \
  --to GDPAKHOPTOHM3JY2C6GHIFOHYTPH7YGI4ENGF7RP5PPQIFK3FI5GT436
```

### Parameters Explained
- `amount`: Total USDC to process (in stroops, 7 decimals)
  - Example: `10000000` = 1 USDC
  - Example: `100000000` = 10 USDC
- `pool_id`: Blend pool contract address (Official Blend Testnet V2 Pool)
- `asset`: USDC token contract address (Testnet USDC)
- `from`: User's wallet address (requires signature)
- `to`: Recipient in Blend pool (usually same as `from`)

### Expected Behavior
1. Contract takes full `amount` from user
2. Calculates fee: `fee = amount * 300 / 10000` (3%)
3. Transfers `fee` to treasury
4. Supplies remaining `amount - fee` (97%) to Blend pool
5. Returns net amount supplied

### Fee Calculation Examples
| Input Amount | Fee (3%) | Net Supplied (97%) |
|--------------|----------|-------------------|
| 1 USDC (10000000) | 0.03 USDC (300000) | 0.97 USDC (9700000) |
| 10 USDC (100000000) | 0.3 USDC (3000000) | 9.7 USDC (97000000) |
| 100 USDC (1000000000) | 3 USDC (30000000) | 97 USDC (970000000) |

## Verifying Results

### Check Treasury Balance
After calling `auto_lend`, verify the treasury received the fee:
```bash
stellar contract invoke \
  --id CAQCFVLOBK5GIULPNZRGATJJMIZL5BSP7X5YJVMGCPTUEPFM4AVSRCJU \
  --network testnet \
  -- \
  balance \
  --id GAYA77PB7HRJ42SK4WIFF75FM625NRBJY54IMVO4MGIER3ILW53QBSD3
```

### Check Blend Pool Position
Verify the user's position in Blend increased by the net amount (97% of input).

## Testing Checklist

- [ ] Query `get_treasury()` - should return treasury address
- [ ] Query `get_fee_bps()` - should return 300
- [ ] Fund test wallet with testnet USDC
- [ ] Call `auto_lend()` with small amount (1 USDC)
- [ ] Verify treasury received 3% fee
- [ ] Verify Blend position increased by 97%
- [ ] Test with larger amounts
- [ ] Test error cases (insufficient balance, etc.)

## Common Issues

### "Insufficient balance"
- Ensure user has enough USDC in their wallet
- Get testnet USDC from a faucet or bridge

### "Authorization failed"
- Ensure you're signing with the correct wallet
- The `from` address must match the `--source` identity

### "Contract not found"
- Verify you're using the correct network (testnet)
- Check the contract ID is correct

## View on Stellar Expert
[Contract Explorer](https://stellar.expert/explorer/testnet/contract/CAYBZMMV2QQS6AZ4AE7F432MOWC2QAD3B5D5WWOAV6467PMMERZ63ISP)
