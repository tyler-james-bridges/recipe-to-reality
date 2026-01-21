import React, { useCallback, useState } from 'react';
import { StyleSheet, FlatList, View, Pressable, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { ThemedView, ThemedText } from '@/components/Themed';
import { useMealPlanStore } from '@/src/stores/mealPlanStore';
import { MealPlan, MEAL_TYPES, MealType } from '@/src/types';
import MealPlanCard from '@/src/components/MealPlanCard';
import EmptyState from '@/src/components/EmptyState';

type ViewMode = 'week' | 'month';

export default function MealPlanScreen() {
  const { mealPlans, loadMealPlans, deleteMealPlan, toggleCompleted } = useMealPlanStore();
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [selectedDate, setSelectedDate] = useState(new Date());

  useFocusEffect(
    useCallback(() => {
      loadMealPlans();
    }, [loadMealPlans])
  );

  const getWeekDates = (date: Date): Date[] => {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - day);

    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(d.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  const weekDates = getWeekDates(selectedDate);

  const getMealsForDate = (date: Date): MealPlan[] => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return mealPlans.filter((mp) => {
      const mpDate = new Date(mp.date);
      return mpDate >= startOfDay && mpDate <= endOfDay;
    });
  };

  const formatDayName = (date: Date): string => {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const formatDayNumber = (date: Date): string => {
    return date.getDate().toString();
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const navigateWeek = (direction: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + direction * 7);
    setSelectedDate(newDate);
  };

  const todayMeals = getMealsForDate(selectedDate);

  return (
    <ThemedView style={styles.container}>
      {/* Week navigation */}
      <View style={styles.weekNav}>
        <Pressable onPress={() => navigateWeek(-1)} style={styles.navButton}>
          <MaterialCommunityIcons name="chevron-left" size={24} color="#666" />
        </Pressable>
        <ThemedText style={styles.weekTitle}>
          {weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} -{' '}
          {weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </ThemedText>
        <Pressable onPress={() => navigateWeek(1)} style={styles.navButton}>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#666" />
        </Pressable>
      </View>

      {/* Day selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.daySelector}
      >
        {weekDates.map((date, index) => {
          const meals = getMealsForDate(date);
          const isSelected =
            date.getDate() === selectedDate.getDate() &&
            date.getMonth() === selectedDate.getMonth();

          return (
            <Pressable
              key={index}
              style={[
                styles.dayButton,
                isSelected && styles.dayButtonSelected,
                isToday(date) && styles.dayButtonToday,
              ]}
              onPress={() => setSelectedDate(date)}
            >
              <ThemedText
                style={[styles.dayName, isSelected && styles.dayTextSelected]}
              >
                {formatDayName(date)}
              </ThemedText>
              <ThemedText
                style={[styles.dayNumber, isSelected && styles.dayTextSelected]}
              >
                {formatDayNumber(date)}
              </ThemedText>
              {meals.length > 0 && (
                <View style={[styles.mealDot, isSelected && styles.mealDotSelected]} />
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Meals for selected day */}
      {todayMeals.length === 0 ? (
        <EmptyState
          icon="calendar-blank"
          title="No meals planned"
          message={`Add a meal for ${selectedDate.toLocaleDateString('en-US', { weekday: 'long' })}`}
          actionLabel="Add Meal"
          onAction={() => router.push({ pathname: '/meal-plan/add', params: { date: selectedDate.toISOString() } })}
        />
      ) : (
        <FlatList
          data={todayMeals.sort((a, b) => {
            const order = { Breakfast: 0, Lunch: 1, Dinner: 2, Snack: 3 };
            return order[a.mealType as MealType] - order[b.mealType as MealType];
          })}
          renderItem={({ item }) => (
            <MealPlanCard
              mealPlan={item}
              onToggleComplete={() => toggleCompleted(item.id)}
              onDelete={() => deleteMealPlan(item.id)}
              onPress={() =>
                item.recipeId ? router.push(`/recipe/${item.recipeId}`) : null
              }
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Pressable
        style={styles.fab}
        onPress={() => router.push({ pathname: '/meal-plan/add', params: { date: selectedDate.toISOString() } })}
      >
        <MaterialCommunityIcons name="plus" size={28} color="#fff" />
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  weekNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  navButton: {
    padding: 8,
  },
  weekTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  daySelector: {
    paddingHorizontal: 12,
    gap: 8,
    paddingBottom: 16,
  },
  dayButton: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    minWidth: 60,
  },
  dayButtonSelected: {
    backgroundColor: '#FF6B35',
  },
  dayButtonToday: {
    borderWidth: 2,
    borderColor: '#FF6B35',
  },
  dayName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  dayTextSelected: {
    color: '#fff',
  },
  mealDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF6B35',
    marginTop: 6,
  },
  mealDotSelected: {
    backgroundColor: '#fff',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
