import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { router } from 'expo-router'

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

export interface ScheduleReminderParams {
  id: string
  title: string
  body: string
  triggerTime: Date
  data?: Record<string, unknown>
}

/**
 * Request notification permissions from the user.
 * Returns true if permissions were granted.
 */
export async function requestPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync()

  if (existingStatus === 'granted') {
    return true
  }

  const { status } = await Notifications.requestPermissionsAsync()
  return status === 'granted'
}

/**
 * Check if notification permissions are currently granted.
 */
export async function checkPermissions(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync()
  return status === 'granted'
}

/**
 * Schedule a local notification reminder.
 * Returns the notification identifier or null if scheduling failed.
 */
export async function scheduleReminder(params: ScheduleReminderParams): Promise<string | null> {
  const { id, title, body, triggerTime, data = {} } = params

  // Don't schedule if the time is in the past
  if (triggerTime.getTime() <= Date.now()) {
    console.log('[Notifications] Skipping past reminder for "' + title + '"')
    return null
  }

  try {
    // Cancel any existing notification with this ID first
    await cancelReminder(id)

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        data: {
          ...data,
          mealPlanId: id,
          type: 'meal-plan-reminder',
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerTime,
      },
      identifier: id,
    })

    console.log(
      '[Notifications] Scheduled reminder "' +
        title +
        '" for ' +
        triggerTime.toLocaleString() +
        ' with ID: ' +
        identifier
    )
    return identifier
  } catch (error) {
    console.error('[Notifications] Failed to schedule reminder:', error)
    return null
  }
}

/**
 * Cancel a scheduled notification by its identifier.
 */
export async function cancelReminder(id: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(id)
    console.log('[Notifications] Cancelled reminder with ID: ' + id)
  } catch (error) {
    // Ignore errors when cancelling non-existent notifications
    console.log('[Notifications] No notification found to cancel with ID: ' + id)
  }
}

/**
 * Cancel all scheduled notifications.
 */
export async function cancelAllReminders(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync()
    console.log('[Notifications] Cancelled all scheduled reminders')
  } catch (error) {
    console.error('[Notifications] Failed to cancel all reminders:', error)
  }
}

/**
 * Get all currently scheduled notifications.
 */
export async function getScheduledReminders(): Promise<Notifications.NotificationRequest[]> {
  return Notifications.getAllScheduledNotificationsAsync()
}

/**
 * Set up listener for notification taps.
 * Returns a cleanup function to remove the listener.
 */
export function setupNotificationResponseListener(
  callback?: (response: Notifications.NotificationResponse) => void
): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data

    // Handle meal plan reminder taps
    if (data?.type === 'meal-plan-reminder' && data?.mealPlanId) {
      // Navigate to meal plan screen
      router.push('/(tabs)/meal-plan')
    }

    // Call custom callback if provided
    callback?.(response)
  })

  return () => subscription.remove()
}

/**
 * Set up listener for notifications received while app is in foreground.
 * Returns a cleanup function to remove the listener.
 */
export function setupNotificationReceivedListener(
  callback?: (notification: Notifications.Notification) => void
): () => void {
  const subscription = Notifications.addNotificationReceivedListener((notification) => {
    console.log('[Notifications] Received notification:', notification)
    callback?.(notification)
  })

  return () => subscription.remove()
}

/**
 * Helper to format meal plan reminder body text.
 */
export function formatMealReminderBody(recipeName: string, mealType: string): string {
  return 'Time to prepare ' + recipeName + ' for ' + mealType.toLowerCase() + '!'
}

/**
 * Request permissions for push notifications on iOS.
 * Android handles this differently.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('meal-reminders', {
      name: 'Meal Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF6B35',
    })
  }

  const hasPermission = await requestPermissions()
  if (!hasPermission) {
    return null
  }

  // For local notifications, we don't need a push token
  // But return a placeholder to indicate success
  return 'local-notifications-enabled'
}
