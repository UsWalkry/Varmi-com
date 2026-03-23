import 'dart:async';
import 'package:flutter/material.dart';
import '../../config/theme.dart';
import '../../config/api_config.dart';
import '../../models/listing.dart';
import '../../services/listing_service.dart';
import '../../utils/app_dialog.dart';
import '../../utils/formatters.dart';
import '../listings/listing_detail_screen.dart';
import '../profile/public_profile_screen.dart';
import '../profile/user_reviews_screen.dart';

class FavoritesScreen extends StatefulWidget {
  const FavoritesScreen({super.key});

  @override
  State<FavoritesScreen> createState() => _FavoritesScreenState();
}

class _FavoritesScreenState extends State<FavoritesScreen> {
  final ListingService _listingService = ListingService();
  List<Listing> _favorites = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadFavorites();
  }

  Future<void> _loadFavorites() async {
    setState(() { _isLoading = true; _error = null; });
    try {
      final fav = await _listingService.getFavorites();
      setState(() { _favorites = fav; _isLoading = false; });
    } catch (e) {
      setState(() { _error = e.toString(); _isLoading = false; });
    }
  }

  Future<void> _removeFavorite(String listingId) async {
    try {
      await _listingService.toggleFavorite(listingId);
      _loadFavorites();
      if (mounted) AppDialog.showInfo(context, 'Favorilerden çıkarıldı');
    } catch (e) {
      if (mounted) AppDialog.showError(context, AppDialog.cleanError(e));
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    return Scaffold(
      backgroundColor: colors.bg,
      appBar: _buildAppBar(colors),
      body: _isLoading
          ? Center(child: CircularProgressIndicator(color: const Color(0xFF9333EA), backgroundColor: colors.chipBg))
          : _error != null
              ? _buildError(colors)
              : _favorites.isEmpty
                  ? _buildEmpty(colors)
                  : _buildGrid(colors),
    );
  }

  PreferredSizeWidget _buildAppBar(AppThemeColors colors) {
    return PreferredSize(
      preferredSize: const Size.fromHeight(72),
      child: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF9333EA), Color(0xFF6366F1)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          boxShadow: [
            BoxShadow(
              color: Color(0x409333EA),
              blurRadius: 16,
              offset: Offset(0, 4),
            ),
          ],
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: Row(
              children: [
                // Icon badge
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.18),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.favorite_rounded,
                    color: Colors.white,
                    size: 22,
                  ),
                ),
                const SizedBox(width: 12),
                // Title + subtitle
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Text(
                        'Favorilerim',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.2,
                        ),
                      ),
                      if (!_isLoading && _error == null)
                        Text(
                          _favorites.isEmpty
                              ? 'Henüz favori eklenmedi'
                              : '${_favorites.length} ilan kaydedildi',
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.80),
                            fontSize: 12,
                            fontWeight: FontWeight.w400,
                          ),
                        ),
                    ],
                  ),
                ),
                // Refresh button
                _isLoading
                    ? const SizedBox(
                        width: 36, height: 36,
                        child: Center(
                          child: SizedBox(
                            width: 18, height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      )
                    : GestureDetector(
                        onTap: _loadFavorites,
                        child: Container(
                          width: 36,
                          height: 36,
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.18),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.refresh_rounded,
                            color: Colors.white,
                            size: 20,
                          ),
                        ),
                      ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildError(AppThemeColors colors) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 80, height: 80,
              decoration: BoxDecoration(color: colors.chipBg, shape: BoxShape.circle),
              child: const Icon(Icons.wifi_off_rounded, size: 38, color: Color(0xFF9333EA)),
            ),
            const SizedBox(height: 20),
            Text('Bağlantı Hatası',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: colors.textPrimary)),
            const SizedBox(height: 8),
            Text(_error!, style: TextStyle(fontSize: 13, color: colors.textSecondary),
                textAlign: TextAlign.center, maxLines: 3, overflow: TextOverflow.ellipsis),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: _loadFavorites,
              icon: const Icon(Icons.refresh_rounded, size: 18),
              label: const Text('Tekrar Dene'),
              style: FilledButton.styleFrom(
                backgroundColor: const Color(0xFF9333EA),
                padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmpty(AppThemeColors colors) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 96, height: 96,
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [Color(0xFF9333EA), Color(0xFF6366F1)],
                  begin: Alignment.topLeft, end: Alignment.bottomRight,
                ),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.favorite_border_rounded, size: 44, color: Colors.white),
            ),
            const SizedBox(height: 24),
            Text('Favori İlan Yok',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: colors.textPrimary)),
            const SizedBox(height: 8),
            Text(
              'Beğendiğiniz ilanları favorilere ekleyerek\nburadan takip edebilirsiniz.',
              style: TextStyle(fontSize: 14, color: colors.textSecondary, height: 1.5),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildGrid(AppThemeColors colors) {
    return CustomScrollView(
      physics: const BouncingScrollPhysics(),
      slivers: [
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(12, 10, 12, 32),
          sliver: SliverGrid(
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 0.70,
            ),
            delegate: SliverChildBuilderDelegate(
              (context, index) => _FavCardWidget(
                listing: _favorites[index],
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                      builder: (_) => ListingDetailScreen(listingId: _favorites[index].id)),
                ).then((_) => _loadFavorites()),
                onRemove: () => _removeFavorite(_favorites[index].id),
              ),
              childCount: _favorites.length,
            ),
          ),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
class _FavCardWidget extends StatefulWidget {
  final Listing listing;
  final VoidCallback onTap;
  final VoidCallback onRemove;

  const _FavCardWidget({required this.listing, required this.onTap, required this.onRemove});

  @override
  State<_FavCardWidget> createState() => _FavCardWidgetState();
}

class _FavCardWidgetState extends State<_FavCardWidget> {
  final PageController _pageController = PageController();
  Timer? _imageTimer;
  int _currentImage = 0;

  @override
  void initState() {
    super.initState();
    if (widget.listing.images.length > 1) {
      _imageTimer = Timer.periodic(const Duration(seconds: 3), (_) {
        if (!mounted) return;
        final next = (_currentImage + 1) % widget.listing.images.length;
        _pageController.animateToPage(next,
            duration: const Duration(milliseconds: 500), curve: Curves.easeInOut);
        setState(() => _currentImage = next);
      });
    }
  }

  @override
  void dispose() {
    _imageTimer?.cancel();
    _pageController.dispose();
    super.dispose();
  }

  String _imageUrl(String img) =>
      img.startsWith('http') ? img : '${ApiConfig.baseUrl}$img';

  Widget _placeholder() => Container(
        color: context.appColors.chipBg,
        child: const Center(child: Icon(Icons.image_rounded, size: 36, color: Color(0xFFD1D5DB))),
      );

  @override
  Widget build(BuildContext context) {
    final listing = widget.listing;
    final hasMultiple = listing.images.length > 1;

    return GestureDetector(
      onTap: widget.onTap,
      child: Container(
        decoration: BoxDecoration(
          color: context.appColors.card,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.07),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // IMAGE
            Stack(
              children: [
                SizedBox(
                  height: 130,
                  width: double.infinity,
                  child: listing.images.isEmpty
                      ? _placeholder()
                      : PageView.builder(
                          controller: _pageController,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: listing.images.length,
                          itemBuilder: (_, i) => Image.network(
                            _imageUrl(listing.images[i]),
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => _placeholder(),
                          ),
                        ),
                ),
                // gradient overlay
                Positioned(
                  bottom: 0, left: 0, right: 0,
                  child: Container(
                    height: 44,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.bottomCenter,
                        end: Alignment.topCenter,
                        colors: [
                          Colors.black.withValues(alpha: 0.38),
                          Colors.transparent,
                        ],
                      ),
                    ),
                  ),
                ),
                // price badge
                Positioned(
                  bottom: 8, left: 8,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                          colors: [Color(0xFF9333EA), Color(0xFF3B82F6)]),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      formatPriceShort(listing.budgetMax),
                      style: const TextStyle(
                          color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
                // Remove fav button (top-right)
                Positioned(
                  top: 6, right: 6,
                  child: GestureDetector(
                    onTap: widget.onRemove,
                    child: Container(
                      width: 30, height: 30,
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.92),
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                              color: Colors.black.withValues(alpha: 0.10),
                              blurRadius: 4),
                        ],
                      ),
                      child: const Icon(Icons.favorite_rounded,
                          size: 15, color: Color(0xFFEF4444)),
                    ),
                  ),
                ),
                // image dots
                if (hasMultiple)
                  Positioned(
                    bottom: 8, left: 0, right: 0,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: List.generate(
                        listing.images.length,
                        (i) => AnimatedContainer(
                          duration: const Duration(milliseconds: 300),
                          margin: const EdgeInsets.symmetric(horizontal: 2),
                          width: _currentImage == i ? 14 : 5,
                          height: 5,
                          decoration: BoxDecoration(
                            color: _currentImage == i
                                ? Colors.white
                                : Colors.white.withValues(alpha: 0.5),
                            borderRadius: BorderRadius.circular(3),
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
            // INFO
            Padding(
              padding: const EdgeInsets.fromLTRB(10, 10, 10, 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    listing.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: context.appColors.textPrimary,
                      height: 1.3,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      TweenAnimationBuilder<int>(
                        tween: IntTween(begin: 0, end: listing.offerCount ?? 0),
                        duration: const Duration(milliseconds: 900),
                        curve: Curves.easeOut,
                        builder: (_, val, __) => _metaChip(
                          Icons.local_offer_rounded,
                          '$val teklif',
                          const Color(0xFF9333EA),
                          const Color(0xFFEDE9FE),
                        ),
                      ),
                      const SizedBox(width: 6),
                      _metaChip(
                        Icons.visibility_rounded,
                        '${listing.viewCount}',
                        const Color(0xFF3B82F6),
                        const Color(0xFFDBEAFE),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: GestureDetector(
                          behavior: HitTestBehavior.opaque,
                          onTap: () => Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => PublicProfileScreen(
                                userId: listing.buyerId,
                                displayName: listing.buyerName,
                                maskOwnerName: listing.maskOwnerName,
                              ),
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                width: 20, height: 20,
                                decoration: const BoxDecoration(
                                  shape: BoxShape.circle,
                                  gradient: LinearGradient(
                                      colors: [Color(0xFF9333EA), Color(0xFF3B82F6)]),
                                ),
                                alignment: Alignment.center,
                                child: Text(
                                  (listing.buyerName ?? '').isNotEmpty
                                      ? listing.buyerName![0].toUpperCase()
                                      : '?',
                                  style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 9,
                                      fontWeight: FontWeight.bold),
                                ),
                              ),
                              const SizedBox(width: 5),
                              Flexible(
                                child: Text(
                                  maskName(listing.buyerName),
                                  style: TextStyle(
                                      fontSize: 10,
                                      color: context.appColors.textSecondary,
                                      fontWeight: FontWeight.w500),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      GestureDetector(
                        behavior: HitTestBehavior.opaque,
                        onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => UserReviewsScreen(
                              userId: listing.buyerId,
                              userName:
                                  listing.maskOwnerName ? null : listing.buyerName,
                            ),
                          ),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.star_rounded, size: 12, color: Color(0xFFFBBF24)),
                            SizedBox(width: 2),
                            Text(
                              'Değer.',
                              style: TextStyle(
                                  fontSize: 9,
                                  color: Color(0xFF9333EA),
                                  fontWeight: FontWeight.w600),
                            ),
                          ],
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
    );
  }

  Widget _metaChip(IconData icon, String label, Color fg, Color bg) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(8)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 10, color: fg),
          const SizedBox(width: 3),
          Text(label,
              style: TextStyle(fontSize: 10, color: fg, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}