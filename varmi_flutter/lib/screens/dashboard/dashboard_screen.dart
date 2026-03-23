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
import '../listings/edit_listing_screen.dart';
import '../offers/edit_offer_screen.dart';
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

  // ─── Filters ─────────────────────────────────────────────────────────────
  String _listingFilter = 'all';  // all | active | passive
  String _offerFilter = 'all';    // all | active | accepted | rejected | pending | withdrawn
  String _incomingFilter = 'all'; // all | pending | active | accepted | rejected

  List<Listing> get _filteredListings {
    if (_listingFilter == 'all') return _myListings;
    if (_listingFilter == 'active') {
      return _myListings.where((l) =>
          l.status == 'active' && l.approvalStatus == 'approved' && !l.isExpired).toList();
    }
    // passive = inactive/closed/pending/rejected/expired/deleted
    return _myListings.where((l) =>
        l.status != 'active' ||
        l.approvalStatus != 'approved' ||
        l.isExpired).toList();
  }

  List<Offer> get _filteredOffers {
    if (_offerFilter == 'all') return _myOffers;
    return _myOffers.where((o) {
      switch (_offerFilter) {
        case 'pending':
          return o.approvalStatus == 'pending';
        case 'active':
          return o.status == 'active' && o.approvalStatus == 'approved';
        case 'accepted':
          return o.status == 'accepted';
        case 'rejected':
          return o.status == 'rejected' || o.approvalStatus == 'rejected';
        case 'withdrawn':
          return o.status == 'withdrawn';
        default:
          return true;
      }
    }).toList();
  }

  List<Offer> get _filteredIncoming {
    if (_incomingFilter == 'all') return _incomingOffers;
    return _incomingOffers.where((o) {
      switch (_incomingFilter) {
        case 'pending':
          return o.approvalStatus == 'pending';
        case 'active':
          return o.status == 'active' && o.approvalStatus == 'approved';
        case 'accepted':
          return o.status == 'accepted';
        case 'rejected':
          return o.status == 'rejected';
        default:
          return true;
      }
    }).toList();
  }

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
    } catch (e) {
      debugPrint('❌ Load listings error: $e');
    }
    if (mounted) setState(() => _listingsLoading = false);
  }

  Future<void> _loadOffers() async {
    setState(() => _offersLoading = true);
    try {
      final data = await _offerService.getMyOffers();
      setState(() => _myOffers = data);
    } catch (e) {
      debugPrint('❌ Load offers error: $e');
    }
    if (mounted) setState(() => _offersLoading = false);
  }

  Future<void> _loadIncoming() async {
    setState(() => _incomingLoading = true);
    try {
      final data = await _offerService.getIncomingOffers();
      setState(() => _incomingOffers = data);
    } catch (e) {
      debugPrint('❌ Load incoming error: $e');
    }
    if (mounted) setState(() => _incomingLoading = false);
  }

  // ─── LISTING ACTIONS ─────────────────────────────────────────────────────

  Future<void> _deleteListing(String id) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('İlanı Sil'),
        content: const Text('Bu ilanı kalıcı olarak silmek istediğinizden emin misiniz?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('İptal')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Sil'),
          ),
        ],
      ),
    );
    if (confirm != true) return;
    try {
      await _listingService.deleteListing(id);
      _showSnack('İlan başarıyla silindi', isError: false);
      _loadListings();
    } catch (e) {
      _showSnack('Hata: $e', isError: true);
    }
  }

  Future<void> _closeListing(String id) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('İlanı Kapat'),
        content: const Text('Bu ilanı kapatmak istediğinizden emin misiniz? Daha sonra yeniden açabilirsiniz.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('İptal')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Kapat')),
        ],
      ),
    );
    if (confirm != true) return;
    try {
      await _listingService.closeListing(id);
      _showSnack('İlan kapatıldı', isError: false);
      _loadListings();
    } catch (e) {
      _showSnack('Hata: $e', isError: true);
    }
  }

  Future<void> _reactivateListing(String id) async {
    try {
      await _listingService.reactivateListing(id);
      _showSnack('İlan yeniden yayınlandı', isError: false);
      _loadListings();
    } catch (e) {
      _showSnack('Hata: $e', isError: true);
    }
  }

  // ─── OFFER ACTIONS ───────────────────────────────────────────────────────

  Future<void> _withdrawOffer(String id) async {
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
      await _offerService.withdrawOffer(id);
      _showSnack('Teklif geri çekildi', isError: false);
      _loadOffers();
    } catch (e) {
      _showSnack('Hata: $e', isError: true);
    }
  }

  Future<void> _acceptOffer(String id) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Teklifi Kabul Et'),
        content: const Text('Bu teklifi kabul etmek istediğinizden emin misiniz? Satıcı ile sipariş sürecine geçilecektir.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('İptal')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
            child: const Text('Kabul Et', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
    if (confirm != true) return;
    try {
      await _offerService.acceptOffer(id);
      _showSnack('Teklif kabul edildi! Satıcıyla iletişime geçebilirsiniz.', isError: false);
      _loadIncoming();
    } catch (e) {
      _showSnack('Hata: $e', isError: true);
    }
  }

  Future<void> _rejectOffer(String id) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Teklifi Reddet'),
        content: const Text('Bu teklifi reddetmek istediğinizden emin misiniz?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('İptal')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Reddet'),
          ),
        ],
      ),
    );
    if (confirm != true) return;
    try {
      await _offerService.rejectOffer(id);
      _showSnack('Teklif reddedildi', isError: false);
      _loadIncoming();
    } catch (e) {
      _showSnack('Hata: $e', isError: true);
    }
  }

  // ─── BUILD ───────────────────────────────────────────────────────────────

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
            Tab(text: 'İlanlarım (${_filteredListings.length}/${_myListings.length})'),
            Tab(text: 'Tekliflerim (${_filteredOffers.length}/${_myOffers.length})'),
            Tab(text: 'Gelen Teklifler (${_filteredIncoming.length}/${_incomingOffers.length})'),
          ],
          isScrollable: true,
          tabAlignment: TabAlignment.start,
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_circle_outline),
            tooltip: 'Yeni İlan',
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
    final filtered = _filteredListings;
    return Column(
      children: [
        _FilterBar(
          options: const [
            _FilterOption('all', 'Tümü', Icons.list_outlined),
            _FilterOption('active', 'Aktif', Icons.check_circle_outline),
            _FilterOption('passive', 'Pasif', Icons.pause_circle_outline),
          ],
          selected: _listingFilter,
          onChanged: (v) => setState(() => _listingFilter = v),
        ),
        Expanded(
          child: _myListings.isEmpty
              ? _buildEmpty(
                  icon: Icons.inventory_2_outlined,
                  title: 'Henüz ilanın yok',
                  subtitle: 'İlk ilanını oluştur!',
                  buttonLabel: 'İlan Oluştur',
                  onPressed: () => Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const CreateListingScreen()),
                  ).then((_) => _loadListings()),
                )
              : filtered.isEmpty
                  ? _buildEmpty(
                      icon: Icons.filter_list_off_outlined,
                      title: 'Sonuç bulunamadı',
                      subtitle: 'Bu filtre için ilan yok.',
                    )
                  : RefreshIndicator(
                      onRefresh: _loadListings,
                      child: ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        itemCount: filtered.length,
                        itemBuilder: (context, i) {
                          final listing = filtered[i];
                          return _ListingCard(
            listing: listing,
            onView: () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => ListingDetailScreen(listingId: listing.id),
              ),
            ).then((_) => _loadListings()),
            onEdit: () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => EditListingScreen(listing: listing),
              ),
            ).then((_) => _loadListings()),
            onDelete: () => _deleteListing(listing.id),
            onClose: listing.status == 'active' ? () => _closeListing(listing.id) : null,
            onReactivate: listing.status == 'closed' ? () => _reactivateListing(listing.id) : null,
                          );
                        },
                      ),
                    ),
        ),
      ],
    );
  }

  // ─── TAB 2: MY OFFERS ────────────────────────────────────────────────────
  Widget _buildOffersTab() {
    if (_offersLoading) return const Center(child: CircularProgressIndicator());
    final filtered = _filteredOffers;
    return Column(
      children: [
        _FilterBar(
          options: const [
            _FilterOption('all', 'Tümü', Icons.list_outlined),
            _FilterOption('pending', 'Onay Bekliyor', Icons.hourglass_empty_outlined),
            _FilterOption('active', 'Aktif', Icons.check_circle_outline),
            _FilterOption('accepted', 'Kabul Edildi', Icons.thumb_up_outlined),
            _FilterOption('rejected', 'Reddedildi', Icons.cancel_outlined),
            _FilterOption('withdrawn', 'Geri Çekildi', Icons.undo_outlined),
          ],
          selected: _offerFilter,
          onChanged: (v) => setState(() => _offerFilter = v),
        ),
        Expanded(
          child: _myOffers.isEmpty
              ? _buildEmpty(
                  icon: Icons.local_offer_outlined,
                  title: 'Henüz teklifin yok',
                  subtitle: 'İlanlara göz at ve teklif ver!',
                )
              : filtered.isEmpty
                  ? _buildEmpty(
                      icon: Icons.filter_list_off_outlined,
                      title: 'Sonuç bulunamadı',
                      subtitle: 'Bu filtre için teklif yok.',
                    )
                  : RefreshIndicator(
                      onRefresh: _loadOffers,
                      child: ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        itemCount: filtered.length,
                        itemBuilder: (context, i) {
                          final offer = filtered[i];
                          final canEdit = offer.approvalStatus != 'pending' &&
                              (offer.approvalStatus == 'rejected' ||
                               offer.isExpired ||
                               offer.status == 'expired' ||
                               offer.status == 'inactive');
                          return _MyOfferCard(
                            offer: offer,
                            onWithdraw: (offer.status == 'active' && offer.approvalStatus == 'approved')
                                ? () => _withdrawOffer(offer.id)
                                : null,
                            onEdit: canEdit
                                ? () => Navigator.push(
                                      context,
                                      MaterialPageRoute(
                                        builder: (_) => EditOfferScreen(offer: offer),
                                      ),
                                    ).then((_) => _loadOffers())
                                : null,
                            onNavigate: (offer.status == 'active' || offer.status == 'accepted')
                                ? (listingId) => Navigator.push(
                                      context,
                                      MaterialPageRoute(
                                        builder: (_) => ListingDetailScreen(listingId: listingId),
                                      ),
                                    ).then((_) => _loadOffers())
                                : null,
                          );
                        },
                      ),
                    ),
        ),
      ],
    );
  }

  // ─── TAB 3: INCOMING OFFERS ──────────────────────────────────────────────
  Widget _buildIncomingTab() {
    if (_incomingLoading) return const Center(child: CircularProgressIndicator());
    final filtered = _filteredIncoming;
    return Column(
      children: [
        _FilterBar(
          options: const [
            _FilterOption('all', 'Tümü', Icons.list_outlined),
            _FilterOption('pending', 'Onay Bekliyor', Icons.hourglass_empty_outlined),
            _FilterOption('active', 'Aktif', Icons.check_circle_outline),
            _FilterOption('accepted', 'Kabul Edildi', Icons.thumb_up_outlined),
            _FilterOption('rejected', 'Reddedildi', Icons.cancel_outlined),
          ],
          selected: _incomingFilter,
          onChanged: (v) => setState(() => _incomingFilter = v),
        ),
        Expanded(
          child: _incomingOffers.isEmpty
              ? _buildEmpty(
                  icon: Icons.inbox_outlined,
                  title: 'Henüz gelen teklif yok',
                  subtitle: 'İlanlarınız teklif beklemiyor.',
                )
              : filtered.isEmpty
                  ? _buildEmpty(
                      icon: Icons.filter_list_off_outlined,
                      title: 'Sonuç bulunamadı',
                      subtitle: 'Bu filtre için teklif yok.',
                    )
                  : RefreshIndicator(
                      onRefresh: _loadIncoming,
                      child: ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        itemCount: filtered.length,
                        itemBuilder: (context, i) {
                          final offer = filtered[i];
                          final canAct = offer.status == 'active' && offer.approvalStatus == 'approved';
                          return _IncomingOfferCard(
                            offer: offer,
                            onAccept: canAct ? () => _acceptOffer(offer.id) : null,
                            onReject: canAct ? () => _rejectOffer(offer.id) : null,
                            onNavigate: (listingId) => Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => ListingDetailScreen(listingId: listingId),
                              ),
                            ).then((_) => _loadIncoming()),
                          );
                        },
                      ),
                    ),
        ),
      ],
    );
  }

  // ─── HELPERS ─────────────────────────────────────────────────────────────

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
          Text(title,
              style: const TextStyle(
                  fontSize: 16, fontWeight: FontWeight.bold, color: Colors.black54)),
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
            const Text('Giriş Gerekli',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
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

  void _showSnack(String msg, {required bool isError}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: isError ? Colors.red[700] : Colors.green[700],
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
}

// ─── FILTER BAR ──────────────────────────────────────────────────────────────
class _FilterOption {
  final String value;
  final String label;
  final IconData icon;
  const _FilterOption(this.value, this.label, this.icon);
}

class _FilterBar extends StatelessWidget {
  const _FilterBar({
    required this.options,
    required this.selected,
    required this.onChanged,
  });
  final List<_FilterOption> options;
  final String selected;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: options.map((opt) {
            final isSelected = selected == opt.value;
            return Padding(
              padding: const EdgeInsets.only(right: 8),
              child: FilterChip(
                label: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(opt.icon, size: 14,
                        color: isSelected ? Colors.white : Colors.grey[600]),
                    const SizedBox(width: 4),
                    Text(opt.label),
                  ],
                ),
                selected: isSelected,
                onSelected: (_) => onChanged(opt.value),
                selectedColor: const Color(0xFF7C3AED),
                checkmarkColor: Colors.white,
                labelStyle: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: isSelected ? Colors.white : Colors.grey[700],
                ),
                backgroundColor: Colors.grey[100],
                side: BorderSide(
                  color: isSelected ? const Color(0xFF7C3AED) : Colors.grey[300]!,
                ),
                showCheckmark: false,
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              ),
            );
          }).toList(),
        ),
      ),
    );
  }
}

// ─── LISTING CARD ────────────────────────────────────────────────────────────
class _ListingCard extends StatelessWidget {
  final Listing listing;
  final VoidCallback? onView;
  final VoidCallback? onEdit;
  final VoidCallback? onDelete;
  final VoidCallback? onClose;
  final VoidCallback? onReactivate;

  const _ListingCard({
    required this.listing,
    this.onView,
    this.onEdit,
    this.onDelete,
    this.onClose,
    this.onReactivate,
  });

  Color get _borderColor {
    if (listing.approvalStatus == 'pending') return Colors.orange;
    if (listing.approvalStatus == 'rejected') return Colors.red;
    if (listing.isExpired) return const Color(0xFFD97706); // amber-600
    if (listing.status == 'closed') return Colors.blueGrey;
    if (listing.status == 'active') return Colors.green;
    return Colors.grey;
  }

  (String label, Color color) get _primaryBadge {
    // Onay bekliyorsa her zaman önce göster
    if (listing.approvalStatus == 'pending') {
      return ('⏳ Onay Bekliyor', Colors.orange);
    }
    if (listing.approvalStatus == 'rejected') {
      return ('❌ Reddedildi', Colors.red);
    }
    if (listing.isExpired) {
      return ('⏰ Süresi Doldu', const Color(0xFFD97706));
    }
    if (listing.status == 'closed') {
      return ('Kapalı', Colors.blueGrey);
    }
    if (listing.status == 'active') {
      return ('✅ Aktif', Colors.green);
    }
    return (Formatters.statusToTr(listing.status), Colors.grey);
  }

  @override
  Widget build(BuildContext context) {
    final (badgeLabel, badgeColor) = _primaryBadge;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      elevation: 2,
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border(left: BorderSide(color: _borderColor, width: 4)),
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: onView,
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // --- Header row: image + info ---
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildImage(),
                    const SizedBox(width: 12),
                    Expanded(child: _buildMainInfo(context, badgeLabel, badgeColor)),
                  ],
                ),

                // --- Rejection reason ---
                if (listing.approvalStatus == 'rejected' &&
                    listing.rejectionReason != null) ...[
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.red[50],
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.red[200]!),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.info_outline, size: 14, color: Colors.red[700]),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            'Red Sebebi: ${listing.rejectionReason}',
                            style: TextStyle(fontSize: 12, color: Colors.red[800]),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],

                // --- Expired info badge ---
                if (listing.isExpired && listing.expiresAt != null &&
                    listing.approvalStatus != 'pending') ...[
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFFBEB),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFFCD34D)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.schedule, size: 14, color: Color(0xFFD97706)),
                        const SizedBox(width: 6),
                        Text(
                          'Süre doldu: ${_formatDate(listing.expiresAt!)}',
                          style: const TextStyle(fontSize: 12, color: Color(0xFF92400E)),
                        ),
                      ],
                    ),
                  ),
                ],

                // --- Action buttons ---
                const SizedBox(height: 10),
                Divider(height: 1, color: Colors.grey[200]),
                const SizedBox(height: 10),
                _buildActionRow(context),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildImage() {
    final img = listing.mainImage;
    return ClipRRect(
      borderRadius: BorderRadius.circular(10),
      child: SizedBox(
        width: 80,
        height: 80,
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

  Widget _buildMainInfo(BuildContext context, String badgeLabel, Color badgeColor) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          listing.title,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
        ),
        const SizedBox(height: 6),
        // Badge row
        Wrap(
          spacing: 6,
          runSpacing: 4,
          children: [
            _Badge(badgeLabel, badgeColor),
            if (listing.approvalStatus == 'approved' && listing.status == 'active')
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.local_offer_outlined, size: 13, color: Colors.grey[500]),
                  const SizedBox(width: 3),
                  Text('${listing.offerCount ?? 0} teklif',
                      style: TextStyle(fontSize: 11, color: Colors.grey[600])),
                ],
              ),
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
      ],
    );
  }

  Widget _buildActionRow(BuildContext context) {
    final isPending = listing.approvalStatus == 'pending';
    final isExpiredAndEditable = listing.isExpired && !isPending && listing.status != 'deleted';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Normal butonlar (wrap)
        Wrap(
          spacing: 8,
          runSpacing: 6,
          children: [
            // Görüntüle
            OutlinedButton.icon(
              onPressed: onView,
              icon: const Icon(Icons.visibility_outlined, size: 14),
              label: const Text('Görüntüle'),
              style: _outlineStyle(Colors.blueGrey),
            ),
            // Kapat (sadece aktif, süresi dolmamış ilanlarda)
            if (onClose != null && !listing.isExpired)
              OutlinedButton.icon(
                onPressed: onClose,
                icon: const Icon(Icons.pause_circle_outline, size: 14),
                label: const Text('Kapat'),
                style: _outlineStyle(Colors.orange),
              ),
            // Yeniden Aç (sadece kapalı, süresi dolmamış ilanlarda)
            if (onReactivate != null && !listing.isExpired)
              OutlinedButton.icon(
                onPressed: onReactivate,
                icon: const Icon(Icons.play_circle_outline, size: 14),
                label: const Text('Yeniden Aç'),
                style: _outlineStyle(Colors.green),
              ),
            // Düzenle — sadece süresi dolmamış, onay beklemiyorsa
            if (!isPending && !isExpiredAndEditable && listing.status != 'deleted')
              OutlinedButton.icon(
                onPressed: onEdit,
                icon: const Icon(Icons.edit_outlined, size: 14),
                label: const Text('Düzenle'),
                style: _outlineStyle(Colors.blue),
              ),
            // Sil
            OutlinedButton.icon(
              onPressed: onDelete,
              icon: const Icon(Icons.delete_outline, size: 14),
              label: const Text('Sil'),
              style: _outlineStyle(Colors.red),
            ),
          ],
        ),
        // Güncelle & Yeniden Gönder — sadece süresi dolmuş ilanlarda (onay beklemiyor)
        if (isExpiredAndEditable) ...[          
          const SizedBox(height: 10),
          Divider(height: 1, color: Colors.grey[200]),
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: onEdit,
              icon: const Icon(Icons.edit_outlined, size: 14),
              label: const Text('Güncelle & Yeniden Gönder'),
              style: OutlinedButton.styleFrom(
                foregroundColor: Colors.blue,
                side: const BorderSide(color: Colors.blue),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                textStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
            ),
          ),
        ],
      ],
    );
  }

  ButtonStyle _outlineStyle(Color color) => OutlinedButton.styleFrom(
        foregroundColor: color,
        side: BorderSide(color: color.withOpacity(0.5)),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        minimumSize: Size.zero,
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
        textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      );

  String _formatDate(DateTime d) =>
      '${d.day.toString().padLeft(2, '0')}.${d.month.toString().padLeft(2, '0')}.${d.year}';
}

// ─── MY OFFER CARD ───────────────────────────────────────────────────────────
class _MyOfferCard extends StatelessWidget {
  final Offer offer;
  final VoidCallback? onWithdraw;
  final VoidCallback? onEdit;
  final void Function(String listingId)? onNavigate;

  const _MyOfferCard({required this.offer, this.onWithdraw, this.onEdit, this.onNavigate});

  (String label, Color color) get _statusBadge {
    // Onay bekliyorsa → her zaman önce bunu göster (expired/inactive fark etmez)
    if (offer.approvalStatus == 'pending') {
      return ('⏳ Onay Bekliyor', Colors.orange);
    }
    if (offer.approvalStatus == 'rejected') {
      return ('❌ Reddedildi', Colors.red);
    }
    if (offer.status == 'active') return ('🟠 Aktif', const Color(0xFFF97316));
    if (offer.status == 'accepted') return ('🟢 Kabul Edildi', Colors.green);
    if (offer.status == 'rejected') return ('🔴 Reddedildi', Colors.red);
    if (offer.status == 'withdrawn') return ('⚪ Geri Çekildi', Colors.grey);
    if (offer.status == 'expired' || offer.isExpired) {
      return ('⏰ Süresi Doldu', const Color(0xFFD97706));
    }
    return (Formatters.statusToTr(offer.status), Colors.grey);
  }

  Color get _borderColor => _statusBadge.$2;

  @override
  Widget build(BuildContext context) {
    final (badgeLabel, badgeColor) = _statusBadge;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      elevation: 2,
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: offer.listingId.isNotEmpty && onNavigate != null
            ? () => onNavigate!.call(offer.listingId)
            : null,
        child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border(left: BorderSide(color: _borderColor, width: 4)),
        ),
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Product name + status badge
            Row(
              children: [
                Expanded(
                  child: Text(
                    offer.productName,
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 8),
                _Badge(badgeLabel, badgeColor),
              ],
            ),

            // Listing title
            if (offer.listingTitle != null) ...[
              const SizedBox(height: 4),
              Text(
                'İlan: ${offer.listingTitle}',
                style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],

            const SizedBox(height: 10),

            // Price row
            Row(
              children: [
                Text(
                  Formatters.formatPriceShort(offer.amount),
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF16A34A)),
                ),
                if ((offer.shippingCost ?? 0) > 0) ...[
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.grey[100],
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      '+ ${Formatters.formatPriceShort(offer.shippingCost ?? 0)} kargo',
                      style: TextStyle(fontSize: 11, color: Colors.grey[600]),
                    ),
                  ),
                ],
              ],
            ),

            // Validity date
            if (offer.validUntil != null) ...[
              const SizedBox(height: 6),
              Row(
                children: [
                  Icon(Icons.event_outlined, size: 13, color: Colors.grey[500]),
                  const SizedBox(width: 4),
                  Text(
                    'Geçerlilik: ${_fmtDate(offer.validUntil!)}',
                    style: TextStyle(fontSize: 11, color: Colors.grey[600]),
                  ),
                  if (offer.isExpired) ...[
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEF3C7),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Text('Süresi doldu',
                          style: TextStyle(fontSize: 10, color: Color(0xFF92400E))),
                    ),
                  ],
                ],
              ),
            ],

            // Rejection reason
            if (offer.approvalStatus == 'rejected' && offer.rejectionReason != null) ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.red[50],
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.red[200]!),
                ),
                child: Row(
                  children: [
                    Icon(Icons.info_outline, size: 14, color: Colors.red[700]),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        'Red Sebebi: ${offer.rejectionReason}',
                        style: TextStyle(fontSize: 12, color: Colors.red[800]),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            // Tap hint
            if (offer.listingId.isNotEmpty && onNavigate != null) ...[              
              const SizedBox(height: 6),
              Text(
                'İlanı görüntülemek için dokun →',
                style: TextStyle(fontSize: 10, color: Colors.grey[400]),
              ),
            ],

            // Edit button for expired / rejected offers
            if (onEdit != null) ...[              
              const SizedBox(height: 10),
              Divider(height: 1, color: Colors.grey[200]),
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: onEdit,
                  icon: const Icon(Icons.edit_outlined, size: 14),
                  label: const Text('Güncelle & Yeniden Gönder'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.blue,
                    side: const BorderSide(color: Colors.blue),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    textStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
              ),
            ],

            // Withdraw button
            if (onWithdraw != null) ...[
              const SizedBox(height: 10),
              Divider(height: 1, color: Colors.grey[200]),
              const SizedBox(height: 10),
              Align(
                alignment: Alignment.centerRight,
                child: OutlinedButton.icon(
                  onPressed: onWithdraw,
                  icon: const Icon(Icons.cancel_outlined, size: 14),
                  label: const Text('Geri Çek'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.red,
                    side: const BorderSide(color: Colors.red),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                    textStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
      ),
    );
  }

  String _fmtDate(DateTime d) =>
      '${d.day.toString().padLeft(2, '0')}.${d.month.toString().padLeft(2, '0')}.${d.year}';
}

// ─── INCOMING OFFER CARD ─────────────────────────────────────────────────────
class _IncomingOfferCard extends StatelessWidget {
  final Offer offer;
  final VoidCallback? onAccept;
  final VoidCallback? onReject;
  final void Function(String listingId)? onNavigate;

  const _IncomingOfferCard({
    required this.offer,
    this.onAccept,
    this.onReject,
    this.onNavigate,
  });

  (String label, Color color) get _statusBadge {
    if (offer.status == 'active' && offer.approvalStatus == 'pending') {
      return ('⏳ Onay Bekliyor', Colors.orange);
    }
    if (offer.status == 'accepted') return ('🟢 Kabul Edildi', Colors.green);
    if (offer.status == 'rejected') return ('🔴 Reddedildi', Colors.red);
    if (offer.status == 'withdrawn') return ('⚪ Geri Çekildi', Colors.grey);
    if (offer.status == 'active') return ('🟠 Aktif', const Color(0xFFF97316));
    return (Formatters.statusToTr(offer.status), Colors.grey);
  }

  @override
  Widget build(BuildContext context) {
    final (badgeLabel, badgeColor) = _statusBadge;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      elevation: 2,
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: offer.listingId.isNotEmpty
            ? () => onNavigate?.call(offer.listingId)
            : null,
        child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border(left: BorderSide(color: Colors.green, width: 4)),
        ),
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Product + badge
            Row(
              children: [
                Expanded(
                  child: Text(
                    offer.productName,
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 8),
                _Badge(badgeLabel, badgeColor),
              ],
            ),

            // Listing title
            if (offer.listingTitle != null) ...[
              const SizedBox(height: 4),
              Text(
                'İlan: ${offer.listingTitle}',
                style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],

            // Seller info
            if (offer.sellerName != null) ...[
              const SizedBox(height: 4),
              Row(
                children: [
                  Icon(Icons.person_outline, size: 14, color: Colors.blue[600]),
                  const SizedBox(width: 4),
                  Text(
                    'Teklif Veren: ${maskName(offer.sellerName)}',
                    style: TextStyle(
                        fontSize: 12,
                        color: Colors.blue[700],
                        fontWeight: FontWeight.w500),
                  ),
                  if ((offer.sellerRating ?? 0) > 0) ...[
                    const SizedBox(width: 6),
                    Icon(Icons.star, size: 13, color: Colors.amber[600]),
                    Text(
                      offer.sellerRating!.toStringAsFixed(1),
                      style: TextStyle(fontSize: 11, color: Colors.amber[700]),
                    ),
                  ],
                ],
              ),
            ],

            const SizedBox(height: 10),

            // Price + shipping
            Row(
              children: [
                Text(
                  Formatters.formatPriceShort(offer.amount),
                  style: const TextStyle(
                      fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF16A34A)),
                ),
                if ((offer.shippingCost ?? 0) > 0) ...[
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                        color: Colors.grey[100], borderRadius: BorderRadius.circular(6)),
                    child: Text(
                      '+ ${Formatters.formatPriceShort(offer.shippingCost ?? 0)} kargo',
                      style: TextStyle(fontSize: 11, color: Colors.grey[600]),
                    ),
                  ),
                ],
              ],
            ),

            // Condition / delivery badges
            if (offer.condition != null || offer.deliveryType != null) ...[
              const SizedBox(height: 8),
              Wrap(
                spacing: 6,
                children: [
                  if (offer.condition != null)
                    _SmallBadge(_conditionLabel(offer.condition!), Colors.purple),
                  if (offer.deliveryType != null)
                    _SmallBadge(_deliveryLabel(offer.deliveryType!), Colors.blue),
                ],
              ),
            ],

            // Description
            if (offer.description != null && offer.description!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                offer.description!,
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(fontSize: 13, color: Colors.grey[700]),
              ),
            ],

            // Validity
            if (offer.validUntil != null) ...[
              const SizedBox(height: 6),
              Row(
                children: [
                  Icon(Icons.event_outlined, size: 13, color: Colors.grey[500]),
                  const SizedBox(width: 4),
                  Text(
                    'Geçerlilik: ${_fmtDate(offer.validUntil!)}',
                    style: TextStyle(fontSize: 11, color: Colors.grey[600]),
                  ),
                ],
              ),
            ],

            // Buttons (only for active+approved)
            if (onAccept != null || onReject != null) ...[
              const SizedBox(height: 12),
              Divider(height: 1, color: Colors.grey[200]),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  if (onReject != null)
                    OutlinedButton.icon(
                      onPressed: onReject,
                      icon: const Icon(Icons.close, size: 14),
                      label: const Text('Reddet'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.red,
                        side: const BorderSide(color: Colors.red),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                        textStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                  if (onAccept != null) ...[
                    const SizedBox(width: 10),
                    ElevatedButton.icon(
                      onPressed: onAccept,
                      icon: const Icon(Icons.check, size: 14),
                      label: const Text('Kabul Et'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green[700],
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 7),
                        textStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                  ],
                ],
              ),
            ],

            // Tap hint for active offers
            if (offer.listingId.isNotEmpty && onAccept != null) ...[              
              const SizedBox(height: 4),
              Text(
                'İlanı görüntülemek için dokun →',
                style: TextStyle(fontSize: 10, color: Colors.grey[400]),
              ),
            ],

            // Already actioned notice
            if (onAccept == null && onReject == null &&
                (offer.status == 'accepted' ||
                    offer.status == 'rejected' ||
                    offer.status == 'withdrawn')) ...[
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  offer.status == 'accepted'
                      ? '✅ Bu teklif kabul edildi'
                      : offer.status == 'withdrawn'
                          ? 'Satıcı tarafından geri çekildi'
                          : '🚫 Bu teklif reddedildi',
                  style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                ),
              ),
            ],
          ],
        ),
      ),
      ),
    );
  }

  String _conditionLabel(String c) {
    switch (c) {
      case 'new': return 'Sıfır';
      case 'like_new': return 'Sıfır Gibi';
      case 'good': return '2. El';
      case 'fair': return 'İyi Durumda';
      case 'poor': return 'Hasarlı';
      default: return c;
    }
  }

  String _deliveryLabel(String d) {
    switch (d) {
      case 'shipping': return 'Kargo';
      case 'pickup': return 'Elden Teslim';
      case 'both': return 'Kargo / Elden';
      default: return d;
    }
  }

  String _fmtDate(DateTime d) =>
      '${d.day.toString().padLeft(2, '0')}.${d.month.toString().padLeft(2, '0')}.${d.year}';
}

// ─── SHARED BADGE WIDGETS ────────────────────────────────────────────────────
class _Badge extends StatelessWidget {
  final String label;
  final Color color;

  const _Badge(this.label, this.color);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Text(
        label,
        style: TextStyle(fontSize: 11, color: color, fontWeight: FontWeight.w600),
      ),
    );
  }
}

class _SmallBadge extends StatelessWidget {
  final String label;
  final Color color;

  const _SmallBadge(this.label, this.color);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(
        color: color.withOpacity(0.08),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color.withOpacity(0.25)),
      ),
      child: Text(
        label,
        style: TextStyle(fontSize: 10, color: color, fontWeight: FontWeight.w600),
      ),
    );
  }
}
