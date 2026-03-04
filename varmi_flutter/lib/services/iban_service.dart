import '../models/iban_model.dart';
import '../services/api_service.dart';

class IbanService {
  final ApiService _api = apiService;

  /// Tüm kayıtlı IBAN'ları getir
  Future<List<IbanModel>> getIbans() async {
    final response = await _api.get('/api/ibans');
    final data = response.data;
    final List<dynamic> list = (data is Map && data['ibans'] is List)
        ? data['ibans'] as List
        : (data is List ? data : []);
    return list.map((e) => IbanModel.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Yeni IBAN ekle
  Future<void> addIban({
    required String title,
    required String bankName,
    required String iban,
    required String accountHolderName,
    bool isDefault = false,
  }) async {
    await _api.post('/api/ibans', data: {
      'title': title,
      'bankName': bankName,
      'iban': iban,
      'accountHolderName': accountHolderName,
      'isDefault': isDefault,
    });
  }

  /// Varsayılan IBAN olarak işaretle
  Future<void> setDefault(String ibanId) async {
    await _api.patch('/api/ibans/$ibanId/default', data: {});
  }

  /// IBAN sil
  Future<void> deleteIban(String ibanId) async {
    await _api.delete('/api/ibans/$ibanId');
  }
}
