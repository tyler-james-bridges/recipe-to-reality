import { Stack } from 'expo-router'
import { useColorScheme } from '@/components/useColorScheme'
import Colors from '@/constants/Colors'

export default function GroceryLayout() {
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
        name="generate"
        options={{
          title: 'Generate List',
          presentation: 'modal',
          headerLargeTitle: false,
        }}
      />
      <Stack.Screen
        name="add-from-recipe"
        options={{
          title: 'Add to Grocery List',
          presentation: 'modal',
          headerLargeTitle: false,
        }}
      />
    </Stack>
  )
}
