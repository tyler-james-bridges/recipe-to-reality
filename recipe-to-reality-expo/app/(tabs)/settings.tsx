import React from 'react';
import { StyleSheet, ScrollView, View, Pressable, Linking, Switch, Alert } from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { ThemedView, ThemedText } from '@/components/Themed';
import { usePurchaseStore } from '@/src/stores/purchaseStore';
import { useSettingsStore } from '@/src/stores/settingsStore';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface SettingsRowProps {
  icon: IconName;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  danger?: boolean;
}

function SettingsRow({ icon, title, subtitle, onPress, rightElement, danger }: SettingsRowProps) {
  return (
    <Pressable
      style={styles.row}
      onPress={onPress}
      disabled={!onPress && !rightElement}
    >
      <View style={[styles.iconContainer, danger && styles.iconContainerDanger]}>
        <MaterialCommunityIcons
          name={icon}
          size={22}
          color={danger ? '#ef4444' : '#FF6B35'}
        />
      </View>
      <View style={styles.rowContent}>
        <ThemedText style={[styles.rowTitle, danger && styles.rowTitleDanger]}>
          {title}
        </ThemedText>
        {subtitle && (
          <ThemedText style={styles.rowSubtitle}>{subtitle}</ThemedText>
        )}
      </View>
      {rightElement || (
        onPress && (
          <MaterialCommunityIcons name="chevron-right" size={24} color="#999" />
        )
      )}
    </Pressable>
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

export default function SettingsScreen() {
  const { isPremium, remainingFreeExtractions, restorePurchases } = usePurchaseStore();
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Subscription Status */}
      <SettingsSection title="Subscription">
        {isPremium ? (
          <SettingsRow
            icon="crown"
            title="Premium Active"
            subtitle="Unlimited recipe extractions"
          />
        ) : (
          <>
            <SettingsRow
              icon="star-outline"
              title="Upgrade to Premium"
              subtitle={`${remainingFreeExtractions} free extractions remaining`}
              onPress={() => router.push('/paywall')}
            />
            <SettingsRow
              icon="restore"
              title="Restore Purchases"
              onPress={handleRestorePurchases}
            />
          </>
        )}
      </SettingsSection>

      {/* AI Configuration */}
      <SettingsSection title="AI Provider">
        <SettingsRow
          icon="brain"
          title="AI Provider"
          subtitle="Configure your AI extraction service"
          onPress={() => router.push('/settings/ai-provider')}
        />
        <SettingsRow
          icon="video"
          title="Video Platforms"
          subtitle="Configure TikTok & Instagram API key"
          onPress={() => router.push('/settings/video-platforms')}
        />
      </SettingsSection>

      {/* Preferences */}
      <SettingsSection title="Preferences">
        <SettingsRow
          icon="vibrate"
          title="Haptic Feedback"
          rightElement={
            <Switch
              value={hapticFeedback}
              onValueChange={setHapticFeedback}
              trackColor={{ false: '#e0e0e0', true: '#FF6B35' }}
              thumbColor="#fff"
            />
          }
        />
        <SettingsRow
          icon="bell-outline"
          title="Notifications"
          subtitle="Meal reminders"
          onPress={() => router.push('/settings/notifications')}
        />
      </SettingsSection>

      {/* About */}
      <SettingsSection title="About">
        <SettingsRow
          icon="information-outline"
          title="Version"
          subtitle="1.0.0"
        />
        <SettingsRow
          icon="shield-check-outline"
          title="Privacy Policy"
          onPress={() => Linking.openURL('https://recipetoreality.app/privacy')}
        />
        <SettingsRow
          icon="file-document-outline"
          title="Terms of Service"
          onPress={() => Linking.openURL('https://recipetoreality.app/terms')}
        />
        <SettingsRow
          icon="email-outline"
          title="Contact Support"
          onPress={() => Linking.openURL('mailto:support@recipetoreality.app')}
        />
      </SettingsSection>

      {/* Danger Zone */}
      <SettingsSection title="Data">
        <SettingsRow
          icon="download"
          title="Export Data"
          subtitle="Download all your recipes"
          onPress={() => router.push('/settings/export')}
        />
        <SettingsRow
          icon="delete-outline"
          title="Clear All Data"
          danger
          onPress={handleClearData}
        />
      </SettingsSection>
    </ScrollView>
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
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionContent: {
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#e0e0e0',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FFF5F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconContainerDanger: {
    backgroundColor: '#fef2f2',
  },
  rowContent: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  rowTitleDanger: {
    color: '#ef4444',
  },
  rowSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
});
