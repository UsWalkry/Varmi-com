import '../services/api_service.dart';
import '../models/address.dart';

class AddressService {
  final ApiService _api = apiService;

  Future<List<Address>> getAddresses() async {
    try {
      final response = await _api.get('/api/addresses');
      final data = response.data;
      List<dynamic> list;
      if (data is List) {
        list = data;
      } else if (data['addresses'] is List) {
        list = data['addresses'];
      } else if (data['data'] is List) {
        list = data['data'];
      } else {
        list = [];
      }
      return list.map((e) => Address.fromJson(e)).toList();
    } catch (e) {
      return [];
    }
  }

  Future<Address> createAddress(Map<String, dynamic> data) async {
    final response = await _api.post('/api/addresses', data: data);
    final resData = response.data;
    return Address.fromJson(resData['address'] ?? resData);
  }

  Future<Address> updateAddress(String id, Map<String, dynamic> data) async {
    final response = await _api.put('/api/addresses/$id', data: data);
    final resData = response.data;
    return Address.fromJson(resData['address'] ?? resData);
  }

  Future<void> deleteAddress(String id) async {
    await _api.delete('/api/addresses/$id');
  }

  Future<void> setDefault(String id) async {
    await _api.put('/api/addresses/$id/default', data: {});
  }
}
