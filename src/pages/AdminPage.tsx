import React, { useState, useEffect } from 'react';
import { useApp } from '../App';
import type { ExchangeRequest, RateConfig } from '../shared/types';

const statusConfig = {
  pending:  { label: 'Pending',  color: 'bg-yellow-900/50 text-yellow-300 border-yellow-700' },
  approved: { label: 'Approved', color: 'bg-green-900/50 text-green-300 border-green-700' },
  rejected: { label: 'Rejected', color: 'bg-red-900/50 text-red-300 border-red-700' },
};

export default function AdminPage() {
  const { state, update } = useApp();
  const [password, setPassword] = useState('');
  const [token, setToken]       = useState(state.adminToken || '');
  const [loginError, setLoginError] = useState('');
  const [requests, setRequests] = useState<ExchangeRequest[]>([]);
  const [rateConfig, setRateConfig] = useState<RateConfig | null>(null);
  const [loading, setLoading]   = useState(false);
  const [activeTab, setActiveTab] = useState<'requests' | 'rates'>('requests');
  const [filter, setFilter]     = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});
  const [rateForm, setRateForm] = useState({ usdToTbhRate: 100, minExchangeUsd: 1, maxExchangeUsd: 1000 });
  const [rateSaved, setRateSaved] = useState(false);

  const isLoggedIn = !!token;

  useEffect(() => { if (isLoggedIn) loadData(); }, [token]);

  const handleLogin = async () => {
    setLoginError('');
    const res = await window.electronAPI.adminLogin(password);
    if (res.success) { setToken(res.data.token); update({ adminToken: res.data.token }); }
    else { setLoginError('Incorrect password'); }
  };

  const loadData = async () => {
    setLoading(true);
    const [reqRes, rateRes] = await Promise.all([
      window.electronAPI.adminGetAllRequests(token),
      window.electronAPI.getRateConfig(),
    ]);
    if (reqRes.success) setRequests(reqRes.data);
    if (rateRes.success) { setRateConfig(rateRes.data); setRateForm({ usdToTbhRate: rateRes.data.usdToTbhRate, minExchangeUsd: rateRes.data.minExchangeUsd, maxExchangeUsd: rateRes.data.maxExchangeUsd }); }
    setLoading(false);
  };

  const handleUpdateStatus = async (requestId: string, status: 'approved' | 'rejected') => {
    const res = await window.electronAPI.adminUpdateRequestStatus({ token, requestId, status, adminNote: noteInputs[requestId] || undefined });
    if (res.success) setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status, adminNote: noteInputs[requestId] } : r));
    else update({ error: res.error });
  };

  const handleSaveRates = async () => {
    const res = await window.electronAPI.adminUpdateRateConfig({ token, ...rateForm });
    if (res.success) { setRateSaved(true); setTimeout(() => setRateSaved(false), 2000); loadData(); }
    else update({ error: res.error });
  };

  const filteredRequests = requests.filter(r => filter === 'all' || r.status === filter);
  const pendingCount = requests.filter(r => r.status === 'pending').length;

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">🔐</div>
            <h2 className="text-2xl font-bold">Admin Login</h2>
          </div>
          <div className="card p-6 space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Admin Password</label>
              <input type="password" className="input-field" placeholder="Password" value={password}
                onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            </div>
            {loginError && <p className="text-sm text-red-400">{loginError}</p>}
            <button onClick={handleLogin} className="btn-primary w-full py-3">Login</button>
          </div>
          <div className="text-center mt-4">
            <button onClick={() => update({ page: 'home' })} className="text-sm text-gray-400 hover:text-white">← Back</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Admin Dashboard</h2>
          {pendingCount > 0 && <p className="text-yellow-400 text-sm mt-0.5">⚠️ Pending review: {pendingCount}</p>}
        </div>
        <div className="flex gap-2">
          <button onClick={loadData} disabled={loading} className="btn-primary">Refresh</button>
          <button onClick={() => { setToken(''); update({ adminToken: null, page: 'home' }); }} className="btn-danger">Logout</button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total',    value: requests.length, color: 'text-white' },
          { label: 'Pending',  value: pendingCount, color: 'text-yellow-300' },
          { label: 'Approved', value: requests.filter(r => r.status === 'approved').length, color: 'text-green-300' },
          { label: 'Total TBH', value: requests.filter(r => r.status === 'approved').reduce((s, r) => s + r.totalTbh, 0).toFixed(0), color: 'text-purple-300' },
        ].map(stat => (
          <div key={stat.label} className="card p-4 text-center">
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-4">
        {(['requests', 'rates'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab ? 'bg-tbh-primary text-white' : 'text-gray-400 hover:bg-white/10'}`}>
            {tab === 'requests' ? '📋 Exchange Requests' : '⚙️ Rate Settings'}
          </button>
        ))}
      </div>

      {activeTab === 'requests' && (
        <>
          <div className="flex gap-2 mb-4">
            {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${filter === f ? 'bg-white/20 text-white' : 'text-gray-400 hover:bg-white/10'}`}>
                {{ all: 'All', pending: 'Pending', approved: 'Approved', rejected: 'Rejected' }[f]}
                {f !== 'all' && <span className="ml-1 text-gray-500">({requests.filter(r => r.status === f).length})</span>}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="text-gray-400 text-center py-8">Loading...</p>
          ) : filteredRequests.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No requests found</p>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map(req => {
                const status = statusConfig[req.status];
                return (
                  <div key={req.id} className="card p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`status-badge border ${status.color}`}>{status.label}</span>
                          <span className="font-semibold">{req.steamName}</span>
                          <span className="text-purple-300 font-bold">{req.totalTbh.toFixed(1)} TBH</span>
                        </div>
                        <p className="text-xs text-gray-400 font-mono truncate">Wallet: {req.walletAddress}</p>
                        <p className="text-xs text-gray-500 mt-1">{req.items.length} items · {new Date(req.createdAt).toLocaleString('en-US')}</p>
                        <div className="flex gap-1.5 mt-2 flex-wrap">
                          {req.items.slice(0, 5).map(item => (
                            <div key={item.assetId} className="flex items-center gap-1 bg-white/5 rounded px-2 py-1">
                              <img src={item.iconUrl} alt={item.name} className="w-5 h-5 object-contain" />
                              <span className="text-xs truncate max-w-24">{item.name}</span>
                              <span className="text-xs text-purple-300">{item.tbhAmount.toFixed(0)}</span>
                            </div>
                          ))}
                          {req.items.length > 5 && <span className="text-xs text-gray-500 py-1">+{req.items.length - 5} more</span>}
                        </div>
                        {req.adminNote && <p className="text-xs text-blue-300 mt-2">Note: {req.adminNote}</p>}
                      </div>
                      {req.status === 'pending' && (
                        <div className="shrink-0 flex flex-col gap-2">
                          <input type="text" className="input-field text-xs py-1" placeholder="Admin note (optional)"
                            value={noteInputs[req.id] || ''} onChange={e => setNoteInputs(prev => ({ ...prev, [req.id]: e.target.value }))} />
                          <div className="flex gap-2">
                            <button onClick={() => handleUpdateStatus(req.id, 'approved')} className="btn-secondary text-xs py-1.5 flex-1">✓ Approve</button>
                            <button onClick={() => handleUpdateStatus(req.id, 'rejected')} className="btn-danger text-xs py-1.5 flex-1">✗ Reject</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {activeTab === 'rates' && (
        <div className="card p-6 max-w-md">
          <h3 className="font-semibold mb-4">Exchange Rate Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">$1 = ? TBH</label>
              <input type="number" className="input-field" value={rateForm.usdToTbhRate} onChange={e => setRateForm(prev => ({ ...prev, usdToTbhRate: Number(e.target.value) }))} min="1" />
              <p className="text-xs text-gray-500 mt-1">Steam market price × this rate = TBH awarded</p>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Minimum Exchange (USD)</label>
              <input type="number" className="input-field" value={rateForm.minExchangeUsd} onChange={e => setRateForm(prev => ({ ...prev, minExchangeUsd: Number(e.target.value) }))} min="0" step="0.1" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Maximum Exchange (USD)</label>
              <input type="number" className="input-field" value={rateForm.maxExchangeUsd} onChange={e => setRateForm(prev => ({ ...prev, maxExchangeUsd: Number(e.target.value) }))} min="1" />
            </div>
            <button onClick={handleSaveRates} className="btn-primary w-full">{rateSaved ? '✓ Saved!' : 'Save Settings'}</button>
          </div>
          {rateConfig && <div className="mt-4 pt-4 border-t border-white/10 text-xs text-gray-500">Last updated: {new Date(rateConfig.updatedAt).toLocaleString('en-US')}</div>}
        </div>
      )}
    </div>
  );
}
