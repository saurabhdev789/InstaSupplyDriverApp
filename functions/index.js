const admin = require('firebase-admin');
const functions = require('firebase-functions');

admin.initializeApp();

exports.notifyDriverOnNewDelivery = functions.firestore
  .document('deliveries/{deliveryId}')
  .onCreate(async snapshot => {
    const delivery = snapshot.data();
    const assignedDriverId = delivery?.assignedDriverId;

    if (!assignedDriverId) {
      console.log('No assignedDriverId found. Skipping notification.');
      return;
    }

    const driverDoc = await admin.firestore().collection('drivers').doc(assignedDriverId).get();
    const token = driverDoc.get('fcmToken');

    if (!token) {
      console.log(`No FCM token for driver ${assignedDriverId}.`);
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
        screen: 'Deliveries',
      },
      android: {
        priority: 'high',
      },
    };

    await admin.messaging().send(message);
    console.log(`Notification sent to driver ${assignedDriverId}.`);
  });

