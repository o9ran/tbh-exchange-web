import React, { useEffect, useState } from 'react';
import { useApp } from '../App';
import type { SteamItem } from '../shared/types';

function getRarityStyle(name: string): { bg: string; border: string; badge: string; label: string } {
  const n = name.toLowerCase();
  if (n.includes('arcana'))    return { bg: 'linear-gradient(135deg,#2d1b69 0%,#4c1d95 60%,#1e1b4b 100%)', border: 'rgba(167,139,250,0.5)', badge: 'bg-purple-500/80 text-purple-100', label: 'Arcana' };
  if (n.includes('immortal'))  return { bg: 'linear-gradient(135deg,#450a0a 0%,#7f1d1d 60%,#300a0a 100%)', border: 'rgba(248,113,113,0.5)', badge: 'bg-red-600/80 text-red-100', label: 'Immortal' };
  if (n.includes('legendary')) return { bg: 'linear-gradient(135deg,#451a03 0%,#92400e 60%,#2a1000 100%)', border: 'rgba(251,191,36,0.5)', badge: 'bg-yellow-600/80 text-yellow-100', label: 'Legendary' };
  if (n.includes('rare'))      return { bg: 'linear-gradient(135deg,#0c1a3d 0%,#1e3a8a 60%,#0a1228 100%)', border: 'rgba(96,165,250,0.5)', badge: 'bg-blue-600/80 text-blue-100', label: 'Rare' };
  if (n.includes('uncommon'))  return { bg: 'linear-gradient(135deg,#052e16 0%,#14532d 60%,#021a0e 100%)', border: 'rgba(74,222,128,0.4)', badge: 'bg-green-700/80 text-green-100', label: 'Uncommon' };
  return { bg: 'linear-gradient(135deg,#1a1a2e 0%,#2a2a3e 60%,#111122 100%)', border: 'rgba(255,255,255,0.12)', badge: 'bg-gray-600/80 text-gray-200', label: 'Common' };
}

export default function InventoryPage() {
  const { state, update } = useApp();
  const [prices, setPrices]           = useState<Record<string, number>>({});
  const [loading, setLoading]         = useState(false);
  const [priceLoading, setPriceLoading] = useState(false);
  const rateConfig = state.rateConfig;

  useEffect(() => {
    if (state.steamUser && state.inventory.length === 0) loadInventory();
  }, [state.steamUser]);

  const loadInventory = async () => {
    setLoading(true); update({ error: null });
    try {
      const res = await window.electronAPI.getInventory(state.steamUser!.steamId);
      if (!res.success) throw new Error(res.error);
      update({ inventory: res.data });
      const names = [...new Set(res.data.filter((i: SteamItem) => i.marketable).map((i: SteamItem) => i.marketHashName))] as string[];
      if (names.length > 0) {
        setPriceLoading(true);
        const priceRes = await window.electronAPI.getMarketPricesBulk(names);
        if (priceRes.success) setPrices(priceRes.data);
        setPriceLoading(false);
      }
    } catch (e: any) { update({ error: e.message }); }
    finally { setLoading(false); }
  };

  const toggleSelect = (item: SteamItem) => {
    const isSelected = state.selectedItems.some(i => i.assetId === item.assetId);
    update({ selectedItems: isSelected ? state.selectedItems.filter(i => i.assetId !== item.assetId) : [...state.selectedItems, item] });
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Inventory</h2>
          <p className="text-gray-400 text-sm mt-0.5">Select items you want to exchange</p>
        </div>
        <div className="flex items-center gap-3">
          {state.selectedItems.length > 0 && (
            <button onClick={() => update({ page: 'exchange' })} className="btn-secondary">
              Request exchange for {state.selectedItems.length} items →
            </button>
          )}
          <button onClick={loadInventory} disabled={loading} className="btn-primary">
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><div className="text-center"><div className="text-4xl mb-4 animate-spin">⚙️</div><p className="text-gray-400">Loading inventory...</p></div></div>
      ) : state.inventory.length === 0 ? (
        <div className="flex items-center justify-center h-64"><div className="text-center"><div className="text-4xl mb-4">📦</div><p className="text-gray-400">No items found</p></div></div>
      ) : (
        <>
          <p className="text-sm text-gray-400 mb-4">
            {state.inventory.length} items
            {priceLoading && <span className="ml-2 text-yellow-400 animate-pulse">Fetching prices...</span>}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {state.inventory.map(item => {
              const isSelected = state.selectedItems.some(i => i.assetId === item.assetId);
              const price  = prices[item.marketHashName] || 0;
              const tbhRate = rateConfig ? price * rateConfig.usdToTbhRate : null;
              const rarity = getRarityStyle(item.name);
              return (
                <div key={item.assetId} onClick={() => item.marketable && toggleSelect(item)}
                  className="relative rounded-xl overflow-hidden transition-all duration-150"
                  style={{ background: rarity.bg, border: `1px solid ${isSelected ? '#6C5CE7' : rarity.border}`, boxShadow: isSelected ? '0 0 0 2px #6C5CE7,0 4px 16px rgba(108,92,231,0.4)' : '0 2px 8px rgba(0,0,0,0.4)', transform: isSelected ? 'translateY(-2px)' : undefined, opacity: item.marketable ? 1 : 0.5, cursor: item.marketable ? 'pointer' : 'not-allowed' }}>
                  {isSelected && (
                    <div className="absolute top-2 right-2 z-10 w-5 h-5 rounded-full bg-tbh-primary flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  )}
                  <div className="px-3 pt-2.5 pb-0 flex items-center gap-1.5">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${rarity.badge}`} style={{ fontSize: '9px' }}>{rarity.label}</span>
                    {item.type && <span className="text-gray-400 truncate" style={{ fontSize: '9px' }}>{item.type}</span>}
                  </div>
                  <div className="flex items-center justify-center px-4 py-3">
                    <img src={item.iconUrl} alt={item.name} className="w-28 h-28 object-contain" loading="lazy" style={{ imageRendering: 'pixelated' }} onError={e => { (e.target as HTMLImageElement).style.opacity = '0.3'; }} />
                  </div>
                  <div className="px-3 pb-3">
                    <p className="text-sm font-bold text-white leading-tight mb-2 line-clamp-2" title={item.name}>{item.name}</p>
                    <div className="border-t border-white/10 pt-2 space-y-0.5">
                      {price > 0 ? (
                        <>
                          <div className="flex justify-between items-center"><span className="text-gray-400" style={{ fontSize: '10px' }}>Lowest</span><span className="text-green-400 font-mono font-bold text-xs">${price.toFixed(2)}</span></div>
                          {tbhRate !== null && tbhRate > 0 && <div className="flex justify-between items-center"><span className="text-gray-400" style={{ fontSize: '10px' }}>TBH value</span><span className="text-purple-300 font-mono text-xs">{tbhRate.toFixed(1)} TBH</span></div>}
                        </>
                      ) : <p className="text-gray-600 text-xs">No price data</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
