import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../models/iban_model.dart';
import '../../providers/auth_provider.dart';
import '../../services/iban_service.dart';

class IbanScreen extends StatefulWidget {
  const IbanScreen({super.key});

  @override
  State<IbanScreen> createState() => _IbanScreenState();
}

class _IbanScreenState extends State<IbanScreen> {
  final IbanService _service = IbanService();
  List<IbanModel> _ibans = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; });
    try {
      final list = await _service.getIbans();
      if (mounted) setState(() { _ibans = list; _loading = false; });
    } catch (_) {
      // Herhangi bir hata (tablo yok, ağ hatası vb.) → boş liste göster
      if (mounted) setState(() { _ibans = []; _loading = false; });
    }
  }

  // ── IBAN Ekle Dialog ─────────────────────────────────────────
  void _showAddDialog() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final userFullName = authProvider.user?.fullName ?? '';
    final added = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _AddIbanSheet(
        service: _service,
        isFirstIban: _ibans.isEmpty,
        userFullName: userFullName,
      ),
    );
    if (added == true && mounted) {
      _showSnack('IBAN başarıyla eklendi ✓', isError: false);
      _load();
    }
  }

  Future<void> _setDefault(IbanModel iban) async {
    try {
      await _service.setDefault(iban.id);
      _showSnack('Varsayılan IBAN güncellendi', isError: false);
      _load();
    } catch (e) {
      _showSnack(_parseErr(e), isError: true);
    }
  }

  Future<void> _delete(IbanModel iban) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('IBAN Sil'),
        content: Text('"${iban.title}" hesabını silmek istediğinizden emin misiniz?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('İptal')),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Sil', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
    if (confirm != true) return;
    try {
      await _service.deleteIban(iban.id);
      _showSnack('IBAN silindi', isError: false);
      _load();
    } catch (e) {
      _showSnack(_parseErr(e), isError: true);
    }
  }

  void _showSnack(String msg, {required bool isError}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg),
      backgroundColor: isError ? Colors.red.shade700 : Colors.green.shade700,
      behavior: SnackBarBehavior.floating,
    ));
  }

  String _parseErr(dynamic e) {
    final s = e.toString();
    final match = RegExp(r'"error"\s*:\s*"([^"]+)"').firstMatch(s);
    return match?.group(1) ?? 'Bir hata oluştu';
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.appColors;
    final isDark = context.isDark;

    return Scaffold(
      backgroundColor: colors.bg,
      appBar: AppBar(
        backgroundColor: const Color(0xFF6B21A8),
        foregroundColor: Colors.white,
        title: const Text('IBAN Bilgilerim', style: TextStyle(fontWeight: FontWeight.bold)),
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            tooltip: 'IBAN Ekle',
            onPressed: _showAddDialog,
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF6B21A8)))
          : _ibans.isEmpty
                  ? _EmptyState(onAdd: _showAddDialog)
                  : RefreshIndicator(
                      color: const Color(0xFF6B21A8),
                      onRefresh: _load,
                      child: ListView(
                        padding: const EdgeInsets.all(16),
                        children: [
                          // Bilgi kartı
                          Container(
                            margin: const EdgeInsets.only(bottom: 16),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: isDark ? const Color(0xFF1E1A2E) : const Color(0xFFF5F3FF),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: isDark ? const Color(0xFF4C1D95) : const Color(0xFFDDD6FE),
                              ),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.info_outline, color: Color(0xFF7C3AED), size: 18),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    'IBAN\'larınız komisyon çekim işlemlerinde kullanılır. En fazla 10 IBAN kaydedebilirsiniz.',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: isDark ? const Color(0xFFC4B5FD) : const Color(0xFF5B21B6),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          // IBAN kartları
                          ..._ibans.map((iban) => _IbanCard(
                            iban: iban,
                            isDark: isDark,
                            colors: colors,
                            onSetDefault: () => _setDefault(iban),
                            onDelete: () => _delete(iban),
                          )),
                        ],
                      ),
                    ),
      floatingActionButton: _ibans.isEmpty
          ? null
          : FloatingActionButton.extended(
              backgroundColor: const Color(0xFF6B21A8),
              foregroundColor: Colors.white,
              icon: const Icon(Icons.add),
              label: const Text('IBAN Ekle'),
              onPressed: _showAddDialog,
            ),
    );
  }
}

// ─────────────────────────────────────────────────────────────
// IBAN Kartı Widget
// ─────────────────────────────────────────────────────────────
class _IbanCard extends StatelessWidget {
  final IbanModel iban;
  final bool isDark;
  final dynamic colors;
  final VoidCallback onSetDefault;
  final VoidCallback onDelete;

  const _IbanCard({
    required this.iban,
    required this.isDark,
    required this.colors,
    required this.onSetDefault,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: colors.card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: iban.isDefault
              ? const Color(0xFF7C3AED)
              : (isDark ? Colors.white12 : Colors.grey.shade200),
          width: iban.isDefault ? 2 : 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.3 : 0.06),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Üst satır: başlık + badge + menu
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF2D1A50) : const Color(0xFFF5F3FF),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.account_balance_outlined,
                      color: Color(0xFF7C3AED), size: 20),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        iban.title,
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 15,
                          color: colors.textPrimary,
                        ),
                      ),
                      Text(
                        iban.bankName,
                        style: TextStyle(fontSize: 12, color: colors.textSecondary),
                      ),
                    ],
                  ),
                ),
                if (iban.isDefault)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFF7C3AED),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Text('Varsayılan',
                        style: TextStyle(color: Colors.white, fontSize: 11)),
                  ),
                PopupMenuButton<String>(
                  icon: Icon(Icons.more_vert, color: colors.textSecondary, size: 20),
                  color: colors.card,
                  onSelected: (v) {
                    if (v == 'default') onSetDefault();
                    if (v == 'delete') onDelete();
                    if (v == 'copy') {
                      Clipboard.setData(ClipboardData(text: iban.iban));
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('IBAN kopyalandı'),
                          duration: Duration(seconds: 2),
                          behavior: SnackBarBehavior.floating,
                        ),
                      );
                    }
                  },
                  itemBuilder: (_) => [
                    if (!iban.isDefault)
                      const PopupMenuItem(
                          value: 'default',
                          child: Row(children: [
                            Icon(Icons.star_outline, size: 18, color: Color(0xFF7C3AED)),
                            SizedBox(width: 8),
                            Text('Varsayılan yap'),
                          ])),
                    const PopupMenuItem(
                        value: 'copy',
                        child: Row(children: [
                          Icon(Icons.copy, size: 18),
                          SizedBox(width: 8),
                          Text('IBAN kopyala'),
                        ])),
                    const PopupMenuItem(
                        value: 'delete',
                        child: Row(children: [
                          Icon(Icons.delete_outline, size: 18, color: Colors.red),
                          SizedBox(width: 8),
                          Text('Sil', style: TextStyle(color: Colors.red)),
                        ])),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 12),
            // IBAN numarası
            GestureDetector(
              onTap: () {
                Clipboard.setData(ClipboardData(text: iban.iban));
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('IBAN kopyalandı'),
                    duration: Duration(seconds: 2),
                    behavior: SnackBarBehavior.floating,
                  ),
                );
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1A1A2E) : const Color(0xFFF8F7FF),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: isDark ? Colors.white10 : const Color(0xFFE9D5FF),
                  ),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        iban.formatted,
                        style: TextStyle(
                          fontFamily: 'monospace',
                          fontSize: 13,
                          letterSpacing: 1.2,
                          color: isDark ? const Color(0xFFDDD6FE) : const Color(0xFF4C1D95),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    Icon(Icons.copy_outlined, size: 16,
                        color: isDark ? const Color(0xFF7C3AED) : const Color(0xFF7C3AED)),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 8),
            // Hesap sahibi
            Row(
              children: [
                Icon(Icons.person_outline, size: 14, color: colors.textSecondary),
                const SizedBox(width: 4),
                Text(
                  iban.accountHolderName,
                  style: TextStyle(fontSize: 13, color: colors.textSecondary),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────
// Boş Durum Widget
// ─────────────────────────────────────────────────────────────
class _EmptyState extends StatelessWidget {
  final VoidCallback onAdd;
  const _EmptyState({required this.onAdd});

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDark;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isDark ? const Color(0xFF1E1A2E) : const Color(0xFFF5F3FF),
              ),
              child: const Icon(Icons.account_balance_outlined,
                  size: 56, color: Color(0xFF7C3AED)),
            ),
            const SizedBox(height: 20),
            Text('Henüz IBAN eklenmedi',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: context.appColors.textPrimary,
                )),
            const SizedBox(height: 8),
            Text(
              'Komisyon ödemelerinizi almak için\nbanka hesabınızı ekleyin.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 14, color: context.appColors.textSecondary),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF6B21A8),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              icon: const Icon(Icons.add),
              label: const Text('IBAN Ekle'),
              onPressed: onAdd,
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────
// Hata Durumu Widget
// ─────────────────────────────────────────────────────────────
class _ErrorState extends StatelessWidget {
  final VoidCallback onRetry;
  const _ErrorState({required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.error_outline, size: 48, color: Colors.red),
          const SizedBox(height: 12),
          const Text('Veriler yüklenemedi'),
          const SizedBox(height: 12),
          ElevatedButton(onPressed: onRetry, child: const Text('Tekrar Dene')),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────
// IBAN Ekle Bottom Sheet — tamamen self-contained
// ─────────────────────────────────────────────────────────────
class _AddIbanSheet extends StatefulWidget {
  final IbanService service;
  final bool isFirstIban;
  final String userFullName;

  const _AddIbanSheet({
    required this.service,
    required this.isFirstIban,
    required this.userFullName,
  });

  @override
  State<_AddIbanSheet> createState() => _AddIbanSheetState();
}

class _AddIbanSheetState extends State<_AddIbanSheet> {
  final _formKey = GlobalKey<FormState>();
  final _titleCtl = TextEditingController();
  final _holderCtl = TextEditingController();
  final _ibanCtl = TextEditingController();
  String? _selectedBank;
  bool _isDefault = false;
  bool _saving = false;
  String? _errorMsg;

  @override
  void initState() {
    super.initState();
    _isDefault = widget.isFirstIban;
    _holderCtl.text = widget.userFullName;
  }

  @override
  void dispose() {
    _titleCtl.dispose();
    _holderCtl.dispose();
    _ibanCtl.dispose();
    super.dispose();
  }

  static const List<String> _banks = [
    'Akbank', 'Garanti BBVA', 'İş Bankası', 'Yapı Kredi',
    'Ziraat Bankası', 'Halkbank', 'Vakıfbank', 'QNB Finansbank',
    'Denizbank', 'TEB', 'ING Bank', 'HSBC', 'Şekerbank',
    'Türkiye Finans', 'Kuveyt Türk', 'Albaraka Türk', 'Diğer',
  ];

  Future<void> _save() async {
    // Önce mevcut tüm validation hatalarını temizle
    setState(() => _errorMsg = null);

    if (!(_formKey.currentState?.validate() ?? false)) return;

    setState(() => _saving = true);
    try {
      await widget.service.addIban(
        title: _titleCtl.text.trim(),
        bankName: _selectedBank ?? '',
        iban: 'TR${_ibanCtl.text.replaceAll(' ', '')}',
        accountHolderName: _holderCtl.text.trim(),
        isDefault: _isDefault,
      );
      if (mounted) Navigator.pop(context, true); // başarı
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMsg = _parseErr(e);
          _saving = false;
        });
      }
    }
  }

  String _parseErr(dynamic e) {
    final s = e.toString();
    // Dio response body içindeki "error" alanı
    final bodyMatch = RegExp(r'"error"\s*:\s*"([^"]+)"').firstMatch(s);
    if (bodyMatch != null) return bodyMatch.group(1)!;
    // _handleError tarafından oluşturulan Exception mesajları
    if (s.contains('zaten kayıtlı')) return 'Bu IBAN zaten kayıtlı.';
    if (s.contains('Geçersiz IBAN')) return 'Geçersiz IBAN formatı. Lütfen kontrol edin.';
    if (s.contains('En fazla 10')) return 'En fazla 10 IBAN kaydedebilirsiniz.';
    if (s.contains('Sunucu hatası') || s.contains('500')) return 'Sunucu hatası oluştu. Lütfen tekrar deneyin.';
    if (s.contains('Oturum') || s.contains('401')) return 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.';
    if (s.contains('bulunamadı') || s.contains('404')) return 'Servis şu anda kullanılamıyor. Lütfen tekrar deneyin.';
    if (s.contains('SocketException') || s.contains('bağlantı') || s.contains('connection')) return 'İnternet bağlantısı yok.';
    if (s.contains('zaman aşımı') || s.contains('timeout')) return 'Bağlantı zaman aşımına uğradı.';
    // Son çare: Exception: mesaj formatını ayıkla
    final excMatch = RegExp(r'Exception:\s*(.+)').firstMatch(s);
    if (excMatch != null) return excMatch.group(1)!.trim();
    return 'Bir hata oluştu. Lütfen tekrar deneyin.';
  }

  @override
  Widget build(BuildContext context) {
    final isDark = context.isDark;
    final colors = context.appColors;

    return Container(
      decoration: BoxDecoration(
        color: colors.card,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.only(
        left: 20, right: 20, top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: SingleChildScrollView(
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              // Handle
              Center(
                child: Container(
                  width: 40, height: 4,
                  decoration: BoxDecoration(
                    color: isDark ? Colors.white24 : Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              // Başlık
              Row(
                children: [
                  const Icon(Icons.add_card, color: Color(0xFF7C3AED)),
                  const SizedBox(width: 8),
                  Text('Yeni IBAN Ekle',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 18,
                        color: colors.textPrimary,
                      )),
                ],
              ),
              const SizedBox(height: 20),

              // Hesap Adı
              _buildField(
                controller: _titleCtl,
                label: 'Hesap Adı',
                hint: 'örn: Akbank Maaş Hesabım',
                icon: Icons.label_outline,
                isDark: isDark,
                colors: colors,
                validator: (v) => (v == null || v.trim().isEmpty) ? 'Hesap adı girin' : null,
              ),
              const SizedBox(height: 14),

              // Banka (dropdown)
              DropdownButtonFormField<String>(
                value: _selectedBank,
                decoration: _inputDeco(
                  label: 'Banka',
                  icon: Icons.account_balance,
                  isDark: isDark,
                  colors: colors,
                ),
                dropdownColor: colors.card,
                style: TextStyle(color: colors.textPrimary, fontSize: 14),
                hint: Text('Banka seçin', style: TextStyle(color: colors.textSecondary)),
                items: _banks.map((b) => DropdownMenuItem(value: b, child: Text(b))).toList(),
                onChanged: (v) => setState(() => _selectedBank = v),
                validator: (v) => (v == null || v.isEmpty) ? 'Banka seçin' : null,
              ),
              const SizedBox(height: 14),

              // Hesap Sahibi (sadece okunur — kayıtlı ad soyadı)
              _buildField(
                controller: _holderCtl,
                label: 'Hesap Sahibi Adı Soyadı',
                hint: 'Ad Soyad',
                icon: Icons.person_outline,
                isDark: isDark,
                colors: colors,
                readOnly: true,
                validator: (v) => (v == null || v.trim().isEmpty) ? 'Ad soyad girin' : null,
              ),
              const SizedBox(height: 14),

              // IBAN
              TextFormField(
                controller: _ibanCtl,
                inputFormatters: [_IbanFormatter()],
                keyboardType: TextInputType.number,
                style: TextStyle(
                  color: colors.textPrimary,
                  letterSpacing: 1.5,
                  fontSize: 14,
                  fontFamily: 'monospace',
                ),
                decoration: _inputDeco(
                  label: 'IBAN',
                  icon: Icons.credit_card,
                  isDark: isDark,
                  colors: colors,
                  hint: '00 0000 0000 0000 0000 0000 00',
                  prefixText: 'TR',
                ),
                validator: (v) {
                  if (v == null || v.trim().isEmpty) return 'IBAN girin';
                  final digits = v.replaceAll(' ', '');
                  if (digits.length != 24 || !RegExp(r'^\d+$').hasMatch(digits)) {
                    return 'Geçerli bir IBAN girin (24 rakam, TR olmadan)';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 12),

              // Varsayılan switch
              Row(
                children: [
                  Switch(
                    value: _isDefault,
                    activeColor: const Color(0xFF7C3AED),
                    onChanged: (v) => setState(() => _isDefault = v),
                  ),
                  Text('Varsayılan IBAN olarak ayarla',
                      style: TextStyle(color: colors.textSecondary, fontSize: 14)),
                ],
              ),

              // Hata mesajı (sheet içinde görünür)
              if (_errorMsg != null) ...[  
                const SizedBox(height: 8),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: Colors.red.shade200),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.error_outline, color: Colors.red.shade700, size: 18),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _errorMsg!,
                          style: TextStyle(color: Colors.red.shade700, fontSize: 13),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 16),

              // Kaydet butonu
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF6B21A8),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    elevation: 0,
                  ),
                  onPressed: _saving ? null : _save,
                  child: _saving
                      ? const SizedBox(
                          height: 20, width: 20,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : const Text('Kaydet', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  InputDecoration _inputDeco({
    required String label,
    required IconData icon,
    required bool isDark,
    required dynamic colors,
    String? hint,
    String? prefixText,
  }) {
    return InputDecoration(
      labelText: label,
      hintText: hint,
      prefixText: prefixText,
      hintStyle: TextStyle(fontSize: 13, color: colors.textSecondary),
      labelStyle: TextStyle(color: colors.textSecondary),
      prefixIcon: Icon(icon, color: const Color(0xFF7C3AED), size: 20),
      prefixStyle: TextStyle(color: colors.textPrimary, fontSize: 14, fontFamily: 'monospace'),
      filled: true,
      fillColor: isDark ? const Color(0xFF1A1A2E) : const Color(0xFFF9FAFB),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: isDark ? Colors.white24 : Colors.grey.shade300),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: isDark ? Colors.white24 : Colors.grey.shade300),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFF7C3AED), width: 2),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Colors.red),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Colors.red, width: 2),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    );
  }

  Widget _buildField({
    required TextEditingController controller,
    required String label,
    required String hint,
    required IconData icon,
    required bool isDark,
    required dynamic colors,
    bool readOnly = false,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      controller: controller,
      readOnly: readOnly,
      style: TextStyle(
        color: readOnly ? colors.textSecondary : colors.textPrimary,
        fontSize: 14,
      ),
      decoration: _inputDeco(label: label, icon: icon, isDark: isDark, colors: colors, hint: hint).copyWith(
        filled: readOnly ? true : null,
        fillColor: readOnly
            ? (isDark ? const Color(0xFF1A1A2E) : const Color(0xFFF3F4F6))
            : null,
        suffixIcon: readOnly
            ? Tooltip(
                message: 'Hesap sahibi adı Varmii hesabınızdan alınmaktadır',
                child: Icon(Icons.lock_outline, size: 16, color: colors.textSecondary),
              )
            : null,
      ),
      validator: validator,
    );
  }
}

// ─────────────────────────────────────────────────────────────
// IBAN formatter: 4'erli gruplar halinde göster (TR dahil)
// ─────────────────────────────────────────────────────────────
class _IbanFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
      TextEditingValue oldValue, TextEditingValue newValue) {
    // Sadece rakamları al (TR prefix'ini giriş alanında kullanmıyoruz, prefix text'te gösteriyoruz)
    final digits = newValue.text.replaceAll(RegExp(r'[^0-9]'), '');

    // Max 24 rakam (TR sonrası)
    final trimmed = digits.length > 24 ? digits.substring(0, 24) : digits;

    // 4'erli gruplar
    final buffer = StringBuffer();
    for (int i = 0; i < trimmed.length; i++) {
      if (i > 0 && i % 4 == 0) buffer.write(' ');
      buffer.write(trimmed[i]);
    }

    final result = buffer.toString();
    return TextEditingValue(
      text: result,
      selection: TextSelection.collapsed(offset: result.length),
    );
  }
}
