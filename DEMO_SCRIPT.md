# CreditRamp Demo Script

## Overview
This demo showcases how SMBs can leverage their Stripe revenue data to access instant DeFi credit and lending opportunities on Stellar/Blend Capital.

## Prerequisites
1. **Freighter Wallet**: Install from [freighter.app](https://www.freighter.app/)
2. **Testnet XLM**: Get free testnet XLM from [Stellar Laboratory](https://laboratory.stellar.org/#account-creator?network=test)
3. **Stripe Test Mode**: Use the provided test API key

## Demo Flow (5-7 minutes)

### Step 1: Connect Wallet (30 seconds)
1. Open the app at `http://localhost:3000`
2. Click **"Connect Freighter Wallet"**
3. Approve the connection in Freighter popup
4. Your wallet address appears on screen

**Talking Points:**
- Non-custodial: Users maintain full control of their assets
- Freighter is the leading Stellar wallet with 100k+ users
- Seamless integration with Stellar dApps

### Step 2: Connect Stripe (30 seconds)
1. Click **"Connect Stripe Account"**
2. In production, this would trigger OAuth flow
3. For demo, instant connection simulates approved merchant

**Talking Points:**
- Stripe Connect enables secure revenue data access
- No sensitive financial data stored on our servers
- Real-time underwriting based on payment history

### Step 3: View Credit Score (1 minute)
After connection, observe:
- **Credit Limit**: $660 (calculated from mock revenue)
- **Avg Revenue**: $1,650/month (from 3 months of payouts)
- **APR**: 7% (current Blend pool rate)
- **Health Factor**: 1.5 (position safety metric)

**Talking Points:**
- Simple scoring: 80% of avg revenue ÷ 2 = credit limit
- In production, use ML models with more data points
- Real-time updates as revenue patterns change
- Much faster than traditional bank underwriting (weeks → seconds)

### Step 4: Deposit Funds (2 minutes)
1. Adjust slider to **$500**
2. Click **"Deposit $500 via Stripe OnRamp"**
3. Stripe OnRamp modal opens (embedded)
4. In production, user would:
   - Enter payment method
   - Complete KYC if needed
   - Receive USDC in wallet within minutes

**Talking Points:**
- Stripe OnRamp: Fiat → Crypto in one flow
- Supports credit cards, bank transfers, Apple Pay
- USDC arrives on Stellar (fast, low-cost)
- No need for centralized exchanges

### Step 5: Lend Tab - Supply Collateral (1.5 minutes)
1. Switch to **"Lend"** tab
2. See auto-suggestion: **$330** (50% of credit limit)
3. Adjust slider if desired
4. Click **"Supply $330 as Collateral"**
5. Approve transaction in Freighter
6. Success message appears

**Talking Points:**
- Auto-lending: Conservative 50% cap for safety
- Earn 7% APR on supplied USDC (vs 0.5% in savings accounts)
- Collateral backs borrowing power
- Blend Capital: Audited, battle-tested DeFi protocol

### Step 6: Borrow Tab - Take Credit (1.5 minutes)
1. Switch to **"Borrow"** tab
2. See available: **$660** (full credit limit)
3. Adjust slider to **$200**
4. Click **"Borrow $200"**
5. Approve transaction in Freighter
6. Funds arrive in wallet instantly

**Talking Points:**
- Instant liquidity without selling assets
- Use borrowed funds for inventory, payroll, expansion
- Repay anytime; interest accrues per-second
- Health factor prevents over-leveraging

### Step 7: Observe Dashboard Updates (30 seconds)
- Health factor adjusts based on borrowed amount
- Credit utilization bar updates
- Real-time position monitoring

**Talking Points:**
- Transparent risk metrics
- Users can top up collateral if health factor drops
- Liquidation protection (health factor < 1.0 triggers warning)

## Key Differentiators

### vs Traditional Banks
- **Speed**: Seconds vs weeks for credit approval
- **Cost**: 7-12% APR vs 15-25% for business loans
- **Access**: Global, 24/7 vs business hours, geographic limits
- **Transparency**: On-chain, auditable vs opaque processes

### vs Other DeFi Protocols
- **No Crypto Required**: Stripe OnRamp handles fiat conversion
- **Credit Scoring**: Real revenue data vs pure collateral-based
- **SMB Focus**: Tailored for business cash flow vs retail users
- **Integrated UX**: One dashboard vs multiple dApps

## Technical Highlights

### Architecture
- **Frontend**: Next.js 14 with TypeScript, Tailwind CSS, shadcn/ui
- **Blockchain**: Stellar (Soroban smart contracts)
- **DeFi Protocol**: Blend Capital (lending/borrowing pools)
- **Payments**: Stripe (OnRamp + Connect APIs)
- **Wallet**: Freighter (non-custodial Stellar wallet)

### Smart Contract Interactions
- Supply collateral: `PoolContract.submit()` with `RequestType.SupplyCollateral`
- Borrow assets: `PoolContract.submit()` with `RequestType.Borrow`
- All transactions signed client-side via Freighter

### Security Features
- Non-custodial: Private keys never leave user's device
- Audited contracts: Blend Capital security reviews
- Health factor monitoring: Prevents over-leveraging
- Testnet deployment: Safe experimentation

## Future Enhancements

### Phase 2 (Post-Hackathon)
1. **Advanced Scoring**: ML models with more data sources
2. **Multi-Asset Support**: XLM, AQUA, other Stellar assets
3. **Auto-Repayment**: Link Stripe payouts to loan repayment
4. **Yield Optimization**: Auto-compound earnings
5. **Mobile App**: React Native for iOS/Android

### Phase 3 (Production)
1. **Mainnet Launch**: Real funds, real yields
2. **Regulatory Compliance**: KYC/AML via Stripe Identity
3. **Insurance**: Cover protocol risks
4. **Analytics Dashboard**: Revenue forecasting, cash flow insights
5. **API for Platforms**: White-label solution for fintech apps

## Troubleshooting

### Common Issues
1. **Freighter not detected**: Ensure extension installed and enabled
2. **Transaction fails**: Check testnet XLM balance for fees
3. **OnRamp modal blank**: Verify Stripe API key in `.env.local`
4. **Pool data not loading**: Confirm network connectivity

### Demo Mode Fallbacks
- Mock Stripe payouts if API fails
- Simulated pool data if Blend unavailable
- All transactions work on Stellar Testnet

## Questions & Answers

**Q: How do you prevent fraud?**
A: Stripe's built-in fraud detection + on-chain transaction monitoring. In production, add velocity limits and anomaly detection.

**Q: What if a user defaults?**
A: Collateral is liquidated automatically by Blend protocol. Credit scoring minimizes default risk.

**Q: Why Stellar over Ethereum?**
A: Lower fees ($0.00001 vs $5-50), faster finality (5s vs 12s), better for payments use case.

**Q: How do you make money?**
A: Small fee on borrowed amounts (0.5-1%), revenue share with Blend Capital, premium features for power users.

## Conclusion
CreditRamp bridges the $5T SMB credit gap by combining:
- **Traditional Finance**: Stripe's trusted payment infrastructure
- **DeFi Innovation**: Blend Capital's efficient lending markets
- **Stellar's Speed**: Fast, cheap, global transactions

**Result**: SMBs get instant credit at competitive rates, while earning yield on idle cash. A true cash-to-DeFi ramp for the next generation of businesses.
