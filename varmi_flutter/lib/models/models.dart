class AppNotification {
  final String id;
  final String userId;
  final String type;
  final String title;
  final String message;
  final String? listingId;
  final String? offerId;
  final String? orderId;
  final bool isRead;
  final DateTime createdAt;

  AppNotification({
    required this.id,
    required this.userId,
    required this.type,
    required this.title,
    required this.message,
    this.listingId,
    this.offerId,
    this.orderId,
    this.isRead = false,
    required this.createdAt,
  });

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    return AppNotification(
      id: json['id'] as String,
      userId: json['user_id'] as String,
      type: json['type'] as String,
      title: json['title'] as String,
      message: json['message'] as String,
      listingId: json['listing_id'] as String?,
      offerId: json['offer_id'] as String?,
      orderId: json['order_id'] as String?,
      isRead: json['is_read'] == 1 || json['is_read'] == true,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'user_id': userId,
      'type': type,
      'title': title,
      'message': message,
      'listing_id': listingId,
      'offer_id': offerId,
      'order_id': orderId,
      'is_read': isRead,
      'created_at': createdAt.toIso8601String(),
    };
  }
}

class Address {
  final String id;
  final String userId;
  final String title;
  final String fullName;
  final String phone;
  final String addressLine1;
  final String? addressLine2;
  final String city;
  final String district;
  final String postalCode;
  final bool isDefault;
  final DateTime createdAt;
  final DateTime? updatedAt;

  Address({
    required this.id,
    required this.userId,
    required this.title,
    required this.fullName,
    required this.phone,
    required this.addressLine1,
    this.addressLine2,
    required this.city,
    required this.district,
    required this.postalCode,
    this.isDefault = false,
    required this.createdAt,
    this.updatedAt,
  });

  factory Address.fromJson(Map<String, dynamic> json) {
    return Address(
      id: json['id'] as String,
      userId: json['user_id'] as String,
      title: json['title'] as String,
      fullName: json['full_name'] as String,
      phone: json['phone'] as String,
      addressLine1: json['address_line1'] as String,
      addressLine2: json['address_line2'] as String?,
      city: json['city'] as String,
      district: json['district'] as String,
      postalCode: json['postal_code'] as String,
      isDefault: json['is_default'] == 1 || json['is_default'] == true,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'user_id': userId,
      'title': title,
      'full_name': fullName,
      'phone': phone,
      'address_line1': addressLine1,
      'address_line2': addressLine2,
      'city': city,
      'district': district,
      'postal_code': postalCode,
      'is_default': isDefault,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt?.toIso8601String(),
    };
  }
}

class CommissionTransaction {
  final String id;
  final String userId;
  final String? orderId;
  final String transactionType;
  final double amount;
  final String? description;
  final DateTime createdAt;

  CommissionTransaction({
    required this.id,
    required this.userId,
    this.orderId,
    required this.transactionType,
    required this.amount,
    this.description,
    required this.createdAt,
  });

  bool get isEarned => transactionType == 'earned';
  bool get isWithdrawn => transactionType == 'withdrawn';

  factory CommissionTransaction.fromJson(Map<String, dynamic> json) {
    return CommissionTransaction(
      id: json['id'] as String,
      userId: json['user_id'] as String,
      orderId: json['order_id'] as String?,
      transactionType: json['transaction_type'] as String,
      amount: double.parse(json['amount'].toString()),
      description: json['description'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'user_id': userId,
      'order_id': orderId,
      'transaction_type': transactionType,
      'amount': amount,
      'description': description,
      'created_at': createdAt.toIso8601String(),
    };
  }
}
