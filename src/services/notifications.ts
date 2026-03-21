import {PermissionsAndroid, Platform} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee, {AndroidImportance} from '@notifee/react-native';

import {navigate} from '../navigation/rootNavigation';

const DRIVER_CHANNEL_ID = 'driver-alerts';

const displayNotification = async (
  remoteMessage: messaging.FirebaseMessagingTypes.RemoteMessage,
) => {
  await notifee.displayNotification({
    title: remoteMessage.notification?.title ?? 'New delivery assigned',
    body: remoteMessage.notification?.body ?? 'Open the app to view the delivery.',
    android: {
      channelId: DRIVER_CHANNEL_ID,
      pressAction: {
        id: 'default',
      },
      importance: AndroidImportance.HIGH,
    },
  });
};

export const setupNotificationHandlers = async (): Promise<() => void> => {
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  }

  await messaging().requestPermission();

  await notifee.createChannel({
    id: DRIVER_CHANNEL_ID,
    name: 'Driver Alerts',
    importance: AndroidImportance.HIGH,
  });

  const foregroundSubscription = messaging().onMessage(async remoteMessage => {
    await displayNotification(remoteMessage);
  });

  const openedSubscription = messaging().onNotificationOpenedApp(() => {
    navigate('Deliveries');
  });

  const initialMessage = await messaging().getInitialNotification();
  if (initialMessage) {
    navigate('Deliveries');
  }

  return () => {
    foregroundSubscription();
    openedSubscription();
  };
};

export const showBackgroundNotification = displayNotification;

