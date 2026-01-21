import React, { useCallback, useState } from 'react';
import { StyleSheet, FlatList, View, Pressable, useColorScheme } from 'react-native';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

import { ThemedView, ThemedText } from '@/components/Themed';
import { useRecipeStore } from '@/src/stores/recipeStore';
import { useSettingsStore } from '@/src/stores/settingsStore';
import { RecipeWithIngredients } from '@/src/types';
import RecipeRow from '@/src/components/RecipeRow';
import EmptyState from '@/src/components/EmptyState';
import SearchBar from '@/src/components/SearchBar';
import Colors from '@/constants/Colors';

type SortOption = 'dateAdded' | 'name' | 'cookTime';
type FilterOption = 'all' | 'queue' | 'cooked';

const FILTER_OPTIONS: { key: FilterOption; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'queue', label: 'To Cook' },
  { key: 'cooked', label: 'Cooked' },
];

const SORT_OPTIONS: { key: SortOption; label: string; icon: string }[] = [
  { key: 'dateAdded', label: 'Recently Added', icon: 'calendar' },
  { key: 'name', label: 'Name', icon: 'text' },
  { key: 'cookTime', label: 'Cook Time', icon: 'time' },
];

export default function RecipesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { recipes, loadRecipes, searchRecipes } = useRecipeStore();
  const hapticFeedback = useSettingsStore((state) => state.hapticFeedback);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('dateAdded');
  const [filter, setFilter] = useState<FilterOption>('all');
  const [showSortMenu, setShowSortMenu] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadRecipes();
    }, [loadRecipes])
  );

  const triggerHaptic = () => {
    if (hapticFeedback) {
      Haptics.selectionAsync();
    }
  };

  const handleFilterChange = (newFilter: FilterOption) => {
    triggerHaptic();
    setFilter(newFilter);
  };

  const extractMinutes = (cookTime: string | null | undefined): number => {
    if (!cookTime) return Number.MAX_VALUE;
    const time = cookTime.toLowerCase();
    let totalMinutes = 0;

    // Handle hours
    const hourMatch = time.match(/(\d+)\s*(?:hour|hr|h)/);
    if (hourMatch) {
      totalMinutes += parseInt(hourMatch[1], 10) * 60;
    }

    // Handle minutes
    const minMatch = time.match(/(\d+)\s*(?:min|m)/);
    if (minMatch) {
      totalMinutes += parseInt(minMatch[1], 10);
    }

    return totalMinutes === 0 ? Number.MAX_VALUE : totalMinutes;
  };

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
        case 'name':
          return a.title.localeCompare(b.title);
        case 'cookTime':
          return extractMinutes(a.cookTime) - extractMinutes(b.cookTime);
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

  const renderSeparator = () => (
    <View style={[styles.separator, { backgroundColor: colors.border }]} />
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Recipes',
          headerLargeTitle: true,
          headerSearchBarOptions: {
            placeholder: 'Search recipes or ingredients',
            onChangeText: (e) => setSearchQuery(e.nativeEvent.text),
          },
          headerLeft: () =>
            recipes.length > 0 ? (
              <Pressable
                onPress={() => {
                  triggerHaptic();
                  setShowSortMenu(!showSortMenu);
                }}
                style={styles.headerButton}
              >
                <Ionicons name="swap-vertical" size={22} color={colors.tint} />
              </Pressable>
            ) : null,
          headerRight: () => (
            <Pressable
              onPress={() => {
                triggerHaptic();
                router.push('/recipe/add');
              }}
              style={styles.headerButton}
            >
              <Ionicons name="add" size={28} color={colors.tint} />
            </Pressable>
          ),
        }}
      />
      <ThemedView style={styles.container}>
        {recipes.length === 0 ? (
          <EmptyState
            icon="book-outline"
            title="No Recipes Yet"
            message="Save recipes from your favorite websites and videos to get started."
            actionLabel="Add Your First Recipe"
            onAction={() => router.push('/recipe/add')}
          />
        ) : (
          <>
            {/* Segmented Control - matches SwiftUI .segmented picker */}
            <View style={[styles.segmentedContainer, { backgroundColor: colors.background }]}>
              <View style={[styles.segmentedControl, { backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#E5E5EA' }]}>
                {FILTER_OPTIONS.map((option) => (
                  <Pressable
                    key={option.key}
                    style={[
                      styles.segmentedButton,
                      filter === option.key && [
                        styles.segmentedButtonActive,
                        { backgroundColor: colorScheme === 'dark' ? '#636366' : '#fff' },
                      ],
                    ]}
                    onPress={() => handleFilterChange(option.key)}
                  >
                    <ThemedText
                      style={[
                        styles.segmentedText,
                        filter === option.key && styles.segmentedTextActive,
                      ]}
                    >
                      {option.label}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Sort menu dropdown */}
            {showSortMenu && (
              <View style={[styles.sortMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {SORT_OPTIONS.map((option) => (
                  <Pressable
                    key={option.key}
                    style={styles.sortMenuItem}
                    onPress={() => {
                      triggerHaptic();
                      setSortBy(option.key);
                      setShowSortMenu(false);
                    }}
                  >
                    <Ionicons
                      name={option.icon as any}
                      size={18}
                      color={sortBy === option.key ? colors.tint : '#8E8E93'}
                    />
                    <ThemedText style={[
                      styles.sortMenuText,
                      sortBy === option.key && { color: colors.tint },
                    ]}>
                      {option.label}
                    </ThemedText>
                    {sortBy === option.key && (
                      <Ionicons name="checkmark" size={18} color={colors.tint} />
                    )}
                  </Pressable>
                ))}
              </View>
            )}

            {/* Recipe List - plain style matching SwiftUI */}
            <FlatList
              data={filteredRecipes}
              renderItem={renderRecipe}
              keyExtractor={(item) => item.id}
              ItemSeparatorComponent={renderSeparator}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              style={{ backgroundColor: colors.card }}
            />
          </>
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
  segmentedContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 2,
  },
  segmentedButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
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
  },
  sortMenu: {
    position: 'absolute',
    top: 60,
    left: 16,
    zIndex: 1000,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    minWidth: 180,
  },
  sortMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  sortMenuText: {
    flex: 1,
    fontSize: 15,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 88, // 16 padding + 60 image + 12 gap
  },
  list: {
    paddingBottom: 100,
  },
});
