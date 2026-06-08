import React, { useState, useEffect } from 'react';
import { useApp } from '../App';

function PersonIcon() {
  return <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" className="text-gray-300"><circle cx="12" cy="7" r="4" /><path d="M12 13c-5 0-8 2.5-8 4v1h16v-1c0-1.5-3-4-8-4z" /></svg>;
}

function SolanaIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 128 128" fill="none">
      <defs><linearGradient id="solGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#9945FF"/><stop offset="100%" stopColor="#14F195"/></linearGradient></defs>
      <rect x="16" y="28" width="96" height="12" rx="4" fill="url(#solGrad)"/>
      <rect x="16" y="58" width="96" height="12" rx="4" fill="url(#solGrad)"/>
      <rect x="16" y="88" width="96" height="12" rx="4" fill="url(#solGrad)"/>
    </svg>
  );
}

function SteamIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-gray-300"><path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.606 0 11.979 0z"/></svg>;
}

export default function AccountPage() {
  const { state, update } = useApp();
  const [walletInput, setWalletInput] = useState(state.walletAddress ?? '');
  const [walletSaved, setWalletSaved] = useState(false);
  const [walletError, setWalletError] = useState('');

  useEffect(() => { setWalletInput(state.walletAddress ?? ''); }, [state.walletAddress]);

  const saveWallet = () => {
    setWalletError('');
    const addr = walletInput.trim();
    if (addr.length < 32 || addr.length > 44) { setWalletError('Please enter a valid Solana address (32–44 characters)'); return; }
    update({ walletAddress: addr });
    setWalletSaved(true);
    setTimeout(() => setWalletSaved(false), 2000);
  };

  const clearWallet = () => { setWalletInput(''); update({ walletAddress: null }); };
  const isLinked = (val: string | null | undefined) => val && val.length > 0;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-xl mx-auto p-6">

        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'rgba(255,255,255,0.08)', border: '2px solid rgba(108,92,231,0.4)' }}>
            {state.steamUser?.avatarUrl ? (
              <img src={state.steamUser.avatarUrl} alt="avatar" className="w-full h-full rounded-full object-cover" />
            ) : <PersonIcon />}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{state.steamUser?.displayName ?? 'Account Settings'}</h2>
            <p className="text-sm text-gray-400 mt-0.5">Demo user — URL access only</p>
          </div>
        </div>

        {/* Status cards */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="card p-3 flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${isLinked(state.walletAddress) ? 'bg-green-400' : 'bg-gray-600'}`} />
            <div>
              <p className="text-xs text-gray-400">Solana Wallet</p>
              <p className="text-xs font-medium text-white">{isLinked(state.walletAddress) ? '✅ Connected' : 'Not connected'}</p>
            </div>
          </div>
          <div className="card p-3 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <div>
              <p className="text-xs text-gray-400">Steam Account</p>
              <p className="text-xs font-medium text-white">✅ Demo Player</p>
            </div>
          </div>
        </div>

        {/* Wallet card */}
        <div className="card p-5 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg,#9945FF,#14F195)' }}>
              <SolanaIcon />
            </div>
            <div>
              <h3 className="font-bold text-white">Solana Wallet</h3>
              <p className="text-xs text-gray-400">Address to receive TBH tokens</p>
            </div>
            {isLinked(state.walletAddress) && <span className="ml-auto text-xs bg-green-900/40 text-green-400 border border-green-700/30 px-2 py-0.5 rounded-full">Connected</span>}
          </div>

          {isLinked(state.walletAddress) && (
            <div className="mb-3 p-3 rounded-lg flex items-center justify-between" style={{ background: 'rgba(20,241,149,0.06)', border: '1px solid rgba(20,241,149,0.2)' }}>
              <p className="text-xs font-mono text-green-300 break-all">{state.walletAddress}</p>
              <button onClick={clearWallet} className="ml-3 text-gray-500 hover:text-red-400 text-xs shrink-0 transition-colors">Remove</button>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">{isLinked(state.walletAddress) ? 'Change address' : 'Enter wallet address'}</label>
              <input type="text" className="input-field font-mono text-sm" placeholder="Solana public key (e.g. 7xKX...)"
                value={walletInput} onChange={e => setWalletInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveWallet()} />
            </div>
            {walletError && <p className="text-xs text-red-400">{walletError}</p>}
            <button onClick={saveWallet} className="btn-primary w-full">{walletSaved ? '✅ Saved!' : 'Link Wallet'}</button>
          </div>
        </div>

        {/* Steam demo card */}
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(23,26,33,1)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <SteamIcon />
            </div>
            <div>
              <h3 className="font-bold text-white">Steam Account</h3>
              <p className="text-xs text-gray-400">Demo user (auto-connected)</p>
            </div>
            <span className="ml-auto text-xs bg-green-900/40 text-green-400 border border-green-700/30 px-2 py-0.5 rounded-full">Connected</span>
          </div>
          <div className="p-3 rounded-lg flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white">{state.steamUser?.displayName}</p>
              <p className="text-xs font-mono text-gray-400">{state.steamUser?.steamId}</p>
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-3">This is a demo account. In the full app, you can link your real Steam account.</p>
        </div>

      </div>
    </div>
  );
}
