import React, { useCallback, useState } from 'react';
import { StyleSheet, FlatList, View, ScrollView, useColorScheme } from 'react-native';
import { router, Stack, Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedView, ThemedText } from '@/components/Themed';
import { useMealPlanStore } from '@/src/stores/mealPlanStore';
import { useSettingsStore } from '@/src/stores/settingsStore';
import { MealPlan, MealType } from '@/src/types';
import MealPlanCard from '@/src/components/MealPlanCard';
import EmptyState from '@/src/components/EmptyState';
import AnimatedPressable from '@/src/components/ui/AnimatedPressable';
import Colors, { shadows, radius, spacing, typography, gradients } from '@/constants/Colors';

const MEAL_ORDER: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

export default function MealPlanScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const themeGradients = gradients[colorScheme ?? 'light'];
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
            <AnimatedPressable
              onPress={() => {
                triggerHaptic('selection');
                router.push({ pathname: '/meal-plan/add', params: { date: selectedDate.toISOString() } } as any);
              }}
              hapticType="medium"
              style={styles.headerButton}
            >
              <Ionicons name="add" size={28} color={colors.tint} />
            </AnimatedPressable>
          ),
        }}
      />
      <ThemedView style={styles.container}>
        {/* Week Navigation Header */}
        <Animated.View
          entering={FadeIn.duration(300)}
          style={[styles.weekHeader, { backgroundColor: colors.card }, shadows.small]}
        >
          <View style={styles.weekNav}>
            <AnimatedPressable
              onPress={() => navigateWeek(-1)}
              hapticType="selection"
              style={styles.navButton}
            >
              <Ionicons name="chevron-back" size={24} color={colors.tint} />
            </AnimatedPressable>

            <AnimatedPressable onPress={goToToday} hapticType="selection">
              <ThemedText style={styles.weekTitle}>{formatWeekRange()}</ThemedText>
            </AnimatedPressable>

            <AnimatedPressable
              onPress={() => navigateWeek(1)}
              hapticType="selection"
              style={styles.navButton}
            >
              <Ionicons name="chevron-forward" size={24} color={colors.tint} />
            </AnimatedPressable>
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
                <AnimatedPressable
                  key={index}
                  hapticType="selection"
                  scaleOnPress={0.95}
                  onPress={() => setSelectedDate(date)}
                  style={styles.dayButtonWrapper}
                >
                  <View
                    style={[
                      styles.dayButton,
                      { backgroundColor: colorScheme === 'dark' ? colors.cardElevated : '#F5F5F7' },
                      isSelected && { backgroundColor: colors.tint },
                      todayStyle && !isSelected && { borderColor: colors.tint, borderWidth: 2 },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.dayName,
                        { color: isSelected ? '#FFFFFF' : colors.textTertiary },
                      ]}
                    >
                      {date.toLocaleDateString('en-US', { weekday: 'short' })}
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.dayNumber,
                        { color: isSelected ? '#FFFFFF' : colors.text },
                      ]}
                    >
                      {date.getDate()}
                    </ThemedText>
                    {meals.length > 0 && (
                      <View
                        style={[
                          styles.mealDot,
                          { backgroundColor: isSelected ? '#FFFFFF' : colors.tint },
                        ]}
                      />
                    )}
                  </View>
                </AnimatedPressable>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* Selected Day Title */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(300)}
          style={styles.selectedDayHeader}
        >
          <ThemedText style={styles.selectedDayTitle}>
            {isToday(selectedDate)
              ? 'Today'
              : selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </ThemedText>
          <ThemedText style={[styles.mealCount, { color: colors.textTertiary }]}>
            {todayMeals.length} {todayMeals.length === 1 ? 'meal' : 'meals'}
          </ThemedText>
        </Animated.View>

        {/* Meals for Selected Day */}
        {todayMeals.length === 0 ? (
          <EmptyState
            icon="calendar-outline"
            title="No Meals Planned"
            message={`Plan your meals for ${isToday(selectedDate) ? 'today' : selectedDate.toLocaleDateString('en-US', { weekday: 'long' })}.`}
            actionLabel="Add Meal"
            onAction={() => router.push({ pathname: '/meal-plan/add', params: { date: selectedDate.toISOString() } } as any)}
          />
        ) : (
          <FlatList
            data={todayMeals}
            renderItem={({ item, index }) => (
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
                index={index}
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
    padding: spacing.xs,
  },
  weekHeader: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderRadius: radius.xl,
  },
  weekNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  navButton: {
    padding: spacing.sm,
  },
  weekTitle: {
    ...typography.titleMedium,
  },
  daySelector: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  dayButtonWrapper: {
    // Wrapper for press animation
  },
  dayButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    minWidth: 54,
    gap: spacing.xs,
  },
  dayName: {
    ...typography.labelSmall,
  },
  dayNumber: {
    ...typography.titleMedium,
  },
  mealDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  selectedDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  selectedDayTitle: {
    ...typography.titleLarge,
  },
  mealCount: {
    ...typography.bodyMedium,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
  },
});
