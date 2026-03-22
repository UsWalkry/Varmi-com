import 'dart:async';
import 'package:flutter/material.dart';
import '../../config/theme.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/notification_provider.dart';
import '../../providers/cart_provider.dart';
import '../../config/api_config.dart';
import '../../utils/formatters.dart';
import '../../models/listing.dart';
import '../../services/listing_service.dart';
import '../auth/login_screen.dart';
import '../auth/register_screen.dart';
import '../profile/user_reviews_screen.dart';
import '../listings/listing_detail_screen.dart';
import '../listings/create_listing_screen.dart';
import '../dashboard/dashboard_screen.dart';
import '../profile/profile_screen.dart';
import '../cart/cart_screen.dart';
import '../notifications/notifications_screen.dart';
import 'favorites_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with SingleTickerProviderStateMixin {
  final ListingService _listingService = ListingService();
  final TextEditingController _searchController = TextEditingController();
  int _selectedIndex = 0;
  List<Listing> _listings = [];
  List<Listing> _filteredListings = [];
  bool _isLoading = false;
  String? _selectedCategory;
  AuthProvider? _authProvider;
  bool _notificationsInitialized = false;

  final List<Map<String, dynamic>> _categories = [
    {'label': 'Tümü', 'icon': Icons.apps_rounded},
    {'label': 'Elektronik', 'icon': Icons.devices_rounded},
    {'label': 'Giyim', 'icon': Icons.checkroom_rounded},
    {'label': 'Ev & Yaşam', 'icon': Icons.home_rounded},
    {'label': 'Spor', 'icon': Icons.sports_soccer_rounded},
    {'label': 'Kitap', 'icon': Icons.menu_book_rounded},
    {'label': 'Diğer', 'icon': Icons.category_rounded},
  ];

  @override
  void initState() {
    super.initState();
    _loadListings();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _authProvider = Provider.of<AuthProvider>(context, listen: false);
      _authProvider!.addListener(_onAuthStateChange);
      // Auth zaten tamamlanmışsa hemen başlat
      if (_authProvider!.isAuthenticated) {
        _startNotificationPolling();
      }
    });
  }

  void _onAuthStateChange() {
    if (!mounted) return;
    if (_authProvider!.isAuthenticated) {
      _startNotificationPolling();
    } else {
      // Çıkış yapıldı — polling durdur ve sıfırla
      _notificationsInitialized = false;
      Provider.of<NotificationProvider>(context, listen: false).stopPolling();
    }
  }

  void _startNotificationPolling() {
    if (_notificationsInitialized) return;
    _notificationsInitialized = true;
    Provider.of<NotificationProvider>(context, listen: false).loadNotifications();
  }

  @override
  void dispose() {
    _authProvider?.removeListener(_onAuthStateChange);
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadListings() async {
    setState(() => _isLoading = true);
    try {
      final listings = await _listingService.getListings();
      setState(() {
        _listings = listings;
        _filteredListings = listings;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  void _performSearch(String query) {
    setState(() {
      if (query.isEmpty) {
        _filteredListings = _selectedCategory == null
            ? _listings
            : _listings.where((l) => l.category == _selectedCategory).toList();
      } else {
        final base = _selectedCategory == null
            ? _listings
            : _listings.where((l) => l.category == _selectedCategory).toList();
        _filteredListings = base
            .where((listing) =>
                listing.title.toLowerCase().contains(query.toLowerCase()) ||
                listing.category.toLowerCase().contains(query.toLowerCase()))
            .toList();
      }
    });
  }

  void _filterByCategory(String category) {
    setState(() {
      _selectedCategory = category == 'Tümü' ? null : category;
      final query = _searchController.text;
      if (_selectedCategory == null) {
        _filteredListings = query.isEmpty
            ? _listings
            : _listings
                .where((l) =>
                    l.title.toLowerCase().contains(query.toLowerCase()) ||
                    l.category.toLowerCase().contains(query.toLowerCase()))
                .toList();
      } else {
        _filteredListings = _listings.where((l) {
          final matchCat = l.category == _selectedCategory;
          final matchQ = query.isEmpty ||
              l.title.toLowerCase().contains(query.toLowerCase()) ||
              l.category.toLowerCase().contains(query.toLowerCase());
          return matchCat && matchQ;
        }).toList();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: context.appColors.bg,
      body: _buildBody(),
      bottomNavigationBar: _buildBottomNav(),
    );
  }

  Widget _buildBottomNav() {
    final colors = context.appColors;
    final isDark = context.isDark;
    final icons = [Icons.home_outlined, Icons.favorite_border_rounded, Icons.dashboard_outlined, Icons.person_outline_rounded];
    final activeIcons = [Icons.home_rounded, Icons.favorite_rounded, Icons.dashboard_rounded, Icons.person_rounded];
    final labels = ['Ana Sayfa', 'Favorilerim', 'Panelim', 'Hesabım'];

    return Container(
      decoration: BoxDecoration(
        color: colors.card,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.3 : 0.08),
            blurRadius: 16,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: SafeArea(
        child: SizedBox(
          height: 66,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // First 2 tabs: Ana Sayfa, Favorilerim
              ...List.generate(2, (i) => _buildNavItem(i, icons[i], activeIcons[i], labels[i], isDark)),
              // Center İlan Ver floating button
              GestureDetector(
                onTap: () {
                  final authProvider = Provider.of<AuthProvider>(context, listen: false);
                  if (!authProvider.isAuthenticated) {
                    Navigator.push(context, MaterialPageRoute(builder: (_) => const LoginScreen()));
                    return;
                  }
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const CreateListingScreen()));
                },
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 46,
                      height: 46,
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFF9333EA), Color(0xFF6366F1)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFF9333EA).withOpacity(0.45),
                            blurRadius: 14,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: const Icon(Icons.add_rounded, color: Colors.white, size: 26),
                    ),
                    const SizedBox(height: 2),
                    const Text(
                      'İlan Ver',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF9333EA),
                      ),
                    ),
                  ],
                ),
              ),
              // Last 2 tabs: Panelim, Hesabım
              ...List.generate(2, (i) => _buildNavItem(i + 2, icons[i + 2], activeIcons[i + 2], labels[i + 2], isDark)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem(int index, IconData icon, IconData activeIcon, String label, bool isDark) {
    final isSelected = _selectedIndex == index;
    return GestureDetector(
      onTap: () => setState(() => _selectedIndex = index),
      behavior: HitTestBehavior.opaque,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        decoration: isSelected
            ? BoxDecoration(
                gradient: isDark
                    ? const LinearGradient(
                        colors: [Color(0xFF3B1D6E), Color(0xFF1E2A5E)],
                      )
                    : const LinearGradient(
                        colors: [Color(0xFFEDE9FE), Color(0xFFDBEAFE)],
                      ),
                borderRadius: BorderRadius.circular(20),
              )
            : null,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ShaderMask(
              shaderCallback: (bounds) => isSelected
                  ? const LinearGradient(
                      colors: [Color(0xFF9333EA), Color(0xFF3B82F6)],
                    ).createShader(bounds)
                  : LinearGradient(
                      colors: [Colors.grey, Colors.grey],
                    ).createShader(bounds),
              child: Icon(
                isSelected ? activeIcon : icon,
                size: 24,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                foreground: isSelected
                    ? (Paint()
                      ..shader = const LinearGradient(
                        colors: [Color(0xFF9333EA), Color(0xFF3B82F6)],
                      ).createShader(const Rect.fromLTWH(0, 0, 60, 14)))
                    : null,
                color: isSelected ? null : Colors.grey,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBody() {
    final authProvider = Provider.of<AuthProvider>(context);
    final isLoggedIn = authProvider.isAuthenticated;

    switch (_selectedIndex) {
      case 0:
        return _buildHomePage();
      case 1:
        if (!isLoggedIn) return _buildLoginRequired('Favoriler');
        return const FavoritesScreen();
      case 2:
        if (!isLoggedIn) return _buildLoginRequired('Panelim');
        return const DashboardScreen();
      case 3:
        if (!isLoggedIn) return _buildLoginRequired('Profil');
        return const ProfileScreen();
      default:
        return const SizedBox();
    }
  }

  Widget _buildHomePage() {
    final authProvider = Provider.of<AuthProvider>(context);
    final isLoggedIn = authProvider.isAuthenticated;
    final user = authProvider.user;

    return RefreshIndicator(
      color: const Color(0xFF9333EA),
      onRefresh: _loadListings,
      child: CustomScrollView(
        slivers: [
          SliverAppBar(
            floating: true,
            snap: true,
            pinned: false,
            elevation: 0,
            backgroundColor: Colors.transparent,
            expandedHeight: MediaQuery.of(context).padding.top + 126,
            flexibleSpace: FlexibleSpaceBar(
              background: _buildHeader(isLoggedIn, user),
            ),
          ),
          SliverToBoxAdapter(child: _buildCategoryBar()),
          SliverToBoxAdapter(child: _buildHeroBanner(isLoggedIn)),
          SliverToBoxAdapter(child: _buildSectionHeader()),
          if (_isLoading)
            const SliverFillRemaining(
              child: Center(
                child: CircularProgressIndicator(
                  valueColor: AlwaysStoppedAnimation(Color(0xFF9333EA)),
                ),
              ),
            )
          else if (_filteredListings.isEmpty)
            SliverFillRemaining(child: _buildEmptyState())
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 100),
              sliver: SliverGrid(
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  childAspectRatio: 0.70,
                ),
                delegate: SliverChildBuilderDelegate(
                  (context, index) => _buildListingCard(_filteredListings[index]),
                  childCount: _filteredListings.length,
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildHeader(bool isLoggedIn, dynamic user) {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF9333EA), Color(0xFF6366F1), Color(0xFF3B82F6)],
        ),
        borderRadius: BorderRadius.only(
          bottomLeft: Radius.circular(28),
          bottomRight: Radius.circular(28),
        ),
      ),
      child: Padding(
        padding: EdgeInsets.only(
          top: MediaQuery.of(context).padding.top + 10,
          left: 20,
          right: 20,
          bottom: 12,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                // Left: greeting
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        isLoggedIn && user != null
                            ? 'Merhaba, ${user.firstName ?? 'Kullanıcı'} 👋'
                            : 'Hoş Geldin! 👋',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 0.2,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        isLoggedIn ? 'Bugün ne arıyorsun?' : 'İlan bul, teklif ver',
                        style: TextStyle(
                          color: Colors.white.withOpacity(0.8),
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                // Right: action buttons
                if (isLoggedIn) ...[
                  Consumer<CartProvider>(
                    builder: (context, cart, _) => _buildBadgeIcon(
                      icon: Icons.shopping_bag_outlined,
                      count: cart.itemCount,
                      onTap: () => Navigator.push(context,
                          MaterialPageRoute(builder: (_) => const CartScreen())),
                    ),
                  ),
                  const SizedBox(width: 6),
                  Consumer<NotificationProvider>(
                    builder: (context, notif, _) => _buildBadgeIcon(
                      icon: Icons.notifications_outlined,
                      count: notif.unreadCount,
                      onTap: () => Navigator.push(context,
                          MaterialPageRoute(builder: (_) => const NotificationsScreen())),
                    ),
                  ),
                ] else ...[
                  // Cart icon for guests
                  _buildWhiteIconBtn(
                    icon: Icons.shopping_bag_outlined,
                    onTap: () => Navigator.push(context,
                        MaterialPageRoute(builder: (_) => const LoginScreen())),
                  ),
                  const SizedBox(width: 8),
                  // Giriş Yap pill
                  GestureDetector(
                    onTap: () => Navigator.push(context,
                        MaterialPageRoute(builder: (_) => const LoginScreen())),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 8),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.18),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: Colors.white.withOpacity(0.55),
                          width: 1.2,
                        ),
                      ),
                      child: const Text(
                        'Giriş Yap',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 6),
                  // Kayıt Ol pill
                  GestureDetector(
                    onTap: () => Navigator.push(context,
                        MaterialPageRoute(builder: (_) => const RegisterScreen())),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 8),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.12),
                            blurRadius: 6,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: const Text(
                        'Kayıt Ol',
                        style: TextStyle(
                          color: Color(0xFF9333EA),
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 16),
            _buildSearchBar(),
          ],
        ),
      ),
    );
  }

  Widget _buildBadgeIcon({
    required IconData icon,
    required int count,
    required VoidCallback onTap,
  }) {
    return Stack(
      children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.15),
            shape: BoxShape.circle,
          ),
          child: IconButton(
            padding: EdgeInsets.zero,
            icon: Icon(icon, color: Colors.white, size: 22),
            onPressed: onTap,
          ),
        ),
        if (count > 0)
          Positioned(
            right: 2,
            top: 2,
            child: Container(
              padding: const EdgeInsets.all(3),
              decoration: const BoxDecoration(
                color: Color(0xFFEF4444),
                shape: BoxShape.circle,
              ),
              child: Text(
                '${count > 99 ? '99+' : count}',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 9,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildWhiteIconBtn({required IconData icon, required VoidCallback onTap}) {
    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.15),
        shape: BoxShape.circle,
      ),
      child: IconButton(
        padding: EdgeInsets.zero,
        icon: Icon(icon, color: Colors.white, size: 22),
        onPressed: onTap,
      ),
    );
  }

  Widget _buildSearchBar() {
    return Container(
      height: 46,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(23),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.12),
            blurRadius: 12,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: TextField(
        controller: _searchController,
        decoration: InputDecoration(
          hintText: 'İlan ara...',
          hintStyle: TextStyle(color: Colors.grey.shade500, fontSize: 14),
          prefixIcon: const Icon(Icons.search_rounded, color: Color(0xFF9333EA), size: 20),
          suffixIcon: _searchController.text.isNotEmpty
              ? IconButton(
                  icon: Icon(Icons.close_rounded, color: Colors.grey.shade400, size: 18),
                  onPressed: () {
                    _searchController.clear();
                    _performSearch('');
                  },
                )
              : null,
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 13),
        ),
        onChanged: _performSearch,
      ),
    );
  }

  Widget _buildCategoryBar() {
    return Container(
      height: 60,
      margin: const EdgeInsets.only(top: 16),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: _categories.length,
        itemBuilder: (context, index) {
          final cat = _categories[index];
          final label = cat['label'] as String;
          final icon = cat['icon'] as IconData;
          final isSelected = _selectedCategory == null
              ? label == 'Tümü'
              : label == _selectedCategory;

          return Padding(
            padding: const EdgeInsets.only(right: 10),
            child: GestureDetector(
              onTap: () => _filterByCategory(label),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  gradient: isSelected
                      ? const LinearGradient(
                          colors: [Color(0xFF9333EA), Color(0xFF3B82F6)],
                        )
                      : null,
                  color: isSelected ? null : context.appColors.card,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: isSelected
                          ? const Color(0xFF9333EA).withOpacity(0.3)
                          : Colors.black.withOpacity(0.05),
                      blurRadius: 8,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      icon,
                      size: 16,
                      color: isSelected ? Colors.white : const Color(0xFF9333EA),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      label,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                        color: isSelected ? Colors.white : context.appColors.textPrimary,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildHeroBanner(bool isLoggedIn) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF7C3AED), Color(0xFF2563EB), Color(0xFF0891B2)],
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Color(0xFF7C3AED),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Stack(
        clipBehavior: Clip.hardEdge,
        children: [
          // Decorative circles
          Positioned(
            right: -20,
            top: -30,
            child: Container(
              width: 150,
              height: 150,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withOpacity(0.07),
              ),
            ),
          ),
          Positioned(
            right: 20,
            bottom: -40,
            child: Container(
              width: 110,
              height: 110,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withOpacity(0.06),
              ),
            ),
          ),
          // Right icon
          Positioned(
            right: 16,
            top: 0,
            bottom: 0,
            child: Icon(
              Icons.shopping_basket_rounded,
              size: 90,
              color: Colors.white.withOpacity(0.13),
            ),
          ),
          // Content
          Padding(
            padding: const EdgeInsets.fromLTRB(22, 20, 110, 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                // Title row
                RichText(
                  text: const TextSpan(
                    children: [
                      TextSpan(
                        text: 'Aradığın Ürünü Bul, ',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 20,
                          fontWeight: FontWeight.w900,
                          letterSpacing: -0.3,
                          height: 1.2,
                        ),
                      ),
                    ],
                  ),
                ),
                ShaderMask(
                  shaderCallback: (bounds) => const LinearGradient(
                    colors: [Color(0xFF4ADE80), Color(0xFF2DD4BF)],
                  ).createShader(bounds),
                  child: const Text(
                    'En İyi Fiyata Al!',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 20,
                      fontWeight: FontWeight.w900,
                      letterSpacing: -0.3,
                      height: 1.2,
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  '📦  Ürün ilanı oluştur, satıcılardan teklif al, karşılaştır ve en uygununü seç!',
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.9),
                    fontSize: 11.5,
                    height: 1.45,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 12),
      child: Row(
        children: [
          Container(
            width: 4,
            height: 22,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF9333EA), Color(0xFF3B82F6)],
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
              ),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(width: 10),
          Text(
            'Senin İçin Seçtiklerimiz',
            style: TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.bold,
              color: context.appColors.textPrimary,
            ),
          ),
          const SizedBox(width: 6),
          const Text('\u2B50', style: TextStyle(fontSize: 15)),
          const Spacer(),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: const Color(0xFFEDE9FE),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              '${_filteredListings.length} ilan',
              style: const TextStyle(
                color: Color(0xFF7C3AED),
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildListingCard(Listing listing) {
    return _ListingCardWidget(
      listing: listing,
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => ListingDetailScreen(listingId: listing.id),
          ),
        ).then((_) => _loadListings());
      },
    );
  }

  Widget _cardMeta(IconData icon, String text) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 11, color: context.appColors.textTertiary),
        const SizedBox(width: 3),
        Text(text, style: TextStyle(fontSize: 10, color: context.appColors.textSecondary)),
      ],
    );
  }

  Widget _imagePlaceholder() {
    return Container(
      color: context.appColors.chipBg,
      child: const Center(
        child: Icon(Icons.image_rounded, size: 36, color: Color(0xFFD1D5DB)),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFFEDE9FE), Color(0xFFDBEAFE)],
              ),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.search_off_rounded, size: 40, color: Color(0xFF9333EA)),
          ),
          const SizedBox(height: 16),
          Text(
            'İlan bulunamadi',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: context.appColors.textPrimary),
          ),
          const SizedBox(height: 8),
          Text(
            'Arama kriterlerini değiştirmeyi deneyin',
            style: TextStyle(color: Colors.grey.shade500, fontSize: 14),
          ),
        ],
      ),
    );
  }

  Widget _buildLoginRequired(String feature) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFFEDE9FE), Color(0xFFDBEAFE)],
                ),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.lock_outline_rounded, size: 36, color: Color(0xFF9333EA)),
            ),
            const SizedBox(height: 20),
            Text(
              '$feature için giriş yapin',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: context.appColors.textPrimary),
            ),
            const SizedBox(height: 8),
            Text(
              'Bu özelliği kullanmak için hesabiniza giriş yapmaniz gerekiyor.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey.shade600, fontSize: 14),
            ),
            const SizedBox(height: 28),
            Container(
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF9333EA), Color(0xFF3B82F6)],
                ),
                borderRadius: BorderRadius.circular(14),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF9333EA).withOpacity(0.4),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  borderRadius: BorderRadius.circular(14),
                  onTap: () => Navigator.push(context,
                      MaterialPageRoute(builder: (_) => const LoginScreen())),
                  child: const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 36, vertical: 14),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.login_rounded, color: Colors.white, size: 20),
                        SizedBox(width: 8),
                        Text(
                          'Giriş Yap',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────
// Listing Card Widget with auto-cycling images + animated offer count
// ─────────────────────────────────────────────────────────────
class _ListingCardWidget extends StatefulWidget {
  final Listing listing;
  final VoidCallback onTap;

  const _ListingCardWidget({required this.listing, required this.onTap});

  @override
  State<_ListingCardWidget> createState() => _ListingCardWidgetState();
}

class _ListingCardWidgetState extends State<_ListingCardWidget> {
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
        _pageController.animateToPage(
          next,
          duration: const Duration(milliseconds: 500),
          curve: Curves.easeInOut,
        );
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
        child: const Center(
          child: Icon(Icons.image_rounded, size: 36, color: Color(0xFFD1D5DB)),
        ),
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
              color: Colors.black.withOpacity(0.07),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Image area ──────────────────────────
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
                // bottom gradient overlay
                Positioned(
                  bottom: 0,
                  left: 0,
                  right: 0,
                  child: Container(
                    height: 44,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.bottomCenter,
                        end: Alignment.topCenter,
                        colors: [
                          Colors.black.withOpacity(0.38),
                          Colors.transparent,
                        ],
                      ),
                    ),
                  ),
                ),
                // price badge
                Positioned(
                  bottom: 8,
                  left: 8,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF9333EA), Color(0xFF3B82F6)],
                      ),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      formatPriceShort(listing.budgetMax),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),

                // image indicator dots (only if multiple images)
                if (hasMultiple)
                  Positioned(
                    bottom: 8,
                    left: 0,
                    right: 0,
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
                                : Colors.white.withOpacity(0.5),
                            borderRadius: BorderRadius.circular(3),
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
            // ── Info area ────────────────────────────
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
                      // animated offer count
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
                      const SizedBox(width: 5),
                      _metaChip(
                        Icons.visibility_rounded,
                        '${listing.viewCount}',
                        const Color(0xFF3B82F6),
                        const Color(0xFFDBEAFE),
                      ),
                      const SizedBox(width: 5),
                      _metaChip(
                        Icons.favorite_rounded,
                        '${listing.favoriteCount}',
                        const Color(0xFFEF4444),
                        const Color(0xFFFFE4E6),
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
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 10, color: fg),
          const SizedBox(width: 3),
          Text(
            label,
            style: TextStyle(fontSize: 10, color: fg, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}