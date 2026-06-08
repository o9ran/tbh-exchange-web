import React from 'react';
import type { Page } from '../store/appStore';
import { useApp } from '../App';

function IconMarket() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}

function IconExchange() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 16V4m0 0L3 8m4-4l4 4" />
      <path d="M17 8v12m0 0l4-4m-4 4l-4-4" />
    </svg>
  );
}

function IconInventory() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="9" height="9" rx="1.5" />
      <rect x="13" y="3" width="9" height="9" rx="1.5" />
      <rect x="2" y="13" width="9" height="9" rx="1.5" />
      <rect x="13" y="13" width="9" height="9" rx="1.5" />
    </svg>
  );
}

function IconHistory() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

interface NavBtnProps {
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
  title: string;
}

function NavBtn({ icon, active, onClick, title }: NavBtnProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="relative w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200"
      style={{
        background: active ? 'rgba(108,92,231,0.18)' : 'transparent',
        border: active ? '1px solid rgba(108,92,231,0.45)' : '1px solid transparent',
        color: active ? '#a78bfa' : 'rgba(156,163,175,0.7)',
        boxShadow: active ? '0 0 12px rgba(108,92,231,0.25)' : 'none',
      }}
      onMouseEnter={e => {
        if (!active) {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(108,92,231,0.1)';
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(108,92,231,0.25)';
          (e.currentTarget as HTMLButtonElement).style.color = '#c4b5fd';
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent';
          (e.currentTarget as HTMLButtonElement).style.color = 'rgba(156,163,175,0.7)';
        }
      }}
    >
      {icon}
      {active && (
        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 rounded-full"
          style={{ width: '16px', height: '2px', background: '#8b5cf6', boxShadow: '0 0 6px #8b5cf6' }} />
      )}
    </button>
  );
}

function Separator() {
  return (
    <div className="flex items-center mx-1.5 gap-0.5">
      <div style={{ width: '1px', height: '14px', background: 'rgba(108,92,231,0.5)' }} />
      <div style={{ width: '1px', height: '8px', background: 'rgba(108,92,231,0.25)' }} />
    </div>
  );
}

interface Props {
  currentPage: Page;
  navigateTo: (page: Page) => void;
}

export default function TopNav({ currentPage, navigateTo }: Props) {
  const { state } = useApp();

  return (
    <div
      className="relative flex items-center justify-center shrink-0 select-none"
      style={{
        height: '52px',
        background: 'linear-gradient(180deg, #080812 0%, #0d0d20 100%)',
        borderBottom: '1px solid rgba(108,92,231,0.2)',
      }}
    >
      <div className="absolute inset-x-0 top-0 glow-line-h" />

      {/* Logo */}
      <div className="absolute left-4 flex items-center gap-2">
        <div className="w-6 h-6 rounded flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg, #6C5CE7, #00B894)' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="9" y1="13" x2="15" y2="13" />
            <line x1="9" y1="17" x2="11" y2="17" />
          </svg>
        </div>
        <span className="font-bold text-xs tracking-widest uppercase" style={{ color: 'rgba(167,139,250,0.7)', letterSpacing: '0.15em' }}>
          TBH PROJECT
        </span>
        <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
          style={{ background: 'rgba(20,241,149,0.12)', color: '#14F195', border: '1px solid rgba(20,241,149,0.3)', fontSize: '9px' }}>
          DEMO
        </span>
      </div>

      {/* Nav */}
      <div className="flex items-center gap-1">
        <NavBtn icon={<IconMarket />}    active={currentPage === 'market'}    onClick={() => navigateTo('market')}    title="Market" />
        <NavBtn icon={<IconExchange />}  active={currentPage === 'exchange'}  onClick={() => navigateTo('exchange')}  title="Trade" />

        <Separator />

        {/* HOME button */}
        <div
          className="mx-1"
          onClick={() => navigateTo('home')}
          title="Home"
          style={{
            cursor: 'pointer',
            filter: currentPage === 'home'
              ? 'drop-shadow(0 0 8px rgba(167,139,250,0.9)) drop-shadow(0 0 18px rgba(108,92,231,0.55))'
              : 'none',
            transform: currentPage === 'home' ? 'scale(1.08)' : 'scale(1)',
            transition: 'filter 0.25s, transform 0.2s',
          }}
          onMouseEnter={e => {
            if (currentPage !== 'home') {
              (e.currentTarget as HTMLDivElement).style.filter = 'drop-shadow(0 0 6px rgba(167,139,250,0.5))';
              (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.04)';
            }
          }}
          onMouseLeave={e => {
            if (currentPage !== 'home') {
              (e.currentTarget as HTMLDivElement).style.filter = 'none';
              (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)';
            }
          }}
        >
          <div style={{
            width: '42px', height: '36px',
            clipPath: 'polygon(8% 0%, 92% 0%, 100% 100%, 0% 100%)',
            background: currentPage === 'home'
              ? 'linear-gradient(180deg,#c4b5fd 0%,#8b5cf6 55%,#5b21b6 100%)'
              : 'linear-gradient(180deg,#7a6bb8 0%,#5244a0 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', overflow: 'hidden', transition: 'background 0.2s',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '45%', background: 'linear-gradient(180deg,rgba(255,255,255,0.18) 0%,transparent 100%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: 0, left: '10%', right: '10%', height: '1.5px', background: currentPage === 'home' ? 'linear-gradient(90deg,transparent,rgba(20,241,149,1) 50%,transparent)' : 'linear-gradient(90deg,transparent,rgba(20,241,149,0.3) 50%,transparent)' }} />
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ color: currentPage === 'home' ? '#f5f0ff' : '#b8aee8', position: 'relative', zIndex: 1, transition: 'color 0.2s' }}>
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
        </div>

        <Separator />

        <NavBtn icon={<IconInventory />} active={currentPage === 'inventory'} onClick={() => navigateTo('inventory')} title="Inventory" />
        <NavBtn icon={<IconHistory />}   active={currentPage === 'history'}   onClick={() => navigateTo('history')}   title="History" />
      </div>

      {/* Account button */}
      <button
        onClick={() => navigateTo('account')}
        title={state.steamUser?.displayName ?? 'Account'}
        className="absolute right-4 flex items-center gap-2 px-3 h-8 rounded-lg transition-all duration-200"
        style={{
          background: currentPage === 'account' ? 'rgba(108,92,231,0.2)' : 'rgba(255,255,255,0.05)',
          border: currentPage === 'account' ? '1px solid rgba(108,92,231,0.5)' : '1px solid rgba(255,255,255,0.1)',
          color: currentPage === 'account' ? '#a78bfa' : 'rgba(156,163,175,0.8)',
        }}
        onMouseEnter={e => {
          if (currentPage !== 'account') {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(108,92,231,0.12)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(108,92,231,0.3)';
            (e.currentTarget as HTMLButtonElement).style.color = '#c4b5fd';
          }
        }}
        onMouseLeave={e => {
          if (currentPage !== 'account') {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.1)';
            (e.currentTarget as HTMLButtonElement).style.color = 'rgba(156,163,175,0.8)';
          }
        }}
      >
        <IconUser />
        <span className="text-xs font-medium" style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {state.steamUser?.displayName ?? 'Account'}
        </span>
      </button>
    </div>
  );
}
