import 'package:flutter/foundation.dart';
import '../models/cart_item.dart';
import '../services/api_service.dart';

class CartProvider with ChangeNotifier {
  List<CartItem> _items = [];
  bool _isLoading = false;
  String? _error;
  double _subtotal = 0;
  double _totalShipping = 0;

  List<CartItem> get items => List.unmodifiable(_items);
  bool get isLoading => _isLoading;
  String? get error => _error;
  int get itemCount => _items.fold(0, (s, i) => s + i.quantity);
  double get subtotal => _subtotal;
  double get totalShipping => _totalShipping;
  double get total => _subtotal + _totalShipping;

  bool containsOffer(String offerId) =>
      _items.any((i) => i.offer.id == offerId);

  Future<void> loadCart() async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    try {
      final res = await apiService.get('/api/cart');
      final data = res.data as Map<String, dynamic>;
      if (data['success'] == true && data['cart'] != null) {
        final cart = data['cart'] as Map<String, dynamic>;
        final rawItems =
            (cart['items'] as List?)?.cast<Map<String, dynamic>>() ?? [];
        _items = rawItems.map((j) => CartItem.fromJson(j)).toList();
        final summary = cart['summary'] as Map<String, dynamic>?;
        _subtotal =
            double.tryParse(summary?['subtotal']?.toString() ?? '0') ?? 0.0;
        _totalShipping =
            double.tryParse(summary?['shipping']?.toString() ?? '0') ?? 0.0;
      }
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> addOffer(String listingId, String offerId) async {
    try {
      await apiService.post('/api/cart/add',
          data: {'listingId': listingId, 'offerId': offerId});
      await loadCart();
    } catch (e) {
      rethrow;
    }
  }

  Future<void> removeItem(String cartItemId) async {
    _items.removeWhere((i) => i.id == cartItemId);
    _recalculate();
    notifyListeners();
    try {
      await apiService.delete('/api/cart/item/$cartItemId');
    } catch (_) {
      await loadCart(); // sync back
    }
  }

  Future<void> clearCart() async {
    _items.clear();
    _subtotal = 0;
    _totalShipping = 0;
    notifyListeners();
    try {
      await apiService.delete('/api/cart/clear');
    } catch (_) {}
  }

  // Legacy sync alias
  void clear() {
    clearCart();
  }

  void _recalculate() {
    _subtotal = _items.fold(0, (s, i) => s + i.offer.amount * i.quantity);
    _totalShipping =
        _items.fold(0, (s, i) => s + (i.offer.shippingCost ?? 0) * i.quantity);
  }
}
