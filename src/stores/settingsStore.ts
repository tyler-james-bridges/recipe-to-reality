import { create } from 'zustand';
import storage from '../utils/storage';
import { initializeDatabase, sqliteDB } from '../db/client';

const SETTINGS_KEYS = {
  HAPTIC_FEEDBACK: 'settings_haptic_feedback',
  NOTIFICATIONS_ENABLED: 'settings_notifications_enabled',
  REMINDER_TIME_HOUR: 'settings_reminder_time_hour',
  REMINDER_TIME_MINUTE: 'settings_reminder_time_minute',
  HAS_COMPLETED_ONBOARDING: 'settings_has_completed_onboarding',
};

interface SettingsState {
  hapticFeedback: boolean;
  notificationsEnabled: boolean;
  reminderTimeHour: number;
  reminderTimeMinute: number;
  isLoading: boolean;
  dbInitialized: boolean;
  hasCompletedOnboarding: boolean;

  // Actions
  loadSettings: () => Promise<void>;
  setHapticFeedback: (enabled: boolean) => Promise<void>;
  setNotificationsEnabled: (enabled: boolean) => Promise<void>;
  setReminderTime: (hour: number, minute: number) => Promise<void>;
  setHasCompletedOnboarding: (completed: boolean) => Promise<void>;
  initializeApp: () => Promise<void>;
  clearAllData: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  hapticFeedback: true,
  notificationsEnabled: true,
  reminderTimeHour: 18, // Default 6:00 PM
  reminderTimeMinute: 0,
  isLoading: true,
  dbInitialized: false,
  hasCompletedOnboarding: false,

  loadSettings: async () => {
    try {
      const [haptic, notifications, reminderHour, reminderMinute, hasOnboarded] = await Promise.all([
        storage.getItemAsync(SETTINGS_KEYS.HAPTIC_FEEDBACK),
        storage.getItemAsync(SETTINGS_KEYS.NOTIFICATIONS_ENABLED),
        storage.getItemAsync(SETTINGS_KEYS.REMINDER_TIME_HOUR),
        storage.getItemAsync(SETTINGS_KEYS.REMINDER_TIME_MINUTE),
        storage.getItemAsync(SETTINGS_KEYS.HAS_COMPLETED_ONBOARDING),
      ]);

      set({
        hapticFeedback: haptic !== 'false',
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
    await storage.setItemAsync(SETTINGS_KEYS.HAPTIC_FEEDBACK, enabled.toString());
    set({ hapticFeedback: enabled });
  },

  setNotificationsEnabled: async (enabled) => {
    await storage.setItemAsync(SETTINGS_KEYS.NOTIFICATIONS_ENABLED, enabled.toString());
    set({ notificationsEnabled: enabled });
  },

  setReminderTime: async (hour, minute) => {
    await Promise.all([
      storage.setItemAsync(SETTINGS_KEYS.REMINDER_TIME_HOUR, hour.toString()),
      storage.setItemAsync(SETTINGS_KEYS.REMINDER_TIME_MINUTE, minute.toString()),
    ]);
    set({ reminderTimeHour: hour, reminderTimeMinute: minute });
  },

  setHasCompletedOnboarding: async (completed) => {
    await storage.setItemAsync(SETTINGS_KEYS.HAS_COMPLETED_ONBOARDING, completed.toString());
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
      await storage.removeItemAsync('recipe_extractions_count');
    } catch (error) {
      console.error('Failed to clear data:', error);
      throw error;
    }
  },
}));
