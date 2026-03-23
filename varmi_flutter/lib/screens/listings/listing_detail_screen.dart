import 'package:flutter/material.dart';
import '../../config/theme.dart';
import '../../utils/app_dialog.dart';
import '../../config/api_config.dart';
import 'package:provider/provider.dart';
import '../../models/listing.dart';
import '../../models/offer.dart';
import '../../services/listing_service.dart';
import '../../services/offer_service.dart';
import '../../services/api_service.dart';
import '../../providers/auth_provider.dart';
import '../../utils/formatters.dart';
import '../offers/create_offer_screen.dart';
import '../profile/public_profile_screen.dart';
import '../profile/user_reviews_screen.dart';

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
  int _activeImage = 0;
  bool _descExpanded = false;

  static const int _descMax = 220;

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
        _isFavorite = listing.isFavorite;
        _isLoading = false;
        _activeImage = 0;
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
      setState(() => _isFavorite = !_isFavorite);
      if (mounted) {
        AppDialog.showSuccess(context, _isFavorite ? 'Favorilere eklendi' : "Favorilerden çıkarıldı");
      }
    } catch (e) {
      if (mounted) {
        AppDialog.showError(context, AppDialog.cleanError(e));
      }
    }
  }

  String _imageUrl(String path) =>
      path.startsWith('http') ? path : '${ApiConfig.baseUrl}$path';

  /// "Teklif Ver" butonuna basınca çağrılır.
  /// İlan sıfır ürün istiyorsa, önce satıcı profili kontrolü yapar.
  Future<void> _handleOfferTap(BuildContext context, Listing listing) async {
    if (listing.listingCondition == 'new') {
      bool hasApprovedProfile = false;
      try {
        final response = await apiService.get('/api/seller-profile/my-profile');
        final data = response.data;
        final profile = data is Map ? (data['data'] ?? data['profile']) : null;
        final status = profile is Map ? profile['approval_status'] : null;
        hasApprovedProfile = (status == 'approved');
      } catch (_) {
        hasApprovedProfile = false;
      }

      if (!hasApprovedProfile) {
        if (mounted) {
          showDialog(
            context: context,
            builder: (_) => AlertDialog(
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20)),
              icon: const Icon(Icons.store_outlined,
                  size: 48, color: Color(0xFF7C3AED)),
              title: const Text('Satıcı Profili Gerekli',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontWeight: FontWeight.bold)),
              content: const Text(
                'Bu ilan yalnızca sıfır ürün kabul etmektedir.\n\n'
                'Teklif verebilmek için onaylı bir satıcı profiline sahip olmanız gerekmektedir. '
                'Lütfen profilinizden satıcı başvurusu oluşturun ve admin onayını bekleyin.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 14, height: 1.5),
              ),
              actionsAlignment: MainAxisAlignment.center,
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Tamam'),
                ),
              ],
            ),
          );
        }
        return;
      }
    }

    if (mounted) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => CreateOfferScreen(
            listingId: listing.id,
            listingDeliveryType: listing.deliveryType,
            listingCondition: listing.listingCondition,
            listingBudgetMax: listing.budgetMax,
            listingTitle: listing.title,
          ),
        ),
      ).then((_) => _loadData());
    }
  }


  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final currentUserId = authProvider.user?.id;

    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(title: const Text("\u0130lan Detay\u0131")),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_error != null || _listing == null) {
      return Scaffold(
        appBar: AppBar(title: const Text("\u0130lan Detay\u0131")),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(_error ?? "\u0130lan bulunamad\u0131"),
              const SizedBox(height: 16),
              ElevatedButton(onPressed: _loadData, child: const Text('Tekrar Dene')),
            ],
          ),
        ),
      );
    }

    final listing = _listing!;
    final isOwner = currentUserId == listing.buyerId;
    final showCity = listing.deliveryType != 'shipping' &&
        listing.deliveryType != 'cargo' &&
        listing.city != null &&
        listing.city!.isNotEmpty;

    return Scaffold(
      backgroundColor: context.appColors.bg,
      appBar: AppBar(
        title: const Text("\u0130lan Detay\u0131"),
        backgroundColor: context.appColors.card,
        foregroundColor: context.isDark ? const Color(0xFFF1F5F9) : Colors.black87,
        elevation: 0,
        actions: [
          if (!isOwner)
            IconButton(
              icon: Icon(
                _isFavorite ? Icons.favorite : Icons.favorite_border,
                color: _isFavorite ? Colors.red : Colors.grey[600],
              ),
              onPressed: _toggleFavorite,
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadData,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Column(
            children: [
              _buildGallery(listing),
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildTitleSection(listing),
                    const SizedBox(height: 16),
                    _SellerProfileCard(
                      buyerId: listing.buyerId,
                      buyerName: listing.buyerName,
                      maskOwnerName: listing.maskOwnerName,
                    ),
                    const SizedBox(height: 16),
                    _buildInfoCard(listing, showCity),
                    const SizedBox(height: 16),
                    if (listing.description != null && listing.description!.isNotEmpty)
                      _buildDescription(listing.description!),
                    const SizedBox(height: 16),
                    _buildStats(listing),
                    const SizedBox(height: 24),
                    _buildOffersSection(),
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
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                child: ElevatedButton(
                  onPressed: () => _handleOfferTap(context, listing),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 15),
                    backgroundColor: const Color(0xFF7C3AED),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Teklif Ver',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                ),
              ),
            )
          : null,
    );
  }

  Widget _buildGallery(Listing listing) {
    if (listing.images.isEmpty) {
      return Container(
        height: 260,
        color: Colors.grey[200],
        child: const Center(
            child: Icon(Icons.image_not_supported, size: 64, color: Colors.grey)),
      );
    }

    return Column(
      children: [
        SizedBox(
          height: 280,
          child: GestureDetector(
            onTap: () => _openLightbox(listing.images),
            child: Stack(
              fit: StackFit.expand,
              children: [
                Image.network(
                  _imageUrl(listing.images[_activeImage]),
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Container(color: Colors.grey[300]),
                ),
                Container(color: Colors.black.withOpacity(0.25)),
                Image.network(
                  _imageUrl(listing.images[_activeImage]),
                  fit: BoxFit.contain,
                  errorBuilder: (_, __, ___) =>
                      const Icon(Icons.broken_image, size: 64, color: Colors.grey),
                ),
                if (listing.images.length > 1) ...[
                  Positioned(
                    left: 8, top: 0, bottom: 0,
                    child: Center(child: _arrowButton(Icons.chevron_left, () {
                      setState(() => _activeImage =
                          (_activeImage - 1 + listing.images.length) %
                              listing.images.length);
                    })),
                  ),
                  Positioned(
                    right: 8, top: 0, bottom: 0,
                    child: Center(child: _arrowButton(Icons.chevron_right, () {
                      setState(() =>
                          _activeImage = (_activeImage + 1) % listing.images.length);
                    })),
                  ),
                  Positioned(
                    bottom: 10, right: 12,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.black.withOpacity(0.6),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text('${_activeImage + 1} / ${listing.images.length}',
                          style: const TextStyle(color: Colors.white, fontSize: 12)),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
        if (listing.images.length > 1)
          Container(
            height: 72,
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: listing.images.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (context, idx) {
                final selected = idx == _activeImage;
                return GestureDetector(
                  onTap: () => setState(() => _activeImage = idx),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 180),
                    width: 56, height: 56,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: selected ? const Color(0xFF7C3AED) : Colors.grey[300]!,
                        width: selected ? 2.5 : 1,
                      ),
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(6),
                      child: Image.network(
                        _imageUrl(listing.images[idx]),
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) =>
                            Container(color: Colors.grey[300]),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
      ],
    );
  }

  Widget _arrowButton(IconData icon, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(6),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.85),
          shape: BoxShape.circle,
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.15), blurRadius: 6)],
        ),
        child: Icon(icon, size: 22, color: Colors.black87),
      ),
    );
  }

  void _openLightbox(List<String> images) {
    showDialog(
      context: context,
      barrierColor: Colors.black87,
      builder: (_) => _LightboxDialog(
        images: images.map(_imageUrl).toList(),
        initialIndex: _activeImage,
      ),
    );
  }

  Widget _buildTitleSection(Listing listing) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(listing.title,
            style: const TextStyle(
                fontSize: 22, fontWeight: FontWeight.bold, color: Colors.black87)),
        const SizedBox(height: 10),
        Wrap(
          spacing: 8,
          runSpacing: 6,
          children: [
            _badge(listing.category,
                color: const Color(0xFFF3F4F6), textColor: Colors.black54),
            _badge(
              Formatters.deliveryToTr(listing.deliveryType),
              icon: Icons.local_shipping_outlined,
              color: const Color(0xFFEDE9FE),
              textColor: const Color(0xFF7C3AED),
            ),
            _badge(
              Formatters.conditionToTr(listing.listingCondition),
              icon: Icons.info_outline,
              color: const Color(0xFFECFDF5),
              textColor: const Color(0xFF059669),
            ),
          ],
        ),
      ],
    );
  }

  Widget _badge(String text,
      {IconData? icon,
      Color? color,
      Color? textColor}) {
    final bg = color ?? context.appColors.chipBg;
    final fg = textColor ?? context.appColors.textSecondary;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(20)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 13, color: fg),
            const SizedBox(width: 4),
          ],
          Text(text,
              style: TextStyle(
                  fontSize: 12, color: fg, fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }

  Widget _buildInfoCard(Listing listing, bool showCity) {
    return Container(
      decoration: BoxDecoration(
        color: context.appColors.card,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withOpacity(0.06),
              blurRadius: 12,
              offset: const Offset(0, 2)),
        ],
      ),
      child: Column(
        children: [
          _infoRow(
            icon: Icons.currency_lira,
            iconColor: const Color(0xFF059669),
            label: "Maksimum Bütçe",
            value: formatPriceShort(listing.budgetMax),
            valueStyle: const TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.bold,
                color: Color(0xFF059669)),
            isFirst: true,
          ),
          if (showCity)
            _infoRow(
              icon: Icons.location_on_outlined,
              iconColor: const Color(0xFF6B7280),
              label: "\u015Fehir",
              value: listing.city!,
            ),
          _infoRow(
            icon: Icons.local_shipping_outlined,
            iconColor: const Color(0xFF7C3AED),
            label: 'Teslimat',
            value: Formatters.deliveryToTr(listing.deliveryType),
          ),
          _infoRow(
            icon: Icons.inventory_2_outlined,
            iconColor: const Color(0xFF059669),
            label: "\u00DCr\u00FCn Durumu",
            value: Formatters.conditionToTr(listing.listingCondition),
            isLast: true,
          ),
        ],
      ),
    );
  }

  Widget _infoRow({
    required IconData icon,
    required Color iconColor,
    required String label,
    required String value,
    TextStyle? valueStyle,
    bool isFirst = false,
    bool isLast = false,
  }) {
    return Container(
      decoration: BoxDecoration(
        border: Border(
            bottom: isLast
                ? BorderSide.none
                : BorderSide(color: Colors.grey[100]!)),
      ),
      padding: EdgeInsets.fromLTRB(16, isFirst ? 16 : 12, 16, isLast ? 16 : 12),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: iconColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, size: 18, color: iconColor),
          ),
          const SizedBox(width: 12),
          Expanded(
              child: Text(label,
                  style: TextStyle(fontSize: 13, color: Colors.grey[600]))),
          Text(value,
              style: valueStyle ??
                  const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: Colors.black87)),
        ],
      ),
    );
  }

  Widget _buildDescription(String desc) {
    final isLong = desc.length > _descMax;
    final shown = !isLong || _descExpanded ? desc : '${desc.substring(0, _descMax)}...';
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withOpacity(0.06),
              blurRadius: 12,
              offset: const Offset(0, 2)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text("A\u00E7\u0131klama",
              style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                  color: context.appColors.textPrimary)),
          const SizedBox(height: 10),
          Text(shown,
              style: TextStyle(fontSize: 14, color: context.appColors.textSecondary, height: 1.5)),
          if (isLong) ...[
            const SizedBox(height: 8),
            GestureDetector(
              onTap: () => setState(() => _descExpanded = !_descExpanded),
              child: Text(
                _descExpanded ? "Daha az g\u00F6ster" : "Daha fazla g\u00F6ster",
                style: const TextStyle(
                    fontSize: 13,
                    color: Color(0xFF7C3AED),
                    fontWeight: FontWeight.w500),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildStats(Listing listing) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        _statChip(Icons.visibility_outlined, "${listing.viewCount} g\u00F6r\u00FCnt\u00FClenme"),
        _statChip(Icons.favorite_border, '${listing.favoriteCount} favori'),
        if (listing.offerCount != null)
          _statChip(Icons.local_offer_outlined, '${listing.offerCount} teklif'),
      ],
    );
  }

  Widget _statChip(IconData icon, String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
      decoration: BoxDecoration(
        color: context.appColors.card,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: context.appColors.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: context.appColors.textSecondary),
          const SizedBox(width: 5),
          Text(label, style: TextStyle(fontSize: 12, color: context.appColors.textSecondary)),
        ],
      ),
    );
  }

  Future<void> _withdrawOffer(String offerId) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Teklifi Geri Çek'),
        content: const Text('Bu teklifi geri çekmek istediğinizden emin misiniz?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('İptal')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Geri Çek'),
          ),
        ],
      ),
    );
    if (confirm != true) return;
    try {
      await _offerService.withdrawOffer(offerId);
      await _loadData();
      if (mounted) AppDialog.showSuccess(context, 'Teklif geri çekildi');
    } catch (e) {
      if (mounted) AppDialog.showError(context, 'Hata: $e');
    }
  }

  Widget _buildOffersSection() {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final currentUserId = authProvider.user?.id;
    final listingOwnerId = _listing?.buyerId;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Teklifler (${_offers.length})',
            style: const TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.bold,
                color: Colors.black87)),
        const SizedBox(height: 12),
        if (_offers.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: context.appColors.card,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: context.appColors.border),
            ),
            child: const Center(
                child: Text('Henüz teklif yok',
                    style: TextStyle(color: Colors.grey))),
          )
        else
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _offers.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (context, index) => _OfferCard(
              offer: _offers[index],
              currentUserId: currentUserId,
              listingOwnerId: listingOwnerId,
              imageUrl: _imageUrl,
              onWithdraw: _withdrawOffer,
            ),
          ),
        const SizedBox(height: 32),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Teklif Kartı — Web OfferCard ile aynı yapı
// ─────────────────────────────────────────────────────────────────────────────
class _OfferCard extends StatefulWidget {
  final Offer offer;
  final String? currentUserId;
  final String? listingOwnerId;
  final String Function(String) imageUrl;
  final Future<void> Function(String) onWithdraw;

  const _OfferCard({
    required this.offer,
    required this.currentUserId,
    required this.listingOwnerId,
    required this.imageUrl,
    required this.onWithdraw,
  });

  @override
  State<_OfferCard> createState() => _OfferCardState();
}

class _OfferCardState extends State<_OfferCard> {
  bool _descExpanded = false;
  static const int _descMax = 200;

  Offer get o => widget.offer;

  // ── Helpers ────────────────────────────────────────
  String _conditionLabel(String? c) {
    switch (c) {
      case 'new': return 'Sıfır';
      case 'like_new': return 'Açılmamış';
      case 'good': return 'İkinci El';
      case 'fair': return 'Makul';
      case 'poor': return 'Yıpranmış';
      case 'used': return 'İkinci El';
      default: return c ?? '';
    }
  }

  String _deliveryLabel(String d) {
    switch (d.toLowerCase()) {
      case 'shipping':
      case 'kargo': return 'Kargo';
      case 'pickup':
      case 'elden':
      case 'hand_delivery': return 'Elden Teslim';
      default: return d;
    }
  }

  (Color, String) _approvalBadge() {
    if (o.isApproved) return (const Color(0xFF059669), 'Onaylı');
    if (o.approvalStatus == 'rejected') return (Colors.red, 'Reddedildi');
    return (Colors.orange, 'Bekliyor');
  }

  bool get _isExpiringSoon {
    if (o.validUntil == null) return false;
    final diff = o.validUntil!.difference(DateTime.now());
    return diff.inHours <= 24 && diff.inHours > 0;
  }

  String _timeAgo(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1) return 'Az önce';
    if (diff.inMinutes < 60) return '${diff.inMinutes} dakika önce';
    if (diff.inHours < 24) return '${diff.inHours} saat önce';
    if (diff.inDays < 30) return '${diff.inDays} gün önce';
    return '${(diff.inDays / 30).floor()} ay önce';
  }

  String _formatDate(DateTime? dt) {
    if (dt == null) return '—';
    return '${dt.day.toString().padLeft(2, '0')}.${dt.month.toString().padLeft(2, '0')}.${dt.year}';
  }

  Widget _chip(String text, {IconData? icon, Color? color}) {
    final c = color ?? Colors.grey[700]!;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        border: Border.all(color: context.appColors.border),
        borderRadius: BorderRadius.circular(20),
        color: context.appColors.card,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 12, color: c),
            const SizedBox(width: 4),
          ],
          Text(text, style: TextStyle(fontSize: 11, color: c, fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }

  void _openLightbox(int startIndex) {
    showDialog(
      context: context,
      barrierColor: Colors.black87,
      builder: (_) => _LightboxDialog(
        images: o.images.map(widget.imageUrl).toList(),
        initialIndex: startIndex,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final totalAmount = o.amount + (o.shippingCost ?? 0);
    final isMyOffer = widget.currentUserId == o.sellerId;
    final (badgeColor, badgeLabel) = _approvalBadge();
    final desc = o.description ?? '';
    final isLongDesc = desc.length > _descMax;
    final shownDesc = !isLongDesc || _descExpanded
        ? desc
        : '${desc.substring(0, _descMax)}…';

    return Container(
      decoration: BoxDecoration(
        color: context.appColors.card,
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── HEADER: Satıcı + Onay durumu ──────────────────
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 14, 14, 0),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        maskName(o.sellerName),
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 14,
                          color: Color(0xFF1D4ED8),
                        ),
                      ),
                      if (o.sellerRating != null) ...[
                        const SizedBox(height: 3),
                        Row(
                          children: [
                            const Icon(Icons.star, size: 13, color: Color(0xFFF59E0B)),
                            const SizedBox(width: 3),
                            Text(
                              o.sellerRating!.toStringAsFixed(1),
                              style: const TextStyle(fontSize: 12, color: Colors.black87, fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                      ],
                      if (o.productName.isNotEmpty) ...[
                        const SizedBox(height: 4),
                        Text(
                          o.productName,
                          style: TextStyle(fontSize: 12, color: context.appColors.textSecondary),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                // Onay durumu badge
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: badgeColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    badgeLabel,
                    style: TextStyle(fontSize: 11, color: badgeColor, fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 10),

          // ── FİYAT BLOĞU ───────────────────────────────────
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: const Color(0xFFF0FDF4),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          formatPriceShort(o.amount),
                          style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF059669),
                          ),
                        ),
                        if ((o.shippingCost ?? 0) > 0)
                          Text(
                            '+ ${formatPriceShort(o.shippingCost!)} kargo',
                            style: TextStyle(fontSize: 11, color: Colors.grey[600]),
                          ),
                      ],
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text('Toplam', style: TextStyle(fontSize: 11, color: context.appColors.textTertiary)),
                      Text(
                        formatPriceShort(totalAmount),
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFF059669)),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 10),

          // ── BADGE SATIRI ───────────────────────────────────
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14),
            child: Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                if (o.condition != null && o.condition!.isNotEmpty)
                  _chip(_conditionLabel(o.condition)),
                _chip(
                  _deliveryLabel(o.deliveryType),
                  icon: Icons.local_shipping_outlined,
                ),
                if ((o.shippingDesi ?? 0) > 0)
                  _chip(
                    'Desi: ${o.shippingDesi!.toStringAsFixed(1)}',
                    icon: Icons.scale_outlined,
                  ),
                if (o.etaDays != null)
                  _chip(
                    '${o.etaDays} gün teslimat',
                    icon: Icons.access_time_outlined,
                  ),
              ],
            ),
          ),

          const SizedBox(height: 8),

          // ── ADET BİLGİSİ ──────────────────────────────────
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14),
            child: Text(
              'Toplam adet: ${o.quantity} • Kalan: ${(o.quantity - 1).clamp(0, 999)}',
              style: TextStyle(fontSize: 11, color: Colors.grey[500]),
            ),
          ),

          // ── AÇIKLAMA ──────────────────────────────────────
          if (desc.isNotEmpty) ...[
            const SizedBox(height: 10),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    shownDesc,
                    style: TextStyle(fontSize: 13, color: Colors.grey[700], height: 1.5),
                  ),
                  if (isLongDesc) ...[
                    const SizedBox(height: 4),
                    GestureDetector(
                      onTap: () => setState(() => _descExpanded = !_descExpanded),
                      child: Text(
                        _descExpanded ? 'Daha az göster' : 'Daha fazla göster',
                        style: const TextStyle(
                          fontSize: 12,
                          color: Color(0xFF7C3AED),
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],

          // ── GÖRSELLER ─────────────────────────────────────
          if (o.images.isNotEmpty) ...[
            const SizedBox(height: 10),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14),
              child: SizedBox(
                height: 72,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: o.images.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 6),
                  itemBuilder: (ctx, idx) => GestureDetector(
                    onTap: () => _openLightbox(idx),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: SizedBox(
                        width: 72,
                        height: 72,
                        child: Image.network(
                          widget.imageUrl(o.images[idx]),
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Container(
                            color: Colors.grey[200],
                            child: const Icon(Icons.image, color: Colors.grey),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],

          // ── SÜRE UYARISI ──────────────────────────────────
          if (_isExpiringSoon) ...[
            const SizedBox(height: 10),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFF7ED),
                  border: Border.all(color: const Color(0xFFFED7AA)),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.alarm, size: 14, color: Color(0xFFEA580C)),
                    const SizedBox(width: 6),
                    const Text(
                      'Teklif yakında sona eriyor!',
                      style: TextStyle(fontSize: 12, color: Color(0xFFEA580C), fontWeight: FontWeight.w500),
                    ),
                  ],
                ),
              ),
            ),
          ],

          // ── ZAMAN DAMGALARI ───────────────────────────────
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 10, 14, 0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Teklif: ${_timeAgo(o.createdAt)}',
                  style: TextStyle(fontSize: 11, color: Colors.grey[500]),
                ),
                if (o.validUntil != null)
                  Text(
                    'Geçerlilik: ${_formatDate(o.validUntil)}',
                    style: TextStyle(fontSize: 11, color: Colors.grey[500]),
                  ),
              ],
            ),
          ),

          // ── TEKLİFİ GERİ ÇEK (kendi teklifi) ─────────────
          if (isMyOffer && o.status == 'active') ...[
            const SizedBox(height: 6),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton(
                onPressed: () => widget.onWithdraw(o.id),
                style: TextButton.styleFrom(foregroundColor: Colors.red[600]),
                child: const Text('Teklifi Geri Çek', style: TextStyle(fontSize: 13)),
              ),
            ),
          ] else
            const SizedBox(height: 14),
        ],
      ),
    );
  }
}

class _LightboxDialog extends StatefulWidget {
  final List<String> images;
  final int initialIndex;
  const _LightboxDialog({required this.images, required this.initialIndex});

  @override
  State<_LightboxDialog> createState() => _LightboxDialogState();
}

class _LightboxDialogState extends State<_LightboxDialog> {
  late int _current;
  late PageController _pageController;

  @override
  void initState() {
    super.initState();
    _current = widget.initialIndex;
    _pageController = PageController(initialPage: widget.initialIndex);
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _goTo(int idx) {
    setState(() => _current = idx);
    _pageController.animateToPage(idx,
        duration: const Duration(milliseconds: 200), curve: Curves.easeInOut);
  }

  @override
  Widget build(BuildContext context) {
    final hasMany = widget.images.length > 1;
    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child: Column(
          children: [
            // ── Top bar ──────────────────────────────────────
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.close, color: Colors.white, size: 26),
                    onPressed: () => Navigator.pop(context),
                  ),
                  const Spacer(),
                  Text(
                    '${_current + 1} / ${widget.images.length}',
                    style: const TextStyle(color: Colors.white70, fontSize: 14),
                  ),
                  const SizedBox(width: 16),
                ],
              ),
            ),
            // ── Main image ───────────────────────────────────
            Expanded(
              child: Stack(
                children: [
                  PageView.builder(
                    controller: _pageController,
                    itemCount: widget.images.length,
                    onPageChanged: (i) => setState(() => _current = i),
                    itemBuilder: (context, idx) {
                      return InteractiveViewer(
                        minScale: 0.8,
                        maxScale: 4.0,
                        child: Center(
                          child: Image.network(
                            widget.images[idx],
                            fit: BoxFit.contain,
                            errorBuilder: (_, __, ___) => const Icon(
                                Icons.broken_image,
                                color: Colors.grey,
                                size: 64),
                          ),
                        ),
                      );
                    },
                  ),
                  // Sol ok
                  if (hasMany && _current > 0)
                    Positioned(
                      left: 8, top: 0, bottom: 0,
                      child: Center(
                        child: GestureDetector(
                          onTap: () => _goTo(_current - 1),
                          child: Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: Colors.black.withOpacity(0.45),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.chevron_left,
                                color: Colors.white, size: 30),
                          ),
                        ),
                      ),
                    ),
                  // Sağ ok
                  if (hasMany && _current < widget.images.length - 1)
                    Positioned(
                      right: 8, top: 0, bottom: 0,
                      child: Center(
                        child: GestureDetector(
                          onTap: () => _goTo(_current + 1),
                          child: Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: Colors.black.withOpacity(0.45),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.chevron_right,
                                color: Colors.white, size: 30),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
            // ── Thumbnail strip ──────────────────────────────
            if (hasMany)
              Container(
                height: 88,
                color: Colors.black,
                padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: widget.images.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 8),
                  itemBuilder: (context, idx) {
                    final selected = idx == _current;
                    return GestureDetector(
                      onTap: () => _goTo(idx),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 150),
                        width: 62,
                        height: 62,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: selected
                                ? const Color(0xFFE07B39)
                                : Colors.white24,
                            width: selected ? 2.5 : 1,
                          ),
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(6),
                          child: Image.network(
                            widget.images[idx],
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) =>
                                Container(color: Colors.grey[800]),
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
          ],
        ),
      ),
    );
  }
}

// ─── Seller Profile Card ────────────────────────────────────────────────────

class _SellerProfileCard extends StatefulWidget {
  final String buyerId;
  final String? buyerName;
  final bool maskOwnerName;

  const _SellerProfileCard({
    required this.buyerId,
    required this.buyerName,
    required this.maskOwnerName,
  });

  @override
  State<_SellerProfileCard> createState() => _SellerProfileCardState();
}

class _SellerProfileCardState extends State<_SellerProfileCard> {
  Map<String, dynamic>? _profile;
  bool _isLoading = true;
  bool _isFollowing = false;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    try {
      final res = await apiService.get('/api/users/${widget.buyerId}/profile');
      final data = res.data;
      if (data is Map && data['success'] == true) {
        if (mounted) {
          setState(() {
            _profile = data['user'] as Map<String, dynamic>;
            _isLoading = false;
          });
        }
      } else {
        if (mounted) setState(() => _isLoading = false);
      }
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  String _masked(String name) {
    if (name.trim().isEmpty) return 'Kullanıcı';
    return name.trim().split(RegExp(r'\s+')).map((p) {
      if (p.isEmpty) return p;
      return '${p[0].toUpperCase()}***';
    }).join(' ');
  }

  String _initials(String name) {
    final parts = name.trim().split(RegExp(r'\s+'));
    if (parts.isEmpty) return '?';
    final f = parts.first.isNotEmpty ? parts.first[0].toUpperCase() : '';
    final l = parts.length > 1 && parts.last.isNotEmpty ? parts.last[0].toUpperCase() : '';
    return '$f$l';
  }

  /// Returns displayable name: first tries widget.buyerName, then profile data.
  /// Always masks if maskOwnerName=true.
  String get _resolvedName {
    // Prefer buyerName from listing; fall back to profile firstName+lastName
    String raw = (widget.buyerName ?? '').trim();
    if (raw.isEmpty && _profile != null) {
      final fn = (_profile!['firstName'] ?? '').toString().trim();
      final ln = (_profile!['lastName'] ?? '').toString().trim();
      raw = '$fn $ln'.trim();
    }
    if (raw.isEmpty) return 'Kullanıcı';
    return _masked(raw);
  }

  @override
  Widget build(BuildContext context) {
    final displayName = _resolvedName;
    // Initials from real name (not masked)
    String rawForInitials = (widget.buyerName ?? '').trim();
    if (rawForInitials.isEmpty && _profile != null) {
      final fn = (_profile!['firstName'] ?? '').toString().trim();
      final ln = (_profile!['lastName'] ?? '').toString().trim();
      rawForInitials = '$fn $ln'.trim();
    }
    final initials = rawForInitials.isNotEmpty ? _initials(rawForInitials) : '?';
    final isVerified = (_profile?['email_verified'] == true || _profile?['email_verified'] == 1);
    final ratingAvg = double.tryParse(_profile?['rating_avg']?.toString() ?? '0') ?? 0.0;
    final ratingCount = int.tryParse(_profile?['rating_count']?.toString() ?? '0') ?? 0;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: context.appColors.card,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          // Top row: avatar + name | follow button
          Row(
            children: [
              // Avatar → public profile
              GestureDetector(
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => PublicProfileScreen(
                      userId: widget.buyerId,
                      displayName: widget.maskOwnerName ? null : widget.buyerName,
                      maskOwnerName: widget.maskOwnerName,
                    ),
                  ),
                ),
                child: Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: const LinearGradient(
                      colors: [Color(0xFF9333EA), Color(0xFF3B82F6)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    border: Border.all(color: const Color(0xFFEDE9FE), width: 2),
                  ),
                  alignment: Alignment.center,
                  child: _isLoading
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                          ),
                        )
                      : Text(
                          initials,
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 18,
                          ),
                        ),
                ),
              ),
              const SizedBox(width: 12),
              // Name + verified badge
              Expanded(
                child: GestureDetector(
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => PublicProfileScreen(
                        userId: widget.buyerId,
                        displayName: widget.maskOwnerName ? null : widget.buyerName,
                        maskOwnerName: widget.maskOwnerName,
                      ),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        displayName,
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          color: context.appColors.textPrimary,
                          letterSpacing: 0.3,
                        ),
                      ),
                      const SizedBox(height: 3),
                      if (!_isLoading && isVerified)
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: const [
                            Icon(Icons.verified, size: 13, color: Color(0xFF10B981)),
                            SizedBox(width: 4),
                            Text(
                              'Doğrulanmış kullanıcı',
                              style: TextStyle(
                                fontSize: 11,
                                color: Color(0xFF10B981),
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        )
                      else if (!_isLoading)
                        Text(
                          'Kullanıcı',
                          style: TextStyle(fontSize: 11, color: Colors.grey[400]),
                        ),
                    ],
                  ),
                ),
              ),
              // Follow button
              GestureDetector(
                onTap: () => setState(() => _isFollowing = !_isFollowing),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 220),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: _isFollowing ? context.appColors.chipBg : const Color(0xFF10B981),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    _isFollowing ? 'Takip Ediliyor' : 'Takip Et',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: _isFollowing ? context.appColors.textSecondary : Colors.white,
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Divider(height: 1, color: context.appColors.divider),
          const SizedBox(height: 10),
          // Bottom row: rating | Tümünü Gör
          Row(
            children: [
              const Icon(Icons.star_rounded, size: 18, color: Color(0xFFFBBF24)),
              const SizedBox(width: 5),
              Text(
                ratingAvg > 0 ? ratingAvg.toStringAsFixed(1) : '—',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: context.appColors.textPrimary,
                ),
              ),
              const SizedBox(width: 5),
              Flexible(
                child: Text(
                  ratingCount > 0
                      ? '($ratingCount değerlendirme)'
                      : '(Henüz değerlendirme yok)',
                  style: TextStyle(fontSize: 12, color: Colors.grey[500]),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const Spacer(),
              GestureDetector(
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => UserReviewsScreen(
                      userId: widget.buyerId,
                      userName: widget.maskOwnerName ? null : widget.buyerName,
                    ),
                  ),
                ),
                child: const Text(
                  'Tümünü Gör',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF10B981),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}