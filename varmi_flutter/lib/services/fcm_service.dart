import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'local_notification_service.dart';

/// Background message handler — must be a top-level function
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // Firebase must be initialised again in the background isolate
  await Firebase.initializeApp();
  final localNotif = LocalNotificationService();
  await localNotif.initialize();
  await localNotif.showNotification(
    notificationId: message.messageId ?? DateTime.now().millisecondsSinceEpoch.toString(),
    title: message.notification?.title ?? 'Varmi',
    body: message.notification?.body ?? '',
  );
}

/// Registers the background handler — call this before Firebase.initializeApp()
void registerFcmBackgroundHandler() {
  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
}

class FcmService {
  static final FcmService _instance = FcmService._internal();
  factory FcmService() => _instance;
  FcmService._internal();

  final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  String? _fcmToken;

  String? get fcmToken => _fcmToken;

  Future<void> initialize() async {
    // Request permission (Android 13+ / iOS)
    final settings = await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    if (settings.authorizationStatus == AuthorizationStatus.authorized ||
        settings.authorizationStatus == AuthorizationStatus.provisional) {
      _fcmToken = await _messaging.getToken();
      print('📱 FCM Token: ${_fcmToken?.substring(0, 20)}...');

      // Keep token fresh
      _messaging.onTokenRefresh.listen((newToken) {
        _fcmToken = newToken;
        print('📱 FCM Token refreshed');
      });
    }

    // Show notification when app is in the foreground
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      final notif = message.notification;
      if (notif != null) {
        LocalNotificationService().showNotification(
          notificationId: message.messageId ?? DateTime.now().millisecondsSinceEpoch.toString(),
          title: notif.title ?? 'Varmi',
          body: notif.body ?? '',
        );
      }
    });
  }
}
