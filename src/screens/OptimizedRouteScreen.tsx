import React, {useEffect, useMemo, useRef, useState} from 'react';
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
import messaging from '@react-native-firebase/messaging';
import MapView, {Marker, Polyline} from 'react-native-maps';

import {useAuth} from '../context/AuthContext';
import {subscribeToDriverDeliveries, subscribeToDriverTokenDeliveries} from '../services/deliveries';
import {Delivery} from '../types';
import {optimizeRoute} from '../utils/routeOptimization';

type Coordinates = {
  latitude: number;
  longitude: number;
};

type DisplayDelivery = Delivery & {
  markerLatitude: number;
  markerLongitude: number;
};

const defaultLocation = {
  latitude: 28.6139,
  longitude: 77.209,
};

const markerOffset = (index: number): Coordinates => {
  if (index === 0) {
    return {latitude: 0, longitude: 0};
  }

  const angle = (index - 1) * (Math.PI / 3);
  const radius = 0.00028;
  return {
    latitude: Math.sin(angle) * radius,
    longitude: Math.cos(angle) * radius,
  };
};

const isNear = (from: Coordinates, to: Coordinates, threshold = 0.00012): boolean =>
  Math.abs(from.latitude - to.latitude) <= threshold &&
  Math.abs(from.longitude - to.longitude) <= threshold;

export const OptimizedRouteScreen = () => {
  const {user} = useAuth();
  const mapReference = useRef<MapView | null>(null);
  const [assignedDeliveries, setAssignedDeliveries] = useState<Delivery[]>([]);
  const [tokenDeliveries, setTokenDeliveries] = useState<Delivery[]>([]);
  const [driverLocation, setDriverLocation] = useState<Coordinates>(defaultLocation);

  useEffect(() => {
    if (!user?.uid) {
      return;
    }

    const unsubscribe = subscribeToDriverDeliveries(user.uid, items => {
      setAssignedDeliveries(items);
    });

    return unsubscribe;
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) {
      return;
    }

    let unsubscribe: (() => void) | undefined;

    void messaging()
      .getToken()
      .then(token => {
        if (!token) {
          setTokenDeliveries([]);
          return;
        }

        unsubscribe = subscribeToDriverTokenDeliveries(token, items => {
          setTokenDeliveries(items);
        });
      })
      .catch(() => {
        setTokenDeliveries([]);
      });

    return () => {
      unsubscribe?.();
    };
  }, [user?.uid]);

  const deliveries = useMemo(() => {
    const merged = new Map<string, Delivery>();
    assignedDeliveries.forEach(item => {
      merged.set(item.id, item);
    });
    tokenDeliveries.forEach(item => {
      merged.set(item.id, item);
    });

    return Array.from(merged.values()).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  }, [assignedDeliveries, tokenDeliveries]);

  useEffect(() => {
    const requestLocation = async () => {
      if (Platform.OS === 'android') {
        const permission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
        if (permission !== PermissionsAndroid.RESULTS.GRANTED) {
          return;
        }
      }

      Geolocation.getCurrentPosition(
        position => {
          setDriverLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        () => {
          // Keep existing fallback location to avoid jumping to a far city if GPS fails.
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

  const displayedDeliveries = useMemo<DisplayDelivery[]>(() => {
    const grouped = new Map<string, Delivery[]>();

    deliveries.forEach(item => {
      const key = `${item.latitude.toFixed(5)}:${item.longitude.toFixed(5)}`;
      const existing = grouped.get(key) ?? [];
      existing.push(item);
      grouped.set(key, existing);
    });

    const mapped: DisplayDelivery[] = [];
    grouped.forEach(items => {
      items.forEach((item, index) => {
        const overlapsDriver = isNear(
          {latitude: item.latitude, longitude: item.longitude},
          driverLocation,
        );
        const offset = markerOffset(overlapsDriver ? index + 1 : index);
        mapped.push({
          ...item,
          markerLatitude: item.latitude + offset.latitude,
          markerLongitude: item.longitude + offset.longitude,
        });
      });
    });

    return mapped;
  }, [deliveries, driverLocation]);

  useEffect(() => {
    if (
      deliveries.length > 0 &&
      driverLocation.latitude === defaultLocation.latitude &&
      driverLocation.longitude === defaultLocation.longitude
    ) {
      setDriverLocation({
        latitude: deliveries[0].latitude,
        longitude: deliveries[0].longitude,
      });
    }
  }, [deliveries, driverLocation.latitude, driverLocation.longitude]);

  const polylinePoints = [
    driverLocation,
    ...routeStops.map(stop => ({latitude: stop.latitude, longitude: stop.longitude})),
  ];

  useEffect(() => {
    if (!mapReference.current) {
      return;
    }

    if (routeStops.length > 0) {
      mapReference.current.fitToCoordinates(
        routeStops.map(stop => ({latitude: stop.latitude, longitude: stop.longitude})),
        {
          edgePadding: {top: 56, right: 56, bottom: 56, left: 56},
          animated: true,
        },
      );
      return;
    }

    mapReference.current.animateToRegion(
      {
        ...driverLocation,
        latitudeDelta: 0.12,
        longitudeDelta: 0.12,
      },
      450,
    );
  }, [driverLocation, routeStops]);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>Optimized Route</Text>
      <MapView
        ref={mapReference}
        initialRegion={{
          ...driverLocation,
          latitudeDelta: 0.18,
          longitudeDelta: 0.18,
        }}
        style={styles.map}>
        <Marker coordinate={driverLocation} pinColor="#2563eb" title="Driver" />
        {displayedDeliveries.map(item => (
          <Marker
            coordinate={{latitude: item.markerLatitude, longitude: item.markerLongitude}}
            description={item.address}
            key={item.id}
            pinColor={item.status === 'delivered' ? '#16a34a' : '#dc2626'}
            title={
              item.status === 'delivered'
                ? `Delivered - ${item.customerName}`
                : `${item.customerName} (${item.orderId})`
            }
          />
        ))}
        {polylinePoints.length > 1 ? (
          <Polyline coordinates={polylinePoints} strokeColor="#0b5fff" strokeWidth={4} />
        ) : null}
      </MapView>

      <ScrollView style={styles.listWrapper} contentContainerStyle={styles.list}>
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
  listWrapper: {
    flex: 1,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 20,
    gap: 10,
    flexGrow: 1,
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
