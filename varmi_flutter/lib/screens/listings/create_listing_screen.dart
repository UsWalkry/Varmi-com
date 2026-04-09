import 'package:flutter/material.dart';
import '../../utils/app_dialog.dart';
import '../../utils/formatters.dart';
import 'package:flutter/services.dart';
import 'dart:typed_data';
import 'package:image_picker/image_picker.dart';
import '../../services/listing_service.dart';
import '../../services/api_service.dart';

class CreateListingScreen extends StatefulWidget {
  const CreateListingScreen({super.key});

  @override
  State<CreateListingScreen> createState() => _CreateListingScreenState();
}

class _CreateListingScreenState extends State<CreateListingScreen> {
  final ListingService _listingService = ListingService();
  final ImagePicker _imagePicker = ImagePicker();

  final TextEditingController _titleController = TextEditingController();
  final TextEditingController _descriptionController = TextEditingController();
  final TextEditingController _budgetController = TextEditingController();

  int _step = 1;
  bool _isLoading = false;

  String _category = '';
  String _condition = 'any';
  String _deliveryType = 'both';
  String? _city;

  bool _categoryDetecting = false;
  String _aiDetectedCategory = '';

  bool _aiSuggesting = false;
  List<String> _aiTitleSuggestions = [];
  List<String> _aiDescSuggestions = [];
  List<String> _uploadedImageUrls = [];

  final List<XFile> _selectedImages = [];
  final List<Uint8List> _imageBytes = [];

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

  bool get _cityVisible => _deliveryType == 'pickup' || _deliveryType == 'both';

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    _budgetController.dispose();
    super.dispose();
  }

  String? _validateStep1() {
    if (_selectedImages.isEmpty) return 'En az 1 resim eklemelisiniz';
    return null;
  }

  String? _validateStep2() {
    if (_category.isEmpty) return 'Kategori seçiniz';
    if (_titleController.text.trim().isEmpty) return 'Başlık gereklidir';
    return null;
  }

  String? _validateStep3() {
    final b = double.tryParse(_budgetController.text);
    if (b == null || b <= 0) return 'Geçerli bir bütçe girin';
    if (_cityVisible && (_city == null || _city!.isEmpty)) return 'Şehir seçiniz';
    return null;
  }

  void _nextStep() {
    String? err;
    if (_step == 1) err = _validateStep1();
    if (_step == 2) err = _validateStep2();
    if (_step == 3) err = _validateStep3();
    if (err != null) {
      AppDialog.showWarning(context, err);
      return;
    }
    if (_step == 1 && _selectedImages.isNotEmpty) {
      _detectCategoryFromImages();
    }
    setState(() => _step++);
  }

  Future<void> _detectCategoryFromImages() async {
    setState(() => _categoryDetecting = true);
    try {
      final uploaded = await _listingService.uploadListingXFiles(_selectedImages);
      if (uploaded.isEmpty) return;
      _uploadedImageUrls = uploaded;
      final response = await apiService.post(
        '/api/ai/detect-category',
        data: {'imageUrls': uploaded},
      );
      final body = response.data;
      if (body is Map && body['success'] == true && body['category'] != null) {
        final detected = body['category'] as String;
        if (mounted) {
          setState(() {
            _category = detected;
            _aiDetectedCategory = detected;
          });
        }
      }
    } catch (_) {}
    finally {
      if (mounted) setState(() => _categoryDetecting = false);
    }
  }

  Future<void> _getAiSuggestions() async {
    setState(() => _aiSuggesting = true);
    try {
      if (_uploadedImageUrls.isEmpty && _selectedImages.isNotEmpty) {
        _uploadedImageUrls = await _listingService.uploadListingXFiles(_selectedImages);
      }
      final response = await apiService.post(
        '/api/ai/suggest',
        data: {
          'category': _category,
          'imageUrls': _uploadedImageUrls,
          'condition': _condition,
          'deliveryType': _deliveryType,
          if (_titleController.text.trim().isNotEmpty) 'title': _titleController.text.trim(),
        },
      );
      final body = response.data;
      if (body is Map && body['success'] == true) {
        final titles = (body['titles'] as List?)?.map((e) => e.toString()).toList() ?? [];
        final descs = (body['descriptions'] as List?)?.map((e) => e.toString()).toList() ?? [];
        if (mounted) {
          setState(() {
            _aiTitleSuggestions = titles;
            _aiDescSuggestions = descs;
          });
        }
      }
    } catch (_) {}
    finally {
      if (mounted) setState(() => _aiSuggesting = false);
    }
  }

  Future<void> _pickImages() async {
    try {
      final images = await _imagePicker.pickMultiImage();
      if (images.isEmpty) return;
      if (images.length + _selectedImages.length > 5) {
        if (mounted) AppDialog.showWarning(context, 'En fazla 5 resim yükleyebilirsiniz');
        return;
      }
      final bytes = await Future.wait(images.map((x) => x.readAsBytes()));
      setState(() {
        _selectedImages.addAll(images);
        _imageBytes.addAll(bytes);
      });
    } catch (e) {
      if (mounted) AppDialog.showError(context, 'Resim hatası: $e');
    }
  }

  void _removeImage(int i) => setState(() {
    _selectedImages.removeAt(i);
    _imageBytes.removeAt(i);
  });

  Future<void> _submit() async {
    setState(() => _isLoading = true);
    try {
      final rawTitle = _titleController.text.trim();
      final titleWithSuffix = rawTitle.endsWith('Var mı?') ? rawTitle : '$rawTitle Var mı?';
      await _listingService.createListingWithXFiles(
        title: titleWithSuffix,
        category: _category,
        listingCondition: _condition,
        budgetMax: double.parse(_budgetController.text),
        city: _cityVisible ? _city : null,
        deliveryType: _deliveryType,
        description: _descriptionController.text.trim().isNotEmpty
            ? _descriptionController.text.trim()
            : null,
        xFiles: _selectedImages.isNotEmpty ? _selectedImages : null,
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
        title: const Text('İlanınız Onay Bekliyor', textAlign: TextAlign.center),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.amber.shade50,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.amber.shade200),
            ),
            child: const Text(
              'İlanınız başarıyla oluşturuldu!\n\nYönetici incelemesinden geçtikten sonra yayına alınacaktır.',
              style: TextStyle(fontSize: 13),
              textAlign: TextAlign.center,
            ),
          ),
          const SizedBox(height: 10),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.blue.shade50,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.blue.shade200),
            ),
            child: const Text(
              '- Yönetici ekibimiz ilanınızı en kısa sürede inceleyecektir\n'
              '- Onaylanığında e-posta bildirimi gönderilecektir\n'
              '- İlanlarım bölümünden takip edebilirsiniz',
              style: TextStyle(fontSize: 12),
            ),
          ),
        ]),
        actions: [
          FilledButton(
            onPressed: () {
              Navigator.pop(context);
              Navigator.pop(context, true);
            },
            child: const Text('Anladım'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('İlan Ver - Adım $_step/4'),
        elevation: 0,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(4),
          child: LinearProgressIndicator(
            value: _step / 4,
            backgroundColor: Colors.grey.shade200,
          ),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(16, 20, 16, 100),
              child: AnimatedSwitcher(
                duration: const Duration(milliseconds: 250),
                child: KeyedSubtree(
                  key: ValueKey(_step),
                  child: _buildStep(),
                ),
              ),
            ),
      bottomNavigationBar: _buildBottomNav(),
    );
  }

  Widget _buildStep() {
    switch (_step) {
      case 1: return _buildStep1();
      case 2: return _buildStep2();
      case 3: return _buildStep3();
      case 4: return _buildStep4();
      default: return const SizedBox.shrink();
    }
  }

  Widget _buildStep1() {
    final count = _selectedImages.length;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Ürün Resimleri * (En az 1, en fazla 5)',
            style: TextStyle(color: Colors.grey.shade700, fontSize: 13, fontWeight: FontWeight.w500)),
        const SizedBox(height: 12),
        GestureDetector(
          onTap: count < 5 ? _pickImages : null,
          child: Container(
            height: 110,
            decoration: BoxDecoration(
              border: Border.all(
                color: count < 5 ? Colors.grey.shade400 : Colors.grey.shade200,
                width: 1.5,
              ),
              borderRadius: BorderRadius.circular(8),
              color: Colors.grey.shade50,
            ),
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.add_photo_alternate, size: 36,
                      color: count < 5 ? Colors.grey.shade400 : Colors.grey.shade300),
                  const SizedBox(height: 6),
                  Text(
                    count >= 5 ? 'Maksimum 5 resim yüklendi' : 'Resim yüklemek için tıklayın',
                    style: TextStyle(fontSize: 13,
                        color: count < 5 ? Colors.grey.shade600 : Colors.grey.shade400),
                  ),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(height: 12),
        if (count > 0)
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 3, crossAxisSpacing: 8, mainAxisSpacing: 8,
            ),
            itemCount: count,
            itemBuilder: (context, i) => Stack(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    color: Colors.grey.shade200,
                    width: double.infinity,
                    height: double.infinity,
                    child: i < _imageBytes.length
                        ? Image.memory(_imageBytes[i], fit: BoxFit.cover)
                        : const SizedBox.shrink(),
                  ),
                ),
                Positioned(
                  top: 4, right: 4,
                  child: GestureDetector(
                    onTap: () => _removeImage(i),
                    child: Container(
                      padding: const EdgeInsets.all(3),
                      decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
                      child: const Icon(Icons.close, size: 13, color: Colors.white),
                    ),
                  ),
                ),
              ],
            ),
          )
        else
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Center(
              child: Text(
                'Henüz resim yüklemediniz. En az 1 resim yüklemeniz gerekmektedir.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey.shade500, fontSize: 12),
              ),
            ),
          ),
        const SizedBox(height: 20),
        Text('Ürün Durumu',
            style: TextStyle(color: Colors.grey.shade700, fontSize: 13, fontWeight: FontWeight.w500)),
        const SizedBox(height: 6),
        Row(children: [
          _conditionItem(label: 'Fark Etmez', value: 'any'),
          _conditionItem(label: 'Sıfır', value: 'new'),
          _conditionItem(label: 'İkinci El', value: 'used'),
        ]),
        const SizedBox(height: 20),
        Text('Teslimat Tercihi *',
            style: TextStyle(color: Colors.grey.shade700, fontSize: 13, fontWeight: FontWeight.w500)),
        const SizedBox(height: 6),
        Row(children: [
          _radioItem(label: 'Fark Etmez', value: 'both'),
          _radioItem(label: 'Kargo', value: 'shipping'),
          _radioItem(label: 'Elden Teslim', value: 'pickup'),
        ]),
      ],
    );
  }

  Widget _buildStep2() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Kategori *',
                style: TextStyle(color: Colors.grey.shade700, fontSize: 13, fontWeight: FontWeight.w500)),
            if (_categoryDetecting)
              Row(mainAxisSize: MainAxisSize.min, children: [
                SizedBox(
                  width: 12, height: 12,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.purple.shade400),
                ),
                const SizedBox(width: 5),
                Text('AI tespit ediyor...', style: TextStyle(fontSize: 11, color: Colors.purple.shade600)),
              ])
            else if (_aiDetectedCategory.isNotEmpty && _category == _aiDetectedCategory)
              Row(mainAxisSize: MainAxisSize.min, children: [
                Icon(Icons.auto_awesome, size: 12, color: Colors.green.shade600),
                const SizedBox(width: 4),
                Text('AI otomatik belirledi', style: TextStyle(fontSize: 11, color: Colors.green.shade600)),
              ]),
          ],
        ),
        const SizedBox(height: 6),
        DropdownButtonFormField<String>(
          value: _category.isEmpty ? null : _category,
          decoration: InputDecoration(
            border: const OutlineInputBorder(),
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
          ),
          hint: Text(_categoryDetecting ? 'AI kategori belirliyor...' : 'Kategori seçin'),
          items: _categories.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
          onChanged: (v) => setState(() => _category = v ?? ''),
        ),
        const SizedBox(height: 14),
        TextField(
          controller: _titleController,
          maxLength: 100,
          onChanged: (_) => setState(() {}),
          decoration: InputDecoration(
            labelText: 'Ne arıyorsunuz? *',
            hintText: 'Ör: iPhone 15 Pro Max',
            border: const OutlineInputBorder(),
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
          ),
        ),
        Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Text(
            'Başlığınızın sonuna otomatik "Var mı?" eklenecektir',
            style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
          ),
        ),
        SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            onPressed: _aiSuggesting ? null : _getAiSuggestions,
            icon: _aiSuggesting
                ? SizedBox(
                    width: 14, height: 14,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.purple.shade600))
                : Icon(Icons.auto_awesome, size: 16, color: Colors.purple.shade600),
            label: Text(
              _aiSuggesting ? 'AI Öneri Alınıyor...' : 'AI Başlık Önerisi Al',
              style: TextStyle(color: Colors.purple.shade700),
            ),
            style: OutlinedButton.styleFrom(
              side: BorderSide(color: Colors.purple.shade300),
              foregroundColor: Colors.purple,
            ),
          ),
        ),
        if (_aiTitleSuggestions.isNotEmpty) ...[
          const SizedBox(height: 10),
          Text('Önerilen Başlıklar:',
              style: TextStyle(fontSize: 12, color: Colors.grey.shade600, fontWeight: FontWeight.w500)),
          const SizedBox(height: 6),
          ..._aiTitleSuggestions.map((t) => Padding(
            padding: const EdgeInsets.only(bottom: 6),
            child: InkWell(
              onTap: () => setState(() => _titleController.text = t),
              borderRadius: BorderRadius.circular(6),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.purple.shade200),
                  borderRadius: BorderRadius.circular(6),
                  color: Colors.purple.shade50,
                ),
                child: Text(t, style: TextStyle(fontSize: 13, color: Colors.purple.shade800)),
              ),
            ),
          )),
        ],
      ],
    );
  }

  Widget _conditionItem({required String label, required String value}) {
    final selected = _condition == value;
    return Expanded(
      child: InkWell(
        borderRadius: BorderRadius.circular(6),
        onTap: () => setState(() => _condition = value),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Radio<String>(
              value: value,
              groupValue: _condition,
              onChanged: (v) { if (v != null) setState(() => _condition = v); },
              materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
              visualDensity: VisualDensity.compact,
            ),
            Flexible(
              child: Text(label,
                  style: TextStyle(fontSize: 13,
                      fontWeight: selected ? FontWeight.w600 : FontWeight.normal),
                  overflow: TextOverflow.ellipsis),
            ),
          ],
        ),
      ),
    );
  }

  Widget _radioItem({required String label, required String value}) {
    final selected = _deliveryType == value;
    return Expanded(
      child: InkWell(
        borderRadius: BorderRadius.circular(6),
        onTap: () {
          setState(() {
            _deliveryType = value;
            if (value == 'shipping') _city = null;
          });
        },
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Radio<String>(
              value: value,
              groupValue: _deliveryType,
              onChanged: (v) {
                if (v == null) return;
                setState(() {
                  _deliveryType = v;
                  if (v == 'shipping') _city = null;
                });
              },
              materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
              visualDensity: VisualDensity.compact,
            ),
            Flexible(
              child: Text(label,
                  style: TextStyle(fontSize: 13,
                      fontWeight: selected ? FontWeight.w600 : FontWeight.normal),
                  overflow: TextOverflow.ellipsis),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStep3() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.purple.shade50,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.purple.shade200),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(children: [
                Icon(Icons.auto_awesome, size: 14, color: Colors.purple.shade600),
                const SizedBox(width: 6),
                Text('AI ile Açıklama Oluştur',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.purple.shade700)),
              ]),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: _aiSuggesting ? null : _getAiSuggestions,
                  icon: _aiSuggesting
                      ? const SizedBox(
                          width: 14, height: 14,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Icon(Icons.auto_awesome, size: 16),
                  label: Text(_aiSuggesting ? 'Oluşturuluyor...' : 'AI Açıklama Önerisi Al'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.purple.shade600,
                    foregroundColor: Colors.white,
                  ),
                ),
              ),
              if (_aiDescSuggestions.isNotEmpty) ...[
                const SizedBox(height: 10),
                ..._aiDescSuggestions.map((d) => Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: InkWell(
                    onTap: () => setState(() => _descriptionController.text = d),
                    borderRadius: BorderRadius.circular(6),
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        border: Border.all(color: Colors.purple.shade300),
                        borderRadius: BorderRadius.circular(6),
                        color: Colors.white,
                      ),
                      child: Text(d, style: TextStyle(fontSize: 12, color: Colors.grey.shade800)),
                    ),
                  ),
                )),
              ],
            ],
          ),
        ),
        const SizedBox(height: 14),
        TextField(
          controller: _descriptionController,
          maxLines: 4,
          decoration: InputDecoration(
            labelText: 'Açıklama',
            hintText: 'Aradığınız ürün hakkında detayları yazın...',
            border: const OutlineInputBorder(),
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
          ),
        ),
        const SizedBox(height: 14),
        TextField(
          controller: _budgetController,
          onChanged: (_) => setState(() {}),
          decoration: InputDecoration(
            labelText: 'Maksimum Bütçe (TL) *',
            hintText: '0',
            border: const OutlineInputBorder(),
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
          ),
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d+\.?\d{0,2}'))],
        ),
        const SizedBox(height: 14),
        AnimatedCrossFade(
          firstChild: DropdownButtonFormField<String>(
            value: _city,
            decoration: InputDecoration(
              labelText: 'Şehir *',
              border: const OutlineInputBorder(),
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
            ),
            hint: const Text('Şehir seçin'),
            items: _cities.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
            onChanged: (v) => setState(() => _city = v),
          ),
          secondChild: const SizedBox.shrink(),
          crossFadeState: _cityVisible ? CrossFadeState.showFirst : CrossFadeState.showSecond,
          duration: const Duration(milliseconds: 200),
        ),
      ],
    );
  }

  Widget _buildStep4() {
    final budget = double.tryParse(_budgetController.text) ?? 0;
    final condLabel = _condition == 'any' ? 'Fark Etmez' : _condition == 'new' ? 'Sıfır' : 'İkinci El';
    final delivLabel = _deliveryType == 'both' ? 'Fark Etmez' : _deliveryType == 'shipping' ? 'Kargo' : 'Elden Teslim';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.blue.shade50,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.blue.shade200),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('İlan Özeti',
                  style: TextStyle(fontWeight: FontWeight.w600, color: Colors.blue.shade900, fontSize: 14)),
              const SizedBox(height: 10),
              _summaryRow('Başlık', '${_titleController.text.trim()} Var mı?'),
              _summaryRow('Kategori', _category),
              if (_cityVisible && _city != null) _summaryRow('Şehir', _city!),
              _summaryRow('Bütçe', formatPriceShort(budget)),
              _summaryRow('Durum', condLabel),
              _summaryRow('Teslimat', delivLabel),
              _summaryRow('Resim', '${_selectedImages.length} adet'),
            ],
          ),
        ),
        if (_descriptionController.text.trim().isNotEmpty) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.blue.shade50,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.blue.shade200),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Açıklama',
                    style: TextStyle(fontWeight: FontWeight.w600, color: Colors.blue.shade900, fontSize: 14)),
                const SizedBox(height: 8),
                Text(_descriptionController.text.trim(), style: const TextStyle(fontSize: 13)),
              ],
            ),
          ),
        ],
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.amber.shade50,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.amber.shade200),
          ),
          child: const Text(
            'İlanınız admin onayından sonra yayına alınacaktır.',
            style: TextStyle(fontSize: 12, color: Colors.black87),
          ),
        ),
      ],
    );
  }

  Widget _summaryRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
          Flexible(
            child: Text(value,
                textAlign: TextAlign.end,
                style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13)),
          ),
        ],
      ),
    );
  }

  Widget _buildBottomNav() {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
        child: Row(
          children: [
            if (_step > 1) ...[
              Expanded(
                child: OutlinedButton(
                  onPressed: () => setState(() => _step--),
                  style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14)),
                  child: const Text('Geri'),
                ),
              ),
              const SizedBox(width: 12),
            ],
            Expanded(
              child: _step < 4
                  ? FilledButton(
                      onPressed: _nextStep,
                      style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14)),
                      child: const Text('İleri'),
                    )
                  : FilledButton(
                      onPressed: _isLoading ? null : _submit,
                      style: FilledButton.styleFrom(
                          backgroundColor: Colors.green,
                          padding: const EdgeInsets.symmetric(vertical: 14)),
                      child: const Text('İlan Ver'),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
