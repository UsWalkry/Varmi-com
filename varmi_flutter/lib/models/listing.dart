class Listing {
  final String id;
  final String buyerId;
  final String title;
  final String category;
  final String listingCondition;
  final double? budgetMin;
  final double budgetMax;
  final String? city;
  final String deliveryType;
  final String? description;
  final List<String> images;
  final String status;
  final String approvalStatus;
  final String? approvedBy;
  final DateTime? approvedAt;
  final String? rejectionReason;
  final int viewCount;
  final int favoriteCount;
  final DateTime? expiresAt;
  final bool maskOwnerName;
  final DateTime createdAt;
  final DateTime? updatedAt;

  // İlişkili veriler
  final String? buyerName;
  final String? buyerEmail;
  final bool? isFavorited;
  final int? offerCount;

  Listing({
    required this.id,
    required this.buyerId,
    required this.title,
    required this.category,
    required this.listingCondition,
    this.budgetMin,
    required this.budgetMax,
    this.city,
    required this.deliveryType,
    this.description,
    this.images = const [],
    this.status = 'active',
    this.approvalStatus = 'pending',
    this.approvedBy,
    this.approvedAt,
    this.rejectionReason,
    this.viewCount = 0,
    this.favoriteCount = 0,
    this.expiresAt,
    this.maskOwnerName = false,
    required this.createdAt,
    this.updatedAt,
    this.buyerName,
    this.buyerEmail,
    this.isFavorited,
    this.offerCount,
  });

  bool get isActive => status == 'active';
  bool get isApproved => approvalStatus == 'approved';
  bool get isPending => approvalStatus == 'pending';
  bool get isRejected => approvalStatus == 'rejected';
  bool get isExpired => expiresAt != null && expiresAt!.isBefore(DateTime.now());
  bool get isFavorite => isFavorited ?? false;

  String get mainImage => images.isNotEmpty ? images[0] : '';

  factory Listing.fromJson(Map<String, dynamic> json) {
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

    // Safe double parsing helper
    double? parseDouble(dynamic value) {
      if (value == null) return null;
      try {
        return double.parse(value.toString());
      } catch (e) {
        return null;
      }
    }

    return Listing(
      id: json['id'] as String,
      buyerId: (json['buyerId'] ?? json['buyer_id']) as String,
      title: json['title'] as String,
      category: json['category'] as String,
      listingCondition: (json['condition'] ?? json['listing_condition']) as String,
      budgetMin: parseDouble(json['price'] ?? json['budget_min']),
      budgetMax: parseDouble(json['budgetMax'] ?? json['budget_max'] ?? json['price']) ?? 0.0,
      city: (json['city'] ?? json['location']) as String?,
      deliveryType: (json['deliveryType'] ?? json['delivery_type']) as String,
      description: json['description'] as String?,
      images: imageList,
      status: json['status'] as String? ?? 'active',
      approvalStatus: (json['approvalStatus'] ?? json['approval_status']) as String? ?? 'approved',
      approvedBy: (json['approvedBy'] ?? json['approved_by']) as String?,
      approvedAt: (json['approvedAt'] ?? json['approved_at']) != null
          ? DateTime.parse((json['approvedAt'] ?? json['approved_at']) as String)
          : null,
      rejectionReason: (json['rejectionReason'] ?? json['rejection_reason']) as String?,
      viewCount: (json['viewCount'] ?? json['view_count']) as int? ?? 0,
      favoriteCount: (json['favoriteCount'] ?? json['favorite_count']) as int? ?? 0,
      expiresAt: (json['expiresAt'] ?? json['expires_at']) != null
          ? DateTime.parse((json['expiresAt'] ?? json['expires_at']) as String)
          : null,
      maskOwnerName: (json['maskOwnerName'] ?? json['mask_owner_name']) == 1 || (json['maskOwnerName'] ?? json['mask_owner_name']) == true,
      createdAt: DateTime.parse((json['createdAt'] ?? json['created_at']) as String),
      updatedAt: (json['updatedAt'] ?? json['updated_at']) != null
          ? DateTime.parse((json['updatedAt'] ?? json['updated_at']) as String)
          : null,
      buyerName: (json['buyerName'] ?? json['buyer_name']) as String?,
      buyerEmail: (json['buyerEmail'] ?? json['buyer_email']) as String?,
      isFavorited: (json['isFavorited'] ?? json['is_favorited']) as bool?,
      offerCount: (json['offerCount'] ?? json['offer_count']) as int?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'buyer_id': buyerId,
      'title': title,
      'category': category,
      'listing_condition': listingCondition,
      'budget_min': budgetMin,
      'budget_max': budgetMax,
      'city': city,
      'delivery_type': deliveryType,
      'description': description,
      'images': images,
      'status': status,
      'approval_status': approvalStatus,
      'approved_by': approvedBy,
      'approved_at': approvedAt?.toIso8601String(),
      'rejection_reason': rejectionReason,
      'view_count': viewCount,
      'favorite_count': favoriteCount,
      'expires_at': expiresAt?.toIso8601String(),
      'mask_owner_name': maskOwnerName,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt?.toIso8601String(),
    };
  }
}
