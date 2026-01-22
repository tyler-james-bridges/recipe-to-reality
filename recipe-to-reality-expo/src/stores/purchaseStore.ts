import { create } from 'zustand';

import storage from '../utils/storage';
import { FREE_EXTRACTION_LIMIT, PREMIUM_ENTITLEMENT } from '../types';

const EXTRACTIONS_KEY = 'recipe_extractions_count';

// RevenueCat API Keys from environment variables
const REVENUECAT_IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || '';
const REVENUECAT_ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || '';

// Check if RevenueCat native module is available (not available in Expo Go)
let Purchases: typeof import('react-native-purchases').default | null = null;
let isRevenueCatAvailable = false;

try {
  // Dynamic require to avoid crash if native module isn't available
  const RNPurchases = require('react-native-purchases');
  Purchases = RNPurchases.default;
  isRevenueCatAvailable = true;
} catch (e) {
  console.log('RevenueCat not available (running in Expo Go). Purchases disabled.');
  isRevenueCatAvailable = false;
}

// Types for when RevenueCat isn't available
interface CustomerInfo {
  entitlements: {
    active: Record<string, unknown>;
  };
}

interface PurchasesOfferings {
  current: {
    availablePackages: PurchasesPackage[];
  } | null;
}

interface PurchasesPackage {
  identifier: string;
  packageType: string;
  product: {
    title: string;
    priceString: string;
  };
}

interface PurchaseState {
  customerInfo: CustomerInfo | null;
  offerings: PurchasesOfferings | null;
  isPremium: boolean;
  extractionsUsed: number;
  isLoading: boolean;
  error: string | null;
  isRevenueCatAvailable: boolean;

  // Computed
  canExtract: boolean;
  remainingFreeExtractions: number;

  // Actions
  initialize: () => Promise<void>;
  fetchCustomerInfo: () => Promise<void>;
  fetchOfferings: () => Promise<void>;
  purchase: (pkg: PurchasesPackage) => Promise<void>;
  restorePurchases: () => Promise<void>;
  recordExtraction: () => Promise<void>;
  resetExtractionCount: () => Promise<void>;
}

export const usePurchaseStore = create<PurchaseState>((set, get) => ({
  customerInfo: null,
  offerings: null,
  isPremium: false,
  extractionsUsed: 0,
  isLoading: false,
  error: null,
  isRevenueCatAvailable,

  get canExtract() {
    const state = get();
    return state.isPremium || state.extractionsUsed < FREE_EXTRACTION_LIMIT;
  },

  get remainingFreeExtractions() {
    const state = get();
    return Math.max(0, FREE_EXTRACTION_LIMIT - state.extractionsUsed);
  },

  initialize: async () => {
    try {
      // Load extraction count from storage first
      const storedCount = await storage.getItemAsync(EXTRACTIONS_KEY);
      if (storedCount) {
        set({ extractionsUsed: parseInt(storedCount, 10) });
      }

      // Skip RevenueCat if not available (Expo Go)
      if (!isRevenueCatAvailable || !Purchases) {
        console.log('Skipping RevenueCat initialization (not available)');
        return;
      }

      // Configure RevenueCat
      const apiKey = process.env.EXPO_OS === 'ios' ? REVENUECAT_IOS_KEY : REVENUECAT_ANDROID_KEY;

      if (!apiKey) {
        console.warn('RevenueCat API key not configured. Set EXPO_PUBLIC_REVENUECAT_IOS_KEY or EXPO_PUBLIC_REVENUECAT_ANDROID_KEY in your .env file.');
        return;
      }

      await Purchases.configure({ apiKey });

      // Fetch initial data
      await Promise.all([get().fetchCustomerInfo(), get().fetchOfferings()]);
    } catch (error) {
      console.error('Failed to initialize purchases:', error);
      set({ error: (error as Error).message });
    }
  },

  fetchCustomerInfo: async () => {
    if (!isRevenueCatAvailable || !Purchases) return;

    try {
      const customerInfo = await Purchases.getCustomerInfo();
      const isPremium = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT] !== undefined;

      set({ customerInfo: customerInfo as CustomerInfo, isPremium, error: null });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  fetchOfferings: async () => {
    if (!isRevenueCatAvailable || !Purchases) {
      set({ isLoading: false });
      return;
    }

    set({ isLoading: true });
    try {
      const offerings = await Purchases.getOfferings();
      set({ offerings: offerings as PurchasesOfferings, isLoading: false, error: null });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  purchase: async (pkg) => {
    if (!isRevenueCatAvailable || !Purchases) {
      throw new Error('Purchases not available in Expo Go. Build a development client to test purchases.');
    }

    set({ isLoading: true, error: null });
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg as any);
      const isPremium = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT] !== undefined;

      set({ customerInfo: customerInfo as CustomerInfo, isPremium, isLoading: false });
    } catch (error: unknown) {
      const purchaseError = error as { userCancelled?: boolean };
      if (purchaseError.userCancelled) {
        // User cancelled, not an error
        set({ isLoading: false });
        return;
      }
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  restorePurchases: async () => {
    if (!isRevenueCatAvailable || !Purchases) {
      throw new Error('Purchases not available in Expo Go. Build a development client to test purchases.');
    }

    set({ isLoading: true, error: null });
    try {
      const customerInfo = await Purchases.restorePurchases();
      const isPremium = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT] !== undefined;

      set({ customerInfo: customerInfo as CustomerInfo, isPremium, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  recordExtraction: async () => {
    const newCount = get().extractionsUsed + 1;
    await storage.setItemAsync(EXTRACTIONS_KEY, newCount.toString());
    set({ extractionsUsed: newCount });
  },

  resetExtractionCount: async () => {
    await storage.setItemAsync(EXTRACTIONS_KEY, '0');
    set({ extractionsUsed: 0 });
  },
}));
