import { useState, useEffect, useRef } from 'react';
import { StellarWalletsKit, WalletNetwork, allowAllModules, ISupportedWallet } from '@creit.tech/stellar-wallets-kit';

export interface FreighterAccount {
  address: string;
  displayName: string;
}

export function useFreighter() {
  const kitRef = useRef<StellarWalletsKit>();
  const [account, setAccount] = useState<FreighterAccount | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize kit once
  useEffect(() => {
    if (!kitRef.current) {
      kitRef.current = new StellarWalletsKit({
        network: WalletNetwork.TESTNET,
        modules: allowAllModules(),
      });
    }
  }, []);

  // Connect using modal (CORRECT API from docs)
  const connect = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const kit = kitRef.current;
      if (!kit) {
        throw new Error('Wallet kit not initialized');
      }

      // Open modal to select wallet (from docs)
      await kit.openModal({
        onWalletSelected: async (option: ISupportedWallet) => {
          kit.setWallet(option.id);
          const { address } = await kit.getAddress(); // CORRECT: getAddress() not getPublicKey()
          
          setAccount({
            address,
            displayName: `${address.slice(0, 4)}...${address.slice(-4)}`,
          });
          setIsConnected(true);
        },
      });
      
      return true;
    } catch (err: any) {
      console.error('Wallet connection error:', err);
      setError(err.message || 'Failed to connect wallet');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Disconnect
  const disconnect = () => {
    setAccount(null);
    setIsConnected(false);
    setError(null);
  };

  // Sign transaction (CORRECT API from docs)
  const signTransaction = async (xdr: string) => {
    if (!isConnected || !account) {
      throw new Error('Wallet not connected');
    }

    try {
      const kit = kitRef.current;
      if (!kit) {
        throw new Error('Wallet kit not initialized');
      }

      // CORRECT: signTransaction() not sign()
      const { signedTxXdr } = await kit.signTransaction(xdr, {
        address: account.address,
        networkPassphrase: WalletNetwork.TESTNET,
      });
      
      return signedTxXdr;
    } catch (err: any) {
      console.error('Transaction signing error:', err);
      throw err;
    }
  };

  return {
    account,
    isConnected,
    isLoading,
    error,
    isFreighterInstalled: true,
    connect,
    disconnect,
    signTransaction,
  };
}
