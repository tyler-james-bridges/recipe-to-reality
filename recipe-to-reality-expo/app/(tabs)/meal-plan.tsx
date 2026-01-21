import React, { useCallback, useState } from 'react';
import { StyleSheet, FlatList, View, Pressable, ScrollView, useColorScheme } from 'react-native';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

import { ThemedView, ThemedText } from '@/components/Themed';
import { useMealPlanStore } from '@/src/stores/mealPlanStore';
import { useSettingsStore } from '@/src/stores/settingsStore';
import { MealPlan, MealType } from '@/src/types';
import MealPlanCard from '@/src/components/MealPlanCard';
import EmptyState from '@/src/components/EmptyState';
import Colors from '@/constants/Colors';

const MEAL_ORDER: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

export default function MealPlanScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { mealPlans, loadMealPlans, deleteMealPlan, toggleCompleted } = useMealPlanStore();
  const hapticFeedback = useSettingsStore((state) => state.hapticFeedback);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useFocusEffect(
    useCallback(() => {
      loadMealPlans();
    }, [loadMealPlans])
  );

  const triggerHaptic = (type: 'selection' | 'success') => {
    if (!hapticFeedback) return;
    if (type === 'selection') {
      Haptics.selectionAsync();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

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

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSameDay = (d1: Date, d2: Date): boolean => {
    return (
      d1.getDate() === d2.getDate() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getFullYear() === d2.getFullYear()
    );
  };

  const navigateWeek = (direction: number) => {
    triggerHaptic('selection');
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + direction * 7);
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    triggerHaptic('selection');
    setSelectedDate(new Date());
  };

  const todayMeals = getMealsForDate(selectedDate).sort((a, b) => {
    return MEAL_ORDER.indexOf(a.mealType as MealType) - MEAL_ORDER.indexOf(b.mealType as MealType);
  });

  const formatWeekRange = (): string => {
    const startMonth = weekDates[0].toLocaleDateString('en-US', { month: 'short' });
    const endMonth = weekDates[6].toLocaleDateString('en-US', { month: 'short' });
    if (startMonth === endMonth) {
      return `${startMonth} ${weekDates[0].getDate()} - ${weekDates[6].getDate()}`;
    }
    return `${startMonth} ${weekDates[0].getDate()} - ${endMonth} ${weekDates[6].getDate()}`;
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Meal Plan',
          headerLargeTitle: true,
          headerRight: () => (
            <Pressable
              onPress={() => {
                triggerHaptic('selection');
                router.push({ pathname: '/meal-plan/add', params: { date: selectedDate.toISOString() } });
              }}
              style={styles.headerButton}
            >
              <Ionicons name="add" size={28} color={colors.tint} />
            </Pressable>
          ),
        }}
      />
      <ThemedView style={styles.container}>
        {/* Week Navigation Header */}
        <View style={[styles.weekHeader, { backgroundColor: colors.card }]}>
          <View style={styles.weekNav}>
            <Pressable onPress={() => navigateWeek(-1)} style={styles.navButton}>
              <Ionicons name="chevron-back" size={24} color={colors.tint} />
            </Pressable>

            <Pressable onPress={goToToday}>
              <ThemedText style={styles.weekTitle}>{formatWeekRange()}</ThemedText>
            </Pressable>

            <Pressable onPress={() => navigateWeek(1)} style={styles.navButton}>
              <Ionicons name="chevron-forward" size={24} color={colors.tint} />
            </Pressable>
          </View>

          {/* Day Selector */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.daySelector}
          >
            {weekDates.map((date, index) => {
              const meals = getMealsForDate(date);
              const isSelected = isSameDay(date, selectedDate);
              const todayStyle = isToday(date);

              return (
                <Pressable
                  key={index}
                  style={[
                    styles.dayButton,
                    { backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#F2F2F7' },
                    isSelected && { backgroundColor: colors.tint },
                    todayStyle && !isSelected && { borderColor: colors.tint, borderWidth: 2 },
                  ]}
                  onPress={() => {
                    triggerHaptic('selection');
                    setSelectedDate(date);
                  }}
                >
                  <ThemedText
                    style={[styles.dayName, isSelected && { color: '#fff' }]}
                  >
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </ThemedText>
                  <ThemedText
                    style={[styles.dayNumber, isSelected && { color: '#fff' }]}
                  >
                    {date.getDate()}
                  </ThemedText>
                  {meals.length > 0 && (
                    <View
                      style={[
                        styles.mealDot,
                        { backgroundColor: isSelected ? '#fff' : colors.tint },
                      ]}
                    />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Selected Day Title */}
        <View style={styles.selectedDayHeader}>
          <ThemedText style={styles.selectedDayTitle}>
            {isToday(selectedDate)
              ? 'Today'
              : selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </ThemedText>
          <ThemedText style={styles.mealCount}>
            {todayMeals.length} {todayMeals.length === 1 ? 'meal' : 'meals'}
          </ThemedText>
        </View>

        {/* Meals for Selected Day */}
        {todayMeals.length === 0 ? (
          <EmptyState
            icon="calendar-outline"
            title="No Meals Planned"
            message={`Plan your meals for ${isToday(selectedDate) ? 'today' : selectedDate.toLocaleDateString('en-US', { weekday: 'long' })}.`}
            actionLabel="Add Meal"
            onAction={() => router.push({ pathname: '/meal-plan/add', params: { date: selectedDate.toISOString() } })}
          />
        ) : (
          <FlatList
            data={todayMeals}
            renderItem={({ item }) => (
              <MealPlanCard
                mealPlan={item}
                onToggleComplete={() => {
                  if (!item.isCompleted) {
                    triggerHaptic('success');
                  }
                  toggleCompleted(item.id);
                }}
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
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerButton: {
    padding: 4,
  },
  weekHeader: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  weekNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  navButton: {
    padding: 8,
  },
  weekTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  daySelector: {
    paddingHorizontal: 12,
    gap: 8,
  },
  dayButton: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    minWidth: 52,
  },
  dayName: {
    fontSize: 11,
    fontWeight: '500',
    color: '#8E8E93',
    marginBottom: 2,
  },
  dayNumber: {
    fontSize: 17,
    fontWeight: '600',
  },
  mealDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 4,
  },
  selectedDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  selectedDayTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  mealCount: {
    fontSize: 15,
    color: '#8E8E93',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
});
