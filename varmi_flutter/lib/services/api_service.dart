import 'dart:io';
import 'package:dio/dio.dart';
import 'package:dio/io.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http_parser/http_parser.dart';
import 'package:image_picker/image_picker.dart';
import '../config/api_config.dart';

class ApiService {
  late final Dio _dio;
  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  String? _authToken;

  ApiService() {
    _dio = Dio(
      BaseOptions(
        baseUrl: ApiConfig.baseUrl,
        connectTimeout: ApiConfig.connectionTimeout,
        receiveTimeout: ApiConfig.receiveTimeout,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Accept': 'application/json',
        },
      ),
    );

    // Emulator/debug modda self-signed SSL sertifikasını kabul et
    if (ApiConfig.isEmulator || !ApiConfig.isProduction) {
      (_dio.httpClientAdapter as IOHttpClientAdapter).createHttpClient = () {
        final client = HttpClient();
        client.badCertificateCallback = (cert, host, port) => true;
        return client;
      };
    }

    // Interceptor for logging and token handling
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          // Token yoksa storage'dan yükle (örn: sayfa yenilenmesinde)
          if (_authToken == null) {
            try {
              _authToken = await _storage.read(key: ApiConfig.tokenKey);
            } catch (e) {
              // BAD_DECRYPT: Keystore invalidated after reinstall — clear corrupted data
              try { await _storage.deleteAll(); } catch (_) {}
              _authToken = null;
            }
          }
          if (_authToken != null) {
            options.headers['Authorization'] = 'Bearer $_authToken';
          }
          print('🌐 ${options.method} ${options.path}');
          return handler.next(options);
        },
        onResponse: (response, handler) {
          print('✅ ${response.statusCode} ${response.requestOptions.path}');
          return handler.next(response);
        },
        onError: (error, handler) async {
          print('❌ Error: ${error.requestOptions.path}');
          print('   Message: ${error.message}');
          
          // Handle 401 Unauthorized
          if (error.response?.statusCode == 401) {
            await clearToken();
            // You can emit an event here to navigate to login
          }
          
          return handler.next(error);
        },
      ),
    );
  }

  // Token Management
  Future<void> setToken(String token) async {
    _authToken = token;
    await _storage.write(key: ApiConfig.tokenKey, value: token);
  }

  Future<String?> getToken() async {
    if (_authToken == null) {
      try {
        _authToken = await _storage.read(key: ApiConfig.tokenKey);
      } catch (e) {
        try { await _storage.deleteAll(); } catch (_) {}
        _authToken = null;
      }
    }
    return _authToken;
  }

  Future<void> clearToken() async {
    _authToken = null;
    await _storage.delete(key: ApiConfig.tokenKey);
    await _storage.delete(key: ApiConfig.userKey);
  }

  Future<bool> hasToken() async {
    final token = await getToken();
    return token != null && token.isNotEmpty;
  }

  // Generic HTTP Methods
  Future<Response> get(
    String path, {
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    try {
      return await _dio.get(
        path,
        queryParameters: queryParameters,
        options: options,
      );
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<Response> post(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    try {
      return await _dio.post(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
      );
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<Response> put(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    try {
      return await _dio.put(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
      );
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<Response> delete(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    try {
      return await _dio.delete(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
      );
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<Response> patch(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    try {
      return await _dio.patch(
        path,
        data: data,
        queryParameters: queryParameters,
        options: options,
      );
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  // File Upload
  Future<Response> uploadFile(
    String path,
    String filePath, {
    String fieldName = 'file',
    Map<String, dynamic>? additionalData,
    ProgressCallback? onSendProgress,
  }) async {
    try {
      final formData = FormData.fromMap({
        fieldName: await MultipartFile.fromFile(filePath),
        ...?additionalData,
      });

      return await _dio.post(
        path,
        data: formData,
        onSendProgress: onSendProgress,
        options: Options(
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        ),
      );
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  // Multiple File Upload
  Future<Response> uploadFiles(
    String path,
    List<String> filePaths, {
    String fieldName = 'images',
    Map<String, dynamic>? additionalData,
    ProgressCallback? onSendProgress,
  }) async {
    try {
      final files = await Future.wait(
        filePaths.map((path) => MultipartFile.fromFile(path)),
      );

      final formData = FormData.fromMap({
        fieldName: files,
        ...?additionalData,
      });

      return await _dio.post(
        path,
        data: formData,
        onSendProgress: onSendProgress,
        options: Options(
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        ),
      );
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  // Dosya adından MediaType belirler
  MediaType _mediaTypeFromFilename(String filename) {
    final ext = filename.split('.').last.toLowerCase();
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return MediaType('image', 'jpeg');
      case 'png':
        return MediaType('image', 'png');
      case 'webp':
        return MediaType('image', 'webp');
      default:
        return MediaType('image', 'jpeg');
    }
  }

  // Multiple File Upload (Web-safe, uses XFile bytes)
  Future<Response> uploadXFiles(
    String path,
    List<XFile> xFiles, {
    String fieldName = 'images',
    ProgressCallback? onSendProgress,
  }) async {
    try {
      final formData = FormData();
      for (final xFile in xFiles) {
        final bytes = await xFile.readAsBytes();
        // MIME tipini belirle — multer backendde MIME type kontrolü yapıyor
        MediaType contentType;
        final mimeStr = xFile.mimeType;
        if (mimeStr != null && mimeStr.contains('/')) {
          final parts = mimeStr.split('/');
          contentType = MediaType(parts[0], parts[1]);
        } else {
          contentType = _mediaTypeFromFilename(xFile.name);
        }
        formData.files.add(MapEntry(
          fieldName,
          MultipartFile.fromBytes(
            bytes,
            filename: xFile.name,
            contentType: contentType,
          ),
        ));
      }

      return await _dio.post(
        path,
        data: formData,
        onSendProgress: onSendProgress,
      );
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  // Error Handling
  Exception _handleError(DioException error) {
    String message = 'Bir hata oluştu';

    if (error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout) {
      message = 'Bağlantı zaman aşımına uğradı';
    } else if (error.type == DioExceptionType.connectionError) {
      message = 'İnternet bağlantınızı kontrol edin';
    } else if (error.response != null) {
      final statusCode = error.response!.statusCode;
      final responseData = error.response!.data;

      if (statusCode == 401) {
        message = 'Oturum süreniz doldu, lütfen tekrar giriş yapın';
      } else if (statusCode == 403) {
        message = 'Bu işlem için yetkiniz yok';
      } else if (statusCode == 404) {
        message = 'İstenen kaynak bulunamadı';
      } else if (statusCode == 422) {
        if (responseData is Map && responseData['message'] != null) {
          message = responseData['message'];
        } else {
          message = 'Gönderilen veriler geçersiz';
        }
      } else if (statusCode! >= 500) {
        message = 'Sunucu hatası oluştu';
      }

      // Try to get error message from response
      if (responseData is Map) {
        if (responseData['error'] != null) {
          message = responseData['error'].toString();
        } else if (responseData['message'] != null) {
          message = responseData['message'].toString();
        }
      }
    }

    return Exception(message);
  }
}

// Global instance
final apiService = ApiService();
