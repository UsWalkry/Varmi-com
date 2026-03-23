import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/cart_provider.dart';
import '../../providers/theme_provider.dart';
import '../../services/commission_service.dart';
import '../../utils/formatters.dart';
import '../auth/login_screen.dart';
import '../cart/cart_screen.dart';
import 'edit_profile_screen.dart';
import 'account_verification_screen.dart';
import 'commission_screen.dart';
import '../orders/orders_screen.dart';
import '../contact/contact_screen.dart';
import 'settings_screen.dart';
import 'addresses_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final CommissionService _commissionService = CommissionService();
  double _balance = 0;
  bool _balanceLoaded = false;

  @override
  void initState() {
    super.initState();
    _loadBalance();
  }

  Future<void> _loadBalance() async {
    try {
      final data = await _commissionService.getBalance();
      if (mounted) {
        setState(() {
          _balance = (data['balance'] as num?)?.toDouble() ?? 0.0;
          _balanceLoaded = true;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _balanceLoaded = true);
    }
  }

  String _balanceText() {
    if (!_balanceLoaded) return '...';
    return formatPrice(_balance);
  }

  String _fullName(user) {
    final first = (user.firstName ?? '').trim();
    final last = (user.lastName ?? '').trim();
    if (first.isEmpty && last.isEmpty) return user.email.split('@').first;
    return '$first $last'.trim();
  }

  String _initials(user) {
    final first = (user.firstName ?? '').trim();
    final last = (user.lastName ?? '').trim();
    if (first.isNotEmpty && last.isNotEmpty) return '${first[0]}${last[0]}'.toUpperCase();
    if (first.isNotEmpty) return first[0].toUpperCase();
    return user.email[0].toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.watch<ThemeProvider>().isDark;
    final bgColor = context.appColors.bg;
    final cardColor = context.appColors.card;
    final textColor = context.appColors.textPrimary;
    final subColor = context.appColors.textSecondary;

    return Consumer<AuthProvider>(
      builder: (context, authProvider, _) {
        final user = authProvider.user;

        if (user == null) {
          return Scaffold(
            backgroundColor: bgColor,
            body: SafeArea(
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(24),
                      decoration: const BoxDecoration(
                        gradient: AppColors.primaryGradient,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.person_outline, size: 48, color: Colors.white),
                    ),
                    const SizedBox(height: 24),
                    Text('Giriş yapmanız gerekiyor',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: textColor)),
                    const SizedBox(height: 8),
                    Text('Profilinizi görüntülemek için giriş yapın',
                        style: TextStyle(fontSize: 14, color: subColor)),
                    const SizedBox(height: 32),
                    Container(
                      decoration: BoxDecoration(
                        gradient: AppColors.primaryGradient,
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.transparent,
                          shadowColor: Colors.transparent,
                          padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        ),
                        onPressed: () => Navigator.pushReplacement(
                          context,
                          MaterialPageRoute(builder: (_) => const LoginScreen()),
                        ),
                        child: const Text('Giriş Yap',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.white)),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        }

        return Scaffold(
          backgroundColor: bgColor,
          body: SafeArea(
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildHeader(context, user, isDark),
                  const SizedBox(height: 16),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Row(
                      children: [
                        Expanded(
                          child: _StatCard(
                            icon: Icons.account_balance_wallet_outlined,
                            label: 'Bakiyem',
                            value: _balanceText(),
                            gradient: const LinearGradient(
                              colors: [Color(0xFF9333EA), Color(0xFF7C3AED)],
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            ),
                            onTap: () => Navigator.push(context,
                                MaterialPageRoute(builder: (_) => const CommissionScreen())),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _StatCard(
                            icon: Icons.shopping_bag_outlined,
                            label: 'Siparişlerim',
                            value: 'Görüntüle',
                            gradient: const LinearGradient(
                              colors: [Color(0xFF3B82F6), Color(0xFF2563EB)],
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            ),
                            onTap: () => Navigator.push(context,
                                MaterialPageRoute(builder: (_) => const OrdersScreen())),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                  _SectionCard(
                    cardColor: cardColor,
                    isDark: isDark,
                    children: [
                      _MenuTile(
                        icon: Icons.shopping_cart_outlined,
                        iconBg: const Color(0xFFEDE9FE),
                        iconColor: const Color(0xFF7C3AED),
                        title: 'Sepetim',
                        subtitle: 'Kaydettiğiniz teklifler',
                        isDark: isDark,
                        trailing: Consumer<CartProvider>(
                          builder: (_, cart, __) => cart.itemCount > 0
                              ? Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF7C3AED),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Text(
                                    '${cart.itemCount}',
                                    style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 12,
                                        fontWeight: FontWeight.bold),
                                  ),
                                )
                              : const SizedBox.shrink(),
                        ),
                        onTap: () => Navigator.push(context,
                            MaterialPageRoute(
                                builder: (_) => const CartScreen())),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  _SectionCard(
                    cardColor: cardColor,
                    isDark: isDark,
                    children: [
                      _MenuTile(
                        icon: Icons.headset_mic_outlined,
                        iconBg: const Color(0xFFEFF6FF),
                        iconColor: const Color(0xFF3B82F6),
                        title: 'Canlı destek',
                        subtitle: 'Size yardımcı olalım',
                        isDark: isDark,
                        onTap: () => Navigator.push(context,
                            MaterialPageRoute(builder: (_) => const ContactScreen())),
                      ),
                      _TileDivider(isDark: isDark),
                      _MenuTile(
                        icon: Icons.verified_user_outlined,
                        iconBg: const Color(0xFFF0FDF4),
                        iconColor: const Color(0xFF10B981),
                        title: 'Hesap doğrulama',
                        subtitle: user.emailVerified == true
                            ? 'E-posta doğrulandı'
                            : 'Doğrulama bekliyor',
                        isDark: isDark,
                        onTap: () => Navigator.push(context,
                            MaterialPageRoute(builder: (_) => const AccountVerificationScreen())),
                      ),
                      _TileDivider(isDark: isDark),
                      _MenuTile(
                        icon: Icons.beach_access_outlined,
                        iconBg: const Color(0xFFFFFBEB),
                        iconColor: const Color(0xFFF59E0B),
                        title: 'Tatil modu',
                        subtitle: 'Mağazanızı geçici kapatın',
                        isDark: isDark,
                        onTap: () => _showVacationDialog(context),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  _SectionCard(
                    cardColor: cardColor,
                    isDark: isDark,
                    children: [
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        child: Row(
                          children: [
                            Container(
                              width: 40,
                              height: 40,
                              decoration: BoxDecoration(
                                color: isDark
                                    ? Colors.white.withOpacity(0.08)
                                    : const Color(0xFF1F2937).withOpacity(0.08),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Icon(
                                isDark ? Icons.dark_mode : Icons.dark_mode_outlined,
                                color: isDark ? Colors.white70 : const Color(0xFF374151),
                                size: 20,
                              ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('Karanlık mod',
                                      style: TextStyle(
                                          fontSize: 15,
                                          fontWeight: FontWeight.w500,
                                          color: textColor)),
                                  Text(isDark ? 'Açık' : 'Kapalı',
                                      style: TextStyle(fontSize: 12, color: subColor)),
                                ],
                              ),
                            ),
                            Switch(
                              value: isDark,
                              onChanged: (_) => context.read<ThemeProvider>().toggle(),
                              activeColor: AppColors.primary,
                            ),
                          ],
                        ),
                      ),
                      _TileDivider(isDark: isDark),
                      _MenuTile(
                        icon: Icons.settings_outlined,
                        iconBg: const Color(0xFFF1F5F9),
                        iconColor: const Color(0xFF64748B),
                        title: 'Ayarlarım',
                        subtitle: 'Hesap ve gizlilik ayarları',
                        isDark: isDark,
                        onTap: () => Navigator.push(context,
                            MaterialPageRoute(builder: (_) => const SettingsScreen())),
                      ),
                    ],
                  ),
                  const SizedBox(height: 28),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildHeader(BuildContext context, user, bool isDark) {
    final subColor = Colors.white70;
    return Container(
      width: double.infinity,
      decoration: const BoxDecoration(
        gradient: AppColors.primaryGradient,
        borderRadius: BorderRadius.only(
          bottomLeft: Radius.circular(28),
          bottomRight: Radius.circular(28),
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 24, 20, 28),
        child: Column(
          children: [
            Row(
              children: [
                GestureDetector(
                  onTap: () => Navigator.push(context,
                      MaterialPageRoute(builder: (_) => const EditProfileScreen())),
                  child: Container(
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 3),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.2),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: CircleAvatar(
                      radius: 36,
                      backgroundColor: Colors.white.withOpacity(0.25),
                      child: Text(
                        _initials(user),
                        style: const TextStyle(
                            fontSize: 26, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _fullName(user),
                        style: const TextStyle(
                            fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),
                      Text(user.email,
                          style: TextStyle(fontSize: 13, color: subColor),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis),
                      if (user.city != null && (user.city as String).isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(top: 3),
                          child: Row(
                            children: [
                              Icon(Icons.location_on_outlined, size: 12, color: subColor),
                              const SizedBox(width: 3),
                              Text(user.city!,
                                  style: TextStyle(fontSize: 12, color: subColor)),
                            ],
                          ),
                        ),
                    ],
                  ),
                ),
                GestureDetector(
                  onTap: () => Navigator.push(context,
                      MaterialPageRoute(builder: (_) => const EditProfileScreen())),
                  child: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.edit_outlined, color: Colors.white, size: 18),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                _VerifBadge(
                  icon: user.emailVerified == true ? Icons.check_circle : Icons.mail_outlined,
                  label: 'E-posta',
                  verified: user.emailVerified == true,
                  onTap: () => Navigator.push(context,
                      MaterialPageRoute(builder: (_) => const AccountVerificationScreen())),
                ),
                const SizedBox(width: 8),
                _VerifBadge(
                  icon: Icons.phone_outlined,
                  label: 'Telefon',
                  verified: false,
                  onTap: () => Navigator.push(context,
                      MaterialPageRoute(builder: (_) => const EditProfileScreen())),
                ),
                const SizedBox(width: 8),
                _VerifBadge(
                  icon: Icons.home_outlined,
                  label: 'Adres',
                  verified: false,
                  onTap: () => Navigator.push(context,
                      MaterialPageRoute(builder: (_) => const AddressesScreen())),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _showVacationDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Tatil Modu'),
        content: const Text('Tatil modunu açmak mağazanızı geçici olarak gizler.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context), child: const Text('Tamam')),
        ],
      ),
    );
  }
}

//  Helpers 

class _VerifBadge extends StatelessWidget {
  const _VerifBadge({required this.icon, required this.label, required this.verified, this.onTap});
  final IconData icon;
  final String label;
  final bool verified;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    // Doğrulanmış → yeşil dolu; Doğrulanmamış → beyaz saydam
    final bgColor = verified
        ? const Color(0xFF10B981)           // yeşil
        : Colors.white.withOpacity(0.12);
    final borderColor = verified
        ? const Color(0xFF34D399)           // açık yeşil kenarlık
        : Colors.white.withOpacity(0.3);
    final iconColor = verified ? Colors.white : Colors.white60;
    final textColor = verified ? Colors.white : Colors.white60;
    final fw = verified ? FontWeight.w700 : FontWeight.normal;

    return GestureDetector(
      onTap: onTap,
      child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: borderColor, width: 1),
        boxShadow: verified
            ? [
                BoxShadow(
                  color: const Color(0xFF10B981).withOpacity(0.4),
                  blurRadius: 6,
                  offset: const Offset(0, 2),
                ),
              ]
            : [],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            verified ? Icons.check_circle : icon,
            size: 13,
            color: iconColor,
          ),
          const SizedBox(width: 4),
          Text(label,
              style: TextStyle(
                  fontSize: 11,
                  color: textColor,
                  fontWeight: fw)),
        ],
      ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.icon,
    required this.label,
    required this.value,
    required this.gradient,
    required this.onTap,
  });
  final IconData icon;
  final String label;
  final String value;
  final LinearGradient gradient;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: gradient,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: gradient.colors.first.withOpacity(0.3),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: Colors.white70, size: 22),
            const SizedBox(height: 10),
            Text(value,
                style: const TextStyle(
                    color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18)),
            const SizedBox(height: 2),
            Text(label,
                style: const TextStyle(color: Colors.white70, fontSize: 12)),
          ],
        ),
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({required this.cardColor, required this.isDark, required this.children});
  final Color cardColor;
  final bool isDark;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Container(
        decoration: BoxDecoration(
          color: cardColor,
          borderRadius: BorderRadius.circular(16),
          boxShadow: isDark
              ? []
              : [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.06),
                    blurRadius: 10,
                    offset: const Offset(0, 2),
                  ),
                ],
        ),
        child: Column(children: children),
      ),
    );
  }
}

class _MenuTile extends StatelessWidget {
  const _MenuTile({
    required this.icon,
    required this.iconBg,
    required this.iconColor,
    required this.title,
    required this.subtitle,
    required this.isDark,
    required this.onTap,
    this.trailing,
  });
  final IconData icon;
  final Color iconBg;
  final Color iconColor;
  final String title;
  final String subtitle;
  final bool isDark;
  final VoidCallback onTap;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final textColor = context.appColors.textPrimary;
    final subColor = context.appColors.textSecondary;
    final resolvedIconBg = context.isDark ? iconColor.withOpacity(0.15) : iconBg;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: resolvedIconBg,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: iconColor, size: 20),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title,
                      style: TextStyle(
                          fontSize: 15, fontWeight: FontWeight.w500, color: textColor)),
                  Text(subtitle,
                      style: TextStyle(fontSize: 12, color: subColor)),
                ],
              ),
            ),
            if (trailing != null) ...[
              trailing!,
              const SizedBox(width: 4),
            ],
            Icon(Icons.chevron_right,
                color: isDark ? Colors.grey.shade600 : Colors.grey.shade400,
                size: 20),
          ],
        ),
      ),
    );
  }
}

class _TileDivider extends StatelessWidget {
  const _TileDivider({required this.isDark});
  final bool isDark;

  @override
  Widget build(BuildContext context) {
    return Divider(
      height: 1,
      indent: 70,
      endIndent: 0,
      color: isDark ? Colors.white12 : Colors.grey.shade100,
    );
  }
}