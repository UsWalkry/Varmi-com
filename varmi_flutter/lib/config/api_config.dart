class ApiConfig {
  // Production URL - deployment için
  static const String productionUrl = 'https://varmii.com';
  
  // Development URL - local test için (web)
  static const String developmentUrl = 'http://localhost:8787';

  // Emulator URL - Android emulator host makinesine 10.0.2.2 ile ulaşır
  static const String emulatorUrl = 'https://varmii.com';

  // Physical device URL - production sunucusunu kullan (LAN sunucu dışa kapalıysa)
  // LAN testi için: 'http://192.168.1.102:8787' (sunucuda 0.0.0.0 dinlemeli + ufw allow 8787)
  static const String physicalUrl = 'https://varmii.com';
  
  // Aktif ortam
  static const bool isProduction = bool.fromEnvironment('dart.vm.product') ||
      bool.fromEnvironment('PRODUCTION', defaultValue: false);

  // Emulator modu: --dart-define=EMULATOR=true
  static const bool isEmulator = bool.fromEnvironment('EMULATOR', defaultValue: false);

  // Physical device modu: --dart-define=PHYSICAL=true
  static const bool isPhysical = bool.fromEnvironment('PHYSICAL', defaultValue: false);
  
  // Kullanılacak base URL
  static String get baseUrl {
    if (isProduction) return productionUrl;
    if (isEmulator) return emulatorUrl;
    if (isPhysical) return physicalUrl;
    return developmentUrl;
  }
  
  // API Endpoints
  static const String authEndpoint = '/api/auth';
  static const String listingsEndpoint = '/api/listings';
  static const String offersEndpoint = '/api/offers';
  static const String ordersEndpoint = '/api/orders';
  static const String usersEndpoint = '/api/users';
  static const String notificationsEndpoint = '/api/notifications';
  static const String favoritesEndpoint = '/api/favorites';
  static const String commentsEndpoint = '/api/comments';
  static const String commissionEndpoint = '/api/commission';
  static const String adminEndpoint = '/api/admin';
  static const String addressesEndpoint = '/api/addresses';
  
  // Timeout ayarları
  static const Duration connectionTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);
  
  // Storage keys
  static const String tokenKey = 'mysql-auth-token';
  static const String userKey = 'user_data';
  static const String fcmTokenKey = 'fcm_token';
  
  // Image upload
  static const int maxImageSize = 5 * 1024 * 1024; // 5MB
  static const List<String> allowedImageTypes = ['jpg', 'jpeg', 'png', 'webp'];
  
  // Pagination
  static const int defaultPageSize = 20;
  
  // Image base URL
  static String get imageBaseUrl => '$baseUrl/uploads';
  
  // Helper method to get full image URL
  static String getImageUrl(String? imagePath) {
    if (imagePath == null || imagePath.isEmpty) return '';
    if (imagePath.startsWith('http')) return imagePath;
    return '$imageBaseUrl/$imagePath';
  }
}
