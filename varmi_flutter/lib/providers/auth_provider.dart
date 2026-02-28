import 'package:flutter/foundation.dart';
import '../models/user.dart';
import '../services/auth_service.dart';
import '../services/api_service.dart';

class AuthProvider with ChangeNotifier {
  final AuthService _authService = AuthService();
  final ApiService _apiService = apiService;

  User? _user;
  bool _isAuthenticated = false;
  bool _isLoading = true;
  String? _error;

  User? get user => _user;
  bool get isAuthenticated => _isAuthenticated;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isAdmin => _user?.isAdmin ?? false;

  AuthProvider() {
    _initAuth();
  }

  Future<void> _initAuth() async {
    _isLoading = true;
    notifyListeners();

    try {
      final hasToken = await _apiService.hasToken();
      if (hasToken) {
        await loadUser();
      }
    } catch (e) {
      print('Auth init error: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadUser() async {
    try {
      print('👤 Loading user...');
      _user = await _authService.getCurrentUser();
      _isAuthenticated = true;
      _error = null;
      print('✅ User loaded: ${_user?.email}');
    } catch (e) {
      print('❌ Load user error: $e');
      _user = null;
      _isAuthenticated = false;
      _error = e.toString();
      await _apiService.clearToken();
    }
    notifyListeners();
  }

  Future<bool> login({
    required String email,
    required String password,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      print('🔐 Login attempt for: $email');
      final response = await _authService.login(
        email: email,
        password: password,
      );

      print('✅ Login response: $response');

      // Check if 2FA is required
      if (response['requires2FA'] == true || response['requires_2fa'] == true) {
        print('⚠️ 2FA required');
        _isLoading = false;
        notifyListeners();
        return false; // Indicate 2FA is required
      }

      await loadUser();
      _isLoading = false;
      print('✅ Login successful');
      notifyListeners();
      return true;
    } catch (e) {
      print('❌ Login error: $e');
      _error = e.toString().replaceAll('Exception: ', '');
      _isLoading = false;
      _isAuthenticated = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> register({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
    required String phone,
    String? city,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _authService.register(
        email: email,
        password: password,
        firstName: firstName,
        lastName: lastName,
        phone: phone,
        city: city,
      );

      await loadUser();
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> verify2FA({
    required String email,
    required String code,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _authService.verify2FACode(
        email: email,
        code: code,
      );

      await loadUser();
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    await _authService.logout();
    _user = null;
    _isAuthenticated = false;
    _error = null;
    notifyListeners();
  }

  Future<bool> updateProfile({
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
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _user = await _authService.updateProfile(
        firstName: firstName,
        lastName: lastName,
        phone: phone,
        city: city,
        gender: gender,
        birthDate: birthDate,
        addressLine1: addressLine1,
        district: district,
        postalCode: postalCode,
      );

      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> uploadAvatar(String imagePath) async {
    _error = null;
    
    try {
      final avatarUrl = await _authService.uploadAvatar(imagePath);
      if (_user != null) {
        _user = _user!.copyWith(avatar: avatarUrl);
        notifyListeners();
      }
      return true;
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      notifyListeners();
      return false;
    }
  }

  Future<bool> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    _error = null;
    
    try {
      await _authService.changePassword(
        currentPassword: currentPassword,
        newPassword: newPassword,
      );
      return true;
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      notifyListeners();
      return false;
    }
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
