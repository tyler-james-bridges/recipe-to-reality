import React from 'react'
import { StyleSheet, View, useColorScheme } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated'
import { ThemedText } from '@/components/Themed'
import { PantryItem } from '../types'
import { isExpired, isExpiringSoon } from '../utils/pantryMatching'
import { formatIngredient } from '../utils/quantity'
import Colors, { shadows, radius, spacing, typography } from '@/constants/Colors'
import AnimatedPressable from './ui/AnimatedPressable'
import Badge from './ui/Badge'
import { Icon } from './ui/Icon'

interface PantryItemRowProps {
  item: PantryItem
  onDelete: () => void
  onPress?: () => void
  index?: number
}

/**
 * Modern pantry item row with animations
 */
export default function PantryItemRow({ item, onDelete, onPress, index = 0 }: PantryItemRowProps) {
  const colorScheme = useColorScheme()
  const colors = Colors[colorScheme ?? 'light']
  const progress = useSharedValue(0)

  React.useEffect(() => {
    progress.value = withDelay(index * 40, withSpring(1, { damping: 18, stiffness: 100 }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  const rowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
    transform: [
      { translateX: interpolate(progress.value, [0, 1], [-20, 0], Extrapolation.CLAMP) },
      { scale: interpolate(progress.value, [0, 1], [0.95, 1], Extrapolation.CLAMP) },
    ],
  }))

  const expired = isExpired(item)
  const expiringSoon = isExpiringSoon(item)

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const getCategoryIcon = (category?: string): string => {
    const icons: Record<string, string> = {
      Produce: 'leaf',
      Dairy: 'water',
      Meat: 'restaurant',
      Seafood: 'fish',
      Grains: 'nutrition',
      Spices: 'flame',
      Canned: 'cube',
      Frozen: 'snow',
      Beverages: 'cafe',
      Condiments: 'color-fill',
    }
    return icons[category || ''] || 'ellipse'
  }

  return (
    <Animated.View style={rowAnimatedStyle}>
      <AnimatedPressable
        onPress={onPress}
        hapticType="light"
        scaleOnPress={0.98}
        style={[styles.container, { backgroundColor: colors.card }, shadows.small]}
      >
        {/* Category Icon */}
        <View style={[styles.iconContainer, { backgroundColor: colors.accentSubtle }]}>
          <Icon name={getCategoryIcon(item.category) as any} size={18} color={colors.tint} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <ThemedText style={[styles.name, expired && { color: colors.error }]} numberOfLines={1}>
            {formatIngredient(item.name, item.quantity, item.unit)}
          </ThemedText>

          <View style={styles.metaRow}>
            {item.category && (
              <ThemedText style={[styles.categoryText, { color: colors.textTertiary }]}>
                {item.category}
              </ThemedText>
            )}
            {item.expirationDate && (
              <>
                {item.category && (
                  <View style={[styles.dot, { backgroundColor: colors.textTertiary }]} />
                )}
                {expired ? (
                  <Badge label="Expired" variant="error" size="small" />
                ) : expiringSoon ? (
                  <Badge
                    label={`Exp: ${formatDate(item.expirationDate)}`}
                    variant="warning"
                    size="small"
                  />
                ) : (
                  <ThemedText style={[styles.expirationText, { color: colors.textTertiary }]}>
                    Exp: {formatDate(item.expirationDate)}
                  </ThemedText>
                )}
              </>
            )}
          </View>
        </View>

        {/* Chevron */}
        <Icon name="chevron-forward" size={18} color={colors.textTertiary} />
      </AnimatedPressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginHorizontal: spacing.lg,
    borderRadius: radius.lg,
    gap: spacing.md,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    gap: spacing.xs,
  },
  name: {
    ...typography.bodyLarge,
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  categoryText: {
    ...typography.caption,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  expirationText: {
    ...typography.caption,
  },
})
