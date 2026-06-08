import React from 'react';

interface Props { message?: string; error?: string; }

export default function LoadingScreen({ message, error }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f0f1a' }}>
      <div className="text-center">
        <div className="flex items-center justify-center mb-6">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#6C5CE7,#00B894)', boxShadow: '0 0 32px rgba(108,92,231,0.5)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 16V4m0 0L3 8m4-4l4 4" />
              <path d="M17 8v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </div>
        </div>
        <h1 className="text-2xl font-bold gradient-text mb-1 tracking-wide">TBH PROJECT</h1>
        {error ? (
          <div className="max-w-sm mx-auto mt-4">
            <div className="rounded-xl p-4 text-sm text-red-300 text-left"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
              <p className="font-semibold mb-1 text-red-400">Startup Error</p>
              <p>{error}</p>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-sm animate-pulse mt-2">{message || 'Loading...'}</p>
        )}
      </div>
    </div>
  );
}
