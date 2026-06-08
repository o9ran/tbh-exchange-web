import React from 'react';

interface Props { message: string; onClose: () => void; }

export default function ErrorBanner({ message, onClose }: Props) {
  return (
    <div className="flex items-center justify-between px-4 py-2 text-sm text-red-300"
      style={{ background: 'rgba(239,68,68,0.08)', borderBottom: '1px solid rgba(239,68,68,0.2)' }}>
      <span>{message}</span>
      <button onClick={onClose} className="ml-4 text-red-400 hover:text-red-300">✕</button>
    </div>
  );
}
