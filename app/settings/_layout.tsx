import { Stack } from 'expo-router'
import { useColorScheme } from '@/components/useColorScheme'
import Colors from '@/constants/Colors'

export default function SettingsLayout() {
  const colorScheme = useColorScheme()
  const colors = Colors[colorScheme ?? 'light']

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.tint,
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <Stack.Screen
        name="ai-provider"
        options={{
          title: 'AI Settings',
          presentation: 'card',
          headerLargeTitle: false,
        }}
      />
      <Stack.Screen
        name="video-platforms"
        options={{
          title: 'Video Platforms',
          presentation: 'card',
          headerLargeTitle: false,
        }}
      />
      <Stack.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          presentation: 'card',
          headerLargeTitle: false,
        }}
      />
      <Stack.Screen
        name="export"
        options={{
          title: 'Export Data',
          presentation: 'card',
          headerLargeTitle: false,
        }}
      />
    </Stack>
  )
}
