'use client';

import { useState } from 'react';
import Script from 'next/script';

// EXACT replica of Stripe docs quickstart
export default function TestOnRamp() {
  const [clientSecret, setClientSecret] = useState('');
  const [walletAddress, setWalletAddress] = useState('GBUCRQX2GXV2CCPNBVB6FMXORFRNXXQMZ5RN2GMH2KZNMH7O4WON5DDN');
  const [mounted, setMounted] = useState(false);

  const createSession = async () => {
    try {
      const response = await fetch('/api/stripe/onramp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address: walletAddress,
          destination_network: 'stellar',
          destination_currency: 'usdc',
          source_amount: 100,
        }),
      });

      const data = await response.json();
      console.log('Session created:', data);
      setClientSecret(data.client_secret);
    } catch (error) {
      console.error('Error:', error);
      alert('Error creating session: ' + error);
    }
  };

  const mountOnRamp = () => {
    if (!clientSecret) {
      alert('Create a session first');
      return;
    }

    // @ts-ignore - StripeOnramp is loaded via script
    const stripeOnramp = window.StripeOnramp(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
    const session = stripeOnramp.createSession({
      clientSecret: clientSecret,
      appearance: {
        theme: 'dark'
      }
    });

    session.mount('#onramp-element');
    setMounted(true);
    console.log('OnRamp mounted');
  };

  return (
    <>
      <Script 
        src="https://js.stripe.com/v3/" 
        onLoad={() => console.log('Stripe.js loaded')}
      />
      <Script 
        src="https://crypto-js.stripe.com/crypto-onramp-outer.js"
        onLoad={() => console.log('Crypto OnRamp script loaded')}
      />
      
      <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', color: 'white', backgroundColor: '#000' }}>
        <h1>Stripe OnRamp Test (Exact Quickstart Replica)</h1>
        
        <div style={{ marginBottom: '20px' }}>
          <label>
            Wallet Address:
            <input 
              type="text" 
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '10px', 
                marginTop: '5px',
                backgroundColor: '#222',
                color: 'white',
                border: '1px solid #444'
              }}
            />
          </label>
        </div>

        <button 
          onClick={createSession}
          style={{
            padding: '10px 20px',
            marginRight: '10px',
            backgroundColor: '#5469d4',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          1. Create Session
        </button>

        <button 
          onClick={mountOnRamp}
          disabled={!clientSecret}
          style={{
            padding: '10px 20px',
            backgroundColor: clientSecret ? '#5469d4' : '#666',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: clientSecret ? 'pointer' : 'not-allowed'
          }}
        >
          2. Mount OnRamp
        </button>

        {clientSecret && (
          <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#222', borderRadius: '4px' }}>
            <strong>Client Secret:</strong> {clientSecret.substring(0, 30)}...
          </div>
        )}

        <div 
          id="onramp-element" 
          style={{ 
            marginTop: '30px',
            minHeight: mounted ? '600px' : '0',
            border: mounted ? '1px solid #444' : 'none'
          }}
        />
      </div>
    </>
  );
}
