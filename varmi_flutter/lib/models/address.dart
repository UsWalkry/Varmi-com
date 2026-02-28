class Address {
  final String id;
  final String userId;
  String title;
  String fullName;
  String phone;
  String addressLine1;
  String? district;
  String city;
  String? postalCode;
  bool isDefault;

  Address({
    required this.id,
    required this.userId,
    required this.title,
    required this.fullName,
    required this.phone,
    required this.addressLine1,
    this.district,
    required this.city,
    this.postalCode,
    required this.isDefault,
  });

  factory Address.fromJson(Map<String, dynamic> json) {
    return Address(
      id: json['id']?.toString() ?? '',
      userId: json['user_id']?.toString() ?? '',
      title: json['title'] ?? '',
      fullName: json['full_name'] ?? json['fullName'] ?? '',
      phone: json['phone'] ?? '',
      addressLine1: json['address_line1'] ?? json['addressLine1'] ?? '',
      district: json['district'],
      city: json['city'] ?? '',
      postalCode: json['postal_code'] ?? json['postalCode'],
      isDefault: json['is_default'] == true || json['is_default'] == 1,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'title': title,
      'full_name': fullName,
      'phone': phone,
      'address_line1': addressLine1,
      'district': district,
      'city': city,
      'postal_code': postalCode,
      'is_default': isDefault,
    };
  }
}
