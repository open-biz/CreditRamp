'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFreighter } from '@/hooks/useFreighter';
import { loadPool, supplyCollateral, borrowAsset, loadMultiplePools, BlendPool } from '@/lib/blend';
import { createOnRampSession, fetchPayouts } from '@/lib/stripe';
import { Asset, Networks } from '@stellar/stellar-sdk';
import { Wallet, TrendingUp, DollarSign, Activity } from 'lucide-react';
import { CryptoElements, OnrampElement } from '@/components/StripeCryptoElements';
import { loadStripeOnramp } from '@stripe/crypto';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { PoolCards } from '@/components/PoolCards';

// Stellar Classic USDC issuer (for Asset class)
const USDC_ASSET = new Asset('USDC', 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5');
// Soroban contract addresses
const USDC_CONTRACT = 'CAQCFVLOBK5GIULPNZRGATJJMIZL5BSP7X5YJVMGCPTUEPFM4AVSRCJU';
const DEFAULT_DEPOSIT_AMOUNT = 100;
const POOL_ID = 'CDDG7DLOWSHRYQ2HWGZEZ4UTR7LPTKFFHN3QUCSZEXOWOPARMONX6T65'; // Blend Testnet V2 Pool
const NETWORK = {
  passphrase: Networks.TESTNET,
  horizonUrl: 'https://horizon-testnet.stellar.org',
  rpcUrl: 'https://soroban-testnet.stellar.org',
};

// Initialize Stripe Onramp
const stripeOnrampPromise = loadStripeOnramp(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
);

export default function Home() {
  const { account, isConnected, connect: connectWallet } = useFreighter();
  const walletAddress = account?.address || null;
  const [stripeConnected, setStripeConnected] = useState(false);
  const [creditLimit, setCreditLimit] = useState(0);
  const [avgRevenue, setAvgRevenue] = useState(0);
  const [lendAmount, setLendAmount] = useState(0);
  const [borrowAmount, setBorrowAmount] = useState(0);
  const [apr, setApr] = useState(0);
  const [healthFactor, setHealthFactor] = useState(0);
  const [onRampSession, setOnRampSession] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [businessInfo, setBusinessInfo] = useState<any>(null);
  const [stripeBalance, setStripeBalance] = useState<any>(null);
  const [blendPools, setBlendPools] = useState<BlendPool[]>([]);

  useEffect(() => {
    if (stripeConnected) {
      fetchRevenue();
    }
  }, [stripeConnected]);

  useEffect(() => {
    if (walletAddress) {
      fetchPoolData();
    }
  }, [walletAddress]);

  const handleConnectWallet = async () => {
    setLoading(true);
    await connectWallet();
    setLoading(false);
  };

  const connectStripe = () => {
    // Simulate Stripe Connect auth (in real app, use OAuth flow)
    setStripeConnected(true);
  };

  const createTestCharge = async (amount: number) => {
    try {
      setLoading(true);
      const response = await fetch('/api/stripe/create-test-charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amount * 100 }), // Convert to cents
      });
      
      if (response.ok) {
        alert(`Test charge of $${amount} created successfully! Refresh to see updated revenue.`);
        // Refresh revenue data
        await fetchRevenue();
      } else {
        throw new Error('Failed to create test charge');
      }
    } catch (error) {
      console.error('Test charge error:', error);
      alert('Failed to create test charge');
    } finally {
      setLoading(false);
    }
  };

  const fetchRevenue = async () => {
    try {
      const response = await fetch('/api/stripe/payouts');
      const data = await response.json();
      
      // Store business info and balance
      if (data.accountInfo) {
        setBusinessInfo(data.accountInfo);
      }
      if (data.balance) {
        setStripeBalance(data.balance);
      }
      
      if (data.payouts && data.payouts.length > 0) {
        const totalRevenue = data.payouts.reduce((sum: number, payout: any) => {
          return sum + (payout.amount / 100); // Convert from cents
        }, 0);
        
        const avgRev = totalRevenue / data.payouts.length;
        setAvgRevenue(avgRev);
        
        // Calculate credit limit: (average revenue * 0.8) / 2
        const limit = (avgRev * 0.8) / 2;
        setCreditLimit(limit);
        
        // Set mock APR and health factor
        setApr(7.5);
        setHealthFactor(1.85);
      }
    } catch (error) {
      console.error('Revenue fetch error:', error);
    }
  };

  const fetchPoolData = async () => {
    try {
      const pools = await loadMultiplePools(NETWORK);
      setBlendPools(pools);
      
      // Set APR from first pool's USDC reserve for backward compatibility
      if (pools.length > 0) {
        const reserve = pools[0].reserves.get('USDC');
        setApr(reserve ? reserve.supplyApr / 100 : 7);
      }
      setHealthFactor(1.5); // Mock health factor
    } catch (error) {
      console.error('Error loading pool:', error);
    }
  };

  const startDeposit = async () => {
    if (!walletAddress) return;
    try {
      setLoading(true);
      const session = await createOnRampSession(
        walletAddress,
        'stellar',
        'usdc',
        DEFAULT_DEPOSIT_AMOUNT
      );
      setOnRampSession(session);
    } catch (error: any) {
      console.error('OnRamp error:', error);
      const errorMessage = error.message || 'Unknown error';
      
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        alert(
          '⚠️ Stripe OnRamp Not Approved\n\n' +
          'The Stripe OnRamp feature requires approval even for test mode.\n\n' +
          'To enable deposits:\n' +
          '1. Visit: https://dashboard.stripe.com/crypto-onramp/application\n' +
          '2. Submit your application\n' +
          '3. Wait 1-2 business days for approval\n\n' +
          'For now, you can test the Blend lending features without deposits.'
        );
      } else {
        alert('Failed to create deposit session: ' + errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTestStripeOnRamp = () => {
    if (typeof window !== 'undefined') {
      window.open('/test-onramp', '_blank', 'noopener,noreferrer');
    }
  };

  const handleLend = async () => {
    if (lendAmount > creditLimit * 0.5) {
      alert('Exceeds auto-lend limit (50% of credit limit)');
      return;
    }
    try {
      setLoading(true);
      await supplyCollateral(POOL_ID, USDC_ASSET, BigInt(Math.floor(lendAmount * 1e7)), walletAddress!, NETWORK);
      alert('Lend successful! Your collateral has been supplied to the pool.');
    } catch (error) {
      console.error('Lend error:', error);
      alert('Lending popup displayed! (Demo mode - contract integration in progress)');
    } finally {
      setLoading(false);
    }
  };

  const handleBorrow = async () => {
    if (borrowAmount > creditLimit) {
      alert('Exceeds credit limit');
      return;
    }
    try {
      setLoading(true);
      await borrowAsset(POOL_ID, USDC_ASSET, BigInt(Math.floor(borrowAmount * 1e7)), walletAddress!, NETWORK);
      alert('Borrow successful! Funds have been transferred to your wallet.');
    } catch (error) {
      console.error('Borrow error:', error);
      alert('Borrow transaction failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8 relative">
      {/* Animated dot background */}
      <AnimatedBackground />
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-transparent pointer-events-none" style={{ zIndex: 1 }} />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.5 }}
        className="max-w-6xl mx-auto space-y-8 relative" style={{ zIndex: 10 }}
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <motion.h1 
            className="text-5xl font-serif font-bold text-white"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            CreditRamp
          </motion.h1>
          <p className="text-white/60">Stripe-backed DeFi liquidity for SMBs</p>
        </div>

        <Card className="bg-white/10 border-white/20 backdrop-blur-xl shadow-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Activity className="w-6 h-6 text-white" />
              Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Connection Buttons */}
            {!walletAddress && (
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
              >
                <Button 
                  onClick={handleConnectWallet} 
                  disabled={loading}
                  className="w-full bg-white text-black hover:bg-white/90 font-semibold shadow-lg"
                  size="lg"
                >
                  <Wallet className="w-5 h-5 mr-2" />
                  Connect Wallet
                </Button>
              </motion.div>
            )}

            {walletAddress && !stripeConnected && (
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
              >
                <Button 
                  onClick={connectStripe}
                  className="w-full bg-white text-black hover:bg-white/90 font-semibold shadow-lg"
                  size="lg"
                >
                  <DollarSign className="w-5 h-5 mr-2" />
                  Connect Stripe Account
                </Button>
              </motion.div>
            )}

            {/* Dashboard Content */}
            {stripeConnected && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="space-y-6"
              >
                {/* Business & Wallet Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
                    <p className="text-sm text-white/60 mb-1">Stripe Business</p>
                    <p className="text-white font-semibold">
                      {businessInfo?.businessName || 'Loading...'}
                    </p>
                    {businessInfo?.email && (
                      <p className="text-xs text-white/50 mt-1">{businessInfo.email}</p>
                    )}
                  </div>
                  <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
                    <p className="text-sm text-white/60 mb-1">Connected Wallet</p>
                    <p className="font-mono text-white">
                      {walletAddress?.slice(0, 8)}...{walletAddress?.slice(-6)}
                    </p>
                  </div>
                </div>

                {/* Stripe Balance */}
                {stripeBalance && (
                  <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
                    <p className="text-sm text-white/60 mb-2">Stripe Balance</p>
                    <div className="flex gap-6">
                      <div>
                        <p className="text-xs text-white/50">Available</p>
                        <p className="text-2xl font-bold text-white">
                          ${(stripeBalance.available / 100).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-white/50">Pending</p>
                        <p className="text-2xl font-bold text-white/60">
                          ${(stripeBalance.pending / 100).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Test Charge Buttons */}
                <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
                  <p className="text-sm text-white/60 mb-2">Simulate Customer Purchases (Test Mode)</p>
                  <div className="flex gap-2 flex-wrap">
                    <Button 
                      onClick={() => createTestCharge(150)} 
                      disabled={loading}
                      size="sm"
                      className="bg-white/10 hover:bg-white/15 text-white border border-white/20"
                    >
                      +$150
                    </Button>
                    <Button 
                      onClick={() => createTestCharge(300)} 
                      disabled={loading}
                      size="sm"
                      className="bg-white/10 hover:bg-white/15 text-white border border-white/20"
                    >
                      +$300
                    </Button>
                    <Button 
                      onClick={() => createTestCharge(500)} 
                      disabled={loading}
                      size="sm"
                      className="bg-white/10 hover:bg-white/15 text-white border border-white/20"
                    >
                      +$500
                    </Button>
                    <Button 
                      onClick={() => fetchRevenue()} 
                      disabled={loading}
                      size="sm"
                      className="bg-white/10 hover:bg-white/20 text-white border border-white/30 font-semibold"
                    >
                      Refresh Data
                    </Button>
                  </div>
                  <p className="text-xs text-white/50 mt-2">
                    Creates test charges in Stripe to simulate revenue growth
                  </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
                    <p className="text-xs text-white/60 mb-1">Credit Limit</p>
                    <motion.p 
                      className="text-2xl font-bold text-white"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring' }}
                    >
                      ${creditLimit.toFixed(2)}
                    </motion.p>
                  </div>
                  
                  <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
                    <p className="text-xs text-white/60 mb-1">Avg Revenue</p>
                    <p className="text-2xl font-bold text-white">${avgRevenue.toFixed(2)}</p>
                  </div>
                  
                  <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
                    <p className="text-xs text-white/60 mb-1">APR</p>
                    <p className="text-2xl font-bold text-white">{apr.toFixed(1)}%</p>
                  </div>
                  
                  <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
                    <p className="text-xs text-white/60 mb-1">Health Factor</p>
                    <p className="text-2xl font-bold text-white">{healthFactor.toFixed(2)}</p>
                  </div>
                </div>

                {/* Credit Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Credit Utilization</span>
                    <span className="text-white">{((creditLimit / 1000) * 100).toFixed(0)}%</span>
                  </div>
                  <Progress value={(creditLimit / 1000) * 100} className="h-3" />
                </div>

                {/* OnRamp Actions */}
                <div className="bg-white/5 rounded-2xl p-6 border border-white/10 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-white" />
                    <h3 className="text-lg font-semibold text-white">Stripe OnRamp Actions</h3>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <Button
                      onClick={handleTestStripeOnRamp}
                      variant="outline"
                      className="w-full bg-transparent text-white border-white/40 hover:bg-white/10"
                    >
                      Test Stripe OnRamp
                    </Button>
                    <Button
                      onClick={startDeposit}
                      disabled={loading}
                      className="w-full bg-white text-black hover:bg-white/90 font-semibold"
                    >
                      Deposit ${DEFAULT_DEPOSIT_AMOUNT} via Stripe OnRamp
                    </Button>
                  </div>
                  <p className="text-xs text-white/50">
                    Use the test button to open the standalone Stripe quickstart flow. Deposits default to ${DEFAULT_DEPOSIT_AMOUNT} while we investigate API behaviour.
                  </p>
                </div>

                {/* Lend/Borrow Tabs */}
                <Tabs defaultValue="lend" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-white/5 border border-white/10">
                    <TabsTrigger value="lend" className="data-[state=active]:bg-white data-[state=active]:text-black">
                      Lend
                    </TabsTrigger>
                    <TabsTrigger value="borrow" className="data-[state=active]:bg-white data-[state=active]:text-black">
                      Borrow
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="lend" className="space-y-4 mt-6">
                    {/* Blend Pool Cards */}
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-white mb-3">Available Lending Pools</h3>
                      <PoolCards 
                        pools={blendPools}
                        onSelectAsset={(poolId, assetSymbol) => {
                          console.log('Selected asset:', poolId, assetSymbol);
                          // TODO: Pre-fill lend form with selected asset
                        }}
                      />
                    </div>

                    {/* Lend Form */}
                    <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                      <div className="mb-4">
                        <p className="text-sm text-white/60 mb-1">Auto-Lend Suggestion</p>
                        <p className="text-3xl font-bold text-white">
                          ${(creditLimit * 0.5).toFixed(2)}
                        </p>
                        <p className="text-xs text-white/50 mt-1">
                          50% of your credit limit (conservative auto-lending cap)
                        </p>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-white/60">Lend Amount</span>
                          <span className="text-white font-semibold">${lendAmount.toFixed(2)}</span>
                        </div>
                        <Slider 
                          value={[lendAmount]} 
                          onValueChange={(v) => setLendAmount(v[0])} 
                          max={creditLimit * 0.5} 
                          step={10}
                          className="my-4"
                        />
                        <Button 
                          onClick={handleLend} 
                          disabled={loading || lendAmount === 0}
                          className="w-full bg-white text-black hover:bg-white/90 font-semibold"
                          size="lg"
                        >
                          Supply ${lendAmount.toFixed(2)} as Collateral
                        </Button>
                        <p className="text-xs text-white/40 text-center">
                          Note: A 3% CreditRamp intermediary fee will be deducted
                        </p>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="borrow" className="space-y-4 mt-6">
                    <div className="bg-white/5 rounded-2xl p-6 border border-white/10 text-center space-y-3">
                      <h3 className="text-xl font-semibold text-white">Borrowing is Coming Soon</h3>
                      <p className="text-white/60">
                        We are finalizing borrowing flows based on the latest Blend documentation. Stay tuned for updates.
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
              </motion.div>
            )}
          </CardContent>
        </Card>

        {/* OnRamp Dialog */}
        <Dialog open={!!onRampSession} onOpenChange={() => setOnRampSession(null)}>
          <DialogContent className="max-w-2xl bg-black/40 border-white/10 backdrop-blur-xl">
            {onRampSession && onRampSession.client_secret && (
              <CryptoElements stripeOnramp={stripeOnrampPromise}>
                <OnrampElement 
                  clientSecret={onRampSession.client_secret}
                  appearance={{ theme: 'dark' }}
                  onReady={() => console.log('OnRamp UI loaded')}
                  onSessionUpdate={(session) => {
                    console.log('Session updated:', session);
                    if (session.status === 'fulfillment_complete') {
                      setTimeout(() => setOnRampSession(null), 2000);
                    }
                  }}
                  className="w-full min-h-[600px]"
                />
              </CryptoElements>
            )}
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  );
}
