import React, { useState, useEffect } from 'react';
import { useApp } from '../App';
import type { SteamItem, ExchangeRequestItem, RateConfig } from '../shared/types';

function getRarityStyle(name: string): { bg: string; border: string; badge: string; label: string } {
  const n = name.toLowerCase();
  if (n.includes('arcana'))    return { bg: 'linear-gradient(135deg,#2d1b69,#4c1d95,#1e1b4b)', border: 'rgba(167,139,250,0.5)', badge: 'bg-purple-500/80 text-purple-100', label: 'Arcana' };
  if (n.includes('immortal'))  return { bg: 'linear-gradient(135deg,#450a0a,#7f1d1d,#300a0a)', border: 'rgba(248,113,113,0.5)', badge: 'bg-red-600/80 text-red-100', label: 'Immortal' };
  if (n.includes('legendary')) return { bg: 'linear-gradient(135deg,#451a03,#92400e,#2a1000)', border: 'rgba(251,191,36,0.5)', badge: 'bg-yellow-600/80 text-yellow-100', label: 'Legendary' };
  if (n.includes('rare'))      return { bg: 'linear-gradient(135deg,#0c1a3d,#1e3a8a,#0a1228)', border: 'rgba(96,165,250,0.5)', badge: 'bg-blue-600/80 text-blue-100', label: 'Rare' };
  if (n.includes('uncommon'))  return { bg: 'linear-gradient(135deg,#052e16,#14532d,#021a0e)', border: 'rgba(74,222,128,0.4)', badge: 'bg-green-700/80 text-green-100', label: 'Uncommon' };
  return { bg: 'linear-gradient(135deg,#1a1a2e,#2a2a3e,#111122)', border: 'rgba(255,255,255,0.12)', badge: 'bg-gray-600/80 text-gray-200', label: 'Common' };
}

export default function ExchangePage() {
  const { state, update } = useApp();
  const [prices, setPrices]             = useState<Record<string, number>>({});
  const [rateConfig, setRateConfig]     = useState<RateConfig | null>(state.rateConfig);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [priceLoading, setPriceLoading] = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [success, setSuccess]           = useState(false);

  useEffect(() => {
    loadRateConfig();
    if (state.inventory.length === 0 && state.steamUser) loadInventory();
    else loadPricesForInventory(state.inventory);
  }, []);

  const loadRateConfig = async () => {
    const res = await window.electronAPI.getRateConfig();
    if (res.success) { setRateConfig(res.data); update({ rateConfig: res.data }); }
  };

  const loadInventory = async () => {
    setInventoryLoading(true);
    try {
      const res = await window.electronAPI.getInventory(state.steamUser!.steamId);
      if (!res.success) throw new Error(res.error);
      update({ inventory: res.data });
      await loadPricesForInventory(res.data);
    } catch (e: any) { update({ error: e.message }); }
    finally { setInventoryLoading(false); }
  };

  const loadPricesForInventory = async (items: SteamItem[]) => {
    const names = [...new Set(items.filter(i => i.marketable).map(i => i.marketHashName))] as string[];
    if (!names.length) return;
    setPriceLoading(true);
    const res = await window.electronAPI.getMarketPricesBulk(names);
    if (res.success) setPrices(res.data);
    setPriceLoading(false);
  };

  const toggleItem = (item: SteamItem) => {
    if (!item.marketable) return;
    const isSelected = state.selectedItems.some(i => i.assetId === item.assetId);
    update({ selectedItems: isSelected ? state.selectedItems.filter(i => i.assetId !== item.assetId) : [...state.selectedItems, item] });
  };

  const removeItem = (assetId: string) => update({ selectedItems: state.selectedItems.filter(i => i.assetId !== assetId) });

  const getTbhForItem = (marketHashName: string): number => {
    if (!rateConfig) return 0;
    return (prices[marketHashName] || 0) * rateConfig.usdToTbhRate;
  };

  const totalTbh = state.selectedItems.reduce((sum, item) => sum + getTbhForItem(item.marketHashName), 0);

  const handleSubmit = async () => {
    if (!state.walletAddress) { update({ error: 'Please enter or connect a wallet address' }); return; }
    if (!state.selectedItems.length) { update({ error: 'Please select at least one item' }); return; }
    if (!rateConfig) return;
    setSubmitting(true);
    try {
      const items: ExchangeRequestItem[] = state.selectedItems.map(item => ({
        assetId: item.assetId, name: item.name, marketHashName: item.marketHashName,
        iconUrl: item.iconUrl, tbhAmount: getTbhForItem(item.marketHashName),
      }));
      const res = await window.electronAPI.createExchangeRequest({
        steamId: state.steamUser!.steamId, steamName: state.steamUser!.displayName,
        walletAddress: state.walletAddress, items,
      });
      if (!res.success) throw new Error(res.error);
      update({ selectedItems: [] });
      setSuccess(true);
    } catch (e: any) { update({ error: e.message }); }
    finally { setSubmitting(false); }
  };

  if (success) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-tbh-secondary mb-2">Request Submitted!</h2>
          <p className="text-gray-400 mb-6">Your exchange request has been sent. Please wait for admin approval.</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => update({ page: 'history' })} className="btn-primary">View History</button>
            <button onClick={() => setSuccess(false)} className="btn-secondary">Submit Another</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* Left: Inventory */}
        <div className="w-1/2 flex flex-col overflow-hidden border-r border-white/10">
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 shrink-0">
            <div>
              <h2 className="text-lg font-bold">Inventory</h2>
              <p className="text-xs text-gray-400">
                {state.inventory.length > 0 ? `${state.inventory.length} items` : ''}
                {priceLoading && <span className="ml-2 text-yellow-400 animate-pulse">Fetching prices...</span>}
              </p>
            </div>
            <button onClick={loadInventory} disabled={inventoryLoading} className="btn-primary text-sm px-3 py-1.5">
              {inventoryLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {inventoryLoading ? (
              <div className="flex items-center justify-center h-64"><div className="text-center"><div className="text-4xl mb-4 animate-spin">⚙️</div><p className="text-gray-400">Loading inventory...</p></div></div>
            ) : state.inventory.length === 0 ? (
              <div className="flex items-center justify-center h-64"><div className="text-center"><div className="text-4xl mb-4">📦</div><p className="text-gray-400">No items found</p></div></div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {state.inventory.map(item => {
                  const isSelected = state.selectedItems.some(i => i.assetId === item.assetId);
                  const price = prices[item.marketHashName] || 0;
                  const tbhRate = rateConfig ? price * rateConfig.usdToTbhRate : null;
                  const rarity = getRarityStyle(item.name);
                  return (
                    <div key={item.assetId} onClick={() => toggleItem(item)}
                      className="relative rounded-xl overflow-hidden transition-all duration-150"
                      style={{ background: rarity.bg, border: `1px solid ${isSelected ? '#6C5CE7' : rarity.border}`, boxShadow: isSelected ? '0 0 0 2px #6C5CE7,0 4px 16px rgba(108,92,231,0.4)' : '0 2px 8px rgba(0,0,0,0.4)', transform: isSelected ? 'translateY(-2px)' : undefined, opacity: item.marketable ? 1 : 0.5, cursor: item.marketable ? 'pointer' : 'not-allowed' }}>
                      {isSelected && <div className="absolute top-2 right-2 z-10 w-5 h-5 rounded-full bg-tbh-primary flex items-center justify-center"><span className="text-white text-xs">✓</span></div>}
                      <div className="px-3 pt-2.5 pb-0 flex items-center gap-1.5">
                        <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${rarity.badge}`} style={{ fontSize: '9px' }}>{rarity.label}</span>
                        {item.type && <span className="text-gray-400 truncate" style={{ fontSize: '9px' }}>{item.type}</span>}
                      </div>
                      <div className="flex items-center justify-center px-4 py-3">
                        <img src={item.iconUrl} alt={item.name} className="w-20 h-20 object-contain" style={{ imageRendering: 'pixelated' }} onError={e => { (e.target as HTMLImageElement).style.opacity = '0.3'; }} />
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
            )}
          </div>
        </div>

        {/* Right: Exchange panel */}
        <div className="w-1/2 flex flex-col overflow-hidden">
          <div className="px-5 py-3 border-b border-white/10 shrink-0">
            <h2 className="text-lg font-bold">Exchange Request</h2>
            <p className="text-xs text-gray-400">Click an item on the left to add it</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="card p-4">
              <p className="text-sm font-semibold mb-3 text-gray-300">
                Selected Items <span className="ml-2 text-tbh-primary font-bold">{state.selectedItems.length}</span>
              </p>
              {state.selectedItems.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <p className="text-sm">No items selected</p>
                  <p className="text-xs mt-1">Select items from the left panel</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {state.selectedItems.map(item => {
                    const rarity = getRarityStyle(item.name);
                    return (
                      <div key={item.assetId} className="flex items-center gap-2 p-2 rounded-lg" style={{ background: rarity.bg, border: `1px solid ${rarity.border}` }}>
                        <img src={item.iconUrl} alt={item.name} className="w-9 h-9 object-contain rounded shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{item.name}</p>
                          <p className="text-purple-300 font-mono text-xs">{getTbhForItem(item.marketHashName).toFixed(1)} TBH</p>
                        </div>
                        <button onClick={() => removeItem(item.assetId)} className="text-gray-500 hover:text-red-400 text-lg leading-none shrink-0">×</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-white/10 shrink-0"
        style={{ background: 'linear-gradient(90deg,rgba(108,92,231,0.12) 0%,rgba(0,184,148,0.08) 100%)' }}>
        <div>
          <p className="text-xs text-gray-400">Total TBH Tokens</p>
          <p className="text-2xl font-black gradient-text leading-none">{totalTbh.toFixed(1)} TBH
            {rateConfig && <span className="text-xs font-normal text-gray-500 ml-2">Rate: $1 = {rateConfig.usdToTbhRate} TBH</span>}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button onClick={handleSubmit} disabled={submitting || !state.selectedItems.length || !state.walletAddress || totalTbh === 0} className="btn-primary px-8 py-2.5 text-base">
            {submitting ? 'Submitting...' : 'Submit Exchange Request'}
          </button>
          <p className="text-xs text-gray-500">* Approved and transferred after token creation</p>
        </div>
      </div>
    </div>
  );
}
