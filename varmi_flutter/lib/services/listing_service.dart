import '../models/listing.dart';
import '../config/api_config.dart';
import 'api_service.dart';

class ListingService {
  final ApiService _api = apiService;

  // Get All Listings
  Future<List<Listing>> getListings({
    String? search,
    String? category,
    String? city,
    String? status,
    int? page,
    int? limit,
  }) async {
    final response = await _api.get(
      '${ApiConfig.listingsEndpoint}/active',
      queryParameters: {
        if (search != null) 'search': search,
        if (category != null) 'category': category,
        if (city != null) 'city': city,
        if (status != null) 'status': status,
        if (page != null) 'page': page,
        if (limit != null) 'limit': limit,
      },
    );

    final data = response.data;
    List listingsData = [];

    if (data is List) {
      listingsData = data;
    } else if (data is Map && data['listings'] != null) {
      listingsData = data['listings'];
    } else if (data is Map && data['data'] != null) {
      listingsData = data['data'];
    }

    return listingsData.map((json) => Listing.fromJson(json)).toList();
  }

  // Get Listing by ID
  Future<Listing> getListingById(String id) async {
    final response = await _api.get('${ApiConfig.listingsEndpoint}/$id');
    final data = response.data;
    
    if (data is Map && data['listing'] != null) {
      return Listing.fromJson(data['listing']);
    }
    return Listing.fromJson(data);
  }

  // Create Listing
  Future<Listing> createListing({
    required String title,
    required String category,
    required String listingCondition,
    required double budgetMax,
    double? budgetMin,
    required String deliveryType,
    String? city,
    String? description,
    List<String>? imagePaths,
    bool maskOwnerName = false,
  }) async {
    // First create the listing
    final response = await _api.post(
      ApiConfig.listingsEndpoint,
      data: {
        'title': title,
        'category': category,
        'listing_condition': listingCondition,
        'budget_max': budgetMax,
        if (budgetMin != null) 'budget_min': budgetMin,
        'delivery_type': deliveryType,
        if (city != null) 'city': city,
        if (description != null) 'description': description,
        'mask_owner_name': maskOwnerName,
      },
    );

    final listingData = response.data['listing'] ?? response.data;
    final listing = Listing.fromJson(listingData);

    // Upload images if provided
    if (imagePaths != null && imagePaths.isNotEmpty) {
      await uploadListingImages(listing.id, imagePaths);
    }

    return listing;
  }

  // Update Listing
  Future<Listing> updateListing(
    String id, {
    String? title,
    String? category,
    String? listingCondition,
    double? budgetMax,
    double? budgetMin,
    String? deliveryType,
    String? city,
    String? description,
    bool? maskOwnerName,
  }) async {
    final response = await _api.put(
      '${ApiConfig.listingsEndpoint}/$id',
      data: {
        if (title != null) 'title': title,
        if (category != null) 'category': category,
        if (listingCondition != null) 'listing_condition': listingCondition,
        if (budgetMax != null) 'budget_max': budgetMax,
        if (budgetMin != null) 'budget_min': budgetMin,
        if (deliveryType != null) 'delivery_type': deliveryType,
        if (city != null) 'city': city,
        if (description != null) 'description': description,
        if (maskOwnerName != null) 'mask_owner_name': maskOwnerName,
      },
    );

    return Listing.fromJson(response.data['listing'] ?? response.data);
  }

  // Delete Listing
  Future<void> deleteListing(String id) async {
    await _api.delete('${ApiConfig.listingsEndpoint}/$id');
  }

  // Upload Listing Images
  Future<List<String>> uploadListingImages(String listingId, List<String> imagePaths) async {
    final response = await _api.uploadFiles(
      '${ApiConfig.listingsEndpoint}/$listingId/images',
      imagePaths,
      fieldName: 'images',
    );

    final data = response.data;
    if (data is Map && data['images'] != null) {
      return List<String>.from(data['images']);
    }
    return [];
  }

  // Get My Listings
  Future<List<Listing>> getMyListings({String? status}) async {
    final response = await _api.get(
      '${ApiConfig.listingsEndpoint}/my',
      queryParameters: {
        if (status != null) 'status': status,
      },
    );

    final data = response.data;
    List listingsData = [];

    if (data is List) {
      listingsData = data;
    } else if (data is Map && data['listings'] != null) {
      listingsData = data['listings'];
    } else if (data is Map && data['data'] != null) {
      listingsData = data['data'];
    }

    return listingsData.map((json) => Listing.fromJson(json)).toList();
  }

  // Toggle Favorite
  Future<void> toggleFavorite(String listingId) async {
    await _api.post('${ApiConfig.favoritesEndpoint}/$listingId/toggle');
  }

  // Get Favorites
  Future<List<Listing>> getFavorites() async {
    final response = await _api.get(ApiConfig.favoritesEndpoint);
    final data = response.data;
    List listingsData = [];

    if (data is List) {
      listingsData = data;
    } else if (data is Map && data['favorites'] != null) {
      listingsData = data['favorites'];
    } else if (data is Map && data['data'] != null) {
      listingsData = data['data'];
    }

    return listingsData.map((json) => Listing.fromJson(json)).toList();
  }

  // Close Listing
  Future<void> closeListing(String id) async {
    await _api.patch(
      '${ApiConfig.listingsEndpoint}/$id/close',
    );
  }

  // Reactivate Listing
  Future<void> reactivateListing(String id) async {
    await _api.patch(
      '${ApiConfig.listingsEndpoint}/$id/reactivate',
    );
  }
}
