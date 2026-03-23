import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../utils/formatters.dart';
import '../../models/order.dart';
import '../../services/order_service.dart';
import '../../providers/auth_provider.dart';
import 'order_detail_screen.dart';

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> with SingleTickerProviderStateMixin {
  final OrderService _orderService = OrderService();
  late TabController _tabController;
  
  List<Order> _buyerOrders = [];
  List<Order> _sellerOrders = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadOrders();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadOrders() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final buyerOrders = await _orderService.getMyBuyerOrders();
      final sellerOrders = await _orderService.getMySellerOrders();
      
      setState(() {
        _buyerOrders = buyerOrders;
        _sellerOrders = sellerOrders;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Siparişlerim'),
        bottom: TabBar(
          controller: _tabController,
          tabs: [
            Tab(
              text: 'Aldıklarım (${_buyerOrders.length})',
              icon: const Icon(Icons.shopping_bag),
            ),
            Tab(
              text: 'Sattıklarım (${_sellerOrders.length})',
              icon: const Icon(Icons.sell),
            ),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(_error!),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _loadOrders,
                        child: const Text('Tekrar Dene'),
                      ),
                    ],
                  ),
                )
              : TabBarView(
                  controller: _tabController,
                  children: [
                    _buildOrdersList(_buyerOrders, true),
                    _buildOrdersList(_sellerOrders, false),
                  ],
                ),
    );
  }

  Widget _buildOrdersList(List<Order> orders, bool isBuyer) {
    if (orders.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              isBuyer ? Icons.shopping_bag_outlined : Icons.sell_outlined,
              size: 64,
              color: Colors.grey,
            ),
            const SizedBox(height: 16),
            Text(
              isBuyer ? 'Henüz alım yapmadınız' : 'Henüz satış yapmadınız',
              style: const TextStyle(fontSize: 18, color: Colors.grey),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadOrders,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: orders.length,
        itemBuilder: (context, index) {
          final order = orders[index];
          return _buildOrderCard(order, isBuyer);
        },
      ),
    );
  }

  Widget _buildOrderCard(Order order, bool isBuyer) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: InkWell(
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => OrderDetailScreen(
                orderId: order.id,
                isBuyer: isBuyer,
              ),
            ),
          ).then((_) => _loadOrders());
        },
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Sipariş #${order.orderNumber}',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  _buildStatusChip(order),
                ],
              ),
              const Divider(height: 24),
              if (order.listingTitle != null) ...[
                _buildInfoRow(
                  icon: Icons.description,
                  label: 'İlan',
                  value: order.listingTitle!,
                ),
              ],
              if (order.productName != null) ...[
                _buildInfoRow(
                  icon: Icons.shopping_bag,
                  label: 'Ürün',
                  value: order.productName!,
                ),
              ],
              if (order.orderAmount != null) ...[
                _buildInfoRow(
                  icon: Icons.currency_lira,
                  label: 'Tutar',
                  value: formatPriceShort(order.orderAmount!),
                ),
              ],
              _buildInfoRow(
                icon: Icons.person,
                label: isBuyer ? 'Satıcı' : 'Alıcı',
                value: isBuyer
                    ? maskName(order.sellerName)
                    : maskName(order.buyerName),
              ),
              _buildInfoRow(
                icon: Icons.calendar_today,
                label: 'Tarih',
                value: _formatDate(order.createdAt),
              ),
              if (order.trackingNumber != null) ...[
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.blue.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.local_shipping, size: 16, color: Colors.blue),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              order.carrierCompany ?? 'Kargo Şirketi',
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            Text(
                              'Takip No: ${order.trackingNumber}',
                              style: const TextStyle(fontSize: 12),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInfoRow({
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(icon, size: 16, color: Colors.grey[600]),
          const SizedBox(width: 8),
          Text(
            '$label: ',
            style: TextStyle(
              color: Colors.grey[600],
              fontSize: 14,
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusChip(Order order) {
    Color color;
    IconData icon;
    String text;

    if (order.isCompleted) {
      color = Colors.green;
      icon = Icons.check_circle;
      text = 'Tamamlandı';
    } else if (order.isCancelled) {
      color = Colors.red;
      icon = Icons.cancel;
      text = 'İptal';
    } else if (order.isDelivered) {
      color = Colors.teal;
      icon = Icons.done_all;
      text = 'Teslim Edildi';
    } else if (order.isShipped) {
      color = Colors.blue;
      icon = Icons.local_shipping;
      text = 'Kargoda';
    } else if (order.isPreparing) {
      color = Colors.orange;
      icon = Icons.inventory;
      text = 'Hazırlanıyor';
    } else if (order.isConfirmed) {
      color = Colors.purple;
      icon = Icons.verified;
      text = 'Onaylandı';
    } else {
      color = Colors.grey;
      icon = Icons.pending;
      text = 'Bekliyor';
    }

    return Chip(
      avatar: Icon(icon, size: 16, color: color),
      label: Text(text),
      backgroundColor: color.withOpacity(0.1),
      labelStyle: TextStyle(
        color: color,
        fontWeight: FontWeight.bold,
        fontSize: 12,
      ),
      visualDensity: VisualDensity.compact,
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }
}
