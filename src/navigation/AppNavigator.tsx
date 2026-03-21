import React, {useEffect} from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {useAuth} from '../context/AuthContext';
import {DeliveriesScreen} from '../screens/DeliveriesScreen';
import {LoginScreen} from '../screens/LoginScreen';
import {OptimizedRouteScreen} from '../screens/OptimizedRouteScreen';
import {PhoneVerificationScreen} from '../screens/PhoneVerificationScreen';
import {setupNotificationHandlers} from '../services/notifications';
import {navigationRef} from './rootNavigation';
import {RootStackParamList} from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator = () => {
  const {initializing, user, phoneVerified} = useAuth();

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    setupNotificationHandlers()
      .then(cleanup => {
        unsubscribe = cleanup;
      })
      .catch(error => {
        console.warn('Notification setup skipped', error);
      });

    return () => {
      unsubscribe?.();
    };
  }, []);

  if (initializing) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#0b5fff" />
      </View>
    );
  }

  const showAuthScreens = !user;
  const showPhoneScreen = Boolean(user) && !phoneVerified;

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator>
        {showAuthScreens ? (
          <Stack.Screen component={LoginScreen} name="Login" options={{headerShown: false}} />
        ) : null}
        {showPhoneScreen ? (
          <Stack.Screen
            component={PhoneVerificationScreen}
            name="PhoneVerification"
            options={{title: 'Phone Verification', headerBackVisible: false}}
          />
        ) : null}
        {!showAuthScreens && !showPhoneScreen ? (
          <>
            <Stack.Screen
              component={DeliveriesScreen}
              name="Deliveries"
              options={{title: 'Deliveries', headerBackVisible: false}}
            />
            <Stack.Screen
              component={OptimizedRouteScreen}
              name="OptimizedRoute"
              options={{title: 'Optimized Route'}}
            />
          </>
        ) : null}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
});

