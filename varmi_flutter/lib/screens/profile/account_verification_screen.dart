import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/theme_provider.dart';
import '../../services/api_service.dart';
import '../../config/api_config.dart';

// 
// Ana ekran: 3 kart
// 
class AccountVerificationScreen extends StatelessWidget {
  const AccountVerificationScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final user = context.read<AuthProvider>().user;
    final isDark = context.watch<ThemeProvider>().isDark;
    final bgColor = isDark ? const Color(0xFF121212) : const Color(0xFFF4F6FB);

    return Scaffold(
      backgroundColor: bgColor,
      body: SafeArea(
        child: Column(
          children: [
            // Gradient header
            Container(
              decoration: const BoxDecoration(gradient: AppColors.primaryGradient),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(4, 4, 16, 16),
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.arrow_back_ios_new,
                          color: Colors.white, size: 20),
                      onPressed: () => Navigator.pop(context),
                    ),
                    const Expanded(
                      child: Text('Hesap Doğrulama',
                          style: TextStyle(
                              color: Colors.white,
                              fontSize: 18,
                              fontWeight: FontWeight.w600)),
                    ),
                  ],
                ),
              ),
            ),

            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  const SizedBox(height: 8),
                  // Info banner
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: isDark
                          ? AppColors.primary.withOpacity(0.15)
                          : const Color(0xFFEFF6FF),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: AppColors.primary.withOpacity(0.3),
                      ),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.info_outline,
                            color: AppColors.primary, size: 20),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            'Hesabınızı doğrulayarak güvenilir satıcı rozeti kazanın.',
                            style: TextStyle(
                              fontSize: 13,
                              color: isDark
                                  ? Colors.white70
                                  : const Color(0xFF1E40AF),
                              height: 1.4,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 16),

                  _VerificationCard(
                    icon: Icons.email_outlined,
                    iconColor: const Color(0xFF3B82F6),
                    iconBg: const Color(0xFFEFF6FF),
                    title: 'E-posta Doğrulama',
                    subtitle: user?.email ?? '',
                    isVerified: user?.emailVerified ?? false,
                    verifiedLabel: 'E-posta doğrulandı',
                    unverifiedLabel: 'Doğrulama gerekiyor',
                    isDark: isDark,
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) =>
                            EmailVerificationScreen(email: user?.email ?? ''),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),

                  _VerificationCard(
                    icon: Icons.phone_outlined,
                    iconColor: const Color(0xFF10B981),
                    iconBg: const Color(0xFFF0FDF4),
                    title: 'Cep No Doğrulama',
                    subtitle: (user?.phone != null && user!.phone!.isNotEmpty)
                        ? user.phone!
                        : 'Telefon eklenmedi',
                    isVerified: false,
                    verifiedLabel: 'Telefon doğrulandı',
                    unverifiedLabel: 'Yakında aktif',
                    isDark: isDark,
                    comingSoon: true,
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                          builder: (_) => const PhoneVerificationScreen()),
                    ),
                  ),
                  const SizedBox(height: 12),

                  _VerificationCard(
                    icon: Icons.account_balance_outlined,
                    iconColor: const Color(0xFF7C3AED),
                    iconBg: const Color(0xFFF5F3FF),
                    title: 'Adres Doğrulama',
                    subtitle: 'e-Devlet üzerinden doğrula',
                    isVerified: false,
                    verifiedLabel: 'Adres doğrulandı',
                    unverifiedLabel: 'Yakında aktif',
                    isDark: isDark,
                    comingSoon: true,
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                          builder: (_) => const AddressVerificationScreen()),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// 
// Shared card
// 
class _VerificationCard extends StatelessWidget {
  const _VerificationCard({
    required this.icon,
    required this.iconColor,
    required this.iconBg,
    required this.title,
    required this.subtitle,
    required this.isVerified,
    required this.verifiedLabel,
    required this.unverifiedLabel,
    required this.isDark,
    required this.onTap,
    this.comingSoon = false,
  });

  final IconData icon;
  final Color iconColor;
  final Color iconBg;
  final String title;
  final String subtitle;
  final bool isVerified;
  final String verifiedLabel;
  final String unverifiedLabel;
  final bool isDark;
  final VoidCallback onTap;
  final bool comingSoon;

  @override
  Widget build(BuildContext context) {
    final cardColor = context.appColors.card;
    final textColor = context.appColors.textPrimary;
    final subColor = context.appColors.textSecondary;
    final resolvedIconBg = context.isDark ? iconColor.withOpacity(0.15) : iconBg;

    final statusColor = isVerified
        ? const Color(0xFF10B981)
        : comingSoon
            ? Colors.grey
            : const Color(0xFFF97316);

    return Container(
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
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: resolvedIconBg,
                  borderRadius: BorderRadius.circular(13),
                ),
                child: Icon(icon, color: iconColor, size: 24),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title,
                        style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: textColor)),
                    const SizedBox(height: 2),
                    Text(subtitle,
                        style: TextStyle(fontSize: 12, color: subColor),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: statusColor.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                              color: statusColor.withOpacity(0.3),
                              width: 0.8,
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                isVerified
                                    ? Icons.check_circle
                                    : comingSoon
                                        ? Icons.schedule
                                        : Icons.radio_button_unchecked,
                                size: 11,
                                color: statusColor,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                isVerified ? verifiedLabel : unverifiedLabel,
                                style: TextStyle(
                                  fontSize: 11,
                                  color: statusColor,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              Icon(Icons.chevron_right,
                  color: isDark ? Colors.grey.shade600 : Colors.grey.shade400,
                  size: 20),
            ],
          ),
        ),
      ),
    );
  }
}

// 
// E-posta Doğrulama
// 
class EmailVerificationScreen extends StatefulWidget {
  final String email;
  const EmailVerificationScreen({super.key, required this.email});

  @override
  State<EmailVerificationScreen> createState() =>
      _EmailVerificationScreenState();
}

class _EmailVerificationScreenState extends State<EmailVerificationScreen> {
  bool _sending = false;
  bool _sent = false;
  String? _error;

  Future<void> _sendVerification() async {
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      await apiService.post(
        '${ApiConfig.authEndpoint}/resend-verification',
        data: {'email': widget.email},
      );
      if (mounted) setState(() => _sent = true);
    } catch (e) {
      if (mounted) {
        setState(() => _error = e.toString().replaceAll('Exception: ', ''));
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.read<AuthProvider>().user;
    final verified = user?.emailVerified ?? false;
    final isDark = context.watch<ThemeProvider>().isDark;
    final bgColor = context.appColors.bg;
    final cardColor = context.appColors.card;
    final textColor = context.appColors.textPrimary;
    final subColor = context.appColors.textSecondary;

    return Scaffold(
      backgroundColor: bgColor,
      body: SafeArea(
        child: Column(
          children: [
            Container(
              decoration: const BoxDecoration(gradient: AppColors.primaryGradient),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(4, 4, 16, 16),
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.arrow_back_ios_new,
                          color: Colors.white, size: 20),
                      onPressed: () => Navigator.pop(context),
                    ),
                    const Expanded(
                      child: Text('E-posta Doğrulama',
                          style: TextStyle(
                              color: Colors.white,
                              fontSize: 18,
                              fontWeight: FontWeight.w600)),
                    ),
                  ],
                ),
              ),
            ),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    const SizedBox(height: 20),
                    Container(
                      width: 90,
                      height: 90,
                      decoration: BoxDecoration(
                        gradient: verified
                            ? const LinearGradient(
                                colors: [Color(0xFF10B981), Color(0xFF059669)],
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                              )
                            : AppColors.primaryGradient,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: (verified
                                    ? const Color(0xFF10B981)
                                    : AppColors.primary)
                                .withOpacity(0.3),
                            blurRadius: 20,
                            offset: const Offset(0, 6),
                          ),
                        ],
                      ),
                      child: Icon(
                        verified
                            ? Icons.mark_email_read_outlined
                            : Icons.email_outlined,
                        size: 40,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 24),
                    Text(
                      verified ? 'E-posta Doğrulandı!' : 'E-posta Doğrulanmadı',
                      style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          color: textColor),
                    ),
                    const SizedBox(height: 8),
                    Text(widget.email,
                        style: TextStyle(
                            color: AppColors.primary,
                            fontSize: 14,
                            fontWeight: FontWeight.w500)),
                    const SizedBox(height: 16),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: cardColor,
                        borderRadius: BorderRadius.circular(14),
                        boxShadow: isDark
                            ? []
                            : [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.05),
                                  blurRadius: 8,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                      ),
                      child: Text(
                        verified
                            ? 'E-posta adresiniz başarıyla doğrulanmış. Hesabınız güvende.'
                            : 'E-posta adresiniz henüz doğrulanmamış. Aşağıdaki butona basarak doğrulama e-postası gönderebilirsiniz.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                            color: subColor, height: 1.6, fontSize: 14),
                      ),
                    ),
                    if (!verified) ...[
                      const SizedBox(height: 24),
                      if (_sent)
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: isDark
                                ? const Color(0xFF10B981).withOpacity(0.15)
                                : const Color(0xFFF0FDF4),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: const Color(0xFF10B981).withOpacity(0.4),
                            ),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.check_circle,
                                  color: Color(0xFF10B981), size: 20),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  'Doğrulama e-postası ${widget.email} adresine gönderildi.',
                                  style: TextStyle(
                                    color: isDark
                                        ? const Color(0xFF6EE7B7)
                                        : const Color(0xFF065F46),
                                    fontSize: 13,
                                    height: 1.4,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        )
                      else ...[
                        if (_error != null)
                          Container(
                            margin: const EdgeInsets.only(bottom: 16),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: isDark
                                  ? const Color(0xFFEF4444).withOpacity(0.15)
                                  : const Color(0xFFFFF1F2),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(_error!,
                                style: const TextStyle(
                                    color: Color(0xFFEF4444), fontSize: 13),
                                textAlign: TextAlign.center),
                          ),
                        Container(
                          width: double.infinity,
                          decoration: BoxDecoration(
                            gradient: AppColors.primaryGradient,
                            borderRadius: BorderRadius.circular(14),
                            boxShadow: [
                              BoxShadow(
                                color: AppColors.primary.withOpacity(0.3),
                                blurRadius: 12,
                                offset: const Offset(0, 4),
                              ),
                            ],
                          ),
                          child: ElevatedButton.icon(
                            onPressed: _sending ? null : _sendVerification,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.transparent,
                              shadowColor: Colors.transparent,
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(14)),
                            ),
                            icon: _sending
                                ? const SizedBox(
                                    width: 16,
                                    height: 16,
                                    child: CircularProgressIndicator(
                                        strokeWidth: 2, color: Colors.white))
                                : const Icon(Icons.send_outlined,
                                    color: Colors.white),
                            label: Text(
                              _sending
                                  ? 'Gönderiliyor...'
                                  : 'Doğrulama E-postası Gönder',
                              style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 15,
                                  fontWeight: FontWeight.w600),
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          'noreply@varmii.com adresinden gönderilecektir.',
                          style: TextStyle(
                              color: isDark
                                  ? Colors.grey.shade600
                                  : Colors.grey.shade400,
                              fontSize: 12),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// 
// Telefon (STUB)
// 
class PhoneVerificationScreen extends StatelessWidget {
  const PhoneVerificationScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = context.watch<ThemeProvider>().isDark;
    return _ComingSoonScreen(
      isDark: isDark,
      title: 'Cep No Doğrulama',
      icon: Icons.phone_outlined,
      gradient: const LinearGradient(
        colors: [Color(0xFF10B981), Color(0xFF059669)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ),
      description:
          'SMS ile cep numarası doğrulama özelliği yakında kullanıma girecek. Telefon numaranızı doğrulayarak daha güvenilir bir profil oluşturun.',
    );
  }
}

// 
// Adres / e-Devlet (STUB)
// 
class AddressVerificationScreen extends StatelessWidget {
  const AddressVerificationScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = context.watch<ThemeProvider>().isDark;
    return _ComingSoonScreen(
      isDark: isDark,
      title: 'Adres Doğrulama',
      icon: Icons.account_balance_outlined,
      gradient: const LinearGradient(
        colors: [Color(0xFF7C3AED), Color(0xFF6D28D9)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ),
      description:
          'e-Devlet entegrasyonu ile adresinizi doğrulayarak güvenilir satıcı rozetini kazanabilirsiniz. Bu özellik yakında iOS ve Android uygulamalarında kullanılabilir olacak.',
    );
  }
}

// 
// Ortak "Yakında" ekranı
// 
class _ComingSoonScreen extends StatelessWidget {
  const _ComingSoonScreen({
    required this.isDark,
    required this.title,
    required this.icon,
    required this.gradient,
    required this.description,
  });

  final bool isDark;
  final String title;
  final IconData icon;
  final LinearGradient gradient;
  final String description;

  @override
  Widget build(BuildContext context) {
    final bgColor = context.appColors.bg;
    final cardColor = context.appColors.card;
    final textColor = context.appColors.textPrimary;
    final subColor = context.appColors.textSecondary;

    return Scaffold(
      backgroundColor: bgColor,
      body: SafeArea(
        child: Column(
          children: [
            Container(
              decoration: const BoxDecoration(gradient: AppColors.primaryGradient),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(4, 4, 16, 16),
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.arrow_back_ios_new,
                          color: Colors.white, size: 20),
                      onPressed: () => Navigator.pop(context),
                    ),
                    Expanded(
                      child: Text(title,
                          style: const TextStyle(
                              color: Colors.white,
                              fontSize: 18,
                              fontWeight: FontWeight.w600)),
                    ),
                  ],
                ),
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      width: 90,
                      height: 90,
                      decoration: BoxDecoration(
                        gradient: gradient,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color:
                                gradient.colors.first.withOpacity(0.3),
                            blurRadius: 20,
                            offset: const Offset(0, 6),
                          ),
                        ],
                      ),
                      child: Icon(icon, size: 40, color: Colors.white),
                    ),
                    const SizedBox(height: 28),
                    Text(title,
                        style: TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                            color: textColor)),
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: cardColor,
                        borderRadius: BorderRadius.circular(14),
                        boxShadow: isDark
                            ? []
                            : [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.05),
                                  blurRadius: 8,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                      ),
                      child: Text(description,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                              color: subColor, height: 1.6, fontSize: 14)),
                    ),
                    const SizedBox(height: 24),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 10),
                      decoration: BoxDecoration(
                        color: isDark
                            ? Colors.white.withOpacity(0.08)
                            : const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.schedule,
                              size: 16, color: Colors.grey),
                          const SizedBox(width: 6),
                          Text('Yakında kullanıma girecek',
                              style: TextStyle(
                                  color: subColor,
                                  fontSize: 13,
                                  fontWeight: FontWeight.w500)),
                        ],
                      ),
                    ),
                    const SizedBox(height: 32),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton(
                        onPressed: () => Navigator.pop(context),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          side: BorderSide(
                              color: gradient.colors.first.withOpacity(0.5)),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14)),
                          foregroundColor: gradient.colors.first,
                        ),
                        child: const Text('Geri Dön',
                            style: TextStyle(fontWeight: FontWeight.w600)),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}