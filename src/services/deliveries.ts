import firestore from '@react-native-firebase/firestore';

import {Delivery} from '../types';

const DELIVERY_COLLECTION = 'deliveries';

type DeliveryDoc = {
  orderId?: string;
  customerName?: string;
  address?: string;
  status?: Delivery['status'];
  assignedDriverId?: string;
  latitude?: number;
  longitude?: number;
  priority?: number;
  travelTimePriority?: number;
  createdAt?: {toMillis?: () => number};
};

export const subscribeToDriverDeliveries = (
  driverId: string,
  onUpdate: (items: Delivery[]) => void,
): (() => void) =>
  firestore()
    .collection(DELIVERY_COLLECTION)
    .where('assignedDriverId', '==', driverId)
    .onSnapshot(snapshot => {
      const deliveries = snapshot.docs
        .map(document => {
          const raw = document.data() as DeliveryDoc;
          return {
            id: document.id,
            orderId: raw.orderId ?? document.id,
            customerName: raw.customerName ?? 'Unknown Customer',
            address: raw.address ?? 'Address unavailable',
            status: raw.status ?? 'pending',
            assignedDriverId: raw.assignedDriverId ?? '',
            latitude: raw.latitude ?? 0,
            longitude: raw.longitude ?? 0,
            priority: raw.priority ?? 1,
            travelTimePriority: raw.travelTimePriority ?? 1,
            createdAt: raw.createdAt?.toMillis?.() ?? 0,
          } satisfies Delivery;
        })
        .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));

      onUpdate(deliveries);
    });

export const markDeliveryAsDelivered = async (deliveryId: string): Promise<void> => {
  await firestore().collection(DELIVERY_COLLECTION).doc(deliveryId).update({
    status: 'delivered',
    deliveredAt: firestore.FieldValue.serverTimestamp(),
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });
};

export const createSampleDeliveries = async (driverId: string): Promise<void> => {
  const sample = [
    {
      orderId: `IS-${Date.now().toString().slice(-6)}-01`,
      customerName: 'Rohan Mehta',
      address: 'DLF Phase 3, Gurugram',
      status: 'pending' as const,
      latitude: 28.4961,
      longitude: 77.0892,
      priority: 2,
      travelTimePriority: 1,
    },
    {
      orderId: `IS-${Date.now().toString().slice(-6)}-02`,
      customerName: 'Asha Verma',
      address: 'Sector 50, Noida',
      status: 'out_for_delivery' as const,
      latitude: 28.5707,
      longitude: 77.3684,
      priority: 1,
      travelTimePriority: 2,
    },
    {
      orderId: `IS-${Date.now().toString().slice(-6)}-03`,
      customerName: 'Neha Kapoor',
      address: 'Rajouri Garden, Delhi',
      status: 'pending' as const,
      latitude: 28.6463,
      longitude: 77.1166,
      priority: 3,
      travelTimePriority: 1,
    },
  ];

  const batch = firestore().batch();
  sample.forEach(item => {
    const reference = firestore().collection(DELIVERY_COLLECTION).doc();
    batch.set(reference, {
      ...item,
      assignedDriverId: driverId,
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();
};
