import 'package:flutter/material.dart';
import '../../utils/app_dialog.dart';
import 'package:provider/provider.dart';
import '../../providers/cart_provider.dart';
import '../../models/address.dart';
import '../../services/address_service.dart';
import '../../services/order_service.dart';
import '../../utils/formatters.dart';
import '../orders/orders_screen.dart';

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key});

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final AddressService _addressService = AddressService();
  final OrderService _orderService = OrderService();
  List<Address> _addresses = [];
  Address? _selectedAddress;
  bool _isLoadingAddresses = true;
  bool _isPlacingOrder = false;

  @override
  void initState() {
    super.initState();
    _loadAddresses();
  }

  Future<void> _loadAddresses() async {
    try {
      final addresses = await _addressService.getAddresses();
      setState(() {
        _addresses = addresses;
        if (addresses.isNotEmpty) {
          try {
            _selectedAddress = addresses.firstWhere((a) => a.isDefault);
          } catch (_) {
            _selectedAddress = addresses.first;
          }
        }
        _isLoadingAddresses = false;
      });
    } catch (e) {
      setState(() => _isLoadingAddresses = false);
    }
  }

  Future<void> _placeOrder() async {
    final cart = Provider.of<CartProvider>(context, listen: false);
    if (cart.items.isEmpty) return;

    setState(() => _isPlacingOrder = true);
    try {
      // Create orders for each cart item's offer
      for (final item in cart.items) {
        await _orderService.createOrderFromOffer(
          offerId: item.offer.id,
          listingId: item.offer.listingId,
          addressId: _selectedAddress?.id,
        );
      }
      cart.clearCart();
      if (mounted) {
        showDialog(
          context: context,
          barrierDismissible: false,
          builder: (ctx) => AlertDialog(
            title: const Text('Sipariş Oluşturuldu!'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.check_circle_outline, color: Colors.green, size: 64),
                const SizedBox(height: 16),
                const Text(
                  'Siparişiniz başarıyla oluşturuldu. Satıcı en kısa sürede onaylayacaktır.',
                  textAlign: TextAlign.center,
                ),
              ],
            ),
            actions: [
              ElevatedButton(
                onPressed: () {
                  Navigator.pop(ctx);
                  Navigator.pushAndRemoveUntil(
                    context,
                    MaterialPageRoute(builder: (_) => const OrdersScreen()),
                    (route) => route.isFirst,
                  );
                },
                child: const Text('Siparişleri Gör'),
              ),
            ],
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        AppDialog.showError(context, AppDialog.cleanError(e));
      }
    } finally {
      setState(() => _isPlacingOrder = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cart = Provider.of<CartProvider>(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Siparişi Tamamla'),
      ),
      body: _isLoadingAddresses
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Delivery address
                  const Text(
                    'Teslimat Adresi',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  const SizedBox(height: 12),
                  if (_addresses.isEmpty)
                    Card(
                      color: Colors.orange[50],
                      child: ListTile(
                        leading: const Icon(Icons.warning_amber, color: Colors.orange),
                        title: const Text('Adres bulunamadı'),
                        subtitle: const Text('Profil > Adreslerim bölümünden adres ekleyin'),
                        trailing: const Icon(Icons.chevron_right),
                        onTap: () => Navigator.pop(context),
                      ),
                    )
                  else
                    ..._addresses.map((address) => RadioListTile<String>(
                          value: address.id,
                          groupValue: _selectedAddress?.id,
                          onChanged: (v) {
                            setState(() {
                              _selectedAddress = _addresses
                                  .firstWhere((a) => a.id == v!);
                            });
                          },
                          title: Text(address.title,
                              style: const TextStyle(fontWeight: FontWeight.w600)),
                          subtitle: Text(
                            '${address.fullName}\n${address.addressLine1}, ${address.city}',
                          ),
                          isThreeLine: true,
                          contentPadding: const EdgeInsets.symmetric(horizontal: 4),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        )),

                  const SizedBox(height: 24),

                  // Order items
                  const Text(
                    'Sipariş Özeti',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  const SizedBox(height: 12),
                  Card(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    child: Column(
                      children: [
                        ...cart.items.map((item) => Padding(
                              padding: const EdgeInsets.all(16),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          item.offer.productName,
                                          style: const TextStyle(fontWeight: FontWeight.w600),
                                        ),
                                        Text(
                                          'Adet: ${item.quantity}',
                                          style: TextStyle(
                                              color: Colors.grey[600], fontSize: 13),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Text(
                                    formatPrice(item.offer.amount * item.quantity),
                                    style: const TextStyle(fontWeight: FontWeight.bold),
                                  ),
                                ],
                              ),
                            )),
                        const Divider(height: 1),
                        Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text('Ara Toplam',
                                      style: TextStyle(color: Colors.grey[600])),
                                  Text(formatPrice(cart.subtotal)),
                                ],
                              ),
                              if (cart.totalShipping > 0) ...[
                                const SizedBox(height: 4),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text('Kargo',
                                        style: TextStyle(color: Colors.grey[600])),
                                    Text(formatPrice(cart.totalShipping)),
                                  ],
                                ),
                              ],
                              const Divider(height: 16),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  const Text(
                                    'Genel Toplam',
                                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                                  ),
                                  Text(
                                    formatPrice(cart.total),
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 18,
                                      color: Theme.of(context).primaryColor,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 16),

                  // Info
                  Card(
                    color: Colors.blue[50],
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Row(
                        children: [
                          const Icon(Icons.info_outline, color: Colors.blue, size: 20),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Sipariş oluşturduktan sonra satıcı onaylamasını beklemeniz gerekecektir.',
                              style: TextStyle(color: Colors.blue[700], fontSize: 13),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 24),

                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: (_isPlacingOrder || cart.items.isEmpty || _addresses.isEmpty)
                          ? null
                          : _placeOrder,
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                      child: _isPlacingOrder
                          ? const SizedBox(
                              height: 22,
                              width: 22,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : Text(
                              'Siparişi Ver (${formatPrice(cart.total)})',
                              style: const TextStyle(
                                  fontSize: 16, fontWeight: FontWeight.bold),
                            ),
                    ),
                  ),
                  const SizedBox(height: 16),
                ],
              ),
            ),
    );
  }
}
