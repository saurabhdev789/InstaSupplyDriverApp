import {NextRequest, NextResponse} from 'next/server';
import {FieldValue} from 'firebase-admin/firestore';

import {getAdminDb} from '../../../lib/firebaseAdmin';

type Body = {
  pushToken?: string;
};

const testDropLocation = {
  latitude: 30.1456,
  longitude: 74.199,
};

export async function POST(request: NextRequest) {
  try {
    const adminDb = getAdminDb();

    const expectedApiKey = process.env.PUSH_TESTER_API_KEY;
    if (expectedApiKey) {
      const providedApiKey = request.headers.get('x-api-key');
      if (!providedApiKey || providedApiKey !== expectedApiKey) {
        return NextResponse.json({error: 'Unauthorized'}, {status: 401});
      }
    }

    const body = (await request.json()) as Body;
    const pushToken = body.pushToken?.trim();

    if (!pushToken) {
      return NextResponse.json({error: 'Push token is required.'}, {status: 400});
    }

    const driverByTokenSnapshot = await adminDb
      .collection('drivers')
      .where('fcmToken', '==', pushToken)
      .limit(1)
      .get();

    const assignedDriverId = driverByTokenSnapshot.empty
      ? undefined
      : driverByTokenSnapshot.docs[0].id;

    const orderId = `WEB-TEST-${Date.now()}`;
    const created = await adminDb.collection('deliveries').add({
      orderId,
      customerName: 'Web Push Test',
      address: 'Web test drop',
      status: 'pending',
      assignedDriverId,
      driverFcmToken: pushToken,
      latitude: testDropLocation.latitude,
      longitude: testDropLocation.longitude,
      priority: 1,
      travelTimePriority: 1,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      ok: true,
      id: created.id,
      orderId,
      assignedDriverIdResolved: Boolean(assignedDriverId),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create delivery.';
    return NextResponse.json({error: message}, {status: 500});
  }
}
