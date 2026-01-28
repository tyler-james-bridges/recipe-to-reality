import React from 'react'
import { StyleSheet, ViewStyle, StyleProp, useColorScheme, View } from 'react-native'
import { BlurView } from 'expo-blur'
import Animated, { useAnimatedStyle, useSharedValue, interpolate } from 'react-native-reanimated'
import Colors, { shadows, radius, spacing } from '@/constants/Colors'

interface GlassCardProps {
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
  intensity?: number
  tint?: 'light' | 'dark' | 'default'
  bordered?: boolean
}

export default function GlassCard({
  children,
  style,
  intensity = 50,
  tint = 'default',
  bordered = true,
}: GlassCardProps) {
  const colorScheme = useColorScheme()
  const colors = Colors[colorScheme ?? 'light']
  const pressed = useSharedValue(0)

  const blurTint = tint === 'default' ? (colorScheme === 'dark' ? 'dark' : 'light') : tint

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pressed.value, [0, 1], [1, 0.98]) }],
  }))

  // Fallback for platforms that don't support blur well
  const useBlur = process.env.EXPO_OS === 'ios'

  if (useBlur) {
    return (
      <Animated.View
        style={[
          styles.container,
          bordered && {
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
          },
          shadows.medium,
          animatedStyle,
          style,
        ]}
      >
        <BlurView intensity={intensity} tint={blurTint} style={StyleSheet.absoluteFillObject} />
        <View style={styles.content}>{children}</View>
      </Animated.View>
    )
  }

  // Fallback for non-iOS platforms
  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.glass,
        },
        bordered && {
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
        },
        shadows.medium,
        animatedStyle,
        style,
      ]}
    >
      <View style={styles.content}>{children}</View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  content: {
    padding: spacing.lg,
  },
})
