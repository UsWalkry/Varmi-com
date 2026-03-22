import 'package:image_picker/image_picker.dart';
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

    return listingsData.map((json) => Listing.fromJson(json as Map<String, dynamic>)).toList();
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
  Future<void> updateListing(
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
    List<String>? images,
  }) async {
    await _api.put(
      '${ApiConfig.listingsEndpoint}/$id',
      data: {
        if (title != null) 'title': title,
        if (category != null) 'category': category,
        // Server expects 'condition' (not 'listing_condition')
        if (listingCondition != null) 'condition': listingCondition,
        // Server expects 'price' (not 'budget_max')
        if (budgetMax != null) 'price': budgetMax,
        if (deliveryType != null) 'deliveryType': deliveryType,
        // Always send 'location' even when null — undefined causes MySQL bind error
        'location': city,
        if (description != null) 'description': description,
        if (maskOwnerName != null) 'maskOwnerName': maskOwnerName,
        if (images != null) 'images': images,
      },
    );
  }

  // Delete Listing
  Future<void> deleteListing(String id) async {
    await _api.delete('${ApiConfig.listingsEndpoint}/$id');
  }

  // Upload Listing Images (web-safe, uses XFile bytes)
  Future<List<String>> uploadListingXFiles(List<XFile> xFiles) async {
    final response = await _api.uploadXFiles(
      '${ApiConfig.listingsEndpoint}/upload-images',
      xFiles,
      fieldName: 'images',
    );
    final data = response.data;
    // Server returns { data: { imageUrls: [...] } } or { success, data: { imageUrls } }
    if (data is Map) {
      final inner = data['data'] ?? data;
      if (inner is Map && inner['imageUrls'] != null) {
        return List<String>.from(inner['imageUrls']);
      }
    }
    return [];
  }

  // Upload Listing Images (legacy path-based)
  Future<List<String>> uploadListingImages(
      String listingId, List<String> imagePaths) async {
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

  // Create Listing (web-safe)
  Future<Map<String, dynamic>> createListingWithXFiles({
    required String title,
    required String category,
    required String listingCondition,
    required double budgetMax,
    double? budgetMin,
    required String deliveryType,
    String? city,
    String? description,
    List<XFile>? xFiles,
    bool maskOwnerName = false,
  }) async {
    // 1. Upload images first to get URLs
    List<String> imageUrls = [];
    if (xFiles != null && xFiles.isNotEmpty) {
      imageUrls = await uploadListingXFiles(xFiles);
    }

    // 2. Create listing — field names must match backend exactly
    final response = await _api.post(
      '${ApiConfig.listingsEndpoint}/create',
      data: {
        'title': title,
        'category': category,
        'condition': listingCondition,   // backend uses 'condition'
        'budgetMax': budgetMax,          // backend uses 'budgetMax'
        'deliveryType': deliveryType,    // backend uses 'deliveryType'
        if (city != null && city.isNotEmpty) 'city': city,
        if (description != null && description.isNotEmpty) 'description': description,
        'maskOwnerName': maskOwnerName,
        'images': imageUrls,
      },
    );

    final data = response.data;
    return {
      'listingId': data['data']?['listingId'] ?? data['listingId'] ?? '',
      'message': data['data']?['message'] ?? 'İlan oluşturuldu',
      'requiresApproval': data['data']?['requiresApproval'] ?? true,
    };
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
    await _api.post('${ApiConfig.listingsEndpoint}/$listingId/favorite');
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

    return listingsData.map((json) {
      // Favorites API returns f.id (favorites row id) as 'id' and the real
      // listing UUID as 'listing_id'. Remap so navigation works correctly.
      final mapped = Map<String, dynamic>.from(json as Map);
      if (mapped['listing_id'] != null) {
        mapped['id'] = mapped['listing_id'];
      }
      return Listing.fromJson(mapped);
    }).toList();
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
