import React, { useCallback, useState } from 'react';
import { StyleSheet, FlatList, View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { ThemedView, ThemedText } from '@/components/Themed';
import { useRecipeStore } from '@/src/stores/recipeStore';
import { RecipeWithIngredients } from '@/src/types';
import RecipeRow from '@/src/components/RecipeRow';
import EmptyState from '@/src/components/EmptyState';
import SearchBar from '@/src/components/SearchBar';

type SortOption = 'dateAdded' | 'title' | 'dateCooked';
type FilterOption = 'all' | 'queue' | 'cooked';

export default function RecipesScreen() {
  const { recipes, loadRecipes, searchRecipes } = useRecipeStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('dateAdded');
  const [filter, setFilter] = useState<FilterOption>('all');

  useFocusEffect(
    useCallback(() => {
      loadRecipes();
    }, [loadRecipes])
  );

  const filteredRecipes = React.useMemo(() => {
    let result = searchQuery ? searchRecipes(searchQuery) : recipes;

    // Apply filter
    if (filter === 'queue') {
      result = result.filter((r) => r.isInQueue);
    } else if (filter === 'cooked') {
      result = result.filter((r) => r.dateCooked !== null);
    }

    // Apply sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'dateCooked':
          return (b.dateCooked || 0) - (a.dateCooked || 0);
        case 'dateAdded':
        default:
          return b.dateAdded - a.dateAdded;
      }
    });

    return result;
  }, [recipes, searchQuery, sortBy, filter, searchRecipes]);

  const renderRecipe = ({ item }: { item: RecipeWithIngredients }) => (
    <RecipeRow recipe={item} onPress={() => router.push(`/recipe/${item.id}`)} />
  );

  return (
    <ThemedView style={styles.container}>
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search recipes..."
      />

      <View style={styles.filterRow}>
        <View style={styles.filterButtons}>
          {(['all', 'queue', 'cooked'] as FilterOption[]).map((f) => (
            <Pressable
              key={f}
              style={[styles.filterButton, filter === f && styles.filterButtonActive]}
              onPress={() => setFilter(f)}
            >
              <ThemedText style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {f === 'all' ? 'All' : f === 'queue' ? 'Queue' : 'Cooked'}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </View>

      {filteredRecipes.length === 0 ? (
        <EmptyState
          icon="book-open-variant"
          title="No recipes yet"
          message="Add your first recipe to get started"
          actionLabel="Add Recipe"
          onAction={() => router.push('/recipe/add')}
        />
      ) : (
        <FlatList
          data={filteredRecipes}
          renderItem={renderRecipe}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Pressable style={styles.fab} onPress={() => router.push('/recipe/add')}>
        <MaterialCommunityIcons name="plus" size={28} color="#fff" />
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 12,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  filterButtonActive: {
    backgroundColor: '#FF6B35',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
  },
  list: {
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
