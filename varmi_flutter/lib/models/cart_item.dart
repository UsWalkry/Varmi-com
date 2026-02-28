import 'offer.dart';

class CartItem {
  final String id;
  final Offer offer;
  final int quantity;

  CartItem({
    required this.id,
    required this.offer,
    this.quantity = 1,
  });

  double get subtotal => (offer.amount + (offer.shippingCost ?? 0)) * quantity;
}
