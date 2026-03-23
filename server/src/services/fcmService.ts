import admin from 'firebase-admin';

let _initialized = false;

function getApp(): admin.app.App {
  if (_initialized) return admin.app();

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountJson) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT env variable is not set');
  }

  let serviceAccount: admin.ServiceAccount;
  try {
    serviceAccount = JSON.parse(serviceAccountJson) as admin.ServiceAccount;
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is not valid JSON');
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  _initialized = true;
  return admin.app();
}

/**
 * Send a push notification to a single FCM device token.
 * Silently swallows errors so callers don't need try/catch.
 */
export async function sendPushNotification(
  fcmToken: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  if (!fcmToken) return;

  // If Firebase is not configured, skip gracefully
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.log('ℹ️ FCM skipped — FIREBASE_SERVICE_ACCOUNT not configured');
    return;
  }

  try {
    const app = getApp();
    await app.messaging().send({
      token: fcmToken,
      notification: { title, body },
      data,
      android: {
        priority: 'high',
        notification: {
          channelId: 'varmi_notifications',
          sound: 'default',
        },
      },
    });
    console.log(`📲 FCM push sent to: ${fcmToken.substring(0, 20)}...`);
  } catch (err: any) {
    // Token expired / device unregistered — clear it from DB
    if (
      err.code === 'messaging/registration-token-not-registered' ||
      err.code === 'messaging/invalid-registration-token'
    ) {
      console.log('⚠️ FCM token invalid, should be cleared from DB');
    } else {
      console.error('❌ FCM push error:', err?.message ?? err);
    }
  }
}
