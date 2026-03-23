import 'package:flutter/material.dart';
import '../../config/theme.dart';
import '../../services/api_service.dart';
import '../../utils/formatters.dart';
import 'user_reviews_screen.dart';
import '../listings/listing_detail_screen.dart';

class PublicProfileScreen extends StatefulWidget {
  final String userId;
  final String? displayName;
  final bool maskOwnerName;

  const PublicProfileScreen({
    super.key,
    required this.userId,
    this.displayName,
    this.maskOwnerName = false,
  });

  @override
  State<PublicProfileScreen> createState() => _PublicProfileScreenState();
}

class _PublicProfileScreenState extends State<PublicProfileScreen> {
  Map<String, dynamic>? _profile;
  List<Map<String, dynamic>> _listings = [];
  List<Map<String, dynamic>> _offers = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    try {
      final results = await Future.wait([
        apiService.get('/api/users/${widget.userId}/profile'),
        apiService.get('/api/users/${widget.userId}/listings'),
        apiService.get('/api/users/${widget.userId}/offers'),
      ]);

      final profileData = results[0].data;
      final listingsData = results[1].data;
      final offersData = results[2].data;

      if (profileData is Map && profileData['success'] == true) {
        setState(() {
          _profile = profileData['user'] as Map<String, dynamic>;
          _listings = listingsData is Map && listingsData['success'] == true
              ? List<Map<String, dynamic>>.from(listingsData['listings'] ?? [])
              : [];
          _offers = offersData is Map && offersData['success'] == true
              ? List<Map<String, dynamic>>.from(offersData['offers'] ?? [])
              : [];
          _isLoading = false;
        });
      } else {
        setState(() {
          _error = 'Profil yüklenemedi';
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Profil yüklenemedi';
        _isLoading = false;
      });
    }
  }

  String _masked(String name) {
    return maskName(name);
  }

  String _initials(String? firstName, String? lastName) {
    final f = (firstName ?? '').isNotEmpty ? firstName![0].toUpperCase() : '';
    final l = (lastName ?? '').isNotEmpty ? lastName![0].toUpperCase() : '';
    return '$f$l';
  }

  String _memberSince(String? createdAt) {
    if (createdAt == null) return '';
    final dt = DateTime.tryParse(createdAt);
    if (dt == null) return '';
    final months = [
      'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ];
    return '${months[dt.month - 1]} ${dt.year}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: context.appColors.bg,
      body: _isLoading
          ? _buildLoading()
          : _error != null
              ? _buildError()
              : _buildContent(),
    );
  }

  Widget _buildLoading() {
    return const Center(
      child: CircularProgressIndicator(
        valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF9333EA)),
      ),
    );
  }

  Widget _buildError() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, size: 48, color: Color(0xFF6B7280)),
          const SizedBox(height: 12),
          Text(_error!, style: const TextStyle(color: Color(0xFF6B7280))),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () {
              setState(() { _isLoading = true; _error = null; });
              _loadProfile();
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF9333EA),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: const Text('Tekrar Dene'),
          ),
        ],
      ),
    );
  }

  Widget _buildContent() {
    final p = _profile!;
    final firstName = p['firstName'] as String? ?? '';
    final lastName = p['lastName'] as String? ?? '';
    final rawName = '$firstName $lastName'.trim();
    final fullName = _masked(rawName);
    final initials = _initials(firstName, lastName);
    final memberSince = _memberSince(p['created_at'] as String?);
    final city = p['city'] as String? ?? '';
    final ratingAvg = double.tryParse(p['rating_avg']?.toString() ?? '0') ?? 0.0;
    final ratingCount = int.tryParse(p['rating_count']?.toString() ?? '0') ?? 0;
    final listingsCount = int.tryParse(p['listings_count']?.toString() ?? '0') ?? 0;
    final offersCount = int.tryParse(p['offers_count']?.toString() ?? '0') ?? 0;

    return CustomScrollView(
      slivers: [
        // ── Header ──────────────────────────────────
        SliverAppBar(
          expandedHeight: 200,
          pinned: true,
          backgroundColor: const Color(0xFF9333EA),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white),
            onPressed: () => Navigator.pop(context),
          ),
          title: const Text(
            'Profil',
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
          ),
          flexibleSpace: FlexibleSpaceBar(
            background: Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [Color(0xFF9333EA), Color(0xFF3B82F6)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              child: SafeArea(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const SizedBox(height: 40),
                    // Avatar
                    Container(
                      width: 72,
                      height: 72,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: Colors.white.withValues(alpha: 0.25),
                        border: Border.all(color: Colors.white, width: 2.5),
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        initials.isNotEmpty ? initials : '?',
                        style: const TextStyle(
                          fontSize: 26,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      fullName.isNotEmpty ? fullName : 'Kullanıcı',
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    if (city.isNotEmpty || memberSince.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 4),
                        child: Text(
                          [if (city.isNotEmpty) city, if (memberSince.isNotEmpty) 'Üye: $memberSince'].join(' · '),
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.white.withValues(alpha: 0.85),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ),
        ),

        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // ── Stats ────────────────────────────────
                Row(
                  children: [
                    _statCard('İlanlar', listingsCount.toString(), Icons.list_alt_rounded, const Color(0xFF9333EA)),
                    const SizedBox(width: 12),
                    _statCard('Teklifler', offersCount.toString(), Icons.local_offer_rounded, const Color(0xFF3B82F6)),
                    const SizedBox(width: 12),
                    _statCard('Değ.', ratingCount.toString(), Icons.reviews_rounded, const Color(0xFF14B8A6)),
                  ],
                ),
                const SizedBox(height: 16),

                // ── Rating card ──────────────────────────
                if (ratingCount > 0)
                  GestureDetector(
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => UserReviewsScreen(
                          userId: widget.userId,
                          userName: fullName,
                        ),
                      ),
                    ),
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: context.appColors.card,
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.06),
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Row(
                        children: [
                          ShaderMask(
                            shaderCallback: (b) => const LinearGradient(
                              colors: [Color(0xFF9333EA), Color(0xFF3B82F6)],
                            ).createShader(b),
                            child: const Icon(Icons.star_rounded, size: 36, color: Colors.white),
                          ),
                          const SizedBox(width: 12),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                ratingAvg.toStringAsFixed(1),
                                style: TextStyle(
                                  fontSize: 24,
                                  fontWeight: FontWeight.bold,
                                  color: context.appColors.textPrimary,
                                ),
                              ),
                              Text(
                                '$ratingCount değlendirme',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: context.appColors.textSecondary,
                                ),
                              ),
                            ],
                          ),
                          const Spacer(),
                          _starRow(ratingAvg),
                          const SizedBox(width: 8),
                          const Icon(Icons.chevron_right_rounded, color: Color(0xFF9333EA)),
                        ],
                      ),
                    ),
                  ),

                if (ratingCount == 0) ...[
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: context.appColors.card,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.06),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.star_border_rounded, size: 32, color: Colors.grey.shade400),
                        const SizedBox(width: 12),
                        Text(
                          'Henüz değerlendirme yok',
                          style: TextStyle(color: context.appColors.textSecondary),
                        ),
                      ],
                    ),
                  ),
                ],

                if (ratingCount > 0) ...[
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: () => Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => UserReviewsScreen(
                            userId: widget.userId,
                            userName: fullName,
                          ),
                        ),
                      ),
                      icon: const Icon(Icons.reviews_rounded, size: 16),
                      label: const Text('Tüm Değerlendirmeleri Gör'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFF9333EA),
                        side: const BorderSide(color: Color(0xFF9333EA)),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                    ),
                  ),
                ],

                // ── Listings ─────────────────────────────
                if (_listings.isNotEmpty) ...[  
                  const SizedBox(height: 20),
                  _sectionHeader('İlanları', _listings.length),
                  const SizedBox(height: 10),
                  ..._listings.map((l) => _listingRow(l)),
                ],

                // ── Offers ───────────────────────────────
                if (_offers.isNotEmpty) ...[  
                  const SizedBox(height: 20),
                  _sectionHeader('Teklifleri', _offers.length),
                  const SizedBox(height: 10),
                  ..._offers.map((o) => _offerRow(o)),
                ],

                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _sectionHeader(String title, int count) {
    return Row(
      children: [
        Text(
          title,
          style: TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.bold,
            color: context.appColors.textPrimary,
          ),
        ),
        const SizedBox(width: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
          decoration: BoxDecoration(
            color: const Color(0xFFEDE9FE),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(
            '$count',
            style: const TextStyle(fontSize: 12, color: Color(0xFF9333EA), fontWeight: FontWeight.w600),
          ),
        ),
      ],
    );
  }

  Widget _listingRow(Map<String, dynamic> l) {
    final images = l['images'];
    String? imageUrl;
    if (images is List && images.isNotEmpty) imageUrl = images[0] as String?;
    final budget = double.tryParse(l['budget_max']?.toString() ?? '0') ?? 0;
    final status = l['status'] as String? ?? '';
    final Color statusColor = status == 'active' ? const Color(0xFF10B981) : const Color(0xFF6B7280);
    final String statusLabel = status == 'active' ? 'Aktif' : status == 'inactive' ? 'Pasif' : status == 'closed' ? 'Kapandı' : status;

    return GestureDetector(
      onTap: () => Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => ListingDetailScreen(listingId: l['id'] as String)),
      ),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: context.appColors.card,
          borderRadius: BorderRadius.circular(14),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: imageUrl != null
                  ? Image.network(imageUrl, width: 60, height: 60, fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => _imagePlaceholder())
                  : _imagePlaceholder(),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    l['title'] as String? ?? '',
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: context.appColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Text(
                        '₺${Formatters.formatPriceShort(budget)}',
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF9333EA),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                        decoration: BoxDecoration(
                          color: statusColor.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          statusLabel,
                          style: TextStyle(fontSize: 11, color: statusColor, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right_rounded, color: Color(0xFF9333EA), size: 20),
          ],
        ),
      ),
    );
  }

  Widget _offerRow(Map<String, dynamic> o) {
    final price = double.tryParse(o['price']?.toString() ?? '0') ?? 0;
    final status = o['status'] as String? ?? '';
    final Color statusColor;
    final String statusLabel;
    switch (status) {
      case 'active': statusColor = const Color(0xFF3B82F6); statusLabel = 'Aktif'; break;
      case 'accepted': statusColor = const Color(0xFF10B981); statusLabel = 'Kabul Edildi'; break;
      case 'rejected': statusColor = const Color(0xFFEF4444); statusLabel = 'Reddedildi'; break;
      case 'withdrawn': statusColor = const Color(0xFF6B7280); statusLabel = 'Geri Çekildi'; break;
      default: statusColor = const Color(0xFF6B7280); statusLabel = status;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: context.appColors.card,
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: const Color(0xFFEDE9FE),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(Icons.local_offer_rounded, color: Color(0xFF9333EA), size: 22),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  o['listing_title'] as String? ?? 'İlan',
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: context.appColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Text(
                      '₺${Formatters.formatPriceShort(price)}',
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF3B82F6),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                      decoration: BoxDecoration(
                        color: statusColor.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        statusLabel,
                        style: TextStyle(fontSize: 11, color: statusColor, fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _imagePlaceholder() {
    return Container(
      width: 60,
      height: 60,
      color: const Color(0xFFEDE9FE),
      child: const Icon(Icons.image_not_supported_rounded, color: Color(0xFF9333EA), size: 28),
    );
  }

  Widget _statCard(String label, String value, IconData icon, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 10),
        decoration: BoxDecoration(
          color: context.appColors.card,
          borderRadius: BorderRadius.circular(14),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.06),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          children: [
            Icon(icon, size: 22, color: color),
            const SizedBox(height: 6),
            Text(
              value,
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(fontSize: 11, color: context.appColors.textSecondary),
            ),
          ],
        ),
      ),
    );
  }

  Widget _starRow(double rating) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(5, (i) {
        if (i < rating.floor()) {
          return const Icon(Icons.star_rounded, size: 16, color: Color(0xFFFBBF24));
        } else if (i < rating) {
          return const Icon(Icons.star_half_rounded, size: 16, color: Color(0xFFFBBF24));
        } else {
          return const Icon(Icons.star_border_rounded, size: 16, color: Color(0xFFFBBF24));
        }
      }),
    );
  }
}
