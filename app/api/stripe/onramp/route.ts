import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wallet_address, destination_network, destination_currency, source_amount } = body;

    // Create a Crypto OnRamp Session using direct Stripe API
    // This bypasses TypeScript type issues with the crypto namespace
    const params = new URLSearchParams();
    
    // Set wallet address using the correct parameter format
    if (wallet_address) {
      params.append(`transaction_details[wallet_address]`, wallet_address);
    }
    
    if (destination_network) {
      params.append('transaction_details[destination_network]', destination_network);
    }
    
    if (destination_currency) {
      params.append('transaction_details[destination_currency]', destination_currency);
    }
    
    if (source_amount) {
      params.append('transaction_details[source_amount]', source_amount.toString());
      params.append('transaction_details[source_currency]', 'usd');
    }

    const response = await fetch('https://api.stripe.com/v1/crypto/onramp_sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Stripe API error:', errorData);
      throw new Error(errorData.error?.message || 'Failed to create OnRamp session');
    }

    const session = await response.json();

    return NextResponse.json({
      client_secret: session.client_secret,
      session_id: session.id,
    });
  } catch (error: any) {
    console.error('OnRamp session creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create OnRamp session' },
      { status: 500 }
    );
  }
}
