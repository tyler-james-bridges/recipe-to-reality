import React, { useState, useEffect, useCallback } from 'react'
import {
  StyleSheet,
  ScrollView,
  View,
  TextInput,
  Linking,
  Alert,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { Stack, router } from 'expo-router'
import { Icon } from '@/src/components/ui/Icon'
import Animated, { FadeIn, FadeInDown, SlideInRight } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'

import { ThemedView, ThemedText } from '@/components/Themed'
import { useSettingsStore } from '@/src/stores/settingsStore'
import {
  saveSupadataAPIKey,
  hasSupadataAPIKey,
  deleteSupadataAPIKey,
  testSupadataAPIKey,
} from '@/src/services/video/videoTranscript'
import AnimatedPressable from '@/src/components/ui/AnimatedPressable'
import ModernButton from '@/src/components/ui/ModernButton'
import Colors, { shadows, radius, spacing, typography } from '@/constants/Colors'

// Platform configuration
const VIDEO_PLATFORMS = [
  {
    id: 'youtube',
    name: 'YouTube',
    description: 'Free transcript extraction',
    icon: 'logo-youtube' as const,
    iconColor: '#FF0000',
    requiresKey: false,
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    description: 'Requires Supadata API key',
    icon: 'musical-notes' as const,
    iconColor: '#000000',
    requiresKey: true,
  },
  {
    id: 'instagram',
    name: 'Instagram',
    description: 'Requires Supadata API key',
    icon: 'logo-instagram' as const,
    iconColor: '#E4405F',
    requiresKey: true,
  },
]

// Minimum API key length for validation
const MIN_API_KEY_LENGTH = 10

interface PlatformRowProps {
  platform: (typeof VIDEO_PLATFORMS)[0]
  hasSupadataKey: boolean
  index: number
}

function PlatformRow({ platform, hasSupadataKey, index }: PlatformRowProps) {
  const colorScheme = useColorScheme()
  const colors = Colors[colorScheme ?? 'light']

  const isConfigured = platform.requiresKey ? hasSupadataKey : true

  return (
    <Animated.View entering={FadeInDown.delay(100 + index * 50).duration(300)}>
      <View
        style={[
          styles.platformRow,
          { backgroundColor: colors.card },
          { borderColor: colors.borderSubtle, borderWidth: StyleSheet.hairlineWidth },
        ]}
      >
        <View
          style={[
            styles.platformIconContainer,
            {
              backgroundColor:
                platform.iconColor === '#000000'
                  ? colorScheme === 'dark'
                    ? '#FFFFFF20'
                    : '#00000020'
                  : platform.iconColor + '20',
            },
          ]}
        >
          <Icon
            name={platform.icon}
            size={22}
            color={
              platform.iconColor === '#000000'
                ? colorScheme === 'dark'
                  ? '#FFFFFF'
                  : '#000000'
                : platform.iconColor
            }
          />
        </View>
        <View style={styles.platformContent}>
          <View style={styles.platformHeader}>
            <ThemedText style={styles.platformName}>{platform.name}</ThemedText>
            {isConfigured && (
              <View style={[styles.configuredBadge, { backgroundColor: colors.successBackground }]}>
                <Icon name="checkmark-circle" size={14} color={colors.success} />
                <ThemedText style={[styles.configuredText, { color: colors.success }]}>
                  Ready
                </ThemedText>
              </View>
            )}
          </View>
          <ThemedText style={[styles.platformDescription, { color: colors.textTertiary }]}>
            {platform.description}
          </ThemedText>
        </View>
        <Icon
          name={isConfigured ? 'checkmark-circle' : 'ellipse-outline'}
          size={24}
          color={isConfigured ? colors.success : colors.textTertiary}
        />
      </View>
    </Animated.View>
  )
}

export default function VideoPlatformsSettingsScreen() {
  const colorScheme = useColorScheme()
  const colors = Colors[colorScheme ?? 'light']
  const hapticFeedback = useSettingsStore((state) => state.hapticFeedback)

  const [apiKey, setApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [hasKey, setHasKey] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [validationStatus, setValidationStatus] = useState<'none' | 'valid' | 'invalid'>('none')
  const [validationError, setValidationError] = useState<string | null>(null)

  // Load key status
  const loadKeyStatus = useCallback(async () => {
    const keyExists = await hasSupadataAPIKey()
    setHasKey(keyExists)
  }, [])

  useEffect(() => {
    loadKeyStatus()
  }, [loadKeyStatus])

  // Reset validation status when API key changes
  useEffect(() => {
    setValidationStatus('none')
    setValidationError(null)
  }, [apiKey])

  // Validate API key format (basic check before sending)
  const isApiKeyValid = (key: string): boolean => {
    const trimmed = key.trim()
    return trimmed.length >= MIN_API_KEY_LENGTH
  }

  // Get input border color based on validation status
  const getInputBorderColor = (): string | undefined => {
    if (validationStatus === 'valid') {
      return colors.success
    }
    if (validationStatus === 'invalid') {
      return colors.error
    }
    return undefined
  }

  const handleTestKey = async () => {
    const trimmedKey = apiKey.trim()

    if (!isApiKeyValid(trimmedKey)) {
      if (hapticFeedback) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      }
      Alert.alert('Invalid Key', 'API key must be at least 10 characters long.')
      return
    }

    setIsTesting(true)
    setValidationStatus('none')
    setValidationError(null)

    try {
      const result = await testSupadataAPIKey(trimmedKey)

      if (result.valid) {
        setValidationStatus('valid')
        if (hapticFeedback) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        }
      } else {
        setValidationStatus('invalid')
        setValidationError(result.error || 'Invalid API key')
        if (hapticFeedback) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
        }
      }
    } catch (error) {
      setValidationStatus('invalid')
      setValidationError('Could not validate key. Check your connection.')
      if (hapticFeedback) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      }
    } finally {
      setIsTesting(false)
    }
  }

  const handleSaveKey = async () => {
    const trimmedKey = apiKey.trim()

    if (!isApiKeyValid(trimmedKey)) {
      if (hapticFeedback) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      }
      Alert.alert('Invalid Key', 'API key must be at least 10 characters long.')
      return
    }

    setIsSaving(true)
    try {
      await saveSupadataAPIKey(trimmedKey)
      await loadKeyStatus()

      if (hapticFeedback) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      }

      Alert.alert('Success', 'Supadata API key saved successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ])
    } catch (error) {
      if (hapticFeedback) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      Alert.alert('Error', `Failed to save API key: ${errorMessage}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteKey = () => {
    Alert.alert(
      'Delete API Key',
      'Are you sure you want to delete your Supadata API key? TikTok and Instagram transcript extraction will be disabled.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true)
            try {
              await deleteSupadataAPIKey()
              await loadKeyStatus()
              setApiKey('')
              setValidationStatus('none')
              setValidationError(null)

              if (hapticFeedback) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
              }

              Alert.alert('Success', 'API key deleted successfully.')
            } catch (error) {
              if (hapticFeedback) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
              }
              Alert.alert('Error', 'Failed to delete API key.')
            } finally {
              setIsDeleting(false)
            }
          },
        },
      ]
    )
  }

  const handleOpenUrl = (url: string) => {
    if (hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }
    Linking.openURL(url)
  }

  const toggleShowApiKey = () => {
    if (hapticFeedback) {
      Haptics.selectionAsync()
    }
    setShowApiKey(!showApiKey)
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Video Platforms',
          headerRight: () =>
            apiKey.trim() && isApiKeyValid(apiKey) ? (
              <AnimatedPressable onPress={handleSaveKey} disabled={isSaving} hapticType="medium">
                <ThemedText
                  style={[styles.saveButton, { color: colors.tint }, isSaving && { opacity: 0.5 }]}
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </ThemedText>
              </AnimatedPressable>
            ) : null,
        }}
      />
      <KeyboardAvoidingView
        behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          style={[styles.container, { backgroundColor: colors.background }]}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Supported Platforms Section */}
          <Animated.View entering={FadeIn.duration(300)} style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: colors.textTertiary }]}>
              SUPPORTED PLATFORMS
            </ThemedText>
            <ThemedText style={[styles.sectionDescription, { color: colors.textTertiary }]}>
              Extract recipes from cooking videos on these platforms.
            </ThemedText>
            <View style={styles.platformsContainer}>
              {VIDEO_PLATFORMS.map((platform, index) => (
                <PlatformRow
                  key={platform.id}
                  platform={platform}
                  hasSupadataKey={hasKey}
                  index={index}
                />
              ))}
            </View>
          </Animated.View>

          {/* Supadata API Key Section */}
          <Animated.View entering={FadeIn.delay(200).duration(300)} style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: colors.textTertiary }]}>
              SUPADATA API KEY
            </ThemedText>
            <ThemedText style={[styles.sectionDescription, { color: colors.textTertiary }]}>
              Required for TikTok and Instagram video transcripts.
            </ThemedText>
            <View
              style={[
                styles.inputCard,
                { backgroundColor: colors.card },
                shadows.small,
                getInputBorderColor() && {
                  borderWidth: 2,
                  borderColor: getInputBorderColor(),
                },
              ]}
            >
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Enter API key..."
                  placeholderTextColor={colors.textTertiary}
                  value={apiKey}
                  onChangeText={setApiKey}
                  secureTextEntry={!showApiKey}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="off"
                />
                <AnimatedPressable
                  onPress={toggleShowApiKey}
                  hapticType="selection"
                  style={styles.eyeButton}
                >
                  <Icon
                    name={showApiKey ? 'eye-off' : 'eye'}
                    size={22}
                    color={colors.textTertiary}
                  />
                </AnimatedPressable>
              </View>
            </View>
            <ThemedText style={[styles.inputHint, { color: colors.textTertiary }]}>
              Your key is stored securely using expo-secure-store.
            </ThemedText>

            {/* Test API Key Button */}
            {apiKey.trim().length > 0 && (
              <Animated.View entering={FadeIn.duration(200)} style={styles.testButtonContainer}>
                <AnimatedPressable
                  onPress={handleTestKey}
                  disabled={isTesting || !isApiKeyValid(apiKey)}
                  hapticType="medium"
                  style={[
                    styles.testButton,
                    { backgroundColor: colors.card, borderColor: colors.borderSubtle },
                    (isTesting || !isApiKeyValid(apiKey)) && { opacity: 0.5 },
                  ]}
                >
                  {isTesting ? (
                    <ActivityIndicator size="small" color={colors.tint} />
                  ) : (
                    <Icon name="shield-checkmark-outline" size={18} color={colors.tint} />
                  )}
                  <ThemedText style={[styles.testButtonText, { color: colors.tint }]}>
                    {isTesting ? 'Testing...' : 'Test API Key'}
                  </ThemedText>
                </AnimatedPressable>
              </Animated.View>
            )}

            {/* Validation Status */}
            {validationStatus === 'valid' && (
              <Animated.View
                entering={FadeIn.duration(200)}
                style={[styles.statusCard, { backgroundColor: colors.successBackground }]}
              >
                <Icon name="checkmark-circle" size={20} color={colors.success} />
                <ThemedText style={[styles.statusText, { color: colors.success }]}>
                  API key is valid
                </ThemedText>
              </Animated.View>
            )}

            {validationStatus === 'invalid' && (
              <Animated.View
                entering={FadeIn.duration(200)}
                style={[styles.statusCard, { backgroundColor: colors.errorBackground }]}
              >
                <Icon name="close-circle" size={20} color={colors.error} />
                <View style={styles.statusTextContainer}>
                  <ThemedText style={[styles.statusText, { color: colors.error }]}>
                    {validationError || 'Invalid API key'}
                  </ThemedText>
                </View>
              </Animated.View>
            )}

            {/* Existing key status indicator */}
            {hasKey && !apiKey.trim() && validationStatus === 'none' && (
              <Animated.View
                entering={FadeIn.duration(200)}
                style={[styles.statusCard, { backgroundColor: colors.successBackground }]}
              >
                <Icon name="checkmark-circle" size={20} color={colors.success} />
                <ThemedText style={[styles.statusText, { color: colors.success }]}>
                  API key configured
                </ThemedText>
              </Animated.View>
            )}
          </Animated.View>

          {/* Links Section */}
          <Animated.View entering={FadeIn.delay(300).duration(300)} style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: colors.textTertiary }]}>
              RESOURCES
            </ThemedText>
            <View style={[styles.linksCard, { backgroundColor: colors.card }, shadows.small]}>
              <AnimatedPressable
                onPress={() => handleOpenUrl('https://supadata.ai')}
                hapticType="light"
                style={styles.linkRow}
              >
                <Icon name="key-outline" size={20} color={colors.tint} />
                <ThemedText style={[styles.linkText, { color: colors.text }]}>
                  Get a Free API Key
                </ThemedText>
                <Icon name="open-outline" size={18} color={colors.textTertiary} />
              </AnimatedPressable>
              <View style={[styles.linkSeparator, { backgroundColor: colors.borderSubtle }]} />
              <AnimatedPressable
                onPress={() => handleOpenUrl('https://supadata.ai/pricing')}
                hapticType="light"
                style={styles.linkRow}
              >
                <Icon name="pricetag-outline" size={20} color={colors.tint} />
                <ThemedText style={[styles.linkText, { color: colors.text }]}>
                  View Pricing
                </ThemedText>
                <Icon name="open-outline" size={18} color={colors.textTertiary} />
              </AnimatedPressable>
            </View>
          </Animated.View>

          {/* Delete Key Section */}
          {hasKey && (
            <Animated.View entering={FadeIn.delay(400).duration(300)} style={styles.section}>
              <View
                style={[
                  styles.deleteCard,
                  { backgroundColor: colors.errorBackground },
                  shadows.small,
                ]}
              >
                <AnimatedPressable
                  onPress={handleDeleteKey}
                  disabled={isDeleting}
                  hapticType="medium"
                  style={styles.deleteButton}
                >
                  <Icon name="trash-outline" size={20} color={colors.error} />
                  <ThemedText style={[styles.deleteText, { color: colors.error }]}>
                    {isDeleting ? 'Deleting...' : 'Remove API Key'}
                  </ThemedText>
                </AnimatedPressable>
              </View>
            </Animated.View>
          )}

          {/* Info Card */}
          <Animated.View entering={FadeIn.delay(500).duration(300)} style={styles.section}>
            <View style={[styles.infoCard, { backgroundColor: colors.infoBackground }]}>
              <Icon name="information-circle" size={20} color={colors.info} />
              <ThemedText style={[styles.infoText, { color: colors.text }]}>
                Supadata extracts transcripts from TikTok and Instagram videos. YouTube transcripts
                are free and do not require an API key. Supadata offers 100 free transcript requests
                per month.
              </ThemedText>
            </View>
          </Animated.View>

          {/* Save Button (visible when key entered) */}
          {apiKey.trim() && isApiKeyValid(apiKey) && (
            <Animated.View entering={SlideInRight.duration(300)} style={styles.saveSection}>
              <ModernButton
                title={isSaving ? 'Saving...' : 'Save API Key'}
                onPress={handleSaveKey}
                variant="primary"
                size="large"
                fullWidth
                icon="checkmark-circle"
                disabled={isSaving}
                loading={isSaving}
              />
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
  section: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    ...typography.labelMedium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
    marginLeft: spacing.sm,
  },
  sectionDescription: {
    ...typography.bodySmall,
    marginBottom: spacing.md,
    marginLeft: spacing.sm,
  },
  platformsContainer: {
    gap: spacing.sm,
  },
  platformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radius.xl,
    gap: spacing.md,
  },
  platformIconContainer: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  platformContent: {
    flex: 1,
  },
  platformHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  platformName: {
    ...typography.titleMedium,
  },
  platformDescription: {
    ...typography.bodySmall,
    marginTop: 2,
  },
  configuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    gap: 4,
  },
  configuredText: {
    ...typography.labelSmall,
  },
  inputCard: {
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  input: {
    flex: 1,
    ...typography.bodyLarge,
    paddingVertical: spacing.md,
  },
  eyeButton: {
    padding: spacing.sm,
    marginRight: -spacing.sm,
  },
  inputHint: {
    ...typography.caption,
    marginTop: spacing.sm,
    marginLeft: spacing.sm,
  },
  testButtonContainer: {
    marginTop: spacing.md,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  testButtonText: {
    ...typography.labelMedium,
    fontWeight: '600',
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  statusText: {
    ...typography.labelMedium,
  },
  statusTextContainer: {
    flex: 1,
  },
  linksCard: {
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  linkText: {
    flex: 1,
    ...typography.bodyLarge,
  },
  linkSeparator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.lg + 20 + spacing.md, // icon size + gap
  },
  deleteCard: {
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  deleteText: {
    ...typography.labelLarge,
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
  saveSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing['2xl'],
    paddingBottom: spacing.lg,
  },
  saveButton: {
    ...typography.labelLarge,
    fontWeight: '600',
  },
})
