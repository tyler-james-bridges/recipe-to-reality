import React, { useEffect } from 'react'
import { StyleSheet, ViewStyle, StyleProp, useColorScheme, View } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import Colors, { gradients, radius, spacing, animation } from '@/constants/Colors'

interface ProgressBarProps {
  progress: number // 0-1
  animated?: boolean
  showGlow?: boolean
  height?: number
  style?: StyleProp<ViewStyle>
}

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient)

export default function ProgressBar({
  progress,
  animated = true,
  showGlow = true,
  height = 6,
  style,
}: ProgressBarProps) {
  const colorScheme = useColorScheme()
  const colors = Colors[colorScheme ?? 'light']
  const themeGradients = gradients[colorScheme ?? 'light']

  const progressValue = useSharedValue(0)

  useEffect(() => {
    if (animated) {
      progressValue.value = withSpring(progress, {
        damping: animation.spring.damping,
        stiffness: 80,
      })
    } else {
      progressValue.value = progress
    }
  }, [progress, animated])

  const animatedWidth = useAnimatedStyle(() => ({
    width: `${progressValue.value * 100}%`,
  }))

  const animatedGlow = useAnimatedStyle(() => ({
    opacity: interpolate(progressValue.value, [0, 0.5, 1], [0, 0.6, 1]),
  }))

  return (
    <View
      style={[
        styles.container,
        {
          height,
          backgroundColor: colorScheme === 'dark' ? colors.cardElevated : colors.skeleton,
          borderRadius: height / 2,
        },
        style,
      ]}
    >
      <AnimatedLinearGradient
        colors={themeGradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.progress, { borderRadius: height / 2 }, animatedWidth]}
      />
      {showGlow && progress > 0 && (
        <Animated.View
          style={[
            styles.glow,
            {
              backgroundColor: colors.tint,
              height: height * 2,
              width: height * 2,
              borderRadius: height,
            },
            animatedGlow,
            animatedWidth,
          ]}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
  },
  progress: {
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
  },
  glow: {
    position: 'absolute',
    right: -4,
    top: '50%',
    marginTop: -6,
    shadowColor: '#FF9500',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
})
