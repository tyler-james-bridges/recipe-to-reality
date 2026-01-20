import { create } from 'zustand';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases, { CustomerInfo, PurchasesOfferings, PurchasesPackage } from 'react-native-purchases';
import { FREE_EXTRACTION_LIMIT, PREMIUM_ENTITLEMENT } from '../types';

const EXTRACTIONS_KEY = 'recipe_extractions_count';

// RevenueCat API Keys - Replace with your actual keys
const REVENUECAT_IOS_KEY = 'your_ios_key_here';
const REVENUECAT_ANDROID_KEY = 'your_android_key_here';

interface PurchaseState {
  customerInfo: CustomerInfo | null;
  offerings: PurchasesOfferings | null;
  isPremium: boolean;
  extractionsUsed: number;
  isLoading: boolean;
  error: string | null;

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
      // Configure RevenueCat
      const apiKey = Platform.OS === 'ios' ? REVENUECAT_IOS_KEY : REVENUECAT_ANDROID_KEY;

      await Purchases.configure({ apiKey });

      // Load extraction count from storage
      const storedCount = await AsyncStorage.getItem(EXTRACTIONS_KEY);
      if (storedCount) {
        set({ extractionsUsed: parseInt(storedCount, 10) });
      }

      // Fetch initial data
      await Promise.all([get().fetchCustomerInfo(), get().fetchOfferings()]);
    } catch (error) {
      console.error('Failed to initialize purchases:', error);
      set({ error: (error as Error).message });
    }
  },

  fetchCustomerInfo: async () => {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      const isPremium = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT] !== undefined;

      set({ customerInfo, isPremium, error: null });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  fetchOfferings: async () => {
    set({ isLoading: true });
    try {
      const offerings = await Purchases.getOfferings();
      set({ offerings, isLoading: false, error: null });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  purchase: async (pkg) => {
    set({ isLoading: true, error: null });
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const isPremium = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT] !== undefined;

      set({ customerInfo, isPremium, isLoading: false });
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
    set({ isLoading: true, error: null });
    try {
      const customerInfo = await Purchases.restorePurchases();
      const isPremium = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT] !== undefined;

      set({ customerInfo, isPremium, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  recordExtraction: async () => {
    const newCount = get().extractionsUsed + 1;
    await AsyncStorage.setItem(EXTRACTIONS_KEY, newCount.toString());
    set({ extractionsUsed: newCount });
  },

  resetExtractionCount: async () => {
    await AsyncStorage.setItem(EXTRACTIONS_KEY, '0');
    set({ extractionsUsed: 0 });
  },
}));
