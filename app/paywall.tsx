import React, { useEffect, useState } from 'react'
import { StyleSheet, ScrollView, View, Pressable, ActivityIndicator, Alert } from 'react-native'
import { router } from 'expo-router'

import { ThemedText } from '@/components/Themed'
import { usePurchaseStore } from '@/src/stores/purchaseStore'
import { HapticManager } from '@/src/services/haptics'
import { MaterialIcon, MaterialIconProps } from '@/src/components/ui/Icon'

interface FeatureRowProps {
  icon: MaterialIconProps['name']
  title: string
  description: string
}

function FeatureRow({ icon, title, description }: FeatureRowProps) {
  return (
    <View style={styles.featureRow}>
      <View style={styles.featureIcon}>
        <MaterialIcon name={icon} size={24} color="#FF6B35" />
      </View>
      <View style={styles.featureContent}>
        <ThemedText style={styles.featureTitle}>{title}</ThemedText>
        <ThemedText style={styles.featureDescription}>{description}</ThemedText>
      </View>
    </View>
  )
}

export default function PaywallScreen() {
  const {
    offerings,
    isLoading,
    purchase,
    restorePurchases,
    fetchOfferings,
    isPremium,
    isRevenueCatAvailable,
  } = usePurchaseStore()
  const [selectedPackageIndex, setSelectedPackageIndex] = useState(0)
  const [isPurchasing, setIsPurchasing] = useState(false)

  useEffect(() => {
    fetchOfferings()
  }, [fetchOfferings])

  useEffect(() => {
    if (isPremium) {
      router.back()
    }
  }, [isPremium])

  const currentOffering = offerings?.current
  const packages = currentOffering?.availablePackages || []

  // Show message when running in Expo Go
  if (!isRevenueCatAvailable) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <MaterialIcon name="crown" size={48} color="#FF6B35" />
          </View>
          <ThemedText style={styles.title}>Unlock Premium</ThemedText>
          <ThemedText style={styles.subtitle}>Get unlimited recipe extractions and more</ThemedText>
        </View>

        <View style={styles.features}>
          <FeatureRow
            icon="infinity"
            title="Unlimited Extractions"
            description="Extract recipes from any website or video"
          />
          <FeatureRow
            icon="video"
            title="Video Support"
            description="YouTube, TikTok, and Instagram recipes"
          />
          <FeatureRow
            icon="cloud-sync"
            title="Cloud Backup"
            description="Coming soon: sync across all your devices"
          />
          <FeatureRow
            icon="heart"
            title="Support Development"
            description="Help us build more features"
          />
        </View>

        <View style={styles.devNotice}>
          <MaterialIcon name="information-outline" size={24} color="#f59e0b" />
          <ThemedText style={styles.devNoticeText}>
            Purchases are not available in Expo Go.{'\n'}
            Build a development client to test in-app purchases.
          </ThemedText>
        </View>

        <Pressable style={styles.restoreButton} onPress={() => router.back()}>
          <ThemedText style={styles.restoreButtonText}>Go Back</ThemedText>
        </Pressable>
      </ScrollView>
    )
  }

  const handlePurchase = async () => {
    if (packages.length === 0) return

    const selectedPackage = packages[selectedPackageIndex]
    HapticManager.lightImpact()
    setIsPurchasing(true)

    try {
      await purchase(selectedPackage)
      HapticManager.success()
      router.back()
    } catch (error) {
      HapticManager.error()
      Alert.alert('Purchase Failed', (error as Error).message)
    } finally {
      setIsPurchasing(false)
    }
  }

  const handleRestore = async () => {
    HapticManager.lightImpact()
    setIsPurchasing(true)

    try {
      await restorePurchases()
      Alert.alert('Success', 'Purchases restored successfully.')
    } catch (error) {
      Alert.alert('Restore Failed', (error as Error).message)
    } finally {
      setIsPurchasing(false)
    }
  }

  const formatPrice = (priceString: string, period?: string): string => {
    if (!period) return priceString
    const periodMap: Record<string, string> = {
      P1M: '/month',
      P1Y: '/year',
      P1W: '/week',
    }
    return `${priceString}${periodMap[period] || ''}`
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <MaterialIcon name="crown" size={48} color="#FF6B35" />
        </View>
        <ThemedText style={styles.title}>Unlock Premium</ThemedText>
        <ThemedText style={styles.subtitle}>Get unlimited recipe extractions and more</ThemedText>
      </View>

      {/* Features */}
      <View style={styles.features}>
        <FeatureRow
          icon="infinity"
          title="Unlimited Extractions"
          description="Extract recipes from any website or video"
        />
        <FeatureRow
          icon="video"
          title="Video Support"
          description="YouTube, TikTok, and Instagram recipes"
        />
        <FeatureRow
          icon="cloud-sync"
          title="Cloud Backup"
          description="Coming soon: sync across all your devices"
        />
        <FeatureRow
          icon="heart"
          title="Support Development"
          description="Help us build more features"
        />
      </View>

      {/* Packages */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      ) : packages.length > 0 ? (
        <View style={styles.packages}>
          {packages.map((pkg, index) => {
            const isSelected = index === selectedPackageIndex
            const product = pkg.product

            return (
              <Pressable
                key={pkg.identifier}
                style={[styles.packageCard, isSelected && styles.packageCardSelected]}
                onPress={() => {
                  HapticManager.lightImpact()
                  setSelectedPackageIndex(index)
                }}
              >
                {isSelected && (
                  <View style={styles.selectedBadge}>
                    <MaterialIcon name="check-circle" size={20} color="#fff" />
                  </View>
                )}
                <ThemedText style={styles.packageTitle}>{product.title}</ThemedText>
                <ThemedText style={styles.packagePrice}>
                  {formatPrice(
                    product.priceString,
                    pkg.packageType === 'ANNUAL'
                      ? 'P1Y'
                      : pkg.packageType === 'MONTHLY'
                        ? 'P1M'
                        : undefined
                  )}
                </ThemedText>
                {pkg.packageType === 'ANNUAL' && (
                  <ThemedText style={styles.packageSavings}>Best Value</ThemedText>
                )}
              </Pressable>
            )
          })}
        </View>
      ) : (
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>
            Unable to load subscription options. Please try again later.
          </ThemedText>
        </View>
      )}

      {/* Purchase Button */}
      <Pressable
        style={[styles.purchaseButton, isPurchasing && styles.purchaseButtonDisabled]}
        onPress={handlePurchase}
        disabled={isPurchasing || packages.length === 0}
      >
        {isPurchasing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <ThemedText style={styles.purchaseButtonText}>Continue</ThemedText>
        )}
      </Pressable>

      {/* Restore */}
      <Pressable style={styles.restoreButton} onPress={handleRestore} disabled={isPurchasing}>
        <ThemedText style={styles.restoreButtonText}>Restore Purchases</ThemedText>
      </Pressable>

      {/* Terms */}
      <ThemedText style={styles.terms}>
        Subscription automatically renews unless auto-renew is turned off at least 24 hours before
        the end of the current period. You can manage and cancel your subscriptions in your App
        Store account settings.
      </ThemedText>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FFF5F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  features: {
    marginBottom: 32,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF5F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 14,
    color: '#666',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  packages: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  packageCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  packageCardSelected: {
    borderColor: '#FF6B35',
    backgroundColor: '#FFF5F0',
  },
  selectedBadge: {
    position: 'absolute',
    top: -10,
    right: -10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
  },
  packageTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  packagePrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF6B35',
  },
  packageSavings: {
    fontSize: 11,
    color: '#22c55e',
    fontWeight: '600',
    marginTop: 4,
  },
  errorContainer: {
    padding: 24,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  purchaseButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  purchaseButtonDisabled: {
    opacity: 0.7,
  },
  purchaseButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  restoreButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  restoreButtonText: {
    color: '#666',
    fontSize: 14,
  },
  terms: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    lineHeight: 16,
  },
  devNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  devNoticeText: {
    flex: 1,
    fontSize: 14,
    color: '#92400e',
    lineHeight: 20,
  },
})
