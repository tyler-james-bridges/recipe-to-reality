import React from 'react';
import { StyleSheet, View, Pressable, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/Themed';
import { MealPlan, MealType } from '../types';
import Colors from '@/constants/Colors';

const MEAL_TYPE_ICONS: Record<MealType, string> = {
  Breakfast: 'sunny',
  Lunch: 'restaurant',
  Dinner: 'moon',
  Snack: 'cafe',
};

interface MealPlanCardProps {
  mealPlan: MealPlan;
  onToggleComplete: () => void;
  onDelete: () => void;
  onPress?: () => void;
}

/**
 * Matches SwiftUI DayPlanCard styling
 */
export default function MealPlanCard({
  mealPlan,
  onToggleComplete,
  onDelete,
  onPress,
}: MealPlanCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const iconName = MEAL_TYPE_ICONS[mealPlan.mealType as MealType] || 'restaurant';

  return (
    <Pressable
      style={[
        styles.container,
        { backgroundColor: colorScheme === 'dark' ? colors.card : '#fff' },
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      {/* Left side: checkbox + content */}
      <View style={styles.leftContent}>
        <Pressable onPress={onToggleComplete} style={styles.checkbox}>
          <Ionicons
            name={mealPlan.isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
            size={26}
            color={mealPlan.isCompleted ? colors.success : '#C7C7CC'}
          />
        </Pressable>

        <View style={styles.content}>
          {/* Meal Type Badge */}
          <View style={styles.mealTypeRow}>
            <View style={[styles.mealTypeBadge, { backgroundColor: colors.tint + '1A' }]}>
              <Ionicons name={iconName as any} size={12} color={colors.tint} />
              <ThemedText style={[styles.mealTypeText, { color: colors.tint }]}>
                {mealPlan.mealType}
              </ThemedText>
            </View>
            {mealPlan.reminder && (
              <Ionicons name="notifications" size={14} color={colors.warning} />
            )}
          </View>

          {/* Recipe Name */}
          <ThemedText
            style={[styles.recipeName, mealPlan.isCompleted && styles.completedText]}
            numberOfLines={2}
          >
            {mealPlan.recipeName || 'No recipe selected'}
          </ThemedText>

          {/* Notes */}
          {mealPlan.notes && (
            <ThemedText style={styles.notes} numberOfLines={1}>
              {mealPlan.notes}
            </ThemedText>
          )}
        </View>
      </View>

      {/* Right side: chevron */}
      {onPress && (
        <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  leftContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    marginRight: 12,
    marginTop: 2,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  mealTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mealTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  mealTypeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  recipeName: {
    fontSize: 17,
    fontWeight: '500',
    lineHeight: 22,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#8E8E93',
  },
  notes: {
    fontSize: 13,
    color: '#8E8E93',
    lineHeight: 18,
  },
});
