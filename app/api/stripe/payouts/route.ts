import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Validate environment variables
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) {
  console.error('⚠️ STRIPE_SECRET_KEY is not configured in environment variables');
}

const stripe = STRIPE_SECRET_KEY 
  ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-11-20.acacia' })
  : null;

// Helper function to generate mock payout data
function getMockPayouts() {
  return [
    {
      id: 'po_mock_1',
      amount: 150000, // $1,500.00
      currency: 'usd',
      created: Math.floor(Date.now() / 1000) - 86400 * 30,
      arrival_date: Math.floor(Date.now() / 1000) - 86400 * 28,
      status: 'paid',
    },
    {
      id: 'po_mock_2',
      amount: 180000, // $1,800.00
      currency: 'usd',
      created: Math.floor(Date.now() / 1000) - 86400 * 60,
      arrival_date: Math.floor(Date.now() / 1000) - 86400 * 58,
      status: 'paid',
    },
    {
      id: 'po_mock_3',
      amount: 165000, // $1,650.00
      currency: 'usd',
      created: Math.floor(Date.now() / 1000) - 86400 * 90,
      arrival_date: Math.floor(Date.now() / 1000) - 86400 * 88,
      status: 'paid',
    },
  ];
}

export async function GET(request: NextRequest) {
  try {
    // Check if Stripe is configured
    if (!stripe) {
      console.warn('⚠️ Stripe not configured - returning mock data');
      return NextResponse.json({ 
        payouts: getMockPayouts(),
        source: 'mock_no_api_key',
        accountInfo: {
          businessName: 'CreditRamp (Demo - No API Key)',
          email: 'demo@creditramp.com',
          country: 'US',
        },
        balance: { available: 0, pending: 0, currency: 'usd' },
        warning: 'Stripe API key not configured in production environment'
      });
    }
    // Fetch account information (business name, etc.)
    let accountInfo = null;
    try {
      const account = await stripe.accounts.retrieve('acct_1032D82eZvKYlo2C'); // Use your account ID or leave empty for connected account
      accountInfo = {
        businessName: account.business_profile?.name || account.settings?.dashboard?.display_name || 'Test Business',
        email: account.email,
        country: account.country,
      };
    } catch (err) {
      // If that fails, try getting the account info differently
      try {
        // For test mode, we'll use mock data
        accountInfo = {
          businessName: 'CreditRamp (Demo Mode)',
          email: 'test@stellar-demo.usenomad.ai',
          country: 'US',
        };
      } catch (e) {
        console.log('Could not fetch account info:', err);
      }
    }

    // Fetch balance
    let balance = null;
    try {
      const stripeBalance = await stripe.balance.retrieve();
      balance = {
        available: stripeBalance.available[0]?.amount || 0,
        pending: stripeBalance.pending[0]?.amount || 0,
        currency: stripeBalance.available[0]?.currency || 'usd',
      };
    } catch (err) {
      console.log('Could not fetch balance:', err);
    }

    // Fetch REAL payment data from Stripe
    // Using charges instead of payouts since test mode has more charge data
    const charges = await stripe.charges.list({
      limit: 10,
    });

    // If we have real charges, use them
    if (charges.data && charges.data.length > 0) {
      const payouts = charges.data.map(charge => ({
        id: charge.id,
        amount: charge.amount,
        currency: charge.currency,
        created: charge.created,
        arrival_date: charge.created + 86400 * 2, // Simulate 2 days for arrival
        status: charge.status === 'succeeded' ? 'paid' : charge.status,
      }));

      return NextResponse.json({ 
        payouts, 
        source: 'stripe_charges',
        accountInfo,
        balance,
      });
    }

    // If no charges, try to fetch balance transactions
    const balanceTransactions = await stripe.balanceTransactions.list({
      limit: 10,
    });

    if (balanceTransactions.data && balanceTransactions.data.length > 0) {
      const payouts = balanceTransactions.data
        .filter(tx => tx.type === 'charge' || tx.type === 'payment')
        .map(tx => ({
          id: tx.id,
          amount: tx.amount,
          currency: tx.currency,
          created: tx.created,
          arrival_date: tx.available_on,
          status: 'paid',
        }));

      if (payouts.length > 0) {
        return NextResponse.json({ 
          payouts, 
          source: 'balance_transactions',
          accountInfo,
          balance,
        });
      }
    }

    // If still no data, create realistic test data based on test mode
    console.log('No Stripe data found, generating test data');
    const testPayouts = [
      {
        id: 'po_test_1',
        amount: 150000, // $1,500.00
        currency: 'usd',
        created: Math.floor(Date.now() / 1000) - 86400 * 30,
        arrival_date: Math.floor(Date.now() / 1000) - 86400 * 28,
        status: 'paid',
      },
      {
        id: 'po_test_2',
        amount: 180000, // $1,800.00
        currency: 'usd',
        created: Math.floor(Date.now() / 1000) - 86400 * 60,
        arrival_date: Math.floor(Date.now() / 1000) - 86400 * 58,
        status: 'paid',
      },
      {
        id: 'po_test_3',
        amount: 165000, // $1,650.00
        currency: 'usd',
        created: Math.floor(Date.now() / 1000) - 86400 * 90,
        arrival_date: Math.floor(Date.now() / 1000) - 86400 * 88,
        status: 'paid',
      },
    ];

    return NextResponse.json({ 
      payouts: testPayouts, 
      source: 'test_data',
      accountInfo,
      balance,
    });
  } catch (error: any) {
    console.error('Payouts fetch error:', error);
    
    // Return test data as fallback
    const fallbackPayouts = [
      {
        id: 'po_fallback_1',
        amount: 150000,
        currency: 'usd',
        created: Math.floor(Date.now() / 1000) - 86400 * 30,
        arrival_date: Math.floor(Date.now() / 1000) - 86400 * 28,
        status: 'paid',
      },
      {
        id: 'po_fallback_2',
        amount: 180000,
        currency: 'usd',
        created: Math.floor(Date.now() / 1000) - 86400 * 60,
        arrival_date: Math.floor(Date.now() / 1000) - 86400 * 58,
        status: 'paid',
      },
      {
        id: 'po_fallback_3',
        amount: 165000,
        currency: 'usd',
        created: Math.floor(Date.now() / 1000) - 86400 * 90,
        arrival_date: Math.floor(Date.now() / 1000) - 86400 * 88,
        status: 'paid',
      },
    ];

    return NextResponse.json({ 
      payouts: fallbackPayouts, 
      source: 'fallback',
      error: error.message 
    });
  }
}
