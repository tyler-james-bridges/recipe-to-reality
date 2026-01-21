import React, { useCallback, useState } from 'react';
import { StyleSheet, FlatList, View, Pressable, ScrollView, SectionList, useColorScheme } from 'react-native';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

import { ThemedView, ThemedText } from '@/components/Themed';
import { usePantryStore } from '@/src/stores/pantryStore';
import { useSettingsStore } from '@/src/stores/settingsStore';
import { PantryItem, INGREDIENT_CATEGORIES, IngredientCategory } from '@/src/types';
import PantryItemRow from '@/src/components/PantryItemRow';
import EmptyState from '@/src/components/EmptyState';
import Colors from '@/constants/Colors';

type FilterOption = 'all' | 'expiring' | IngredientCategory;

export default function PantryScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
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

    // Sort by expiration date (soonest first), then by name
    return [...result].sort((a, b) => {
      if (a.expirationDate && b.expirationDate) {
        return a.expirationDate - b.expirationDate;
      }
      if (a.expirationDate) return -1;
      if (b.expirationDate) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [items, searchQuery, selectedFilter]);

  // Group by category for section list
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

  const filterOptions: { key: FilterOption; label: string; icon?: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'expiring', label: 'Expiring', icon: 'time' },
    ...INGREDIENT_CATEGORIES.map((cat) => ({ key: cat as FilterOption, label: cat })),
  ];

  const renderItem = ({ item }: { item: PantryItem }) => (
    <PantryItemRow
      item={item}
      onDelete={() => deleteItem(item.id)}
      onPress={() => router.push({ pathname: '/pantry/edit', params: { id: item.id } })}
    />
  );

  const renderSectionHeader = ({ section: { title } }: { section: { title: string } }) => (
    <View style={[styles.sectionHeader, { backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F2F2F7' }]}>
      <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
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
              <Pressable
                onPress={() => {
                  triggerHaptic();
                  router.push('/what-can-i-make');
                }}
                style={styles.headerButton}
              >
                <Ionicons name="restaurant" size={22} color={colors.tint} />
              </Pressable>
              <Pressable
                onPress={() => {
                  triggerHaptic();
                  router.push('/pantry/add');
                }}
                style={styles.headerButton}
              >
                <Ionicons name="add" size={28} color={colors.tint} />
              </Pressable>
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
            onAction={() => router.push('/pantry/add')}
          />
        ) : (
          <>
            {/* Expiring Soon Banner */}
            {(expiringSoonCount > 0 || expiredCount > 0) && selectedFilter !== 'expiring' && (
              <Pressable
                style={[styles.warningBanner, { backgroundColor: colors.warning + '1A' }]}
                onPress={() => {
                  triggerHaptic();
                  setSelectedFilter('expiring');
                }}
              >
                <Ionicons name="alert-circle" size={20} color={colors.warning} />
                <ThemedText style={[styles.warningText, { color: colors.warning }]}>
                  {expiredCount > 0 && `${expiredCount} expired`}
                  {expiredCount > 0 && expiringSoonCount > 0 && ', '}
                  {expiringSoonCount > 0 && `${expiringSoonCount} expiring soon`}
                </ThemedText>
                <Ionicons name="chevron-forward" size={18} color={colors.warning} />
              </Pressable>
            )}

            {/* Filter Pills - horizontal scrolling */}
            <View style={styles.filterContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterScroll}
              >
                {filterOptions.map((option) => (
                  <Pressable
                    key={option.key}
                    style={[
                      styles.filterPill,
                      selectedFilter === option.key && { backgroundColor: colors.tint },
                      selectedFilter !== option.key && {
                        backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#E5E5EA',
                      },
                    ]}
                    onPress={() => {
                      triggerHaptic();
                      setSelectedFilter(option.key);
                    }}
                  >
                    {option.icon && (
                      <Ionicons
                        name={option.icon as any}
                        size={14}
                        color={selectedFilter === option.key ? '#fff' : colors.text}
                      />
                    )}
                    <ThemedText
                      style={[
                        styles.filterText,
                        selectedFilter === option.key && { color: '#fff' },
                      ]}
                    >
                      {option.label}
                    </ThemedText>
                  </Pressable>
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
              style={{ backgroundColor: colors.background }}
              ItemSeparatorComponent={() => (
                <View style={[styles.separator, { backgroundColor: colors.border }]} />
              )}
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
    gap: 8,
  },
  headerButton: {
    padding: 4,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  filterContainer: {
    paddingVertical: 8,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 16,
  },
  sectionSeparator: {
    height: 16,
  },
  list: {
    paddingBottom: 100,
  },
});
