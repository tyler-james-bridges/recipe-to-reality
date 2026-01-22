import React from 'react';
import { Tabs } from 'expo-router';
import { useColorScheme, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
} from 'react-native-reanimated';

import Colors, { spacing, animation } from '@/constants/Colors';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface TabBarIconProps {
  name: IconName;
  color: string;
  focused: boolean;
}

function TabBarIcon({ name, color, focused }: TabBarIconProps) {
  const scale = useSharedValue(focused ? 1 : 0);

  React.useEffect(() => {
    scale.value = withSpring(focused ? 1 : 0, {
      damping: animation.spring.damping,
      stiffness: animation.spring.stiffness,
    });
  }, [focused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(scale.value, [0, 1], [1, 1.1]) },
    ],
  }));

  // Use filled icons when focused, outline when not (iOS convention)
  const iconName = focused ? name : (`${name}-outline` as IconName);

  return (
    <View style={styles.iconContainer}>
      <Animated.View style={animatedStyle}>
        <Ionicons size={24} name={iconName} color={color} />
      </Animated.View>
      {focused && (
        <View style={[styles.indicator, { backgroundColor: color }]} />
      )}
    </View>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarStyle: {
          backgroundColor: colorScheme === 'dark' ? colors.card : '#FFFFFF',
          borderTopColor: colors.borderSubtle,
          borderTopWidth: StyleSheet.hairlineWidth,
          paddingBottom: process.env.EXPO_OS === 'ios' ? 28 : 12,
          paddingTop: 12,
          height: process.env.EXPO_OS === 'ios' ? 92 : 68,
          // Modern glass effect for iOS
          ...(process.env.EXPO_OS === 'ios' && {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
          }),
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.2,
          marginTop: 4,
        },
        headerStyle: {
          backgroundColor: colorScheme === 'dark' ? colors.card : '#FFFFFF',
          shadowColor: 'transparent',
          elevation: 0,
        },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 17,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Recipes',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="book" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="pantry"
        options={{
          title: 'Pantry',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="snow" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="meal-plan"
        options={{
          title: 'Meal Plan',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="calendar" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="grocery"
        options={{
          title: 'Grocery',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="cart" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="settings" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  indicator: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 2,
  },
});
