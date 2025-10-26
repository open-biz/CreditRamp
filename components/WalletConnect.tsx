'use client';

import { useFreighter } from '@/hooks/useFreighter';
import { Button } from '@/components/ui/button';
import { Wallet, LogOut, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function WalletConnect() {
  const { account, isConnected, isLoading, error, isFreighterInstalled, connect, disconnect } = useFreighter();

  const handleConnect = async () => {
    if (!isFreighterInstalled) {
      window.open('https://www.freighter.app/', '_blank');
      return;
    }
    await connect();
  };

  if (isConnected && account) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-purple-500/50 hover:border-purple-400 text-white backdrop-blur-sm"
          >
            <Wallet className="w-4 h-4 mr-2" />
            {account.displayName}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 bg-gray-900 border-gray-700 text-white">
          <DropdownMenuLabel>My Wallet</DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-gray-700" />
          <DropdownMenuItem
            onClick={() => navigator.clipboard.writeText(account.address)}
            className="cursor-pointer hover:bg-gray-800"
          >
            <span className="font-mono text-xs">{account.address.slice(0, 16)}...</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-gray-700" />
          <DropdownMenuItem
            onClick={() => window.open(`https://stellar.expert/explorer/testnet/account/${account.address}`, '_blank')}
            className="cursor-pointer hover:bg-gray-800"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            View on Explorer
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={disconnect}
            className="cursor-pointer hover:bg-gray-800 text-red-400"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
      >
        <Button
          onClick={handleConnect}
          disabled={isLoading}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold shadow-lg shadow-purple-500/50"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Wallet className="w-4 h-4 mr-2" />
              {isFreighterInstalled ? 'Connect Wallet' : 'Install Freighter'}
            </>
          )}
        </Button>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-red-400 mt-2"
          >
            {error}
          </motion.p>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
