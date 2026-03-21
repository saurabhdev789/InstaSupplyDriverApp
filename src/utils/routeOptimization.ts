import {Delivery, RouteStop} from '../types';

type Coordinate = {
  latitude: number;
  longitude: number;
};

const EARTH_RADIUS_KM = 6371;
const BASE_SPEED_KMPH = 28;

const toRadians = (value: number): number => (value * Math.PI) / 180;

const haversineKm = (from: Coordinate, to: Coordinate): number => {
  const latDiff = toRadians(to.latitude - from.latitude);
  const lonDiff = toRadians(to.longitude - from.longitude);

  const a =
    Math.sin(latDiff / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.sin(lonDiff / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
};

const deterministicHash = (value: string): number => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
};

const computeTrafficMultiplier = (delivery: Delivery): number => {
  const hour = new Date().getHours();
  const peakHourMultiplier =
    (hour >= 8 && hour <= 11) || (hour >= 17 && hour <= 21) ? 1.45 : 1.0;
  const localVariance = 1 + (deterministicHash(delivery.orderId ?? delivery.id) % 15) / 100;
  return peakHourMultiplier * localVariance;
};

const estimateTravelMinutes = (distanceKm: number, trafficMultiplier: number): number => {
  if (distanceKm <= 0) {
    return 0;
  }

  const rawMinutes = (distanceKm / BASE_SPEED_KMPH) * 60;
  return rawMinutes * trafficMultiplier;
};

const weightedScore = (
  distanceKm: number,
  estimatedTravelMinutes: number,
  trafficMultiplier: number,
  travelTimePriority: number,
): number => {
  const travelPriorityWeight = 1 / Math.max(travelTimePriority, 1);
  return (
    distanceKm * 0.5 +
    estimatedTravelMinutes * 0.4 * travelPriorityWeight +
    (trafficMultiplier - 1) * 8
  );
};

export const optimizeRoute = (
  deliveries: Delivery[],
  driverLocation: Coordinate,
): RouteStop[] => {
  const pending = deliveries.filter(item => item.status !== 'delivered');

  if (pending.length === 0) {
    return [];
  }

  const remaining = [...pending];
  const route: RouteStop[] = [];
  let cursor = {...driverLocation};

  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestScore = Number.POSITIVE_INFINITY;

    for (let index = 0; index < remaining.length; index += 1) {
      const candidate = remaining[index];
      const candidatePosition = {
        latitude: candidate.latitude,
        longitude: candidate.longitude,
      };
      const distanceKm = haversineKm(cursor, candidatePosition);
      const trafficMultiplier = computeTrafficMultiplier(candidate);
      const estimatedTravelMinutes = estimateTravelMinutes(distanceKm, trafficMultiplier);
      const score = weightedScore(
        distanceKm,
        estimatedTravelMinutes,
        trafficMultiplier,
        candidate.travelTimePriority ?? 1,
      );

      if (score < bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    }

    const nextStop = remaining.splice(bestIndex, 1)[0];
    const distanceKm = haversineKm(cursor, {
      latitude: nextStop.latitude,
      longitude: nextStop.longitude,
    });
    const trafficMultiplier = computeTrafficMultiplier(nextStop);
    const estimatedTravelMinutes = estimateTravelMinutes(distanceKm, trafficMultiplier);

    route.push({
      ...nextStop,
      sequence: route.length + 1,
      distanceKm,
      estimatedTravelMinutes,
      trafficMultiplier,
    });

    cursor = {
      latitude: nextStop.latitude,
      longitude: nextStop.longitude,
    };
  }

  return route;
};
