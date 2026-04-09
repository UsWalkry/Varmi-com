import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import '../../config/api_config.dart';
import '../../models/listing.dart';
import '../../services/listing_service.dart';
import '../../utils/app_dialog.dart';

class EditListingScreen extends StatefulWidget {
  final Listing listing;

  const EditListingScreen({super.key, required this.listing});

  @override
  State<EditListingScreen> createState() => _EditListingScreenState();
}

class _EditListingScreenState extends State<EditListingScreen> {
  final ListingService _listingService = ListingService();
  bool _isLoading = false;

  late final TextEditingController _titleController;
  late final TextEditingController _descriptionController;
  late final TextEditingController _budgetController;

  late String _category;
  late String _condition;   // any | new | used
  late String _deliveryType; // both | shipping | pickup
  String? _city;

  // Image editing state
  late List<String> _existingImageUrls; // kept existing images
  final List<XFile> _newImages = [];    // newly picked, not yet uploaded
  final List<Uint8List> _newImageBytes = []; // preview bytes for new images
  static const int _maxImages = 5;

  static const List<String> _categories = [
    // Elektronik
    'Bilgisayar / Tablet', 'Bilgisayar Parçaları', 'Ağ - Modem - Akıllı Ev', 'Çevre Birimleri',
    'Yazılım Ürünleri', 'Bilgisayar Aksesuarları', 'Kulaklık', 'Monitör',
    'Yazıcılar & Projeksiyon', 'Telefon & Aksesuar', 'TV & Ses Sistemleri',
    'Beyaz Eşya', 'Klima & Isıtıcı', 'Elektrikli Ev Aletleri', 'Foto & Kamera', 'Oyun & Konsol',
    // Moda
    'Kadın Giyim', 'Erkek Giyim', 'Ayakkabı & Çanta', 'Çocuk Giyim',
    // Ev, Yaşam, Kırtasiye
    'Mutfak & Sofra', 'Mobilya', 'Ev Tekstil', 'Ofis & Kırtasiye',
    // Oto, Bahçe, Yapı
    'Yapı Market', 'El Aletleri', 'Güvenlik', 'Bahçe', 'Elektrik & Tesisat',
    'Oto Aksesuar', 'Motor Ürünleri', 'Yedek Parça',
    // Anne, Bebek, Oyuncak
    'Oyuncak', 'Bebek Arabası', 'Mama', 'Bebek Odası', 'Bez & Islak Mendil', 'Bebek Giyim',
    // Spor & Outdoor
    'Spor Giyim', 'Fitness', 'Kamp', 'Scooter / Paten', 'Bisiklet', 'Su Sporları', 'Avcılık',
    // Kozmetik
    'Parfüm', 'Makyaj', 'Cilt Bakım', 'Saç Bakım', 'Ağız Bakım', 'Epilasyon', 'Deodorant',
    // Süpermarket & Petshop
    'Temizlik Ürünleri', 'Gıda', 'İçecek', 'Petshop', 'Ev Tüketim',
    // Kitap, Müzik, Hobi
    'Kitap', 'Müzik Enstrümanları', 'Film', 'Hobi', 'Dijital Ürünler',
  ];

  static const List<String> _cities = [
    'İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya',
    'Adana', 'Konya', 'Şanlıurfa', 'Gaziantep', 'Kayseri',
  ];

  bool get _cityVisible =>
      _deliveryType == 'pickup' || _deliveryType == 'both';

  @override
  void initState() {
    super.initState();
    final l = widget.listing;

    // Strip "Var mı?" suffix for display
    final rawTitle = l.title.endsWith(' Var mı?')
        ? l.title.substring(0, l.title.length - 8)
        : l.title;

    _titleController = TextEditingController(text: rawTitle);
    _descriptionController = TextEditingController(text: l.description ?? '');
    _budgetController = TextEditingController(text: l.budgetMax.toInt().toString());

    _category = _categories.contains(l.category) ? l.category : _categories.first;
    _condition = l.listingCondition;
    _deliveryType = l.deliveryType;
    _city = l.city;
    _existingImageUrls = List<String>.from(l.images);
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _budgetController.dispose();
    super.dispose();
  }

  // ── Validation ──────────────────────────────────────────────────────────────
  String? _validate() {
    if (_titleController.text.trim().isEmpty) return 'Başlık gereklidir';
    if (_category.isEmpty) return 'Kategori seçiniz';
    if (_cityVisible && (_city == null || _city!.isEmpty)) return 'Şehir seçiniz';
    final b = double.tryParse(_budgetController.text);
    if (b == null || b <= 0) return 'Geçerli bir bütçe girin';
    return null;
  }

  // ── Image Picking ────────────────────────────────────────────────────────────
  Future<void> _pickImages() async {
    final totalCurrent = _existingImageUrls.length + _newImages.length;
    final remaining = _maxImages - totalCurrent;
    if (remaining <= 0) return;

    final picker = ImagePicker();
    final picked = await picker.pickMultiImage(imageQuality: 85, limit: remaining);
    if (picked.isEmpty) return;

    final limited = picked.take(remaining).toList();
    final bytes = await Future.wait(limited.map((f) => f.readAsBytes()));
    setState(() {
      _newImages.addAll(limited);
      _newImageBytes.addAll(bytes);
    });
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  Future<void> _submit() async {
    final err = _validate();
    if (err != null) {
      AppDialog.showWarning(context, err);
      return;
    }

    setState(() => _isLoading = true);
    try {
      final rawTitle = _titleController.text.trim();
      final titleWithSuffix =
          rawTitle.endsWith('Var mı?') ? rawTitle : '$rawTitle Var mı?';

      // Upload any new images first
      List<String> newUrls = [];
      if (_newImages.isNotEmpty) {
        newUrls = await _listingService.uploadListingXFiles(_newImages);
      }
      final allImages = [..._existingImageUrls, ...newUrls];

      await _listingService.updateListing(
        widget.listing.id,
        title: titleWithSuffix,
        category: _category,
        listingCondition: _condition,
        budgetMax: double.parse(_budgetController.text),
        deliveryType: _deliveryType,
        city: _cityVisible ? _city : null,
        description: _descriptionController.text.trim().isNotEmpty
            ? _descriptionController.text.trim()
            : null,
        images: allImages,
      );

      if (mounted) _showSuccessDialog();
    } catch (e) {
      if (mounted) AppDialog.showError(context, 'Hata: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showSuccessDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => AlertDialog(
        icon: const Icon(Icons.access_time, size: 48, color: Colors.amber),
        title: const Text('İlanınız Güncellendi', textAlign: TextAlign.center),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.amber.shade50,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.amber.shade200),
            ),
            child: const Text(
              '✅ İlanınız başarıyla güncellendi!\n\n'
              'Yönetici incelemesinden geçtikten sonra tekrar yayına alınacaktır.',
              style: TextStyle(fontSize: 13),
              textAlign: TextAlign.center,
            ),
          ),
        ]),
        actions: [
          FilledButton(
            onPressed: () {
              Navigator.pop(context); // close dialog
              Navigator.pop(context, true); // close screen, return true
            },
            child: const Text('Anladım'),
          ),
        ],
      ),
    );
  }

  // ── Build ────────────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('İlanı Düzenle'),
        elevation: 0,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(16, 20, 16, 100),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Info banner
                  Container(
                    padding: const EdgeInsets.all(12),
                    margin: const EdgeInsets.only(bottom: 20),
                    decoration: BoxDecoration(
                      color: Colors.blue.shade50,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.blue.shade200),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.info_outline, color: Colors.blue.shade700, size: 16),
                        const SizedBox(width: 8),
                        const Expanded(
                          child: Text(
                            'Güncelleme sonrası ilanınız tekrar onay sürecine girecektir.',
                            style: TextStyle(fontSize: 12),
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Başlık
                  _sectionLabel('İlan Başlığı'),
                  TextField(
                    controller: _titleController,
                    decoration: _inputDecor('Örn: iPhone 14 Pro').copyWith(
                      suffixText: 'Var mı?',
                      suffixStyle: TextStyle(color: Theme.of(context).primaryColor),
                    ),
                    textCapitalization: TextCapitalization.sentences,
                  ),
                  const SizedBox(height: 16),

                  // Kategori
                  _sectionLabel('Kategori'),
                  DropdownButtonFormField<String>(
                    value: _category,
                    decoration: _inputDecor('Kategori seçin'),
                    isExpanded: true,
                    items: _categories
                        .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                        .toList(),
                    onChanged: (v) => setState(() => _category = v!),
                  ),
                  const SizedBox(height: 16),

                  // Ürün Durumu
                  _sectionLabel('Aranan Ürün Durumu'),
                  _segmentedRow(
                    options: const [
                      ('any', 'Farketmez'),
                      ('new', 'Sıfır'),
                      ('used', 'İkinci El'),
                    ],
                    selected: _condition,
                    onSelect: (v) => setState(() => _condition = v),
                  ),
                  const SizedBox(height: 16),

                  // Teslimat
                  _sectionLabel('Teslimat Şekli'),
                  _segmentedRow(
                    options: const [
                      ('both', 'Her İkisi'),
                      ('shipping', 'Kargo'),
                      ('pickup', 'Elden Teslim'),
                    ],
                    selected: _deliveryType,
                    onSelect: (v) => setState(() => _deliveryType = v),
                  ),
                  const SizedBox(height: 16),

                  // Şehir (conditional)
                  if (_cityVisible) ...[
                    _sectionLabel('Şehir'),
                    DropdownButtonFormField<String>(
                      value: _cities.contains(_city) ? _city : null,
                      decoration: _inputDecor('Şehir seçin'),
                      isExpanded: true,
                      items: _cities
                          .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                          .toList(),
                      onChanged: (v) => setState(() => _city = v),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Bütçe
                  _sectionLabel('Maksimum Bütçe (₺)'),
                  TextField(
                    controller: _budgetController,
                    keyboardType: TextInputType.number,
                    inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                    decoration: _inputDecor('Örn: 5000'),
                  ),
                  const SizedBox(height: 16),

                  // Açıklama
                  _sectionLabel('Açıklama (isteğe bağlı)'),
                  TextField(
                    controller: _descriptionController,
                    maxLines: 4,
                    decoration: _inputDecor('Ek bilgiler…'),
                    textCapitalization: TextCapitalization.sentences,
                  ),
                  const SizedBox(height: 24),

                  // Görseller
                  _sectionLabel('Görseller (max $_maxImages)'),
                  _buildImageGrid(),
                  const SizedBox(height: 32),

                  // Submit button
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      onPressed: _isLoading ? null : _submit,
                      icon: const Icon(Icons.send_outlined),
                      label: const Text('Güncelle & Onaya Gönder'),
                      style: FilledButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        textStyle: const TextStyle(
                            fontSize: 15, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  // ── Image Grid ───────────────────────────────────────────────────────────────
  Widget _buildImageGrid() {
    final totalCount = _existingImageUrls.length + _newImages.length;
    final canAdd = totalCount < _maxImages;

    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        // Existing network images
        for (int i = 0; i < _existingImageUrls.length; i++)
          _imageThumb(
            child: Image.network(
              _existingImageUrls[i].startsWith('http')
                  ? _existingImageUrls[i]
                  : '${ApiConfig.baseUrl}${_existingImageUrls[i]}',
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) =>
                  const Icon(Icons.broken_image, color: Colors.grey),
            ),
            onRemove: () => setState(() => _existingImageUrls.removeAt(i)),
          ),
        // Newly picked images (local bytes)
        for (int i = 0; i < _newImageBytes.length; i++)
          _imageThumb(
            child: Image.memory(_newImageBytes[i], fit: BoxFit.cover),
            onRemove: () => setState(() {
              _newImages.removeAt(i);
              _newImageBytes.removeAt(i);
            }),
          ),
        // Add button
        if (canAdd)
          GestureDetector(
            onTap: _pickImages,
            child: Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: Colors.grey[100],
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.grey[300]!, style: BorderStyle.solid),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.add_photo_alternate_outlined,
                      color: Theme.of(context).primaryColor, size: 28),
                  const SizedBox(height: 2),
                  Text('Ekle',
                      style: TextStyle(
                          fontSize: 11, color: Theme.of(context).primaryColor)),
                ],
              ),
            ),
          ),
      ],
    );
  }

  Widget _imageThumb({required Widget child, required VoidCallback onRemove}) {
    return SizedBox(
      width: 80,
      height: 80,
      child: Stack(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: SizedBox(width: 80, height: 80, child: child),
          ),
          Positioned(
            top: 2,
            right: 2,
            child: GestureDetector(
              onTap: onRemove,
              child: Container(
                width: 20,
                height: 20,
                decoration: const BoxDecoration(
                  color: Colors.red,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.close, size: 12, color: Colors.white),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _sectionLabel(String text) => Padding(        padding: const EdgeInsets.only(bottom: 8),
        child: Text(
          text,
          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
        ),
      );

  InputDecoration _inputDecor(String hint) => InputDecoration(
        hintText: hint,
        filled: true,
        fillColor: Colors.grey[50],
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.grey[300]!),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.grey[300]!),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide:
              BorderSide(color: Theme.of(context).primaryColor, width: 2),
        ),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      );

  Widget _segmentedRow({
    required List<(String value, String label)> options,
    required String selected,
    required void Function(String) onSelect,
  }) {
    return Row(
      children: options.map((opt) {
        final isSelected = opt.$1 == selected;
        return Expanded(
          child: GestureDetector(
            onTap: () => onSelect(opt.$1),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              margin: const EdgeInsets.symmetric(horizontal: 3),
              padding: const EdgeInsets.symmetric(vertical: 10),
              decoration: BoxDecoration(
                color: isSelected
                    ? Theme.of(context).primaryColor
                    : Colors.grey[100],
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: isSelected
                      ? Theme.of(context).primaryColor
                      : Colors.grey[300]!,
                ),
              ),
              child: Text(
                opt.$2,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: isSelected ? Colors.white : Colors.grey[700],
                ),
              ),
            ),
          ),
        );
      }).toList(),
    );
  }
}
