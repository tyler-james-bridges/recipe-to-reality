import React from 'react';
import { StyleSheet, View, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { ThemedText } from '@/components/Themed';
import { MealPlan, MealType } from '../types';
import Colors, { gradients, shadows, radius, spacing, typography } from '@/constants/Colors';
import AnimatedPressable from './ui/AnimatedPressable';
import Badge from './ui/Badge';

const MEAL_TYPE_ICONS: Record<MealType, { icon: string; gradient: readonly [string, string] }> = {
  Breakfast: { icon: 'sunny', gradient: ['#FFD700', '#FFA500'] },
  Lunch: { icon: 'restaurant', gradient: ['#34C759', '#30B350'] },
  Dinner: { icon: 'moon', gradient: ['#5856D6', '#4B48C9'] },
  Snack: { icon: 'cafe', gradient: ['#FF9500', '#FF7A00'] },
};

interface MealPlanCardProps {
  mealPlan: MealPlan;
  onToggleComplete: () => void;
  onDelete: () => void;
  onPress?: () => void;
  index?: number;
}

export default function MealPlanCard({
  mealPlan,
  onToggleComplete,
  onDelete,
  onPress,
  index = 0,
}: MealPlanCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const progress = useSharedValue(0);
  const checkScale = useSharedValue(mealPlan.isCompleted ? 1 : 0);

  React.useEffect(() => {
    progress.value = withDelay(
      index * 80,
      withSpring(1, { damping: 18, stiffness: 100 })
    );
  }, [index]);

  React.useEffect(() => {
    checkScale.value = withSpring(mealPlan.isCompleted ? 1 : 0, {
      damping: 12,
      stiffness: 200,
    });
  }, [mealPlan.isCompleted]);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [20, 0], Extrapolation.CLAMP) },
      { scale: interpolate(progress.value, [0, 1], [0.95, 1], Extrapolation.CLAMP) },
    ],
  }));

  const checkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(checkScale.value, [0, 0.5, 1], [1, 1.3, 1], Extrapolation.CLAMP) },
    ],
  }));

  const mealConfig = MEAL_TYPE_ICONS[mealPlan.mealType as MealType] || MEAL_TYPE_ICONS.Dinner;

  return (
    <Animated.View style={cardAnimatedStyle}>
      <AnimatedPressable
        onPress={onPress}
        hapticType="light"
        scaleOnPress={0.98}
        disabled={!onPress}
        style={[
          styles.container,
          { backgroundColor: colors.card },
          shadows.medium,
        ]}
      >
        {/* Left: Meal Type Icon with Gradient */}
        <View style={styles.iconWrapper}>
          <LinearGradient
            colors={mealConfig.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconGradient}
          >
            <Ionicons name={mealConfig.icon as any} size={22} color="#FFFFFF" />
          </LinearGradient>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Header with meal type badge */}
          <View style={styles.header}>
            <Badge
              label={mealPlan.mealType}
              variant="neutral"
              size="small"
            />
            {mealPlan.reminder && (
              <View style={styles.reminderIcon}>
                <Ionicons name="notifications" size={14} color={colors.warning} />
              </View>
            )}
          </View>

          {/* Recipe Name */}
          <ThemedText
            style={[
              styles.recipeName,
              mealPlan.isCompleted && [styles.completedText, { color: colors.textTertiary }],
            ]}
            numberOfLines={2}
          >
            {mealPlan.recipeName || 'No recipe selected'}
          </ThemedText>

          {/* Notes */}
          {mealPlan.notes && (
            <ThemedText
              style={[styles.notes, { color: colors.textTertiary }]}
              numberOfLines={1}
            >
              {mealPlan.notes}
            </ThemedText>
          )}
        </View>

        {/* Right: Checkbox */}
        <AnimatedPressable
          onPress={onToggleComplete}
          hapticType={mealPlan.isCompleted ? 'selection' : 'medium'}
          style={styles.checkboxContainer}
        >
          <Animated.View style={checkAnimatedStyle}>
            <View
              style={[
                styles.checkbox,
                {
                  borderColor: mealPlan.isCompleted ? colors.success : colors.textTertiary,
                  backgroundColor: mealPlan.isCompleted ? colors.success : 'transparent',
                },
              ]}
            >
              {mealPlan.isCompleted && (
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
              )}
            </View>
          </Animated.View>
        </AnimatedPressable>
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radius.xl,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  iconWrapper: {
    // Container for icon
  },
  iconGradient: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  reminderIcon: {
    padding: 2,
  },
  recipeName: {
    ...typography.titleMedium,
    lineHeight: 22,
  },
  completedText: {
    textDecorationLine: 'line-through',
  },
  notes: {
    ...typography.bodySmall,
    lineHeight: 18,
  },
  checkboxContainer: {
    padding: spacing.xs,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
