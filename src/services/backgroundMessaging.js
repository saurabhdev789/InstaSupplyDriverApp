import messaging from '@react-native-firebase/messaging';

import {showBackgroundNotification} from './notifications';

messaging().setBackgroundMessageHandler(async remoteMessage => {
  await showBackgroundNotification(remoteMessage);
});

