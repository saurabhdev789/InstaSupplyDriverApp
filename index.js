/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import './src/services/backgroundMessaging';

AppRegistry.registerComponent(appName, () => App);
