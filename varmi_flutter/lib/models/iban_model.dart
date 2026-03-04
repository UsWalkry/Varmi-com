class IbanModel {
  final String id;
  final String userId;
  final String title;
  final String bankName;
  final String iban;
  final String accountHolderName;
  final bool isDefault;
  final DateTime createdAt;

  const IbanModel({
    required this.id,
    required this.userId,
    required this.title,
    required this.bankName,
    required this.iban,
    required this.accountHolderName,
    required this.isDefault,
    required this.createdAt,
  });

  factory IbanModel.fromJson(Map<String, dynamic> json) {
    return IbanModel(
      id: json['id']?.toString() ?? '',
      userId: json['user_id']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      bankName: json['bank_name']?.toString() ?? '',
      iban: json['iban']?.toString() ?? '',
      accountHolderName: json['account_holder_name']?.toString() ?? '',
      isDefault: (json['is_default'] == 1 || json['is_default'] == true),
      createdAt: DateTime.tryParse(json['created_at']?.toString() ?? '') ?? DateTime.now(),
    );
  }

  /// IBAN'ı okunabilir formatta göster: TR12 3456 7890 …
  String get formatted {
    final cleaned = iban.replaceAll(' ', '');
    final buffer = StringBuffer();
    for (int i = 0; i < cleaned.length; i++) {
      if (i > 0 && i % 4 == 0) buffer.write(' ');
      buffer.write(cleaned[i]);
    }
    return buffer.toString();
  }

  /// IBAN'ın son 4 hanesini göster, gerisini gizle
  String get masked {
    if (iban.length < 4) return iban;
    final last4 = iban.substring(iban.length - 4);
    return 'TR** **** **** **** **** **$last4';
  }
}
