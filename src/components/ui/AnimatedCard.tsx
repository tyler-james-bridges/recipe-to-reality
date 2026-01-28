import React, { useEffect } from 'react'
import { StyleSheet, ViewStyle, StyleProp, useColorScheme } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated'
import Colors, { shadows, radius, spacing } from '@/constants/Colors'

interface AnimatedCardProps {
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
  delay?: number
  index?: number
  elevated?: boolean
}

export default function AnimatedCard({
  children,
  style,
  delay = 0,
  index = 0,
  elevated = false,
}: AnimatedCardProps) {
  const colorScheme = useColorScheme()
  const colors = Colors[colorScheme ?? 'light']
  const progress = useSharedValue(0)

  useEffect(() => {
    const totalDelay = delay + index * 50
    progress.value = withDelay(
      totalDelay,
      withSpring(1, {
        damping: 18,
        stiffness: 100,
        mass: 1,
      })
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delay, index])

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
      transform: [
        {
          translateY: interpolate(progress.value, [0, 1], [20, 0], Extrapolation.CLAMP),
        },
        {
          scale: interpolate(progress.value, [0, 1], [0.95, 1], Extrapolation.CLAMP),
        },
      ],
    }
  })

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: elevated ? colors.cardElevated : colors.card,
        },
        elevated ? shadows.medium : shadows.small,
        animatedStyle,
        style,
      ]}
    >
      {children}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    overflow: 'hidden',
  },
})
