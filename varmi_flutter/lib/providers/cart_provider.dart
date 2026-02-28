import 'package:flutter/foundation.dart';
import '../models/cart_item.dart';
import '../models/offer.dart';

class CartProvider with ChangeNotifier {
  final List<CartItem> _items = [];

  List<CartItem> get items => List.unmodifiable(_items);

  int get itemCount => _items.length;

  double get subtotal => _items.fold(0, (sum, item) => sum + item.offer.amount * item.quantity);

  double get totalShipping => _items.fold(
      0, (sum, item) => sum + (item.offer.shippingCost ?? 0) * item.quantity);

  double get total => subtotal + totalShipping;

  bool containsOffer(String offerId) {
    return _items.any((item) => item.offer.id == offerId);
  }

  void addOffer(Offer offer) {
    if (!containsOffer(offer.id)) {
      _items.add(CartItem(
        id: offer.id,
        offer: offer,
      ));
      notifyListeners();
    }
  }

  void removeItem(String offerId) {
    _items.removeWhere((item) => item.offer.id == offerId);
    notifyListeners();
  }

  void clear() {
    _items.clear();
    notifyListeners();
  }
}
