import React, { useMemo } from 'react';
import type { PriceHistoryPoint } from '../shared/types';

interface Props { data: PriceHistoryPoint[]; }

const W = 280, H = 140;
const PAD = { top: 10, right: 10, bottom: 24, left: 36 };

export default function PriceChart({ data }: Props) {
  const points = useMemo(() => {
    if (data.length === 0) return [];
    const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const filtered = data.filter(d => new Date(d.date).getTime() >= cutoff);
    return filtered.length > 0 ? filtered : data.slice(-90);
  }, [data]);

  if (points.length === 0) return null;

  const prices = points.map(p => p.price);
  const minP = Math.min(...prices), maxP = Math.max(...prices);
  const range = maxP - minP || 1;
  const chartW = W - PAD.left - PAD.right, chartH = H - PAD.top - PAD.bottom;
  const toX = (i: number) => PAD.left + (i / (points.length - 1)) * chartW;
  const toY = (price: number) => PAD.top + chartH - ((price - minP) / range) * chartH;

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(p.price).toFixed(1)}`).join(' ');
  const areaPath =
    `M${toX(0).toFixed(1)},${(PAD.top + chartH).toFixed(1)} ` +
    points.map((p, i) => `L${toX(i).toFixed(1)},${toY(p.price).toFixed(1)}`).join(' ') +
    ` L${toX(points.length - 1).toFixed(1)},${(PAD.top + chartH).toFixed(1)} Z`;

  const yLabels = [minP, minP + range * 0.5, maxP];
  const xLabels = [
    { i: 0, label: formatDate(points[0].date) },
    { i: Math.floor(points.length / 2), label: formatDate(points[Math.floor(points.length / 2)].date) },
    { i: points.length - 1, label: formatDate(points[points.length - 1].date) },
  ];
  const latest = points[points.length - 1];
  const change = ((latest.price - points[0].price) / points[0].price) * 100;
  const isUp = change >= 0;

  return (
    <div className="card p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-400">Past 90 days</span>
        <span className={`text-xs font-semibold ${isUp ? 'text-green-400' : 'text-red-400'}`}>
          {isUp ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%
        </span>
      </div>
      <svg width={W} height={H} className="overflow-visible">
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6C5CE7" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#6C5CE7" stopOpacity="0" />
          </linearGradient>
        </defs>
        {yLabels.map((v, i) => (
          <g key={i}>
            <line x1={PAD.left} y1={toY(v)} x2={W - PAD.right} y2={toY(v)} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <text x={PAD.left - 4} y={toY(v) + 4} textAnchor="end" fill="#6b7280" fontSize="9">${v.toFixed(2)}</text>
          </g>
        ))}
        <path d={areaPath} fill="url(#areaGrad)" />
        <path d={linePath} fill="none" stroke="#6C5CE7" strokeWidth="1.5" strokeLinejoin="round" />
        <circle cx={toX(points.length - 1)} cy={toY(latest.price)} r="3" fill="#6C5CE7" stroke="white" strokeWidth="1.5" />
        {xLabels.map(({ i, label }) => (
          <text key={i} x={toX(i)} y={H - 4} textAnchor="middle" fill="#6b7280" fontSize="9">{label}</text>
        ))}
      </svg>
      <div className="flex justify-between text-xs mt-1">
        <span className="text-gray-500">Low: <span className="text-green-400">${minP.toFixed(2)}</span></span>
        <span className="text-gray-500">High: <span className="text-red-400">${maxP.toFixed(2)}</span></span>
        <span className="text-gray-500">Current: <span className="text-white">${latest.price.toFixed(2)}</span></span>
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
