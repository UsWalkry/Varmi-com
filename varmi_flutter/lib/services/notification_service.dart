import '../services/api_service.dart';
import '../models/notification.dart';

class NotificationService {
  final ApiService _api = apiService;

  Future<List<AppNotification>> getNotifications() async {
    try {
      final response = await _api.get('/api/notifications');
      final data = response.data;
      List<dynamic> list;
      if (data is List) {
        list = data;
      } else if (data['notifications'] is List) {
        list = data['notifications'];
      } else if (data['data'] is List) {
        list = data['data'];
      } else {
        list = [];
      }
      return list.map((e) => AppNotification.fromJson(e)).toList();
    } catch (e) {
      return [];
    }
  }

  Future<int> getUnreadCount() async {
    try {
      final response = await _api.get('/api/notifications/unread-count');
      final data = response.data;
      return data['count'] ?? data['unread_count'] ?? 0;
    } catch (e) {
      return 0;
    }
  }

  Future<void> markAsRead(String id) async {
    try {
      await _api.put('/api/notifications/$id/read', {});
    } catch (_) {}
  }

  Future<void> markAllAsRead() async {
    try {
      await _api.put('/api/notifications/mark-all-read', {});
    } catch (_) {}
  }
}
