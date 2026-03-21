import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
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
import {markDeliveryAsDelivered, subscribeToDriverDeliveries} from '../services/deliveries';
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

  const markDelivered = async (deliveryId: string) => {
    await markDeliveryAsDelivered(deliveryId);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.heading}>Assigned Deliveries</Text>
          <Text style={styles.subHeading}>{deliveries.length} total orders</Text>
        </View>
        <Pressable onPress={signOut} style={styles.outlineButton}>
          <Text style={styles.outlineButtonText}>Sign out</Text>
        </Pressable>
      </View>

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
  },
  outlineButtonText: {
    color: '#0f172a',
    fontWeight: '600',
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

