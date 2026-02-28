class CommissionTransaction {
  final String id;
  final String userId;
  final String? orderId;
  final String transactionType; // earned, withdrawn
  final double amount;
  final String description;
  final String createdAt;

  CommissionTransaction({
    required this.id,
    required this.userId,
    this.orderId,
    required this.transactionType,
    required this.amount,
    required this.description,
    required this.createdAt,
  });

  factory CommissionTransaction.fromJson(Map<String, dynamic> json) {
    return CommissionTransaction(
      id: json['id']?.toString() ?? '',
      userId: json['user_id']?.toString() ?? '',
      orderId: json['order_id']?.toString(),
      transactionType: json['transaction_type'] ?? '',
      amount: double.tryParse(json['amount']?.toString() ?? '0') ?? 0,
      description: json['description'] ?? '',
      createdAt: json['created_at'] ?? '',
    );
  }
}

class WithdrawalRequest {
  final String id;
  final double amount;
  final String status;
  final String bankName;
  final String iban;
  final String accountHolderName;
  final String? adminNotes;
  final String createdAt;

  WithdrawalRequest({
    required this.id,
    required this.amount,
    required this.status,
    required this.bankName,
    required this.iban,
    required this.accountHolderName,
    this.adminNotes,
    required this.createdAt,
  });

  factory WithdrawalRequest.fromJson(Map<String, dynamic> json) {
    return WithdrawalRequest(
      id: json['id']?.toString() ?? '',
      amount: double.tryParse(json['amount']?.toString() ?? '0') ?? 0,
      status: json['status'] ?? '',
      bankName: json['bank_name'] ?? '',
      iban: json['iban'] ?? '',
      accountHolderName: json['account_holder_name'] ?? '',
      adminNotes: json['admin_notes'],
      createdAt: json['created_at'] ?? '',
    );
  }
}
