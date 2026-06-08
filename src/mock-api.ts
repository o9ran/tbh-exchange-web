// Mock implementation of window.electronAPI for the web demo version.
// Replaces Electron IPC with direct API calls + localStorage persistence.

const TEST_USER = {
  steamId: '76561198000000000',
  displayName: 'TBH Demo Player',
  avatarUrl: '',
  isGuest: false,
};

const TEST_WALLET = 'HtqpDWB7DkZ2fN5w7camtwShvykAHYisGniQcjApNtL4';
const TBH_MINT   = '98igMxnGoZiwEmnACxDMjfQ44VfDRgHXhSVXx7RZpump';
// SHA-256 hash of the admin password (do not store plain text)
const ADMIN_HASH = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9';

const DEMO_PRICES: Record<string, number> = {
  'Knight Boots (Arcana) A': 20.88,
  'War Bow (Arcana) A':       4.91,
  'War Bow (Immortal) A':     0.92,
};

const DEMO_INVENTORY = [
  {
    assetId: '1000000', classId: '8000000', instanceId: '0',
    name: 'Knight Boots (Arcana) A', marketHashName: 'Knight Boots (Arcana) A',
    iconUrl: 'https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCSsRGIkg_yUeg1PyCFvFVoQ3LPQ/200x200',
    tradable: true, marketable: true, type: 'Boots - Lv. 15',
  },
  {
    assetId: '1000001', classId: '8000001', instanceId: '0',
    name: 'War Bow (Arcana) A', marketHashName: 'War Bow (Arcana) A',
    iconUrl: 'https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCUs8mTE08yUK-kLyVKbrfk38/200x200',
    tradable: true, marketable: true, type: 'Bow - Lv. 20',
  },
  {
    assetId: '1000002', classId: '8000002', instanceId: '0',
    name: 'War Bow (Immortal) A', marketHashName: 'War Bow (Immortal) A',
    iconUrl: 'https://community.cloudflare.steamstatic.com/economy/image/eBLtYAl6ntbtQ8HLU9Nwq_spna9pYjVMElAg-FGKLvMFaUQ2uz-HsIhCUs8mTE08yUK-kLyVKbrfk38/200x200',
    tradable: true, marketable: true, type: 'Bow - Lv. 20',
  },
];

const DEFAULT_RATE_CONFIG = {
  usdToTbhRate: 100,
  minExchangeUsd: 1,
  maxExchangeUsd: 1000,
  updatedAt: new Date().toISOString(),
};

const STORAGE_KEY = 'tbh_demo_requests';

function getStoredRequests(): any[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}

function saveStoredRequests(reqs: any[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reqs));
}

async function fetchMarketListings(usdToTbhRate: number) {
  const allItems: any[] = [];
  try {
    const first = await fetch('/api/market?page=1');
    if (!first.ok) return [];
    const data = await first.json();
    const total     = data?.total    ?? 0;
    const pageSize  = data?.pageSize ?? 48;
    const totalPages = Math.ceil(total / pageSize);
    const items: any[] = data?.items ?? [];
    parseItems(items, allItems, usdToTbhRate);

    const remaining = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
    for (let i = 0; i < remaining.length; i += 4) {
      const batch = remaining.slice(i, i + 4);
      await Promise.all(batch.map(async page => {
        try {
          const r = await fetch(`/api/market?page=${page}`);
          if (!r.ok) return;
          const d = await r.json();
          parseItems(d?.items ?? [], allItems, usdToTbhRate);
        } catch { /* ignore */ }
      }));
    }
  } catch { /* ignore */ }
  return allItems;
}

function parseItems(items: any[], list: any[], usdToTbhRate: number) {
  for (const item of items) {
    const lowestPrice = (item.sell_price ?? 0) / 100;
    const medianPrice = item.median_price != null ? item.median_price / 100 : 0;
    const iconUrl = item.icon_url
      ? `https://community.cloudflare.steamstatic.com/economy/image/${item.icon_url}/200x200`
      : '';
    list.push({
      name:           item.name,
      marketHashName: item.hash_name,
      iconUrl,
      lowestPrice,
      medianPrice,
      volume:  String(item.sell_listings ?? 0),
      tbhRate: lowestPrice * usdToTbhRate,
      type:    item.type ?? '',
      nameJa:  item.name_ja ?? '',
      gear:    item.gear ?? '',
    });
  }
}

function ok<T>(data: T) { return { success: true, data }; }
function fail(error: string) { return { success: false, error }; }

// Assign to window so existing React components work unchanged
(window as any).electronAPI = {
  getCurrentUser: async () => ok(TEST_USER),

  getInventory: async () => ok(DEMO_INVENTORY),

  getUserInfo: async () => ok({ displayName: TEST_USER.displayName, avatarUrl: '' }),

  getMarketListings: async (_forceRefresh?: boolean) => {
    const items = await fetchMarketListings(DEFAULT_RATE_CONFIG.usdToTbhRate);
    return ok({ items, updatedAt: new Date().toISOString(), fromCache: false, isRefreshing: false });
  },

  getMarketPrice: async (name: string) => ok({
    marketHashName: name,
    lowestPrice: DEMO_PRICES[name] ?? 1.0,
    medianPrice: DEMO_PRICES[name] ?? 1.0,
    volume: '10',
    updatedAt: new Date().toISOString(),
  }),

  getMarketPricesBulk: async (names: string[]) => {
    const results: Record<string, number> = {};
    for (const name of names) {
      results[name] = DEMO_PRICES[name] ?? 1.0;
    }
    return ok(results);
  },

  getPriceHistory: async () => ok([]),

  getRateConfig: async () => ok(DEFAULT_RATE_CONFIG),

  getTokenConfig: async () => ok({
    mintAddress:  TBH_MINT,
    isPlaceholder: false,
    tokenName:    'TBH Token',
    tokenSymbol:  'TBH',
  }),

  getTokenBalance: async () => ok({ balance: 1250.5, isPlaceholder: false }),

  createExchangeRequest: async (payload: any) => {
    const reqs = getStoredRequests();
    if (payload.items.reduce((s: number, i: any) => s + i.tbhAmount, 0) === 0) {
      return fail('Minimum exchange amount is $1');
    }
    const req = {
      id: crypto.randomUUID(),
      steamId:       payload.steamId,
      steamName:     payload.steamName,
      walletAddress: payload.walletAddress,
      items:         payload.items,
      totalTbh:      payload.items.reduce((s: number, i: any) => s + i.tbhAmount, 0),
      status:        'pending',
      createdAt:     new Date().toISOString(),
      updatedAt:     new Date().toISOString(),
    };
    reqs.push(req);
    saveStoredRequests(reqs);
    return ok(req);
  },

  getMyRequests: async (steamId: string) => {
    const reqs = getStoredRequests().filter((r: any) => r.steamId === steamId);
    return ok(reqs);
  },

  adminLogin: async (password: string) => {
    const buf  = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
    const hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    if (hash === ADMIN_HASH) {
      return ok({ token: btoa('admin:' + Date.now()) });
    }
    return fail('Invalid password');
  },

  adminGetAllRequests: async (_token: string) => ok(getStoredRequests()),

  adminUpdateRequestStatus: async (payload: any) => {
    const reqs = getStoredRequests();
    const idx = reqs.findIndex((r: any) => r.id === payload.requestId);
    if (idx >= 0) {
      reqs[idx].status    = payload.status;
      reqs[idx].adminNote = payload.adminNote;
      reqs[idx].updatedAt = new Date().toISOString();
      saveStoredRequests(reqs);
    }
    return ok(null);
  },

  adminUpdateRateConfig: async () => ok(null),

  // Wallet: auto-connect with test address
  openWalletConnect: async () => {},
  onWalletConnected: (cb: (addr: string) => void) => {
    setTimeout(() => cb(TEST_WALLET), 200);
    return () => {};
  },

  // No-ops for Electron-only features
  onImageDownloadProgress: () => () => {},
  toggleMiniMode: async () => {},
  onMinibarTransparency: () => () => {},
  minimizeWindow: async () => {},
  maximizeWindow: async () => {},
  closeWindow: async () => {},
  isMaximized: async () => false,
};
