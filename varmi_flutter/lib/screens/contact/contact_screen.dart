import 'package:flutter/material.dart';
import '../../config/theme.dart';
import '../../utils/app_dialog.dart';
import '../../services/support_service.dart';
import '../../providers/auth_provider.dart';
import 'package:provider/provider.dart';

class ContactScreen extends StatefulWidget {
  const ContactScreen({super.key});

  @override
  State<ContactScreen> createState() => _ContactScreenState();
}

class _ContactScreenState extends State<ContactScreen> {
  final _formKey = GlobalKey<FormState>();
  final SupportService _supportService = SupportService();

  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _subjectController = TextEditingController();
  final _messageController = TextEditingController();
  String _selectedCategory = 'general';
  bool _isSubmitting = false;

  static const _purple = Color(0xFF9333EA);
  static const _blue = Color(0xFF3B82F6);
  static const _teal = Color(0xFF14B8A6);
  static const _green = Color(0xFF10B981);

  final List<Map<String, dynamic>> _categories = [
    {'value': 'general',   'label': 'Genel',            'icon': Icons.help_outline_rounded},
    {'value': 'technical', 'label': 'Teknik Destek',    'icon': Icons.build_outlined},
    {'value': 'billing',   'label': 'Ödeme & Fatura',   'icon': Icons.credit_card_outlined},
    {'value': 'account',   'label': 'Hesap',            'icon': Icons.person_outline_rounded},
    {'value': 'listing',   'label': 'İlanlar',          'icon': Icons.list_alt_rounded},
    {'value': 'other',     'label': 'Diğer',            'icon': Icons.more_horiz_rounded},
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final user = Provider.of<AuthProvider>(context, listen: false).user;
      if (user != null) {
        _nameController.text = '${user.firstName} ${user.lastName}';
        _emailController.text = user.email;
        if (user.phone != null) _phoneController.text = user.phone!;
      }
    });
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _subjectController.dispose();
    _messageController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isSubmitting = true);
    try {
      await _supportService.sendSupportRequest(
        name: _nameController.text.trim(),
        email: _emailController.text.trim(),
        phone: _phoneController.text.trim(),
        category: _selectedCategory,
        subject: _subjectController.text.trim(),
        message: _messageController.text.trim(),
      );
      if (mounted) {
        _subjectController.clear();
        _messageController.clear();
        _showSuccessSheet();
      }
    } catch (e) {
      if (mounted) AppDialog.showError(context, AppDialog.cleanError(e));
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  void _showSuccessSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => Container(
        padding: const EdgeInsets.all(28),
        decoration: BoxDecoration(
          color: context.appColors.card,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: const LinearGradient(
                  colors: [_purple, _blue],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              child: const Icon(Icons.check_rounded, color: Colors.white, size: 32),
            ),
            const SizedBox(height: 16),
            Text(
              'Mesajınız İletildi!',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: context.appColors.textPrimary),
            ),
            const SizedBox(height: 8),
            Text(
              'Destek ekibimiz en kısa sürede size dönüş yapacaktır.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 14, color: context.appColors.textSecondary),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.pop(context),
                style: ElevatedButton.styleFrom(
                  backgroundColor: _purple,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                child: const Text('Tamam', style: TextStyle(fontWeight: FontWeight.w600)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: context.appColors.bg,
      body: CustomScrollView(
        slivers: [
          // ── Gradient header ──────────────────────────────
          SliverAppBar(
            expandedHeight: 170,
            pinned: true,
            backgroundColor: _purple,
            leading: IconButton(
              icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white),
              onPressed: () => Navigator.pop(context),
            ),
            title: const Text(
              'Canlı Destek',
              style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
            ),
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [_purple, _blue, _teal],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 52, 20, 12),
                    child: Row(
                      children: [
                        Container(
                          width: 56,
                          height: 56,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: Colors.white.withValues(alpha: 0.2),
                            border: Border.all(color: Colors.white.withValues(alpha: 0.4)),
                          ),
                          child: const Icon(Icons.support_agent_rounded, color: Colors.white, size: 30),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Destek Ekibi',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Row(
                                children: [
                                  Container(
                                    width: 7,
                                    height: 7,
                                    decoration: const BoxDecoration(
                                      shape: BoxShape.circle,
                                      color: Color(0xFF4ADE80),
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    '7/24 hizmetinizdeyiz',
                                    style: TextStyle(
                                      color: Colors.white.withValues(alpha: 0.9),
                                      fontSize: 12,
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
                ),
              ),
            ),
          ),

          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // ── Quick info chips ─────────────────────────
                    Row(
                      children: [
                        _infoChip(Icons.schedule_rounded, 'Ort. yanıt: 2 saat', _purple),
                        const SizedBox(width: 10),
                        _infoChip(Icons.verified_rounded, 'Güvenli', _green),
                      ],
                    ),
                    const SizedBox(height: 20),

                    // ── Category selector ────────────────────────
                    const _SectionLabel(icon: Icons.category_rounded, label: 'Kategori'),
                    const SizedBox(height: 10),
                    SizedBox(
                      height: 40,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemCount: _categories.length,
                        separatorBuilder: (_, __) => const SizedBox(width: 8),
                        itemBuilder: (_, i) {
                          final cat = _categories[i];
                          final selected = _selectedCategory == cat['value'];
                          return GestureDetector(
                            onTap: () => setState(() => _selectedCategory = cat['value'] as String),
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 200),
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                              decoration: BoxDecoration(
                                gradient: selected
                                    ? const LinearGradient(colors: [_purple, _blue])
                                    : null,
                                color: selected ? null : context.appColors.card,
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                  color: selected ? Colors.transparent : context.appColors.border,
                                ),
                                boxShadow: selected
                                    ? [BoxShadow(color: _purple.withValues(alpha: 0.3), blurRadius: 8, offset: const Offset(0, 2))]
                                    : [],
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(cat['icon'] as IconData, size: 14,
                                      color: selected ? Colors.white : context.appColors.textSecondary),
                                  const SizedBox(width: 5),
                                  Text(
                                    cat['label'] as String,
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      color: selected ? Colors.white : context.appColors.textSecondary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                    const SizedBox(height: 20),

                    // ── Form card ────────────────────────────────
                    Container(
                      decoration: BoxDecoration(
                        color: context.appColors.card,
                        borderRadius: BorderRadius.circular(18),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.06),
                            blurRadius: 12,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      padding: const EdgeInsets.all(18),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const _SectionLabel(icon: Icons.person_outline_rounded, label: 'Kişisel Bilgiler'),
                          const SizedBox(height: 12),
                          _field(
                            controller: _nameController,
                            label: 'Ad Soyad',
                            icon: Icons.person_rounded,
                            validator: (v) => (v == null || v.isEmpty) ? 'Ad girin' : null,
                          ),
                          const SizedBox(height: 10),
                          _field(
                            controller: _emailController,
                            label: 'E-posta',
                            icon: Icons.email_rounded,
                            keyboardType: TextInputType.emailAddress,
                            validator: (v) {
                              if (v == null || v.isEmpty) return 'E-posta girin';
                              if (!v.contains('@')) return 'Geçerli e-posta girin';
                              return null;
                            },
                          ),
                          const SizedBox(height: 10),
                          _field(
                            controller: _phoneController,
                            label: 'Telefon (isteğe bağlı)',
                            icon: Icons.phone_rounded,
                            keyboardType: TextInputType.phone,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),

                    Container(
                      decoration: BoxDecoration(
                        color: context.appColors.card,
                        borderRadius: BorderRadius.circular(18),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.06),
                            blurRadius: 12,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      padding: const EdgeInsets.all(18),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const _SectionLabel(icon: Icons.message_rounded, label: 'Mesajınız'),
                          const SizedBox(height: 12),
                          _field(
                            controller: _subjectController,
                            label: 'Konu',
                            icon: Icons.subject_rounded,
                            validator: (v) => (v == null || v.isEmpty) ? 'Konu girin' : null,
                          ),
                          const SizedBox(height: 10),
                          // Message box
                          TextFormField(
                            controller: _messageController,
                            maxLines: 5,
                            decoration: InputDecoration(
                              labelText: 'Mesajınız',
                              alignLabelWithHint: true,
                              prefixIcon: const Padding(
                                padding: EdgeInsets.only(bottom: 72),
                                child: Icon(Icons.chat_bubble_outline_rounded, color: _purple),
                              ),
                              filled: true,
                              fillColor: context.appColors.inputFill,
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: BorderSide(color: context.appColors.border),
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: BorderSide(color: context.appColors.border),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(color: _purple, width: 1.5),
                              ),
                              labelStyle: TextStyle(color: context.appColors.textTertiary),
                            ),
                            validator: (v) {
                              if (v == null || v.isEmpty) return 'Mesaj girin';
                              if (v.length < 20) return 'En az 20 karakter girin';
                              return null;
                            },
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // ── Submit button ────────────────────────────
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: _isSubmitting
                              ? null
                              : const LinearGradient(colors: [_purple, _blue]),
                          color: _isSubmitting ? const Color(0xFFE5E7EB) : null,
                          borderRadius: BorderRadius.circular(14),
                          boxShadow: _isSubmitting
                              ? []
                              : [BoxShadow(color: _purple.withValues(alpha: 0.35), blurRadius: 12, offset: const Offset(0, 4))],
                        ),
                        child: ElevatedButton.icon(
                          onPressed: _isSubmitting ? null : _submit,
                          icon: _isSubmitting
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(strokeWidth: 2, valueColor: AlwaysStoppedAnimation(Colors.white)),
                                )
                              : const Icon(Icons.send_rounded, size: 18),
                          label: Text(
                            _isSubmitting ? 'Gönderiliyor...' : 'Mesaj Gönder',
                            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.transparent,
                            foregroundColor: Colors.white,
                            shadowColor: Colors.transparent,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 32),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _field({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    TextInputType? keyboardType,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon, color: _purple, size: 20),
        filled: true,
fillColor: context.appColors.inputFill,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: context.appColors.border),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: context.appColors.border),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: _purple, width: 1.5),
              ),
              labelStyle: TextStyle(color: context.appColors.textTertiary),
              contentPadding: const EdgeInsets.symmetric(vertical: 14, horizontal: 12),
      ),
      validator: validator,
    );
  }

  Widget _infoChip(IconData icon, String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: color),
          const SizedBox(width: 5),
          Text(label, style: TextStyle(fontSize: 11, color: color, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  final IconData icon;
  final String label;
  const _SectionLabel({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        ShaderMask(
          shaderCallback: (b) => const LinearGradient(
            colors: [Color(0xFF9333EA), Color(0xFF3B82F6)],
          ).createShader(b),
          child: Icon(icon, size: 16, color: Colors.white),
        ),
        const SizedBox(width: 7),
        Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: context.appColors.textPrimary,
          ),
        ),
      ],
    );
  }
}
