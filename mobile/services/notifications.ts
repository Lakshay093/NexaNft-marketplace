import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
export async function enableNotifications() {
  if (Platform.OS === 'web')
    return 'Device notifications are available in the Android and iOS app.';
  const notifications = await import('expo-notifications');
  if (Platform.OS === 'android')
    await notifications.setNotificationChannelAsync('marketplace', {
      name: 'Marketplace',
      importance: notifications.AndroidImportance.DEFAULT,
    });
  const result = await notifications.requestPermissionsAsync();
  await AsyncStorage.setItem('nexanft.localNotifications', String(result.granted));
  return result.granted
    ? 'Device notifications enabled for collection confirmations.'
    : 'Permission was declined. You can enable it in device settings.';
}
export async function notifyCollection(name: string) {
  if (
    Platform.OS === 'web' ||
    (await AsyncStorage.getItem('nexanft.localNotifications')) !== 'true'
  )
    return;
  const notifications = await import('expo-notifications');
  const permission = await notifications.getPermissionsAsync();
  if (permission.granted)
    await notifications.scheduleNotificationAsync({
      content: {
        title: 'Added to your collection',
        body: `${name} is now in your account. Demo transfer only; no payment was processed.`,
      },
      trigger: null,
    });
}
