class User {
  final String id;
  final String email;
  final String? firstName;
  final String? lastName;
  final String? phone;
  final String? city;
  final String? gender;
  final DateTime? birthDate;
  final String? addressLine1;
  final String? district;
  final String? postalCode;
  final String? avatar;
  final String role;
  final bool emailVerified;
  final DateTime? emailVerifiedAt;
  final DateTime createdAt;
  final DateTime? updatedAt;

  User({
    required this.id,
    required this.email,
    this.firstName,
    this.lastName,
    this.phone,
    this.city,
    this.gender,
    this.birthDate,
    this.addressLine1,
    this.district,
    this.postalCode,
    this.avatar,
    this.role = 'user',
    this.emailVerified = false,
    this.emailVerifiedAt,
    required this.createdAt,
    this.updatedAt,
  });

  String get fullName {
    if (firstName != null && lastName != null) {
      return '$firstName $lastName';
    }
    return firstName ?? lastName ?? email;
  }

  String get initials {
    if (firstName != null && lastName != null) {
      return '${firstName![0]}${lastName![0]}'.toUpperCase();
    }
    return email[0].toUpperCase();
  }

  bool get isAdmin => role == 'admin';

  factory User.fromJson(Map<String, dynamic> json) {
    // Handle both camelCase and snake_case from backend
    final firstName = json['firstName'] ?? json['first_name'];
    final lastName = json['lastName'] ?? json['last_name'];
    final addressLine1 = json['addressLine1'] ?? json['address_line1'];
    final postalCode = json['postalCode'] ?? json['postal_code'];
    final birthDateStr = json['birthDate'] ?? json['birth_date'];
    final emailVerifiedAt = json['emailVerifiedAt'] ?? json['email_verified_at'];
    final emailVerified = json['emailVerified'] ?? json['email_verified'];
    final createdAt = json['createdAt'] ?? json['created_at'];
    final updatedAt = json['updatedAt'] ?? json['updated_at'];
    
    return User(
      id: json['id'] as String,
      email: json['email'] as String,
      firstName: firstName as String?,
      lastName: lastName as String?,
      phone: json['phone'] as String?,
      city: json['city'] as String?,
      gender: json['gender'] as String?,
      birthDate: birthDateStr != null 
          ? DateTime.parse(birthDateStr as String)
          : null,
      addressLine1: addressLine1 as String?,
      district: json['district'] as String?,
      postalCode: postalCode as String?,
      avatar: json['avatar'] as String?,
      role: json['role'] as String? ?? 'user',
      emailVerified: emailVerified == 1 || emailVerified == true,
      emailVerifiedAt: emailVerifiedAt != null
          ? DateTime.parse(emailVerifiedAt as String)
          : null,
      createdAt: createdAt != null
          ? DateTime.parse(createdAt as String)
          : DateTime.now(),
      updatedAt: updatedAt != null
          ? DateTime.parse(updatedAt as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'firstName': firstName,
      'lastName': lastName,
      'phone': phone,
      'city': city,
      'gender': gender,
      'birth_date': birthDate?.toIso8601String(),
      'address_line1': addressLine1,
      'district': district,
      'postal_code': postalCode,
      'avatar': avatar,
      'role': role,
      'email_verified': emailVerified,
      'email_verified_at': emailVerifiedAt?.toIso8601String(),
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt?.toIso8601String(),
    };
  }

  User copyWith({
    String? id,
    String? email,
    String? firstName,
    String? lastName,
    String? phone,
    String? city,
    String? gender,
    DateTime? birthDate,
    String? addressLine1,
    String? district,
    String? postalCode,
    String? avatar,
    String? role,
    bool? emailVerified,
    DateTime? emailVerifiedAt,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return User(
      id: id ?? this.id,
      email: email ?? this.email,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      phone: phone ?? this.phone,
      city: city ?? this.city,
      gender: gender ?? this.gender,
      birthDate: birthDate ?? this.birthDate,
      addressLine1: addressLine1 ?? this.addressLine1,
      district: district ?? this.district,
      postalCode: postalCode ?? this.postalCode,
      avatar: avatar ?? this.avatar,
      role: role ?? this.role,
      emailVerified: emailVerified ?? this.emailVerified,
      emailVerifiedAt: emailVerifiedAt ?? this.emailVerifiedAt,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
