// Freighter wallet integration for Stellar
declare global {
  interface Window {
    freighterApi?: {
      isConnected: () => Promise<boolean>;
      getPublicKey: () => Promise<string>;
      signTransaction: (xdr: string, opts?: { network?: string; networkPassphrase?: string }) => Promise<string>;
    };
  }
}

export async function connectFreighter(): Promise<void> {
  if (!window.freighterApi) {
    throw new Error('Freighter wallet not installed. Please install from https://www.freighter.app/');
  }
  
  const isConnected = await window.freighterApi.isConnected();
  if (!isConnected) {
    throw new Error('Please connect your Freighter wallet');
  }
}

export async function getPublicKey(): Promise<string> {
  if (!window.freighterApi) {
    throw new Error('Freighter wallet not installed');
  }
  
  return await window.freighterApi.getPublicKey();
}

export async function signTx(xdr: string, networkPassphrase?: string): Promise<string> {
  if (!window.freighterApi) {
    throw new Error('Freighter wallet not installed');
  }
  
  return await window.freighterApi.signTransaction(xdr, {
    networkPassphrase: networkPassphrase || 'Test SDF Network ; September 2015',
  });
}
