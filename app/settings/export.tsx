import React, { useState, useEffect, useCallback } from 'react'
import {
  StyleSheet,
  ScrollView,
  View,
  useColorScheme,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { Stack } from 'expo-router'
import { Icon } from '@/src/components/ui/Icon'
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { File, Paths } from 'expo-file-system'
import { shareAsync, isAvailableAsync } from 'expo-sharing'
import * as Haptics from 'expo-haptics'

import type { IconProps } from '@/src/components/ui/Icon'
import { ThemedView, ThemedText } from '@/components/Themed'
import { useRecipeStore } from '@/src/stores/recipeStore'
import { useMealPlanStore } from '@/src/stores/mealPlanStore'
import { useGroceryStore } from '@/src/stores/groceryStore'
import { usePantryStore } from '@/src/stores/pantryStore'
import { useSettingsStore } from '@/src/stores/settingsStore'
import AnimatedPressable from '@/src/components/ui/AnimatedPressable'
import ModernButton from '@/src/components/ui/ModernButton'
import Colors, { shadows, radius, spacing, typography } from '@/constants/Colors'

type ExportType = 'recipes' | 'mealPlans' | 'groceryLists' | 'pantryItems' | 'all'

interface ExportOption {
  type: ExportType
  title: string
  description: string
  icon: IconProps['name']
  iconColor: string
}

const EXPORT_OPTIONS: ExportOption[] = [
  {
    type: 'recipes',
    title: 'Recipes',
    description: 'Export all saved recipes with ingredients',
    icon: 'book-outline',
    iconColor: '#FF9500',
  },
  {
    type: 'mealPlans',
    title: 'Meal Plans',
    description: 'Export all scheduled meal plans',
    icon: 'calendar-outline',
    iconColor: '#30D158',
  },
  {
    type: 'groceryLists',
    title: 'Grocery Lists',
    description: 'Export all grocery lists and items',
    icon: 'cart-outline',
    iconColor: '#007AFF',
  },
  {
    type: 'pantryItems',
    title: 'Pantry Items',
    description: 'Export all pantry inventory',
    icon: 'cube-outline',
    iconColor: '#AF52DE',
  },
]

interface DataCount {
  recipes: number
  mealPlans: number
  groceryLists: number
  groceryItems: number
  pantryItems: number
}

interface ExportRowProps {
  option: ExportOption
  count: number
  isLoading: boolean
  isSuccess: boolean
  onExport: () => void
  index: number
}

function ExportRow({ option, count, isLoading, isSuccess, onExport, index }: ExportRowProps) {
  const colorScheme = useColorScheme()
  const colors = Colors[colorScheme ?? 'light']
  const hapticFeedback = useSettingsStore((state) => state.hapticFeedback)

  const successScale = useSharedValue(1)

  useEffect(() => {
    if (isSuccess) {
      successScale.value = withSequence(
        withTiming(1.2, { duration: 150 }),
        withTiming(1, { duration: 150 })
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess])

  const successAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: successScale.value }],
  }))

  const handlePress = () => {
    if (hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    }
    onExport()
  }

  return (
    <Animated.View entering={FadeInDown.delay(100 + index * 80).duration(350)}>
      <AnimatedPressable
        onPress={handlePress}
        hapticType="medium"
        scaleOnPress={0.98}
        disabled={isLoading || count === 0}
        style={[
          styles.exportRow,
          { backgroundColor: colors.card },
          shadows.small,
          (isLoading || count === 0) && styles.rowDisabled,
        ]}
      >
        <View style={[styles.iconContainer, { backgroundColor: option.iconColor + '20' }]}>
          <Icon name={option.icon} size={24} color={option.iconColor} />
        </View>

        <View style={styles.rowContent}>
          <View style={styles.rowHeader}>
            <ThemedText style={styles.rowTitle}>{option.title}</ThemedText>
            <View style={[styles.countBadge, { backgroundColor: colors.accentSubtle }]}>
              <ThemedText style={[styles.countText, { color: colors.tint }]}>{count}</ThemedText>
            </View>
          </View>
          <ThemedText style={[styles.rowDescription, { color: colors.textTertiary }]}>
            {option.description}
          </ThemedText>
        </View>

        <View style={styles.rowAction}>
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.tint} />
          ) : isSuccess ? (
            <Animated.View style={successAnimatedStyle}>
              <Icon name="checkmark-circle" size={24} color={colors.success} />
            </Animated.View>
          ) : (
            <Icon
              name="share-outline"
              size={22}
              color={count === 0 ? colors.textTertiary : colors.tint}
            />
          )}
        </View>
      </AnimatedPressable>
    </Animated.View>
  )
}

export default function ExportDataScreen() {
  const colorScheme = useColorScheme()
  const colors = Colors[colorScheme ?? 'light']
  const hapticFeedback = useSettingsStore((state) => state.hapticFeedback)

  // Store hooks
  const { recipes, loadRecipes } = useRecipeStore()
  const { mealPlans, loadMealPlans } = useMealPlanStore()
  const { lists, loadAllLists } = useGroceryStore()
  const { items: pantryItems, loadItems: loadPantryItems } = usePantryStore()

  // State
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [exportingType, setExportingType] = useState<ExportType | null>(null)
  const [successType, setSuccessType] = useState<ExportType | null>(null)
  const [dataCounts, setDataCounts] = useState<DataCount>({
    recipes: 0,
    mealPlans: 0,
    groceryLists: 0,
    groceryItems: 0,
    pantryItems: 0,
  })

  // Load all data on mount
  useEffect(() => {
    const loadAllData = async () => {
      setIsInitialLoading(true)
      try {
        await Promise.all([loadRecipes(), loadMealPlans(), loadAllLists(), loadPantryItems()])
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setIsInitialLoading(false)
      }
    }

    loadAllData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update counts when data changes
  useEffect(() => {
    const totalGroceryItems = lists.reduce((sum, list) => sum + list.items.length, 0)
    setDataCounts({
      recipes: recipes.length,
      mealPlans: mealPlans.length,
      groceryLists: lists.length,
      groceryItems: totalGroceryItems,
      pantryItems: pantryItems.length,
    })
  }, [recipes, mealPlans, lists, pantryItems])

  const totalItems =
    dataCounts.recipes + dataCounts.mealPlans + dataCounts.groceryLists + dataCounts.pantryItems

  const getExportData = useCallback(
    (type: ExportType) => {
      const timestamp = new Date().toISOString()
      const baseData = {
        exportedAt: timestamp,
        appVersion: '1.0.0',
      }

      switch (type) {
        case 'recipes':
          return {
            ...baseData,
            type: 'recipes',
            data: recipes.map((recipe) => ({
              ...recipe,
              instructions:
                typeof recipe.instructions === 'string'
                  ? JSON.parse(recipe.instructions)
                  : recipe.instructions,
            })),
          }
        case 'mealPlans':
          return {
            ...baseData,
            type: 'mealPlans',
            data: mealPlans,
          }
        case 'groceryLists':
          return {
            ...baseData,
            type: 'groceryLists',
            data: lists.map((list) => ({
              ...list,
              items: list.items.map((item) => ({
                ...item,
                sourceRecipeIds:
                  typeof item.sourceRecipeIds === 'string'
                    ? JSON.parse(item.sourceRecipeIds)
                    : item.sourceRecipeIds,
              })),
            })),
          }
        case 'pantryItems':
          return {
            ...baseData,
            type: 'pantryItems',
            data: pantryItems,
          }
        case 'all':
          return {
            ...baseData,
            type: 'complete',
            data: {
              recipes: recipes.map((recipe) => ({
                ...recipe,
                instructions:
                  typeof recipe.instructions === 'string'
                    ? JSON.parse(recipe.instructions)
                    : recipe.instructions,
              })),
              mealPlans,
              groceryLists: lists.map((list) => ({
                ...list,
                items: list.items.map((item) => ({
                  ...item,
                  sourceRecipeIds:
                    typeof item.sourceRecipeIds === 'string'
                      ? JSON.parse(item.sourceRecipeIds)
                      : item.sourceRecipeIds,
                })),
              })),
              pantryItems,
            },
          }
        default:
          return baseData
      }
    },
    [recipes, mealPlans, lists, pantryItems]
  )

  const getFileName = (type: ExportType): string => {
    const date = new Date().toISOString().split('T')[0]
    switch (type) {
      case 'recipes':
        return `recipe-to-reality-recipes-${date}.json`
      case 'mealPlans':
        return `recipe-to-reality-meal-plans-${date}.json`
      case 'groceryLists':
        return `recipe-to-reality-grocery-lists-${date}.json`
      case 'pantryItems':
        return `recipe-to-reality-pantry-items-${date}.json`
      case 'all':
        return `recipe-to-reality-complete-export-${date}.json`
      default:
        return `recipe-to-reality-export-${date}.json`
    }
  }

  const handleExport = useCallback(
    async (type: ExportType) => {
      setExportingType(type)
      setSuccessType(null)

      try {
        // Check if sharing is available
        const isSharingAvailable = await isAvailableAsync()
        if (!isSharingAvailable) {
          Alert.alert('Error', 'Sharing is not available on this device.')
          setExportingType(null)
          return
        }

        const data = getExportData(type)
        const jsonString = JSON.stringify(data, null, 2)
        const fileName = getFileName(type)

        // Create file in cache directory using new API
        const file = new File(Paths.cache, fileName)
        file.write(jsonString)

        // Share the file
        await shareAsync(file.uri, {
          mimeType: 'application/json',
          dialogTitle: `Export ${type === 'all' ? 'All Data' : type}`,
          UTI: 'public.json',
        })

        // Success
        if (hapticFeedback) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        }
        setSuccessType(type)

        // Clear success after 3 seconds
        setTimeout(() => {
          setSuccessType(null)
        }, 3000)
      } catch (error) {
        console.error('Export error:', error)
        if (hapticFeedback) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
        }
        Alert.alert('Export Failed', 'Unable to export data. Please try again.')
      } finally {
        setExportingType(null)
      }
    },
    [getExportData, hapticFeedback]
  )

  const getCountForType = (type: ExportType): number => {
    switch (type) {
      case 'recipes':
        return dataCounts.recipes
      case 'mealPlans':
        return dataCounts.mealPlans
      case 'groceryLists':
        return dataCounts.groceryLists
      case 'pantryItems':
        return dataCounts.pantryItems
      default:
        return 0
    }
  }

  if (isInitialLoading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Export Data' }} />
        <ThemedView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <ThemedText style={[styles.loadingText, { color: colors.textTertiary }]}>
            Loading your data...
          </ThemedText>
        </ThemedView>
      </>
    )
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Export Data' }} />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Data Summary Card */}
        <Animated.View entering={FadeIn.duration(400)} style={styles.summarySection}>
          <View style={[styles.summaryCard, { backgroundColor: colors.card }, shadows.medium]}>
            <View style={styles.summaryHeader}>
              <View style={[styles.summaryIconContainer, { backgroundColor: colors.accentSubtle }]}>
                <Icon name="cloud-download-outline" size={28} color={colors.tint} />
              </View>
              <View style={styles.summaryTextContainer}>
                <ThemedText style={styles.summaryTitle}>Your Data</ThemedText>
                <ThemedText style={[styles.summarySubtitle, { color: colors.textTertiary }]}>
                  {totalItems} total items to export
                </ThemedText>
              </View>
            </View>

            <View style={[styles.summaryDivider, { backgroundColor: colors.borderSubtle }]} />

            <View style={styles.summaryStats}>
              <View style={styles.statItem}>
                <ThemedText style={[styles.statNumber, { color: colors.tint }]}>
                  {dataCounts.recipes}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: colors.textTertiary }]}>
                  Recipes
                </ThemedText>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.borderSubtle }]} />
              <View style={styles.statItem}>
                <ThemedText style={[styles.statNumber, { color: colors.tint }]}>
                  {dataCounts.mealPlans}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: colors.textTertiary }]}>
                  Meal Plans
                </ThemedText>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.borderSubtle }]} />
              <View style={styles.statItem}>
                <ThemedText style={[styles.statNumber, { color: colors.tint }]}>
                  {dataCounts.groceryLists}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: colors.textTertiary }]}>
                  Lists
                </ThemedText>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.borderSubtle }]} />
              <View style={styles.statItem}>
                <ThemedText style={[styles.statNumber, { color: colors.tint }]}>
                  {dataCounts.pantryItems}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: colors.textTertiary }]}>
                  Pantry
                </ThemedText>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Export Options Section */}
        <Animated.View entering={FadeIn.delay(150).duration(300)} style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: colors.textTertiary }]}>
            EXPORT INDIVIDUAL DATA
          </ThemedText>
          <View style={styles.exportList}>
            {EXPORT_OPTIONS.map((option, index) => (
              <ExportRow
                key={option.type}
                option={option}
                count={getCountForType(option.type)}
                isLoading={exportingType === option.type}
                isSuccess={successType === option.type}
                onExport={() => handleExport(option.type)}
                index={index}
              />
            ))}
          </View>
        </Animated.View>

        {/* Export All Section */}
        <Animated.View entering={FadeInUp.delay(500).duration(400)} style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: colors.textTertiary }]}>
            COMPLETE EXPORT
          </ThemedText>
          <View style={[styles.exportAllCard, { backgroundColor: colors.card }, shadows.medium]}>
            <View style={styles.exportAllContent}>
              <View style={[styles.exportAllIcon, { backgroundColor: colors.tint + '20' }]}>
                <Icon name="archive-outline" size={32} color={colors.tint} />
              </View>
              <View style={styles.exportAllText}>
                <ThemedText style={styles.exportAllTitle}>Export Everything</ThemedText>
                <ThemedText style={[styles.exportAllDescription, { color: colors.textTertiary }]}>
                  Download all your data in a single JSON file for backup or migration.
                </ThemedText>
              </View>
            </View>

            <View style={styles.exportAllButton}>
              <ModernButton
                title={
                  exportingType === 'all'
                    ? 'Exporting...'
                    : successType === 'all'
                      ? 'Exported!'
                      : 'Export All Data'
                }
                onPress={() => handleExport('all')}
                variant={successType === 'all' ? 'success' : 'primary'}
                size="large"
                fullWidth
                icon={
                  exportingType === 'all'
                    ? undefined
                    : successType === 'all'
                      ? 'checkmark-circle'
                      : 'download-outline'
                }
                disabled={exportingType === 'all' || totalItems === 0}
                loading={exportingType === 'all'}
              />
            </View>
          </View>
        </Animated.View>

        {/* Info Card */}
        <Animated.View entering={FadeIn.delay(600).duration(300)} style={styles.section}>
          <View style={[styles.infoCard, { backgroundColor: colors.infoBackground }]}>
            <Icon name="information-circle" size={20} color={colors.info} />
            <ThemedText style={[styles.infoText, { color: colors.text }]}>
              Exported files are saved as JSON and can be used for backup purposes or to transfer
              data between devices. Your data is never sent to any external servers during export.
            </ThemedText>
          </View>
        </Animated.View>
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
  },
  loadingText: {
    ...typography.bodyMedium,
  },
  summarySection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  summaryCard: {
    padding: 0,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  summaryIconContainer: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryTextContainer: {
    flex: 1,
  },
  summaryTitle: {
    ...typography.titleLarge,
  },
  summarySubtitle: {
    ...typography.bodyMedium,
    marginTop: 2,
  },
  summaryDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: spacing.lg,
  },
  summaryStats: {
    flexDirection: 'row',
    padding: spacing.lg,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    ...typography.displayMedium,
    fontWeight: '700',
  },
  statLabel: {
    ...typography.caption,
    marginTop: 2,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    marginVertical: spacing.xs,
  },
  section: {
    marginTop: spacing['2xl'],
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    ...typography.labelMedium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
    marginLeft: spacing.sm,
  },
  exportList: {
    gap: spacing.sm,
  },
  exportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radius.xl,
    gap: spacing.md,
  },
  rowDisabled: {
    opacity: 0.5,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowContent: {
    flex: 1,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowTitle: {
    ...typography.titleMedium,
  },
  countBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    minWidth: 28,
    alignItems: 'center',
  },
  countText: {
    ...typography.labelSmall,
    fontWeight: '600',
  },
  rowDescription: {
    ...typography.bodySmall,
    marginTop: 2,
  },
  rowAction: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportAllCard: {
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  exportAllContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.lg,
  },
  exportAllIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exportAllText: {
    flex: 1,
  },
  exportAllTitle: {
    ...typography.titleLarge,
  },
  exportAllDescription: {
    ...typography.bodySmall,
    marginTop: 4,
    lineHeight: 20,
  },
  exportAllButton: {
    padding: spacing.lg,
    paddingTop: 0,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.lg,
    borderRadius: radius.xl,
    gap: spacing.md,
  },
  infoText: {
    flex: 1,
    ...typography.bodySmall,
    lineHeight: 20,
  },
})
