import React, { useCallback } from 'react'
import { StyleSheet, View, SectionList, useColorScheme, Alert } from 'react-native'
import { router, Stack, Href } from 'expo-router'
import { Icon } from '@/src/components/ui/Icon'
import { useFocusEffect } from '@react-navigation/native'
import * as Haptics from 'expo-haptics'
import Animated, { FadeInDown } from 'react-native-reanimated'

import { ThemedView, ThemedText } from '@/components/Themed'
import { useGroceryStore } from '@/src/stores/groceryStore'
import { useRecipeStore } from '@/src/stores/recipeStore'
import { useSettingsStore } from '@/src/stores/settingsStore'
import { GroceryItem, INGREDIENT_CATEGORIES } from '@/src/types'
import GroceryItemRow from '@/src/components/GroceryItemRow'
import EmptyState from '@/src/components/EmptyState'
import ProgressBar from '@/src/components/ui/ProgressBar'
import AnimatedPressable from '@/src/components/ui/AnimatedPressable'
import Colors, { shadows, radius, spacing, typography, TAB_SCROLL_PADDING } from '@/constants/Colors'

export default function GroceryScreen() {
  const colorScheme = useColorScheme()
  const colors = Colors[colorScheme ?? 'light']
  const { currentList, loadCurrentList, toggleItem, deleteItem, clearChecked, clearAll } =
    useGroceryStore()
  const { recipes } = useRecipeStore()
  const hapticFeedback = useSettingsStore((state) => state.hapticFeedback)

  const queuedRecipes = recipes.filter((r) => r.isInQueue)

  useFocusEffect(
    useCallback(() => {
      loadCurrentList()
    }, [loadCurrentList])
  )

  const triggerHaptic = (type: 'selection' | 'success' | 'warning') => {
    if (!hapticFeedback) return
    switch (type) {
      case 'selection':
        Haptics.selectionAsync()
        break
      case 'success':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        break
      case 'warning':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
        break
    }
  }

  const items = React.useMemo(() => currentList?.items || [], [currentList?.items])
  const checkedCount = items.filter((i) => i.isChecked).length
  const totalCount = items.length
  const progress = totalCount > 0 ? checkedCount / totalCount : 0

  // Group items by category
  const sections = React.useMemo(() => {
    const grouped: Record<string, GroceryItem[]> = {}

    items.forEach((item) => {
      const category = item.category || 'Other'
      if (!grouped[category]) {
        grouped[category] = []
      }
      grouped[category].push(item)
    })

    return INGREDIENT_CATEGORIES.filter((cat) => grouped[cat]?.length > 0).map((category) => ({
      title: category,
      data: grouped[category].sort((a, b) => {
        if (a.isChecked !== b.isChecked) {
          return a.isChecked ? 1 : -1
        }
        return a.name.localeCompare(b.name)
      }),
    }))
  }, [items])

  const handleToggleItem = (itemId: string) => {
    triggerHaptic('selection')
    const item = items.find((i) => i.id === itemId)
    toggleItem(itemId)
    if (!item?.isChecked) {
      triggerHaptic('success')
    }
  }

  const handleShowMenu = () => {
    Alert.alert('Grocery List', undefined, [
      {
        text: 'Clear Checked',
        onPress: () => {
          triggerHaptic('selection')
          clearChecked()
        },
      },
      {
        text: 'Clear All',
        style: 'destructive',
        onPress: () => {
          triggerHaptic('warning')
          clearAll()
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  const renderItem = ({ item, index }: { item: GroceryItem; index: number }) => (
    <GroceryItemRow
      item={item}
      onToggle={() => handleToggleItem(item.id)}
      onDelete={() => deleteItem(item.id)}
      index={index}
    />
  )

  const renderSectionHeader = ({ section: { title } }: { section: { title: string } }) => (
    <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
      <ThemedText style={[styles.sectionTitle, { color: colors.textTertiary }]}>{title}</ThemedText>
    </View>
  )

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Grocery List',
          headerLargeTitle: true,
          headerRight: () => (
            <View style={styles.headerButtons}>
              {items.length > 0 && (
                <AnimatedPressable
                  onPress={handleShowMenu}
                  hapticType="selection"
                  style={styles.headerButton}
                >
                  <Icon name="ellipsis-horizontal-circle" size={24} color={colors.tint} />
                </AnimatedPressable>
              )}
              <AnimatedPressable
                onPress={() => router.push('/grocery/generate' as Href)}
                hapticType="medium"
                style={styles.headerButton}
              >
                <Icon name="sparkles" size={22} color={colors.tint} />
              </AnimatedPressable>
            </View>
          ),
        }}
      />
      <ThemedView style={styles.container}>
        {items.length === 0 ? (
          <EmptyState
            icon="cart-outline"
            title="No Items Yet"
            message="Add ingredients from recipes or generate a list from your cooking queue."
            secondaryMessage={
              queuedRecipes.length > 0
                ? `${queuedRecipes.length} recipe${queuedRecipes.length > 1 ? 's' : ''} in your queue`
                : undefined
            }
            actionLabel={queuedRecipes.length > 0 ? 'Generate from Queue' : undefined}
            onAction={
              queuedRecipes.length > 0 ? () => router.push('/grocery/generate' as Href) : undefined
            }
          />
        ) : (
          <>
            {/* Progress Header Card */}
            <Animated.View
              entering={FadeInDown.duration(300)}
              style={[styles.progressCard, { backgroundColor: colors.card }, shadows.small]}
            >
              <View style={styles.progressHeader}>
                <View style={styles.progressTextContainer}>
                  <ThemedText style={styles.progressLabel}>Shopping Progress</ThemedText>
                  <ThemedText style={[styles.progressCount, { color: colors.textTertiary }]}>
                    {checkedCount} of {totalCount} items
                  </ThemedText>
                </View>
                <ThemedText style={[styles.progressPercent, { color: colors.tint }]}>
                  {Math.round(progress * 100)}%
                </ThemedText>
              </View>
              <ProgressBar progress={progress} height={8} showGlow={progress > 0.5} />
            </Animated.View>

            {/* Grouped items by category */}
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
  )
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
  progressCard: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  progressTextContainer: {
    flex: 1,
  },
  progressLabel: {
    ...typography.titleSmall,
    marginBottom: spacing.xs,
  },
  progressCount: {
    ...typography.caption,
  },
  progressPercent: {
    ...typography.displayMedium,
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
    paddingBottom: TAB_SCROLL_PADDING,
  },
})
