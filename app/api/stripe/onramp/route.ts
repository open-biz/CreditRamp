import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wallet_address, destination_network, destination_currency, source_amount } = body;

    // Create a Crypto OnRamp Session using Stripe API
    // Reference: https://docs.stripe.com/crypto/onramp/embedded-quickstart
    const params = new URLSearchParams();
    
    // Set wallet address for Stellar network
    if (wallet_address && destination_network) {
      params.append(`wallet_addresses[${destination_network}]`, wallet_address);
    }
    
    // Set destination network (stellar)
    if (destination_network) {
      params.append('destination_network', destination_network);
      // Lock to stellar network only
      params.append('destination_networks[]', destination_network);
    }
    
    // Set destination currency (usdc or xlm)
    if (destination_currency) {
      params.append('destination_currency', destination_currency);
      // Lock to specific currencies (usdc and xlm only)
      params.append('destination_currencies[]', 'usdc');
      params.append('destination_currencies[]', 'xlm');
    }
    
    // Set source amount and currency (USD only)
    if (source_amount) {
      params.append('source_amount', source_amount.toString());
    }
    params.append('source_currency', 'usd');

    console.log('Creating OnRamp session with params:', params.toString());

    const response = await fetch('https://api.stripe.com/v1/crypto/onramp_sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Stripe API error:', responseData);
      throw new Error(responseData.error?.message || 'Failed to create OnRamp session');
    }

    console.log('OnRamp session created successfully:', responseData.id);

    return NextResponse.json({
      client_secret: responseData.client_secret,
      session_id: responseData.id,
      status: responseData.status,
    });
  } catch (error: any) {
    console.error('OnRamp session creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create OnRamp session' },
      { status: 500 }
    );
  }
}
