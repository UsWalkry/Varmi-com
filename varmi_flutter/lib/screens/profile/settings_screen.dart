import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/theme_provider.dart';
import '../auth/login_screen.dart';
import 'edit_profile_screen.dart';
import 'security_screen.dart';
import 'account_verification_screen.dart';
import 'addresses_screen.dart';
import 'commission_screen.dart';
import 'iban_screen.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = context.watch<ThemeProvider>().isDark;
    final authProvider = context.read<AuthProvider>();
    final bgColor = context.appColors.bg;
    final cardColor = context.appColors.card;

    return Scaffold(
      backgroundColor: bgColor,
      body: SafeArea(
        child: Column(
          children: [
            //  Gradient AppBar 
            Container(
              decoration: const BoxDecoration(
                gradient: AppColors.primaryGradient,
              ),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(4, 4, 16, 16),
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white, size: 20),
                      onPressed: () => Navigator.pop(context),
                    ),
                    const Expanded(
                      child: Text(
                        'Ayarlarım',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            //  Scrollable Body 
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(vertical: 20),
                children: [
                  // Hesap Ayarlarım
                  _SectionLabel(label: 'Hesap Ayarlarım', isDark: isDark),
                  const SizedBox(height: 8),
                  _SettingsCard(
                    cardColor: cardColor,
                    isDark: isDark,
                    children: [
                      _SettingsTile(
                        icon: Icons.person_outline,
                        iconBg: const Color(0xFFEFF6FF),
                        iconColor: const Color(0xFF3B82F6),
                        title: 'Kişisel bilgilerim',
                        subtitle: 'Ad, soyad, telefon, adres',
                        isDark: isDark,
                        onTap: () => Navigator.push(context,
                            MaterialPageRoute(builder: (_) => const EditProfileScreen())),
                      ),
                      _CardDivider(isDark: isDark),
                      _SettingsTile(
                        icon: Icons.lock_outline,
                        iconBg: const Color(0xFFF5F3FF),
                        iconColor: const Color(0xFF7C3AED),
                        title: 'Şifre bilgilerim',
                        subtitle: 'Şifre ve güvenlik ayarları',
                        isDark: isDark,
                        onTap: () => Navigator.push(context,
                            MaterialPageRoute(builder: (_) => const SecurityScreen())),
                      ),
                      _CardDivider(isDark: isDark),
                      _SettingsTile(
                        icon: Icons.location_on_outlined,
                        iconBg: const Color(0xFFF0FDF4),
                        iconColor: const Color(0xFF10B981),
                        title: 'Adres bilgilerim',
                        subtitle: 'Teslimat ve fatura adresleri',
                        isDark: isDark,
                        onTap: () => Navigator.push(context,
                            MaterialPageRoute(builder: (_) => const AddressesScreen())),
                      ),
                      _CardDivider(isDark: isDark),
                      _SettingsTile(
                        icon: Icons.verified_user_outlined,
                        iconBg: const Color(0xFFFFF7ED),
                        iconColor: const Color(0xFFF97316),
                        title: 'Hesap doğrulama',
                        subtitle: 'E-posta, telefon ve adres doğrula',
                        isDark: isDark,
                        onTap: () => Navigator.push(context,
                            MaterialPageRoute(builder: (_) => const AccountVerificationScreen())),
                      ),
                    ],
                  ),

                  const SizedBox(height: 20),

                  // Ödeme Bilgilerim
                  _SectionLabel(label: 'Ödeme & Komisyon', isDark: isDark),
                  const SizedBox(height: 8),
                  _SettingsCard(
                    cardColor: cardColor,
                    isDark: isDark,
                    children: [
                      _SettingsTile(
                        icon: Icons.account_balance_outlined,
                        iconBg: const Color(0xFFEFF6FF),
                        iconColor: const Color(0xFF2563EB),
                        title: 'IBAN bilgilerim',
                        subtitle: 'Kayıtlı banka hesaplarım',
                        isDark: isDark,
                        onTap: () => Navigator.push(context,
                            MaterialPageRoute(builder: (_) => const IbanScreen())),
                      ),
                    ],
                  ),

                  const SizedBox(height: 20),

                  // Gizlilik ve Güvenlik
                  _SectionLabel(label: 'Gizlilik ve Güvenlik', isDark: isDark),
                  const SizedBox(height: 8),
                  _SettingsCard(
                    cardColor: cardColor,
                    isDark: isDark,
                    children: [
                      _SettingsTile(
                        icon: Icons.shield_outlined,
                        iconBg: const Color(0xFFF0FDF4),
                        iconColor: const Color(0xFF059669),
                        title: 'Gizlilik ayarlarım',
                        subtitle: 'Veri ve gizlilik tercihleri',
                        isDark: isDark,
                        onTap: () => _showInfoDialog(context, 'Gizlilik ayarları yakında eklenecek.'),
                      ),
                      _CardDivider(isDark: isDark),
                      _SettingsTile(
                        icon: Icons.delete_outline,
                        iconBg: const Color(0xFFFFF1F2),
                        iconColor: const Color(0xFFEF4444),
                        title: 'Hesabımı sil',
                        subtitle: 'Kalıcı olarak hesabı kapat',
                        isDark: isDark,
                        onTap: () => _showDeleteAccountDialog(context, authProvider),
                        titleColor: const Color(0xFFEF4444),
                      ),
                    ],
                  ),

                  const SizedBox(height: 20),

                  // Çıkış Yap
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: GestureDetector(
                      onTap: () => _showLogoutDialog(context, authProvider),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        decoration: BoxDecoration(
                          color: isDark
                              ? const Color(0xFFEF4444).withOpacity(0.12)
                              : const Color(0xFFFFF1F2),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: const Color(0xFFEF4444).withOpacity(0.3),
                          ),
                        ),
                        child: const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.logout_rounded,
                                color: Color(0xFFEF4444), size: 20),
                            SizedBox(width: 10),
                            Text('Çıkış Yap',
                                style: TextStyle(
                                    color: Color(0xFFEF4444),
                                    fontSize: 15,
                                    fontWeight: FontWeight.w600)),
                          ],
                        ),
                      ),
                    ),
                  ),

                  const SizedBox(height: 32),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showInfoDialog(BuildContext context, String message) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        content: Text(message),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Tamam')),
        ],
      ),
    );
  }

  void _showDeleteAccountDialog(BuildContext context, AuthProvider authProvider) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Hesabımı Sil'),
        content: const Text(
            'Hesabınızı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('İptal')),
          TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Sil',
                  style: TextStyle(color: Color(0xFFEF4444)))),
        ],
      ),
    );
  }

  Future<void> _showLogoutDialog(
      BuildContext context, AuthProvider authProvider) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Çıkış Yap'),
        content: const Text('Çıkış yapmak istediğinize emin misiniz?'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('İptal')),
          TextButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Çıkış Yap',
                  style: TextStyle(color: Color(0xFFEF4444)))),
        ],
      ),
    );

    if (confirmed == true && context.mounted) {
      await authProvider.logout();
      if (context.mounted) {
        Navigator.pushAndRemoveUntil(
          context,
          MaterialPageRoute(builder: (_) => const LoginScreen()),
          (route) => false,
        );
      }
    }
  }
}

//  Helpers 

class _SectionLabel extends StatelessWidget {
  const _SectionLabel({required this.label, required this.isDark});
  final String label;
  final bool isDark;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Text(
        label.toUpperCase(),
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          letterSpacing: 1.1,
          color: isDark ? Colors.grey.shade500 : AppColors.textSecondary,
        ),
      ),
    );
  }
}

class _SettingsCard extends StatelessWidget {
  const _SettingsCard({
    required this.cardColor,
    required this.isDark,
    required this.children,
  });
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

class _SettingsTile extends StatelessWidget {
  const _SettingsTile({
    required this.icon,
    required this.iconBg,
    required this.iconColor,
    required this.title,
    required this.subtitle,
    required this.isDark,
    required this.onTap,
    this.titleColor,
  });
  final IconData icon;
  final Color iconBg;
  final Color iconColor;
  final String title;
  final String subtitle;
  final bool isDark;
  final VoidCallback onTap;
  final Color? titleColor;

  @override
  Widget build(BuildContext context) {
    final textColor = titleColor ?? context.appColors.textPrimary;
    final subColor = context.appColors.textSecondary;
    final resolvedIconBg = context.isDark ? iconColor.withOpacity(0.15) : iconBg;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
        child: Row(
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: resolvedIconBg,
                borderRadius: BorderRadius.circular(11),
              ),
              child: Icon(icon, color: iconColor, size: 21),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title,
                      style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w500,
                          color: textColor)),
                  const SizedBox(height: 1),
                  Text(subtitle,
                      style: TextStyle(fontSize: 12, color: subColor)),
                ],
              ),
            ),
            Icon(Icons.chevron_right,
                color: isDark ? Colors.grey.shade600 : Colors.grey.shade400,
                size: 20),
          ],
        ),
      ),
    );
  }
}

class _CardDivider extends StatelessWidget {
  const _CardDivider({required this.isDark});
  final bool isDark;

  @override
  Widget build(BuildContext context) {
    return Divider(
      height: 1,
      indent: 72,
      endIndent: 0,
      color: context.appColors.divider,
    );
  }
}