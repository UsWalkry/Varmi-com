import 'dart:convert';
import 'offer.dart';

class CartItem {
  final String id;        // cart_item_id from backend
  final Offer offer;
  final int quantity;
  final String listingId;

  CartItem({
    required this.id,
    required this.offer,
    this.quantity = 1,
    required this.listingId,
  });

  double get subtotal => (offer.amount + (offer.shippingCost ?? 0)) * quantity;

  factory CartItem.fromJson(Map<String, dynamic> json) {
    List<String> parseImages(dynamic raw) {
      if (raw == null) return [];
      if (raw is List) return raw.map((e) => e.toString()).toList();
      try {
        final decoded = jsonDecode(raw.toString());
        if (decoded is List) return decoded.map((e) => e.toString()).toList();
      } catch (_) {}
      return [];
    }

    final offer = Offer(
      id: json['offer_id']?.toString() ?? '',
      listingId: json['listing_id']?.toString() ?? '',
      sellerId: json['seller_id']?.toString() ?? '',
      amount: double.tryParse(json['offer_amount']?.toString() ?? '0') ?? 0.0,
      productName: json['offer_product_name']?.toString() ?? '',
      images: parseImages(json['offer_images']),
      deliveryType: json['delivery_type']?.toString() ?? 'shipping',
      shippingCost: json['shipping_cost'] != null
          ? double.tryParse(json['shipping_cost'].toString())
          : null,
      description: json['offer_description']?.toString(),
      listingTitle: json['listing_title']?.toString(),
      sellerName: json['seller_name']?.toString(),
      createdAt: DateTime.now(),
    );

    return CartItem(
      id: json['cart_item_id']?.toString() ?? '',
      offer: offer,
      quantity: int.tryParse(json['quantity']?.toString() ?? '1') ?? 1,
      listingId: json['listing_id']?.toString() ?? '',
    );
  }
}
