import React from 'react'
import { StyleSheet, ViewStyle, TextStyle, StyleProp, useColorScheme, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
} from 'react-native-reanimated'
import AnimatedPressable from './AnimatedPressable'
import Colors, { gradients, shadows, radius, typography, spacing } from '@/constants/Colors'
import { ThemedText } from '@/components/Themed'
import { Icon, IconProps } from './Icon'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
type ButtonSize = 'small' | 'medium' | 'large'
type IconName = IconProps['name']

interface ModernButtonProps {
  title: string
  onPress: () => void
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: IconName
  iconPosition?: 'left' | 'right'
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean
  style?: StyleProp<ViewStyle>
}

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient)

export default function ModernButton({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  icon,
  iconPosition = 'left',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
}: ModernButtonProps) {
  const colorScheme = useColorScheme()
  const colors = Colors[colorScheme ?? 'light']
  const pressed = useSharedValue(0)

  const getBackgroundColors = (): readonly [string, string] => {
    const themeGradients = gradients[colorScheme ?? 'light']
    switch (variant) {
      case 'primary':
        return themeGradients.primary
      case 'success':
        return themeGradients.success
      case 'danger':
        return [colors.error, colors.error] as const
      case 'secondary':
        return themeGradients.secondary
      case 'ghost':
        return ['transparent', 'transparent'] as const
      default:
        return themeGradients.primary
    }
  }

  const getTextColor = (): string => {
    switch (variant) {
      case 'primary':
      case 'success':
      case 'danger':
        return '#FFFFFF'
      case 'secondary':
        return colors.text
      case 'ghost':
        return colors.tint
      default:
        return '#FFFFFF'
    }
  }

  const getSizeStyles = (): { button: ViewStyle; text: TextStyle; icon: number } => {
    switch (size) {
      case 'small':
        return {
          button: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
          text: typography.labelMedium,
          icon: 16,
        }
      case 'large':
        return {
          button: { paddingVertical: spacing.lg, paddingHorizontal: spacing['2xl'] },
          text: typography.labelLarge,
          icon: 22,
        }
      case 'medium':
      default:
        return {
          button: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl },
          text: typography.labelLarge,
          icon: 20,
        }
    }
  }

  const sizeStyles = getSizeStyles()
  const textColor = getTextColor()
  const backgroundColors = getBackgroundColors()

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pressed.value, [0, 1], [1, 0.97]) }],
  }))

  const content = (
    <>
      {loading ? (
        <Animated.View style={styles.loadingDot}>
          <View style={[styles.dot, { backgroundColor: textColor }]} />
        </Animated.View>
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <Icon name={icon} size={sizeStyles.icon} color={textColor} style={styles.iconLeft} />
          )}
          <ThemedText style={[sizeStyles.text, { color: textColor }]}>{title}</ThemedText>
          {icon && iconPosition === 'right' && (
            <Icon name={icon} size={sizeStyles.icon} color={textColor} style={styles.iconRight} />
          )}
        </>
      )}
    </>
  )

  if (variant === 'ghost' || variant === 'secondary') {
    return (
      <AnimatedPressable
        onPress={onPress}
        disabled={disabled || loading}
        hapticType="medium"
        style={[
          styles.button,
          sizeStyles.button,
          fullWidth && styles.fullWidth,
          variant === 'secondary' && {
            backgroundColor: colorScheme === 'dark' ? colors.cardElevated : colors.card,
            borderWidth: 1,
            borderColor: colors.border,
          },
          disabled && styles.disabled,
          animatedStyle,
          style,
        ]}
      >
        {content}
      </AnimatedPressable>
    )
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled || loading}
      hapticType="medium"
      style={[fullWidth && styles.fullWidth, disabled && styles.disabled, style]}
    >
      <LinearGradient
        colors={backgroundColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.button,
          styles.gradientButton,
          sizeStyles.button,
          fullWidth && styles.fullWidth,
          variant === 'primary' && shadows.medium,
        ]}
      >
        {content}
      </LinearGradient>
    </AnimatedPressable>
  )
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    gap: spacing.sm,
  },
  gradientButton: {
    // Additional styles for gradient buttons
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  iconLeft: {
    marginRight: spacing.xs,
  },
  iconRight: {
    marginLeft: spacing.xs,
  },
  loadingDot: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
})
