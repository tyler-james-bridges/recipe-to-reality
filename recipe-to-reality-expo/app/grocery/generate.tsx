import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  useColorScheme,
  Platform,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { Icon } from '@/src/components/ui/Icon';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import DateTimePicker from '@react-native-community/datetimepicker';

import { ThemedView, ThemedText } from '@/components/Themed';
import { useGroceryStore } from '@/src/stores/groceryStore';
import { useRecipeStore } from '@/src/stores/recipeStore';
import { useMealPlanStore } from '@/src/stores/mealPlanStore';
import { useSettingsStore } from '@/src/stores/settingsStore';
import { RecipeWithIngredients, MealPlan, MEAL_TYPES } from '@/src/types';
import AnimatedPressable from '@/src/components/ui/AnimatedPressable';
import ModernButton from '@/src/components/ui/ModernButton';
import GlassCard from '@/src/components/ui/GlassCard';
import Badge from '@/src/components/ui/Badge';
import Colors, { shadows, radius, spacing, typography } from '@/constants/Colors';

type GenerateMode = 'recipes' | 'mealPlan';

// Segmented Control Component
function SegmentedControl({
  options,
  selectedIndex,
  onChange,
}: {
  options: { key: GenerateMode; label: string }[];
  selectedIndex: number;
  onChange: (index: number) => void;
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const hapticFeedback = useSettingsStore((state) => state.hapticFeedback);

  const selectedPosition = useSharedValue(selectedIndex);

  useEffect(() => {
    selectedPosition.value = withSpring(selectedIndex, {
      damping: 20,
      stiffness: 200,
    });
  }, [selectedIndex]);

  const handlePress = (index: number) => {
    if (hapticFeedback) {
      Haptics.selectionAsync();
    }
    onChange(index);
  };

  return (
    <View
      style={[
        styles.segmentedContainer,
        {
          backgroundColor: colorScheme === 'dark' ? colors.cardElevated : colors.skeleton,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.segmentedIndicator,
          {
            backgroundColor: colors.card,
            width: `${100 / options.length}%`,
            left: `${(selectedIndex * 100) / options.length}%`,
          },
          shadows.small,
        ]}
      />
      {options.map((option, index) => (
        <AnimatedPressable
          key={option.key}
          onPress={() => handlePress(index)}
          hapticType="none"
          style={styles.segmentedOption}
        >
          <ThemedText
            style={[
              styles.segmentedLabel,
              { color: selectedIndex === index ? colors.text : colors.textTertiary },
            ]}
          >
            {option.label}
          </ThemedText>
        </AnimatedPressable>
      ))}
    </View>
  );
}

// Recipe Selection Item
function RecipeSelectItem({
  recipe,
  isSelected,
  isInQueue,
  onToggle,
  index,
}: {
  recipe: RecipeWithIngredients;
  isSelected: boolean;
  isInQueue: boolean;
  onToggle: () => void;
  index: number;
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const selectedValue = useSharedValue(isSelected ? 1 : 0);

  useEffect(() => {
    selectedValue.value = withSpring(isSelected ? 1 : 0, {
      damping: 15,
      stiffness: 200,
    });
  }, [isSelected]);

  const animatedCheckStyle = useAnimatedStyle(() => ({
    transform: [{ scale: selectedValue.value }],
  }));

  return (
    <Animated.View
      entering={FadeInDown.duration(300).delay(index * 50)}
      layout={Layout.springify()}
    >
      <AnimatedPressable
        onPress={onToggle}
        hapticType="selection"
        style={[
          styles.recipeItem,
          {
            backgroundColor: colors.card,
            borderColor: isSelected ? colors.tint : colors.border,
            borderWidth: isSelected ? 2 : StyleSheet.hairlineWidth,
          },
          shadows.small,
        ]}
      >
        <View style={styles.recipeCheckbox}>
          <View
            style={[
              styles.checkbox,
              {
                backgroundColor: isSelected ? colors.tint : 'transparent',
                borderColor: isSelected ? colors.tint : colors.textTertiary,
              },
            ]}
          >
            {isSelected && (
              <Animated.View style={animatedCheckStyle}>
                <Icon name="checkmark" size={14} color="#FFFFFF" />
              </Animated.View>
            )}
          </View>
        </View>

        <View style={styles.recipeInfo}>
          <View style={styles.recipeTitleRow}>
            <ThemedText style={styles.recipeTitle} numberOfLines={1}>
              {recipe.title}
            </ThemedText>
            {isInQueue && (
              <Icon
                name="time"
                size={14}
                color={colors.tint}
                style={styles.queueIcon}
              />
            )}
          </View>
          <ThemedText style={[styles.recipeSubtitle, { color: colors.textTertiary }]}>
            {recipe.ingredients.length} ingredient{recipe.ingredients.length !== 1 ? 's' : ''}
          </ThemedText>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

// Meal Plan Item for date range view
function MealPlanItem({
  mealPlan,
  index,
}: {
  mealPlan: MealPlan;
  index: number;
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const getMealTypeIcon = (mealType: string): React.ComponentProps<typeof Icon>['name'] => {
    switch (mealType) {
      case 'Breakfast':
        return 'sunny-outline';
      case 'Lunch':
        return 'partly-sunny-outline';
      case 'Dinner':
        return 'moon-outline';
      case 'Snack':
        return 'leaf-outline';
      default:
        return 'restaurant-outline';
    }
  };

  return (
    <Animated.View
      entering={FadeInDown.duration(250).delay(index * 40)}
      style={[
        styles.mealPlanItem,
        { backgroundColor: colors.card },
        shadows.small,
      ]}
    >
      <View style={[styles.mealTypeIcon, { backgroundColor: colors.accentSubtle }]}>
        <Icon name={getMealTypeIcon(mealPlan.mealType)} size={16} color={colors.tint} />
      </View>
      <View style={styles.mealPlanInfo}>
        <ThemedText style={[styles.mealTypeLabel, { color: colors.textTertiary }]}>
          {mealPlan.mealType}
        </ThemedText>
        <ThemedText style={styles.mealPlanName} numberOfLines={1}>
          {mealPlan.recipeName || 'Custom meal'}
        </ThemedText>
      </View>
      {mealPlan.recipeId ? (
        <Icon name="checkmark-circle" size={18} color={colors.success} />
      ) : (
        <ThemedText style={[styles.noRecipeLabel, { color: colors.textTertiary }]}>
          No recipe
        </ThemedText>
      )}
    </Animated.View>
  );
}

// Date Section Header
function DateSectionHeader({ date }: { date: Date }) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <View style={styles.dateSectionHeader}>
      <ThemedText style={[styles.dateSectionTitle, { color: colors.textTertiary }]}>
        {formattedDate}
      </ThemedText>
    </View>
  );
}

export default function GenerateGroceryListScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const hapticFeedback = useSettingsStore((state) => state.hapticFeedback);

  // Stores
  const { recipes, loadRecipes } = useRecipeStore();
  const { mealPlans, loadMealPlans } = useMealPlanStore();
  const { generateFromRecipes } = useGroceryStore();

  // State
  const [generateMode, setGenerateMode] = useState<GenerateMode>('recipes');
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<Set<string>>(new Set());
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(() => {
    const date = new Date();
    date.setDate(date.getDate() + 6);
    return date;
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadRecipes();
    loadMealPlans();
  }, [loadRecipes, loadMealPlans]);

  // Computed values
  const queuedRecipes = useMemo(
    () => recipes.filter((r) => r.isInQueue),
    [recipes]
  );

  const mealPlansInRange = useMemo(() => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    return mealPlans.filter((mp) => {
      const mpDate = new Date(mp.date);
      return mpDate >= start && mpDate <= end;
    });
  }, [mealPlans, startDate, endDate]);

  const mealPlanRecipeIds = useMemo(() => {
    return new Set(mealPlansInRange.filter((mp) => mp.recipeId).map((mp) => mp.recipeId!));
  }, [mealPlansInRange]);

  const groupedMealPlans = useMemo(() => {
    const grouped: Record<string, MealPlan[]> = {};

    mealPlansInRange.forEach((mp) => {
      const date = new Date(mp.date);
      date.setHours(0, 0, 0, 0);
      const key = date.toISOString();

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(mp);
    });

    // Sort by meal type order
    const mealTypeOrder = { Breakfast: 0, Lunch: 1, Dinner: 2, Snack: 3 };
    Object.keys(grouped).forEach((key) => {
      grouped[key].sort(
        (a, b) => (mealTypeOrder[a.mealType] ?? 4) - (mealTypeOrder[b.mealType] ?? 4)
      );
    });

    return grouped;
  }, [mealPlansInRange]);

  const selectedIngredientCount = useMemo(() => {
    const selectedRecipes = recipes.filter((r) => selectedRecipeIds.has(r.id));
    return selectedRecipes.reduce((sum, r) => sum + r.ingredients.length, 0);
  }, [recipes, selectedRecipeIds]);

  const canGenerate =
    generateMode === 'recipes'
      ? selectedRecipeIds.size > 0
      : mealPlanRecipeIds.size > 0;

  // Handlers
  const triggerHaptic = useCallback(
    (type: 'selection' | 'success' | 'warning') => {
      if (!hapticFeedback) return;
      switch (type) {
        case 'selection':
          Haptics.selectionAsync();
          break;
        case 'success':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'warning':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
      }
    },
    [hapticFeedback]
  );

  const toggleRecipe = useCallback(
    (id: string) => {
      triggerHaptic('selection');
      setSelectedRecipeIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    },
    [triggerHaptic]
  );

  const selectQueue = useCallback(() => {
    triggerHaptic('selection');
    setSelectedRecipeIds(new Set(queuedRecipes.map((r) => r.id)));
  }, [queuedRecipes, triggerHaptic]);

  const clearSelection = useCallback(() => {
    triggerHaptic('selection');
    setSelectedRecipeIds(new Set());
  }, [triggerHaptic]);

  const handleGenerate = useCallback(async () => {
    if (!canGenerate) return;

    setIsGenerating(true);
    triggerHaptic('success');

    try {
      let recipesToUse: RecipeWithIngredients[];

      if (generateMode === 'recipes') {
        recipesToUse = recipes.filter((r) => selectedRecipeIds.has(r.id));
      } else {
        recipesToUse = recipes.filter((r) => mealPlanRecipeIds.has(r.id));
      }

      const listName =
        generateMode === 'recipes'
          ? 'Shopping List'
          : `Shopping List (${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()})`;

      await generateFromRecipes(recipesToUse, listName);
      router.back();
    } catch (error) {
      console.error('Failed to generate grocery list:', error);
      triggerHaptic('warning');
    } finally {
      setIsGenerating(false);
    }
  }, [
    canGenerate,
    generateMode,
    recipes,
    selectedRecipeIds,
    mealPlanRecipeIds,
    startDate,
    endDate,
    generateFromRecipes,
    triggerHaptic,
  ]);

  const handleStartDateChange = (_event: any, date?: Date) => {
    if (process.env.EXPO_OS === 'android') {
      setShowStartPicker(false);
    }
    if (date) {
      setStartDate(date);
      // Ensure end date is after start date
      if (date > endDate) {
        const newEnd = new Date(date);
        newEnd.setDate(newEnd.getDate() + 6);
        setEndDate(newEnd);
      }
    }
  };

  const handleEndDateChange = (_event: any, date?: Date) => {
    if (process.env.EXPO_OS === 'android') {
      setShowEndPicker(false);
    }
    if (date && date >= startDate) {
      setEndDate(date);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Generate List',
          headerLeft: () => (
            <AnimatedPressable
              onPress={() => router.back()}
              hapticType="selection"
              style={styles.headerButton}
            >
              <ThemedText style={[styles.headerButtonText, { color: colors.tint }]}>
                Cancel
              </ThemedText>
            </AnimatedPressable>
          ),
          headerRight: () => (
            <AnimatedPressable
              onPress={handleGenerate}
              hapticType="medium"
              disabled={!canGenerate || isGenerating}
              style={[styles.headerButton, (!canGenerate || isGenerating) && styles.headerButtonDisabled]}
            >
              <ThemedText
                style={[
                  styles.headerButtonText,
                  styles.headerButtonTextBold,
                  { color: canGenerate && !isGenerating ? colors.tint : colors.textTertiary },
                ]}
              >
                {isGenerating ? 'Generating...' : 'Generate'}
              </ThemedText>
            </AnimatedPressable>
          ),
        }}
      />
      <ThemedView style={styles.container}>
        {/* Mode Selector */}
        <Animated.View entering={FadeIn.duration(300)} style={styles.modeContainer}>
          <SegmentedControl
            options={[
              { key: 'recipes', label: 'Recipes' },
              { key: 'mealPlan', label: 'Meal Plan' },
            ]}
            selectedIndex={generateMode === 'recipes' ? 0 : 1}
            onChange={(index) => setGenerateMode(index === 0 ? 'recipes' : 'mealPlan')}
          />
        </Animated.View>

        {generateMode === 'recipes' ? (
          /* Recipes Mode */
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {recipes.length === 0 ? (
              <Animated.View
                entering={FadeIn.duration(300)}
                style={styles.emptyContainer}
              >
                <Icon name="book-outline" size={48} color={colors.textTertiary} />
                <ThemedText style={[styles.emptyTitle, { color: colors.textTertiary }]}>
                  No Recipes
                </ThemedText>
                <ThemedText style={[styles.emptyMessage, { color: colors.textTertiary }]}>
                  Add some recipes first to generate a grocery list.
                </ThemedText>
              </Animated.View>
            ) : (
              <>
                {/* Quick Actions */}
                <Animated.View
                  entering={FadeInDown.duration(300)}
                  style={styles.quickActions}
                >
                  <AnimatedPressable
                    onPress={selectQueue}
                    hapticType="selection"
                    disabled={queuedRecipes.length === 0}
                    style={[
                      styles.quickActionButton,
                      { backgroundColor: colors.card },
                      queuedRecipes.length === 0 && styles.quickActionDisabled,
                      shadows.small,
                    ]}
                  >
                    <Icon
                      name="time-outline"
                      size={18}
                      color={queuedRecipes.length > 0 ? colors.tint : colors.textTertiary}
                    />
                    <ThemedText
                      style={[
                        styles.quickActionLabel,
                        { color: queuedRecipes.length > 0 ? colors.text : colors.textTertiary },
                      ]}
                    >
                      Select Queue ({queuedRecipes.length})
                    </ThemedText>
                  </AnimatedPressable>

                  <AnimatedPressable
                    onPress={clearSelection}
                    hapticType="selection"
                    disabled={selectedRecipeIds.size === 0}
                    style={[
                      styles.quickActionButton,
                      { backgroundColor: colors.card },
                      selectedRecipeIds.size === 0 && styles.quickActionDisabled,
                      shadows.small,
                    ]}
                  >
                    <Icon
                      name="close-circle-outline"
                      size={18}
                      color={selectedRecipeIds.size > 0 ? colors.text : colors.textTertiary}
                    />
                    <ThemedText
                      style={[
                        styles.quickActionLabel,
                        { color: selectedRecipeIds.size > 0 ? colors.text : colors.textTertiary },
                      ]}
                    >
                      Clear
                    </ThemedText>
                  </AnimatedPressable>
                </Animated.View>

                {/* Selection Summary */}
                {selectedRecipeIds.size > 0 && (
                  <Animated.View
                    entering={FadeInDown.duration(200)}
                    style={[styles.summaryCard, { backgroundColor: colors.accentSubtle }]}
                  >
                    <Icon name="cart-outline" size={20} color={colors.tint} />
                    <ThemedText style={[styles.summaryText, { color: colors.tint }]}>
                      {selectedRecipeIds.size} recipe{selectedRecipeIds.size !== 1 ? 's' : ''} selected ({selectedIngredientCount} ingredients)
                    </ThemedText>
                  </Animated.View>
                )}

                {/* Recipe List */}
                <View style={styles.recipeList}>
                  {recipes.map((recipe, index) => (
                    <RecipeSelectItem
                      key={recipe.id}
                      recipe={recipe}
                      isSelected={selectedRecipeIds.has(recipe.id)}
                      isInQueue={recipe.isInQueue}
                      onToggle={() => toggleRecipe(recipe.id)}
                      index={index}
                    />
                  ))}
                </View>
              </>
            )}
          </ScrollView>
        ) : (
          /* Meal Plan Mode */
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Date Range Picker */}
            <Animated.View
              entering={FadeInDown.duration(300)}
              style={[styles.datePickerCard, { backgroundColor: colors.card }, shadows.small]}
            >
              <View style={styles.dateRow}>
                <ThemedText style={styles.dateLabel}>Start Date</ThemedText>
                {process.env.EXPO_OS === 'ios' ? (
                  <DateTimePicker
                    value={startDate}
                    mode="date"
                    display="compact"
                    onChange={handleStartDateChange}
                    accentColor={colors.tint}
                  />
                ) : (
                  <AnimatedPressable
                    onPress={() => setShowStartPicker(true)}
                    hapticType="selection"
                    style={[styles.androidDateButton, { backgroundColor: colors.skeleton }]}
                  >
                    <ThemedText style={{ color: colors.text }}>
                      {startDate.toLocaleDateString()}
                    </ThemedText>
                  </AnimatedPressable>
                )}
              </View>

              <View style={[styles.dateDivider, { backgroundColor: colors.border }]} />

              <View style={styles.dateRow}>
                <ThemedText style={styles.dateLabel}>End Date</ThemedText>
                {process.env.EXPO_OS === 'ios' ? (
                  <DateTimePicker
                    value={endDate}
                    mode="date"
                    display="compact"
                    minimumDate={startDate}
                    onChange={handleEndDateChange}
                    accentColor={colors.tint}
                  />
                ) : (
                  <AnimatedPressable
                    onPress={() => setShowEndPicker(true)}
                    hapticType="selection"
                    style={[styles.androidDateButton, { backgroundColor: colors.skeleton }]}
                  >
                    <ThemedText style={{ color: colors.text }}>
                      {endDate.toLocaleDateString()}
                    </ThemedText>
                  </AnimatedPressable>
                )}
              </View>
            </Animated.View>

            {/* Android Date Pickers */}
            {process.env.EXPO_OS === 'android' && showStartPicker && (
              <DateTimePicker
                value={startDate}
                mode="date"
                display="default"
                onChange={handleStartDateChange}
              />
            )}
            {process.env.EXPO_OS === 'android' && showEndPicker && (
              <DateTimePicker
                value={endDate}
                mode="date"
                display="default"
                minimumDate={startDate}
                onChange={handleEndDateChange}
              />
            )}

            {/* Meal Plan Summary */}
            {mealPlansInRange.length === 0 ? (
              <Animated.View
                entering={FadeIn.duration(300)}
                style={styles.emptyContainer}
              >
                <Icon name="calendar-outline" size={48} color={colors.textTertiary} />
                <ThemedText style={[styles.emptyTitle, { color: colors.textTertiary }]}>
                  No Meals Planned
                </ThemedText>
                <ThemedText style={[styles.emptyMessage, { color: colors.textTertiary }]}>
                  No meals planned for this date range.
                </ThemedText>
              </Animated.View>
            ) : (
              <>
                {/* Grouped Meal Plans by Date */}
                {Object.keys(groupedMealPlans)
                  .sort()
                  .map((dateKey, groupIndex) => {
                    const date = new Date(dateKey);
                    const meals = groupedMealPlans[dateKey];

                    return (
                      <Animated.View
                        key={dateKey}
                        entering={FadeInDown.duration(300).delay(groupIndex * 100)}
                        style={styles.dateSection}
                      >
                        <DateSectionHeader date={date} />
                        {meals.map((meal, mealIndex) => (
                          <MealPlanItem
                            key={meal.id}
                            mealPlan={meal}
                            index={mealIndex}
                          />
                        ))}
                      </Animated.View>
                    );
                  })}

                {/* Summary Footer */}
                <Animated.View
                  entering={FadeInUp.duration(300).delay(300)}
                  style={[styles.summaryCard, { backgroundColor: colors.accentSubtle }]}
                >
                  <Icon name="cart-outline" size={20} color={colors.tint} />
                  <ThemedText style={[styles.summaryText, { color: colors.tint }]}>
                    {mealPlanRecipeIds.size} recipe{mealPlanRecipeIds.size !== 1 ? 's' : ''} to shop for
                  </ThemedText>
                </Animated.View>
              </>
            )}
          </ScrollView>
        )}

        {/* Generate Button (Bottom Fixed) */}
        <Animated.View
          entering={FadeInUp.duration(400).delay(200)}
          style={[styles.bottomButtonContainer, { backgroundColor: colors.background }]}
        >
          <ModernButton
            title={isGenerating ? 'Generating...' : 'Generate Grocery List'}
            onPress={handleGenerate}
            variant="primary"
            size="large"
            fullWidth
            disabled={!canGenerate || isGenerating}
            loading={isGenerating}
            icon="sparkles"
          />
        </Animated.View>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  headerButtonDisabled: {
    opacity: 0.5,
  },
  headerButtonText: {
    ...typography.bodyLarge,
  },
  headerButtonTextBold: {
    fontWeight: '600',
  },
  modeContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  segmentedContainer: {
    flexDirection: 'row',
    borderRadius: radius.md,
    padding: spacing.xs,
    position: 'relative',
  },
  segmentedIndicator: {
    position: 'absolute',
    top: spacing.xs,
    bottom: spacing.xs,
    borderRadius: radius.sm,
  },
  segmentedOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    zIndex: 1,
  },
  segmentedLabel: {
    ...typography.labelLarge,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['5xl'],
    gap: spacing.md,
  },
  emptyTitle: {
    ...typography.titleMedium,
    marginTop: spacing.sm,
  },
  emptyMessage: {
    ...typography.bodyMedium,
    textAlign: 'center',
    maxWidth: 280,
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginVertical: spacing.md,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  quickActionDisabled: {
    opacity: 0.5,
  },
  quickActionLabel: {
    ...typography.labelMedium,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  summaryText: {
    ...typography.labelMedium,
    flex: 1,
  },
  recipeList: {
    gap: spacing.sm,
  },
  recipeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  recipeCheckbox: {
    marginRight: spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipeInfo: {
    flex: 1,
  },
  recipeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  recipeTitle: {
    ...typography.titleSmall,
    flex: 1,
  },
  queueIcon: {
    marginLeft: spacing.xs,
  },
  recipeSubtitle: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  datePickerCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateLabel: {
    ...typography.bodyLarge,
  },
  dateDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.md,
  },
  androidDateButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  dateSection: {
    marginBottom: spacing.lg,
  },
  dateSectionHeader: {
    marginBottom: spacing.sm,
  },
  dateSectionTitle: {
    ...typography.labelMedium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mealPlanItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
  },
  mealTypeIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  mealPlanInfo: {
    flex: 1,
  },
  mealTypeLabel: {
    ...typography.caption,
  },
  mealPlanName: {
    ...typography.bodyMedium,
  },
  noRecipeLabel: {
    ...typography.caption,
  },
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    paddingBottom: spacing['3xl'],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
});
