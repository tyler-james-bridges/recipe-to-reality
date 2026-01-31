/**
 * Network Status Hook
 * Provides network status and integrates with React Query for offline support
 */

import { useEffect, useState } from 'react'
import NetInfo, { NetInfoState } from '@react-native-community/netinfo'
import { onlineManager } from '@tanstack/react-query'

/**
 * Hook to get current network status
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [networkState, setNetworkState] = useState<NetInfoState | null>(null)

  useEffect(() => {
    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener((state) => {
      setNetworkState(state)
      setIsOnline(state.isConnected ?? true)
    })

    // Get initial state
    NetInfo.fetch()
      .then((state) => {
        setNetworkState(state)
        setIsOnline(state.isConnected ?? true)
      })
      .catch((error) => {
        console.error('Failed to fetch network state:', error)
        // Default to online to avoid blocking the app
        setIsOnline(true)
      })

    return () => {
      unsubscribe()
    }
  }, [])

  return {
    isOnline,
    isConnected: networkState?.isConnected ?? true,
    isInternetReachable: networkState?.isInternetReachable ?? true,
    type: networkState?.type ?? 'unknown',
    details: networkState?.details,
  }
}

/**
 * Initialize React Query online manager with NetInfo
 * Call this once at app startup to sync network status
 */
export function setupNetworkListener() {
  // Sync React Query's online status with NetInfo
  onlineManager.setEventListener((setOnline) => {
    return NetInfo.addEventListener((state) => {
      setOnline(state.isConnected ?? true)
    })
  })
}

/**
 * Check if network is available (one-time check)
 */
export async function isNetworkAvailable(): Promise<boolean> {
  const state = await NetInfo.fetch()
  return state.isConnected ?? false
}

/**
 * Get detailed network info
 */
export async function getNetworkInfo(): Promise<NetInfoState> {
  return NetInfo.fetch()
}
