import React from 'react'
import { StyleSheet, ScrollView, View, Switch, Linking, Alert, useColorScheme } from 'react-native'
import { router, Stack, Href } from 'expo-router'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { File, Paths } from 'expo-file-system'
import { shareAsync, isAvailableAsync } from 'expo-sharing'

import { ThemedView, ThemedText } from '@/components/Themed'
import { usePurchaseStore } from '@/src/stores/purchaseStore'
import { useSettingsStore } from '@/src/stores/settingsStore'
import { useRecipeStore } from '@/src/stores/recipeStore'
import { useMealPlanStore } from '@/src/stores/mealPlanStore'
import { useGroceryStore } from '@/src/stores/groceryStore'
import { usePantryStore } from '@/src/stores/pantryStore'
import AnimatedPressable from '@/src/components/ui/AnimatedPressable'
import { Icon, IconProps } from '@/src/components/ui/Icon'
import Colors, { shadows, radius, spacing, typography, gradients } from '@/constants/Colors'

type IconName = IconProps['name']

interface SettingsRowProps {
  icon: IconName
  iconColor?: string
  title: string
  subtitle?: string
  value?: string
  onPress?: () => void
  rightElement?: React.ReactNode
  danger?: boolean
  index?: number
}

function SettingsRow({
  icon,
  iconColor,
  title,
  subtitle,
  value,
  onPress,
  rightElement,
  danger,
  index = 0,
}: SettingsRowProps) {
  const colorScheme = useColorScheme()
  const colors = Colors[colorScheme ?? 'light']

  const bgColor = danger
    ? colors.errorBackground
    : iconColor
      ? iconColor + '20'
      : colors.accentSubtle
  const iconColorFinal = danger ? colors.error : iconColor || colors.tint

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={!onPress && !rightElement}
      hapticType="selection"
      scaleOnPress={0.99}
      style={styles.row}
    >
      <View style={[styles.iconContainer, { backgroundColor: bgColor }]}>
        <Icon name={icon} size={18} color={iconColorFinal} />
      </View>
      <View style={styles.rowContent}>
        <ThemedText style={[styles.rowTitle, danger && { color: colors.error }]}>
          {title}
        </ThemedText>
        {subtitle && (
          <ThemedText style={[styles.rowSubtitle, { color: colors.textTertiary }]}>
            {subtitle}
          </ThemedText>
        )}
      </View>
      {value && (
        <ThemedText style={[styles.rowValue, { color: colors.textTertiary }]}>{value}</ThemedText>
      )}
      {rightElement ||
        (onPress && <Icon name="chevron-forward" size={18} color={colors.textTertiary} />)}
    </AnimatedPressable>
  )
}

interface SettingsSectionProps {
  title: string
  children: React.ReactNode
  index?: number
}

function SettingsSection({ title, children, index = 0 }: SettingsSectionProps) {
  const colorScheme = useColorScheme()
  const colors = Colors[colorScheme ?? 'light']

  return (
    <Animated.View entering={FadeIn.delay(100 * index).duration(300)} style={styles.section}>
      <ThemedText style={[styles.sectionTitle, { color: colors.textTertiary }]}>{title}</ThemedText>
      <View style={[styles.sectionContent, { backgroundColor: colors.card }, shadows.small]}>
        {React.Children.map(children, (child, childIndex) => (
          <>
            {child}
            {childIndex < React.Children.count(children) - 1 && (
              <View style={[styles.separator, { backgroundColor: colors.borderSubtle }]} />
            )}
          </>
        ))}
      </View>
    </Animated.View>
  )
}

export default function SettingsScreen() {
  const colorScheme = useColorScheme()
  const colors = Colors[colorScheme ?? 'light']
  const themeGradients = gradients[colorScheme ?? 'light']
  const { isPremium, remainingFreeExtractions, restorePurchases, isRevenueCatAvailable } =
    usePurchaseStore()
  const { hapticFeedback, setHapticFeedback, clearAllData } = useSettingsStore()

  // Data stores for export
  const { loadRecipes } = useRecipeStore()
  const { loadMealPlans } = useMealPlanStore()
  const { loadAllLists } = useGroceryStore()
  const { loadItems: loadPantryItems } = usePantryStore()

  const handleRestorePurchases = async () => {
    try {
      await restorePurchases()
      Alert.alert('Success', 'Purchases restored successfully.')
    } catch (error) {
      Alert.alert('Error', 'Failed to restore purchases. Please try again.')
    }
  }

  const handleExportData = () => {
    Alert.alert(
      'Export All Data',
      'This will create a JSON backup of all your recipes, meal plans, grocery lists, and pantry items.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: async () => {
            try {
              // Check if sharing is available
              const isSharingAvailable = await isAvailableAsync()
              if (!isSharingAvailable) {
                Alert.alert('Error', 'Sharing is not available on this device.')
                return
              }

              // Load all data from stores
              await Promise.all([loadRecipes(), loadMealPlans(), loadAllLists(), loadPantryItems()])

              // Get current state from stores
              const recipes = useRecipeStore.getState().recipes
              const mealPlans = useMealPlanStore.getState().mealPlans
              const lists = useGroceryStore.getState().lists
              const pantryItems = usePantryStore.getState().items

              // Build export data
              const timestamp = new Date().toISOString()
              const exportData = {
                exportedAt: timestamp,
                appVersion: '1.0.0',
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

              const jsonString = JSON.stringify(exportData, null, 2)
              const date = new Date().toISOString().split('T')[0]
              const fileName = `recipe-to-reality-complete-export-${date}.json`

              // Create file in cache directory
              const file = new File(Paths.cache, fileName)
              file.write(jsonString)

              // Share the file
              await shareAsync(file.uri, {
                mimeType: 'application/json',
                dialogTitle: 'Export All Data',
                UTI: 'public.json',
              })
            } catch (error) {
              console.error('Export error:', error)
              Alert.alert('Export Failed', 'Unable to export data. Please try again.')
            }
          },
        },
      ]
    )
  }

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will delete all your recipes, pantry items, meal plans, and grocery lists. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Data',
          style: 'destructive',
          onPress: () => clearAllData(),
        },
      ]
    )
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Settings',
          headerLargeTitle: true,
        }}
      />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* App Header Card */}
        <Animated.View entering={FadeIn.duration(400)} style={[styles.headerCard, shadows.medium]}>
          <LinearGradient
            colors={themeGradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={styles.headerIcon}>
              <Icon name="restaurant" size={32} color="#FFFFFF" />
            </View>
            <ThemedText style={styles.headerTitle}>Recipe to Reality</ThemedText>
            <ThemedText style={styles.headerVersion}>Version 1.0.0</ThemedText>
          </LinearGradient>
        </Animated.View>

        {/* Subscription Status */}
        <SettingsSection title="Subscription" index={0}>
          {isPremium ? (
            <SettingsRow
              icon="star"
              iconColor="#FFD700"
              title="Premium Active"
              subtitle="Unlimited recipe extractions"
            />
          ) : (
            <>
              <SettingsRow
                icon="sparkles"
                iconColor="#FF9500"
                title="Upgrade to Premium"
                subtitle={
                  isRevenueCatAvailable
                    ? `${remainingFreeExtractions} free extractions remaining`
                    : 'Not available in Expo Go'
                }
                onPress={() => router.push('/paywall')}
              />
              {isRevenueCatAvailable && (
                <SettingsRow
                  icon="arrow-down-circle-outline"
                  iconColor="#007AFF"
                  title="Restore Purchases"
                  onPress={handleRestorePurchases}
                />
              )}
            </>
          )}
        </SettingsSection>

        {/* Video Configuration */}
        <SettingsSection title="Video Platforms" index={1}>
          <SettingsRow
            icon="videocam"
            iconColor="#FF2D55"
            title="Video Platforms"
            subtitle="Configure TikTok & Instagram API key"
            onPress={() => router.push('/settings/video-platforms' as Href)}
          />
        </SettingsSection>

        {/* Preferences */}
        <SettingsSection title="Preferences" index={2}>
          <SettingsRow
            icon="hand-left"
            iconColor="#007AFF"
            title="Haptic Feedback"
            subtitle="Vibration feedback for interactions"
            rightElement={
              <Switch
                value={hapticFeedback}
                onValueChange={setHapticFeedback}
                trackColor={{ false: colors.skeleton, true: colors.tint }}
                thumbColor="#FFFFFF"
              />
            }
          />
          <SettingsRow
            icon="notifications"
            iconColor="#FF9500"
            title="Notifications"
            subtitle="Meal reminders"
            onPress={() => router.push('/settings/notifications' as Href)}
          />
        </SettingsSection>

        {/* About */}
        <SettingsSection title="About" index={3}>
          <SettingsRow
            icon="information-circle"
            iconColor="#8E8E93"
            title="Version"
            value="1.0.0"
          />
          <SettingsRow
            icon="shield-checkmark"
            iconColor="#34C759"
            title="Privacy Policy"
            onPress={() => Linking.openURL('https://recipetoreality.app/privacy')}
          />
          <SettingsRow
            icon="document-text"
            iconColor="#5856D6"
            title="Terms of Service"
            onPress={() => Linking.openURL('https://recipetoreality.app/terms')}
          />
          <SettingsRow
            icon="mail"
            iconColor="#FF3B30"
            title="Contact Support"
            onPress={() => Linking.openURL('mailto:support@recipetoreality.app')}
          />
        </SettingsSection>

        {/* Data Management */}
        <SettingsSection title="Data" index={4}>
          <SettingsRow
            icon="download"
            iconColor="#34C759"
            title="Export Data"
            subtitle="Download all your recipes"
            onPress={handleExportData}
          />
          <SettingsRow icon="trash" title="Clear All Data" danger onPress={handleClearData} />
        </SettingsSection>

        {/* Footer */}
        <Animated.View entering={FadeIn.delay(600).duration(300)} style={styles.footer}>
          <ThemedText style={[styles.footerText, { color: colors.textTertiary }]}>
            Made with love for home cooks
          </ThemedText>
          <ThemedText style={[styles.footerCopyright, { color: colors.textTertiary }]}>
            2026 Recipe to Reality
          </ThemedText>
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
    paddingBottom: 120,
  },
  headerCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radius['2xl'],
    overflow: 'hidden',
  },
  headerGradient: {
    padding: spacing['2xl'],
    alignItems: 'center',
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  headerTitle: {
    ...typography.titleLarge,
    color: '#FFFFFF',
    marginBottom: spacing.xs,
  },
  headerVersion: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.8)',
  },
  section: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    ...typography.labelMedium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginLeft: spacing.sm,
  },
  sectionContent: {
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowContent: {
    flex: 1,
  },
  rowTitle: {
    ...typography.bodyLarge,
  },
  rowSubtitle: {
    ...typography.caption,
    marginTop: 2,
  },
  rowValue: {
    ...typography.bodyMedium,
    marginRight: spacing.sm,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 32 + spacing.lg + spacing.md, // icon width + padding + gap
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
    gap: spacing.xs,
  },
  footerText: {
    ...typography.bodySmall,
  },
  footerCopyright: {
    ...typography.caption,
  },
})
