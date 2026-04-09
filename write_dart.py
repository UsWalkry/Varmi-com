import sys

dart = """\
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

  final List<XFile> _selectedImages = [];
  final List<Uint8List> _imageBytes = [];

  static const List<String> _categories = [
    'Cep Telefonu & Aksesuar', 'Laptop & Notebook', 'Tablet & iPad',
    'Elektronik & Bilgisayar', 'TV & Monit\u00f6r', 'Ses Sistemi & Kulakl\u0131k',
    'Foto\u011fraf Makinesi & Kamera', 'Gaming & Oyun Konsolu',
    'Ak\u0131ll\u0131 Saat & Wearable', 'Drone & RC Ara\u00e7lar', 'Yaz\u0131c\u0131 & Taray\u0131c\u0131',
    'Teknoloji', 'Moda & Giyim', 'Ayakkab\u0131 & \u00c7anta', 'Aksesuar & Tak\u0131',
    'Saat & G\u00f6zl\u00fck', '\u0130\u00e7 Giyim & Pijama', 'Spor Giyim & Ayakkab\u0131',
    'Ev & Ya\u015fam', 'Mobilya & Dekorasyon', 'Beyaz E\u015fya',
    'Elektrikli Ev Aletleri', 'Mutfak Aletleri', 'Klima & Is\u0131t\u0131c\u0131',
    'S\u00fcpurge & Temizlik', 'Ayd\u0131nlatma', 'Hal\u0131 & Kilim',
    'Banyo & Mutfak Gere\u00e7leri', 'Spor & Outdoor',
    'Outdoor & Kamp Malzemeleri', 'Fitness & Spor Ekipman\u0131',
    'Bisiklet & Scooter', 'Deniz & Su Sporlar\u0131', 'Kayak & K\u0131\u015f Sporlar\u0131',
    'Boks & D\u00f6v\u00fc\u015f Sporlar\u0131', 'Otomotiv', 'Oto Aksesuar & Yedek Par\u00e7a',
    'Motor & ATV', 'Ara\u00e7 \u0130\u00e7i Aksesuar', 'Bebek & \u00c7ocuk', 'Anne & Bebek',
    'Bebek Arabas\u0131 & Ta\u015f\u0131ma', 'Oyuncak & Oyun', 'E\u011fitici Oyuncaklar',
    'Sa\u011fl\u0131k & G\u00fczellik', 'Kozmetik & Ki\u015fisel Bak\u0131m', 'Parf\u00fcm & G\u00fczellik',
    'Vitamin & Takviye', 'Medikal \u00dcr\u00fcnler', 'Kitap & M\u00fczik',
    '\u0130kinci El Kitap', 'M\u00fczik Enstr\u00fcmanlar\u0131', 'Film & Dizi', 'Koleksiyon',
    'Hobi & Sanat', 'El Sanatlar\u0131 & Hobi', 'Sanat & Antika',
    'El Yap\u0131m\u0131 & Vintage', 'Bah\u00e7e & Yap\u0131 Market',
    '\u0130n\u015faat & Yap\u0131 Malzemeleri', 'Tar\u0131m & Bah\u00e7ecilik',
    'K\u0131rtasiye & Ofis', 'Supermarket & Petshop', 'Evcil Hayvan \u00dcr\u00fcnleri',
    'Yiyecek & \u0130\u00e7ecek', 'Di\u011fer',
  ];

  static const List<String> _cities = [
    '\u0130stanbul', 'Ankara', '\u0130zmir', 'Bursa', 'Antalya',
    'Adana', 'Konya', '\u015eanl\u0131urfa', 'Gaziantep', 'Kayseri',
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
    if (_category.isEmpty) return 'Kategori se\u00e7iniz';
    if (_titleController.text.trim().isEmpty) return 'Ba\u015fl\u0131k gereklidir';
    return null;
  }

  String? _validateStep3() {
    final b = double.tryParse(_budgetController.text);
    if (b == null || b <= 0) return 'Ge\u00e7erli bir b\u00fct\u00e7e girin';
    if (_cityVisible && (_city == null || _city!.isEmpty)) return '\u015eehir se\u00e7iniz';
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

  Future<void> _pickImages() async {
    try {
      final images = await _imagePicker.pickMultiImage();
      if (images.isEmpty) return;
      if (images.length + _selectedImages.length > 5) {
        if (mounted) AppDialog.showWarning(context, 'En fazla 5 resim y\u00fckleyebilirsiniz');
        return;
      }
      final bytes = await Future.wait(images.map((x) => x.readAsBytes()));
      setState(() {
        _selectedImages.addAll(images);
        _imageBytes.addAll(bytes);
      });
    } catch (e) {
      if (mounted) AppDialog.showError(context, 'Resim hatas\u0131: \$e');
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
      final titleWithSuffix = rawTitle.endsWith('Var m\u0131?') ? rawTitle : '\$rawTitle Var m\u0131?';
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
      if (mounted) AppDialog.showError(context, 'Hata: \$e');
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
        title: const Text('\u0130lan\u0131n\u0131z Onay Bekliyor', textAlign: TextAlign.center),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.amber.shade50,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.amber.shade200),
            ),
            child: const Text(
              '\u0130lan\u0131n\u0131z ba\u015far\u0131yla olu\u015fturuldu!\\n\\nY\u00f6netici incelemesinden ge\u00e7tikten sonra yay\u0131na al\u0131nacakt\u0131r.',
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
              '- Y\u00f6netici ekibimiz ilan\u0131n\u0131z\u0131 en k\u0131sa s\u00fcrede inceleyecektir\\n'
              '- Onaylan\u0131\u011f\u0131nda e-posta bildirimi g\u00f6nderilecektir\\n'
              '- \u0130lanlar\u0131m b\u00f6l\u00fcm\u00fcnden takip edebilirsiniz',
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
            child: const Text('Anlad\u0131m'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('\u0130lan Ver - Ad\u0131m \$_step/4'),
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
        Text('\u00dcr\u00fcn Resimleri * (En az 1, en fazla 5)',
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
                    count >= 5 ? 'Maksimum 5 resim y\u00fcklendi' : 'Resim y\u00fcklemek i\u00e7in t\u0131klay\u0131n',
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
                'Hen\u00fcz resim y\u00fcklemediniz. En az 1 resim y\u00fckleniz gerekmektedir.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey.shade500, fontSize: 12),
              ),
            ),
          ),
        const SizedBox(height: 20),
        Text('\u00dcr\u00fcn Durumu',
            style: TextStyle(color: Colors.grey.shade700, fontSize: 13, fontWeight: FontWeight.w500)),
        const SizedBox(height: 6),
        Row(children: [
          _conditionItem(label: 'Fark Etmez', value: 'any'),
          _conditionItem(label: 'S\u0131f\u0131r', value: 'new'),
          _conditionItem(label: '\u0130kinci El', value: 'used'),
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
          hint: Text(_categoryDetecting ? 'AI kategori belirliyor...' : 'Kategori se\u00e7in'),
          items: _categories.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
          onChanged: (v) => setState(() => _category = v ?? ''),
        ),
        const SizedBox(height: 16),
        TextField(
          controller: _titleController,
          maxLength: 100,
          onChanged: (_) => setState(() {}),
          decoration: const InputDecoration(
            labelText: 'Ne ar\u0131yorsunuz? *',
            hintText: '\u00d6r: iPhone 15 Pro Max',
            border: OutlineInputBorder(),
            contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 14),
          ),
        ),
        Padding(
          padding: const EdgeInsets.only(bottom: 4),
          child: Text(
            'Ba\u015fl\u0131\u011f\u0131n\u0131z\u0131n sonuna otomatik "Var m\u0131?" eklenecektir',
            style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
          ),
        ),
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
    final condLabel = _condition == 'new' ? 'S\u0131f\u0131r' : _condition == 'used' ? '\u0130kinci El' : 'Fark Etmez';
    final delivLabel = _deliveryType == 'shipping' ? 'Kargo' : _deliveryType == 'pickup' ? 'Elden Teslim' : 'Fark Etmez';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            color: Colors.purple.shade50,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.purple.shade200),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(Icons.auto_awesome, size: 14, color: Colors.purple.shade600),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  'A\u00e7\u0131klama alan\u0131na AI \u00f6neri almak i\u00e7in a\u015fa\u011f\u0131daki butona bas\u0131n. '
                  'AI, resimlerinize, \u00fcr\u00fcn durumuna (\$condLabel) ve teslimat tercihine (\$delivLabel) g\u00f6re a\u00e7\u0131klama olu\u015fturacak.',
                  style: TextStyle(fontSize: 12, color: Colors.purple.shade700),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        TextField(
          controller: _descriptionController,
          maxLines: 4,
          decoration: const InputDecoration(
            labelText: 'A\u00e7\u0131klama',
            hintText: 'Arad\u0131\u011f\u0131n\u0131z \u00fcr\u00fcn hakk\u0131nda detaylar\u0131 yaz\u0131n...',
            border: OutlineInputBorder(),
            contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 14),
          ),
        ),
        const SizedBox(height: 14),
        TextField(
          controller: _budgetController,
          onChanged: (_) => setState(() {}),
          decoration: const InputDecoration(
            labelText: 'Maksimum B\u00fct\u00e7e (TL) *',
            hintText: '0',
            border: OutlineInputBorder(),
            contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 14),
          ),
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'^\d+\\.?\d{0,2}'))],
        ),
        const SizedBox(height: 14),
        AnimatedCrossFade(
          firstChild: DropdownButtonFormField<String>(
            value: _city,
            decoration: const InputDecoration(
              labelText: '\u015eehir *',
              border: OutlineInputBorder(),
              contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 14),
            ),
            hint: const Text('\u015eehir se\u00e7in'),
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
    final condLabel = _condition == 'any' ? 'Fark Etmez' : _condition == 'new' ? 'S\u0131f\u0131r' : '\u0130kinci El';
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
              Text('\u0130lan \u00d6zeti',
                  style: TextStyle(fontWeight: FontWeight.w600, color: Colors.blue.shade900, fontSize: 14)),
              const SizedBox(height: 10),
              _summaryRow('Ba\u015fl\u0131k', '\${_titleController.text.trim()} Var m\u0131?'),
              _summaryRow('Kategori', _category),
              if (_cityVisible && _city != null) _summaryRow('\u015eehir', _city!),
              _summaryRow('B\u00fct\u00e7e', formatPriceShort(budget)),
              _summaryRow('Durum', condLabel),
              _summaryRow('Teslimat', delivLabel),
              _summaryRow('Resim', '\${_selectedImages.length} adet'),
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
                Text('A\u00e7\u0131klama',
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
            '\u0130lan\u0131n\u0131z admin onay\u0131ndan sonra yay\u0131na al\u0131nacakt\u0131r.',
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
                      child: const Text('\u0130leri'),
                    )
                  : FilledButton(
                      onPressed: _isLoading ? null : _submit,
                      style: FilledButton.styleFrom(
                          backgroundColor: Colors.green,
                          padding: const EdgeInsets.symmetric(vertical: 14)),
                      child: const Text('\u0130lan Ver'),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
"""

with open(
    r'C:/Users/Burak AYDIN/Desktop/Varmi-com-sql/varmi_flutter/lib/screens/listings/create_listing_screen.dart',
    'w', encoding='utf-8'
) as f:
    f.write(dart)
print('Written', len(dart), 'chars')
