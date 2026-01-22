import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, router, useSegments, useRootNavigationState } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import 'react-native-reanimated';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useColorScheme } from '@/components/useColorScheme';
import { useSettingsStore } from '@/src/stores/settingsStore';
import { usePurchaseStore } from '@/src/stores/purchaseStore';
import { setupNetworkListener } from '@/src/hooks/useNetwork';
import Colors from '@/constants/Colors';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Create a QueryClient instance with default options
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retry failed requests up to 3 times
      retry: 3,
      // Consider data stale after 5 minutes
      staleTime: 1000 * 60 * 5,
      // Keep unused data in cache for 30 minutes
      gcTime: 1000 * 60 * 30,
      // Refetch on window focus for fresh data
      refetchOnWindowFocus: true,
      // Refetch when network reconnects
      refetchOnReconnect: true,
    },
    mutations: {
      // Retry mutations up to 2 times
      retry: 2,
    },
  },
});

// Initialize network listener for offline support
setupNetworkListener();

// Custom theme that uses our orange accent color
const LightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.light.tint,
    background: Colors.light.background,
    card: Colors.light.card,
    border: Colors.light.border,
  },
};

const DarkThemeCustom = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.dark.tint,
    background: Colors.dark.background,
    card: Colors.dark.card,
    border: Colors.dark.border,
  },
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });
  const [appReady, setAppReady] = useState(false);
  const initializeApp = useSettingsStore((state) => state.initializeApp);
  const initializePurchases = usePurchaseStore((state) => state.initialize);

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  // Initialize app (database + settings + purchases)
  useEffect(() => {
    async function initialize() {
      try {
        await initializeApp();
        await initializePurchases();
        setAppReady(true);
      } catch (err) {
        console.error('Failed to initialize app:', err);
        // Still allow app to load even if initialization fails
        setAppReady(true);
      }
    }
    initialize();
  }, [initializeApp, initializePurchases]);

  useEffect(() => {
    if (loaded && appReady) {
      SplashScreen.hideAsync();
    }
  }, [loaded, appReady]);

  if (!loaded || !appReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <RootLayoutNav />
    </QueryClientProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const segments = useSegments();
  const navigationState = useRootNavigationState();
  const hasCompletedOnboarding = useSettingsStore((state) => state.hasCompletedOnboarding);

  // Handle onboarding navigation
  useEffect(() => {
    // Wait until navigation is ready
    if (!navigationState?.key) return;

    const firstSegment = segments[0] as string;
    const inOnboarding = firstSegment === 'onboarding';

    if (!hasCompletedOnboarding && !inOnboarding) {
      // User hasn't completed onboarding, redirect to onboarding
      router.replace('/onboarding' as any);
    } else if (hasCompletedOnboarding && inOnboarding) {
      // User has completed onboarding but is on onboarding screen, redirect to main app
      router.replace('/(tabs)');
    }
  }, [hasCompletedOnboarding, segments, navigationState?.key]);

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
  );
}
