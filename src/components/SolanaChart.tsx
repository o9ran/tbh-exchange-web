import React, { useEffect, useState, useRef, useMemo } from 'react';

interface PricePoint { time: number; price: number; }

interface TokenConfig {
  mintAddress: string;
  isPlaceholder: boolean;
  tokenName: string;
  tokenSymbol: string;
}

interface DexData {
  price: number;
  priceChange24h: number;
  volume24h: number;
  liquidity: number;
  pairName: string;
  dexId: string;
}

type TimeFrame = '1m' | '10m' | '1h' | '1d' | '1w' | '1M' | 'all';

const TIMEFRAMES: { label: TimeFrame; cgDays: number; cgInterval: string; desc: string }[] = [
  { label: '1m',  cgDays: 0.05, cgInterval: 'minutely', desc: '1 min' },
  { label: '10m', cgDays: 0.5,  cgInterval: 'minutely', desc: '10 min' },
  { label: '1h',  cgDays: 1,    cgInterval: 'minutely', desc: '1 hour' },
  { label: '1d',  cgDays: 7,    cgInterval: 'hourly',   desc: '1 day' },
  { label: '1w',  cgDays: 30,   cgInterval: 'hourly',   desc: '1 week' },
  { label: '1M',  cgDays: 90,   cgInterval: 'daily',    desc: '1 month' },
  { label: 'all', cgDays: 365,  cgInterval: 'daily',    desc: 'All' },
];

function downsample(data: PricePoint[], maxPoints: number): PricePoint[] {
  if (data.length <= maxPoints) return data;
  const step = Math.ceil(data.length / maxPoints);
  return data.filter((_, i) => i % step === 0 || i === data.length - 1);
}

export default function TokenChart() {
  const [config, setConfig]           = useState<TokenConfig | null>(null);
  const [dexData, setDexData]         = useState<DexData | null>(null);
  const [history, setHistory]         = useState<PricePoint[]>([]);
  const [liveHistory, setLiveHistory] = useState<PricePoint[]>([]);
  const [timeframe, setTimeframe]     = useState<TimeFrame>('1d');
  const [loading, setLoading]         = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    init();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  useEffect(() => {
    if (!config) return;
    fetchHistory(timeframe, config);
  }, [timeframe, config]);

  const init = async () => {
    const res = await window.electronAPI.getTokenConfig();
    if (!res.success) return;
    const cfg: TokenConfig = res.data;
    setConfig(cfg);
    await fetchDexPrice(cfg.mintAddress);
    intervalRef.current = setInterval(() => fetchDexPrice(cfg.mintAddress), 10000);
  };

  const fetchDexPrice = async (mintAddress: string) => {
    try {
      const res  = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mintAddress}`);
      const data = await res.json();
      const pairs = data.pairs ?? [];
      if (!pairs.length) return;
      const best = [...pairs].sort((a: any, b: any) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];
      const price = parseFloat(best.priceUsd ?? '0');
      setDexData({
        price,
        priceChange24h: best.priceChange?.h24 ?? 0,
        volume24h:      best.volume?.h24 ?? 0,
        liquidity:      best.liquidity?.usd ?? 0,
        pairName:       best.baseToken?.symbol + '/' + best.quoteToken?.symbol,
        dexId:          best.dexId ?? '',
      });
      setLiveHistory(prev => [...prev.slice(-999), { time: Date.now(), price }]);
      setLastUpdated(new Date());
    } catch { /* ignore */ }
  };

  const fetchHistory = async (tf: TimeFrame, cfg: TokenConfig) => {
    setLoading(true);
    const found = TIMEFRAMES.find(t => t.label === tf)!;
    if (cfg.isPlaceholder) {
      try {
        const url = `https://api.coingecko.com/api/v3/coins/solana/market_chart?vs_currency=usd&days=${found.cgDays}&interval=${found.cgInterval}`;
        const res  = await fetch(url);
        const data = await res.json();
        const pts: PricePoint[] = (data.prices ?? []).map(([t, p]: [number, number]) => ({ time: t, price: p }));
        setHistory(pts);
      } catch { /* ignore */ }
    } else {
      setHistory([]);
    }
    setLoading(false);
  };

  const displayData = useMemo(() => {
    let data: PricePoint[];
    if (config?.isPlaceholder) {
      if (dexData && history.length > 0) {
        data = [...history.slice(0, -1), { time: Date.now(), price: dexData.price }];
      } else {
        data = history;
      }
    } else {
      data = liveHistory;
    }
    return downsample(data, 300);
  }, [history, liveHistory, dexData, config]);

  const isUp = (dexData?.priceChange24h ?? 0) >= 0;

  return (
    <div className="card flex flex-col h-full overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="px-4 pt-3 pb-2 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
            style={{ background: config?.isPlaceholder ? 'linear-gradient(135deg,#9945FF,#14F195)' : 'linear-gradient(135deg,#6C5CE7,#00B894)' }}>
            <span className="text-white font-black" style={{ fontSize: '11px' }}>
              {config?.isPlaceholder ? '◎' : '⚔'}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-white">{config?.tokenName ?? '---'}</span>
              {config?.isPlaceholder && (
                <span className="text-xs bg-yellow-900/40 text-yellow-500 border border-yellow-700/30 px-1 py-0 rounded" style={{ fontSize: '9px' }}>Placeholder</span>
              )}
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-gray-600" style={{ fontSize: '9px' }}>LIVE</span>
              </div>
            </div>
            {lastUpdated && (
              <p className="text-gray-600" style={{ fontSize: '9px' }}>
                Updated {lastUpdated.toLocaleTimeString('en-US')}
              </p>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-xl font-black text-white">
            {dexData ? `$${dexData.price < 0.01 ? dexData.price.toFixed(4) : dexData.price.toFixed(2)}` : '---'}
          </p>
          {dexData && (
            <p className={`text-xs font-semibold ${isUp ? 'text-green-400' : 'text-red-400'}`}>
              {isUp ? '▲' : '▼'}{Math.abs(dexData.priceChange24h).toFixed(2)}%
            </p>
          )}
        </div>
      </div>

      {dexData && (
        <div className="px-4 py-1 border-b border-white/5 flex items-center gap-3 flex-wrap">
          {[
            { label: 'DEX',       value: dexData.dexId,              color: 'text-gray-300' },
            { label: '24h Vol',   value: fmt(dexData.volume24h, true), color: 'text-blue-300' },
            { label: 'Liquidity', value: fmt(dexData.liquidity, true), color: 'text-green-300' },
            { label: 'Pair',      value: dexData.pairName,            color: 'text-gray-300' },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-1">
              <span className="text-gray-600" style={{ fontSize: '9px' }}>{s.label}</span>
              <span className={`font-medium capitalize ${s.color}`} style={{ fontSize: '10px' }}>{s.value}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 px-2 pt-1 min-h-0">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-xs text-gray-500 animate-pulse">Loading chart...</p>
          </div>
        ) : displayData.length > 1 ? (
          <MiniLineChart data={displayData} isUp={isUp} />
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-xs text-gray-500">
              {config?.isPlaceholder ? 'Fetching data...' : 'Accumulating data (updates every 10s)'}
            </p>
          </div>
        )}
      </div>

      <div className="px-3 py-2 border-t border-white/10 flex items-center gap-1">
        {TIMEFRAMES.map(tf => (
          <button key={tf.label} onClick={() => setTimeframe(tf.label)} title={tf.desc}
            className="relative px-2 py-0.5 rounded transition-all duration-150"
            style={{
              fontSize: '11px',
              fontWeight: timeframe === tf.label ? '700' : '400',
              color: timeframe === tf.label ? '#fff' : '#6b7280',
              background: timeframe === tf.label ? 'rgba(108,92,231,0.3)' : 'transparent',
              border: `1px solid ${timeframe === tf.label ? 'rgba(108,92,231,0.6)' : 'transparent'}`,
            }}>
            {tf.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1 text-gray-600" style={{ fontSize: '9px' }}>
          <span>DexScreener</span>
          {config?.isPlaceholder && <span>/ CoinGecko</span>}
        </div>
      </div>
    </div>
  );
}

function fmt(v: number, isDollar = false): string {
  const prefix = isDollar ? '$' : '';
  if (v >= 1e9) return prefix + (v / 1e9).toFixed(2) + 'B';
  if (v >= 1e6) return prefix + (v / 1e6).toFixed(2) + 'M';
  if (v >= 1e3) return prefix + (v / 1e3).toFixed(1) + 'K';
  return prefix + v.toFixed(0);
}

function MiniLineChart({ data, isUp }: { data: PricePoint[]; isUp: boolean }) {
  const W = 500, H = 100;
  const PAD = { top: 6, right: 8, bottom: 16, left: 48 };
  const cW = W - PAD.left - PAD.right, cH = H - PAD.top - PAD.bottom;
  const prices = data.map(d => d.price);
  const minP = Math.min(...prices), maxP = Math.max(...prices);
  const range = maxP - minP || minP * 0.01 || 1;
  const toX = (i: number) => PAD.left + (i / (data.length - 1)) * cW;
  const toY = (p: number) => PAD.top + cH - ((p - minP) / range) * cH;
  const color = isUp ? '#14F195' : '#ef4444';
  const line = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(d.price).toFixed(1)}`).join(' ');
  const area = `M${toX(0).toFixed(1)},${(PAD.top + cH).toFixed(1)} ` +
    data.map((d, i) => `L${toX(i).toFixed(1)},${toY(d.price).toFixed(1)}`).join(' ') +
    ` L${toX(data.length - 1).toFixed(1)},${(PAD.top + cH).toFixed(1)} Z`;
  const fmtPrice = (p: number) => p < 0.001 ? p.toFixed(6) : p < 1 ? p.toFixed(3) : p < 1000 ? p.toFixed(1) : (p / 1000).toFixed(1) + 'k';
  const yLabels = [minP, (minP + maxP) / 2, maxP];
  const xPts = [0, Math.floor(data.length / 2), data.length - 1];
  const fmtTime = (t: number) => {
    const d = new Date(t);
    const diff = Date.now() - t;
    if (diff < 3600000 * 24) return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="cGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {yLabels.map((v, i) => (
        <g key={i}>
          <line x1={PAD.left} y1={toY(v)} x2={W - PAD.right} y2={toY(v)} stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="3,3" />
          <text x={PAD.left - 3} y={toY(v) + 3} textAnchor="end" fill="#4b5563" fontSize="8">${fmtPrice(v)}</text>
        </g>
      ))}
      <path d={area} fill="url(#cGrad)" />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx={toX(data.length - 1)} cy={toY(data[data.length - 1].price)} r="2.5" fill={color} stroke="#0f0f1a" strokeWidth="1.5" />
      {xPts.map(idx => (
        <text key={idx} x={toX(idx)} y={H - 2} textAnchor="middle" fill="#4b5563" fontSize="7.5">
          {fmtTime(data[idx].time)}
        </text>
      ))}
    </svg>
  );
}
