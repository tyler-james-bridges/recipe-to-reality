/**
 * Haptic Feedback Service
 * Ported from HapticManager.swift
 */

import * as Haptics from 'expo-haptics'
import { useSettingsStore } from '../stores/settingsStore'

/**
 * Check if haptic feedback is enabled
 */
function isEnabled(): boolean {
  return useSettingsStore.getState().hapticFeedback
}

/**
 * Light impact feedback - for subtle interactions
 */
export function lightImpact(): void {
  if (isEnabled()) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }
}

/**
 * Medium impact feedback - for standard interactions
 */
export function mediumImpact(): void {
  if (isEnabled()) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
  }
}

/**
 * Heavy impact feedback - for significant interactions
 */
export function heavyImpact(): void {
  if (isEnabled()) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
  }
}

/**
 * Selection feedback - for picker changes, toggles
 */
export function selection(): void {
  if (isEnabled()) {
    Haptics.selectionAsync()
  }
}

/**
 * Success notification feedback
 */
export function success(): void {
  if (isEnabled()) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  }
}

/**
 * Warning notification feedback
 */
export function warning(): void {
  if (isEnabled()) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
  }
}

/**
 * Error notification feedback
 */
export function error(): void {
  if (isEnabled()) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
  }
}

/**
 * Convenience object for importing all haptic functions
 */
export const HapticManager = {
  lightImpact,
  mediumImpact,
  heavyImpact,
  selection,
  success,
  warning,
  error,
}

export default HapticManager
