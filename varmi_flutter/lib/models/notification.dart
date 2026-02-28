class AppNotification {
  final String id;
  final String title;
  final String message;
  final String type;
  final bool isRead;
  final String? listingId;
  final String? offerId;
  final String createdAt;

  AppNotification({
    required this.id,
    required this.title,
    required this.message,
    required this.type,
    required this.isRead,
    this.listingId,
    this.offerId,
    required this.createdAt,
  });

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    return AppNotification(
      id: json['id']?.toString() ?? '',
      title: json['title'] ?? '',
      message: json['message'] ?? '',
      type: json['type'] ?? '',
      isRead: json['is_read'] == true || json['is_read'] == 1,
      listingId: json['listing_id']?.toString(),
      offerId: json['offer_id']?.toString(),
      createdAt: json['created_at'] ?? '',
    );
  }
}
