# CreditRamp - Stripe-backed liquidity for SMB yield

[![Stellar Blockchain](https://img.shields.io/badge/Built%20on-Stellar-7A00FF?style=flat&logo=stellar&logoColor=white)](https://stellar.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js-000000?style=flat&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Stripe Integration](https://img.shields.io/badge/Integrated-Stripe-635BFF?style=flat&logo=stripe&logoColor=white)](https://stripe.com/)
[![Blend Capital](https://img.shields.io/badge/DeFi-Blend%20Capital-FF69B4?style=flat)](https://blend.capital/)
[![Testnet Deployed](https://img.shields.io/badge/Status-Testnet%20Deployed-green.svg)](https://horizon-testnet.stellar.org/)

## Overview

CreditRamp bridges traditional fintech with DeFi on the Stellar blockchain, allowing small and medium-sized businesses (SMBs) to convert Stripe cashflows into stablecoins and access instant credit or high-yield lending via Blend Capital. By analyzing Stripe revenue data for simple underwriting, it shifts SMBs from low-yield bank accounts to efficient DeFi liquidity—fast, low-cost, and global.

Built for the Stellar Hackathon, this MVP demonstrates cash-to-DeFi use cases, improving Blend protocols with data-driven credit for broader adoption.

## Features

- **Stripe Connect Integration:** Link your Stripe account (Test Mode) to fetch revenue history for credit scoring.
- **Fiat-to-Stablecoin OnRamp:** Use Stripe Crypto OnRamp to deposit fiat and convert to USDC on Stellar.
- **Instant Credit Underwriting:** Basic scoring based on average monthly revenue to determine borrow limits.
- **Blend Pool Lending/Borrowing:** Supply collateral, earn APRs (5-15%+), or borrow against positions with health factor monitoring.
- **User-Friendly Dashboard:** One-screen flow with sliders, real-time visuals, and non-custodial Stellar transactions via Freighter wallet.
- **Testnet Demo:** Simulate SMB data and transactions on Stellar Testnet for hackathon pitches.

## Tech Stack

- **Frontend:** Next.js with Tailwind CSS for responsive UI.
- **Backend:** Node.js for handling Stripe APIs and webhooks.
- **Blockchain:** Stellar SDK, Blend SDK (JS), Soroban for custom contract logic.
- **Wallet Support:** Freighter or Albedo for signing transactions.
- **Deployment:** Vercel for hosting the web app; Stellar Testnet for blockchain ops.

## Installation

1. Clone the repo:
   ```
   git clone git@github.com:open-biz/CreditRamp.git
   cd CreditRamp
   ```

2. Install dependencies:
   ```
   pnpm install
   ```

3. Set up environment variables in `.env.local`:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STELLAR_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
   STELLAR_RPC_URL="https://horizon-testnet.stellar.org"
   ```

4. Run the development server:
   ```
   pnpm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Connect Wallet & Stripe:** On the home page, connect your Stellar wallet (e.g., Freighter) and authorize Stripe (Test Mode).
2. **Deposit Funds:** Use the Stripe OnRamp to simulate fiat deposits converting to USDC.
3. **Get Credit Score:** App analyzes mock revenue data to display your credit limit.
4. **Lend or Borrow:** Select a Blend pool, supply collateral, and borrow with one-tap transactions.
5. **Demo Wow Factor:** Watch real-time animations as credit "boosts" and yields accrue.

For full demo script: Simulate a $1k Stripe payout → Convert to USDC → Underwrite credit → Borrow $500 test asset → Show health factor and APRs.

## Contributing

Focus on enhancing underwriting logic or adding more Blend integrations.

## License

MIT License. See [LICENSE](LICENSE) for details.

## Acknowledgments

- Inspired by Blend Pool Creator (GitHub: ELDEVODE/blend-pool-creator).
- Built with docs from [Stripe Crypto OnRamp](https://docs.stripe.com/crypto/onramp/api-reference), [Blend Lending Guide](https://docs.blend.capital/users/lending-borrowing/lending), and [Blend Integration Docs](https://docs.blend.capital/tech-docs/integrations/integrate-pool).
- Thanks to Stellar for the ecosystem!
