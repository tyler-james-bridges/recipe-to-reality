import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, SlideInRight } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { ThemedView, ThemedText } from '@/components/Themed';
import { useSettingsStore } from '@/src/stores/settingsStore';
import { AIProviderType } from '@/src/types';
import { saveAPIKey, deleteAPIKey, hasAPIKey, getAPIKey } from '@/src/services/ai';
import AnimatedPressable from '@/src/components/ui/AnimatedPressable';
import ModernButton from '@/src/components/ui/ModernButton';
import Colors, { shadows, radius, spacing, typography } from '@/constants/Colors';

// Provider configuration with URLs and display info
const AI_PROVIDERS: Array<{
  type: AIProviderType;
  displayName: string;
  description: string;
  keyPrefix: string;
  apiKeyUrl: string;
  pricingUrl: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
}> = [
  {
    type: 'openai',
    displayName: 'OpenAI',
    description: 'GPT-4o mini for fast, accurate extraction',
    keyPrefix: 'sk-',
    apiKeyUrl: 'https://platform.openai.com/api-keys',
    pricingUrl: 'https://openai.com/api/pricing/',
    icon: 'sparkles',
    iconColor: '#10A37F',
  },
  {
    type: 'anthropic',
    displayName: 'Claude',
    description: 'Claude 3.5 Haiku for reliable results',
    keyPrefix: 'sk-ant-',
    apiKeyUrl: 'https://console.anthropic.com/settings/keys',
    pricingUrl: 'https://www.anthropic.com/pricing',
    icon: 'chatbubble-ellipses',
    iconColor: '#D97706',
  },
  {
    type: 'google',
    displayName: 'Gemini',
    description: 'Gemini 1.5 Flash for cost-effective extraction',
    keyPrefix: 'AIza',
    apiKeyUrl: 'https://aistudio.google.com/app/apikey',
    pricingUrl: 'https://ai.google.dev/pricing',
    icon: 'diamond',
    iconColor: '#4285F4',
  },
];

interface ProviderRowProps {
  provider: (typeof AI_PROVIDERS)[0];
  isSelected: boolean;
  hasKey: boolean;
  onSelect: () => void;
  index: number;
}

function ProviderRow({ provider, isSelected, hasKey, onSelect, index }: ProviderRowProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const hapticFeedback = useSettingsStore((state) => state.hapticFeedback);

  const handlePress = () => {
    if (hapticFeedback) {
      Haptics.selectionAsync();
    }
    onSelect();
  };

  return (
    <Animated.View entering={FadeInDown.delay(100 + index * 50).duration(300)}>
      <AnimatedPressable
        onPress={handlePress}
        hapticType="selection"
        scaleOnPress={0.98}
        style={[
          styles.providerRow,
          { backgroundColor: colors.card },
          isSelected && { borderColor: colors.tint, borderWidth: 2 },
          !isSelected && { borderColor: colors.borderSubtle, borderWidth: StyleSheet.hairlineWidth },
        ]}
      >
        <View style={[styles.providerIconContainer, { backgroundColor: provider.iconColor + '20' }]}>
          <Ionicons name={provider.icon} size={22} color={provider.iconColor} />
        </View>
        <View style={styles.providerContent}>
          <View style={styles.providerHeader}>
            <ThemedText style={styles.providerName}>{provider.displayName}</ThemedText>
            {hasKey && (
              <View style={[styles.configuredBadge, { backgroundColor: colors.successBackground }]}>
                <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                <ThemedText style={[styles.configuredText, { color: colors.success }]}>
                  Configured
                </ThemedText>
              </View>
            )}
          </View>
          <ThemedText style={[styles.providerDescription, { color: colors.textTertiary }]}>
            {provider.description}
          </ThemedText>
        </View>
        <View style={styles.radioContainer}>
          <View
            style={[
              styles.radioOuter,
              { borderColor: isSelected ? colors.tint : colors.textTertiary },
            ]}
          >
            {isSelected && <View style={[styles.radioInner, { backgroundColor: colors.tint }]} />}
          </View>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

export default function AIProviderSettingsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { aiProvider, setAIProvider } = useSettingsStore();
  const hapticFeedback = useSettingsStore((state) => state.hapticFeedback);

  const [selectedProvider, setSelectedProvider] = useState<AIProviderType>(aiProvider);
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [providerKeyStatus, setProviderKeyStatus] = useState<Record<AIProviderType, boolean>>({
    openai: false,
    anthropic: false,
    google: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasExistingKey, setHasExistingKey] = useState(false);

  // Load key status for all providers
  const loadKeyStatus = useCallback(async () => {
    const status: Record<AIProviderType, boolean> = {
      openai: await hasAPIKey('openai'),
      anthropic: await hasAPIKey('anthropic'),
      google: await hasAPIKey('google'),
    };
    setProviderKeyStatus(status);
    setHasExistingKey(status[selectedProvider]);
  }, [selectedProvider]);

  useEffect(() => {
    loadKeyStatus();
  }, [loadKeyStatus]);

  // Update hasExistingKey when provider changes
  useEffect(() => {
    setHasExistingKey(providerKeyStatus[selectedProvider]);
    setApiKey(''); // Clear input when switching providers
    setShowApiKey(false);
  }, [selectedProvider, providerKeyStatus]);

  const currentProviderConfig = AI_PROVIDERS.find((p) => p.type === selectedProvider)!;

  const handleSelectProvider = (type: AIProviderType) => {
    setSelectedProvider(type);
  };

  const handleSaveKey = async () => {
    if (!apiKey.trim()) {
      Alert.alert('Error', 'Please enter an API key.');
      return;
    }

    setIsSaving(true);
    try {
      await saveAPIKey(selectedProvider, apiKey.trim());
      await setAIProvider(selectedProvider);
      await loadKeyStatus();

      if (hapticFeedback) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      Alert.alert('Success', `${currentProviderConfig.displayName} API key saved successfully.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      if (hapticFeedback) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      Alert.alert('Error', 'Failed to save API key. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteKey = () => {
    Alert.alert(
      'Delete API Key',
      `Are you sure you want to delete your ${currentProviderConfig.displayName} API key?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteAPIKey(selectedProvider);
              await loadKeyStatus();

              if (hapticFeedback) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }

              Alert.alert('Success', 'API key deleted successfully.');
            } catch (error) {
              if (hapticFeedback) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              }
              Alert.alert('Error', 'Failed to delete API key.');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleOpenUrl = (url: string) => {
    if (hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Linking.openURL(url);
  };

  const toggleShowApiKey = () => {
    if (hapticFeedback) {
      Haptics.selectionAsync();
    }
    setShowApiKey(!showApiKey);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'AI Settings',
          headerRight: () =>
            apiKey.trim() ? (
              <AnimatedPressable onPress={handleSaveKey} disabled={isSaving} hapticType="medium">
                <ThemedText
                  style={[
                    styles.saveButton,
                    { color: colors.tint },
                    isSaving && { opacity: 0.5 },
                  ]}
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
          {/* Provider Selection Section */}
          <Animated.View entering={FadeIn.duration(300)} style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: colors.textTertiary }]}>
              SELECT AI PROVIDER
            </ThemedText>
            <ThemedText style={[styles.sectionDescription, { color: colors.textTertiary }]}>
              Choose which AI service to use for recipe extraction.
            </ThemedText>
            <View style={styles.providersContainer}>
              {AI_PROVIDERS.map((provider, index) => (
                <ProviderRow
                  key={provider.type}
                  provider={provider}
                  isSelected={selectedProvider === provider.type}
                  hasKey={providerKeyStatus[provider.type]}
                  onSelect={() => handleSelectProvider(provider.type)}
                  index={index}
                />
              ))}
            </View>
          </Animated.View>

          {/* API Key Entry Section */}
          <Animated.View entering={FadeIn.delay(200).duration(300)} style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: colors.textTertiary }]}>
              {currentProviderConfig.displayName.toUpperCase()} API KEY
            </ThemedText>
            <View style={[styles.inputCard, { backgroundColor: colors.card }, shadows.small]}>
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder={`${currentProviderConfig.keyPrefix}...`}
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
                  <Ionicons
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
          </Animated.View>

          {/* Links Section */}
          <Animated.View entering={FadeIn.delay(300).duration(300)} style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: colors.textTertiary }]}>
              RESOURCES
            </ThemedText>
            <View style={[styles.linksCard, { backgroundColor: colors.card }, shadows.small]}>
              <AnimatedPressable
                onPress={() => handleOpenUrl(currentProviderConfig.apiKeyUrl)}
                hapticType="light"
                style={styles.linkRow}
              >
                <Ionicons name="key-outline" size={20} color={colors.tint} />
                <ThemedText style={[styles.linkText, { color: colors.text }]}>
                  Get an API Key
                </ThemedText>
                <Ionicons name="open-outline" size={18} color={colors.textTertiary} />
              </AnimatedPressable>
              <View style={[styles.linkSeparator, { backgroundColor: colors.borderSubtle }]} />
              <AnimatedPressable
                onPress={() => handleOpenUrl(currentProviderConfig.pricingUrl)}
                hapticType="light"
                style={styles.linkRow}
              >
                <Ionicons name="pricetag-outline" size={20} color={colors.tint} />
                <ThemedText style={[styles.linkText, { color: colors.text }]}>
                  View Pricing
                </ThemedText>
                <Ionicons name="open-outline" size={18} color={colors.textTertiary} />
              </AnimatedPressable>
            </View>
          </Animated.View>

          {/* Delete Key Section */}
          {hasExistingKey && (
            <Animated.View entering={FadeIn.delay(400).duration(300)} style={styles.section}>
              <View
                style={[styles.deleteCard, { backgroundColor: colors.errorBackground }, shadows.small]}
              >
                <AnimatedPressable
                  onPress={handleDeleteKey}
                  disabled={isDeleting}
                  hapticType="medium"
                  style={styles.deleteButton}
                >
                  <Ionicons name="trash-outline" size={20} color={colors.error} />
                  <ThemedText style={[styles.deleteText, { color: colors.error }]}>
                    {isDeleting ? 'Deleting...' : 'Delete API Key'}
                  </ThemedText>
                </AnimatedPressable>
              </View>
            </Animated.View>
          )}

          {/* Info Card */}
          <Animated.View entering={FadeIn.delay(500).duration(300)} style={styles.section}>
            <View style={[styles.infoCard, { backgroundColor: colors.infoBackground }]}>
              <Ionicons name="information-circle" size={20} color={colors.info} />
              <ThemedText style={[styles.infoText, { color: colors.text }]}>
                Recipe extraction uses AI to analyze webpages and video transcripts. API costs are
                typically less than $0.01 per recipe extracted.
              </ThemedText>
            </View>
          </Animated.View>

          {/* Save Button (visible when key entered) */}
          {apiKey.trim() && (
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
  );
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
  providersContainer: {
    gap: spacing.sm,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radius.xl,
    gap: spacing.md,
  },
  providerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  providerContent: {
    flex: 1,
  },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  providerName: {
    ...typography.titleMedium,
  },
  providerDescription: {
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
  radioContainer: {
    marginLeft: spacing.sm,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
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
});
