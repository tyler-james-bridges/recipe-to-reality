import FontAwesome from '@expo/vector-icons/FontAwesome'
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native'
import { useFonts } from 'expo-font'
import { Stack, router, useSegments, useRootNavigationState } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect, useState, useCallback, useRef } from 'react'
import { View, ActivityIndicator } from 'react-native'
import 'react-native-reanimated'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as Linking from 'expo-linking'

import { useColorScheme } from '@/components/useColorScheme'
import { useSettingsStore } from '@/src/stores/settingsStore'
import { usePurchaseStore } from '@/src/stores/purchaseStore'
import { setupNetworkListener } from '@/src/hooks/useNetwork'
import {
  setupNotificationResponseListener,
  registerForPushNotificationsAsync,
} from '@/src/services/notifications'
import Colors from '@/constants/Colors'

export { ErrorBoundary } from 'expo-router'

export const unstable_settings = {
  initialRouteName: '(tabs)',
}

SplashScreen.preventAutoHideAsync()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 2,
    },
  },
})

setupNetworkListener()

/**
 * Parse deep link URL and extract recipe URL parameter.
 * Handles URLs like: recipetoreality://add-recipe?url=https://example.com/recipe
 */
function parseDeepLink(url: string): { recipeUrl: string | null } {
  try {
    const parsed = Linking.parse(url)
    if (parsed.path === 'add-recipe' && parsed.queryParams?.url) {
      const recipeUrl = parsed.queryParams.url
      // Ensure we return a string, not an array
      return { recipeUrl: Array.isArray(recipeUrl) ? recipeUrl[0] : recipeUrl }
    }
    return { recipeUrl: null }
  } catch (error) {
    console.error('Failed to parse deep link:', error)
    return { recipeUrl: null }
  }
}

const LightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.light.tint,
    background: Colors.light.background,
    card: Colors.light.card,
    border: Colors.light.border,
  },
}

const DarkThemeCustom = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.dark.tint,
    background: Colors.dark.background,
    card: Colors.dark.card,
    border: Colors.dark.border,
  },
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  })
  const [appReady, setAppReady] = useState(false)
  const initializeApp = useSettingsStore((state) => state.initializeApp)
  const initializePurchases = usePurchaseStore((state) => state.initialize)

  // Track pending deep link URL to handle after navigation is ready
  const pendingDeepLink = useRef<string | null>(null)

  // Handle deep link navigation
  const handleDeepLink = useCallback((url: string) => {
    const { recipeUrl } = parseDeepLink(url)
    if (recipeUrl) {
      // Navigate to add recipe screen with the URL and auto-extract flag
      router.push({
        pathname: '/recipe/add',
        params: {
          deepLinkUrl: recipeUrl,
          autoExtract: 'true',
        },
      })
    }
  }, [])

  useEffect(() => {
    if (error) throw error
  }, [error])

  useEffect(() => {
    async function initialize() {
      try {
        await initializeApp()
        await initializePurchases()
        // Register for push notifications (sets up Android channel)
        await registerForPushNotificationsAsync()
        setAppReady(true)
      } catch (err) {
        console.error('Failed to initialize app:', err)
        setAppReady(true)
      }
    }
    initialize()
  }, [initializeApp, initializePurchases])

  // Handle cold start deep links (app was not running)
  useEffect(() => {
    async function handleInitialURL() {
      try {
        const initialUrl = await Linking.getInitialURL()
        if (initialUrl) {
          // Store for later processing when navigation is ready
          pendingDeepLink.current = initialUrl
        }
      } catch (error) {
        console.error('Failed to get initial URL:', error)
      }
    }
    handleInitialURL()
  }, [])

  // Handle warm start deep links (app is in background)
  useEffect(() => {
    const subscription = Linking.addEventListener('url', (event) => {
      if (appReady) {
        handleDeepLink(event.url)
      } else {
        // Store for later if app is not ready
        pendingDeepLink.current = event.url
      }
    })

    return () => subscription.remove()
  }, [appReady, handleDeepLink])

  // Process pending deep link once app is ready
  useEffect(() => {
    if (appReady && pendingDeepLink.current) {
      // Small delay to ensure navigation is fully ready
      const timer = setTimeout(() => {
        if (pendingDeepLink.current) {
          handleDeepLink(pendingDeepLink.current)
          pendingDeepLink.current = null
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [appReady, handleDeepLink])

  // Set up notification response listener
  useEffect(() => {
    const cleanup = setupNotificationResponseListener()
    return cleanup
  }, [])
  useEffect(() => {
    if (loaded && appReady) {
      SplashScreen.hideAsync().catch((error) => {
        console.error('Failed to hide splash screen:', error)
      })
    }
  }, [loaded, appReady])

  if (!loaded || !appReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
      </View>
    )
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <RootLayoutNav />
      </QueryClientProvider>
    </GestureHandlerRootView>
  )
}

function RootLayoutNav() {
  const colorScheme = useColorScheme()
  const segments = useSegments()
  const navigationState = useRootNavigationState()
  const hasCompletedOnboarding = useSettingsStore((state) => state.hasCompletedOnboarding)

  useEffect(() => {
    if (!navigationState?.key) return

    const firstSegment = segments[0] as string
    const inOnboarding = firstSegment === 'onboarding'

    if (!hasCompletedOnboarding && !inOnboarding) {
      router.replace('/onboarding')
    } else if (hasCompletedOnboarding && inOnboarding) {
      router.replace('/(tabs)')
    }
  }, [hasCompletedOnboarding, segments, navigationState?.key])

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkThemeCustom : LightTheme}>
      <Stack>
        <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="recipe/[id]"
          options={{
            headerShown: true,
            title: 'Recipe',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="recipe/add"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Add Recipe',
          }}
        />
        <Stack.Screen
          name="what-can-i-make"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'What Can I Make?',
          }}
        />
        <Stack.Screen
          name="paywall"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Upgrade to Premium',
          }}
        />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        <Stack.Screen
          name="pantry/add"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Add to Pantry',
          }}
        />
        <Stack.Screen
          name="pantry/edit"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Edit Item',
          }}
        />
        <Stack.Screen
          name="meal-plan"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="grocery"
          options={{
            headerShown: false,
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
    </ThemeProvider>
  )
}
