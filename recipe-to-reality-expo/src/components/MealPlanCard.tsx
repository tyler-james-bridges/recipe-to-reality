import React from 'react';
import { StyleSheet, View, Pressable, useColorScheme } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemedText } from '@/components/Themed';
import { MealPlan, MealType, MEAL_TYPE_ICONS } from '../types';

interface MealPlanCardProps {
  mealPlan: MealPlan;
  onToggleComplete: () => void;
  onDelete: () => void;
  onPress?: () => void;
}

export default function MealPlanCard({
  mealPlan,
  onToggleComplete,
  onDelete,
  onPress,
}: MealPlanCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const iconName = MEAL_TYPE_ICONS[mealPlan.mealType as MealType] || 'food';

  return (
    <Pressable
      style={[
        styles.container,
        { backgroundColor: isDark ? '#1f1f1f' : '#fff' },
        mealPlan.isCompleted && styles.completedContainer,
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      <Pressable onPress={onToggleComplete} style={styles.checkbox}>
        <MaterialCommunityIcons
          name={mealPlan.isCompleted ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
          size={24}
          color={mealPlan.isCompleted ? '#22c55e' : '#ccc'}
        />
      </Pressable>

      <View style={styles.content}>
        <View style={styles.header}>
          <View
            style={[
              styles.mealTypeBadge,
              { backgroundColor: isDark ? '#333' : '#f0f0f0' },
            ]}
          >
            <MaterialCommunityIcons
              name={iconName as React.ComponentProps<typeof MaterialCommunityIcons>['name']}
              size={14}
              color="#FF6B35"
            />
            <ThemedText style={styles.mealTypeText}>{mealPlan.mealType}</ThemedText>
          </View>
          {mealPlan.reminder && (
            <MaterialCommunityIcons name="bell" size={14} color="#f59e0b" />
          )}
        </View>

        <ThemedText
          style={[styles.recipeName, mealPlan.isCompleted && styles.completedText]}
          numberOfLines={2}
        >
          {mealPlan.recipeName || 'No recipe selected'}
        </ThemedText>

        {mealPlan.notes && (
          <ThemedText style={styles.notes} numberOfLines={1}>
            {mealPlan.notes}
          </ThemedText>
        )}
      </View>

      <View style={styles.actions}>
        {onPress && (
          <MaterialCommunityIcons name="chevron-right" size={24} color="#ccc" />
        )}
        <Pressable onPress={onDelete} style={styles.deleteButton}>
          <MaterialCommunityIcons name="delete-outline" size={20} color="#999" />
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  completedContainer: {
    opacity: 0.7,
  },
  checkbox: {
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
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
    fontWeight: '500',
    color: '#666',
  },
  recipeName: {
    fontSize: 16,
    fontWeight: '500',
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  notes: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deleteButton: {
    padding: 8,
  },
});
