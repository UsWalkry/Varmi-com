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
            imageList = (json['images'] as List).map((e) => e.toString()).toList();
          } else {
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
      id: json['id'] as String,
      listingId: json['listing_id'] as String,
      sellerId: json['seller_id'] as String,
      amount: parseDouble(json['amount']) ?? 0.0,
      status: json['status'] as String? ?? 'active',
      approvalStatus: json['approval_status'] as String? ?? 'pending',
      approvedBy: json['approved_by'] as String?,
      approvedAt: json['approved_at'] != null
          ? DateTime.parse(json['approved_at'] as String)
          : null,
      rejectionReason: json['rejection_reason'] as String?,
      productName: json['product_name'] as String,
      quantity: parseInt(json['quantity']) ?? 1,
      images: imageList,
      deliveryType: json['delivery_type'] as String,
      shippingDesi: parseDouble(json['shipping_desi']),
      shippingCost: parseDouble(json['shipping_cost']),
      description: json['description'] as String?,
      validUntil: json['valid_until'] != null
          ? DateTime.parse(json['valid_until'] as String)
          : null,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'] as String)
          : null,
      sellerName: json['seller_name'] as String?,
      sellerEmail: json['seller_email'] as String?,
      listingTitle: json['listing_title'] as String?,
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
