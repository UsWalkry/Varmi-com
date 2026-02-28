import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/listing_service.dart';
import '../../services/offer_service.dart';
import '../../models/listing.dart';
import '../../models/offer.dart';
import '../../config/api_config.dart';
import '../../utils/formatters.dart';
import '../listings/listing_detail_screen.dart';
import '../listings/create_listing_screen.dart';
import '../offers/create_offer_screen.dart';
import '../auth/login_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final ListingService _listingService = ListingService();
  final OfferService _offerService = OfferService();

  List<Listing> _myListings = [];
  List<Offer> _myOffers = [];
  List<Offer> _incomingOffers = [];
  bool _listingsLoading = false;
  bool _offersLoading = false;
  bool _incomingLoading = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadAll();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadAll() async {
    _loadListings();
    _loadOffers();
    _loadIncoming();
  }

  Future<void> _loadListings() async {
    setState(() => _listingsLoading = true);
    try {
      final data = await _listingService.getMyListings();
      setState(() => _myListings = data);
    } catch (_) {}
    setState(() => _listingsLoading = false);
  }

  Future<void> _loadOffers() async {
    setState(() => _offersLoading = true);
    try {
      final data = await _offerService.getMyOffers();
      setState(() => _myOffers = data);
    } catch (_) {}
    setState(() => _offersLoading = false);
  }

  Future<void> _loadIncoming() async {
    setState(() => _incomingLoading = true);
    try {
      final data = await _offerService.getIncomingOffers();
      setState(() => _incomingOffers = data);
    } catch (_) {}
    setState(() => _incomingLoading = false);
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    if (!auth.isAuthenticated) {
      return _buildLoginRequired();
    }

    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        title: const Text('Panelim', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black87,
        elevation: 0,
        bottom: TabBar(
          controller: _tabController,
          labelColor: Theme.of(context).primaryColor,
          unselectedLabelColor: Colors.grey,
          indicatorColor: Theme.of(context).primaryColor,
          labelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
          tabs: [
            Tab(text: 'İlanlarım (${_myListings.length})'),
            Tab(text: 'Tekliflerim (${_myOffers.length})'),
            Tab(text: 'Gelen (${_incomingOffers.length})'),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_circle_outline),
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const CreateListingScreen()),
            ).then((_) => _loadListings()),
          ),
        ],
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildListingsTab(),
          _buildOffersTab(),
          _buildIncomingTab(),
        ],
      ),
    );
  }

  // ─── TAB 1: MY LISTINGS ──────────────────────────────────────────────────
  Widget _buildListingsTab() {
    if (_listingsLoading) return const Center(child: CircularProgressIndicator());
    if (_myListings.isEmpty) {
      return _buildEmpty(
        icon: Icons.inventory_2_outlined,
        title: 'Henüz ilanın yok',
        subtitle: 'İlk ilanını oluştur!',
        buttonLabel: 'İlan Oluştur',
        onPressed: () => Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const CreateListingScreen()),
        ).then((_) => _loadListings()),
      );
    }
    return RefreshIndicator(
      onRefresh: _loadListings,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        itemCount: _myListings.length,
        itemBuilder: (context, i) => _ListingCard(
          listing: _myListings[i],
          onTap: () => Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => ListingDetailScreen(listingId: _myListings[i].id),
            ),
          ).then((_) => _loadListings()),
          onRefresh: _loadListings,
        ),
      ),
    );
  }

  // ─── TAB 2: MY OFFERS ────────────────────────────────────────────────────
  Widget _buildOffersTab() {
    if (_offersLoading) return const Center(child: CircularProgressIndicator());
    if (_myOffers.isEmpty) {
      return _buildEmpty(
        icon: Icons.local_offer_outlined,
        title: 'Henüz teklifin yok',
        subtitle: 'İlanlara göz at ve teklif ver!',
      );
    }
    return RefreshIndicator(
      onRefresh: _loadOffers,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        itemCount: _myOffers.length,
        itemBuilder: (context, i) => _OfferCard(
          offer: _myOffers[i],
          isMine: true,
          onRefresh: _loadOffers,
          onWithdraw: _myOffers[i].status == 'active'
              ? () async {
                  try {
                    await _offerService.withdrawOffer(_myOffers[i].id);
                    _loadOffers();
                  } catch (e) {
                    _showError(e.toString());
                  }
                }
              : null,
        ),
      ),
    );
  }

  // ─── TAB 3: INCOMING OFFERS ──────────────────────────────────────────────
  Widget _buildIncomingTab() {
    if (_incomingLoading) return const Center(child: CircularProgressIndicator());
    if (_incomingOffers.isEmpty) {
      return _buildEmpty(
        icon: Icons.inbox_outlined,
        title: 'Henüz gelen teklif yok',
        subtitle: 'İlanlarınız teklif beklemiyor.',
      );
    }
    return RefreshIndicator(
      onRefresh: _loadIncoming,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        itemCount: _incomingOffers.length,
        itemBuilder: (context, i) => _OfferCard(
          offer: _incomingOffers[i],
          isMine: false,
          onRefresh: _loadIncoming,
          onAccept: _incomingOffers[i].status == 'active'
              ? () async {
                  try {
                    await _offerService.acceptOffer(_incomingOffers[i].id);
                    _loadIncoming();
                    _showSuccess('Teklif kabul edildi');
                  } catch (e) {
                    _showError(e.toString());
                  }
                }
              : null,
          onReject: _incomingOffers[i].status == 'active'
              ? () async {
                  try {
                    await _offerService.rejectOffer(_incomingOffers[i].id);
                    _loadIncoming();
                    _showSuccess('Teklif reddedildi');
                  } catch (e) {
                    _showError(e.toString());
                  }
                }
              : null,
        ),
      ),
    );
  }

  Widget _buildEmpty({
    required IconData icon,
    required String title,
    required String subtitle,
    String? buttonLabel,
    VoidCallback? onPressed,
  }) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 56, color: Colors.grey[300]),
          const SizedBox(height: 16),
          Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.black54)),
          const SizedBox(height: 4),
          Text(subtitle, style: TextStyle(fontSize: 13, color: Colors.grey[500])),
          if (buttonLabel != null && onPressed != null) ...[
            const SizedBox(height: 20),
            ElevatedButton(onPressed: onPressed, child: Text(buttonLabel)),
          ],
        ],
      ),
    );
  }

  Widget _buildLoginRequired() {
    return Scaffold(
      appBar: AppBar(title: const Text('Panelim')),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.lock_outline, size: 64, color: Colors.grey),
            const SizedBox(height: 16),
            const Text('Giriş Gerekli', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            const Text('Paneli görüntülemek için giriş yapın.',
                style: TextStyle(color: Colors.grey)),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const LoginScreen()),
              ),
              child: const Text('Giriş Yap'),
            ),
          ],
        ),
      ),
    );
  }

  void _showError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: Colors.red),
    );
  }

  void _showSuccess(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: Colors.green),
    );
  }
}

// ─── LISTING CARD ────────────────────────────────────────────────────────────
class _ListingCard extends StatelessWidget {
  final Listing listing;
  final VoidCallback? onTap;
  final VoidCallback? onRefresh;

  const _ListingCard({required this.listing, this.onTap, this.onRefresh});

  Color _statusColor(String status, String approvalStatus) {
    if (approvalStatus == 'rejected') return Colors.red;
    if (approvalStatus == 'pending') return Colors.orange;
    if (status == 'closed') return Colors.blueGrey;
    if (status == 'active') return Colors.green;
    return Colors.grey;
  }

  String _statusLabel(String status, String approvalStatus) {
    if (approvalStatus == 'rejected') return 'Reddedildi';
    if (approvalStatus == 'pending') return 'Onay Bekliyor';
    if (status == 'closed') return 'Kapalı';
    if (status == 'active') return 'Aktif';
    return Formatters.statusToTr(status);
  }

  @override
  Widget build(BuildContext context) {
    final statusColor = _statusColor(listing.status, listing.approvalStatus);
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      elevation: 2,
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border(left: BorderSide(color: statusColor, width: 4)),
          ),
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              _buildImage(),
              const SizedBox(width: 12),
              Expanded(child: _buildInfo(context, statusColor)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildImage() {
    final img = listing.mainImage;
    return ClipRRect(
      borderRadius: BorderRadius.circular(8),
      child: SizedBox(
        width: 72,
        height: 72,
        child: img.isNotEmpty
            ? Image.network(
                img.startsWith('http') ? img : '${ApiConfig.productionUrl}$img',
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => _placeholder(),
              )
            : _placeholder(),
      ),
    );
  }

  Widget _placeholder() => Container(
        color: Colors.grey[200],
        child: Icon(Icons.image_outlined, color: Colors.grey[400]),
      );

  Widget _buildInfo(BuildContext context, Color statusColor) {
    final label = _statusLabel(listing.status, listing.approvalStatus);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(listing.title,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
        const SizedBox(height: 4),
        Row(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: statusColor.withOpacity(0.12),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(label,
                  style: TextStyle(
                      fontSize: 11, color: statusColor, fontWeight: FontWeight.w600)),
            ),
            const SizedBox(width: 8),
            Icon(Icons.local_offer_outlined, size: 14, color: Colors.grey[500]),
            Text(' ${listing.offerCount ?? 0} teklif',
                style: TextStyle(fontSize: 11, color: Colors.grey[600])),
          ],
        ),
        const SizedBox(height: 6),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              Formatters.formatPriceShort(listing.budgetMax),
              style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                  color: Theme.of(context).primaryColor),
            ),
            Text(
              Formatters.timeAgo(listing.createdAt?.toIso8601String()),
              style: TextStyle(fontSize: 11, color: Colors.grey[500]),
            ),
          ],
        ),
        if (listing.approvalStatus == 'rejected' &&
            listing.rejectionReason != null) ...[
          const SizedBox(height: 4),
          Text(
            'Red: ${listing.rejectionReason}',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 11, color: Colors.red),
          ),
        ],
      ],
    );
  }
}

// ─── OFFER CARD ─────────────────────────────────────────────────────────────
class _OfferCard extends StatelessWidget {
  final Offer offer;
  final bool isMine;
  final VoidCallback? onWithdraw;
  final VoidCallback? onAccept;
  final VoidCallback? onReject;
  final VoidCallback? onRefresh;

  const _OfferCard({
    required this.offer,
    required this.isMine,
    this.onWithdraw,
    this.onAccept,
    this.onReject,
    this.onRefresh,
  });

  Color _statusColor() {
    switch (offer.status) {
      case 'accepted': return Colors.green;
      case 'rejected': return Colors.red;
      case 'withdrawn': return Colors.grey;
      case 'expired': return Colors.orange;
      default: return Colors.blue;
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = _statusColor();
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      elevation: 2,
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border(left: BorderSide(color: color, width: 4)),
        ),
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(offer.productName,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    Formatters.statusToTr(offer.status),
                    style: TextStyle(
                        fontSize: 11, color: color, fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
            if (offer.listingTitle != null) ...[
              const SizedBox(height: 4),
              Text('İlan: ${offer.listingTitle}',
                  style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis),
            ],
            if (!isMine && offer.sellerName != null) ...[
              const SizedBox(height: 4),
              Text('Satıcı: ${offer.sellerName}',
                  style: TextStyle(fontSize: 12, color: Colors.grey[600])),
            ],
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      Formatters.formatPriceShort(offer.amount),
                      style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Theme.of(context).primaryColor),
                    ),
                    if ((offer.shippingCost ?? 0) > 0)
                      Text(
                        '+ ${Formatters.formatPriceShort(offer.shippingCost ?? 0)} kargo',
                        style: TextStyle(fontSize: 11, color: Colors.grey[500]),
                      ),
                  ],
                ),
                Row(
                  children: [
                    if (onWithdraw != null)
                      _ActionBtn('Geri Çek', Colors.red, onWithdraw!),
                    if (onAccept != null)
                      _ActionBtn('Kabul Et', Colors.green, onAccept!),
                    if (onReject != null) ...[
                      const SizedBox(width: 6),
                      _ActionBtn('Reddet', Colors.red, onReject!),
                    ],
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ActionBtn extends StatelessWidget {
  final String label;
  final Color color;
  final VoidCallback onPressed;

  const _ActionBtn(this.label, this.color, this.onPressed);

  @override
  Widget build(BuildContext context) {
    return TextButton(
      onPressed: onPressed,
      style: TextButton.styleFrom(
        foregroundColor: color,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        minimumSize: Size.zero,
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
        side: BorderSide(color: color),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
      child: Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
    );
  }
}
