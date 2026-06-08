import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useApp } from '../App';
import type { MarketListing, PriceHistoryPoint } from '../shared/types';
import PriceChart from '../components/PriceChart';

type SortKey = 'name' | 'lowestPrice' | 'volume' | 'tbhRate';
type SortDir = 'asc' | 'desc';
type ViewMode = 'grid' | 'list';

function getRarity(name: string): string {
  const m = name.match(/\((Arcana|Immortal|Legendary|Rare|Uncommon)\)/);
  return m ? m[1] : 'Common';
}
function getLevel(type: string): number | null {
  const m = type?.match(/Lv\. (\d+)/);
  return m ? parseInt(m[1]) : null;
}

const GEAR_GROUPS = [
  { label: 'Weapons', gears: ['Sword','Axe','Hatchet','Bow','Crossbow','Staff','Scepter','Orb','Tome','Bolt','Arrow'] },
  { label: 'Armor',   gears: ['Helmet','Armor','Gloves','Boots','Shield','Bracer'] },
  { label: 'Accessories', gears: ['Amulet','Ring','Earing'] },
  { label: 'Materials',   gears: ['Crafting Material','Decoration Material','Engraving Material','Inscription Material','Offering Material'] },
  { label: 'Special', gears: ['Soulstone'] },
];

const RARITIES = [
  { key: 'Arcana',    color: '#a78bfa', bg: 'rgba(167,139,250,0.15)', border: 'rgba(167,139,250,0.4)' },
  { key: 'Immortal',  color: '#f87171', bg: 'rgba(248,113,113,0.15)', border: 'rgba(248,113,113,0.4)' },
  { key: 'Legendary', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)',  border: 'rgba(251,191,36,0.4)'  },
  { key: 'Rare',      color: '#60a5fa', bg: 'rgba(96,165,250,0.15)',  border: 'rgba(96,165,250,0.4)'  },
  { key: 'Uncommon',  color: '#4ade80', bg: 'rgba(74,222,128,0.15)',  border: 'rgba(74,222,128,0.4)'  },
  { key: 'Common',    color: '#9ca3af', bg: 'rgba(156,163,175,0.12)', border: 'rgba(156,163,175,0.3)' },
];

const LEVELS = [1,5,10,15,20,25,30,35,40,45,50,55,60,65,70,75,80,85,90];

const TYPE_COLORS: Record<string, string> = {
  'Decoration Material': 'bg-blue-900/60 text-blue-300 border-blue-700/40',
  'Equipment':           'bg-purple-900/60 text-purple-300 border-purple-700/40',
  'Weapon':              'bg-red-900/60 text-red-300 border-red-700/40',
  'Armor':               'bg-slate-700/60 text-slate-300 border-slate-600/40',
  'Accessory':           'bg-yellow-900/60 text-yellow-300 border-yellow-700/40',
};
const typeColor = (t: string) => TYPE_COLORS[t] ?? 'bg-white/10 text-gray-400 border-white/10';

export default function MarketPage() {
  const { update } = useApp();
  const [listings, setListings]             = useState<MarketListing[]>([]);
  const [loading, setLoading]               = useState(false);
  const [isRefreshing, setIsRefreshing]     = useState(false);
  const [loadingMsg, setLoadingMsg]         = useState('');
  const [error, setError]                   = useState('');
  const [lastUpdated, setLastUpdated]       = useState<Date | null>(null);
  const [nextUpdateTime, setNextUpdateTime] = useState<number | null>(null);
  const [sortKey, setSortKey]               = useState<SortKey>('volume');
  const [sortDir, setSortDir]               = useState<SortDir>('desc');
  const [viewMode, setViewMode]             = useState<ViewMode>('grid');
  const [selected, setSelected]             = useState<MarketListing | null>(null);
  const [history, setHistory]               = useState<PriceHistoryPoint[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [page, setPage]                     = useState(0);
  const [search, setSearch]                 = useState('');
  const [showAdvanced, setShowAdvanced]     = useState(false);
  const [selectedGears, setSelectedGears]       = useState<Set<string>>(new Set());
  const [selectedRarities, setSelectedRarities] = useState<Set<string>>(new Set());
  const [selectedLevels, setSelectedLevels]     = useState<Set<number>>(new Set());

  const PAGE_SIZE = viewMode === 'grid' ? 24 : 30;
  const CACHE_TTL = 10 * 60 * 1000;
  const isFetchingRef = useRef(false);

  useEffect(() => { doLoadListings(false); }, []);

  useEffect(() => {
    if (!nextUpdateTime) return;
    const timer = setInterval(() => {
      if (Date.now() >= nextUpdateTime) { clearInterval(timer); doBackgroundRefresh(); }
    }, 30000);
    return () => clearInterval(timer);
  }, [nextUpdateTime]);

  const doLoadListings = async (force: boolean) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true); setError(''); setLoadingMsg('Fetching data...');
    try {
      const res = await (window.electronAPI.getMarketListings as any)(force, (partial: any[]) => {
        // Show page-1 results immediately while remaining pages load in background
        setListings([...partial]);
        setLoading(false);
        setLoadingMsg('');
      });
      if (res.success) {
        setListings(res.data.items ?? res.data);
        const updatedAt = new Date(res.data.updatedAt ?? Date.now());
        setLastUpdated(updatedAt);
        setNextUpdateTime(updatedAt.getTime() + CACHE_TTL);
        setPage(0);
      } else { setError(res.error || 'Failed to fetch data'); }
    } catch (e: any) { setError(e.message); }
    setLoading(false); isFetchingRef.current = false;
  };

  const doBackgroundRefresh = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true; setIsRefreshing(true);
    try {
      const res = await window.electronAPI.getMarketListings(true);
      if (res.success) {
        setListings(res.data.items ?? res.data);
        const updatedAt = new Date(res.data.updatedAt ?? Date.now());
        setLastUpdated(updatedAt); setNextUpdateTime(updatedAt.getTime() + CACHE_TTL);
      }
    } catch { }
    setIsRefreshing(false); isFetchingRef.current = false;
  };

  const loadHistory = async (item: MarketListing) => {
    setSelected(item); setHistory([]); setHistoryLoading(true);
    const res = await window.electronAPI.getPriceHistory(item.marketHashName);
    if (res.success) setHistory(res.data);
    setHistoryLoading(false);
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir(key === 'name' ? 'asc' : 'desc'); }
    setPage(0);
  };

  const toggleGear    = (g: string) => { setSelectedGears(prev => { const n = new Set(prev); n.has(g) ? n.delete(g) : n.add(g); return n; }); setPage(0); };
  const toggleRarity  = (r: string) => { setSelectedRarities(prev => { const n = new Set(prev); n.has(r) ? n.delete(r) : n.add(r); return n; }); setPage(0); };
  const toggleLevel   = (lv: number) => { setSelectedLevels(prev => { const n = new Set(prev); n.has(lv) ? n.delete(lv) : n.add(lv); return n; }); setPage(0); };
  const clearAllFilters = () => { setSearch(''); setSelectedGears(new Set()); setSelectedRarities(new Set()); setSelectedLevels(new Set()); setPage(0); };

  const activeFilterCount = selectedGears.size + selectedRarities.size + selectedLevels.size;

  const filtered = useMemo(() => {
    let list = listings.filter(item => {
      if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (selectedGears.size > 0 && !selectedGears.has(item.gear ?? '')) return false;
      if (selectedRarities.size > 0 && !selectedRarities.has(getRarity(item.name))) return false;
      if (selectedLevels.size > 0) { const lv = getLevel(item.type ?? ''); if (lv === null || !selectedLevels.has(lv)) return false; }
      return true;
    });
    list.sort((a, b) => {
      const va = sortKey === 'volume' ? parseInt(a.volume, 10) : (a[sortKey] as any);
      const vb = sortKey === 'volume' ? parseInt(b.volume, 10) : (b[sortKey] as any);
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [listings, search, selectedGears, selectedRarities, selectedLevels, sortKey, sortDir]);

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const stats = useMemo(() => {
    if (!listings.length) return null;
    const prices = listings.filter(l => l.lowestPrice > 0).map(l => l.lowestPrice);
    return {
      total:       listings.length,
      avgPrice:    prices.reduce((a, b) => a + b, 0) / prices.length,
      maxPrice:    Math.max(...prices),
      totalVolume: listings.reduce((a, l) => a + (parseInt(l.volume, 10) || 0), 0),
    };
  }, [listings]);

  const SortBtn = ({ col, label }: { col: SortKey; label: string }) => (
    <button onClick={() => handleSort(col)}
      className={`flex items-center gap-1 text-xs transition-colors whitespace-nowrap ${sortKey === col ? 'text-white font-semibold' : 'text-gray-400 hover:text-white'}`}>
      {label}{sortKey === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
    </button>
  );

  const GridCard = ({ item }: { item: MarketListing }) => (
    <div onClick={() => loadHistory(item)}
      className={`card p-3 cursor-pointer transition-all duration-150 hover:border-white/30 hover:bg-white/5 hover:-translate-y-0.5 ${selected?.marketHashName === item.marketHashName ? 'border-tbh-primary bg-tbh-primary/10' : ''}`}>
      <div className="flex justify-center mb-2.5">
        {item.iconUrl
          ? <img src={item.iconUrl} alt={item.name} className="w-16 h-16 object-contain" loading="lazy" style={{ imageRendering: 'pixelated' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          : <div className="w-16 h-16 bg-white/10 rounded flex items-center justify-center text-gray-600 text-2xl">?</div>}
      </div>
      <p className="text-xs font-semibold text-center leading-tight mb-0.5 line-clamp-1" title={item.name}>{item.name}</p>
      {item.nameJa && <p className="text-xs text-gray-400 text-center leading-tight mb-1 line-clamp-1">{item.nameJa}</p>}
      {item.type && (
        <div className="flex justify-center mb-2">
          <span className={`text-xs px-1.5 py-0.5 rounded-full border ${typeColor(item.type)} truncate max-w-full`} style={{ fontSize: '10px' }}>{item.type}</span>
        </div>
      )}
      <div className="border-t border-white/10 pt-2 mt-1 space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-gray-500" style={{ fontSize: '10px' }}>Lowest</span>
          <span className="text-green-400 font-mono font-bold text-xs">{item.lowestPrice > 0 ? `$${item.lowestPrice.toFixed(2)}` : '—'}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-500" style={{ fontSize: '10px' }}>Volume</span>
          <span className="text-gray-300 text-xs">{parseInt(item.volume, 10).toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-500" style={{ fontSize: '10px' }}>TBH value</span>
          <span className="text-purple-300 font-mono text-xs">{item.tbhRate > 0 ? item.tbhRate.toFixed(1) : '—'}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="px-4 pt-3 pb-0 border-b border-white/10 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold">TBH Market</h2>
              {listings.length > 0 && !loading && (
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(108,92,231,0.2)', color: '#a78bfa' }}>
                  {filtered.length.toLocaleString()} / {listings.length.toLocaleString()} items
                </span>
              )}
              {isRefreshing && <span className="text-xs text-yellow-400 animate-pulse">Refreshing...</span>}
              {nextUpdateTime && !isRefreshing && <CountdownBadge nextUpdateTime={nextUpdateTime} />}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex border border-white/15 rounded-lg overflow-hidden">
                <button onClick={() => setViewMode('grid')} className={`px-2.5 py-1.5 transition-colors ${viewMode === 'grid' ? 'bg-tbh-primary/80 text-white' : 'text-gray-400 hover:bg-white/10'}`}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><rect x="0" y="0" width="6" height="6" rx="1"/><rect x="10" y="0" width="6" height="6" rx="1"/><rect x="0" y="10" width="6" height="6" rx="1"/><rect x="10" y="10" width="6" height="6" rx="1"/></svg>
                </button>
                <button onClick={() => setViewMode('list')} className={`px-2.5 py-1.5 transition-colors ${viewMode === 'list' ? 'bg-tbh-primary/80 text-white' : 'text-gray-400 hover:bg-white/10'}`}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><rect x="0" y="1" width="16" height="2" rx="1"/><rect x="0" y="7" width="16" height="2" rx="1"/><rect x="0" y="13" width="16" height="2" rx="1"/></svg>
                </button>
              </div>
              <button onClick={() => doLoadListings(true)} disabled={loading || isRefreshing} className="btn-primary text-xs py-1.5 px-3">
                {loading || isRefreshing ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>

          {stats && !loading && (
            <div className="grid grid-cols-4 gap-2 mb-2">
              {[
                { label: 'Total Items',   value: stats.total.toLocaleString(),       color: 'text-white' },
                { label: 'Avg Price',     value: `$${stats.avgPrice.toFixed(2)}`,    color: 'text-green-400' },
                { label: 'Highest Price', value: `$${stats.maxPrice.toFixed(2)}`,    color: 'text-yellow-400' },
                { label: 'Total Volume',  value: stats.totalVolume.toLocaleString(), color: 'text-purple-300' },
              ].map(s => (
                <div key={s.label} className="card p-2 text-center">
                  <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 mb-2">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input type="text" className="input-field pl-8 text-sm py-2" placeholder="Search by item name..."
                value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
              {search && (
                <button onClick={() => { setSearch(''); setPage(0); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              )}
            </div>
            <button onClick={() => setShowAdvanced(v => !v)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shrink-0"
              style={{ background: showAdvanced ? 'rgba(108,92,231,0.25)' : 'rgba(255,255,255,0.05)', border: showAdvanced ? '1px solid rgba(108,92,231,0.5)' : '1px solid rgba(255,255,255,0.12)', color: showAdvanced ? '#a78bfa' : '#9ca3af' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
              </svg>
              Advanced
              {activeFilterCount > 0 && <span className="flex items-center justify-center w-4 h-4 rounded-full text-white font-bold" style={{ fontSize: '10px', background: '#6C5CE7' }}>{activeFilterCount}</span>}
            </button>
            {(activeFilterCount > 0 || search) && (
              <button onClick={clearAllFilters} className="text-xs text-gray-500 hover:text-red-400 transition-colors px-2 shrink-0">Clear</button>
            )}
            {viewMode === 'list' && (
              <div className="flex items-center gap-2 shrink-0 ml-1">
                <SortBtn col="lowestPrice" label="Price" />
                <SortBtn col="volume" label="Volume" />
                <SortBtn col="tbhRate" label="TBH" />
              </div>
            )}
          </div>

          {showAdvanced && (
            <div className="mb-2 rounded-xl p-4 space-y-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(108,92,231,0.2)' }}>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Category</p>
                <div className="space-y-2">
                  {GEAR_GROUPS.map(group => (
                    <div key={group.label}>
                      <p className="text-xs text-gray-600 mb-1">{group.label}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {group.gears.map(gear => {
                          const active = selectedGears.has(gear);
                          return (
                            <button key={gear} onClick={() => toggleGear(gear)} className="text-xs px-2.5 py-1 rounded-md transition-all duration-150"
                              style={{ background: active ? 'rgba(108,92,231,0.3)' : 'rgba(255,255,255,0.05)', border: active ? '1px solid rgba(108,92,231,0.6)' : '1px solid rgba(255,255,255,0.1)', color: active ? '#c4b5fd' : '#9ca3af', fontWeight: active ? 600 : 400 }}>
                              {gear}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="glow-line-h" />
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Rarity</p>
                <div className="flex flex-wrap gap-2">
                  {RARITIES.map(r => {
                    const active = selectedRarities.has(r.key);
                    return (
                      <button key={r.key} onClick={() => toggleRarity(r.key)} className="text-xs px-3 py-1 rounded-md transition-all duration-150 font-medium"
                        style={{ background: active ? r.bg : 'rgba(255,255,255,0.04)', border: `1px solid ${active ? r.border : 'rgba(255,255,255,0.1)'}`, color: active ? r.color : '#9ca3af', boxShadow: active ? `0 0 8px ${r.bg}` : 'none' }}>
                        {r.key}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="glow-line-h" />
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Level</p>
                <div className="flex flex-wrap gap-1.5">
                  {LEVELS.map(lv => {
                    const active = selectedLevels.has(lv);
                    return (
                      <button key={lv} onClick={() => toggleLevel(lv)} className="text-xs w-10 py-1 rounded-md transition-all duration-150 text-center font-mono"
                        style={{ background: active ? 'rgba(0,184,148,0.25)' : 'rgba(255,255,255,0.05)', border: active ? '1px solid rgba(0,184,148,0.5)' : '1px solid rgba(255,255,255,0.1)', color: active ? '#34d399' : '#9ca3af', fontWeight: active ? 600 : 400 }}>
                        {lv}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-1.5 pb-2">
              {Array.from(selectedGears).map(g => <FilterTag key={g} label={g} onRemove={() => toggleGear(g)} />)}
              {Array.from(selectedRarities).map(r => <FilterTag key={r} label={r} onRemove={() => toggleRarity(r)} color={RARITIES.find(x => x.key === r)?.color} />)}
              {Array.from(selectedLevels).sort((a,b) => a-b).map(lv => <FilterTag key={lv} label={`Lv.${lv}`} onRemove={() => toggleLevel(lv)} color="#34d399" />)}
            </div>
          )}
        </div>

        {error && (
          <div className="mx-4 mt-3 card p-3 text-sm text-red-300 shrink-0" style={{ border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)' }}>{error}</div>
        )}

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg,#6C5CE7,#00B894)', boxShadow: '0 0 24px rgba(108,92,231,0.4)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
              </div>
              <p className="text-white font-medium mb-1">{loadingMsg}</p>
              <p className="text-gray-500 text-xs">Fetching all items from TBH Market...</p>
            </div>
          </div>
        ) : listings.length === 0 && !error ? (
          <div className="flex-1 flex items-center justify-center"><div className="text-center text-gray-500"><p className="text-3xl mb-3">📦</p><p>No data available</p></div></div>
        ) : viewMode === 'grid' ? (
          <>
            <div className="flex-1 overflow-y-auto p-4">
              {filtered.length === 0
                ? <div className="text-center py-16 text-gray-500">No items match your filters</div>
                : <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">{paged.map(item => <GridCard key={item.marketHashName} item={item} />)}</div>}
            </div>
            {totalPages > 1 && <Paging page={page} totalPages={totalPages} total={filtered.length} pageSize={PAGE_SIZE} setPage={setPage} />}
          </>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10" style={{ background: '#0f0f1a' }}>
                  <tr className="border-b border-white/10 text-xs">
                    <th className="px-4 py-2.5 text-left font-medium"><SortBtn col="name" label="Item Name" /></th>
                    <th className="px-3 py-2.5 text-left text-gray-500">Type</th>
                    <th className="px-3 py-2.5 text-right font-medium"><SortBtn col="lowestPrice" label="Lowest" /></th>
                    <th className="px-3 py-2.5 text-right font-medium"><SortBtn col="volume" label="Volume" /></th>
                    <th className="px-4 py-2.5 text-right font-medium"><SortBtn col="tbhRate" label="TBH" /></th>
                  </tr>
                </thead>
                <tbody>
                  {paged.length === 0
                    ? <tr><td colSpan={5} className="text-center py-16 text-gray-500">No items match your filters</td></tr>
                    : paged.map(item => (
                      <tr key={item.marketHashName} onClick={() => loadHistory(item)}
                        className={`border-b border-white/5 cursor-pointer transition-colors hover:bg-white/5 ${selected?.marketHashName === item.marketHashName ? 'bg-tbh-primary/10' : ''}`}>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2.5">
                            {item.iconUrl ? <img src={item.iconUrl} alt={item.name} className="w-8 h-8 object-contain rounded shrink-0" loading="lazy" style={{ imageRendering: 'pixelated' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} /> : <div className="w-8 h-8 bg-white/10 rounded shrink-0" />}
                            <span className="font-medium truncate max-w-[200px]" title={item.name}>{item.name}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">{item.type && <span className={`text-xs px-2 py-0.5 rounded-full border whitespace-nowrap ${typeColor(item.type)}`}>{item.type}</span>}</td>
                        <td className="px-3 py-2.5 text-right"><span className="text-green-400 font-mono font-medium">{item.lowestPrice > 0 ? `$${item.lowestPrice.toFixed(2)}` : '—'}</span></td>
                        <td className="px-3 py-2.5 text-right text-gray-300">{parseInt(item.volume, 10).toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-right"><span className="text-purple-300 font-mono text-xs">{item.tbhRate > 0 ? `${item.tbhRate.toFixed(1)} TBH` : '—'}</span></td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && <Paging page={page} totalPages={totalPages} total={filtered.length} pageSize={PAGE_SIZE} setPage={setPage} />}
          </>
        )}
      </div>

      {/* Right detail panel */}
      <div className="w-64 shrink-0 border-l border-white/10 flex flex-col overflow-hidden">
        {selected ? (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="text-center mb-3">
              {selected.iconUrl && <img src={selected.iconUrl} alt={selected.name} className="w-24 h-24 object-contain mx-auto mb-2" style={{ imageRendering: 'pixelated' }} />}
              <h3 className="font-bold text-sm leading-tight">{selected.name}</h3>
              {selected.nameJa && <p className="text-xs text-gray-400 mt-0.5">{selected.nameJa}</p>}
              <div className="flex flex-wrap justify-center gap-1 mt-1.5">
                {selected.type && <span className={`text-xs px-2 py-0.5 rounded-full border ${typeColor(selected.type)}`}>{selected.type}</span>}
                {selected.rarity && <span className="text-xs px-2 py-0.5 rounded-full bg-tbh-accent/20 text-tbh-accent border border-tbh-accent/30">{selected.rarity}</span>}
              </div>
            </div>
            <div className="space-y-1.5 mb-3">
              <div className="card p-2.5 flex justify-between items-center"><span className="text-xs text-gray-400">Lowest</span><span className="text-green-400 font-bold font-mono text-sm">{selected.lowestPrice > 0 ? `$${selected.lowestPrice.toFixed(2)}` : '—'}</span></div>
              {selected.medianPrice > 0 && <div className="card p-2.5 flex justify-between items-center"><span className="text-xs text-gray-400">Median</span><span className="text-blue-300 font-mono text-sm">${selected.medianPrice.toFixed(2)}</span></div>}
              <div className="card p-2.5 flex justify-between items-center"><span className="text-xs text-gray-400">TBH value</span><span className="text-purple-300 font-bold font-mono text-sm">{selected.tbhRate > 0 ? `${selected.tbhRate.toFixed(1)} TBH` : '—'}</span></div>
              <div className="card p-2.5 flex justify-between items-center"><span className="text-xs text-gray-400">Volume</span><span className="font-medium text-sm">{parseInt(selected.volume, 10).toLocaleString()}</span></div>
            </div>
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs text-gray-400">Price History (90 days)</span>
                {historyLoading && <span className="text-xs text-yellow-400 animate-pulse">Fetching...</span>}
              </div>
              {history.length > 0 ? <PriceChart data={history} /> : historyLoading ? <div className="card h-24 flex items-center justify-center"><p className="text-xs text-gray-500 animate-pulse">Loading...</p></div> : <div className="card h-24 flex items-center justify-center"><p className="text-xs text-gray-500">No history data</p></div>}
            </div>
            <button onClick={() => update({ page: 'exchange' })} className="btn-primary w-full text-sm">Go to Exchange</button>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center text-gray-500">
              <svg className="mx-auto mb-2 opacity-30" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="11" y2="17"/></svg>
              <p className="text-xs leading-relaxed">Click an item to view<br />details and price history</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterTag({ label, onRemove, color }: { label: string; onRemove: () => void; color?: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
      style={{ background: 'rgba(108,92,231,0.15)', border: '1px solid rgba(108,92,231,0.35)', color: color ?? '#a78bfa' }}>
      {label}
      <button onClick={onRemove} className="hover:text-white transition-colors leading-none">
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </span>
  );
}

function CountdownBadge({ nextUpdateTime }: { nextUpdateTime: number }) {
  const [text, setText] = useState('');
  useEffect(() => {
    const tick = () => {
      const r = nextUpdateTime - Date.now();
      if (r <= 0) { setText('Updating soon'); return; }
      const m = Math.floor(r / 60000), s = Math.floor((r % 60000) / 1000);
      setText(`Update in ${m}:${s.toString().padStart(2, '0')}`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [nextUpdateTime]);
  return <span className="text-xs text-gray-600">{text}</span>;
}

function Paging({ page, totalPages, total, pageSize, setPage }: { page: number; totalPages: number; total: number; pageSize: number; setPage: (n: number) => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-2 border-t border-white/10 shrink-0">
      <p className="text-xs text-gray-500">{(page * pageSize + 1).toLocaleString()}–{Math.min((page + 1) * pageSize, total).toLocaleString()} of {total.toLocaleString()}</p>
      <div className="flex items-center gap-1">
        <button onClick={() => setPage(0)} disabled={page === 0} className="px-2 py-1 rounded text-xs bg-white/8 hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed">«</button>
        <button onClick={() => setPage(page - 1)} disabled={page === 0} className="px-3 py-1 rounded text-xs bg-white/8 hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed">Prev</button>
        <span className="text-xs text-gray-400 px-2">{page + 1} / {totalPages}</span>
        <button onClick={() => setPage(page + 1)} disabled={page >= totalPages - 1} className="px-3 py-1 rounded text-xs bg-white/8 hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed">Next</button>
        <button onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1} className="px-2 py-1 rounded text-xs bg-white/8 hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed">»</button>
      </div>
    </div>
  );
}
