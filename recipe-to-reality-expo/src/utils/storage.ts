/**
 * Modern Storage Utility
 * Uses expo-sqlite/localStorage instead of deprecated AsyncStorage
 */

import 'expo-sqlite/localStorage/install';

export function getItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.error(`Failed to get item ${key}:`, error);
    return null;
  }
}

export async function getItemAsync(key: string): Promise<string | null> {
  return getItem(key);
}

export function setItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.error(`Failed to set item ${key}:`, error);
  }
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  setItem(key, value);
}

export function removeItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Failed to remove item ${key}:`, error);
  }
}

export async function removeItemAsync(key: string): Promise<void> {
  removeItem(key);
}

export function clear(): void {
  try {
    localStorage.clear();
  } catch (error) {
    console.error('Failed to clear storage:', error);
  }
}

const storage = {
  getItem,
  getItemAsync,
  setItem,
  setItemAsync,
  removeItem,
  removeItemAsync,
  clear,
};

export default storage;
