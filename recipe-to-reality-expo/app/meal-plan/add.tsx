import React, { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  TextInput,
  FlatList,
  Switch,
  Platform,
  KeyboardAvoidingView,
  useColorScheme,
  Image,
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  Layout,
} from 'react-native-reanimated';

import { ThemedView, ThemedText } from '@/components/Themed';
import { useMealPlanStore } from '@/src/stores/mealPlanStore';
import { useRecipeStore } from '@/src/stores/recipeStore';
import { useSettingsStore } from '@/src/stores/settingsStore';
import {
  MealType,
  MEAL_TYPES,
  MEAL_TYPE_ICONS,
  MEAL_TYPE_DEFAULT_TIMES,
  RecipeWithIngredients,
} from '@/src/types';
import AnimatedPressable from '@/src/components/ui/AnimatedPressable';
import ModernButton from '@/src/components/ui/ModernButton';
import Colors, { shadows, radius, spacing, typography, animation } from '@/constants/Colors';

type InputMode = 'recipe' | 'custom';

// Icon mapping for meal types using MaterialCommunityIcons
const getMealTypeIcon = (mealType: MealType): keyof typeof MaterialCommunityIcons.glyphMap => {
  const icons: Record<MealType, keyof typeof MaterialCommunityIcons.glyphMap> = {
    Breakfast: 'weather-sunset-up',
    Lunch: 'weather-sunny',
    Dinner: 'weather-night',
    Snack: 'food-apple',
  };
  return icons[mealType];
};

export default function AddMealPlanScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const params = useLocalSearchParams<{ date?: string; mealType?: MealType }>();

  const { addMealPlan } = useMealPlanStore();
  const { recipes } = useRecipeStore();
  const hapticFeedback = useSettingsStore((state) => state.hapticFeedback);

  // Initialize date from params or use today
  const initialDate = params.date ? new Date(params.date) : new Date();

  // Initialize meal type from params or default to Dinner
  const initialMealType: MealType = params.mealType && MEAL_TYPES.includes(params.mealType)
    ? params.mealType
    : 'Dinner';

  // State
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [selectedMealType, setSelectedMealType] = useState<MealType>(initialMealType);
  const [inputMode, setInputMode] = useState<InputMode>('recipe');
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [customMealName, setCustomMealName] = useState('');
  const [notes, setNotes] = useState('');
  const [enableReminder, setEnableReminder] = useState(false);
  const [reminderTime, setReminderTime] = useState(() => {
    const defaultTime = MEAL_TYPE_DEFAULT_TIMES[initialMealType];
    const date = new Date(initialDate);
    date.setHours(defaultTime.hour, defaultTime.minute, 0, 0);
    return date;
  });
  const [searchText, setSearchText] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Derived state
  const filteredRecipes = useMemo(() => {
    if (!searchText.trim()) return recipes;
    const search = searchText.toLowerCase();
    return recipes.filter((recipe) =>
      recipe.title.toLowerCase().includes(search)
    );
  }, [recipes, searchText]);

  const isValid = useMemo(() => {
    return selectedRecipeId !== null || customMealName.trim().length > 0;
  }, [selectedRecipeId, customMealName]);

  const selectedRecipe = useMemo(() => {
    return recipes.find((r) => r.id === selectedRecipeId);
  }, [recipes, selectedRecipeId]);

  // Haptic feedback helper
  const triggerHaptic = useCallback(
    (type: 'light' | 'medium' | 'success' | 'selection') => {
      if (!hapticFeedback) return;
      switch (type) {
        case 'light':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'success':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'selection':
          Haptics.selectionAsync();
          break;
      }
    },
    [hapticFeedback]
  );

  // Update reminder time when meal type changes
  const handleMealTypeChange = (type: string) => {
    triggerHaptic('selection');
    const mealType = type as MealType;
    setSelectedMealType(mealType);

    // Update default reminder time
    const defaultTime = MEAL_TYPE_DEFAULT_TIMES[mealType];
    const newReminderTime = new Date(selectedDate);
    newReminderTime.setHours(defaultTime.hour, defaultTime.minute, 0, 0);
    setReminderTime(newReminderTime);
  };

  // Handle recipe selection
  const handleRecipeSelect = (recipe: RecipeWithIngredients) => {
    triggerHaptic('selection');
    if (selectedRecipeId === recipe.id) {
      setSelectedRecipeId(null);
    } else {
      setSelectedRecipeId(recipe.id);
      setCustomMealName('');
    }
  };

  // Handle save
  const handleSave = async () => {
    if (!isValid) return;

    triggerHaptic('medium');

    const mealDate = new Date(selectedDate);
    mealDate.setHours(0, 0, 0, 0);

    try {
      await addMealPlan({
        date: mealDate.getTime(),
        mealType: selectedMealType,
        recipeId: selectedRecipeId,
        recipeName:
          selectedRecipe?.title ??
          (customMealName.trim() || null),
        notes: notes.trim() || null,
        isCompleted: false,
        reminder: enableReminder,
        reminderTime: enableReminder ? reminderTime.getTime() : null,
      });

      triggerHaptic('success');
      router.back();
    } catch (error) {
      console.error('Failed to add meal plan:', error);
    }
  };

  // Format date for display
  const formatDate = (date: Date): string => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    }
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  };

  // Render meal type chip with MaterialCommunityIcons
  const renderMealTypeChip = (type: MealType) => {
    const isSelected = selectedMealType === type;
    return (
      <AnimatedPressable
        key={type}
        onPress={() => handleMealTypeChange(type)}
        hapticType="selection"
        scaleOnPress={0.95}
      >
        <Animated.View
          style={[
            styles.mealTypeChip,
            {
              backgroundColor: isSelected
                ? colors.tint
                : colorScheme === 'dark'
                ? colors.cardElevated
                : colors.skeleton,
            },
          ]}
        >
          <MaterialCommunityIcons
            name={getMealTypeIcon(type)}
            size={14}
            color={isSelected ? '#FFFFFF' : colors.textTertiary}
          />
          <ThemedText
            style={[
              styles.mealTypeChipLabel,
              { color: isSelected ? '#FFFFFF' : colors.text },
            ]}
          >
            {type}
          </ThemedText>
        </Animated.View>
      </AnimatedPressable>
    );
  };

  // Render recipe selection row
  const renderRecipeRow = ({ item }: { item: RecipeWithIngredients }) => {
    const isSelected = selectedRecipeId === item.id;

    return (
      <AnimatedPressable
        onPress={() => handleRecipeSelect(item)}
        hapticType="selection"
        scaleOnPress={0.98}
        style={styles.recipeRowWrapper}
      >
        <Animated.View
          entering={FadeIn.duration(200)}
          style={[
            styles.recipeRow,
            { backgroundColor: colors.card },
            isSelected && { borderColor: colors.tint, borderWidth: 2 },
          ]}
        >
          {/* Recipe Image */}
          {item.imageURL ? (
            <Image source={{ uri: item.imageURL }} style={styles.recipeImage} />
          ) : (
            <View
              style={[
                styles.recipeImagePlaceholder,
                { backgroundColor: colors.skeleton },
              ]}
            >
              <Ionicons name="restaurant" size={20} color={colors.textTertiary} />
            </View>
          )}

          {/* Recipe Info */}
          <View style={styles.recipeInfo}>
            <ThemedText style={styles.recipeTitle} numberOfLines={1}>
              {item.title}
            </ThemedText>
            <View style={styles.recipeMeta}>
              {item.cookTime && (
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={12} color={colors.textTertiary} />
                  <ThemedText style={[styles.metaText, { color: colors.textTertiary }]}>
                    {item.cookTime}
                  </ThemedText>
                </View>
              )}
              {item.servings && (
                <View style={styles.metaItem}>
                  <Ionicons name="people-outline" size={12} color={colors.textTertiary} />
                  <ThemedText style={[styles.metaText, { color: colors.textTertiary }]}>
                    {item.servings}
                  </ThemedText>
                </View>
              )}
            </View>
          </View>

          {/* Selection Indicator */}
          <Ionicons
            name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
            size={24}
            color={isSelected ? colors.tint : colors.textTertiary}
          />
        </Animated.View>
      </AnimatedPressable>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: `Add ${selectedMealType}`,
          headerLeft: () => (
            <AnimatedPressable
              onPress={() => {
                triggerHaptic('light');
                router.back();
              }}
              hapticType="light"
            >
              <ThemedText style={[styles.headerButton, { color: colors.tint }]}>
                Cancel
              </ThemedText>
            </AnimatedPressable>
          ),
          headerRight: () => (
            <AnimatedPressable
              onPress={handleSave}
              disabled={!isValid}
              hapticType="medium"
            >
              <ThemedText
                style={[
                  styles.headerButton,
                  styles.headerButtonBold,
                  { color: colors.tint },
                  !isValid && { opacity: 0.5 },
                ]}
              >
                Add
              </ThemedText>
            </AnimatedPressable>
          ),
        }}
      />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'}
      >
        <ThemedView style={styles.container}>
          {/* Header Section */}
          <Animated.View
            entering={FadeInDown.duration(300)}
            style={[styles.headerSection, { backgroundColor: colors.secondaryBackground }]}
          >
            {/* Date and Meal Type Display */}
            <View style={styles.mealHeader}>
              <MaterialCommunityIcons
                name={getMealTypeIcon(selectedMealType)}
                size={28}
                color={colors.tint}
              />
              <View style={styles.mealHeaderText}>
                <ThemedText style={styles.mealTypeTitle}>{selectedMealType}</ThemedText>
                <AnimatedPressable
                  onPress={() => {
                    triggerHaptic('selection');
                    setShowDatePicker(true);
                  }}
                  hapticType="selection"
                >
                  <ThemedText style={[styles.dateText, { color: colors.textSecondary }]}>
                    {formatDate(selectedDate)}
                  </ThemedText>
                </AnimatedPressable>
              </View>
            </View>

            {/* Date Picker (iOS inline style) */}
            {showDatePicker && process.env.EXPO_OS === 'ios' && (
              <Animated.View entering={FadeIn.duration(200)} layout={Layout.springify()}>
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display="inline"
                  onChange={(event, date) => {
                    if (date) {
                      setSelectedDate(date);
                      // Update reminder time to keep the same hour/minute on new date
                      const newReminderTime = new Date(date);
                      newReminderTime.setHours(reminderTime.getHours(), reminderTime.getMinutes(), 0, 0);
                      setReminderTime(newReminderTime);
                    }
                  }}
                  accentColor={colors.tint}
                  style={styles.datePicker}
                />
                <ModernButton
                  title="Done"
                  onPress={() => setShowDatePicker(false)}
                  variant="secondary"
                  size="small"
                  style={styles.datePickerDone}
                />
              </Animated.View>
            )}

            {/* Android Date Picker */}
            {showDatePicker && process.env.EXPO_OS === 'android' && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="default"
                onChange={(event, date) => {
                  setShowDatePicker(false);
                  if (date) {
                    setSelectedDate(date);
                    const newReminderTime = new Date(date);
                    newReminderTime.setHours(reminderTime.getHours(), reminderTime.getMinutes(), 0, 0);
                    setReminderTime(newReminderTime);
                  }
                }}
              />
            )}

            {/* Meal Type Selector */}
            <View style={styles.mealTypeSelector}>
              <View style={styles.mealTypeChipGroup}>
                {MEAL_TYPES.map(renderMealTypeChip)}
              </View>
            </View>

            {/* Input Mode Toggle */}
            <View
              style={[
                styles.segmentedContainer,
                { backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#E5E5EA' },
              ]}
            >
              <AnimatedPressable
                style={[
                  styles.segmentedButton,
                  inputMode === 'recipe' && [
                    styles.segmentedButtonActive,
                    { backgroundColor: colorScheme === 'dark' ? '#636366' : '#fff' },
                  ],
                ]}
                onPress={() => {
                  triggerHaptic('selection');
                  setInputMode('recipe');
                }}
                hapticType="none"
              >
                <ThemedText
                  style={[
                    styles.segmentedText,
                    inputMode === 'recipe' && styles.segmentedTextActive,
                  ]}
                >
                  Choose Recipe
                </ThemedText>
              </AnimatedPressable>
              <AnimatedPressable
                style={[
                  styles.segmentedButton,
                  inputMode === 'custom' && [
                    styles.segmentedButtonActive,
                    { backgroundColor: colorScheme === 'dark' ? '#636366' : '#fff' },
                  ],
                ]}
                onPress={() => {
                  triggerHaptic('selection');
                  setInputMode('custom');
                  setSelectedRecipeId(null);
                }}
                hapticType="none"
              >
                <ThemedText
                  style={[
                    styles.segmentedText,
                    inputMode === 'custom' && styles.segmentedTextActive,
                  ]}
                >
                  Custom Meal
                </ThemedText>
              </AnimatedPressable>
            </View>
          </Animated.View>

          {inputMode === 'recipe' ? (
            // Recipe Selection Mode
            <View style={styles.recipeSection}>
              {/* Search Bar */}
              <View style={styles.searchContainer}>
                <View
                  style={[
                    styles.searchBar,
                    {
                      backgroundColor: colorScheme === 'dark' ? colors.cardElevated : '#F5F5F7',
                    },
                  ]}
                >
                  <Ionicons name="search" size={18} color={colors.textTertiary} />
                  <TextInput
                    style={[styles.searchInput, { color: colors.text }]}
                    value={searchText}
                    onChangeText={setSearchText}
                    placeholder="Search recipes"
                    placeholderTextColor={colors.textTertiary}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {searchText.length > 0 && (
                    <AnimatedPressable
                      onPress={() => setSearchText('')}
                      hapticType="light"
                    >
                      <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
                    </AnimatedPressable>
                  )}
                </View>
              </View>

              {/* Recipe List or Empty State */}
              {recipes.length === 0 ? (
                <Animated.View
                  entering={FadeIn.duration(300)}
                  style={styles.emptyState}
                >
                  <Ionicons name="book-outline" size={48} color={colors.textTertiary} />
                  <ThemedText style={[styles.emptyTitle, { color: colors.text }]}>
                    No Recipes
                  </ThemedText>
                  <ThemedText style={[styles.emptyMessage, { color: colors.textTertiary }]}>
                    Add some recipes first, then come back to plan your meals!
                  </ThemedText>
                </Animated.View>
              ) : filteredRecipes.length === 0 ? (
                <Animated.View
                  entering={FadeIn.duration(300)}
                  style={styles.emptyState}
                >
                  <Ionicons name="search" size={48} color={colors.textTertiary} />
                  <ThemedText style={[styles.emptyTitle, { color: colors.text }]}>
                    No Results
                  </ThemedText>
                  <ThemedText style={[styles.emptyMessage, { color: colors.textTertiary }]}>
                    No recipes match "{searchText}"
                  </ThemedText>
                </Animated.View>
              ) : (
                <FlatList
                  data={filteredRecipes}
                  renderItem={renderRecipeRow}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.recipeList}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                />
              )}
            </View>
          ) : (
            // Custom Meal Mode
            <ScrollView
              style={styles.customSection}
              contentContainerStyle={styles.customContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Meal Name */}
              <Animated.View
                entering={FadeInUp.delay(100).duration(300)}
                style={[styles.inputGroup, { backgroundColor: colors.card }]}
              >
                <ThemedText style={[styles.inputLabel, { color: colors.textTertiary }]}>
                  Meal Name
                </ThemedText>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={customMealName}
                  onChangeText={setCustomMealName}
                  placeholder="e.g., Leftovers, Eating Out"
                  placeholderTextColor={colors.textTertiary}
                />
              </Animated.View>

              {/* Notes */}
              <Animated.View
                entering={FadeInUp.delay(200).duration(300)}
                style={[styles.inputGroup, { backgroundColor: colors.card }]}
              >
                <ThemedText style={[styles.inputLabel, { color: colors.textTertiary }]}>
                  Notes (Optional)
                </ThemedText>
                <TextInput
                  style={[styles.input, styles.textArea, { color: colors.text }]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Add any notes about this meal..."
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </Animated.View>

              {/* Reminder Toggle */}
              <Animated.View
                entering={FadeInUp.delay(300).duration(300)}
                style={[styles.inputGroup, { backgroundColor: colors.card }]}
              >
                <View style={styles.switchRow}>
                  <View style={styles.switchLabel}>
                    <Ionicons name="notifications-outline" size={20} color={colors.textSecondary} />
                    <ThemedText style={styles.switchText}>Reminder</ThemedText>
                  </View>
                  <Switch
                    value={enableReminder}
                    onValueChange={(value) => {
                      triggerHaptic('selection');
                      setEnableReminder(value);
                    }}
                    trackColor={{ false: colors.border, true: colors.tint + '80' }}
                    thumbColor={enableReminder ? colors.tint : '#f4f3f4'}
                    ios_backgroundColor={colors.border}
                  />
                </View>

                {/* Reminder Time Picker */}
                {enableReminder && (
                  <Animated.View
                    entering={FadeIn.duration(200)}
                    style={styles.reminderTimeContainer}
                  >
                    <View style={styles.reminderTimeRow}>
                      <ThemedText style={[styles.reminderTimeLabel, { color: colors.textSecondary }]}>
                        Reminder Time
                      </ThemedText>
                      <AnimatedPressable
                        onPress={() => {
                          triggerHaptic('selection');
                          setShowTimePicker(true);
                        }}
                        hapticType="selection"
                        style={[styles.timeButton, { backgroundColor: colors.secondaryBackground }]}
                      >
                        <ThemedText style={[styles.timeButtonText, { color: colors.tint }]}>
                          {reminderTime.toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </ThemedText>
                      </AnimatedPressable>
                    </View>

                    {showTimePicker && process.env.EXPO_OS === 'ios' && (
                      <Animated.View entering={FadeIn.duration(200)}>
                        <DateTimePicker
                          value={reminderTime}
                          mode="time"
                          display="spinner"
                          onChange={(event, time) => {
                            if (time) {
                              setReminderTime(time);
                            }
                          }}
                          style={styles.timePicker}
                        />
                        <ModernButton
                          title="Done"
                          onPress={() => setShowTimePicker(false)}
                          variant="secondary"
                          size="small"
                          style={styles.timePickerDone}
                        />
                      </Animated.View>
                    )}

                    {showTimePicker && process.env.EXPO_OS === 'android' && (
                      <DateTimePicker
                        value={reminderTime}
                        mode="time"
                        display="default"
                        onChange={(event, time) => {
                          setShowTimePicker(false);
                          if (time) {
                            setReminderTime(time);
                          }
                        }}
                      />
                    )}
                  </Animated.View>
                )}
              </Animated.View>
            </ScrollView>
          )}
        </ThemedView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerButton: {
    fontSize: 17,
  },
  headerButtonBold: {
    fontWeight: '600',
  },
  headerSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  mealHeaderText: {
    flex: 1,
  },
  mealTypeTitle: {
    ...typography.titleLarge,
  },
  dateText: {
    ...typography.bodyMedium,
  },
  datePicker: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  datePickerDone: {
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  mealTypeSelector: {
    marginBottom: spacing.lg,
  },
  mealTypeChipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  mealTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    gap: spacing.xs,
  },
  mealTypeChipLabel: {
    ...typography.labelMedium,
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
    color: '#8E8E93',
  },
  segmentedTextActive: {
    fontWeight: '600',
    color: undefined, // Will inherit from ThemedText
  },
  recipeSection: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: spacing.xs,
  },
  recipeList: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
  },
  recipeRowWrapper: {
    marginBottom: spacing.sm,
  },
  recipeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.md,
    ...shadows.small,
  },
  recipeImage: {
    width: 50,
    height: 50,
    borderRadius: radius.sm,
  },
  recipeImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipeInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  recipeTitle: {
    ...typography.titleSmall,
  },
  recipeMeta: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    ...typography.caption,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['3xl'],
    paddingTop: spacing['5xl'],
  },
  emptyTitle: {
    ...typography.titleMedium,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyMessage: {
    ...typography.bodyMedium,
    textAlign: 'center',
  },
  customSection: {
    flex: 1,
  },
  customContent: {
    padding: spacing.lg,
    paddingBottom: 120,
    gap: spacing.md,
  },
  inputGroup: {
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadows.small,
  },
  inputLabel: {
    ...typography.caption,
    marginBottom: spacing.sm,
  },
  input: {
    fontSize: 17,
    paddingVertical: spacing.xs,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  switchText: {
    ...typography.bodyLarge,
  },
  reminderTimeContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  reminderTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reminderTimeLabel: {
    ...typography.bodyMedium,
  },
  timeButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  timeButtonText: {
    ...typography.labelLarge,
  },
  timePicker: {
    marginTop: spacing.sm,
  },
  timePickerDone: {
    alignSelf: 'center',
    marginTop: spacing.sm,
  },
});
