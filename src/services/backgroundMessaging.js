import messaging from '@react-native-firebase/messaging';

import {showBackgroundNotification} from './notifications';

messaging().setBackgroundMessageHandler(async remoteMessage => {
  // FCM with a notification payload is already shown by the OS in background/killed states.
  // Show a local notification only for data-only payloads to avoid duplicates.
  if (remoteMessage?.notification) {
    return;
  }

  await showBackgroundNotification(remoteMessage);
});
