import React, { useEffect, useState } from 'react';
import { StyleSheet, FlatList, View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { MaterialIcon } from '@/src/components/ui/Icon';

import { ThemedView, ThemedText } from '@/components/Themed';
import { useRecipeStore } from '@/src/stores/recipeStore';
import { usePantryStore } from '@/src/stores/pantryStore';
import { RecipeWithIngredients } from '@/src/types';
import { rankRecipesByPantry, getMissingIngredients } from '@/src/utils/pantryMatching';
import EmptyState from '@/src/components/EmptyState';

interface RankedRecipe {
  recipe: RecipeWithIngredients;
  matchPercentage: number;
  missingCount: number;
}

export default function WhatCanIMakeScreen() {
  const { recipes, loadRecipes } = useRecipeStore();
  const { items, loadItems } = usePantryStore();
  const [rankedRecipes, setRankedRecipes] = useState<RankedRecipe[]>([]);

  useEffect(() => {
    Promise.all([loadRecipes(), loadItems()]).then(() => {
      const ranked = rankRecipesByPantry(recipes, items);
      setRankedRecipes(ranked);
    });
  }, []);

  useEffect(() => {
    if (recipes.length > 0 && items.length > 0) {
      const ranked = rankRecipesByPantry(recipes, items);
      setRankedRecipes(ranked);
    }
  }, [recipes, items]);

  const renderRecipe = ({ item }: { item: RankedRecipe }) => {
    const missingIngredients = getMissingIngredients(item.recipe, items);

    return (
      <Pressable
        style={styles.recipeCard}
        onPress={() => router.push(`/recipe/${item.recipe.id}`)}
      >
        <View style={styles.recipeHeader}>
          <ThemedText style={styles.recipeTitle} numberOfLines={2}>
            {item.recipe.title}
          </ThemedText>
          <View
            style={[
              styles.matchBadge,
              item.matchPercentage >= 75
                ? styles.matchBadgeHigh
                : item.matchPercentage >= 50
                ? styles.matchBadgeMedium
                : styles.matchBadgeLow,
            ]}
          >
            <ThemedText style={styles.matchText}>{item.matchPercentage}%</ThemedText>
          </View>
        </View>

        <View style={styles.ingredientInfo}>
          <MaterialIcon
            name={item.matchPercentage === 100 ? 'check-circle' : 'alert-circle-outline'}
            size={16}
            color={item.matchPercentage === 100 ? '#22c55e' : '#f59e0b'}
          />
          <ThemedText style={styles.ingredientText}>
            {item.matchPercentage === 100
              ? 'You have all ingredients!'
              : `Missing ${item.missingCount} ingredient${item.missingCount > 1 ? 's' : ''}`}
          </ThemedText>
        </View>

        {item.missingCount > 0 && item.missingCount <= 3 && (
          <View style={styles.missingList}>
            {missingIngredients.slice(0, 3).map((ing, idx) => (
              <ThemedText key={idx} style={styles.missingItem}>
                • {ing.name}
              </ThemedText>
            ))}
          </View>
        )}

        <View style={styles.recipeFooter}>
          <View style={styles.metaItem}>
            <MaterialIcon name="food-variant" size={14} color="#666" />
            <ThemedText style={styles.metaText}>
              {item.recipe.ingredients.length} ingredients
            </ThemedText>
          </View>
          <MaterialIcon name="chevron-right" size={20} color="#ccc" />
        </View>
      </Pressable>
    );
  };

  if (items.length === 0) {
    return (
      <EmptyState
        icon="snow-outline"
        title="Pantry is empty"
        message="Add items to your pantry to see what you can make"
        actionLabel="Go to Pantry"
        onAction={() => {
          router.back();
          router.push('/pantry');
        }}
      />
    );
  }

  if (recipes.length === 0) {
    return (
      <EmptyState
        icon="book-outline"
        title="No recipes"
        message="Add some recipes to see what you can make"
        actionLabel="Add Recipe"
        onAction={() => {
          router.back();
          router.push('/recipe/add');
        }}
      />
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <MaterialIcon name="chef-hat" size={24} color="#FF6B35" />
        <ThemedText style={styles.headerText}>
          Based on {items.length} items in your pantry
        </ThemedText>
      </View>

      <FlatList
        data={rankedRecipes}
        renderItem={renderRecipe}
        keyExtractor={(item) => item.recipe.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <ThemedText style={styles.emptyText}>
              No recipes match your pantry items
            </ThemedText>
          </View>
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  headerText: {
    fontSize: 14,
    color: '#666',
  },
  list: {
    padding: 16,
  },
  recipeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  recipeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  recipeTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  matchBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  matchBadgeHigh: {
    backgroundColor: '#dcfce7',
  },
  matchBadgeMedium: {
    backgroundColor: '#fef3c7',
  },
  matchBadgeLow: {
    backgroundColor: '#fee2e2',
  },
  matchText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  ingredientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  ingredientText: {
    fontSize: 13,
    color: '#666',
  },
  missingList: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  missingItem: {
    fontSize: 13,
    color: '#666',
    paddingVertical: 2,
  },
  recipeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
