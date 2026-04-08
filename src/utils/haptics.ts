/**
 * Shinra Pocket - Haptic Feedback Helpers
 * Wraps expo-haptics with convenience functions for common interactions.
 */

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

/** Light tap — coin selection, tab switch */
export function lightTap(): void {
  if (!isNative) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

/** Medium tap — button press, game move */
export function mediumTap(): void {
  if (!isNative) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

/** Heavy tap — important action, confirmation */
export function heavyTap(): void {
  if (!isNative) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
}

/** Success notification — win, purchase complete */
export function success(): void {
  if (!isNative) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

/** Error notification — loss, failure */
export function error(): void {
  if (!isNative) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
}

/** Warning notification — timeout, caution */
export function warning(): void {
  if (!isNative) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
}
