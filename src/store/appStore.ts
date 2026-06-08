import { useState, useCallback } from 'react';
import type { SteamUser, SteamItem, ExchangeRequest, RateConfig } from '../shared/types';

export type Page = 'home' | 'inventory' | 'market' | 'exchange' | 'history' | 'admin' | 'account';

export interface AppState {
  page: Page;
  steamUser: SteamUser | null;
  walletAddress: string | null;
  inventory: SteamItem[];
  selectedItems: SteamItem[];
  myRequests: ExchangeRequest[];
  rateConfig: RateConfig | null;
  adminToken: string | null;
  loading: boolean;
  error: string | null;
  initError: string | null;
}

const initialState: AppState = {
  page: 'home',
  steamUser: null,
  walletAddress: null,
  inventory: [],
  selectedItems: [],
  myRequests: [],
  rateConfig: null,
  adminToken: null,
  loading: true,
  error: null,
  initError: null,
};

export function useAppStore() {
  const [state, setState] = useState<AppState>(initialState);

  const update = useCallback((partial: Partial<AppState>) => {
    setState(prev => ({ ...prev, ...partial }));
  }, []);

  return { state, update };
}
