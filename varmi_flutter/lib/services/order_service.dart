import '../models/order.dart';
import '../config/api_config.dart';
import 'api_service.dart';

class OrderService {
  final ApiService _api = apiService;

  // Get All Orders
  Future<List<Order>> getOrders({
    String? status,
    String? role, // 'buyer' or 'seller'
  }) async {
    final response = await _api.get(
      ApiConfig.ordersEndpoint,
      queryParameters: {
        if (status != null) 'status': status,
        if (role != null) 'role': role,
      },
    );

    final data = response.data;
    List ordersData = [];

    if (data is List) {
      ordersData = data;
    } else if (data is Map && data['orders'] != null) {
      ordersData = data['orders'];
    } else if (data is Map && data['data'] != null) {
      ordersData = data['data'];
    }

    return ordersData.map((json) => Order.fromJson(json)).toList();
  }

  // Create Order from accepted offer
  Future<Order> createOrderFromOffer({
    required String offerId,
    required String listingId,
    String? addressId,
  }) async {
    final response = await _api.post(
      ApiConfig.ordersEndpoint,
      data: {
        'offer_id': offerId,
        'listing_id': listingId,
        if (addressId != null) 'address_id': addressId,
      },
    );
    final data = response.data;
    if (data is Map && data['order'] != null) {
      return Order.fromJson(data['order']);
    }
    return Order.fromJson(data);
  }

  // Get Order by ID
  Future<Order> getOrderById(String id) async {
    final response = await _api.get('${ApiConfig.ordersEndpoint}/$id');
    final data = response.data;
    
    if (data is Map && data['order'] != null) {
      return Order.fromJson(data['order']);
    }
    return Order.fromJson(data);
  }

  // Get My Buyer Orders
  Future<List<Order>> getMyBuyerOrders({String? status}) async {
    return getMyOrdersAsBuyer(status: status);
  }

  // Get My Seller Orders
  Future<List<Order>> getMySellerOrders({String? status}) async {
    return getMyOrdersAsSeller(status: status);
  }

  // Get My Orders as Buyer
  Future<List<Order>> getMyOrdersAsBuyer({String? status}) async {
    final response = await _api.get(
      '${ApiConfig.ordersEndpoint}/buyer',
      queryParameters: {
        if (status != null) 'status': status,
      },
    );

    final data = response.data;
    List ordersData = [];

    if (data is List) {
      ordersData = data;
    } else if (data is Map && data['orders'] != null) {
      ordersData = data['orders'];
    } else if (data is Map && data['data'] != null) {
      ordersData = data['data'];
    }

    return ordersData.map((json) => Order.fromJson(json)).toList();
  }

  // Get My Orders as Seller
  Future<List<Order>> getMyOrdersAsSeller({String? status}) async {
    final response = await _api.get(
      '${ApiConfig.ordersEndpoint}/seller',
      queryParameters: {
        if (status != null) 'status': status,
      },
    );

    final data = response.data;
    List ordersData = [];

    if (data is List) {
      ordersData = data;
    } else if (data is Map && data['orders'] != null) {
      ordersData = data['orders'];
    } else if (data is Map && data['data'] != null) {
      ordersData = data['data'];
    }

    return ordersData.map((json) => Order.fromJson(json)).toList();
  }

  // Update Order Status
  Future<Order> updateOrderStatus(String id, String status) async {
    final response = await _api.put(
      '${ApiConfig.ordersEndpoint}/$id/status',
      data: {'status': status},
    );
    return Order.fromJson(response.data['order'] ?? response.data);
  }

  // Start Processing
  Future<Order> startProcessing(String id) async {
    final response = await _api.post('${ApiConfig.ordersEndpoint}/$id/start-processing');
    return Order.fromJson(response.data['order'] ?? response.data);
  }

  // Mark as Shipped
  Future<Order> markAsShipped(String id, String carrierCompany, String trackingNumber) async {
    final response = await _api.put(
      '${ApiConfig.ordersEndpoint}/$id/ship',
      data: {
        'carrier_company': carrierCompany,
        'tracking_number': trackingNumber,
      },
    );
    return Order.fromJson(response.data['order'] ?? response.data);
  }

  // Confirm Delivery
  Future<Order> confirmDelivery(String id) async {
    final response = await _api.post('${ApiConfig.ordersEndpoint}/$id/confirm-delivery');
    return Order.fromJson(response.data['order'] ?? response.data);
  }

  // Confirm Order (Buyer confirms payment)
  Future<Order> confirmOrder(String id) async {
    final response = await _api.post('${ApiConfig.ordersEndpoint}/$id/confirm');
    return Order.fromJson(response.data['order'] ?? response.data);
  }

  // Start Preparing (Seller starts processing)
  Future<Order> startPreparing(String id) async {
    final response = await _api.post('${ApiConfig.ordersEndpoint}/$id/preparing');
    return Order.fromJson(response.data['order'] ?? response.data);
  }


  // Mark as Delivered (Buyer confirms delivery)
  Future<Order> markAsDelivered(String id) async {
    final response = await _api.post('${ApiConfig.ordersEndpoint}/$id/delivered');
    return Order.fromJson(response.data['order'] ?? response.data);
  }

  // Complete Order (System automatically after delivery)
  Future<Order> completeOrder(String id) async {
    final response = await _api.post('${ApiConfig.ordersEndpoint}/$id/complete');
    return Order.fromJson(response.data['order'] ?? response.data);
  }

  // Cancel Order
  Future<Order> cancelOrder(String id, {String? reason}) async {
    final response = await _api.post(
      '${ApiConfig.ordersEndpoint}/$id/cancel',
      data: {
        if (reason != null) 'reason': reason,
      },
    );
    return Order.fromJson(response.data['order'] ?? response.data);
  }

  // Get Order Status History
  Future<List<Map<String, dynamic>>> getOrderStatusHistory(String id) async {
    final response = await _api.get('${ApiConfig.ordersEndpoint}/$id/history');
    final data = response.data;

    if (data is List) {
      return List<Map<String, dynamic>>.from(data);
    } else if (data is Map && data['history'] != null) {
      return List<Map<String, dynamic>>.from(data['history']);
    }

    return [];
  }
}
