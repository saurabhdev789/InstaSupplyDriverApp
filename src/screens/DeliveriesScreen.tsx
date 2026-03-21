import React, {useEffect, useLayoutEffect, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';

import {useAuth} from '../context/AuthContext';
import {RootStackParamList} from '../navigation/types';
import {
  createNewDelivery,
  createSampleDeliveries,
  markDeliveryAsDelivered,
  subscribeToDriverDeliveries,
} from '../services/deliveries';
import {Delivery} from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Deliveries'>;

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
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);

  useEffect(() => {
    if (!user?.uid) {
      return;
    }

    const unsubscribe = subscribeToDriverDeliveries(user.uid, items => {
      setDeliveries(items);
      setLoading(false);
    });

    return unsubscribe;
  }, [user?.uid]);

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

  const addSampleDeliveries = async () => {
    if (!user?.uid) {
      Alert.alert('Session missing', 'Please sign in again.');
      return;
    }

    try {
      setCreatingSamples(true);
      await createSampleDeliveries(user.uid);
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
      await createNewDelivery(user.uid);
    } catch (error) {
      Alert.alert('Could not create deliveries', (error as Error).message);
    } finally {
      setCreatingNew(false);
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
        </View>
      </View>

      {!loading && deliveries.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No deliveries assigned yet</Text>
          <Text style={styles.emptySubtitle}>
            Tap Add Samples to create test deliveries for this driver.
          </Text>
          <Pressable
            disabled={creatingSamples}
            onPress={addSampleDeliveries}
            style={[styles.primarySmallButton, creatingSamples ? styles.disabledButton : null]}>
            <Text style={styles.primarySmallButtonText}>
              {creatingSamples ? 'Creating...' : 'Create Sample Deliveries'}
            </Text>
          </Pressable>
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
  primarySmallButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    borderRadius: 8,
    backgroundColor: '#2563eb',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  primarySmallButtonText: {
    color: '#f8fafc',
    fontWeight: '700',
    fontSize: 12,
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
