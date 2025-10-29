# Health Factor Explained

## What is Health Factor?

The **Health Factor** is a numerical representation of the safety of your lending position. It's a critical metric in DeFi lending protocols that indicates how close you are to liquidation.

---

## Formula

```
Health Factor = (Collateral Value × Liquidation Threshold) ÷ Debt Value
```

### Components

- **Collateral Value**: Total value of assets you've supplied as collateral
- **Liquidation Threshold**: Maximum percentage of collateral value you can borrow (e.g., 80%)
- **Debt Value**: Total value of assets you've borrowed

---

## Interpretation

### Health Factor Ranges

| Range | Status | Risk Level | What It Means |
|-------|--------|-----------|---------------|
| **> 2.0** | 🟢 Excellent | Very Low | Your collateral is worth 2x+ your debt. Very safe! |
| **1.5 - 2.0** | 🟡 Good | Low | Healthy position with good buffer |
| **1.1 - 1.5** | 🟠 Fair | Medium | Monitor closely, add collateral if price drops |
| **< 1.1** | 🔴 At Risk | High | Danger zone! May be liquidated soon |
| **< 1.0** | 🚨 Liquidation | Critical | Position WILL be liquidated |

---

## Example Calculation

### Scenario
- You supply **$1,000 USDC** as collateral
- Liquidation threshold is **80%**
- You borrow **$400 USDC**

### Calculation
```
Health Factor = ($1,000 × 0.80) ÷ $400
             = $800 ÷ $400
             = 2.0
```

**Result**: Health Factor of **2.0** = Excellent ✅

---

## What Affects Health Factor?

### 1. **Collateral Value Changes** 📊
- **Price increases** → Health Factor increases ⬆️
- **Price decreases** → Health Factor decreases ⬇️

### 2. **Debt Value Changes** 💰
- **Borrowing more** → Health Factor decreases ⬇️
- **Repaying debt** → Health Factor increases ⬆️
- **Interest accrual** → Health Factor slowly decreases ⬇️

### 3. **Adding/Removing Collateral** 🏦
- **Adding collateral** → Health Factor increases ⬆️
- **Withdrawing collateral** → Health Factor decreases ⬇️

---

## Current Implementation in CreditRamp

### Version 1 (Current)

**Status**: Simplified placeholder

```typescript
// Currently hardcoded based on credit utilization
setHealthFactor(2.0);
```

The current implementation sets a **conservative default of 2.0**, which represents a healthy position suitable for the auto-lending model where users supply collateral but haven't borrowed yet.

### Why 2.0?
- Conservative safety margin
- Represents 50% loan-to-value ratio
- Aligns with "supply-only" model (no active borrowing)

---

## Future Enhancement: Real Health Factor Calculation

### Proposed Implementation

```typescript
async function calculateHealthFactor(
  userAddress: string,
  poolId: string
): Promise<number> {
  // Load user's position from Blend
  const pool = await PoolV2.load(network, poolId);
  const userPosition = await pool.loadUser(userAddress);
  
  // Get collateral and debt values
  const collateralValue = userPosition.positionEstimate.totalEffectiveCollateral;
  const debtValue = userPosition.positionEstimate.totalEffectiveLiabilities;
  
  // Calculate health factor
  if (debtValue === 0) {
    return Infinity; // No debt = perfect health
  }
  
  const healthFactor = collateralValue / debtValue;
  return healthFactor;
}
```

### Integration Points

1. **After Wallet Connection**
   ```typescript
   useEffect(() => {
     if (walletAddress) {
       fetchPoolData();
       checkWalletBalance();
       calculateUserHealthFactor(); // ← Add this
     }
   }, [walletAddress]);
   ```

2. **After Supply/Borrow Operations**
   ```typescript
   await supplyCollateral(...);
   await calculateUserHealthFactor(); // Update health factor
   ```

3. **Periodic Updates**
   ```typescript
   // Poll every 30 seconds for price changes
   useEffect(() => {
     const interval = setInterval(() => {
       if (walletAddress) {
         calculateUserHealthFactor();
       }
     }, 30000);
     return () => clearInterval(interval);
   }, [walletAddress]);
   ```

---

## Blend SDK Integration

### Loading User Position

```typescript
import { PoolV2 } from '@blend-capital/blend-sdk';

// Load pool
const pool = await PoolV2.load(network, poolId);

// Load user's positions
const userPosition = await pool.loadUser(userAddress);

// Get position estimates
const estimate = userPosition.positionEstimate;

console.log('Collateral:', estimate.totalEffectiveCollateral);
console.log('Debt:', estimate.totalEffectiveLiabilities);
console.log('Health Factor:', estimate.totalEffectiveCollateral / estimate.totalEffectiveLiabilities);
```

### Position Estimate Properties

From the Blend SDK:
- `totalEffectiveCollateral`: Collateral value adjusted by collateral factors
- `totalEffectiveLiabilities`: Debt value adjusted by liability factors
- `borrowCap`: Maximum borrowing capacity
- `borrowLimit`: Current borrow limit

---

## UI Implementation

### Current Display

```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <div className="cursor-help">
        <p>Health Factor</p>
        <p className="text-2xl">{healthFactor.toFixed(2)}</p>
        {/* Color-coded status indicator */}
        {healthFactor >= 2.0 && <span className="text-green-400">Excellent ✓</span>}
        {healthFactor >= 1.5 && healthFactor < 2.0 && <span className="text-yellow-400">Good</span>}
        {healthFactor >= 1.1 && healthFactor < 1.5 && <span className="text-orange-400">Fair</span>}
        {healthFactor > 0 && healthFactor < 1.1 && <span className="text-red-400">At Risk!</span>}
      </div>
    </TooltipTrigger>
    <TooltipContent>
      {/* Detailed explanation */}
      <p>Health Factor Explained</p>
      <p>Measures the safety of your lending position.</p>
      <p className="font-mono">
        (Collateral Value × Liquidation Threshold) ÷ Debt Value
      </p>
      {/* Risk level breakdown */}
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

### Hover State
When users hover over the Health Factor stat, they see:
- ✅ Clear explanation
- ✅ Formula with actual numbers
- ✅ Color-coded risk levels
- ✅ Current status interpretation

---

## Liquidation Risk

### When Does Liquidation Happen?

**Liquidation Threshold**: Typically **80-85%** for stablecoins

If your **Health Factor < 1.0**, liquidators can:
1. Repay part of your debt
2. Seize your collateral (with liquidation penalty)
3. Earn liquidation bonus (usually 5-10%)

### Example Liquidation

**Starting Position:**
- Collateral: $1,000 USDC
- Liquidation threshold: 80%
- Debt: $800 USDC
- Health Factor: ($1,000 × 0.80) ÷ $800 = **1.0** ⚠️

**After 1% Price Drop:**
- Collateral: $990 USDC
- Debt: $800 USDC (unchanged)
- Health Factor: ($990 × 0.80) ÷ $800 = **0.99** 🚨
- **→ Liquidatable!**

**Liquidation:**
1. Liquidator repays $800 debt
2. Liquidator receives $880 collateral (110% of debt)
3. You lose $880 - $800 = **$80** (10% penalty)
4. You keep remaining $110

---

## Best Practices

### 1. **Maintain HF > 2.0** ✅
Always keep a safety buffer above 2.0 for price volatility

### 2. **Monitor Regularly** 👀
Check your health factor daily, especially in volatile markets

### 3. **Set Alerts** 🔔
```typescript
if (healthFactor < 1.5) {
  sendNotification("⚠️ Health Factor below 1.5! Consider adding collateral.");
}
```

### 4. **Act Quickly** ⚡
If HF drops below 1.3:
- Add more collateral immediately
- Or repay some debt
- Don't wait for it to reach 1.0!

### 5. **Understand Your Assets** 📚
- Stablecoins: Less volatile, safer (HF ~1.5 ok)
- Crypto assets: More volatile, need higher HF (>2.5 recommended)

---

## Comparison to Other Protocols

| Protocol | Health Factor Name | Safe Range | Liquidation Point |
|----------|-------------------|------------|-------------------|
| **Aave** | Health Factor | > 2.0 | < 1.0 |
| **Compound** | Borrow Capacity | > 50% | > 100% |
| **Blend** | Health Factor | > 2.0 | < 1.0 |
| **MakerDAO** | Collateralization Ratio | > 200% | < 150% |

Blend follows the **Aave model**, which is widely understood and battle-tested.

---

## Technical Deep Dive

### Collateral Factor vs Liquidation Factor

From Blend reserves:

```typescript
interface PoolReserve {
  collateralFactor: number;  // e.g., 0.75 = 75%
  liquidationFactor: number; // e.g., 0.80 = 80%
}
```

- **Collateral Factor**: Max you can borrow against this asset (75%)
- **Liquidation Factor**: When position becomes liquidatable (80%)

### Buffer Zone

```
┌────────────────────────────────────────────┐
│  100% Collateral Value                     │
├────────────────────────────────────────────┤
│  80% ← Liquidation Threshold (HF = 1.0)    │ ⚠️
├────────────────────────────────────────────┤
│  75% ← Max Borrow (Collateral Factor)      │
├────────────────────────────────────────────┤
│  50% ← Conservative (HF = 2.0)             │ ✅
├────────────────────────────────────────────┤
│  40% ← Very Safe (HF = 2.5)                │
└────────────────────────────────────────────┘
```

The **5% buffer** between collateral factor and liquidation factor gives you time to react before liquidation.

---

## FAQ

### Q: Why is my Health Factor not changing?
**A**: Currently it's set to a default value. Once real calculation is implemented, it will update based on your actual position.

### Q: What's a "safe" Health Factor?
**A**: > 2.0 is considered safe. > 2.5 is very safe. < 1.5 requires attention.

### Q: Can Health Factor be infinite?
**A**: Yes! If you have zero debt, your health factor is technically infinite (perfectly healthy).

### Q: How often should I check it?
**A**: 
- Daily for stable positions
- Hourly in volatile markets
- Real-time if HF < 1.5

### Q: What causes sudden HF drops?
**A**:
- Collateral price crash
- Borrowed asset price surge  
- High interest rates accumulating debt
- Oracle price updates

---

## Implementation Roadmap

### Phase 1: Static Display ✅ (Current)
- [x] Show hardcoded Health Factor (2.0)
- [x] Add tooltip with explanation
- [x] Color-coded status indicators

### Phase 2: Real Calculation (Next)
- [ ] Integrate with Blend SDK `loadUser()`
- [ ] Calculate based on actual positions
- [ ] Update after supply/borrow operations

### Phase 3: Live Updates
- [ ] Poll for price changes every 30s
- [ ] Show trend indicator (↑↓)
- [ ] Warning notifications

### Phase 4: Advanced Features
- [ ] Historical graph
- [ ] Liquidation price calculator
- [ ] Risk simulation tool
- [ ] Automated health factor management

---

## Related Resources

- [Aave Health Factor Docs](https://docs.aave.com/faq/liquidations#what-is-the-health-factor)
- [Blend Protocol Docs](https://docs.blend.capital)
- [Liquidation Mechanics](https://docs.blend.capital/tech-docs/liquidations)

---

**Last Updated**: Oct 29, 2024  
**Version**: 1.0 (Static Implementation)  
**Next Version**: 2.0 (Real Calculation) - Planned

