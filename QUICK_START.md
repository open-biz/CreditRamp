# CreditRamp - Quick Start Guide

## 🚀 Get Running in 2 Minutes

### Step 1: Install Dependencies (30 seconds)
```bash
pnpm install
```

### Step 2: Start Development Server (10 seconds)
```bash
pnpm run dev
```

### Step 3: Open Browser
Navigate to: **http://localhost:3000**

---

## 🎯 Demo Flow (5 minutes)

### 1. Connect Wallet
- Click **"Connect Freighter Wallet"**
- If you don't have Freighter: [Install here](https://www.freighter.app/)
- Approve connection in popup

### 2. Connect Stripe
- Click **"Connect Stripe Account"**
- Instant connection (simulated for demo)

### 3. View Dashboard
You'll see:
- **Credit Limit**: $660 (calculated from mock revenue)
- **Avg Revenue**: $1,650/month
- **APR**: 7%
- **Health Factor**: 1.5

### 4. Deposit Funds
- Adjust slider to desired amount (e.g., $500)
- Click **"Deposit via Stripe OnRamp"**
- Modal opens with Stripe's crypto purchase flow

### 5. Lend (Supply Collateral)
- Switch to **"Lend"** tab
- See auto-suggestion: $330 (50% of credit limit)
- Adjust slider if desired
- Click **"Supply as Collateral"**
- Transaction simulates (1.5s delay)

### 6. Borrow
- Switch to **"Borrow"** tab
- See available: $660 (full credit limit)
- Adjust slider to desired amount
- Click **"Borrow"**
- Transaction simulates (1.5s delay)

---

## 📁 Key Files to Review

### Main Application
- **`app/page.tsx`** - Dashboard UI with Lend/Borrow tabs
- **`lib/blend.ts`** - Blend Capital integration
- **`lib/stripe.ts`** - Stripe API functions
- **`lib/freighter.ts`** - Wallet integration

### Documentation
- **`README.md`** - Project overview
- **`DEMO_SCRIPT.md`** - Detailed 7-minute demo
- **`SETUP.md`** - Full setup instructions
- **`PROJECT_SUMMARY.md`** - Complete project details

---

## 🛠️ Tech Stack Summary

- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **UI**: shadcn/ui components + Framer Motion
- **Blockchain**: Stellar Testnet + @stellar/stellar-sdk
- **Payments**: Stripe (OnRamp + Connect APIs)
- **Wallet**: Freighter

---

## 🎨 Features Implemented

✅ Freighter wallet connection  
✅ Stripe Connect integration  
✅ Credit scoring from revenue data  
✅ Lend tab with auto-suggestions  
✅ Borrow tab with credit limits  
✅ Interactive sliders & progress bars  
✅ Framer Motion animations  
✅ Responsive design  
✅ API routes for Stripe backend  
✅ Mock Blend Capital transactions  

---

## 🔧 Environment Variables

Already configured in `.env.local`:
```env
STRIPE_SECRET_KEY=sk_test_51Nhh3LFLykiyltKOvA6sUea4JZlbpt9S2rrl6GyGEJfBwPGObXtRgyXNdbA2Gk1i21defncyytQGHTRQB3qp6M9A00rKaqFxnA
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
STELLAR_RPC_URL=https://horizon-testnet.stellar.org
```

---

## 🐛 Troubleshooting

### "Freighter wallet not installed"
→ Install from [freighter.app](https://www.freighter.app/)

### "Port 3000 already in use"
```bash
lsof -ti:3000 | xargs kill -9
pnpm run dev
```

### "Module not found" errors
```bash
rm -rf node_modules .next
pnpm install
```

---

## 📚 Additional Resources

- **Full Demo Script**: See `DEMO_SCRIPT.md`
- **Setup Guide**: See `SETUP.md`
- **Project Details**: See `PROJECT_SUMMARY.md`

---

## 🎉 You're Ready!

The app is now running at **http://localhost:3000**

**Happy hacking! 🚀**
