import React, { useEffect } from 'react'
import {
  StyleSheet,
  ViewStyle,
  StyleProp,
  useColorScheme,
  View,
  DimensionValue,
} from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import Colors, { radius, spacing } from '@/constants/Colors'

interface SkeletonLoaderProps {
  width?: DimensionValue
  height?: number
  borderRadius?: number
  style?: StyleProp<ViewStyle>
}

export default function SkeletonLoader({
  width = '100%',
  height = 20,
  borderRadius = radius.md,
  style,
}: SkeletonLoaderProps) {
  const colorScheme = useColorScheme()
  const colors = Colors[colorScheme ?? 'light']
  const shimmer = useSharedValue(0)

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      false
    )
  }, [])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(shimmer.value, [0, 1], [-200, 200]),
      },
    ],
  }))

  return (
    <View
      style={[
        styles.container,
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.skeleton,
        },
        style,
      ]}
    >
      <Animated.View style={[StyleSheet.absoluteFillObject, animatedStyle]}>
        <LinearGradient
          colors={['transparent', colors.skeletonHighlight, 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.shimmer}
        />
      </Animated.View>
    </View>
  )
}

// Preset skeleton components for common use cases
export function SkeletonText({
  lines = 3,
  style,
}: {
  lines?: number
  style?: StyleProp<ViewStyle>
}) {
  return (
    <View style={[styles.textContainer, style]}>
      {Array.from({ length: lines }).map((_, index) => (
        <SkeletonLoader
          key={index}
          height={14}
          width={index === lines - 1 ? '60%' : '100%'}
          style={styles.textLine}
        />
      ))}
    </View>
  )
}

export function SkeletonCard({ style }: { style?: StyleProp<ViewStyle> }) {
  const colorScheme = useColorScheme()
  const colors = Colors[colorScheme ?? 'light']

  return (
    <View style={[styles.card, { backgroundColor: colors.card }, style]}>
      <View style={styles.cardHeader}>
        <SkeletonLoader width={60} height={60} borderRadius={radius.md} />
        <View style={styles.cardHeaderContent}>
          <SkeletonLoader width="70%" height={18} />
          <SkeletonLoader width="40%" height={14} style={styles.cardSubtitle} />
        </View>
      </View>
    </View>
  )
}

export function SkeletonRecipeList({ count = 5 }: { count?: number }) {
  return (
    <View style={styles.recipeList}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} style={styles.recipeItem} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  shimmer: {
    width: 200,
    height: '100%',
  },
  textContainer: {
    gap: spacing.sm,
  },
  textLine: {
    marginBottom: 4,
  },
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cardHeaderContent: {
    flex: 1,
    gap: spacing.sm,
  },
  cardSubtitle: {
    marginTop: 4,
  },
  recipeList: {
    padding: spacing.lg,
  },
  recipeItem: {
    marginBottom: spacing.sm,
  },
})
