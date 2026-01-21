import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  useColorScheme,
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { ThemedView, ThemedText } from '@/components/Themed';
import { useRecipeStore } from '@/src/stores/recipeStore';
import { useGroceryStore } from '@/src/stores/groceryStore';
import { useSettingsStore } from '@/src/stores/settingsStore';
import { Ingredient, RecipeWithIngredients } from '@/src/types';
import { formatIngredient } from '@/src/utils/quantity';
import AnimatedPressable from '@/src/components/ui/AnimatedPressable';
import ModernButton from '@/src/components/ui/ModernButton';
import Colors, { shadows, radius, spacing, typography } from '@/constants/Colors';

// Ingredient Selection Item Component
function IngredientSelectItem({
  ingredient,
  isSelected,
  onToggle,
  index,
}: {
  ingredient: Ingredient;
  isSelected: boolean;
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

  const displayText = formatIngredient(ingredient.name, ingredient.quantity, ingredient.unit);

  return (
    <Animated.View
      entering={FadeInDown.duration(300).delay(index * 30)}
      layout={Layout.springify()}
    >
      <AnimatedPressable
        onPress={onToggle}
        hapticType="selection"
        style={[
          styles.ingredientItem,
          {
            backgroundColor: colors.card,
            borderColor: isSelected ? colors.tint : colors.border,
            borderWidth: isSelected ? 2 : StyleSheet.hairlineWidth,
          },
          shadows.small,
        ]}
      >
        <View style={styles.ingredientCheckbox}>
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
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
              </Animated.View>
            )}
          </View>
        </View>

        <View style={styles.ingredientInfo}>
          <ThemedText style={styles.ingredientText} numberOfLines={2}>
            {displayText}
          </ThemedText>
          {ingredient.category && ingredient.category !== 'Other' && (
            <ThemedText style={[styles.categoryText, { color: colors.textTertiary }]}>
              {ingredient.category}
            </ThemedText>
          )}
        </View>

        {ingredient.isOptional && (
          <View style={[styles.optionalBadge, { backgroundColor: colors.warningBackground }]}>
            <ThemedText style={[styles.optionalText, { color: colors.warning }]}>
              Optional
            </ThemedText>
          </View>
        )}
      </AnimatedPressable>
    </Animated.View>
  );
}

export default function AddFromRecipeScreen() {
  const { recipeId } = useLocalSearchParams<{ recipeId: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const hapticFeedback = useSettingsStore((state) => state.hapticFeedback);

  // Stores
  const { recipes, loadRecipes, getRecipe } = useRecipeStore();
  const { currentList, loadCurrentList, createList, addItem } = useGroceryStore();

  // State
  const [recipe, setRecipe] = useState<RecipeWithIngredients | undefined>();
  const [selectedIngredientIds, setSelectedIngredientIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  // Load recipe data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await loadRecipes();
      await loadCurrentList();

      const foundRecipe = getRecipe(recipeId);
      setRecipe(foundRecipe);

      // Select all ingredients by default
      if (foundRecipe) {
        setSelectedIngredientIds(new Set(foundRecipe.ingredients.map((i) => i.id)));
      }

      setIsLoading(false);
    };

    loadData();
  }, [recipeId, loadRecipes, loadCurrentList, getRecipe]);

  // Computed values
  const selectedCount = selectedIngredientIds.size;
  const totalCount = recipe?.ingredients.length ?? 0;
  const canAdd = selectedCount > 0;

  // Handlers
  const triggerHaptic = useCallback(
    (type: 'selection' | 'success' | 'warning' | 'light') => {
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
        case 'light':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
      }
    },
    [hapticFeedback]
  );

  const toggleIngredient = useCallback(
    (id: string) => {
      triggerHaptic('selection');
      setSelectedIngredientIds((prev) => {
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

  const selectAll = useCallback(() => {
    triggerHaptic('light');
    if (recipe) {
      setSelectedIngredientIds(new Set(recipe.ingredients.map((i) => i.id)));
    }
  }, [recipe, triggerHaptic]);

  const selectNone = useCallback(() => {
    triggerHaptic('light');
    setSelectedIngredientIds(new Set());
  }, [triggerHaptic]);

  const handleAddToList = useCallback(async () => {
    if (!canAdd || !recipe) return;

    setIsAdding(true);
    triggerHaptic('success');

    try {
      // Get or create grocery list
      let listId = currentList?.id;
      if (!listId) {
        listId = await createList('Shopping List');
      }

      // Get existing item names for duplicate checking
      const existingItemNames = new Set(
        (currentList?.items ?? []).map((item) => item.name.toLowerCase().trim())
      );

      // Add selected ingredients
      const selectedIngredients = recipe.ingredients.filter((i) =>
        selectedIngredientIds.has(i.id)
      );

      let addedCount = 0;
      let skippedCount = 0;

      for (const ingredient of selectedIngredients) {
        const normalizedName = ingredient.name.toLowerCase().trim();

        // Check for duplicates
        if (existingItemNames.has(normalizedName)) {
          skippedCount++;
          continue;
        }

        await addItem(listId!, {
          name: ingredient.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          category: ingredient.category,
        });

        existingItemNames.add(normalizedName);
        addedCount++;
      }

      router.back();
    } catch (error) {
      console.error('Failed to add ingredients to grocery list:', error);
      triggerHaptic('warning');
    } finally {
      setIsAdding(false);
    }
  }, [canAdd, recipe, selectedIngredientIds, currentList, createList, addItem, triggerHaptic]);

  const handleCancel = useCallback(() => {
    triggerHaptic('light');
    router.back();
  }, [triggerHaptic]);

  if (isLoading || !recipe) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Add to Grocery List',
            presentation: 'modal',
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
          }}
        />
        <ThemedView style={styles.loadingContainer}>
          <Animated.View entering={FadeIn.duration(300)}>
            <Ionicons name="cart-outline" size={48} color={colors.textTertiary} />
            <ThemedText style={[styles.loadingText, { color: colors.textTertiary }]}>
              Loading ingredients...
            </ThemedText>
          </Animated.View>
        </ThemedView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Add to Grocery List',
          presentation: 'modal',
          headerLeft: () => (
            <AnimatedPressable
              onPress={handleCancel}
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
              onPress={handleAddToList}
              hapticType="medium"
              disabled={!canAdd || isAdding}
              style={[styles.headerButton, (!canAdd || isAdding) && styles.headerButtonDisabled]}
            >
              <ThemedText
                style={[
                  styles.headerButtonText,
                  styles.headerButtonTextBold,
                  { color: canAdd && !isAdding ? colors.tint : colors.textTertiary },
                ]}
              >
                {isAdding ? 'Adding...' : 'Add'}
              </ThemedText>
            </AnimatedPressable>
          ),
        }}
      />
      <ThemedView style={styles.container}>
        {/* Recipe Title Header */}
        <Animated.View
          entering={FadeIn.duration(300)}
          style={[styles.recipeHeader, { backgroundColor: colors.card }, shadows.small]}
        >
          <Ionicons name="restaurant-outline" size={20} color={colors.tint} />
          <ThemedText style={styles.recipeTitle} numberOfLines={2}>
            {recipe.title}
          </ThemedText>
        </Animated.View>

        {/* Select All / Select None Actions */}
        <Animated.View
          entering={FadeIn.duration(300).delay(100)}
          style={styles.selectionActions}
        >
          <AnimatedPressable
            onPress={selectAll}
            hapticType="light"
            disabled={selectedCount === totalCount}
            style={[
              styles.selectionButton,
              { backgroundColor: colors.card },
              selectedCount === totalCount && styles.selectionButtonDisabled,
              shadows.small,
            ]}
          >
            <Ionicons
              name="checkbox-outline"
              size={18}
              color={selectedCount !== totalCount ? colors.tint : colors.textTertiary}
            />
            <ThemedText
              style={[
                styles.selectionButtonText,
                { color: selectedCount !== totalCount ? colors.text : colors.textTertiary },
              ]}
            >
              Select All
            </ThemedText>
          </AnimatedPressable>

          <AnimatedPressable
            onPress={selectNone}
            hapticType="light"
            disabled={selectedCount === 0}
            style={[
              styles.selectionButton,
              { backgroundColor: colors.card },
              selectedCount === 0 && styles.selectionButtonDisabled,
              shadows.small,
            ]}
          >
            <Ionicons
              name="square-outline"
              size={18}
              color={selectedCount > 0 ? colors.text : colors.textTertiary}
            />
            <ThemedText
              style={[
                styles.selectionButtonText,
                { color: selectedCount > 0 ? colors.text : colors.textTertiary },
              ]}
            >
              Select None
            </ThemedText>
          </AnimatedPressable>
        </Animated.View>

        {/* Selection Summary */}
        {selectedCount > 0 && (
          <Animated.View
            entering={FadeInDown.duration(200)}
            exiting={FadeOut.duration(150)}
            style={[styles.summaryCard, { backgroundColor: colors.accentSubtle }]}
          >
            <Ionicons name="cart-outline" size={20} color={colors.tint} />
            <ThemedText style={[styles.summaryText, { color: colors.tint }]}>
              {selectedCount} of {totalCount} ingredient{totalCount !== 1 ? 's' : ''} selected
            </ThemedText>
          </Animated.View>
        )}

        {/* Ingredients List */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.ingredientList}>
            {recipe.ingredients.map((ingredient, index) => (
              <IngredientSelectItem
                key={ingredient.id}
                ingredient={ingredient}
                isSelected={selectedIngredientIds.has(ingredient.id)}
                onToggle={() => toggleIngredient(ingredient.id)}
                index={index}
              />
            ))}
          </View>
        </ScrollView>

        {/* Bottom Add Button */}
        <Animated.View
          entering={FadeIn.duration(400).delay(200)}
          style={[styles.bottomButtonContainer, { backgroundColor: colors.background }]}
        >
          <ModernButton
            title={isAdding ? 'Adding...' : `Add ${selectedCount} Item${selectedCount !== 1 ? 's' : ''} to List`}
            onPress={handleAddToList}
            variant="primary"
            size="large"
            fullWidth
            disabled={!canAdd || isAdding}
            loading={isAdding}
            icon="cart"
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    ...typography.bodyMedium,
    marginTop: spacing.md,
    textAlign: 'center',
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
  recipeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
  },
  recipeTitle: {
    flex: 1,
    ...typography.titleSmall,
  },
  selectionActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  selectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  selectionButtonDisabled: {
    opacity: 0.5,
  },
  selectionButtonText: {
    ...typography.labelMedium,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  summaryText: {
    ...typography.labelMedium,
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
  },
  ingredientList: {
    gap: spacing.sm,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  ingredientCheckbox: {
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
  ingredientInfo: {
    flex: 1,
  },
  ingredientText: {
    ...typography.bodyMedium,
  },
  categoryText: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  optionalBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    marginLeft: spacing.sm,
  },
  optionalText: {
    ...typography.labelSmall,
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
