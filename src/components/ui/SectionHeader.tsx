import React from 'react'
import { StyleSheet, ViewStyle, StyleProp, useColorScheme, View, Pressable } from 'react-native'
import Colors, { typography, spacing } from '@/constants/Colors'
import { ThemedText } from '@/components/Themed'
import { Icon, IconProps } from './Icon'

type IconName = IconProps['name']

interface SectionHeaderProps {
  title: string
  subtitle?: string
  icon?: IconName
  actionLabel?: string
  onAction?: () => void
  style?: StyleProp<ViewStyle>
}

export default function SectionHeader({
  title,
  subtitle,
  icon,
  actionLabel,
  onAction,
  style,
}: SectionHeaderProps) {
  const colorScheme = useColorScheme()
  const colors = Colors[colorScheme ?? 'light']

  return (
    <View style={[styles.container, style]}>
      <View style={styles.left}>
        {icon && (
          <View style={[styles.iconContainer, { backgroundColor: colors.accentSubtle }]}>
            <Icon name={icon} size={16} color={colors.accent} />
          </View>
        )}
        <View style={styles.textContainer}>
          <ThemedText style={styles.title}>{title}</ThemedText>
          {subtitle && (
            <ThemedText style={[styles.subtitle, { color: colors.textTertiary }]}>
              {subtitle}
            </ThemedText>
          )}
        </View>
      </View>
      {actionLabel && onAction && (
        <Pressable onPress={onAction} style={styles.action}>
          <ThemedText style={[styles.actionText, { color: colors.tint }]}>{actionLabel}</ThemedText>
          <Icon name="chevron-forward" size={16} color={colors.tint} />
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    ...typography.titleMedium,
  },
  subtitle: {
    ...typography.caption,
    marginTop: 2,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionText: {
    ...typography.labelMedium,
  },
})
