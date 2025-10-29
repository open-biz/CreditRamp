'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useFreighter } from '@/hooks/useFreighter';
import { loadPool, supplyCollateral, borrowAsset, loadMultiplePools, BlendPool } from '@/lib/blend';
import { createOnRampSession, fetchPayouts } from '@/lib/stripe';
import { Asset, Networks, TransactionBuilder, Operation, Horizon } from '@stellar/stellar-sdk';
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
  const { account, isConnected, connect: connectWallet, signTransaction } = useFreighter();
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
  const [selectedAsset, setSelectedAsset] = useState<{ poolId: string; assetSymbol: string } | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<number>(0);
  const [usingMockData, setUsingMockData] = useState(false);
  const [showTrustlineModal, setShowTrustlineModal] = useState(false);
  const [trustlineError, setTrustlineError] = useState<string | null>(null);
  const [addingTrustline, setAddingTrustline] = useState(false);

  // Load Stripe account info on mount
  useEffect(() => {
    fetchRevenue().then(() => {
      // Auto-connect Stripe if account info loaded successfully
      setStripeConnected(true);
    }).catch(err => {
      console.log('Initial Stripe load failed:', err);
    });
  }, []);

  useEffect(() => {
    if (stripeConnected) {
      fetchRevenue();
    }
  }, [stripeConnected]);

  useEffect(() => {
    if (walletAddress) {
      fetchPoolData();
      checkWalletBalance();
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
      
      // Check if using mock data
      setUsingMockData(data.source === 'mock_no_api_key' || data.source === 'test_data' || data.source === 'fallback');
      
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
        
        // Health factor calculation could be based on credit utilization
        // For now, set a conservative default
        setHealthFactor(2.0);
      }
    } catch (error) {
      console.error('Revenue fetch error:', error);
    }
  };

  const checkWalletBalance = async () => {
    if (!walletAddress) return;
    try {
      const response = await fetch(
        `https://horizon-testnet.stellar.org/accounts/${walletAddress}`
      );
      const data = await response.json();
      
      console.log('💰 Wallet Info:', {
        address: walletAddress,
        balances: data.balances
      });
      
      // Find USDC balance
      const usdcAsset = data.balances.find(
        (b: any) => b.asset_code === 'USDC' && 
        b.asset_issuer === 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5'
      );
      
      if (usdcAsset) {
        setUsdcBalance(parseFloat(usdcAsset.balance));
        console.log('✅ USDC Balance:', usdcAsset.balance);
      } else {
        console.warn('⚠️ No USDC trustline found for this wallet');
        setUsdcBalance(0);
      }
    } catch (error) {
      console.error('Error checking wallet balance:', error);
    }
  };

  const addUsdcTrustline = async () => {
    if (!walletAddress) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      setAddingTrustline(true);
      console.log('🔨 Creating USDC trustline...');

      // Load account from Horizon
      const horizonServer = new Horizon.Server(NETWORK.horizonUrl);
      const account = await horizonServer.loadAccount(walletAddress);

      // Build changeTrust transaction
      const transaction = new TransactionBuilder(account, {
        fee: '100000', // 0.001 XLM
        networkPassphrase: NETWORK.passphrase,
      })
        .addOperation(
          Operation.changeTrust({
            asset: USDC_ASSET,
            limit: '922337203685.4775807', // Max limit
          })
        )
        .setTimeout(300) // 5 minutes
        .build();

      console.log('✍️ Requesting signature from wallet...');
      
      // Sign with wallet (via Stellar Wallets Kit)
      const signedXDR = await signTransaction(transaction.toXDR());

      // Submit to network
      console.log('📤 Submitting trustline transaction...');
      const signedTx = TransactionBuilder.fromXDR(signedXDR, NETWORK.passphrase);
      const result = await horizonServer.submitTransaction(signedTx as any);

      console.log('✅ Trustline created successfully!', result);
      alert('✅ USDC trustline added successfully! You can now receive USDC.');

      // Close modal and recheck balance
      setShowTrustlineModal(false);
      await checkWalletBalance();
    } catch (error: any) {
      console.error('❌ Trustline creation error:', error);
      
      if (error.message?.includes('User declined')) {
        alert('❌ Transaction cancelled by user');
      } else {
        alert('❌ Failed to add trustline: ' + (error.message || error.toString()));
      }
    } finally {
      setAddingTrustline(false);
    }
  };

  const fetchPoolData = async () => {
    try {
      const pools = await loadMultiplePools(NETWORK);
      setBlendPools(pools);
      
      // Set APR from first pool's USDC reserve (real data from blockchain)
      if (pools.length > 0) {
        const reserve = pools[0].reserves.get('USDC');
        if (reserve) {
          setApr(reserve.supplyApr / 100); // Convert basis points to percentage
        }
      }
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
    // Pre-flight checks
    if (!walletAddress) {
      alert('Please connect your wallet first');
      return;
    }
    
    if (usdcBalance === 0) {
      setTrustlineError('no_balance');
      setShowTrustlineModal(true);
      return;
    }
    
    if (lendAmount > usdcBalance) {
      alert(`Insufficient balance. You have ${usdcBalance.toFixed(2)} USDC`);
      return;
    }
    
    if (lendAmount > creditLimit * 0.5) {
      alert('Exceeds auto-lend limit (50% of credit limit)');
      return;
    }
    
    try {
      setLoading(true);
      console.log('🚀 Starting lend with wallet:', walletAddress);
      console.log('💵 Amount to lend:', lendAmount, 'USDC');
      
      await supplyCollateral(POOL_ID, USDC_ASSET, BigInt(Math.floor(lendAmount * 1e7)), walletAddress!, NETWORK);
      
      alert('Lend successful! Your collateral has been supplied to the pool.');
      // Refresh balance
      await checkWalletBalance();
    } catch (error: any) {
      console.error('Lend error:', error);
      
      const errorMsg = error.message || error.toString();
      if (errorMsg.includes('trustline')) {
        setTrustlineError('missing_trustline');
        setShowTrustlineModal(true);
      } else {
        alert('Transaction failed: ' + errorMsg);
      }
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

        {/* Mock Data Warning Banner */}
        {usingMockData && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-yellow-500/20 border-2 border-yellow-500/50 rounded-xl p-4 backdrop-blur-sm"
          >
            <div className="flex items-start gap-3">
              <div className="text-yellow-500 text-xl">⚠️</div>
              <div className="flex-1">
                <h3 className="text-yellow-300 font-semibold mb-1">Using Mock Data</h3>
                <p className="text-yellow-100/80 text-sm">
                  Stripe API keys are not configured in production. Revenue and balance data is simulated.
                  <br />
                  <a 
                    href="https://github.com/open-biz/CreditRamp/blob/main/VERCEL_SETUP.md" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-yellow-200 mt-1 inline-block"
                  >
                    → Setup Guide: Configure Vercel Environment Variables
                  </a>
                </p>
              </div>
            </div>
          </motion.div>
        )}

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
                    <div className="mt-2 pt-2 border-t border-white/10">
                      <p className="text-xs text-white/50">USDC Balance</p>
                      <p className={`text-lg font-semibold ${usdcBalance > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {usdcBalance.toFixed(2)} USDC
                      </p>
                      {usdcBalance === 0 && (
                        <p className="text-xs text-red-400/60 mt-1">⚠️ No trustline</p>
                      )}
                    </div>
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
                    <p className="text-xs text-white/60 mb-1">
                      Supply APR {selectedAsset && `(${selectedAsset.assetSymbol})`}
                    </p>
                    <p className="text-2xl font-bold text-green-400">{apr.toFixed(2)}%</p>
                    {!selectedAsset && (
                      <p className="text-xs text-white/40 mt-1">Select an asset below</p>
                    )}
                    {selectedAsset && (
                      <p className="text-xs text-green-400/60 mt-1">Live from blockchain ✓</p>
                    )}
                  </div>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="bg-white/5 rounded-2xl p-5 border border-white/10 cursor-help">
                          <p className="text-xs text-white/60 mb-1 flex items-center gap-1">
                            Health Factor
                            <span className="text-white/40 text-[10px]">ⓘ</span>
                          </p>
                          <p className="text-2xl font-bold text-white">{healthFactor.toFixed(2)}</p>
                          <p className="text-xs mt-1 font-medium">
                            {healthFactor >= 2.0 && <span className="text-green-400">Excellent ✓</span>}
                            {healthFactor >= 1.5 && healthFactor < 2.0 && <span className="text-yellow-400">Good</span>}
                            {healthFactor >= 1.1 && healthFactor < 1.5 && <span className="text-orange-400">Fair</span>}
                            {healthFactor > 0 && healthFactor < 1.1 && <span className="text-red-400">At Risk!</span>}
                          </p>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs bg-gray-900 border-gray-700 p-4">
                        <div className="space-y-2">
                          <p className="font-semibold text-white">Health Factor Explained</p>
                          <p className="text-sm text-gray-300">
                            Measures the safety of your lending position.
                          </p>
                          <div className="text-xs text-gray-400 space-y-1 pt-2 border-t border-gray-700">
                            <p className="font-medium text-gray-300">Formula:</p>
                            <p className="font-mono bg-black/30 p-2 rounded">
                              (Collateral Value × Liquidation Threshold) ÷ Debt Value
                            </p>
                          </div>
                          <div className="text-xs space-y-1 pt-2">
                            <p className="text-green-400">• {'>'} 2.0: Excellent - Very safe</p>
                            <p className="text-yellow-400">• 1.5-2.0: Good - Safe position</p>
                            <p className="text-orange-400">• 1.1-1.5: Fair - Monitor closely</p>
                            <p className="text-red-400">• {'<'} 1.1: At Risk - May be liquidated</p>
                          </div>
                          <p className="text-xs text-gray-500 pt-2 italic">
                            Current value is based on your credit utilization ratio.
                          </p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
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
                        selectedAsset={selectedAsset}
                        onSelectAsset={(poolId, assetSymbol) => {
                          console.log('Selected asset:', poolId, assetSymbol);
                          setSelectedAsset({ poolId, assetSymbol });
                          
                          // Update APR based on selected asset
                          const pool = blendPools.find(p => p.id === poolId);
                          const reserve = pool?.reserves.get(assetSymbol);
                          if (reserve) {
                            setApr(reserve.supplyApr / 100);
                          }
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

        {/* Trustline Setup Modal */}
        <Dialog open={showTrustlineModal} onOpenChange={setShowTrustlineModal}>
          <DialogContent className="max-w-2xl bg-gradient-to-br from-purple-900/90 to-blue-900/90 border-purple-500/30 backdrop-blur-xl text-white">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">⚠️</span>
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-2">
                    {trustlineError === 'no_balance' ? 'USDC Setup Required' : 'Trustline Required'}
                  </h2>
                  <p className="text-white/80">
                    {trustlineError === 'no_balance' 
                      ? 'Your wallet needs USDC to lend. Follow these steps to get started.'
                      : 'Your wallet needs a USDC trustline to interact with USDC on Stellar.'}
                  </p>
                </div>
              </div>

              {/* Steps */}
              <div className="space-y-4">
                <div className="bg-white/10 rounded-xl p-4 border border-white/20">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 font-bold">
                      1
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-2">Add USDC Trustline</h3>
                      <p className="text-sm text-white/70 mb-3">
                        A trustline tells your Stellar wallet to accept USDC tokens. Think of it like authorizing a new type of asset in your wallet.
                      </p>
                      <div className="bg-black/30 rounded-lg p-3 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-white/60">Asset Code:</span>
                          <code className="bg-white/10 px-2 py-1 rounded">USDC</code>
                        </div>
                        <div className="flex justify-between items-start text-xs">
                          <span className="text-white/60 flex-shrink-0 mr-2">Issuer:</span>
                          <code className="bg-white/10 px-2 py-1 rounded text-xs break-all">
                            GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5
                          </code>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button
                          onClick={addUsdcTrustline}
                          disabled={addingTrustline}
                          className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                        >
                          {addingTrustline ? (
                            <>
                              <span className="animate-spin mr-2">⏳</span>
                              Adding...
                            </>
                          ) : (
                            <>
                              <span className="mr-2">⚡</span>
                              Add Trustline Automatically
                            </>
                          )}
                        </Button>
                        <a
                          href="https://laboratory.stellar.org/#?network=test"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 rounded-lg text-sm font-medium transition-colors"
                        >
                          <span>Manual</span>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 rounded-xl p-4 border border-white/20">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 font-bold">
                      2
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-2">Get Test USDC</h3>
                      <p className="text-sm text-white/70 mb-3">
                        You need some USDC tokens to start lending. Use one of these testnet faucets:
                      </p>
                      <div className="space-y-2">
                        <a
                          href="https://quest.stellar.org/learn"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span>🎮 Stellar Quest (Recommended)</span>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </div>
                          <p className="text-xs text-white/60 mt-1">Complete quests to earn test USDC</p>
                        </a>
                        <a
                          href={`https://friendbot.stellar.org/?addr=${walletAddress}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span>🤖 Friendbot (XLM only)</span>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </div>
                          <p className="text-xs text-white/60 mt-1">Get test XLM for transaction fees</p>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 rounded-xl p-4 border border-white/20">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0 font-bold">
                      3
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-2">Try Again</h3>
                      <p className="text-sm text-white/70">
                        Once you've added the trustline and received USDC, come back and try lending again. Your balance will be detected automatically.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Wallet Info */}
              {walletAddress && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                  <p className="text-xs text-white/60 mb-1">Your Wallet Address:</p>
                  <code className="text-sm font-mono bg-black/30 px-3 py-2 rounded block break-all">
                    {walletAddress}
                  </code>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowTrustlineModal(false)}
                  variant="outline"
                  className="flex-1 border-white/20 hover:bg-white/10"
                >
                  Close
                </Button>
                <Button
                  onClick={async () => {
                    setShowTrustlineModal(false);
                    // Recheck balance after user presumably set up trustline
                    await checkWalletBalance();
                  }}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                >
                  I've Set Up My Wallet
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  );
}
