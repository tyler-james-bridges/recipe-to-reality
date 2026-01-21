import { Stack } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

export default function PantryLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.card,
        },
        headerTintColor: colors.tint,
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Stack.Screen
        name="add"
        options={{
          presentation: 'modal',
          title: 'Add to Pantry',
        }}
      />
      <Stack.Screen
        name="edit"
        options={{
          presentation: 'modal',
          title: 'Edit Item',
        }}
      />
    </Stack>
  );
}
