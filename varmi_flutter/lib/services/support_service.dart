import '../services/api_service.dart';

class SupportService {
  final ApiService _api = apiService;

  Future<void> sendSupportRequest({
    required String name,
    required String email,
    String? phone,
    required String category,
    required String subject,
    required String message,
  }) async {
    await _api.post('/api/support/contact', {
      'name': name,
      'email': email,
      if (phone != null && phone.isNotEmpty) 'phone': phone,
      'category': category,
      'subject': subject,
      'message': message,
    });
  }
}
