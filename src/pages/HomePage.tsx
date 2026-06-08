import React, { useEffect, useState, useMemo } from 'react';
import { useApp } from '../App';
import type { MarketListing } from '../shared/types';
import TokenChart from '../components/SolanaChart';

export default function HomePage() {
  const { update } = useApp();
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [loading, setLoading]   = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    await (window.electronAPI.getMarketListings as any)(false, (partial: any[]) => {
      setListings([...partial]);
      setLoading(false);
    });
  };

  const hotItems = useMemo(() => {
    return listings
      .filter(l => l.lowestPrice > 0 && l.medianPrice > 0 && parseInt(l.volume, 10) > 0)
      .map(l => ({
        ...l,
        priceRatio: l.medianPrice / l.lowestPrice,
        volumeNum:  parseInt(l.volume, 10),
        hotScore:   (l.medianPrice / l.lowestPrice) * Math.log10(parseInt(l.volume, 10) + 1),
      }))
      .sort((a, b) => b.hotScore - a.hotScore)
      .slice(0, 12);
  }, [listings]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-5xl mb-4">⚔️</div>
          <p className="text-gray-400 animate-pulse">Loading market data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden p-4 gap-3">
      <section className="shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔥</span>
            <div>
              <h2 className="text-sm font-bold text-white leading-tight">HOT Items</h2>
              <p className="text-gray-500" style={{ fontSize: '10px' }}>High demand, rising prices</p>
            </div>
          </div>
          <button onClick={() => update({ page: 'market' })}
            className="text-xs text-tbh-primary hover:text-purple-300 transition-colors">
            View all →
          </button>
        </div>
        <div className="grid grid-cols-6 gap-2">
          {hotItems.slice(0, 12).map(item => (
            <HotCard key={item.marketHashName} item={item} onClick={() => update({ page: 'market' })} />
          ))}
        </div>
      </section>

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="flex items-center gap-2 mb-1.5 shrink-0">
          <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg,#9945FF,#14F195)' }}>
            <span className="text-white font-black" style={{ fontSize: '8px' }}>◎</span>
          </div>
          <h2 className="text-sm font-bold text-white">TBH Token Price</h2>
        </div>
        <div className="flex-1 min-h-0">
          <TokenChart />
        </div>
      </div>
    </div>
  );
}

function HotCard({ item, onClick }: { item: any; onClick: () => void }) {
  const priceUp = item.priceRatio > 1.5;
  return (
    <div onClick={onClick}
      className="card p-2 cursor-pointer hover:border-white/30 hover:-translate-y-0.5 transition-all duration-150 relative overflow-hidden flex flex-col">
      {item.priceRatio > 2 && (
        <div className="absolute top-1 right-1 bg-red-500/80 text-white px-1 rounded"
          style={{ fontSize: '8px', lineHeight: '13px' }}>HOT</div>
      )}
      <img src={item.iconUrl} alt={item.name}
        className="w-full object-contain rounded mb-1"
        style={{ imageRendering: 'pixelated', aspectRatio: '1/1', maxHeight: '52px' }}
        onError={e => { (e.target as HTMLImageElement).style.opacity = '0.3'; }}
      />
      <p className="font-semibold truncate leading-tight" title={item.name} style={{ fontSize: '10px' }}>{item.name}</p>
      {item.nameJa && <p className="text-gray-500 truncate" style={{ fontSize: '9px' }}>{item.nameJa}</p>}
      <div className="mt-1 pt-1 border-t border-white/10 flex justify-between items-center">
        <span className="text-green-400 font-mono font-bold" style={{ fontSize: '10px' }}>${item.lowestPrice.toFixed(2)}</span>
        {priceUp && (
          <span className="text-red-400 font-bold" style={{ fontSize: '9px' }}>▲{((item.priceRatio - 1) * 100).toFixed(0)}%</span>
        )}
      </div>
    </div>
  );
}
