# CreditRamp Setup Guide

## Quick Start

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Environment Configuration
Copy the example environment file:
```bash
cp .env.local.example .env.local
```

The `.env.local` file is already configured with the test Stripe key:
```env
STRIPE_SECRET_KEY=sk_test_51Nhh3LFLykiyltKOvA6sUea4JZlbpt9S2rrl6GyGEJfBwPGObXtRgyXNdbA2Gk1i21defncyytQGHTRQB3qp6M9A00rKaqFxnA
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51Nhh3LFLykiyltKOvA6sUea4JZlbpt9S2rrl6GyGEJfBwPGObXtRgyXNdbA2Gk1i21defncyytQGHTRQB3qp6M9A00rKaqFxnA
STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
STELLAR_RPC_URL=https://horizon-testnet.stellar.org
```

### 3. Run Development Server
```bash
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Prerequisites

### Required Software
- **Node.js**: v18 or higher
- **pnpm**: v8 or higher (install with `npm install -g pnpm`)
- **Freighter Wallet**: Browser extension from [freighter.app](https://www.freighter.app/)

### Testnet Setup
1. Install Freighter wallet extension
2. Create a new wallet or import existing
3. Switch to **Testnet** network in Freighter settings
4. Get free testnet XLM from [Stellar Laboratory](https://laboratory.stellar.org/#account-creator?network=test)
   - Enter your public key
   - Click "Get test network lumens"
   - Wait for confirmation

## Project Structure

```
CreditRamp/
├── app/
│   ├── api/
│   │   └── stripe/
│   │       ├── onramp/route.ts      # Stripe OnRamp session creation
│   │       ├── payouts/route.ts     # Fetch Stripe payouts
│   │       └── connect/route.ts     # Stripe Connect OAuth
│   ├── layout.tsx                   # Root layout with Stripe script
│   ├── page.tsx                     # Main dashboard page
│   └── globals.css                  # Global styles with CSS variables
├── components/
│   └── ui/                          # shadcn/ui components
│       ├── button.tsx
│       ├── card.tsx
│       ├── slider.tsx
│       ├── progress.tsx
│       ├── dialog.tsx
│       └── tabs.tsx
├── lib/
│   ├── freighter.ts                 # Freighter wallet integration
│   ├── stripe.ts                    # Stripe API client functions
│   ├── blend.ts                     # Blend Capital SDK integration
│   └── utils.ts                     # Utility functions (cn)
├── public/                          # Static assets
├── .env.local                       # Environment variables (gitignored)
├── .env.local.example               # Example env file
├── package.json                     # Dependencies
├── tsconfig.json                    # TypeScript config
├── tailwind.config.ts               # Tailwind CSS config
├── next.config.js                   # Next.js config
├── postcss.config.js                # PostCSS config
├── components.json                  # shadcn/ui config
├── README.md                        # Project overview
├── SETUP.md                         # This file
└── DEMO_SCRIPT.md                   # Demo walkthrough
```

## Key Dependencies

### Frontend
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type safety
- **Tailwind CSS**: Utility-first styling
- **shadcn/ui**: Accessible component library
- **Framer Motion**: Animations
- **Lucide React**: Icon library

### Blockchain
- **stellar-sdk**: Stellar blockchain SDK
- **@blend-capital/blend-sdk-js**: Blend Capital protocol SDK

### Payments
- **stripe**: Stripe API client for Node.js

## Development Workflow

### Running the App
```bash
pnpm run dev
```
Starts development server on `http://localhost:3000`

### Building for Production
```bash
pnpm run build
pnpm run start
```

### Linting
```bash
pnpm run lint
```

## Configuration Details

### Stellar Network
- **Network**: Testnet
- **Passphrase**: `Test SDF Network ; September 2015`
- **Horizon URL**: `https://horizon-testnet.stellar.org`
- **USDC Asset**: `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`
- **Pool ID**: `CCS5ACKIDOIVW2QMWBF7H3ZM4ZIH2Q2NP7I3P3GH7YXXGN7I3WND3D6G`

### Stripe Configuration
- **Test Mode**: All transactions use test keys
- **OnRamp**: Crypto OnRamp for fiat-to-crypto conversion
- **Connect**: OAuth for merchant account linking (simulated in demo)

## Troubleshooting

### Common Issues

#### 1. "Freighter wallet not installed"
**Solution**: Install Freighter extension from [freighter.app](https://www.freighter.app/)

#### 2. "Failed to connect wallet"
**Solution**: 
- Ensure Freighter is unlocked
- Switch to Testnet network in Freighter settings
- Refresh the page

#### 3. "Transaction failed"
**Solution**:
- Check you have testnet XLM for transaction fees
- Verify you're on Testnet network
- Check browser console for detailed error

#### 4. "OnRamp modal is blank"
**Solution**:
- Verify `STRIPE_SECRET_KEY` in `.env.local`
- Check browser console for CORS errors
- Ensure Stripe script loaded (check Network tab)

#### 5. "Module not found" errors
**Solution**:
```bash
rm -rf node_modules .next
pnpm install
pnpm run dev
```

#### 6. Port 3000 already in use
**Solution**:
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
# Or use different port
PORT=3001 pnpm run dev
```

### Debug Mode
Enable verbose logging:
```bash
# In .env.local
DEBUG=true
```

Check browser console for detailed logs of:
- Wallet connections
- API calls
- Transaction submissions
- Error stack traces

## Testing

### Manual Testing Checklist
- [ ] Connect Freighter wallet
- [ ] Connect Stripe account
- [ ] View credit limit calculation
- [ ] Adjust deposit slider
- [ ] Open OnRamp modal
- [ ] Switch between Lend/Borrow tabs
- [ ] Adjust lend amount slider
- [ ] Adjust borrow amount slider
- [ ] Submit lend transaction (if testnet XLM available)
- [ ] Submit borrow transaction (if testnet XLM available)

### Test Accounts
Use Stripe test cards for OnRamp:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Requires Auth**: `4000 0025 0000 3155`

## Deployment

### Vercel (Recommended)
1. Push code to GitHub
2. Import project in Vercel dashboard
3. Add environment variables:
   - `STRIPE_SECRET_KEY`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
4. Deploy

### Manual Deployment
```bash
pnpm run build
# Upload .next/, public/, package.json to server
# Run: pnpm run start
```

## Security Notes

### For Demo/Hackathon
- Using testnet (no real funds)
- Test Stripe keys (no real payments)
- Mock data for revenue calculations
- Simplified credit scoring

### For Production
- [ ] Use mainnet Stellar network
- [ ] Implement proper Stripe Connect OAuth
- [ ] Add user authentication (NextAuth.js)
- [ ] Secure API routes with middleware
- [ ] Implement rate limiting
- [ ] Add comprehensive error handling
- [ ] Set up monitoring (Sentry, LogRocket)
- [ ] Conduct security audit
- [ ] Add KYC/AML compliance
- [ ] Implement proper credit scoring model

## Support

### Resources
- **Stellar Docs**: [developers.stellar.org](https://developers.stellar.org/)
- **Blend Docs**: [docs.blend.capital](https://docs.blend.capital/)
- **Stripe Docs**: [docs.stripe.com](https://docs.stripe.com/)
- **Next.js Docs**: [nextjs.org/docs](https://nextjs.org/docs)
- **shadcn/ui Docs**: [ui.shadcn.com](https://ui.shadcn.com/)

### Getting Help
- Check `DEMO_SCRIPT.md` for usage walkthrough
- Review browser console for errors
- Check Stellar Testnet status: [status.stellar.org](https://status.stellar.org/)
- Verify Stripe API status: [status.stripe.com](https://status.stripe.com/)

## Next Steps

After setup, refer to:
1. **DEMO_SCRIPT.md**: Complete demo walkthrough
2. **README.md**: Project overview and features
3. **app/page.tsx**: Main application code
4. **lib/**: Integration utilities

Happy hacking! 🚀
