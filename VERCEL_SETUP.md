# Vercel Production Setup Guide

## 🚨 Issue: Production Shows Mock Data

If your production site at https://credit-ramp.vercel.app/ is showing mock data instead of real Stripe data, it's because **environment variables are not configured in Vercel**.

---

## ✅ Solution: Configure Environment Variables in Vercel

### Step 1: Access Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Select your **CreditRamp** project
3. Click **Settings** tab
4. Navigate to **Environment Variables** section

### Step 2: Add Required Variables

Add the following environment variables:

| Variable Name | Value | Environment |
|--------------|-------|-------------|
| `STRIPE_SECRET_KEY` | `sk_test_51Nhh3L...` (your test key) | Production, Preview, Development |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` (your publishable key) | Production, Preview, Development |

#### Where to Find Your Stripe Keys

1. Go to https://dashboard.stripe.com/test/apikeys
2. Copy your **Secret key** (starts with `sk_test_`)
3. Copy your **Publishable key** (starts with `pk_test_`)

**⚠️ Important**: Use **test mode** keys for development/staging and **live mode** keys only when ready for real transactions.

### Step 3: Redeploy

After adding environment variables:

1. Go to **Deployments** tab
2. Find the latest deployment
3. Click **⋯** (three dots) → **Redeploy**
4. OR just push a new commit to trigger automatic redeployment

---

## 🔍 How to Verify It's Working

### Before Fix (Mock Data)
- Business name: **"CreditRamp (Demo - No API Key)"**
- Source indicator: `mock_no_api_key`
- Balance: Always $0
- Test charges don't appear in UI

### After Fix (Real Data)
- Business name: Your actual Stripe account name
- Source indicator: `stripe_charges` or `balance_transactions`
- Balance: Real balance from Stripe
- Test charges appear immediately after creation

---

## 🧪 Testing the Fix

### 1. Check API Response
Visit: `https://credit-ramp.vercel.app/api/stripe/payouts`

**Before (no keys):**
```json
{
  "source": "mock_no_api_key",
  "accountInfo": {
    "businessName": "CreditRamp (Demo - No API Key)",
    ...
  },
  "warning": "Stripe API key not configured in production environment"
}
```

**After (with keys):**
```json
{
  "source": "stripe_charges",
  "accountInfo": {
    "businessName": "Your Actual Business",
    "email": "your@email.com"
  },
  "payouts": [/* real charge data */]
}
```

### 2. Create Test Charge

1. Visit your production site
2. Click "Create Test Charge"
3. Refresh the page
4. The new charge should appear in the revenue data

### 3. Check Vercel Logs

1. Go to Vercel Dashboard → Your Project → **Deployments**
2. Click on the latest deployment
3. Go to **Functions** tab
4. Click on `/api/stripe/payouts`
5. Check logs for:
   - ✅ No "⚠️ STRIPE_SECRET_KEY is not configured" warnings
   - ✅ Successful Stripe API calls

---

## 🔐 Security Best Practices

### ✅ DO:
- Use **test keys** (`sk_test_...`) for development/staging
- Use **live keys** (`sk_live_...`) only for production with real transactions
- Keep secret keys in environment variables, never in code
- Rotate keys if accidentally exposed

### ❌ DON'T:
- Commit `.env.local` files to git (already in `.gitignore`)
- Share secret keys in Slack, email, or documentation
- Use live keys for testing
- Hardcode API keys in source code

---

## 🐛 Common Issues

### Issue: Still seeing mock data after adding keys

**Cause**: Deployment hasn't rebuilt with new environment variables

**Solution**:
1. Go to Vercel → Deployments
2. Redeploy the latest deployment
3. Wait for build to complete (~30 seconds)
4. Hard refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)

### Issue: "Invalid API Key" errors

**Cause**: Wrong key format or using restricted keys

**Solution**:
1. Verify key starts with `sk_test_` (test) or `sk_live_` (production)
2. Copy the entire key including any trailing characters
3. Check for extra spaces before/after the key
4. Generate a new key in Stripe Dashboard if needed

### Issue: Charges work locally but not in production

**Cause**: Different API keys in local vs Vercel environment

**Solution**:
1. Ensure Vercel has the **same** Stripe account keys
2. Check if your local `.env.local` uses different account
3. Verify both environments use the same Stripe account

---

## 📊 Monitoring

### Check Environment Variables

Run this in Vercel CLI:
```bash
vercel env ls
```

### View Production Logs

```bash
vercel logs credit-ramp.vercel.app
```

### Test API Endpoints

```bash
# Check if Stripe is configured
curl https://credit-ramp.vercel.app/api/stripe/payouts | jq '.source'

# Should return "stripe_charges" not "mock_no_api_key"
```

---

## 🚀 Next Steps After Setup

Once environment variables are configured:

1. ✅ Verify real Stripe data loads in production
2. ✅ Test creating charges and seeing them reflect in UI
3. ✅ Test crypto onramp functionality
4. ✅ Connect Stellar wallet and test Blend integration
5. ✅ Monitor Vercel logs for any API errors

---

## 📞 Support

If you continue seeing mock data after following these steps:

1. Check Vercel build logs for errors
2. Verify environment variables are set to **Production** environment
3. Ensure you've redeployed after adding variables
4. Check browser console for API errors
5. Review `/api/stripe/payouts` response directly

---

## 🔗 Related Documentation

- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Stripe API Keys](https://stripe.com/docs/keys)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [CreditRamp Production Fixes](./PRODUCTION_FIXES.md)

---

**Last Updated**: Oct 29, 2024
**Status**: Environment variables required for production Stripe integration
