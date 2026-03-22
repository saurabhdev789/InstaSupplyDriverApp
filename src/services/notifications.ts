import {PermissionsAndroid, Platform} from 'react-native';
import messaging, {FirebaseMessagingTypes} from '@react-native-firebase/messaging';
import notifee, {AndroidImportance, EventType} from '@notifee/react-native';

import {navigate} from '../navigation/rootNavigation';

const DRIVER_CHANNEL_ID = 'driver-alerts';

type NotificationData = Record<string, string | object>;

const resolveTargetScreen = (screen?: string) =>
  screen === 'Deliveries' ? 'Deliveries' : 'OptimizedRoute';

const navigateFromData = (data?: NotificationData) => {
  const screen = typeof data?.screen === 'string' ? data.screen : undefined;
  const targetScreen = resolveTargetScreen(screen);
  navigate(targetScreen);
};

const ensureDriverChannel = async () => {
  await notifee.createChannel({
    id: DRIVER_CHANNEL_ID,
    name: 'Driver Alerts',
    importance: AndroidImportance.HIGH,
  });
};

const displayNotification = async (
  remoteMessage: FirebaseMessagingTypes.RemoteMessage,
) => {
  await notifee.displayNotification({
    title: remoteMessage.notification?.title ?? 'New delivery assigned',
    body: remoteMessage.notification?.body ?? 'Open the app to view the delivery.',
    data: remoteMessage.data,
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

  await ensureDriverChannel();

  const foregroundSubscription = messaging().onMessage(async remoteMessage => {
    await displayNotification(remoteMessage);
  });

  const openedSubscription = messaging().onNotificationOpenedApp(remoteMessage => {
    navigateFromData(remoteMessage.data);
  });

  const notifeeForegroundSubscription = notifee.onForegroundEvent(({type, detail}) => {
    if (type === EventType.PRESS) {
      navigateFromData(detail.notification?.data as NotificationData | undefined);
    }
  });

  const initialMessage = await messaging().getInitialNotification();
  if (initialMessage) {
    navigateFromData(initialMessage.data);
  }

  const initialLocalNotification = await notifee.getInitialNotification();
  if (initialLocalNotification?.notification?.data) {
    navigateFromData(initialLocalNotification.notification.data as NotificationData);
  }

  return () => {
    foregroundSubscription();
    openedSubscription();
    notifeeForegroundSubscription();
  };
};

export const showDeliveryAssignedNotification = async (orderId: string): Promise<void> => {
  await ensureDriverChannel();

  await notifee.displayNotification({
    title: 'New Delivery Assigned',
    body: `Order ${orderId} is now assigned to you.`,
    data: {
      screen: 'OptimizedRoute',
    },
    android: {
      channelId: DRIVER_CHANNEL_ID,
      pressAction: {
        id: 'default',
      },
      importance: AndroidImportance.HIGH,
    },
  });
};

export const showBackgroundNotification = displayNotification;
