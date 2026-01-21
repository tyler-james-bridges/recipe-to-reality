import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AIProviderType } from '../types';
import { initializeDatabase, sqliteDB } from '../db/client';

const SETTINGS_KEYS = {
  HAPTIC_FEEDBACK: 'settings_haptic_feedback',
  AI_PROVIDER: 'settings_ai_provider',
  NOTIFICATIONS_ENABLED: 'settings_notifications_enabled',
  REMINDER_TIME_HOUR: 'settings_reminder_time_hour',
  REMINDER_TIME_MINUTE: 'settings_reminder_time_minute',
  HAS_COMPLETED_ONBOARDING: 'settings_has_completed_onboarding',
};

interface SettingsState {
  hapticFeedback: boolean;
  aiProvider: AIProviderType;
  notificationsEnabled: boolean;
  reminderTimeHour: number;
  reminderTimeMinute: number;
  isLoading: boolean;
  dbInitialized: boolean;
  hasCompletedOnboarding: boolean;

  // Actions
  loadSettings: () => Promise<void>;
  setHapticFeedback: (enabled: boolean) => Promise<void>;
  setAIProvider: (provider: AIProviderType) => Promise<void>;
  setNotificationsEnabled: (enabled: boolean) => Promise<void>;
  setReminderTime: (hour: number, minute: number) => Promise<void>;
  setHasCompletedOnboarding: (completed: boolean) => Promise<void>;
  initializeApp: () => Promise<void>;
  clearAllData: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  hapticFeedback: true,
  aiProvider: 'openai',
  notificationsEnabled: true,
  reminderTimeHour: 18, // Default 6:00 PM
  reminderTimeMinute: 0,
  isLoading: true,
  dbInitialized: false,
  hasCompletedOnboarding: false,

  loadSettings: async () => {
    try {
      const [haptic, provider, notifications, reminderHour, reminderMinute, hasOnboarded] = await Promise.all([
        AsyncStorage.getItem(SETTINGS_KEYS.HAPTIC_FEEDBACK),
        AsyncStorage.getItem(SETTINGS_KEYS.AI_PROVIDER),
        AsyncStorage.getItem(SETTINGS_KEYS.NOTIFICATIONS_ENABLED),
        AsyncStorage.getItem(SETTINGS_KEYS.REMINDER_TIME_HOUR),
        AsyncStorage.getItem(SETTINGS_KEYS.REMINDER_TIME_MINUTE),
        AsyncStorage.getItem(SETTINGS_KEYS.HAS_COMPLETED_ONBOARDING),
      ]);

      set({
        hapticFeedback: haptic !== 'false',
        aiProvider: (provider as AIProviderType) || 'openai',
        notificationsEnabled: notifications !== 'false',
        reminderTimeHour: reminderHour ? parseInt(reminderHour, 10) : 18,
        reminderTimeMinute: reminderMinute ? parseInt(reminderMinute, 10) : 0,
        hasCompletedOnboarding: hasOnboarded === 'true',
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to load settings:', error);
      set({ isLoading: false });
    }
  },

  setHapticFeedback: async (enabled) => {
    await AsyncStorage.setItem(SETTINGS_KEYS.HAPTIC_FEEDBACK, enabled.toString());
    set({ hapticFeedback: enabled });
  },

  setAIProvider: async (provider) => {
    await AsyncStorage.setItem(SETTINGS_KEYS.AI_PROVIDER, provider);
    set({ aiProvider: provider });
  },

  setNotificationsEnabled: async (enabled) => {
    await AsyncStorage.setItem(SETTINGS_KEYS.NOTIFICATIONS_ENABLED, enabled.toString());
    set({ notificationsEnabled: enabled });
  },

  setReminderTime: async (hour, minute) => {
    await Promise.all([
      AsyncStorage.setItem(SETTINGS_KEYS.REMINDER_TIME_HOUR, hour.toString()),
      AsyncStorage.setItem(SETTINGS_KEYS.REMINDER_TIME_MINUTE, minute.toString()),
    ]);
    set({ reminderTimeHour: hour, reminderTimeMinute: minute });
  },

  setHasCompletedOnboarding: async (completed) => {
    await AsyncStorage.setItem(SETTINGS_KEYS.HAS_COMPLETED_ONBOARDING, completed.toString());
    set({ hasCompletedOnboarding: completed });
  },

  initializeApp: async () => {
    try {
      // Initialize database
      await initializeDatabase();
      set({ dbInitialized: true });

      // Load settings
      await get().loadSettings();
    } catch (error) {
      console.error('Failed to initialize app:', error);
      throw error;
    }
  },

  clearAllData: async () => {
    try {
      // Clear all tables
      await sqliteDB.execAsync('DELETE FROM meal_plans');
      await sqliteDB.execAsync('DELETE FROM grocery_items');
      await sqliteDB.execAsync('DELETE FROM grocery_lists');
      await sqliteDB.execAsync('DELETE FROM pantry_items');
      await sqliteDB.execAsync('DELETE FROM ingredients');
      await sqliteDB.execAsync('DELETE FROM recipes');

      // Clear extraction count
      await AsyncStorage.removeItem('recipe_extractions_count');
    } catch (error) {
      console.error('Failed to clear data:', error);
      throw error;
    }
  },
}));
