import 'dart:convert';
import 'package:image_picker/image_picker.dart';
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
  Future<Offer> createOffer(Map<String, dynamic> offerData, List<XFile> images) async {
    return createOfferWithData(
      listingId: offerData['listing_id'],
      price: (offerData['amount'] ?? offerData['price'] ?? 0).toDouble(),
      productName: offerData['product_name'],
      quantity: offerData['quantity'] ?? 1,
      deliveryType: offerData['delivery_type'],
      shippingDesi: offerData['shipping_desi']?.toString(),
      shippingCost: offerData['shipping_cost'] != null
          ? (offerData['shipping_cost'] as num).toDouble()
          : null,
      description: offerData['description'],
      xFiles: images,
    );
  }

  Future<Offer> createOfferWithData({
    required String listingId,
    required double price,
    required String productName,
    int quantity = 1,
    String condition = 'used',
    required String deliveryType,
    String? shippingDesi,
    double? shippingCost,
    int? etaDays,
    String? description,
    List<XFile>? xFiles,
    DateTime? validUntil,
  }) async {
    // Convert images to base64 strings (backend expects base64 in JSON body)
    List<String> base64Images = [];
    if (xFiles != null && xFiles.isNotEmpty) {
      for (final xFile in xFiles) {
        final bytes = await xFile.readAsBytes();
        final mimeType = xFile.mimeType ?? 'image/jpeg';
        base64Images.add('data:$mimeType;base64,${base64Encode(bytes)}');
      }
    }

    final response = await _api.post(
      ApiConfig.offersEndpoint,
      data: {
        'listing_id': listingId,
        'price': price,               // backend uses 'price'
        'product_name': productName,
        'quantity': quantity,
        'condition': condition,
        'delivery_type': deliveryType,
        if (shippingDesi != null) 'shipping_desi': shippingDesi,
        if (shippingCost != null) 'shipping_cost': shippingCost,
        if (etaDays != null) 'eta_days': etaDays,
        if (description != null) 'description': description,
        if (validUntil != null) 'valid_until': validUntil.toIso8601String(),
        if (base64Images.isNotEmpty) 'images': base64Images,
      },
    );

    final offerData = response.data is Map && response.data['offer'] != null
        ? response.data['offer']
        : response.data;
    return Offer.fromJson(offerData);
  }

  // Update Offer
  // Server expects camelCase body keys: price, productName, shippingDesi, shippingCost, deliveryType, validUntil
  Future<void> updateOffer(
    String id, {
    double? amount,
    String? productName,
    int? quantity,
    String? deliveryType,
    double? shippingDesi,
    double? shippingCost,
    String? description,
    DateTime? validUntil,
    List<String>? images,
  }) async {
    await _api.put(
      '${ApiConfig.offersEndpoint}/$id',
      data: {
        if (amount != null) 'price': amount,           // server reads 'price'
        if (productName != null) 'productName': productName,  // server reads 'productName'
        if (quantity != null) 'quantity': quantity,
        if (deliveryType != null) 'deliveryType': deliveryType, // camelCase
        if (shippingDesi != null) 'shippingDesi': shippingDesi, // camelCase
        if (shippingCost != null) 'shippingCost': shippingCost, // camelCase
        if (description != null) 'description': description,
        if (validUntil != null) 'validUntil': validUntil.toIso8601String(), // camelCase
        if (images != null) 'images': images,
      },
    );
  }

  // Upload Offer Images (web-safe, uses XFile bytes)
  Future<List<String>> uploadOfferXFiles(String offerId, List<XFile> xFiles) async {
    final response = await _api.uploadXFiles(
      '${ApiConfig.offersEndpoint}/$offerId/images',
      xFiles,
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
    await _api.patch(
      '${ApiConfig.offersEndpoint}/$id/status',
      data: {'status': 'accepted'},
    );
  }

  // Reject Offer
  Future<void> rejectOffer(String id, {String? reason}) async {
    await _api.patch(
      '${ApiConfig.offersEndpoint}/$id/status',
      data: {
        'status': 'rejected',
        if (reason != null) 'reason': reason,
      },
    );
  }

  // Withdraw Offer
  Future<void> withdrawOffer(String id) async {
    await _api.patch('${ApiConfig.offersEndpoint}/$id/withdraw');
  }

  // Delete Offer
  Future<void> deleteOffer(String id) async {
    await _api.delete('${ApiConfig.offersEndpoint}/$id');
  }
}
