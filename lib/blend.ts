import { 
  Asset, 
  Horizon,
  TransactionBuilder, 
  Operation,
  Contract,
  xdr,
  Address,
  nativeToScVal,
  scValToNative,
  SorobanRpc
} from '@stellar/stellar-sdk';
import * as BlendSDK from '@blend-capital/blend-sdk';
import { signTx } from './freighter';
import testnetContracts from './contracts/testnet.contracts.json';

// Type alias for Horizon.Server
type Server = Horizon.Server;

export interface NetworkConfig {
  passphrase: string;
  horizonUrl: string;
  rpcUrl?: string;
}

export interface PoolReserve {
  assetId: string;
  symbol: string;
  supplyApr: number; // in basis points (e.g., 750 = 7.5%)
  borrowApr: number;
  totalSupply: bigint;
  totalBorrow: bigint;
  utilizationRate: number; // percentage
  collateralFactor: number; // percentage
  liquidationFactor: number; // percentage
}

export interface BlendPool {
  id: string;
  name: string;
  reserves: Map<string, PoolReserve>;
  totalValueLocked: bigint;
  backstopModule: string;
  status: 'active' | 'paused' | 'frozen';
}

// CreditRamp Auto-Lend Contract Configuration
export const CREDITRAMP_FEE_BPS = 300; // 3% = 300 basis points
export const CREDITRAMP_AUTO_LEND_CONTRACT = testnetContracts.ids.creditRampAutoLend;
export const CREDITRAMP_TREASURY = testnetContracts.ids.treasuryAddress;
export const BLEND_POOL_ID = testnetContracts.ids.testnetV2Pool;
export const USDC_TOKEN_CONTRACT = testnetContracts.ids.usdcToken;

export async function loadPool(network: NetworkConfig, poolId: string): Promise<BlendPool> {
  try {
    if (!network.rpcUrl) {
      throw new Error('RPC URL required for loading pool data');
    }

    // Create network object for Blend SDK
    const blendNetwork = {
      rpc: network.rpcUrl,
      passphrase: network.passphrase,
    };

    // Load pool data from Blend SDK
    const pool = await BlendSDK.PoolV2.load(blendNetwork, poolId);
    
    // Load oracle to calculate estimates
    const poolOracle = await pool.loadOracle();
    const poolEstimate = BlendSDK.PoolEstimate.build(pool.reserves, poolOracle);

    // Convert reserves to our format
    const reserves = new Map<string, PoolReserve>();
    
    // Iterate over reserves Map (assetId -> Reserve)
    for (const [assetId, reserve] of pool.reserves) {
      // Get asset symbol from contract address
      const assetSymbol = getAssetSymbol(reserve.assetId);
      
      // Get total supply and liabilities using SDK methods
      const totalSupply = reserve.totalSupply();
      const totalLiabilities = reserve.totalLiabilities();
      
      // Calculate utilization rate
      const utilizationRate = totalSupply > BigInt(0)
        ? Number(totalLiabilities * BigInt(10000) / totalSupply) / 100 
        : 0;
      
      reserves.set(assetSymbol, {
        assetId: reserve.assetId,
        symbol: assetSymbol,
        supplyApr: Math.round(reserve.supplyApr * 10000), // SDK returns decimal (0.0732), convert to basis points (732)
        borrowApr: Math.round(reserve.borrowApr * 10000), // SDK returns decimal (0.12), convert to basis points (1200)
        totalSupply: totalSupply,
        totalBorrow: totalLiabilities,
        utilizationRate: Math.round(utilizationRate),
        collateralFactor: Math.round(reserve.getCollateralFactor() * 100), // Convert to percentage
        liquidationFactor: Math.round(reserve.getLiabilityFactor() * 100), // Convert to percentage
      });
    }

    return {
      id: poolId,
      name: pool.metadata.name || 'Blend Pool',
      reserves,
      totalValueLocked: BigInt(Math.floor(poolEstimate.totalSupply * 1e7)), // Convert float to bigint with 7 decimals
      backstopModule: pool.metadata.backstop,
      status: pool.metadata.status === 0 ? 'active' : pool.metadata.status === 1 ? 'paused' : 'frozen',
    };
  } catch (error) {
    console.error('Error loading pool:', error);
    throw error;
  }
}

/**
 * Helper function to get asset symbol from contract address
 */
function getAssetSymbol(assetId: string): string {
  const assetMap: { [key: string]: string } = {
    [testnetContracts.ids.usdcToken]: 'USDC',
    [testnetContracts.ids.xlmToken]: 'XLM',
    [testnetContracts.ids.blendToken]: 'BLND',
    [testnetContracts.ids.wethToken]: 'wETH',
    [testnetContracts.ids.wbtcToken]: 'wBTC',
  };
  return assetMap[assetId] || 'UNKNOWN';
}

export async function loadMultiplePools(network: NetworkConfig): Promise<BlendPool[]> {
  try {
    if (!network.rpcUrl) {
      throw new Error('RPC URL required for loading pools');
    }

    // Create network object for Blend SDK
    const blendNetwork = {
      rpc: network.rpcUrl,
      passphrase: network.passphrase,
    };

    console.log('🔍 Fetching available pools from reward zone...');
    
    // Load backstop configuration to get reward zone pools
    const backstopConfig = await BlendSDK.BackstopConfig.load(
      blendNetwork,
      testnetContracts.ids.backstopV2
    );

    console.log(`✅ Found ${backstopConfig.rewardZone.length} pools in reward zone:`, backstopConfig.rewardZone);

    // Load each pool from the reward zone
    const poolPromises = backstopConfig.rewardZone.map(async (poolId: string) => {
      try {
        return await loadPool(network, poolId);
      } catch (error) {
        console.error(`Failed to load pool ${poolId}:`, error);
        return null;
      }
    });

    const pools = await Promise.all(poolPromises);
    
    // Filter out any failed pools
    const validPools = pools.filter((pool: BlendPool | null): pool is BlendPool => pool !== null);
    
    console.log(`✅ Successfully loaded ${validPools.length} pools`);
    
    return validPools;
  } catch (error) {
    console.error('Error loading pools from reward zone:', error);
    // Fallback to single known pool if reward zone fetch fails
    console.log('⚠️ Falling back to single testnet pool...');
    try {
      const pool = await loadPool(network, testnetContracts.ids.testnetV2Pool);
      return [pool];
    } catch (fallbackError) {
      console.error('Fallback pool load failed:', fallbackError);
      return [];
    }
  }
}

/**
 * Supply collateral directly to Blend pool
 * Uses Blend's submit() function with SupplyCollateral request
 * Note: Fee collection (3%) can be added as a separate transaction
 */
export async function supplyCollateral(
  poolId: string,
  asset: Asset,
  amount: bigint,
  user: string,
  network: NetworkConfig
) {
  try {
    console.log('🚀 Supplying to Blend Pool (Direct):', {
      poolId,
      asset: asset.code,
      amount: amount.toString(),
      user,
    });
    
    // Initialize Soroban RPC client
    if (!network.rpcUrl) {
      throw new Error('RPC URL required for Soroban operations');
    }
    const server = new SorobanRpc.Server(network.rpcUrl);
    const horizonServer = new Horizon.Server(network.horizonUrl);
    
    // Load user account
    const account = await horizonServer.loadAccount(user);
    
    // Create Blend pool contract instance
    const poolContract = new Contract(poolId);
    
    // Create SupplyCollateral request
    // Request { request_type: u32, address: Address, amount: i128 }
    const request = xdr.ScVal.scvMap([
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol('request_type'),
        val: xdr.ScVal.scvU32(2) // 2 = SupplyCollateral
      }),
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol('address'),
        val: new Address(USDC_TOKEN_CONTRACT).toScVal()
      }),
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol('amount'),
        val: nativeToScVal(amount, { type: 'i128' })
      })
    ]);
    
    // Build transaction to call Blend pool's submit function
    // submit(from: Address, to: Address, spender: Address, requests: Vec<Request>) -> Vec<i128>
    const tx = new TransactionBuilder(account, {
      fee: '10000000', // Higher fee for Soroban operations
      networkPassphrase: network.passphrase,
    })
      .addOperation(
        poolContract.call(
          'submit',
          new Address(user).toScVal(),  // from
          new Address(user).toScVal(),  // to (supply for themselves)
          new Address(user).toScVal(),  // spender
          xdr.ScVal.scvVec([request])   // requests
        )
      )
      .setTimeout(300) // 5 minutes
      .build();
    
    // Simulate transaction to get auth entries
    console.log('🔄 Simulating transaction...');
    const simulation = await server.simulateTransaction(tx);
    
    if (SorobanRpc.Api.isSimulationSuccess(simulation)) {
      console.log('✅ Simulation successful');
      
      // Prepare transaction with auth
      const preparedTx = SorobanRpc.assembleTransaction(tx, simulation).build();
      
      // Sign with Freighter
      console.log('✍️ Please sign the transaction in your wallet...');
      const signedXDR = await signTx(
        preparedTx.toXDR(),
        network.passphrase
      );
      
      const signedTx = TransactionBuilder.fromXDR(signedXDR, network.passphrase);
      
      // Submit transaction
      console.log('📤 Submitting transaction...');
      const result = await server.sendTransaction(signedTx as any);
      
      if (result.status === 'PENDING') {
        console.log('⏳ Transaction pending, polling for result...');
        
        // Poll for transaction result
        let getResponse = await server.getTransaction(result.hash);
        const retries = 30;
        let attempts = 0;
        
        while (getResponse.status === 'NOT_FOUND' && attempts < retries) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          getResponse = await server.getTransaction(result.hash);
          attempts++;
          console.log(`⏳ Polling... attempt ${attempts}/${retries}`);
        }
        
        if (getResponse.status === 'SUCCESS') {
          console.log('✅ Transaction successful!', getResponse);
          
          return {
            successful: true,
            hash: result.hash,
            ledger: getResponse.ledger,
            netSupplied: amount, // Full amount supplied (fee collection separate)
          };
        } else {
          console.error('❌ Transaction failed:', getResponse);
          throw new Error(`Transaction failed: ${getResponse.status}`);
        }
      } else {
        throw new Error(`Unexpected transaction status: ${result.status}`);
      }
    } else {
      console.error('❌ Simulation failed:', simulation);
      throw new Error('Transaction simulation failed: ' + simulation.error);
    }
  } catch (error) {
    console.error('❌ Supply collateral error:', error);
    throw error;
  }
}

export async function borrowAsset(
  poolId: string,
  asset: Asset,
  amount: bigint,
  user: string,
  network: NetworkConfig
) {
  try {
    // For demo purposes, simulate a successful borrow transaction
    // In production, this would interact with actual Blend Capital contracts
    console.log('Simulating borrow asset transaction:', {
      poolId,
      asset: asset.code,
      amount: amount.toString(),
      user,
    });
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Return mock success response
    return {
      successful: true,
      hash: 'mock_tx_' + Math.random().toString(36).substr(2, 9),
      ledger: Math.floor(Math.random() * 1000000),
    };
    
    // Real implementation would be:
    // const server = new Server(network.horizonUrl);
    // const account = await server.loadAccount(user);
    // const contract = new Contract(poolId);
    // ... build and submit Soroban transaction
  } catch (error) {
    console.error('Borrow asset error:', error);
    throw error;
  }
}
