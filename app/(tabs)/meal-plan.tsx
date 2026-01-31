import React, { useCallback, useState, useMemo } from 'react'
import { StyleSheet, FlatList, View, ScrollView, useColorScheme, Dimensions } from 'react-native'
import { router, Stack } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Icon } from '@/src/components/ui/Icon'
import { useFocusEffect } from '@react-navigation/native'
import * as Haptics from 'expo-haptics'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'

import { ThemedView, ThemedText } from '@/components/Themed'
import { useMealPlanStore } from '@/src/stores/mealPlanStore'
import { useSettingsStore } from '@/src/stores/settingsStore'
import { MealPlan, MealType } from '@/src/types'
import MealPlanCard from '@/src/components/MealPlanCard'
import EmptyState from '@/src/components/EmptyState'
import AnimatedPressable from '@/src/components/ui/AnimatedPressable'
import Colors, { shadows, radius, spacing, typography, TAB_SCROLL_PADDING } from '@/constants/Colors'

const MEAL_ORDER: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack']
const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const SCREEN_WIDTH = Dimensions.get('window').width

type ViewMode = 'week' | 'month'

export default function MealPlanScreen() {
  const colorScheme = useColorScheme()
  const colors = Colors[colorScheme ?? 'light']
  const insets = useSafeAreaInsets()
  const { mealPlans, loadMealPlans, deleteMealPlan, toggleCompleted } = useMealPlanStore()
  const hapticFeedback = useSettingsStore((state) => state.hapticFeedback)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('week')

  useFocusEffect(
    useCallback(() => {
      loadMealPlans()
    }, [loadMealPlans])
  )

  const triggerHaptic = (type: 'selection' | 'success' | 'light') => {
    if (!hapticFeedback) return
    if (type === 'selection') {
      Haptics.selectionAsync()
    } else if (type === 'success') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
  }

  const getWeekDates = (date: Date): Date[] => {
    const startOfWeek = new Date(date)
    const day = startOfWeek.getDay()
    startOfWeek.setDate(startOfWeek.getDate() - day)

    const dates: Date[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek)
      d.setDate(d.getDate() + i)
      dates.push(d)
    }
    return dates
  }

  const weekDates = getWeekDates(selectedDate)

  const getMealsForDate = useCallback(
    (date: Date): MealPlan[] => {
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)

      return mealPlans.filter((mp) => {
        const mpDate = new Date(mp.date)
        return mpDate >= startOfDay && mpDate <= endOfDay
      })
    },
    [mealPlans]
  )

  const isToday = (date: Date): boolean => {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  const isSameDay = (d1: Date, d2: Date): boolean => {
    return (
      d1.getDate() === d2.getDate() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getFullYear() === d2.getFullYear()
    )
  }

  const isSameMonth = (d1: Date, d2: Date): boolean => {
    return d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear()
  }

  const navigateWeek = (direction: number) => {
    triggerHaptic('selection')
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + direction * 7)
    setSelectedDate(newDate)
  }

  const navigateMonth = (direction: number) => {
    triggerHaptic('selection')
    const newDate = new Date(selectedDate)
    newDate.setMonth(newDate.getMonth() + direction)
    setSelectedDate(newDate)
  }

  const goToToday = () => {
    triggerHaptic('selection')
    setSelectedDate(new Date())
  }

  const todayMeals = getMealsForDate(selectedDate).sort((a, b) => {
    return MEAL_ORDER.indexOf(a.mealType as MealType) - MEAL_ORDER.indexOf(b.mealType as MealType)
  })

  const formatWeekRange = (): string => {
    const startMonth = weekDates[0].toLocaleDateString('en-US', { month: 'short' })
    const endMonth = weekDates[6].toLocaleDateString('en-US', { month: 'short' })
    if (startMonth === endMonth) {
      return `${startMonth} ${weekDates[0].getDate()} - ${weekDates[6].getDate()}`
    }
    return `${startMonth} ${weekDates[0].getDate()} - ${endMonth} ${weekDates[6].getDate()}`
  }

  const formatMonthYear = (): string => {
    return selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  // Generate month dates including padding days from prev/next months
  const generateMonthDates = useMemo((): Date[] => {
    const year = selectedDate.getFullYear()
    const month = selectedDate.getMonth()

    // First day of the month
    const firstDayOfMonth = new Date(year, month, 1)
    // Last day of the month
    const lastDayOfMonth = new Date(year, month + 1, 0)

    // Day of week for first day (0 = Sunday)
    const startDayOfWeek = firstDayOfMonth.getDay()

    // Start from the Sunday of the week containing the first day
    const startDate = new Date(firstDayOfMonth)
    startDate.setDate(startDate.getDate() - startDayOfWeek)

    // Calculate how many weeks we need (to include all days of the month)
    const endDayOfWeek = lastDayOfMonth.getDay()
    const endDate = new Date(lastDayOfMonth)
    endDate.setDate(endDate.getDate() + (6 - endDayOfWeek))

    const dates: Date[] = []
    const currentDate = new Date(startDate)

    while (currentDate <= endDate) {
      dates.push(new Date(currentDate))
      currentDate.setDate(currentDate.getDate() + 1)
    }

    return dates
  }, [selectedDate])

  const handleViewModeChange = (mode: ViewMode) => {
    triggerHaptic('selection')
    setViewMode(mode)
  }

  const handleDaySelect = (date: Date) => {
    triggerHaptic('light')
    setSelectedDate(date)
  }

  // Segmented Control Component
  const SegmentedControl = () => (
    <View
      style={[
        styles.segmentedContainer,
        { backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#E5E5EA' },
      ]}
    >
      <AnimatedPressable
        style={[
          styles.segmentedButton,
          viewMode === 'week' && [
            styles.segmentedButtonActive,
            { backgroundColor: colorScheme === 'dark' ? '#636366' : '#fff' },
          ],
        ]}
        onPress={() => handleViewModeChange('week')}
        hapticType="none"
      >
        <ThemedText
          style={[styles.segmentedText, { color: colors.textTertiary }, viewMode === 'week' && styles.segmentedTextActive]}
        >
          Week
        </ThemedText>
      </AnimatedPressable>
      <AnimatedPressable
        style={[
          styles.segmentedButton,
          viewMode === 'month' && [
            styles.segmentedButtonActive,
            { backgroundColor: colorScheme === 'dark' ? '#636366' : '#fff' },
          ],
        ]}
        onPress={() => handleViewModeChange('month')}
        hapticType="none"
      >
        <ThemedText
          style={[styles.segmentedText, { color: colors.textTertiary }, viewMode === 'month' && styles.segmentedTextActive]}
        >
          Month
        </ThemedText>
      </AnimatedPressable>
    </View>
  )

  // Calendar Day Cell Component
  const CalendarDayCell = ({
    date,
    isCurrentMonth,
    isSelected,
    isTodayDate,
    mealCount,
    onPress,
  }: {
    date: Date
    isCurrentMonth: boolean
    isSelected: boolean
    isTodayDate: boolean
    mealCount: number
    onPress: () => void
  }) => {
    const cellWidth = (SCREEN_WIDTH - spacing.lg * 2 - spacing.md * 2) / 7

    return (
      <AnimatedPressable
        onPress={onPress}
        hapticType="none"
        scaleOnPress={0.9}
        style={[styles.calendarDayCell, { width: cellWidth }]}
      >
        <View
          style={[
            styles.calendarDayCellInner,
            isSelected && { backgroundColor: colors.tint },
            isTodayDate && !isSelected && { borderColor: colors.tint, borderWidth: 2 },
          ]}
        >
          <ThemedText
            style={[
              styles.calendarDayNumber,
              !isCurrentMonth && { color: colors.textTertiary, opacity: 0.5 },
              isTodayDate && !isSelected && { color: colors.tint, fontWeight: '700' },
              isSelected && { color: '#FFFFFF', fontWeight: '700' },
            ]}
          >
            {date.getDate()}
          </ThemedText>
          {mealCount > 0 && (
            <View
              style={[
                styles.mealIndicator,
                { backgroundColor: isSelected ? '#FFFFFF' : colors.tint },
              ]}
            />
          )}
        </View>
      </AnimatedPressable>
    )
  }

  // Month View Component
  const MonthView = () => (
    <Animated.View entering={FadeIn.duration(250)} style={styles.monthViewContainer}>
      {/* Month Navigation */}
      <View style={[styles.monthNavHeader, { backgroundColor: colors.card }, shadows.small]}>
        <AnimatedPressable
          onPress={() => navigateMonth(-1)}
          hapticType="selection"
          style={styles.navButton}
        >
          <Icon name="chevron-back" size={24} color={colors.tint} />
        </AnimatedPressable>

        <AnimatedPressable onPress={goToToday} hapticType="selection">
          <ThemedText style={styles.monthTitle}>{formatMonthYear()}</ThemedText>
        </AnimatedPressable>

        <AnimatedPressable
          onPress={() => navigateMonth(1)}
          hapticType="selection"
          style={styles.navButton}
        >
          <Icon name="chevron-forward" size={24} color={colors.tint} />
        </AnimatedPressable>
      </View>

      {/* Calendar Grid */}
      <View style={[styles.calendarContainer, { backgroundColor: colors.card }, shadows.small]}>
        {/* Weekday Headers */}
        <View style={styles.weekdayHeader}>
          {WEEKDAY_LABELS.map((day, index) => (
            <View key={index} style={styles.weekdayCell}>
              <ThemedText style={[styles.weekdayText, { color: colors.textTertiary }]}>
                {day}
              </ThemedText>
            </View>
          ))}
        </View>

        {/* Calendar Days Grid */}
        <View style={styles.calendarGrid}>
          {generateMonthDates.map((date, index) => {
            const meals = getMealsForDate(date)
            const isCurrentMonth = isSameMonth(date, selectedDate)
            const isSelected = isSameDay(date, selectedDate)
            const isTodayDate = isToday(date)

            return (
              <CalendarDayCell
                key={index}
                date={date}
                isCurrentMonth={isCurrentMonth}
                isSelected={isSelected}
                isTodayDate={isTodayDate}
                mealCount={meals.length}
                onPress={() => handleDaySelect(date)}
              />
            )
          })}
        </View>
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* Selected Day Details */}
      <Animated.View
        entering={FadeInDown.delay(100).duration(250)}
        style={styles.selectedDayDetails}
      >
        <View style={styles.selectedDayHeader}>
          <ThemedText style={styles.selectedDayTitle}>
            {isToday(selectedDate)
              ? 'Today'
              : selectedDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                })}
          </ThemedText>
          <ThemedText style={[styles.mealCount, { color: colors.textTertiary }]}>
            {todayMeals.length} {todayMeals.length === 1 ? 'meal' : 'meals'}
          </ThemedText>
        </View>

        {/* Meals for Selected Day */}
        {todayMeals.length === 0 ? (
          <View style={styles.monthEmptyState}>
            <Icon name="calendar-outline" size={32} color={colors.textTertiary} />
            <ThemedText style={[styles.monthEmptyText, { color: colors.textTertiary }]}>
              No meals planned
            </ThemedText>
            <AnimatedPressable
              onPress={() => {
                triggerHaptic('selection')
                router.push({
                  pathname: '/meal-plan/add',
                  params: { date: selectedDate.toISOString() },
                } as any)
              }}
              hapticType="selection"
              style={[styles.addMealButton, { backgroundColor: colors.tint }]}
            >
              <Icon name="add" size={18} color="#FFFFFF" />
              <ThemedText style={styles.addMealButtonText}>Add Meal</ThemedText>
            </AnimatedPressable>
          </View>
        ) : (
          <ScrollView
            style={styles.monthMealsList}
            contentContainerStyle={styles.monthMealsListContent}
            showsVerticalScrollIndicator={false}
          >
            {todayMeals.map((item, index) => (
              <MealPlanCard
                key={item.id}
                mealPlan={item}
                onToggleComplete={() => {
                  if (!item.isCompleted) {
                    triggerHaptic('success')
                  }
                  toggleCompleted(item.id)
                }}
                onDelete={() => deleteMealPlan(item.id)}
                onPress={() => (item.recipeId ? router.push(`/recipe/${item.recipeId}`) : null)}
                index={index}
              />
            ))}
          </ScrollView>
        )}
      </Animated.View>
    </Animated.View>
  )

  // Week View Component (existing implementation)
  const WeekView = () => (
    <>
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
            <Icon name="chevron-back" size={24} color={colors.tint} />
          </AnimatedPressable>

          <AnimatedPressable onPress={goToToday} hapticType="selection">
            <ThemedText style={styles.weekTitle}>{formatWeekRange()}</ThemedText>
          </AnimatedPressable>

          <AnimatedPressable
            onPress={() => navigateWeek(1)}
            hapticType="selection"
            style={styles.navButton}
          >
            <Icon name="chevron-forward" size={24} color={colors.tint} />
          </AnimatedPressable>
        </View>

        {/* Day Selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.daySelector}
        >
          {weekDates.map((date, index) => {
            const meals = getMealsForDate(date)
            const isSelected = isSameDay(date, selectedDate)
            const todayStyle = isToday(date)

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
                    style={[styles.dayNumber, { color: isSelected ? '#FFFFFF' : colors.text }]}
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
            )
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
            : selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}
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
          onAction={() =>
            router.push({
              pathname: '/meal-plan/add',
              params: { date: selectedDate.toISOString() },
            } as any)
          }
        />
      ) : (
        <FlatList
          data={todayMeals}
          renderItem={({ item, index }) => (
            <MealPlanCard
              mealPlan={item}
              onToggleComplete={() => {
                if (!item.isCompleted) {
                  triggerHaptic('success')
                }
                toggleCompleted(item.id)
              }}
              onDelete={() => deleteMealPlan(item.id)}
              onPress={() => (item.recipeId ? router.push(`/recipe/${item.recipeId}`) : null)}
              index={index}
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </>
  )

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Meal Plan',
          headerLargeTitle: true,
          headerLeft: () => (
            <AnimatedPressable
              onPress={goToToday}
              hapticType="selection"
              style={styles.headerButton}
            >
              <ThemedText style={[styles.todayButtonText, { color: colors.tint }]}>
                Today
              </ThemedText>
            </AnimatedPressable>
          ),
          headerRight: () => (
            <AnimatedPressable
              onPress={() => {
                triggerHaptic('selection')
                router.push({
                  pathname: '/meal-plan/add',
                  params: { date: selectedDate.toISOString() },
                } as any)
              }}
              hapticType="medium"
              style={styles.headerButton}
            >
              <Icon name="add" size={28} color={colors.tint} />
            </AnimatedPressable>
          ),
        }}
      />
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        {/* View Mode Toggle */}
        <View style={styles.segmentedWrapper}>
          <SegmentedControl />
        </View>

        {/* Render based on view mode */}
        {viewMode === 'week' ? <WeekView /> : <MonthView />}
      </ThemedView>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerButton: {
    padding: spacing.xs,
  },
  todayButtonText: {
    ...typography.bodyLarge,
    fontWeight: '500',
  },
  segmentedWrapper: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  segmentedContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 2,
  },
  segmentedButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
  },
  segmentedButtonActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentedText: {
    fontSize: 13,
    fontWeight: '500',
  },
  segmentedTextActive: {
    fontWeight: '600',
    color: undefined,
  },
  weekHeader: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
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
    paddingBottom: TAB_SCROLL_PADDING,
  },
  // Month View Styles
  monthViewContainer: {
    flex: 1,
  },
  monthNavHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.xl,
  },
  monthTitle: {
    ...typography.titleMedium,
  },
  calendarContainer: {
    marginHorizontal: spacing.lg,
    borderRadius: radius.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  weekdayHeader: {
    flexDirection: 'row',
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    marginBottom: spacing.sm,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
  },
  weekdayText: {
    ...typography.caption,
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDayCell: {
    aspectRatio: 1,
    padding: 2,
  },
  calendarDayCellInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    gap: 2,
  },
  calendarDayNumber: {
    ...typography.bodyMedium,
  },
  mealIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
  },
  selectedDayDetails: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  monthEmptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['3xl'],
    gap: spacing.md,
  },
  monthEmptyText: {
    ...typography.bodyMedium,
  },
  addMealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  addMealButtonText: {
    ...typography.labelMedium,
    color: '#FFFFFF',
  },
  monthMealsList: {
    flex: 1,
  },
  monthMealsListContent: {
    paddingBottom: TAB_SCROLL_PADDING,
  },
})
