import React, { useCallback, useState } from 'react';
import { StyleSheet, View, ScrollView, SectionList, useColorScheme } from 'react-native';
import { router, Stack, Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedView, ThemedText } from '@/components/Themed';
import { usePantryStore } from '@/src/stores/pantryStore';
import { useSettingsStore } from '@/src/stores/settingsStore';
import { PantryItem, INGREDIENT_CATEGORIES, IngredientCategory } from '@/src/types';
import PantryItemRow from '@/src/components/PantryItemRow';
import EmptyState from '@/src/components/EmptyState';
import AnimatedPressable from '@/src/components/ui/AnimatedPressable';
import { ChipGroup } from '@/src/components/ui/Chip';
import Colors, { shadows, radius, spacing, typography, gradients } from '@/constants/Colors';

type FilterOption = 'all' | 'expiring' | IngredientCategory;

export default function PantryScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const themeGradients = gradients[colorScheme ?? 'light'];
  const { items, loadItems, deleteItem } = usePantryStore();
  const hapticFeedback = useSettingsStore((state) => state.hapticFeedback);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterOption>('all');

  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, [loadItems])
  );

  const triggerHaptic = () => {
    if (hapticFeedback) {
      Haptics.selectionAsync();
    }
  };

  // Calculate expiring soon count
  const expiringSoonCount = items.filter((item) => {
    if (!item.expirationDate) return false;
    const threeDaysFromNow = Date.now() + 3 * 24 * 60 * 60 * 1000;
    return item.expirationDate <= threeDaysFromNow && item.expirationDate > Date.now();
  }).length;

  const expiredCount = items.filter((item) => {
    if (!item.expirationDate) return false;
    return item.expirationDate <= Date.now();
  }).length;

  const filteredItems = React.useMemo(() => {
    let result = items;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((item) => item.name.toLowerCase().includes(query));
    }

    if (selectedFilter === 'expiring') {
      const threeDaysFromNow = Date.now() + 3 * 24 * 60 * 60 * 1000;
      result = result.filter((item) => {
        if (!item.expirationDate) return false;
        return item.expirationDate <= threeDaysFromNow;
      });
    } else if (selectedFilter !== 'all') {
      result = result.filter((item) => item.category === selectedFilter);
    }

    return [...result].sort((a, b) => {
      if (a.expirationDate && b.expirationDate) {
        return a.expirationDate - b.expirationDate;
      }
      if (a.expirationDate) return -1;
      if (b.expirationDate) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [items, searchQuery, selectedFilter]);

  const sections = React.useMemo(() => {
    if (selectedFilter !== 'all' && selectedFilter !== 'expiring') {
      return [{ title: selectedFilter, data: filteredItems }];
    }

    const grouped: Record<string, PantryItem[]> = {};
    filteredItems.forEach((item) => {
      const category = item.category || 'Other';
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(item);
    });

    return INGREDIENT_CATEGORIES
      .filter((cat) => grouped[cat]?.length > 0)
      .map((category) => ({ title: category, data: grouped[category] }));
  }, [filteredItems, selectedFilter]);

  const filterOptions: { key: string; label: string; icon?: any }[] = [
    { key: 'all', label: 'All' },
    { key: 'expiring', label: 'Expiring', icon: 'time-outline' },
    ...INGREDIENT_CATEGORIES.slice(0, 4).map((cat) => ({ key: cat, label: cat })),
  ];

  const renderItem = ({ item, index }: { item: PantryItem; index: number }) => (
    <PantryItemRow
      item={item}
      onDelete={() => deleteItem(item.id)}
      onPress={() => router.push({ pathname: '/pantry/edit', params: { id: item.id } } as any)}
      index={index}
    />
  );

  const renderSectionHeader = ({ section: { title } }: { section: { title: string } }) => (
    <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
      <ThemedText style={[styles.sectionTitle, { color: colors.textTertiary }]}>
        {title}
      </ThemedText>
    </View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Pantry',
          headerLargeTitle: true,
          headerSearchBarOptions: {
            placeholder: 'Search pantry...',
            onChangeText: (e) => setSearchQuery(e.nativeEvent.text),
          },
          headerRight: () => (
            <View style={styles.headerButtons}>
              <AnimatedPressable
                onPress={() => {
                  triggerHaptic();
                  router.push('/what-can-i-make');
                }}
                hapticType="selection"
                style={styles.headerButton}
              >
                <Ionicons name="restaurant" size={22} color={colors.tint} />
              </AnimatedPressable>
              <AnimatedPressable
                onPress={() => {
                  triggerHaptic();
                  router.push('/pantry/add' as Href);
                }}
                hapticType="medium"
                style={styles.headerButton}
              >
                <Ionicons name="add" size={28} color={colors.tint} />
              </AnimatedPressable>
            </View>
          ),
        }}
      />
      <ThemedView style={styles.container}>
        {items.length === 0 ? (
          <EmptyState
            icon="snow-outline"
            title="Pantry is Empty"
            message="Add items to track what ingredients you have and get recipe suggestions."
            actionLabel="Add First Item"
            onAction={() => router.push('/pantry/add' as Href)}
          />
        ) : (
          <>
            {/* Stats Card */}
            <Animated.View
              entering={FadeIn.duration(300)}
              style={[styles.statsCard, { backgroundColor: colors.card }, shadows.small]}
            >
              <View style={styles.statItem}>
                <ThemedText style={[styles.statNumber, { color: colors.tint }]}>
                  {items.length}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: colors.textTertiary }]}>
                  Items
                </ThemedText>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.borderSubtle }]} />
              <View style={styles.statItem}>
                <ThemedText style={[styles.statNumber, { color: colors.success }]}>
                  {sections.length}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: colors.textTertiary }]}>
                  Categories
                </ThemedText>
              </View>
              {(expiringSoonCount > 0 || expiredCount > 0) && (
                <>
                  <View style={[styles.statDivider, { backgroundColor: colors.borderSubtle }]} />
                  <AnimatedPressable
                    onPress={() => setSelectedFilter('expiring')}
                    hapticType="selection"
                    style={styles.statItem}
                  >
                    <ThemedText style={[styles.statNumber, { color: colors.warning }]}>
                      {expiringSoonCount + expiredCount}
                    </ThemedText>
                    <ThemedText style={[styles.statLabel, { color: colors.textTertiary }]}>
                      Expiring
                    </ThemedText>
                  </AnimatedPressable>
                </>
              )}
            </Animated.View>

            {/* Filter Pills */}
            <View style={styles.filterContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterScroll}
              >
                {filterOptions.map((option) => (
                  <AnimatedPressable
                    key={option.key}
                    hapticType="selection"
                    scaleOnPress={0.95}
                    onPress={() => {
                      triggerHaptic();
                      setSelectedFilter(option.key as FilterOption);
                    }}
                    style={[
                      styles.filterPill,
                      selectedFilter === option.key
                        ? { backgroundColor: colors.tint }
                        : { backgroundColor: colorScheme === 'dark' ? colors.cardElevated : '#E8E8ED' },
                    ]}
                  >
                    {option.icon && (
                      <Ionicons
                        name={option.icon}
                        size={14}
                        color={selectedFilter === option.key ? '#FFFFFF' : colors.text}
                      />
                    )}
                    <ThemedText
                      style={[
                        styles.filterText,
                        { color: selectedFilter === option.key ? '#FFFFFF' : colors.text },
                      ]}
                    >
                      {option.label}
                    </ThemedText>
                  </AnimatedPressable>
                ))}
              </ScrollView>
            </View>

            {/* Pantry Items by Category */}
            <SectionList
              sections={sections}
              renderItem={renderItem}
              renderSectionHeader={renderSectionHeader}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              stickySectionHeadersEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
              SectionSeparatorComponent={() => <View style={styles.sectionSeparator} />}
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
  headerButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerButton: {
    padding: spacing.xs,
  },
  statsCard: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    ...typography.displayMedium,
  },
  statLabel: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  statDivider: {
    width: 1,
    height: '100%',
  },
  filterContainer: {
    paddingVertical: spacing.sm,
  },
  filterScroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    gap: spacing.xs,
  },
  filterText: {
    ...typography.labelMedium,
  },
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    paddingTop: spacing.md,
  },
  sectionTitle: {
    ...typography.labelMedium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemSeparator: {
    height: spacing.xs,
  },
  sectionSeparator: {
    height: spacing.md,
  },
  list: {
    paddingBottom: 120,
  },
});
