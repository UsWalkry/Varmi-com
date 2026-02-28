import '../services/api_service.dart';
import '../models/commission.dart';

class CommissionService {
  final ApiService _api = apiService;

  Future<Map<String, dynamic>> getBalance() async {
    final response = await _api.get('/api/commission/balance');
    final data = response.data;
    return {
      'balance': double.tryParse(data['balance']?.toString() ?? '0') ?? 0.0,
      'total_earned': double.tryParse(data['total_earned']?.toString() ?? '0') ?? 0.0,
      'total_withdrawn': double.tryParse(data['total_withdrawn']?.toString() ?? '0') ?? 0.0,
    };
  }

  Future<List<CommissionTransaction>> getTransactions() async {
    try {
      final response = await _api.get('/api/commission/transactions');
      final data = response.data;
      List<dynamic> list;
      if (data is List) {
        list = data;
      } else if (data['transactions'] is List) {
        list = data['transactions'];
      } else if (data['data'] is List) {
        list = data['data'];
      } else {
        list = [];
      }
      return list.map((e) => CommissionTransaction.fromJson(e)).toList();
    } catch (e) {
      return [];
    }
  }

  Future<List<WithdrawalRequest>> getWithdrawalRequests() async {
    try {
      final response = await _api.get('/api/commission/withdrawals');
      final data = response.data;
      List<dynamic> list;
      if (data is List) {
        list = data;
      } else if (data['withdrawals'] is List) {
        list = data['withdrawals'];
      } else if (data['data'] is List) {
        list = data['data'];
      } else {
        list = [];
      }
      return list.map((e) => WithdrawalRequest.fromJson(e)).toList();
    } catch (e) {
      return [];
    }
  }

  Future<void> requestWithdrawal({
    required double amount,
    required String bankName,
    required String iban,
    required String accountHolderName,
  }) async {
    await _api.post('/api/commission/withdraw', data: {
      'amount': amount,
      'bank_name': bankName,
      'iban': iban,
      'account_holder_name': accountHolderName,
    });
  }
}
