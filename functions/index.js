const admin = require('firebase-admin');
const functions = require('firebase-functions/v1');

admin.initializeApp();

exports.notifyDriverOnNewDelivery = functions.firestore
  .document('deliveries/{deliveryId}')
  .onCreate(async snapshot => {
    const delivery = snapshot.data();
    const assignedDriverId = delivery?.assignedDriverId;
    const tokenFromDelivery = delivery?.driverFcmToken;

    if (!assignedDriverId && !tokenFromDelivery) {
      console.log('No assignedDriverId or driverFcmToken found. Skipping notification.');
      return;
    }

    let token = tokenFromDelivery;

    if (!token && assignedDriverId) {
      const driverDoc = await admin.firestore().collection('drivers').doc(assignedDriverId).get();
      token = driverDoc.get('fcmToken');
    }

    if (!token) {
      console.log(`No FCM token for delivery ${snapshot.id}.`);
      return;
    }

    const message = {
      token,
      notification: {
        title: 'New Delivery Assigned',
        body: `Order ${delivery.orderId ?? snapshot.id} is now assigned to you.`,
      },
      data: {
        deliveryId: snapshot.id,
        screen: 'OptimizedRoute',
      },
      android: {
        priority: 'high',
      },
    };

    await admin.messaging().send(message);
    console.log(`Notification sent to driver ${assignedDriverId}.`);
  });
