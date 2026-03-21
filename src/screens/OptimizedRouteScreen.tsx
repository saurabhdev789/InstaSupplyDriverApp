import React, {useEffect, useMemo, useState} from 'react';
import {
  PermissionsAndroid,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import MapView, {Marker, Polyline} from 'react-native-maps';

import {useAuth} from '../context/AuthContext';
import {subscribeToDriverDeliveries} from '../services/deliveries';
import {Delivery} from '../types';
import {optimizeRoute} from '../utils/routeOptimization';

type Coordinates = {
  latitude: number;
  longitude: number;
};

const defaultLocation = {
  latitude: 28.6139,
  longitude: 77.209,
};

export const OptimizedRouteScreen = () => {
  const {user} = useAuth();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [driverLocation, setDriverLocation] = useState<Coordinates>(defaultLocation);

  useEffect(() => {
    if (!user?.uid) {
      return;
    }

    const unsubscribe = subscribeToDriverDeliveries(user.uid, items => {
      setDeliveries(items);
    });

    return unsubscribe;
  }, [user?.uid]);

  useEffect(() => {
    const requestLocation = async () => {
      if (Platform.OS === 'android') {
        await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
      }

      Geolocation.getCurrentPosition(
        position => {
          setDriverLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        () => {
          setDriverLocation(defaultLocation);
        },
        {enableHighAccuracy: true, timeout: 12000, maximumAge: 10000},
      );
    };

    requestLocation();
  }, []);

  const routeStops = useMemo(
    () => optimizeRoute(deliveries, driverLocation),
    [deliveries, driverLocation],
  );

  const polylinePoints = [
    driverLocation,
    ...routeStops.map(stop => ({latitude: stop.latitude, longitude: stop.longitude})),
  ];

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>Optimized Route</Text>
      <MapView
        initialRegion={{
          ...driverLocation,
          latitudeDelta: 0.18,
          longitudeDelta: 0.18,
        }}
        region={{
          ...driverLocation,
          latitudeDelta: 0.18,
          longitudeDelta: 0.18,
        }}
        style={styles.map}>
        <Marker coordinate={driverLocation} pinColor="#2563eb" title="Driver" />
        {routeStops.map(stop => (
          <Marker
            coordinate={{latitude: stop.latitude, longitude: stop.longitude}}
            description={stop.address}
            key={stop.id}
            pinColor={stop.status === 'delivered' ? '#16a34a' : '#dc2626'}
            title={`Stop ${stop.sequence} - ${stop.customerName}`}
          />
        ))}
        {polylinePoints.length > 1 ? (
          <Polyline coordinates={polylinePoints} strokeColor="#0b5fff" strokeWidth={4} />
        ) : null}
      </MapView>

      <ScrollView contentContainerStyle={styles.list}>
        {routeStops.length === 0 ? (
          <Text style={styles.emptyText}>No pending stops. You are all caught up.</Text>
        ) : (
          routeStops.map(stop => (
            <View key={stop.id} style={styles.stopCard}>
              <Text style={styles.stopTitle}>
                {stop.sequence}. {stop.customerName} ({stop.orderId})
              </Text>
              <Text style={styles.stopAddress}>{stop.address}</Text>
              <Text style={styles.stopMeta}>
                Distance {stop.distanceKm.toFixed(2)} km | ETA{' '}
                {Math.round(stop.estimatedTravelMinutes)} mins | Traffic x
                {stop.trafficMultiplier.toFixed(2)}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 10,
  },
  map: {
    height: 290,
    marginHorizontal: 16,
    borderRadius: 12,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 20,
    gap: 10,
  },
  emptyText: {
    color: '#475569',
  },
  stopCard: {
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
  },
  stopTitle: {
    color: '#0f172a',
    fontWeight: '700',
  },
  stopAddress: {
    color: '#334155',
    marginTop: 4,
  },
  stopMeta: {
    marginTop: 8,
    color: '#1e40af',
    fontSize: 12,
    fontWeight: '600',
  },
});

