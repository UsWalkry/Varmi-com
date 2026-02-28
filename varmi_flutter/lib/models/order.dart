class Order {
  final String id;
  final String buyerId;
  final String sellerId;
  final String listingId;
  final String? sourceOfferId;
  final String status;
  final String? carrierCompany;
  final String? trackingNumber;
  final DateTime? startedProcessingAt;
  final DateTime? shippedAt;
  final DateTime? deliveredAt;
  final DateTime? completedAt;
  final DateTime createdAt;
  final DateTime? updatedAt;

  // İlişkili veriler
  final String? buyerName;
  final String? sellerName;
  final String? listingTitle;
  final double? orderAmount;
  final String? productName;

  Order({
    required this.id,
    required this.buyerId,
    required this.sellerId,
    required this.listingId,
    this.sourceOfferId,
    required this.status,
    this.carrierCompany,
    this.trackingNumber,
    this.startedProcessingAt,
    this.shippedAt,
    this.deliveredAt,
    this.completedAt,
    required this.createdAt,
    this.updatedAt,
    this.buyerName,
    this.sellerName,
    this.listingTitle,
    this.orderAmount,
    this.productName,
  });

  bool get isPending => status == 'pending';
  bool get isConfirmed => status == 'confirmed';
  bool get isPreparing => status == 'preparing';
  bool get isShipped => status == 'shipped';
  bool get isDelivered => status == 'delivered';
  bool get isCompleted => status == 'completed';
  bool get isCancelled => status == 'cancelled';

  String get orderNumber => id.substring(0, 8).toUpperCase();

  factory Order.fromJson(Map<String, dynamic> json) {
    return Order(
      id: json['id'] as String,
      buyerId: json['buyer_id'] as String,
      sellerId: json['seller_id'] as String,
      listingId: json['listing_id'] as String,
      sourceOfferId: json['source_offer_id'] as String?,
      status: json['status'] as String,
      carrierCompany: json['carrier_company'] as String?,
      trackingNumber: json['tracking_number'] as String?,
      startedProcessingAt: json['started_processing_at'] != null
          ? DateTime.parse(json['started_processing_at'] as String)
          : null,
      shippedAt: json['shipped_at'] != null
          ? DateTime.parse(json['shipped_at'] as String)
          : null,
      deliveredAt: json['delivered_at'] != null
          ? DateTime.parse(json['delivered_at'] as String)
          : null,
      completedAt: json['completed_at'] != null
          ? DateTime.parse(json['completed_at'] as String)
          : null,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'] as String)
          : null,
      buyerName: json['buyer_name'] as String?,
      sellerName: json['seller_name'] as String?,
      listingTitle: json['listing_title'] as String?,
      orderAmount: json['order_amount'] != null
          ? double.parse(json['order_amount'].toString())
          : null,
      productName: json['product_name'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'buyer_id': buyerId,
      'seller_id': sellerId,
      'listing_id': listingId,
      'source_offer_id': sourceOfferId,
      'status': status,
      'carrier_company': carrierCompany,
      'tracking_number': trackingNumber,
      'started_processing_at': startedProcessingAt?.toIso8601String(),
      'shipped_at': shippedAt?.toIso8601String(),
      'delivered_at': deliveredAt?.toIso8601String(),
      'completed_at': completedAt?.toIso8601String(),
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt?.toIso8601String(),
    };
  }
}
