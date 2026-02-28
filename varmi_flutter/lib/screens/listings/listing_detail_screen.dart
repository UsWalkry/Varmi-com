import 'package:flutter/material.dart';
import '../../config/api_config.dart';
import 'package:provider/provider.dart';
import '../../models/listing.dart';
import '../../models/offer.dart';
import '../../services/listing_service.dart';
import '../../services/offer_service.dart';
import '../../providers/auth_provider.dart';
import '../offers/create_offer_screen.dart';

class ListingDetailScreen extends StatefulWidget {
  final String listingId;

  const ListingDetailScreen({
    super.key,
    required this.listingId,
  });

  @override
  State<ListingDetailScreen> createState() => _ListingDetailScreenState();
}

class _ListingDetailScreenState extends State<ListingDetailScreen> {
  final ListingService _listingService = ListingService();
  final OfferService _offerService = OfferService();
  
  Listing? _listing;
  List<Offer> _offers = [];
  bool _isLoading = true;
  bool _isFavorite = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final listing = await _listingService.getListingById(widget.listingId);
      final offers = await _offerService.getOffersByListing(widget.listingId);
      
      setState(() {
        _listing = listing;
        _offers = offers;
        _isFavorite = listing.isFavorite ?? false;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _toggleFavorite() async {
    try {
      await _listingService.toggleFavorite(widget.listingId);
      setState(() {
        _isFavorite = !_isFavorite;
      });
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(_isFavorite ? 'Favorilere eklendi' : 'Favorilerden çıkarıldı'),
            duration: const Duration(seconds: 2),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Hata: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final currentUserId = authProvider.user?.id;

    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(title: const Text('İlan Detayı')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_error != null || _listing == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('İlan Detayı')),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(_error ?? 'İlan bulunamadı'),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: _loadData,
                child: const Text('Tekrar Dene'),
              ),
            ],
          ),
        ),
      );
    }

    final listing = _listing!;
    final isOwner = currentUserId == listing.buyerId;

    return Scaffold(
      appBar: AppBar(
        title: const Text('İlan Detayı'),
        actions: [
          if (!isOwner)
            IconButton(
              icon: Icon(_isFavorite ? Icons.favorite : Icons.favorite_border),
              color: _isFavorite ? Colors.red : null,
              onPressed: _toggleFavorite,
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadData,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Resimler
              if (listing.images.isNotEmpty)
                SizedBox(
                  height: 300,
                  child: PageView.builder(
                    itemCount: listing.images.length,
                    itemBuilder: (context, index) {
                      final imageUrl = listing.images[index].startsWith('http') 
                        ? listing.images[index] 
                        : '${ApiConfig.baseUrl}${listing.images[index]}';
                      return Image.network(
                        imageUrl,
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) {
                          return Container(
                            color: Colors.grey[300],
                            child: const Icon(Icons.image_not_supported, size: 64),
                          );
                        },
                      );
                    },
                  ),
                )
              else
                Container(
                  height: 200,
                  color: Colors.grey[300],
                  child: const Center(
                    child: Icon(Icons.image_not_supported, size: 64),
                  ),
                ),

              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Başlık
                    Text(
                      listing.title,
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),

                    // Kategori
                    Chip(
                      label: Text(listing.category),
                      avatar: const Icon(Icons.category, size: 16),
                    ),
                    const SizedBox(height: 16),

                    // Bütçe
                    _buildInfoRow(
                      icon: Icons.attach_money,
                      label: 'Maksimum Bütçe',
                      value: '₺${listing.budgetMax.toStringAsFixed(2)}',
                    ),

                    // Şehir
                    _buildInfoRow(
                      icon: Icons.location_on,
                      label: 'Şehir',
                      value: listing.city ?? 'Belirtilmemiş',
                    ),

                    // Durum
                    _buildInfoRow(
                      icon: Icons.info,
                      label: 'Ürün Durumu',
                      value: listing.listingCondition,
                    ),

                    // Teslimat Tipi
                    _buildInfoRow(
                      icon: Icons.local_shipping,
                      label: 'Teslimat',
                      value: listing.deliveryType,
                    ),

                    const Divider(height: 32),

                    // Açıklama
                    if (listing.description != null && listing.description!.isNotEmpty) ...[
                      Text(
                        'Açıklama',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(listing.description!),
                      const Divider(height: 32),
                    ],

                    // İstatistikler
                    Row(
                      children: [
                        _buildStatChip(
                          icon: Icons.visibility,
                          label: '${listing.viewCount} görüntülenme',
                        ),
                        const SizedBox(width: 8),
                        _buildStatChip(
                          icon: Icons.favorite,
                          label: '${listing.favoriteCount} favori',
                        ),
                      ],
                    ),
                    const Divider(height: 32),

                    // Teklifler Başlığı
                    Text(
                      'Teklifler (${_offers.length})',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Teklifler Listesi
                    if (_offers.isEmpty)
                      const Center(
                        child: Padding(
                          padding: EdgeInsets.all(32),
                          child: Text('Henüz teklif yok'),
                        ),
                      )
                    else
                      ListView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: _offers.length,
                        itemBuilder: (context, index) {
                          return _buildOfferCard(_offers[index]);
                        },
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
      bottomNavigationBar: !isOwner && listing.isActive
          ? SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => CreateOfferScreen(
                          listingId: widget.listingId,
                        ),
                      ),
                    ).then((_) => _loadData());
                  },
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  child: const Text(
                    'Teklif Ver',
                    style: TextStyle(fontSize: 16),
                  ),
                ),
              ),
            )
          : null,
    );
  }

  Widget _buildInfoRow({
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Icon(icon, size: 20, color: Colors.grey[600]),
          const SizedBox(width: 8),
          Text(
            '$label: ',
            style: TextStyle(
              color: Colors.grey[600],
              fontWeight: FontWeight.w500,
            ),
          ),
          Text(
            value,
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }

  Widget _buildStatChip({required IconData icon, required String label}) {
    return Chip(
      avatar: Icon(icon, size: 16),
      label: Text(label),
      visualDensity: VisualDensity.compact,
    );
  }

  Widget _buildOfferCard(Offer offer) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: offer.images.isNotEmpty
            ? ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: Image.network(
                  offer.images[0].startsWith('http') 
                    ? offer.images[0] 
                    : '${ApiConfig.baseUrl}${offer.images[0]}',
                  width: 60,
                  height: 60,
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) {
                    return Container(
                      width: 60,
                      height: 60,
                      color: Colors.grey[300],
                      child: const Icon(Icons.image),
                    );
                  },
                ),
              )
            : Container(
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.local_offer),
              ),
        title: Text(
          offer.productName,
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('₺${offer.amount.toStringAsFixed(2)}'),
            Text(
              'Durum: ${offer.approvalStatus}',
              style: TextStyle(
                color: offer.isApproved ? Colors.green : Colors.orange,
                fontSize: 12,
              ),
            ),
          ],
        ),
        trailing: offer.isActive
            ? const Icon(Icons.check_circle, color: Colors.green)
            : const Icon(Icons.cancel, color: Colors.grey),
        onTap: () {
          // Teklif detay ekranına git
        },
      ),
    );
  }
}
