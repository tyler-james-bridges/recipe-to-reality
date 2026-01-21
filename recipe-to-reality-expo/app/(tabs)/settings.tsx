import React from 'react';
import { StyleSheet, ScrollView, View, Pressable, Linking, Switch, Alert, useColorScheme } from 'react-native';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedView, ThemedText } from '@/components/Themed';
import { usePurchaseStore } from '@/src/stores/purchaseStore';
import { useSettingsStore } from '@/src/stores/settingsStore';
import Colors from '@/constants/Colors';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface SettingsRowProps {
  icon: IconName;
  iconColor?: string;
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  danger?: boolean;
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
}: SettingsRowProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <Pressable
      style={[
        styles.row,
        { backgroundColor: colorScheme === 'dark' ? colors.card : '#fff' },
      ]}
      onPress={onPress}
      disabled={!onPress && !rightElement}
    >
      <View style={[
        styles.iconContainer,
        { backgroundColor: danger ? colors.error + '1A' : colors.tint + '1A' },
      ]}>
        <Ionicons
          name={icon}
          size={20}
          color={iconColor || (danger ? colors.error : colors.tint)}
        />
      </View>
      <View style={styles.rowContent}>
        <ThemedText style={[styles.rowTitle, danger && { color: colors.error }]}>
          {title}
        </ThemedText>
        {subtitle && (
          <ThemedText style={styles.rowSubtitle}>{subtitle}</ThemedText>
        )}
      </View>
      {value && (
        <ThemedText style={styles.rowValue}>{value}</ThemedText>
      )}
      {rightElement || (
        onPress && (
          <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
        )
      )}
    </Pressable>
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={styles.section}>
      <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
      <View style={[
        styles.sectionContent,
        {
          backgroundColor: colorScheme === 'dark' ? colors.card : '#fff',
          borderColor: colors.border,
        },
      ]}>
        {React.Children.map(children, (child, index) => (
          <>
            {child}
            {index < React.Children.count(children) - 1 && (
              <View style={[styles.separator, { backgroundColor: colors.border }]} />
            )}
          </>
        ))}
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { isPremium, remainingFreeExtractions, restorePurchases, isRevenueCatAvailable } = usePurchaseStore();
  const { hapticFeedback, setHapticFeedback, clearAllData } = useSettingsStore();

  const handleRestorePurchases = async () => {
    try {
      await restorePurchases();
      Alert.alert('Success', 'Purchases restored successfully.');
    } catch (error) {
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
    }
  };

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
    );
  };

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
      >
        {/* Subscription Status */}
        <SettingsSection title="Subscription">
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
                  title="Restore Purchases"
                  onPress={handleRestorePurchases}
                />
              )}
            </>
          )}
        </SettingsSection>

        {/* AI Configuration */}
        <SettingsSection title="AI Provider">
          <SettingsRow
            icon="flash"
            title="AI Provider"
            subtitle="Configure your AI extraction service"
            onPress={() => router.push('/settings/ai-provider')}
          />
          <SettingsRow
            icon="videocam"
            title="Video Platforms"
            subtitle="Configure TikTok & Instagram API key"
            onPress={() => router.push('/settings/video-platforms')}
          />
        </SettingsSection>

        {/* Preferences */}
        <SettingsSection title="Preferences">
          <SettingsRow
            icon="phone-portrait-outline"
            title="Haptic Feedback"
            rightElement={
              <Switch
                value={hapticFeedback}
                onValueChange={setHapticFeedback}
                trackColor={{ false: '#E5E5EA', true: colors.tint }}
                thumbColor="#fff"
              />
            }
          />
          <SettingsRow
            icon="notifications-outline"
            title="Notifications"
            subtitle="Meal reminders"
            onPress={() => router.push('/settings/notifications')}
          />
        </SettingsSection>

        {/* About */}
        <SettingsSection title="About">
          <SettingsRow
            icon="information-circle-outline"
            title="Version"
            value="1.0.0"
          />
          <SettingsRow
            icon="shield-checkmark-outline"
            title="Privacy Policy"
            onPress={() => Linking.openURL('https://recipetoreality.app/privacy')}
          />
          <SettingsRow
            icon="document-text-outline"
            title="Terms of Service"
            onPress={() => Linking.openURL('https://recipetoreality.app/terms')}
          />
          <SettingsRow
            icon="mail-outline"
            title="Contact Support"
            onPress={() => Linking.openURL('mailto:support@recipetoreality.app')}
          />
        </SettingsSection>

        {/* Data Management */}
        <SettingsSection title="Data">
          <SettingsRow
            icon="download-outline"
            title="Export Data"
            subtitle="Download all your recipes"
            onPress={() => router.push('/settings/export')}
          />
          <SettingsRow
            icon="trash-outline"
            title="Clear All Data"
            danger
            onPress={handleClearData}
          />
        </SettingsSection>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '400',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: -0.08,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionContent: {
    marginHorizontal: 16,
    borderRadius: 10,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rowContent: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 17,
  },
  rowSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  rowValue: {
    fontSize: 17,
    color: '#8E8E93',
    marginRight: 8,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 56, // 12 padding + 32 icon + 12 margin
  },
});
