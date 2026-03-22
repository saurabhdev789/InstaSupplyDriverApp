import React, {useCallback, useEffect, useLayoutEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  PermissionsAndroid,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import messaging from '@react-native-firebase/messaging';
import {useFocusEffect} from '@react-navigation/native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import Geolocation from 'react-native-geolocation-service';

import {useAuth} from '../context/AuthContext';
import {RootStackParamList} from '../navigation/types';
import {
  createNewDelivery,
  createSampleDeliveries,
  markDeliveryAsDelivered,
  subscribeToDriverDeliveries,
  subscribeToDriverTokenDeliveries,
} from '../services/deliveries';
import {Delivery} from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Deliveries'>;

type Coordinates = {
  latitude: number;
  longitude: number;
};

const statusColor: Record<Delivery['status'], string> = {
  pending: '#ca8a04',
  out_for_delivery: '#2563eb',
  delivered: '#16a34a',
};

export const DeliveriesScreen = ({navigation}: Props) => {
  const {user, signOut} = useAuth();
  const [loading, setLoading] = useState(true);
  const [creatingSamples, setCreatingSamples] = useState(false);
  const [creatingNew, setCreatingNew] = useState(false);
  const [assignedDeliveries, setAssignedDeliveries] = useState<Delivery[]>([]);
  const [tokenDeliveries, setTokenDeliveries] = useState<Delivery[]>([]);
  const [pushToken, setPushToken] = useState('');
  const [loadingPushToken, setLoadingPushToken] = useState(false);

  useEffect(() => {
    if (!user?.uid) {
      return;
    }

    const unsubscribe = subscribeToDriverDeliveries(user.uid, items => {
      setAssignedDeliveries(items);
      setLoading(false);
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
          setLoading(false);
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

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={signOut} style={styles.headerSignOutButton}>
          <Text style={styles.headerSignOutText}>Sign out</Text>
        </Pressable>
      ),
    });
  }, [navigation, signOut]);

  const markDelivered = async (deliveryId: string) => {
    await markDeliveryAsDelivered(deliveryId);
  };

  const getCurrentLocation = useCallback(async (): Promise<Coordinates | undefined> => {
    if (Platform.OS === 'android') {
      const permission = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );
      if (permission !== PermissionsAndroid.RESULTS.GRANTED) {
        return undefined;
      }
    }

    return new Promise(resolve => {
      Geolocation.getCurrentPosition(
        position => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        () => {
          resolve(undefined);
        },
        {enableHighAccuracy: true, timeout: 12000, maximumAge: 10000},
      );
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!user?.uid) {
        return undefined;
      }

      let isMounted = true;

      const syncLastKnownLocation = async () => {
        const currentLocation = await getCurrentLocation();
        if (!isMounted || !currentLocation) {
          return;
        }

        await firestore().collection('drivers').doc(user.uid).set(
          {
            lastKnownLocation: {
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
              updatedAt: firestore.FieldValue.serverTimestamp(),
            },
            updatedAt: firestore.FieldValue.serverTimestamp(),
          },
          {merge: true},
        );
      };

      void syncLastKnownLocation().catch(error => {
        console.warn('Last known location sync failed', error);
      });

      return () => {
        isMounted = false;
      };
    }, [getCurrentLocation, user?.uid]),
  );

  const addSampleDeliveries = async () => {
    if (!user?.uid) {
      Alert.alert('Session missing', 'Please sign in again.');
      return;
    }

    try {
      setCreatingSamples(true);
      const currentLocation = await getCurrentLocation();
      await createSampleDeliveries(user.uid, currentLocation);
    } catch (error) {
      Alert.alert('Could not create deliveries', (error as Error).message);
    } finally {
      setCreatingSamples(false);
    }
  };

  const addNewDeliveries = async () => {
    if (!user?.uid) {
      Alert.alert('Session missing', 'Please sign in again.');
      return;
    }

    try {
      setCreatingNew(true);
      const currentLocation = await getCurrentLocation();
      await createNewDelivery(user.uid, currentLocation);
    } catch (error) {
      Alert.alert('Could not create deliveries', (error as Error).message);
    } finally {
      setCreatingNew(false);
    }
  };

  const showPushToken = async () => {
    try {
      setLoadingPushToken(true);
      const token = await messaging().getToken();
      setPushToken(token ?? '');

      if (!token) {
        Alert.alert('Token unavailable', 'Push token is not available yet. Please try again.');
      }
    } catch (error) {
      Alert.alert('Could not fetch token', (error as Error).message);
    } finally {
      setLoadingPushToken(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.heading}>Assigned Deliveries</Text>
          <Text style={styles.subHeading}>{deliveries.length} total orders</Text>
        </View>
        <View style={styles.headerButtons}>
          <Pressable
            disabled={creatingSamples}
            onPress={addSampleDeliveries}
            style={[styles.outlineButton, creatingSamples ? styles.disabledButton : null]}>
            <Text style={styles.outlineButtonText}>
              {creatingSamples ? 'Adding...' : 'Add Samples'}
            </Text>
          </Pressable>
          <Pressable
            disabled={creatingNew}
            onPress={addNewDeliveries}
            style={[styles.outlineButton, creatingNew ? styles.disabledButton : null]}>
            <Text style={styles.outlineButtonText}>
              {creatingNew ? 'Adding...' : 'Add New'}
            </Text>
          </Pressable>
          <Pressable
            disabled={loadingPushToken}
            onPress={showPushToken}
            style={[styles.outlineButton, loadingPushToken ? styles.disabledButton : null]}>
            <Text style={styles.outlineButtonText}>
              {loadingPushToken ? 'Loading...' : 'Show Push Token'}
            </Text>
          </Pressable>
        </View>
      </View>

      {pushToken ? (
        <View style={styles.tokenCard}>
          <Text style={styles.tokenTitle}>Driver Push Token (long-press to copy)</Text>
          <Text selectable style={styles.tokenValue}>
            {pushToken}
          </Text>
        </View>
      ) : null}

      {!loading && deliveries.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No deliveries assigned yet</Text>
          <Text style={styles.emptySubtitle}>
            Tap Add Samples in the top-right to create test deliveries for this driver.
          </Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#0b5fff" />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={deliveries}
          keyExtractor={item => item.id}
          renderItem={({item}) => (
            <View style={styles.card}>
              <Text style={styles.orderId}>#{item.orderId}</Text>
              <Text style={styles.customerName}>{item.customerName}</Text>
              <Text style={styles.address}>{item.address}</Text>
              <Text style={[styles.status, {color: statusColor[item.status]}]}>
                Status: {item.status}
              </Text>
              {item.status !== 'delivered' ? (
                <Pressable onPress={() => markDelivered(item.id)} style={styles.deliveredButton}>
                  <Text style={styles.deliveredButtonText}>Mark Delivered</Text>
                </Pressable>
              ) : null}
            </View>
          )}
        />
      )}

      <Pressable onPress={() => navigation.navigate('OptimizedRoute')} style={styles.ctaButton}>
        <Text style={styles.ctaText}>Open Optimized Route</Text>
      </Pressable>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  headerButtons: {
    flexDirection: 'column',
    gap: 6,
    alignItems: 'flex-end',
  },
  tokenCard: {
    marginHorizontal: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#ffffff',
  },
  tokenTitle: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 12,
  },
  tokenValue: {
    marginTop: 6,
    color: '#1e293b',
    fontSize: 12,
    lineHeight: 18,
  },
  heading: {
    fontSize: 24,
    color: '#0f172a',
    fontWeight: '700',
  },
  subHeading: {
    marginTop: 4,
    color: '#475569',
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: '#94a3b8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 108,
    alignItems: 'center',
  },
  outlineButtonText: {
    color: '#0f172a',
    fontWeight: '600',
    fontSize: 12,
  },
  headerSignOutButton: {
    borderWidth: 1,
    borderColor: '#94a3b8',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#ffffff',
  },
  headerSignOutText: {
    color: '#0f172a',
    fontWeight: '600',
    fontSize: 12,
  },
  disabledButton: {
    opacity: 0.6,
  },
  emptyState: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    padding: 14,
  },
  emptyTitle: {
    color: '#1e3a8a',
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtitle: {
    marginTop: 4,
    color: '#334155',
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    paddingBottom: 96,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  orderId: {
    color: '#0f172a',
    fontWeight: '700',
  },
  customerName: {
    marginTop: 6,
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '600',
  },
  address: {
    marginTop: 4,
    color: '#334155',
  },
  status: {
    marginTop: 8,
    fontWeight: '700',
  },
  deliveredButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: '#16a34a',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  deliveredButtonText: {
    color: '#f8fafc',
    fontWeight: '700',
    fontSize: 12,
  },
  ctaButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: '#0b5fff',
    marginHorizontal: 16,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
  },
});
