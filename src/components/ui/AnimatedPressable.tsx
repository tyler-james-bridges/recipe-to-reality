import React, { useCallback } from 'react'
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { useSettingsStore } from '@/src/stores/settingsStore'
import { animation } from '@/constants/Colors'

const AnimatedPressableComponent = Animated.createAnimatedComponent(Pressable)

interface AnimatedPressableProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>
  scaleOnPress?: number
  opacityOnPress?: number
  hapticType?: 'light' | 'medium' | 'heavy' | 'selection' | 'none'
  animationType?: 'spring' | 'timing'
}

export default function AnimatedPressable({
  children,
  style,
  onPressIn,
  onPressOut,
  onPress,
  scaleOnPress = 0.97,
  opacityOnPress = 0.9,
  hapticType = 'selection',
  animationType = 'spring',
  disabled,
  ...props
}: AnimatedPressableProps) {
  const pressed = useSharedValue(0)
  const hapticFeedback = useSettingsStore((state) => state.hapticFeedback)

  const triggerHaptic = useCallback(() => {
    if (!hapticFeedback || hapticType === 'none' || disabled) return

    switch (hapticType) {
      case 'light':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        break
      case 'medium':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        break
      case 'heavy':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
        break
      case 'selection':
        Haptics.selectionAsync()
        break
    }
  }, [hapticFeedback, hapticType, disabled])

  const handlePressIn = useCallback(
    (e: any) => {
      const animConfig =
        animationType === 'spring'
          ? { damping: animation.spring.damping, stiffness: animation.spring.stiffness }
          : { duration: animation.fast }

      pressed.value =
        animationType === 'spring' ? withSpring(1, animConfig) : withTiming(1, animConfig)

      onPressIn?.(e)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onPressIn, animationType]
  )

  const handlePressOut = useCallback(
    (e: any) => {
      const animConfig =
        animationType === 'spring'
          ? { damping: animation.spring.damping, stiffness: animation.spring.stiffness }
          : { duration: animation.fast }

      pressed.value =
        animationType === 'spring' ? withSpring(0, animConfig) : withTiming(0, animConfig)

      onPressOut?.(e)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onPressOut, animationType]
  )

  const handlePress = useCallback(
    (e: any) => {
      triggerHaptic()
      onPress?.(e)
    },
    [onPress, triggerHaptic]
  )

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: interpolate(pressed.value, [0, 1], [1, scaleOnPress]) }],
      opacity: interpolate(pressed.value, [0, 1], [1, opacityOnPress]),
    }
  })

  return (
    <AnimatedPressableComponent
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled}
      style={[animatedStyle, style]}
      {...props}
    >
      {children}
    </AnimatedPressableComponent>
  )
}
