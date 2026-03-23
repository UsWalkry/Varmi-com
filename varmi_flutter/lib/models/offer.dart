class Offer {
  final String id;
  final String listingId;
  final String sellerId;
  final double amount;
  final String status;
  final String approvalStatus;
  final String? approvedBy;
  final DateTime? approvedAt;
  final String? rejectionReason;
  final String productName;
  final int quantity;
  final List<String> images;
  final String deliveryType;
  final double? shippingDesi;
  final double? shippingCost;
  final String? description;
  final DateTime? validUntil;
  final DateTime createdAt;
  final DateTime? updatedAt;

  // İlişkili veriler
  final String? sellerName;
  final String? sellerEmail;
  final String? listingTitle;
  final double? sellerRating;
  final int? etaDays;
  final String? condition;

  Offer({
    required this.id,
    required this.listingId,
    required this.sellerId,
    required this.amount,
    this.status = 'active',
    this.approvalStatus = 'pending',
    this.approvedBy,
    this.approvedAt,
    this.rejectionReason,
    required this.productName,
    this.quantity = 1,
    this.images = const [],
    required this.deliveryType,
    this.shippingDesi,
    this.shippingCost,
    this.description,
    this.validUntil,
    required this.createdAt,
    this.updatedAt,
    this.sellerName,
    this.sellerEmail,
    this.listingTitle,
    this.sellerRating,
    this.etaDays,
    this.condition,
  });

  bool get isActive => status == 'active';
  bool get isAccepted => status == 'accepted';
  bool get isRejected => status == 'rejected';
  bool get isWithdrawn => status == 'withdrawn';
  bool get isApproved => approvalStatus == 'approved';
  bool get isPending => approvalStatus == 'pending';
  bool get isExpired => validUntil != null && validUntil!.isBefore(DateTime.now());

  String get mainImage => images.isNotEmpty ? images[0] : '';

  double get totalAmount {
    if (shippingCost != null) {
      return amount + shippingCost!;
    }
    return amount;
  }

  factory Offer.fromJson(Map<String, dynamic> json) {
    List<String> imageList = [];
    if (json['images'] != null) {
      if (json['images'] is List) {
        imageList = (json['images'] as List).map((e) => e.toString()).toList();
      } else if (json['images'] is String) {
        try {
          final decoded = json['images'] as String;
          if (decoded.startsWith('[')) {
            final parsed = RegExp(r'"([^"]*)"').allMatches(decoded)
                .map((m) => m.group(1) ?? '')
                .where((s) => s.isNotEmpty)
                .toList();
            imageList = parsed;
          } else if (decoded.isNotEmpty) {
            imageList = [decoded];
          }
        } catch (e) {
          imageList = [];
        }
      }
    }

    // Safe parsing helpers
    double? parseDouble(dynamic value) {
      if (value == null) return null;
      try {
        return double.parse(value.toString());
      } catch (e) {
        return null;
      }
    }

    int? parseInt(dynamic value) {
      if (value == null) return null;
      try {
        return int.parse(value.toString());
      } catch (e) {
        return null;
      }
    }

    return Offer(
      id: json['id']?.toString() ?? '',
      listingId: (json['listingId'] ?? json['listing_id'])?.toString() ?? '',
      sellerId: (json['sellerId'] ?? json['seller_id'])?.toString() ?? '',
      // Backend 'price' veya 'amount' kullanabilir
      amount: parseDouble(json['amount'] ?? json['price']) ?? 0.0,
      status: json['status']?.toString() ?? 'active',
      approvalStatus: (json['approvalStatus'] ?? json['approval_status'])?.toString() ?? 'pending',
      approvedBy: (json['approvedBy'] ?? json['approved_by'])?.toString(),
      approvedAt: (json['approvedAt'] ?? json['approved_at']) != null
          ? DateTime.tryParse((json['approvedAt'] ?? json['approved_at']).toString())
          : null,
      rejectionReason: (json['rejectionReason'] ?? json['rejection_reason'])?.toString(),
      productName: (json['productName'] ?? json['product_name'])?.toString() ?? '',
      quantity: parseInt(json['quantity']) ?? 1,
      images: imageList,
      deliveryType: (json['deliveryType'] ?? json['delivery_type'])?.toString() ?? 'kargo',
      shippingDesi: parseDouble(json['shippingDesi'] ?? json['shipping_desi']),
      shippingCost: parseDouble(json['shippingCost'] ?? json['shipping_cost']),
      description: json['description']?.toString(),
      validUntil: (json['validUntil'] ?? json['valid_until']) != null
          ? DateTime.tryParse((json['validUntil'] ?? json['valid_until']).toString())
          : null,
      createdAt: DateTime.tryParse((json['createdAt'] ?? json['created_at'])?.toString() ?? '') ?? DateTime.now(),
      updatedAt: (json['updatedAt'] ?? json['updated_at']) != null
          ? DateTime.tryParse((json['updatedAt'] ?? json['updated_at']).toString())
          : null,
      sellerName: (json['sellerName'] ?? json['seller_name'])?.toString(),
      sellerEmail: (json['sellerEmail'] ?? json['seller_email'])?.toString(),
      listingTitle: (json['listingTitle'] ?? json['listing_title'])?.toString(),
      sellerRating: parseDouble(json['sellerRating'] ?? json['seller_rating']),
      etaDays: parseInt(json['etaDays'] ?? json['eta_days']),
      condition: (json['condition'] ?? json['offer_condition'])?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'listing_id': listingId,
      'seller_id': sellerId,
      'amount': amount,
      'status': status,
      'approval_status': approvalStatus,
      'approved_by': approvedBy,
      'approved_at': approvedAt?.toIso8601String(),
      'rejection_reason': rejectionReason,
      'product_name': productName,
      'quantity': quantity,
      'images': images,
      'delivery_type': deliveryType,
      'shipping_desi': shippingDesi,
      'shipping_cost': shippingCost,
      'description': description,
      'valid_until': validUntil?.toIso8601String(),
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt?.toIso8601String(),
    };
  }
}
