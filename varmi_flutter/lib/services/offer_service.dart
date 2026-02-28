import '../models/offer.dart';
import '../config/api_config.dart';
import 'api_service.dart';

class OfferService {
  final ApiService _api = apiService;

  // Get Offers for Listing
  Future<List<Offer>> getOffersByListing(String listingId) async {
    final response = await _api.get(
      '${ApiConfig.offersEndpoint}/listing/$listingId',
    );

    final data = response.data;
    List offersData = [];

    if (data is List) {
      offersData = data;
    } else if (data is Map && data['offers'] != null) {
      offersData = data['offers'];
    } else if (data is Map && data['data'] != null) {
      offersData = data['data'];
    }

    return offersData.map((json) => Offer.fromJson(json)).toList();
  }

  // Get Offer by ID
  Future<Offer> getOfferById(String id) async {
    final response = await _api.get('${ApiConfig.offersEndpoint}/$id');
    final data = response.data;
    
    if (data is Map && data['offer'] != null) {
      return Offer.fromJson(data['offer']);
    }
    return Offer.fromJson(data);
  }

  // Create Offer
  Future<Offer> createOffer(Map<String, dynamic> offerData, List<dynamic> images) async {
    return createOfferWithData(
      listingId: offerData['listing_id'],
      amount: offerData['amount'],
      productName: offerData['product_name'],
      quantity: offerData['quantity'] ?? 1,
      deliveryType: offerData['delivery_type'],
      shippingDesi: offerData['shipping_desi'],
      shippingCost: offerData['shipping_cost'],
      description: offerData['description'],
      imagePaths: images.map((e) => e.path as String).toList(),
    );
  }

  Future<Offer> createOfferWithData({
    required String listingId,
    required double amount,
    required String productName,
    int quantity = 1,
    required String deliveryType,
    double? shippingDesi,
    double? shippingCost,
    String? description,
    List<String>? imagePaths,
    DateTime? validUntil,
  }) async {
    // First create the offer
    final response = await _api.post(
      ApiConfig.offersEndpoint,
      data: {
        'listing_id': listingId,
        'amount': amount,
        'product_name': productName,
        'quantity': quantity,
        'delivery_type': deliveryType,
        if (shippingDesi != null) 'shipping_desi': shippingDesi,
        if (shippingCost != null) 'shipping_cost': shippingCost,
        if (description != null) 'description': description,
        if (validUntil != null) 'valid_until': validUntil.toIso8601String(),
      },
    );

    final offerData = response.data['offer'] ?? response.data;
    final offer = Offer.fromJson(offerData);

    // Upload images if provided
    if (imagePaths != null && imagePaths.isNotEmpty) {
      await uploadOfferImages(offer.id, imagePaths);
    }

    return offer;
  }

  // Update Offer
  Future<Offer> updateOffer(
    String id, {
    double? amount,
    String? productName,
    int? quantity,
    String? deliveryType,
    double? shippingDesi,
    double? shippingCost,
    String? description,
    DateTime? validUntil,
  }) async {
    final response = await _api.put(
      '${ApiConfig.offersEndpoint}/$id',
      data: {
        if (amount != null) 'amount': amount,
        if (productName != null) 'product_name': productName,
        if (quantity != null) 'quantity': quantity,
        if (deliveryType != null) 'delivery_type': deliveryType,
        if (shippingDesi != null) 'shipping_desi': shippingDesi,
        if (shippingCost != null) 'shipping_cost': shippingCost,
        if (description != null) 'description': description,
        if (validUntil != null) 'valid_until': validUntil.toIso8601String(),
      },
    );

    return Offer.fromJson(response.data['offer'] ?? response.data);
  }

  // Upload Offer Images
  Future<List<String>> uploadOfferImages(String offerId, List<String> imagePaths) async {
    final response = await _api.uploadFiles(
      '${ApiConfig.offersEndpoint}/$offerId/images',
      imagePaths,
      fieldName: 'images',
    );

    final data = response.data;
    if (data is Map && data['images'] != null) {
      return List<String>.from(data['images']);
    }
    return [];
  }

  // Get Incoming Offers (offers on my listings)
  Future<List<Offer>> getIncomingOffers({String? status}) async {
    final response = await _api.get(
      '${ApiConfig.offersEndpoint}/incoming',
      queryParameters: {
        if (status != null) 'status': status,
      },
    );

    final data = response.data;
    List offersData = [];

    if (data is List) {
      offersData = data;
    } else if (data is Map && data['offers'] != null) {
      offersData = data['offers'];
    } else if (data is Map && data['data'] != null) {
      offersData = data['data'];
    }

    return offersData.map((json) => Offer.fromJson(json)).toList();
  }

  // Get My Offers
  Future<List<Offer>> getMyOffers({String? status}) async {
    final response = await _api.get(
      '${ApiConfig.offersEndpoint}/my',
      queryParameters: {
        if (status != null) 'status': status,
      },
    );

    final data = response.data;
    List offersData = [];

    if (data is List) {
      offersData = data;
    } else if (data is Map && data['offers'] != null) {
      offersData = data['offers'];
    } else if (data is Map && data['data'] != null) {
      offersData = data['data'];
    }

    return offersData.map((json) => Offer.fromJson(json)).toList();
  }

  // Accept Offer
  Future<void> acceptOffer(String id) async {
    await _api.post('${ApiConfig.offersEndpoint}/$id/accept');
  }

  // Reject Offer
  Future<void> rejectOffer(String id, {String? reason}) async {
    await _api.post(
      '${ApiConfig.offersEndpoint}/$id/reject',
      data: {
        if (reason != null) 'reason': reason,
      },
    );
  }

  // Withdraw Offer
  Future<void> withdrawOffer(String id) async {
    await _api.post('${ApiConfig.offersEndpoint}/$id/withdraw');
  }

  // Delete Offer
  Future<void> deleteOffer(String id) async {
    await _api.delete('${ApiConfig.offersEndpoint}/$id');
  }
}
