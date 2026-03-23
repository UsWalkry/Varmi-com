import 'package:flutter/material.dart';
import '../../utils/app_dialog.dart';
import '../../utils/formatters.dart';
import '../../models/order.dart';
import '../../services/order_service.dart';

class OrderDetailScreen extends StatefulWidget {
  final String orderId;
  final bool isBuyer;

  const OrderDetailScreen({
    super.key,
    required this.orderId,
    required this.isBuyer,
  });

  @override
  State<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends State<OrderDetailScreen> {
  final OrderService _orderService = OrderService();
  
  Order? _order;
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadOrder();
  }

  Future<void> _loadOrder() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final order = await _orderService.getOrderById(widget.orderId);
      setState(() {
        _order = order;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _confirmOrder() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Siparişi Onayla'),
        content: const Text('Bu siparişi onaylamak istediğinize emin misiniz?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('İptal'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Onayla'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        await _orderService.confirmOrder(widget.orderId);
        if (mounted) {
          AppDialog.showSuccess(context, 'Sipariş onaylandı');
          _loadOrder();
        }
      } catch (e) {
        if (mounted) {
          AppDialog.showError(context, AppDialog.cleanError(e));
        }
      }
    }
  }

  Future<void> _startProcessing() async {
    try {
      await _orderService.startProcessing(widget.orderId);
      if (mounted) {
        AppDialog.showSuccess(context, 'Sipariş hazırlanmaya başlandı');
        _loadOrder();
      }
    } catch (e) {
      if (mounted) {
        AppDialog.showError(context, AppDialog.cleanError(e));
      }
    }
  }

  Future<void> _markAsShipped() async {
    final carrierController = TextEditingController();
    final trackingController = TextEditingController();

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Kargo Bilgileri'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: carrierController,
              decoration: const InputDecoration(
                labelText: 'Kargo Şirketi',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: trackingController,
              decoration: const InputDecoration(
                labelText: 'Takip Numarası',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('İptal'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Gönder'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      if (carrierController.text.isEmpty || trackingController.text.isEmpty) {
        if (mounted) {
          AppDialog.showWarning(context, 'Lütfen tüm alanları doldurun');
        }
        return;
      }

      try {
        await _orderService.markAsShipped(
          widget.orderId,
          carrierController.text,
          trackingController.text,
        );
        if (mounted) {
          AppDialog.showSuccess(context, 'Sipariş kargoya verildi');
          _loadOrder();
        }
      } catch (e) {
        if (mounted) {
          AppDialog.showError(context, AppDialog.cleanError(e));
        }
      }
    }
  }

  Future<void> _confirmDelivery() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Teslimatı Onayla'),
        content: const Text('Ürünü teslim aldığınızı onaylıyor musunuz?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('İptal'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Onayla'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        await _orderService.confirmDelivery(widget.orderId);
        if (mounted) {
          AppDialog.showSuccess(context, 'Teslimat onaylandı');
          _loadOrder();
        }
      } catch (e) {
        if (mounted) {
          AppDialog.showError(context, AppDialog.cleanError(e));
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Sipariş Detayı')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_error != null || _order == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Sipariş Detayı')),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(_error ?? 'Sipariş bulunamadı'),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: _loadOrder,
                child: const Text('Tekrar Dene'),
              ),
            ],
          ),
        ),
      );
    }

    final order = _order!;

    return Scaffold(
      appBar: AppBar(
        title: Text('Sipariş #${order.orderNumber}'),
      ),
      body: RefreshIndicator(
        onRefresh: _loadOrder,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Durum Kartı
              Card(
                color: _getStatusColor(order).withOpacity(0.1),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      Icon(
                        _getStatusIcon(order),
                        size: 32,
                        color: _getStatusColor(order),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _getStatusText(order),
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: _getStatusColor(order),
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              _getStatusDescription(order),
                              style: TextStyle(color: Colors.grey[600]),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Sipariş Bilgileri
              _buildInfoSection(
                title: 'Sipariş Bilgileri',
                children: [
                  if (order.listingTitle != null)
                    _buildInfoRow('İlan', order.listingTitle!),
                  if (order.productName != null)
                    _buildInfoRow('Ürün', order.productName!),
                  if (order.orderAmount != null)
                    _buildInfoRow('Tutar', formatPriceShort(order.orderAmount!)),
                  _buildInfoRow(
                    widget.isBuyer ? 'Satıcı' : 'Alıcı',
                    widget.isBuyer
                        ? maskName(order.sellerName)
                        : maskName(order.buyerName),
                  ),
                  _buildInfoRow(
                    'Sipariş Tarihi',
                    _formatDateTime(order.createdAt),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Kargo Bilgileri
              if (order.trackingNumber != null) ...[
                _buildInfoSection(
                  title: 'Kargo Bilgileri',
                  children: [
                    _buildInfoRow('Kargo Şirketi', order.carrierCompany ?? 'Belirtilmedi'),
                    _buildInfoRow('Takip No', order.trackingNumber!),
                    if (order.shippedAt != null)
                      _buildInfoRow('Kargoya Verildi', _formatDateTime(order.shippedAt!)),
                  ],
                ),
                const SizedBox(height: 16),
              ],

              // Zaman Çizelgesi
              _buildTimeline(order),
              const SizedBox(height: 24),

              // Aksiyonlar
              _buildActions(order),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInfoSection({
    required String title,
    required List<Widget> children,
  }) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const Divider(height: 24),
            ...children,
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: TextStyle(
                color: Colors.grey[600],
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTimeline(Order order) {
    final steps = [
      {'status': 'pending', 'label': 'Bekliyor', 'date': order.createdAt},
      if (order.isConfirmed || order.isPreparing || order.isShipped || order.isDelivered || order.isCompleted)
        {'status': 'confirmed', 'label': 'Onaylandı', 'date': order.createdAt},
      if (order.isPreparing || order.isShipped || order.isDelivered || order.isCompleted)
        {'status': 'preparing', 'label': 'Hazırlanıyor', 'date': order.startedProcessingAt},
      if (order.isShipped || order.isDelivered || order.isCompleted)
        {'status': 'shipped', 'label': 'Kargoya Verildi', 'date': order.shippedAt},
      if (order.isDelivered || order.isCompleted)
        {'status': 'delivered', 'label': 'Teslim Edildi', 'date': order.deliveredAt},
      if (order.isCompleted)
        {'status': 'completed', 'label': 'Tamamlandı', 'date': order.completedAt},
    ];

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Sipariş Durumu',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            ...steps.map((step) => _buildTimelineStep(
              step['label'] as String,
              step['date'] as DateTime?,
            )),
          ],
        ),
      ),
    );
  }

  Widget _buildTimelineStep(String label, DateTime? date) {
    final isCompleted = date != null;
    
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Column(
          children: [
            Container(
              width: 24,
              height: 24,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isCompleted ? Colors.green : Colors.grey[300],
              ),
              child: isCompleted
                  ? const Icon(Icons.check, size: 16, color: Colors.white)
                  : null,
            ),
            if (label != 'Tamamlandı')
              Container(
                width: 2,
                height: 40,
                color: Colors.grey[300],
              ),
          ],
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.only(top: 2),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: isCompleted ? Colors.black : Colors.grey,
                  ),
                ),
                if (date != null)
                  Text(
                    _formatDateTime(date),
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey[600],
                    ),
                  ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildActions(Order order) {
    if (widget.isBuyer) {
      // Alıcı aksiyonları
      if (order.isPending) {
        return SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: _confirmOrder,
            child: const Text('Siparişi Onayla'),
          ),
        );
      } else if (order.isDelivered) {
        return SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: _confirmDelivery,
            child: const Text('Teslimatı Onayla'),
          ),
        );
      }
    } else {
      // Satıcı aksiyonları
      if (order.isConfirmed) {
        return SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: _startProcessing,
            child: const Text('Hazırlamaya Başla'),
          ),
        );
      } else if (order.isPreparing) {
        return SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: _markAsShipped,
            child: const Text('Kargoya Ver'),
          ),
        );
      }
    }

    return const SizedBox.shrink();
  }

  Color _getStatusColor(Order order) {
    if (order.isCompleted) return Colors.green;
    if (order.isCancelled) return Colors.red;
    if (order.isDelivered) return Colors.teal;
    if (order.isShipped) return Colors.blue;
    if (order.isPreparing) return Colors.orange;
    if (order.isConfirmed) return Colors.purple;
    return Colors.grey;
  }

  IconData _getStatusIcon(Order order) {
    if (order.isCompleted) return Icons.check_circle;
    if (order.isCancelled) return Icons.cancel;
    if (order.isDelivered) return Icons.done_all;
    if (order.isShipped) return Icons.local_shipping;
    if (order.isPreparing) return Icons.inventory;
    if (order.isConfirmed) return Icons.verified;
    return Icons.pending;
  }

  String _getStatusText(Order order) {
    if (order.isCompleted) return 'Tamamlandı';
    if (order.isCancelled) return 'İptal Edildi';
    if (order.isDelivered) return 'Teslim Edildi';
    if (order.isShipped) return 'Kargoda';
    if (order.isPreparing) return 'Hazırlanıyor';
    if (order.isConfirmed) return 'Onaylandı';
    return 'Onay Bekliyor';
  }

  String _getStatusDescription(Order order) {
    if (order.isCompleted) {
      return 'Sipariş başarıyla tamamlandı';
    }
    if (order.isCancelled) {
      return 'Sipariş iptal edildi';
    }
    if (order.isDelivered) {
      return widget.isBuyer
          ? 'Lütfen teslimatı onaylayın'
          : 'Alıcının onayı bekleniyor';
    }
    if (order.isShipped) {
      return 'Kargo yolda';
    }
    if (order.isPreparing) {
      return widget.isBuyer
          ? 'Siparişiniz hazırlanıyor'
          : 'Lütfen siparişi kargoya verin';
    }
    if (order.isConfirmed) {
      return widget.isBuyer
          ? 'Sipariş onaylandı'
          : 'Lütfen hazırlamaya başlayın';
    }
    return widget.isBuyer
        ? 'Lütfen siparişi onaylayın'
        : 'Alıcının onayı bekleniyor';
  }

  String _formatDateTime(DateTime date) {
    return '${date.day}/${date.month}/${date.year} ${date.hour}:${date.minute.toString().padLeft(2, '0')}';
  }
}
