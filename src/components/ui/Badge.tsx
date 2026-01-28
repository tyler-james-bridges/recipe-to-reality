import React from 'react'
import { StyleSheet, ViewStyle, StyleProp, useColorScheme, View } from 'react-native'
import Colors, { radius, typography, spacing } from '@/constants/Colors'
import { ThemedText } from '@/components/Themed'
import { Icon, IconProps } from './Icon'

type BadgeVariant = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral'
type BadgeSize = 'small' | 'medium'
type IconName = IconProps['name']

interface BadgeProps {
  label: string
  variant?: BadgeVariant
  size?: BadgeSize
  icon?: IconName
  style?: StyleProp<ViewStyle>
}

export default function Badge({
  label,
  variant = 'primary',
  size = 'medium',
  icon,
  style,
}: BadgeProps) {
  const colorScheme = useColorScheme()
  const colors = Colors[colorScheme ?? 'light']

  const getColors = (): { background: string; text: string } => {
    switch (variant) {
      case 'success':
        return { background: colors.successBackground, text: colors.success }
      case 'warning':
        return { background: colors.warningBackground, text: colors.warning }
      case 'error':
        return { background: colors.errorBackground, text: colors.error }
      case 'info':
        return { background: colors.infoBackground, text: colors.info }
      case 'neutral':
        return {
          background: colorScheme === 'dark' ? colors.cardElevated : colors.skeleton,
          text: colors.textTertiary,
        }
      case 'primary':
      default:
        return { background: colors.accentSubtle, text: colors.accent }
    }
  }

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          container: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
          text: typography.labelSmall,
          icon: 10,
        }
      case 'medium':
      default:
        return {
          container: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2 },
          text: typography.labelMedium,
          icon: 12,
        }
    }
  }

  const variantColors = getColors()
  const sizeStyles = getSizeStyles()

  return (
    <View
      style={[
        styles.container,
        sizeStyles.container,
        { backgroundColor: variantColors.background },
        style,
      ]}
    >
      {icon && (
        <Icon name={icon} size={sizeStyles.icon} color={variantColors.text} style={styles.icon} />
      )}
      <ThemedText style={[sizeStyles.text, { color: variantColors.text }]}>{label}</ThemedText>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: spacing.xs,
  },
})
