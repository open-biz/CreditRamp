'use client';

import { BlendPool, PoolReserve } from '@/lib/blend';
import { TrendingUp, TrendingDown, DollarSign, Percent } from 'lucide-react';
import { motion } from 'framer-motion';

interface PoolCardsProps {
  pools: BlendPool[];
  onSelectAsset?: (poolId: string, assetSymbol: string) => void;
}

export function PoolCards({ pools, onSelectAsset }: PoolCardsProps) {
  if (!pools || pools.length === 0) {
    return (
      <div className="bg-white/5 rounded-2xl p-6 border border-white/10 text-center">
        <p className="text-white/60">Loading pool data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {pools.map((pool) => (
        <div key={pool.id} className="space-y-4">
          {/* Pool Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-white">{pool.name}</h3>
              <p className="text-sm text-white/50">
                TVL: ${(Number(pool.totalValueLocked) / 1e7).toLocaleString()}
              </p>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
              pool.status === 'active' 
                ? 'bg-green-500/20 text-green-400' 
                : 'bg-red-500/20 text-red-400'
            }`}>
              {pool.status.toUpperCase()}
            </div>
          </div>

          {/* Asset Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from(pool.reserves.values()).map((reserve) => (
              <AssetCard 
                key={reserve.symbol} 
                reserve={reserve}
                poolId={pool.id}
                onSelect={onSelectAsset}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

interface AssetCardProps {
  reserve: PoolReserve;
  poolId: string;
  onSelect?: (poolId: string, assetSymbol: string) => void;
}

function AssetCard({ reserve, poolId, onSelect }: AssetCardProps) {
  const supplyAprDisplay = (reserve.supplyApr / 100).toFixed(2);
  const borrowAprDisplay = (reserve.borrowApr / 100).toFixed(2);

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-white/5 rounded-2xl p-5 border border-white/10 cursor-pointer hover:border-white/20 transition-all"
      onClick={() => onSelect?.(poolId, reserve.symbol)}
    >
      {/* Asset Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
            <span className="text-white font-bold text-sm">{reserve.symbol}</span>
          </div>
          <div>
            <p className="text-white font-semibold">{reserve.symbol}</p>
            <p className="text-xs text-white/50">Collateral</p>
          </div>
        </div>
      </div>

      {/* APR Display */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-sm text-white/60">Supply APR</span>
          </div>
          <span className="text-lg font-bold text-green-400">{supplyAprDisplay}%</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-red-400" />
            <span className="text-sm text-white/60">Borrow APR</span>
          </div>
          <span className="text-lg font-bold text-red-400">{borrowAprDisplay}%</span>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-white/10 my-4" />

      {/* Pool Stats */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-white/50">Utilization</span>
          <span className="text-white font-semibold">{reserve.utilizationRate}%</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-white/50">Collateral Factor</span>
          <span className="text-white font-semibold">{reserve.collateralFactor}%</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-white/50">Total Supply</span>
          <span className="text-white font-semibold">
            ${(Number(reserve.totalSupply) / 1e7).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-white/50">Total Borrow</span>
          <span className="text-white font-semibold">
            ${(Number(reserve.totalBorrow) / 1e7).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
        </div>
      </div>

      {/* CreditRamp Fee Notice */}
      <div className="mt-4 pt-3 border-t border-white/10">
        <div className="flex items-center gap-2">
          <Percent className="w-3 h-3 text-white/40" />
          <span className="text-xs text-white/40">3% CreditRamp fee applies</span>
        </div>
      </div>
    </motion.div>
  );
}
