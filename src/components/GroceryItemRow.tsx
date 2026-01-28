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
import { GroceryItem } from '../types'
import { formatIngredient } from '../utils/quantity'
import Colors, { shadows, radius, spacing, typography } from '@/constants/Colors'
import AnimatedPressable from './ui/AnimatedPressable'
import { Icon } from './ui/Icon'

interface GroceryItemRowProps {
  item: GroceryItem
  onToggle: () => void
  onDelete: () => void
  index?: number
}

export default function GroceryItemRow({
  item,
  onToggle,
  onDelete,
  index = 0,
}: GroceryItemRowProps) {
  const colorScheme = useColorScheme()
  const colors = Colors[colorScheme ?? 'light']
  const progress = useSharedValue(0)
  const checkScale = useSharedValue(item.isChecked ? 1 : 0)

  React.useEffect(() => {
    progress.value = withDelay(index * 30, withSpring(1, { damping: 18, stiffness: 100 }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  React.useEffect(() => {
    checkScale.value = withSpring(item.isChecked ? 1 : 0, {
      damping: 12,
      stiffness: 200,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.isChecked])

  const rowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateX: interpolate(progress.value, [0, 1], [-20, 0], Extrapolation.CLAMP) }],
  }))

  const checkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(checkScale.value, [0, 0.5, 1], [1, 1.2, 1], Extrapolation.CLAMP) },
    ],
  }))

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(checkScale.value, [0, 1], [1, 0.6], Extrapolation.CLAMP),
  }))

  return (
    <Animated.View style={rowAnimatedStyle}>
      <AnimatedPressable
        onPress={onToggle}
        hapticType={item.isChecked ? 'selection' : 'light'}
        scaleOnPress={0.98}
        style={[
          styles.container,
          {
            backgroundColor: colors.card,
          },
          shadows.small,
        ]}
      >
        {/* Animated Checkbox */}
        <AnimatedPressable onPress={onToggle} hapticType="none" style={styles.checkbox}>
          <Animated.View style={checkAnimatedStyle}>
            <View
              style={[
                styles.checkboxOuter,
                {
                  borderColor: item.isChecked ? colors.success : colors.textTertiary,
                  backgroundColor: item.isChecked ? colors.success : 'transparent',
                },
              ]}
            >
              {item.isChecked && <Icon name="checkmark" size={14} color="#FFFFFF" />}
            </View>
          </Animated.View>
        </AnimatedPressable>

        {/* Content */}
        <Animated.View style={[styles.content, textAnimatedStyle]}>
          <ThemedText
            style={[
              styles.name,
              item.isChecked && [styles.checkedText, { color: colors.textTertiary }],
            ]}
            numberOfLines={1}
          >
            {formatIngredient(item.name, item.quantity, item.unit)}
          </ThemedText>

          {item.sourceRecipeIds && item.sourceRecipeIds.length > 1 && (
            <View style={styles.sourceContainer}>
              <Icon name="restaurant-outline" size={10} color={colors.textTertiary} />
              <ThemedText style={[styles.sourceCount, { color: colors.textTertiary }]}>
                From {item.sourceRecipeIds.length} recipes
              </ThemedText>
            </View>
          )}
        </Animated.View>

        {/* Swipe hint indicator */}
        <View style={styles.swipeHint}>
          <Icon
            name="chevron-back"
            size={14}
            color={colors.textTertiary}
            style={{ opacity: 0.3 }}
          />
        </View>
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
    borderRadius: radius.md,
  },
  checkbox: {
    marginRight: spacing.md,
    padding: spacing.xs,
  },
  checkboxOuter: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: spacing.xs,
  },
  name: {
    ...typography.bodyLarge,
    lineHeight: 22,
  },
  checkedText: {
    textDecorationLine: 'line-through',
  },
  sourceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sourceCount: {
    ...typography.labelSmall,
  },
  swipeHint: {
    paddingLeft: spacing.sm,
  },
})
