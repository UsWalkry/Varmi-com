import '../models/user.dart';
import '../config/api_config.dart';
import 'api_service.dart';

class AuthService {
  final ApiService _api = apiService;

  // Register
  Future<Map<String, dynamic>> register({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
    required String phone,
    String? city,
  }) async {
    final response = await _api.post(
      '${ApiConfig.authEndpoint}/register',
      data: {
        'email': email,
        'password': password,
        'firstName': firstName,
        'lastName': lastName,
        'phone': phone,
        if (city != null) 'city': city,
      },
    );

    if (response.data['token'] != null) {
      await _api.setToken(response.data['token']);
    }

    return response.data;
  }

  // Login
  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    final response = await _api.post(
      '${ApiConfig.authEndpoint}/login',
      data: {
        'email': email,
        'password': password,
      },
    );

    if (response.data['token'] != null) {
      await _api.setToken(response.data['token']);
    }

    return response.data;
  }

  // Logout
  Future<void> logout() async {
    await _api.clearToken();
  }

  // Get Current User
  Future<User> getCurrentUser() async {
    final response = await _api.get('${ApiConfig.authEndpoint}/me');
    return User.fromJson(response.data['user'] ?? response.data);
  }

  // Update Profile
  Future<User> updateProfile({
    String? firstName,
    String? lastName,
    String? phone,
    String? city,
    String? gender,
    DateTime? birthDate,
    String? addressLine1,
    String? district,
    String? postalCode,
  }) async {
    final response = await _api.put(
      '${ApiConfig.authEndpoint}/profile',
      data: {
        if (firstName != null) 'firstName': firstName,
        if (lastName != null) 'lastName': lastName,
        if (phone != null) 'phone': phone,
        if (city != null) 'city': city,
        if (gender != null) 'gender': gender,
        if (birthDate != null) 'birthDate': birthDate.toIso8601String(),
        if (addressLine1 != null) 'addressLine1': addressLine1,
        if (district != null) 'district': district,
        if (postalCode != null) 'postalCode': postalCode,
      },
    );

    return User.fromJson(response.data['user'] ?? response.data);
  }

  // Upload Avatar
  Future<String> uploadAvatar(String imagePath) async {
    final response = await _api.uploadFile(
      '${ApiConfig.authEndpoint}/avatar',
      imagePath,
      fieldName: 'avatar',
    );

    return response.data['avatar_url'] ?? response.data['avatarUrl'] ?? '';
  }

  // Change Password
  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    await _api.put(
      '${ApiConfig.authEndpoint}/change-password',
      data: {
        'currentPassword': currentPassword,
        'newPassword': newPassword,
      },
    );
  }

  // Request Email Verification
  Future<void> requestEmailVerification() async {
    await _api.post('${ApiConfig.authEndpoint}/request-verification');
  }

  // Verify Email
  Future<void> verifyEmail(String token) async {
    await _api.post(
      '${ApiConfig.authEndpoint}/verify-email',
      data: {'token': token},
    );
  }

  // Forgot Password
  Future<void> forgotPassword(String email) async {
    await _api.post(
      '${ApiConfig.authEndpoint}/forgot-password',
      data: {'email': email},
    );
  }

  // Reset Password
  Future<void> resetPassword({
    required String token,
    required String newPassword,
  }) async {
    await _api.post(
      '${ApiConfig.authEndpoint}/reset-password',
      data: {
        'token': token,
        'newPassword': newPassword,
      },
    );
  }

  // Enable 2FA (Email)
  Future<void> enableEmail2FA() async {
    await _api.post('${ApiConfig.authEndpoint}/2fa/email/enable');
  }

  // Disable 2FA
  Future<void> disable2FA(String password) async {
    await _api.post(
      '${ApiConfig.authEndpoint}/2fa/disable',
      data: {'password': password},
    );
  }

  // Verify 2FA Code
  Future<Map<String, dynamic>> verify2FACode({
    required String email,
    required String code,
  }) async {
    final response = await _api.post(
      '${ApiConfig.authEndpoint}/2fa/verify',
      data: {
        'email': email,
        'code': code,
      },
    );

    if (response.data['token'] != null) {
      await _api.setToken(response.data['token']);
    }

    return response.data;
  }
}
