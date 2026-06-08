import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAppStore, AppState } from './store/appStore';
import type { Page } from './store/appStore';
import HomePage from './pages/HomePage';
import AccountPage from './pages/AccountPage';
import InventoryPage from './pages/InventoryPage';
import MarketPage from './pages/MarketPage';
import ExchangePage from './pages/ExchangePage';
import HistoryPage from './pages/HistoryPage';
import AdminPage from './pages/AdminPage';
import TopNav from './components/TopNav';
import ErrorBanner from './components/ErrorBanner';
import LoadingScreen from './components/LoadingScreen';

interface AppContextType {
  state: AppState;
  update: (partial: Partial<AppState>) => void;
}

export const AppContext = createContext<AppContextType>({} as AppContextType);
export const useApp = () => useContext(AppContext);

export default function App() {
  const { state, update } = useAppStore();

  useEffect(() => {
    (async () => {
      update({ loading: true });
      const res = await window.electronAPI.getCurrentUser();
      if (res.success) {
        update({
          steamUser: {
            steamId:     res.data.steamId,
            displayName: res.data.displayName,
            avatarUrl:   res.data.avatarUrl,
            isGuest:     res.data.isGuest,
          },
          page:    'home',
          loading: false,
        });
      } else {
        update({ loading: false, initError: res.error });
      }
    })();
  }, []);

  const navigateTo = (page: Page) => update({ page, error: null });

  const renderPage = () => {
    switch (state.page) {
      case 'home':      return <HomePage />;
      case 'inventory': return <InventoryPage />;
      case 'market':    return <MarketPage />;
      case 'exchange':  return <ExchangePage />;
      case 'history':   return <HistoryPage />;
      case 'admin':     return <AdminPage />;
      case 'account':   return <AccountPage />;
      default:          return <HomePage />;
    }
  };

  if (state.loading) return <LoadingScreen message="Loading demo..." />;
  if (state.initError) return <LoadingScreen error={state.initError} />;

  return (
    <AppContext.Provider value={{ state, update }}>
      <div className="flex flex-col h-screen bg-tbh-darker text-white overflow-hidden">
        <TopNav currentPage={state.page} navigateTo={navigateTo} />
        <main className="flex-1 overflow-auto">
          {state.error && <ErrorBanner message={state.error} onClose={() => update({ error: null })} />}
          {renderPage()}
        </main>
      </div>
    </AppContext.Provider>
  );
}
