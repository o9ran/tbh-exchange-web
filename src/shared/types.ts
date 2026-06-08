export interface SteamUser {
  steamId: string;
  displayName: string;
  avatarUrl: string;
  isGuest?: boolean;
}

export interface SteamItem {
  assetId: string;
  classId: string;
  instanceId: string;
  name: string;
  marketHashName: string;
  iconUrl: string;
  tradable: boolean;
  marketable: boolean;
  type: string;
  rarity?: string;
}

export interface MarketPrice {
  marketHashName: string;
  lowestPrice: number;
  medianPrice: number;
  volume: string;
  updatedAt: string;
}

export interface ExchangeRequest {
  id: string;
  steamId: string;
  steamName: string;
  walletAddress: string;
  items: ExchangeRequestItem[];
  totalTbh: number;
  status: 'pending' | 'approved' | 'rejected';
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExchangeRequestItem {
  assetId: string;
  name: string;
  marketHashName: string;
  iconUrl: string;
  tbhAmount: number;
}

export interface RateConfig {
  usdToTbhRate: number;
  minExchangeUsd: number;
  maxExchangeUsd: number;
  updatedAt: string;
}

export interface IpcResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface MarketListing {
  name: string;
  marketHashName: string;
  iconUrl: string;
  lowestPrice: number;
  medianPrice: number;
  volume: string;
  tbhRate: number;
  type?: string;
  rarity?: string;
  nameJa?: string;
  gear?: string;
}

export interface PriceHistoryPoint {
  date: string;
  price: number;
  volume: number;
}
