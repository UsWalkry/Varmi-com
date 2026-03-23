import 'dart:async';
import 'package:flutter/foundation.dart';
import '../models/notification.dart';
import '../services/notification_service.dart';
import '../services/local_notification_service.dart';

class NotificationProvider with ChangeNotifier {
  final NotificationService _service = NotificationService();
  final LocalNotificationService _localNotif = LocalNotificationService();

  List<AppNotification> _notifications = [];
  int _unreadCount = 0;
  bool _isLoading = false;

  // Polling
  Timer? _pollingTimer;
  Set<String> _knownIds = {};
  bool _initialLoadDone = false;

  List<AppNotification> get notifications => _notifications;
  int get unreadCount => _unreadCount;
  bool get isLoading => _isLoading;

  /// Kullanıcı giriş yaptıktan sonra çağır — 30 sn'de bir yeni bildirim kontrol eder
  void startPolling() {
    _pollingTimer?.cancel();
    _pollingTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      _pollForNewNotifications();
    });
  }

  /// Kullanıcı çıkış yapınca çağır
  void stopPolling() {
    _pollingTimer?.cancel();
    _pollingTimer = null;
    _knownIds = {};
    _initialLoadDone = false;
  }

  Future<void> loadNotifications() async {
    _isLoading = true;
    notifyListeners();

    try {
      final fetched = await _service.getNotifications();

      if (!_initialLoadDone) {
        // İlk yükleme: mevcut bildirimleri bilinen olarak işaretle, ekrana çıkarma
        _knownIds = fetched.map((n) => n.id).toSet();
        _initialLoadDone = true;
        // İlk başarılı yükleme sonrası polling'i otomatik başlat
        startPolling();
      } else {
        // Sonraki yüklemelerde yeni gelenleri telefona gönder
        await _showNewNotifications(fetched);
      }

      _notifications = fetched;
      _unreadCount = fetched.where((n) => !n.isRead).length;
    } catch (_) {}

    _isLoading = false;
    notifyListeners();
  }

  Future<void> _pollForNewNotifications() async {
    try {
      final fetched = await _service.getNotifications();

      if (!_initialLoadDone) {
        _knownIds = fetched.map((n) => n.id).toSet();
        _initialLoadDone = true;
      } else {
        await _showNewNotifications(fetched);
      }

      _notifications = fetched;
      _unreadCount = fetched.where((n) => !n.isRead).length;
      notifyListeners();
    } catch (_) {}
  }

  Future<void> _showNewNotifications(List<AppNotification> fetched) async {
    final newOnes = fetched.where((n) => !_knownIds.contains(n.id)).toList();
    for (final n in newOnes) {
      await _localNotif.showNotification(
        notificationId: n.id,
        title: n.title,
        body: n.message,
      );
      _knownIds.add(n.id);
    }
  }

  Future<void> markAsRead(String id) async {
    await _service.markAsRead(id);
    _notifications = _notifications.map((n) {
      if (n.id == id) {
        return AppNotification(
          id: n.id,
          title: n.title,
          message: n.message,
          type: n.type,
          isRead: true,
          listingId: n.listingId,
          offerId: n.offerId,
          createdAt: n.createdAt,
        );
      }
      return n;
    }).toList();
    _unreadCount = _notifications.where((n) => !n.isRead).length;
    notifyListeners();
  }

  Future<void> markAllAsRead() async {
    await _service.markAllAsRead();
    _notifications = _notifications.map((n) => AppNotification(
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type,
      isRead: true,
      listingId: n.listingId,
      offerId: n.offerId,
      createdAt: n.createdAt,
    )).toList();
    _unreadCount = 0;
    notifyListeners();
  }

  void reset() {
    stopPolling();
    _notifications = [];
    _unreadCount = 0;
    notifyListeners();
  }

  @override
  void dispose() {
    stopPolling();
    super.dispose();
  }
}

