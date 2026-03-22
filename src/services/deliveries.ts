import firestore from '@react-native-firebase/firestore';

import { Delivery } from '../types';

const DELIVERY_COLLECTION = 'deliveries';

type Coordinates = {
  latitude: number;
  longitude: number;
};

const MIN_COORDINATE_GAP = 0.00035;
const MAX_LOCATION_ATTEMPTS = 24;

const randomOffset = (): number => {
  const sign = Math.random() >= 0.5 ? 1 : -1;
  const magnitude = 0.001 + Math.random() * 0.0025;
  return sign * magnitude;
};

const isTooClose = (from: Coordinates, to: Coordinates, minGap = MIN_COORDINATE_GAP): boolean =>
  Math.abs(from.latitude - to.latitude) < minGap &&
  Math.abs(from.longitude - to.longitude) < minGap;

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
  createdAt?: { toMillis?: () => number };
};

export const subscribeToDriverDeliveries = (
  driverId: string,
  onUpdate: (items: Delivery[]) => void,
): (() => void) =>
  firestore()
    .collection(DELIVERY_COLLECTION)
    .where('assignedDriverId', '==', driverId)
    .onSnapshot(snapshot => {
      const docs = snapshot?.docs ?? [];
      const deliveries = docs
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

export const subscribeToDriverTokenDeliveries = (
  driverFcmToken: string,
  onUpdate: (items: Delivery[]) => void,
): (() => void) =>
  firestore()
    .collection(DELIVERY_COLLECTION)
    .where('driverFcmToken', '==', driverFcmToken)
    .onSnapshot(snapshot => {
      const docs = snapshot?.docs ?? [];
      const deliveries = docs
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

export const markDeliveryAsDelivered = async (
  deliveryId: string,
): Promise<void> => {
  await firestore().collection(DELIVERY_COLLECTION).doc(deliveryId).update({
    status: 'delivered',
    deliveredAt: firestore.FieldValue.serverTimestamp(),
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });
};

export const createSampleDeliveries = async (
  driverId: string,
  baseLocation?: Coordinates,
): Promise<void> => {
  const anchor = baseLocation ?? {
    latitude: 28.6139,
    longitude: 77.209,
  };

  const nearbyStops = [
    {
      latitude: anchor.latitude + 0.006,
      longitude: anchor.longitude + 0.004,
      address: 'Nearby stop (north-east)',
    },
    {
      latitude: anchor.latitude - 0.005,
      longitude: anchor.longitude + 0.003,
      address: 'Nearby stop (south-east)',
    },
    {
      latitude: anchor.latitude + 0.002,
      longitude: anchor.longitude - 0.006,
      address: 'Nearby stop (west)',
    },
  ];

  const sample = [
    {
      orderId: `IS-${Date.now().toString().slice(-6)}-01`,
      customerName: 'Rohan Mehta',
      address: nearbyStops[0].address,
      status: 'pending' as const,
      latitude: nearbyStops[0].latitude,
      longitude: nearbyStops[0].longitude,
      priority: 2,
      travelTimePriority: 1,
    },
    {
      orderId: `IS-${Date.now().toString().slice(-6)}-02`,
      customerName: 'Asha Verma',
      address: nearbyStops[1].address,
      status: 'out_for_delivery' as const,
      latitude: nearbyStops[1].latitude,
      longitude: nearbyStops[1].longitude,
      priority: 1,
      travelTimePriority: 2,
    },
    {
      orderId: `IS-${Date.now().toString().slice(-6)}-03`,
      customerName: 'Neha Kapoor',
      address: nearbyStops[2].address,
      status: 'pending' as const,
      latitude: nearbyStops[2].latitude,
      longitude: nearbyStops[2].longitude,
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

type CreatedDeliveryMeta = {
  id: string;
  orderId: string;
};

export const createNewDelivery = async (
  driverId: string,
  location?: Coordinates,
): Promise<CreatedDeliveryMeta> => {
  const anchor = location ?? {
    latitude: 28.6139,
    longitude: 77.209,
  };

  const snapshot = await firestore()
    .collection(DELIVERY_COLLECTION)
    .where('assignedDriverId', '==', driverId)
    .get();

  const existingPoints = snapshot.docs.map(document => {
    const raw = document.data() as DeliveryDoc;
    return {
      latitude: raw.latitude ?? 0,
      longitude: raw.longitude ?? 0,
    } satisfies Coordinates;
  });

  let selectedCoordinates: Coordinates | undefined;
  for (let attempt = 0; attempt < MAX_LOCATION_ATTEMPTS; attempt += 1) {
    const candidate = {
      latitude: anchor.latitude + randomOffset(),
      longitude: anchor.longitude + randomOffset(),
    } satisfies Coordinates;

    if (isTooClose(candidate, anchor)) {
      continue;
    }

    const overlapsExisting = existingPoints.some(point => isTooClose(candidate, point));
    if (overlapsExisting) {
      continue;
    }

    selectedCoordinates = candidate;
    break;
  }

  const finalCoordinates = selectedCoordinates ?? {
    latitude: anchor.latitude + 0.0045,
    longitude: anchor.longitude - 0.0045,
  };

  const orderId = `IS-${Date.now()}`;
  const reference = await firestore()
    .collection(DELIVERY_COLLECTION)
    .add({
      orderId,
      customerName: 'New Customer',
      address: 'Nearby stop (current area)',
      status: 'pending',
      assignedDriverId: driverId,
      latitude: finalCoordinates.latitude,
      longitude: finalCoordinates.longitude,
      priority: 1,
      travelTimePriority: 1,
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });

  return {id: reference.id, orderId};
};
