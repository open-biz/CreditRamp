import { 
  PoolContractV2, 
  PoolFactoryContractV2,
  ReserveConfigV2, 
  ReserveEmissionMetadata, 
  DeployV2Args,
  SetReserveArgs,
  I128MAX 
} from '@blend-capital/blend-sdk';
import { 
  Keypair, 
  rpc, 
  Transaction,
  TransactionBuilder,
  xdr,
  Operation,
  Asset,
  Address
} from '@stellar/stellar-sdk';
import testnetContracts from '@/lib/contracts/testnet.contracts.json';
import mainnetContracts from '@/lib/contracts/mainnet.contracts.json';
import futurenetContracts from '@/lib/contracts/futurenet.contracts.json';

// CreditRamp fee configuration
export const CREDITRAMP_FEE_BPS = 300; // 3%

// Types
interface PoolFormData {
  name: string;
  network: string;
  backstopTakeRate: number;
  maxPositions: number;
  minCollateral: number;
  selectedAssets: Array<{
    id: string;
    symbol: string;
    name: string;
    address: string;
    decimals: number;
  }>;
  riskParameters: {
    preset: string;
    customParams?: {
      collateralFactor: number;
      liquidationFactor: number;
      util: number;
      maxUtil: number;
      rBase: number;
      rOne: number;
      rTwo: number;
      rThree: number;
      reactivity: number;
    };
  };
  emissions: Array<{
    assetId: string;
    supplyEmission: number;
    borrowEmission: number;
  }>;
}

interface NetworkConfig {
  rpcUrl: string;
  passphrase: string;
  friendbotUrl?: string;
}

// Network configurations
const NETWORK_CONFIGS: Record<string, NetworkConfig> = {
  testnet: {
    rpcUrl: 'https://soroban-testnet.stellar.org',
    passphrase: 'Test SDF Network ; September 2015',
    friendbotUrl: 'https://friendbot.stellar.org'
  },
  mainnet: {
    rpcUrl: 'https://mainnet.stellar.validationcloud.io/v1/6bb8d0fff54e4a5c8ce4b6ad87e5f4b7',
    passphrase: 'Public Global Stellar Network ; September 2015'
  },
  futurenet: {
    rpcUrl: 'https://rpc-futurenet.stellar.org',
    passphrase: 'Test SDF Future Network ; October 2022',
    friendbotUrl: 'https://friendbot-futurenet.stellar.org'
  },
  local: {
    rpcUrl: 'http://localhost:8000/soroban/rpc',
    passphrase: 'Standalone Network ; February 2017',
    friendbotUrl: 'http://localhost:8000/friendbot'
  }
};

// Risk parameter presets
const RISK_PRESETS = {
  conservative: {
    c_factor: 900_0000,    // 90%
    l_factor: 900_0000,    // 90%
    util: 800_0000,        // 80%
    max_util: 900_0000,    // 90%
    r_base: 20000,         // 0.2%
    r_one: 300000,         // 3%
    r_two: 800000,         // 8%
    r_three: 1_0000000,    // 100%
    reactivity: 500
  },
  balanced: {
    c_factor: 950_0000,    // 95%
    l_factor: 950_0000,    // 95%
    util: 850_0000,        // 85%
    max_util: 950_0000,    // 95%
    r_base: 30000,         // 0.3%
    r_one: 400000,         // 4%
    r_two: 900000,         // 9%
    r_three: 1_0000000,    // 100%
    reactivity: 750
  },
  aggressive: {
    c_factor: 980_0000,    // 98%
    l_factor: 980_0000,    // 98%
    util: 900_0000,        // 90%
    max_util: 980_0000,    // 98%
    r_base: 50000,         // 0.5%
    r_one: 500000,         // 5%
    r_two: 1000000,        // 10%
    r_three: 1_0000000,    // 100%
    reactivity: 1000
  }
};

// Get contract addresses for network
function getContractAddresses(network: string) {
  switch (network) {
    case 'testnet':
      return testnetContracts.ids;
    case 'mainnet':
      return mainnetContracts.ids;
    case 'futurenet':
      return futurenetContracts.ids;
    default:
      throw new Error(`Unsupported network: ${network}`);
  }
}

export class BlendDeploymentService {
  private networkConfig: NetworkConfig;
  private rpcClient: rpc.Server;
  private network: string;
  private contractAddresses: ReturnType<typeof getContractAddresses>;

  constructor(network: string) {
    // Restrict to testnet only for now
    if (network !== 'testnet') {
      throw new Error('Only testnet deployments are supported');
    }
    
    this.network = network;
    this.networkConfig = NETWORK_CONFIGS[network];
    if (!this.networkConfig) {
      throw new Error(`Unsupported network: ${network}`);
    }
    this.rpcClient = new rpc.Server(this.networkConfig.rpcUrl, { allowHttp: true });
    this.contractAddresses = getContractAddresses(network);
  }

  /**
   * Convert asset address to proper contract format
   */
  private convertAssetAddress(assetAddress: string): string {
    console.log(`Converting asset address: ${assetAddress}`);
    
    if (assetAddress === 'native') {
      const nativeAssetAddress = Address.contract(Buffer.alloc(32, 0)).toString();
      console.log(`Native asset converted to: ${nativeAssetAddress}`);
      return nativeAssetAddress;
    }
    
    if (!assetAddress || typeof assetAddress !== 'string') {
      throw new Error(`Invalid asset address: ${assetAddress}`);
    }
    
    if (assetAddress.startsWith('C') && assetAddress.length === 56) {
      try {
        const address = Address.fromString(assetAddress);
        const convertedAddress = address.toString();
        console.log(`Address validated: ${assetAddress} -> ${convertedAddress}`);
        return convertedAddress;
      } catch (error) {
        throw new Error(`Invalid Stellar address: ${assetAddress}`);
      }
    }
    
    throw new Error(`Unsupported address format: ${assetAddress}`);
  }

  /**
   * Generate random salt for pool deployment
   */
  private generateSalt(): Buffer {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Buffer.from(array);
  }

  /**
   * Transform form data into deployment parameters
   */
  private transformFormData(formData: PoolFormData): {
    deployArgs: DeployV2Args;
    reserveConfigs: ReserveConfigV2[];
    emissionMetadata: ReserveEmissionMetadata[];
  } {
    const deployArgs: DeployV2Args = {
      admin: '',
      name: formData.name,
      salt: this.generateSalt(),
      oracle: this.contractAddresses.oraclemock,
      backstop_take_rate: Math.round(formData.backstopTakeRate * 1e7),
      max_positions: formData.maxPositions,
      min_collateral: BigInt(formData.minCollateral)
    };

    const reserveConfigs: ReserveConfigV2[] = formData.selectedAssets.map((asset, index) => {
      const riskParams = formData.riskParameters.preset === 'custom' && formData.riskParameters.customParams
        ? {
            c_factor: Math.round(formData.riskParameters.customParams.collateralFactor * 1e7),
            l_factor: Math.round(formData.riskParameters.customParams.liquidationFactor * 1e7),
            util: Math.round(formData.riskParameters.customParams.util * 1e7),
            max_util: Math.round(formData.riskParameters.customParams.maxUtil * 1e7),
            r_base: Math.round(formData.riskParameters.customParams.rBase * 1e5),
            r_one: Math.round(formData.riskParameters.customParams.rOne * 1e5),
            r_two: Math.round(formData.riskParameters.customParams.rTwo * 1e5),
            r_three: Math.round(formData.riskParameters.customParams.rThree * 1e7),
            reactivity: formData.riskParameters.customParams.reactivity
          }
        : RISK_PRESETS[formData.riskParameters.preset as keyof typeof RISK_PRESETS];

      return {
        index: index,
        decimals: asset.decimals,
        ...riskParams,
        supply_cap: I128MAX,
        enabled: true
      };
    });

    const emissionMetadata: ReserveEmissionMetadata[] = [];
    formData.emissions.forEach((emission, index) => {
      if (emission.supplyEmission > 0) {
        emissionMetadata.push({
          res_index: index,
          res_type: 1,
          share: BigInt(Math.round(emission.supplyEmission * 1e7))
        });
      }
      if (emission.borrowEmission > 0) {
        emissionMetadata.push({
          res_index: index,
          res_type: 0,
          share: BigInt(Math.round(emission.borrowEmission * 1e7))
        });
      }
    });

    return { deployArgs, reserveConfigs, emissionMetadata };
  }

  /**
   * Submit and wait for transaction
   */
  private async submitTransaction(transaction: Transaction): Promise<string> {
    try {
      const result = await this.rpcClient.sendTransaction(transaction);
      
      if (result.status === 'PENDING') {
        let attempts = 0;
        const maxAttempts = 30;
        
        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          try {
            const txResult = await this.rpcClient.getTransaction(result.hash);
            if (txResult.status === 'SUCCESS') {
              return result.hash;
            } else if (txResult.status === 'FAILED') {
              throw new Error(`Transaction failed: ${JSON.stringify(txResult)}`);
            }
          } catch (error) {
            // Continue waiting
          }
          
          attempts++;
        }
        
        throw new Error('Transaction timeout');
      } else if (result.status === 'ERROR') {
        throw new Error(`Transaction error: ${JSON.stringify(result)}`);
      }
      
      return result.hash;
    } catch (error) {
      console.error('Transaction submission error:', error);
      throw error;
    }
  }

  /**
   * Get CreditRamp fee collector address
   */
  getFeeCollectorAddress(): string {
    return this.contractAddresses.creditRampFeeCollector;
  }

  /**
   * Calculate CreditRamp fee for a given amount
   */
  calculateFee(amount: bigint): { feeAmount: bigint; netAmount: bigint } {
    const feeAmount = (amount * BigInt(CREDITRAMP_FEE_BPS)) / BigInt(10000);
    const netAmount = amount - feeAmount;
    return { feeAmount, netAmount };
  }

  /**
   * Deploy a pool (simplified for CreditRamp use case)
   */
  async deployPool(formData: PoolFormData, userKeypair: Keypair): Promise<{
    poolAddress: string;
    transactionHashes: string[];
  }> {
    try {
      const userAccount = await this.rpcClient.getAccount(userKeypair.publicKey());
      const transactionHashes: string[] = [];

      const { deployArgs, reserveConfigs, emissionMetadata } = this.transformFormData(formData);
      deployArgs.admin = userKeypair.publicKey();

      console.log('Deploying pool:', deployArgs.name);

      // Deploy the pool
      const poolFactory = new PoolFactoryContractV2(this.contractAddresses.poolFactoryV2);
      const deployPoolOp = poolFactory.deployPool(deployArgs);

      const deployTxBuilder = new TransactionBuilder(userAccount, {
        fee: '10000',
        networkPassphrase: this.networkConfig.passphrase,
      });
      
      deployTxBuilder.addOperation(xdr.Operation.fromXDR(deployPoolOp, 'base64'));
      deployTxBuilder.setTimeout(30);
      
      const deployTx = deployTxBuilder.build();
      deployTx.sign(userKeypair);

      // Simulate to get pool address
      const simResult = await this.rpcClient.simulateTransaction(deployTx);
      if (rpc.Api.isSimulationError(simResult)) {
        throw new Error(`Pool deployment simulation failed: ${simResult.error}`);
      }

      const poolAddress = PoolFactoryContractV2.parsers.deployPool(simResult.result!.retval.toXDR('base64'));
      if (!poolAddress) {
        throw new Error('Failed to get pool address');
      }

      // Submit transaction
      const assembledDeployTx = rpc.assembleTransaction(deployTx, simResult).build();
      assembledDeployTx.sign(userKeypair);
      
      const deployTxHash = await this.submitTransaction(assembledDeployTx);
      transactionHashes.push(deployTxHash);

      console.log('Pool deployed successfully:', poolAddress);

      // Set up reserves
      const pool = new PoolContractV2(poolAddress);
      
      for (let i = 0; i < formData.selectedAssets.length; i++) {
        const asset = formData.selectedAssets[i];
        const reserveConfig = reserveConfigs[i];

        const contractAssetAddress = this.convertAssetAddress(asset.address);

        const setReserveArgs: SetReserveArgs = {
          asset: contractAssetAddress,
          metadata: reserveConfig
        };

        // Queue reserve
        const queueReserveOp = pool.queueSetReserve(setReserveArgs);
        
        const queueTxBuilder = new TransactionBuilder(userAccount, {
          fee: '10000',
          networkPassphrase: this.networkConfig.passphrase,
        });
        
        queueTxBuilder.addOperation(xdr.Operation.fromXDR(queueReserveOp, 'base64'));
        queueTxBuilder.setTimeout(30);
        
        const queueTx = queueTxBuilder.build();
        queueTx.sign(userKeypair);

        const queueSimResult = await this.rpcClient.simulateTransaction(queueTx);
        if (rpc.Api.isSimulationError(queueSimResult)) {
          throw new Error(`Reserve queue failed for ${asset.symbol}`);
        }

        const assembledQueueTx = rpc.assembleTransaction(queueTx, queueSimResult).build();
        assembledQueueTx.sign(userKeypair);
        
        const queueTxHash = await this.submitTransaction(assembledQueueTx);
        transactionHashes.push(queueTxHash);
      }

      // Set emissions if configured
      if (emissionMetadata.length > 0) {
        const emissionsOp = pool.setEmissionsConfig(emissionMetadata);
        
        const emissionsTxBuilder = new TransactionBuilder(userAccount, {
          fee: '10000',
          networkPassphrase: this.networkConfig.passphrase,
        });
        
        emissionsTxBuilder.addOperation(xdr.Operation.fromXDR(emissionsOp, 'base64'));
        emissionsTxBuilder.setTimeout(30);
        
        const emissionsTx = emissionsTxBuilder.build();
        emissionsTx.sign(userKeypair);

        const emissionsSimResult = await this.rpcClient.simulateTransaction(emissionsTx);
        if (rpc.Api.isSimulationError(emissionsSimResult)) {
          throw new Error(`Emissions simulation failed`);
        }

        const assembledEmissionsTx = rpc.assembleTransaction(emissionsTx, emissionsSimResult).build();
        assembledEmissionsTx.sign(userKeypair);
        
        const emissionsTxHash = await this.submitTransaction(assembledEmissionsTx);
        transactionHashes.push(emissionsTxHash);
      }

      return { poolAddress, transactionHashes };

    } catch (error) {
      console.error('Pool deployment failed:', error);
      throw error;
    }
  }
}
