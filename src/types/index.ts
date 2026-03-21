export type DeliveryStatus = 'pending' | 'out_for_delivery' | 'delivered';

export type Delivery = {
  id: string;
  orderId: string;
  customerName: string;
  address: string;
  status: DeliveryStatus;
  assignedDriverId: string;
  latitude: number;
  longitude: number;
  priority?: number;
  travelTimePriority?: number;
  createdAt?: number;
};

export type RouteStop = Delivery & {
  sequence: number;
  distanceKm: number;
  estimatedTravelMinutes: number;
  trafficMultiplier: number;
};
