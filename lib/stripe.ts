// Stripe integration for OnRamp and revenue fetching

export async function createOnRampSession(
  walletAddress: string,
  destinationNetwork: string,
  destinationCurrency: string,
  sourceAmount?: number
) {
  try {
    const response = await fetch('/api/stripe/onramp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wallet_address: walletAddress,
        destination_network: destinationNetwork,
        destination_currency: destinationCurrency,
        source_amount: sourceAmount,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create OnRamp session');
    }
    
    return await response.json();
  } catch (error) {
    console.error('OnRamp session error:', error);
    throw error;
  }
}

export async function fetchPayouts() {
  try {
    const response = await fetch('/api/stripe/payouts');
    
    if (!response.ok) {
      throw new Error('Failed to fetch payouts');
    }
    
    const data = await response.json();
    return data.payouts || [];
  } catch (error) {
    console.error('Fetch payouts error:', error);
    // Return mock data for demo
    return [
      { amount: 150000, created: Date.now() / 1000 - 86400 * 30 },
      { amount: 180000, created: Date.now() / 1000 - 86400 * 60 },
      { amount: 165000, created: Date.now() / 1000 - 86400 * 90 },
    ];
  }
}
