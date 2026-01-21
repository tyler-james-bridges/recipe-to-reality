import React, { useCallback, useState } from 'react';
import { StyleSheet, FlatList, View, Pressable, useColorScheme, Platform } from 'react-native';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolateColor,
  FadeIn,
  Layout,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';

import { ThemedView, ThemedText } from '@/components/Themed';
import { useRecipeStore } from '@/src/stores/recipeStore';
import { useSettingsStore } from '@/src/stores/settingsStore';
import { RecipeWithIngredients } from '@/src/types';
import RecipeRow from '@/src/components/RecipeRow';
import EmptyState from '@/src/components/EmptyState';
import { SkeletonRecipeList } from '@/src/components/ui/SkeletonLoader';
import AnimatedPressable from '@/src/components/ui/AnimatedPressable';
import Colors, { shadows, radius, spacing, typography, animation } from '@/constants/Colors';

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

function SegmentedControl({
  options,
  selectedKey,
  onSelect,
}: {
  options: { key: string; label: string }[];
  selectedKey: string;
  onSelect: (key: string) => void;
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.segmentedControl, { backgroundColor: colorScheme === 'dark' ? colors.cardElevated : '#E8E8ED' }]}>
      {options.map((option) => {
        const isSelected = option.key === selectedKey;
        return (
          <AnimatedPressable
            key={option.key}
            hapticType="selection"
            scaleOnPress={0.97}
            onPress={() => onSelect(option.key)}
            style={[
              styles.segmentedButton,
              isSelected && [
                styles.segmentedButtonActive,
                {
                  backgroundColor: colorScheme === 'dark' ? '#636366' : '#FFFFFF',
                },
                shadows.small,
              ],
            ]}
          >
            <ThemedText
              style={[
                styles.segmentedText,
                { color: isSelected ? colors.text : colors.textTertiary },
                isSelected && styles.segmentedTextActive,
              ]}
            >
              {option.label}
            </ThemedText>
          </AnimatedPressable>
        );
      })}
    </View>
  );
}

export default function RecipesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { recipes, loadRecipes, searchRecipes, isLoading } = useRecipeStore();
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

  const handleFilterChange = (newFilter: string) => {
    triggerHaptic();
    setFilter(newFilter as FilterOption);
  };

  const extractMinutes = (cookTime: string | null | undefined): number => {
    if (!cookTime) return Number.MAX_VALUE;
    const time = cookTime.toLowerCase();
    let totalMinutes = 0;

    const hourMatch = time.match(/(\d+)\s*(?:hour|hr|h)/);
    if (hourMatch) {
      totalMinutes += parseInt(hourMatch[1], 10) * 60;
    }

    const minMatch = time.match(/(\d+)\s*(?:min|m)/);
    if (minMatch) {
      totalMinutes += parseInt(minMatch[1], 10);
    }

    return totalMinutes === 0 ? Number.MAX_VALUE : totalMinutes;
  };

  const filteredRecipes = React.useMemo(() => {
    let result = searchQuery ? searchRecipes(searchQuery) : recipes;

    if (filter === 'queue') {
      result = result.filter((r) => r.isInQueue);
    } else if (filter === 'cooked') {
      result = result.filter((r) => r.dateCooked !== null);
    }

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

  const renderRecipe = ({ item, index }: { item: RecipeWithIngredients; index: number }) => (
    <RecipeRow
      recipe={item}
      onPress={() => router.push(`/recipe/${item.id}`)}
      index={index}
    />
  );

  // Render sort menu with backdrop
  const renderSortMenu = () => {
    if (!showSortMenu) return null;

    return (
      <>
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={() => setShowSortMenu(false)}
        />
        <Animated.View
          entering={FadeIn.duration(150)}
          style={[
            styles.sortMenu,
            {
              backgroundColor: colors.card,
              borderColor: colors.borderSubtle,
            },
            shadows.large,
          ]}
        >
          {SORT_OPTIONS.map((option, index) => (
            <React.Fragment key={option.key}>
              <AnimatedPressable
                hapticType="selection"
                onPress={() => {
                  setSortBy(option.key);
                  setShowSortMenu(false);
                }}
                style={styles.sortMenuItem}
              >
                <Ionicons
                  name={option.icon as any}
                  size={18}
                  color={sortBy === option.key ? colors.tint : colors.textTertiary}
                />
                <ThemedText
                  style={[
                    styles.sortMenuText,
                    sortBy === option.key && { color: colors.tint },
                  ]}
                >
                  {option.label}
                </ThemedText>
                {sortBy === option.key && (
                  <Ionicons name="checkmark" size={18} color={colors.tint} />
                )}
              </AnimatedPressable>
              {index < SORT_OPTIONS.length - 1 && (
                <View style={[styles.sortMenuDivider, { backgroundColor: colors.borderSubtle }]} />
              )}
            </React.Fragment>
          ))}
        </Animated.View>
      </>
    );
  };

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
              <AnimatedPressable
                onPress={() => {
                  triggerHaptic();
                  setShowSortMenu(!showSortMenu);
                }}
                hapticType="selection"
                style={styles.headerButton}
              >
                <Ionicons name="swap-vertical" size={22} color={colors.tint} />
              </AnimatedPressable>
            ) : null,
          headerRight: () => (
            <AnimatedPressable
              onPress={() => {
                triggerHaptic();
                router.push('/recipe/add');
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
        {recipes.length === 0 && !isLoading ? (
          <EmptyState
            icon="book-outline"
            title="No Recipes Yet"
            message="Save recipes from your favorite websites and videos to get started."
            actionLabel="Add Your First Recipe"
            onAction={() => router.push('/recipe/add')}
          />
        ) : recipes.length === 0 && isLoading ? (
          <SkeletonRecipeList count={5} />
        ) : (
          <>
            {/* Segmented Control */}
            <View style={[styles.segmentedContainer, { backgroundColor: colors.background }]}>
              <SegmentedControl
                options={FILTER_OPTIONS}
                selectedKey={filter}
                onSelect={handleFilterChange}
              />
            </View>

            {/* Sort menu */}
            {renderSortMenu()}

            {/* Recipe List */}
            <FlatList
              data={filteredRecipes}
              renderItem={renderRecipe}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
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
    padding: spacing.xs,
  },
  segmentedContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: radius.md,
    padding: 3,
  },
  segmentedButton: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    borderRadius: radius.sm + 1,
  },
  segmentedButtonActive: {
    // Styles applied dynamically
  },
  segmentedText: {
    ...typography.labelMedium,
  },
  segmentedTextActive: {
    fontWeight: '600',
  },
  sortMenu: {
    position: 'absolute',
    top: 64,
    left: spacing.lg,
    zIndex: 1000,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: 200,
    overflow: 'hidden',
  },
  sortMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  sortMenuText: {
    flex: 1,
    ...typography.bodyMedium,
  },
  sortMenuDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.lg + spacing.md + 18, // padding + gap + icon width
  },
  separator: {
    height: spacing.xs,
  },
  list: {
    paddingTop: spacing.sm,
    paddingBottom: 120,
  },
});
