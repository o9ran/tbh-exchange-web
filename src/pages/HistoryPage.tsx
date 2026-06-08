import React, { useEffect, useState } from 'react';
import { useApp } from '../App';
import type { ExchangeRequest } from '../shared/types';

const statusConfig = {
  pending:  { label: 'Pending',  color: 'bg-yellow-900/50 text-yellow-300 border-yellow-700' },
  approved: { label: 'Approved', color: 'bg-green-900/50 text-green-300 border-green-700' },
  rejected: { label: 'Rejected', color: 'bg-red-900/50 text-red-300 border-red-700' },
};

export default function HistoryPage() {
  const { state, update } = useApp();
  const [requests, setRequests] = useState<ExchangeRequest[]>([]);
  const [loading, setLoading]   = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => { loadRequests(); }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const res = await window.electronAPI.getMyRequests(state.steamUser!.steamId);
      if (res.success) setRequests(res.data);
      else update({ error: res.error });
    } catch (e: any) { update({ error: e.message }); }
    finally { setLoading(false); }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Request History</h2>
        <button onClick={loadRequests} disabled={loading} className="btn-primary">
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><p className="text-gray-400">Loading...</p></div>
      ) : requests.length === 0 ? (
        <div className="flex items-center justify-center h-40">
          <div className="text-center"><div className="text-4xl mb-3">📋</div><p className="text-gray-400">No requests found</p></div>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(req => {
            const status = statusConfig[req.status];
            const isExpanded = expanded === req.id;
            return (
              <div key={req.id} className="card overflow-hidden">
                <div className="p-4 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => setExpanded(isExpanded ? null : req.id)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`status-badge border ${status.color}`}>{status.label}</span>
                      <span className="font-semibold text-purple-300">{req.totalTbh.toFixed(1)} TBH</span>
                      <span className="text-gray-400 text-sm">{req.items.length} items</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500">{new Date(req.createdAt).toLocaleDateString('en-US')}</span>
                      <span className="text-gray-400">{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500 font-mono truncate">Wallet: {req.walletAddress}</div>
                </div>
                {isExpanded && (
                  <div className="border-t border-white/10 p-4 bg-white/2">
                    {req.adminNote && (
                      <div className="mb-3 p-3 rounded-lg bg-blue-900/30 border border-blue-700/30">
                        <p className="text-xs text-blue-300">Admin note: {req.adminNote}</p>
                      </div>
                    )}
                    <div className="space-y-2">
                      {req.items.map(item => (
                        <div key={item.assetId} className="flex items-center gap-3">
                          <img src={item.iconUrl} alt={item.name} className="w-8 h-8 object-contain rounded" />
                          <span className="flex-1 text-sm truncate">{item.name}</span>
                          <span className="text-sm text-purple-300">{item.tbhAmount.toFixed(1)} TBH</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 pt-3 border-t border-white/10 text-xs text-gray-500">Request ID: {req.id}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
