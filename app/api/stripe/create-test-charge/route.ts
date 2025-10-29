import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount = 15000 } = body; // Default $150.00

    // Create a test charge using Stripe test card
    const charge = await stripe.charges.create({
      amount: amount, // Amount in cents
      currency: 'usd',
      source: 'tok_visa', // Test token for Visa card
      description: 'Test charge for CreditRamp demo',
    });

    return NextResponse.json({
      success: true,
      charge: {
        id: charge.id,
        amount: charge.amount,
        currency: charge.currency,
        status: charge.status,
        created: charge.created,
      },
    });
  } catch (error: any) {
    console.error('Test charge creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create test charge' },
      { status: 500 }
    );
  }
}
