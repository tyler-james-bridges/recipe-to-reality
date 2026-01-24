import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Switch,
  Linking,
  Platform,
  useColorScheme,
} from 'react-native';
import { Stack } from 'expo-router';
import { Icon } from '@/src/components/ui/Icon';
import Animated, { FadeIn, FadeInDown, SlideInRight } from 'react-native-reanimated';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { ThemedText } from '@/components/Themed';
import { useSettingsStore } from '@/src/stores/settingsStore';
import AnimatedPressable from '@/src/components/ui/AnimatedPressable';
import ModernButton from '@/src/components/ui/ModernButton';
import Colors, { shadows, radius, spacing, typography } from '@/constants/Colors';

type PermissionStatus = 'granted' | 'denied' | 'undetermined';

export default function NotificationsSettingsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const {
    notificationsEnabled,
    setNotificationsEnabled,
    reminderTimeHour,
    reminderTimeMinute,
    setReminderTime,
    hapticFeedback,
  } = useSettingsStore();

  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('undetermined');
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Create a Date object from the stored hour/minute for the picker
  const reminderDate = new Date();
  reminderDate.setHours(reminderTimeHour);
  reminderDate.setMinutes(reminderTimeMinute);
  reminderDate.setSeconds(0);

  // Check current permission status
  const checkPermissionStatus = useCallback(async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setPermissionStatus(status as PermissionStatus);
  }, []);

  useEffect(() => {
    checkPermissionStatus();
  }, [checkPermissionStatus]);

  // Request notification permissions
  const requestPermissions = async () => {
    if (hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setIsRequestingPermission(true);
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      setPermissionStatus(status as PermissionStatus);

      if (status === 'granted') {
        if (hapticFeedback) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else {
        if (hapticFeedback) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      if (hapticFeedback) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setIsRequestingPermission(false);
    }
  };

  // Open system settings
  const openSystemSettings = () => {
    if (hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Linking.openSettings();
  };

  // Handle toggle change
  const handleToggleNotifications = async (enabled: boolean) => {
    if (hapticFeedback) {
      Haptics.selectionAsync();
    }

    if (enabled && permissionStatus !== 'granted') {
      // Request permissions if trying to enable and not granted
      await requestPermissions();
      // Only enable if permissions were granted
      const { status } = await Notifications.getPermissionsAsync();
      if (status === 'granted') {
        await setNotificationsEnabled(true);
      }
    } else {
      await setNotificationsEnabled(enabled);
    }
  };

  // Handle time picker change
  const handleTimeChange = async (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (process.env.EXPO_OS === 'android') {
      setShowTimePicker(false);
    }

    if (event.type === 'set' && selectedDate) {
      if (hapticFeedback) {
        Haptics.selectionAsync();
      }
      await setReminderTime(selectedDate.getHours(), selectedDate.getMinutes());
    }
  };

  // Format time for display
  const formatTime = (hour: number, minute: number): string => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    const displayMinute = minute.toString().padStart(2, '0');
    return `${displayHour}:${displayMinute} ${period}`;
  };

  // Get permission status display info
  const getPermissionStatusInfo = () => {
    switch (permissionStatus) {
      case 'granted':
        return {
          text: 'Notifications Enabled',
          color: colors.success,
          icon: 'checkmark-circle' as const,
          bgColor: colors.successBackground,
        };
      case 'denied':
        return {
          text: 'Notifications Denied',
          color: colors.error,
          icon: 'close-circle' as const,
          bgColor: colors.errorBackground,
        };
      case 'undetermined':
      default:
        return {
          text: 'Not Yet Requested',
          color: colors.warning,
          icon: 'alert-circle' as const,
          bgColor: colors.warningBackground,
        };
    }
  };

  const statusInfo = getPermissionStatusInfo();

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Notifications',
          headerLargeTitle: false,
        }}
      />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Permission Status Card */}
        <Animated.View entering={FadeIn.duration(300)} style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: colors.textTertiary }]}>
            PERMISSION STATUS
          </ThemedText>
          <View style={[styles.statusCard, { backgroundColor: colors.card }, shadows.small]}>
            <View style={[styles.statusIconContainer, { backgroundColor: statusInfo.bgColor }]}>
              <Icon name={statusInfo.icon} size={24} color={statusInfo.color} />
            </View>
            <View style={styles.statusContent}>
              <ThemedText style={styles.statusTitle}>{statusInfo.text}</ThemedText>
              <ThemedText style={[styles.statusDescription, { color: colors.textTertiary }]}>
                {permissionStatus === 'granted'
                  ? 'You will receive meal reminders'
                  : permissionStatus === 'denied'
                  ? 'Enable in system settings'
                  : 'Tap below to enable notifications'}
              </ThemedText>
            </View>
          </View>
        </Animated.View>

        {/* Request/Open Settings Button */}
        {permissionStatus !== 'granted' && (
          <Animated.View entering={FadeInDown.delay(100).duration(300)} style={styles.section}>
            {permissionStatus === 'undetermined' ? (
              <ModernButton
                title={isRequestingPermission ? 'Requesting...' : 'Enable Notifications'}
                onPress={requestPermissions}
                variant="primary"
                size="large"
                fullWidth
                icon="notifications"
                loading={isRequestingPermission}
                disabled={isRequestingPermission}
              />
            ) : (
              <>
                <View style={[styles.deniedCard, { backgroundColor: colors.warningBackground }]}>
                  <Icon name="information-circle" size={20} color={colors.warning} />
                  <ThemedText style={[styles.deniedText, { color: colors.text }]}>
                    Notifications are disabled in your device settings. To receive meal reminders,
                    you'll need to enable them in Settings.
                  </ThemedText>
                </View>
                <View style={{ marginTop: spacing.md }}>
                  <ModernButton
                    title="Open System Settings"
                    onPress={openSystemSettings}
                    variant="secondary"
                    size="large"
                    fullWidth
                    icon="settings-outline"
                  />
                </View>
              </>
            )}
          </Animated.View>
        )}

        {/* Notification Settings */}
        <Animated.View
          entering={FadeInDown.delay(permissionStatus !== 'granted' ? 200 : 100).duration(300)}
          style={styles.section}
        >
          <ThemedText style={[styles.sectionTitle, { color: colors.textTertiary }]}>
            MEAL REMINDERS
          </ThemedText>
          <View style={[styles.settingsCard, { backgroundColor: colors.card }, shadows.small]}>
            {/* Enable Toggle */}
            <View style={styles.settingRow}>
              <View style={[styles.settingIconContainer, { backgroundColor: colors.accentSubtle }]}>
                <Icon name="notifications" size={18} color={colors.tint} />
              </View>
              <View style={styles.settingContent}>
                <ThemedText style={styles.settingTitle}>Meal Reminders</ThemedText>
                <ThemedText style={[styles.settingDescription, { color: colors.textTertiary }]}>
                  Get notified about scheduled meals
                </ThemedText>
              </View>
              <Switch
                value={notificationsEnabled && permissionStatus === 'granted'}
                onValueChange={handleToggleNotifications}
                trackColor={{ false: colors.skeleton, true: colors.tint }}
                thumbColor="#FFFFFF"
                disabled={permissionStatus === 'denied'}
              />
            </View>

            <View style={[styles.separator, { backgroundColor: colors.borderSubtle }]} />

            {/* Reminder Time */}
            <AnimatedPressable
              onPress={() => {
                if (hapticFeedback) {
                  Haptics.selectionAsync();
                }
                setShowTimePicker(true);
              }}
              hapticType="selection"
              scaleOnPress={0.99}
              style={styles.settingRow}
              disabled={!notificationsEnabled || permissionStatus !== 'granted'}
            >
              <View
                style={[
                  styles.settingIconContainer,
                  { backgroundColor: colors.infoBackground },
                  (!notificationsEnabled || permissionStatus !== 'granted') && { opacity: 0.5 },
                ]}
              >
                <Icon name="time" size={18} color={colors.info} />
              </View>
              <View style={styles.settingContent}>
                <ThemedText
                  style={[
                    styles.settingTitle,
                    (!notificationsEnabled || permissionStatus !== 'granted') && { opacity: 0.5 },
                  ]}
                >
                  Reminder Time
                </ThemedText>
                <ThemedText
                  style={[
                    styles.settingDescription,
                    { color: colors.textTertiary },
                    (!notificationsEnabled || permissionStatus !== 'granted') && { opacity: 0.5 },
                  ]}
                >
                  When to send daily meal reminders
                </ThemedText>
              </View>
              <View style={styles.timeValue}>
                <ThemedText
                  style={[
                    styles.timeText,
                    { color: colors.tint },
                    (!notificationsEnabled || permissionStatus !== 'granted') && { opacity: 0.5 },
                  ]}
                >
                  {formatTime(reminderTimeHour, reminderTimeMinute)}
                </ThemedText>
                <Icon
                  name="chevron-forward"
                  size={18}
                  color={colors.textTertiary}
                  style={[
                    (!notificationsEnabled || permissionStatus !== 'granted') && { opacity: 0.5 },
                  ]}
                />
              </View>
            </AnimatedPressable>
          </View>
        </Animated.View>

        {/* Info Card */}
        <Animated.View
          entering={FadeInDown.delay(permissionStatus !== 'granted' ? 300 : 200).duration(300)}
          style={styles.section}
        >
          <View style={[styles.infoCard, { backgroundColor: colors.infoBackground }]}>
            <Icon name="information-circle" size={20} color={colors.info} />
            <ThemedText style={[styles.infoText, { color: colors.text }]}>
              Meal reminders help you stay on track with your cooking schedule. You'll receive a
              notification at your chosen time when you have meals planned for the day.
            </ThemedText>
          </View>
        </Animated.View>

        {/* Time Picker - iOS shows inline, Android shows modal */}
        {showTimePicker && (
          <Animated.View entering={SlideInRight.duration(300)} style={styles.pickerSection}>
            {process.env.EXPO_OS === 'ios' && (
              <>
                <ThemedText style={[styles.sectionTitle, { color: colors.textTertiary }]}>
                  SELECT TIME
                </ThemedText>
                <View style={[styles.pickerCard, { backgroundColor: colors.card }, shadows.small]}>
                  <DateTimePicker
                    value={reminderDate}
                    mode="time"
                    display="spinner"
                    onChange={handleTimeChange}
                    textColor={colors.text}
                  />
                  <View style={styles.pickerButtons}>
                    <ModernButton
                      title="Done"
                      onPress={() => setShowTimePicker(false)}
                      variant="primary"
                      size="medium"
                    />
                  </View>
                </View>
              </>
            )}
            {process.env.EXPO_OS === 'android' && (
              <DateTimePicker
                value={reminderDate}
                mode="time"
                display="default"
                onChange={handleTimeChange}
              />
            )}
          </Animated.View>
        )}
      </ScrollView>
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
    marginBottom: spacing.sm,
    marginLeft: spacing.sm,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radius.xl,
    gap: spacing.md,
  },
  statusIconContainer: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusContent: {
    flex: 1,
  },
  statusTitle: {
    ...typography.titleMedium,
  },
  statusDescription: {
    ...typography.bodySmall,
    marginTop: 2,
  },
  deniedCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.lg,
    borderRadius: radius.xl,
    gap: spacing.md,
  },
  deniedText: {
    flex: 1,
    ...typography.bodySmall,
    lineHeight: 20,
  },
  settingsCard: {
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  settingIconContainer: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    ...typography.bodyLarge,
  },
  settingDescription: {
    ...typography.caption,
    marginTop: 2,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 32 + spacing.lg + spacing.md,
  },
  timeValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  timeText: {
    ...typography.bodyLarge,
    fontWeight: '600',
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
  pickerSection: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  pickerCard: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    padding: spacing.md,
  },
  pickerButtons: {
    alignItems: 'center',
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
});
