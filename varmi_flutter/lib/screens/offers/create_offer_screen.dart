import 'package:flutter/material.dart';
import '../../utils/app_dialog.dart';
import '../../utils/formatters.dart';
import 'package:flutter/services.dart';
import 'dart:typed_data';
import 'package:image_picker/image_picker.dart';
import '../../services/offer_service.dart';

class CreateOfferScreen extends StatefulWidget {
  final String listingId;
  final String listingDeliveryType; // shipping | pickup | both
  final String listingCondition;    // new | used | any
  final double listingBudgetMax;
  final String? listingTitle;
  final DateTime? listingExpiresAt;

  const CreateOfferScreen({
    super.key,
    required this.listingId,
    this.listingDeliveryType = 'both',
    this.listingCondition = 'any',
    this.listingBudgetMax = 0,
    this.listingTitle,
    this.listingExpiresAt,
  });

  @override
  State<CreateOfferScreen> createState() => _CreateOfferScreenState();
}

class _CreateOfferScreenState extends State<CreateOfferScreen> {
  final OfferService _offerService = OfferService();
  final ImagePicker _imagePicker = ImagePicker();

  // Controllers
  final TextEditingController _priceController = TextEditingController();
  final TextEditingController _quantityController =
      TextEditingController(text: '1');
  final TextEditingController _productNameController = TextEditingController();
  final TextEditingController _descriptionController = TextEditingController();
  final TextEditingController _etaDaysController =
      TextEditingController(text: '3');
  final TextEditingController _bigWController = TextEditingController();
  final TextEditingController _bigHController = TextEditingController();
  final TextEditingController _bigLController = TextEditingController();

  // Step
  int _step = 1; // 1..3
  bool _isLoading = false;

  // Step 1
  String _condition = 'used'; // new | used
  // Step 2
  String _deliveryType = 'shipping'; // shipping | pickup
  String? _selectedPackage; // 'small' | 'medium' | 'large'
  double _shippingCost = 0;
  double _shippingDesiValue = 0;
  String _shippingDesiRange = '';
  DateTime? _validUntil;

  // Images
  final List<XFile> _selectedImages = [];
  final List<Uint8List> _imageBytes = [];

  // ── Derived helpers ───────────────────────────────────────────────────────
  List<String> get _availableConditions {
    switch (widget.listingCondition) {
      case 'new':
        return ['new'];
      case 'used':
        return ['used'];
      default:
        // 'any' listings → only offer used
        return ['used'];
    }
  }

  List<String> get _availableDeliveries {
    switch (widget.listingDeliveryType) {
      case 'shipping':
        return ['shipping'];
      case 'pickup':
        return ['pickup'];
      default:
        return ['shipping', 'pickup'];
    }
  }

  double get _totalPrice {
    final p = double.tryParse(_priceController.text) ?? 0;
    return p + (_deliveryType == 'shipping' ? _shippingCost : 0);
  }

  @override
  void initState() {
    super.initState();
    // Default condition
    _condition = _availableConditions.first;
    // Default delivery type based on listing
    _deliveryType = _availableDeliveries.first;
  }

  @override
  void dispose() {
    _priceController.dispose();
    _quantityController.dispose();
    _productNameController.dispose();
    _descriptionController.dispose();
    _etaDaysController.dispose();
    _bigWController.dispose();
    _bigHController.dispose();
    _bigLController.dispose();
    super.dispose();
  }

  // ── Package selection ─────────────────────────────────────────────────────
  void _selectPackage(String pkg) {
    setState(() {
      _selectedPackage = pkg;
      if (pkg == 'small') {
        _shippingCost = 44.99;
        _shippingDesiRange = '0-1';
        _shippingDesiValue = 0;
      } else if (pkg == 'medium') {
        _shippingCost = 99.99;
        _shippingDesiRange = '6-10';
        _shippingDesiValue = 0;
      }
      // 'large' is handled separately via dimension fields
    });
  }

  void _calcLargePackage() {
    final w = double.tryParse(_bigWController.text) ?? 0;
    final h = double.tryParse(_bigHController.text) ?? 0;
    final l = double.tryParse(_bigLController.text) ?? 0;
    if (w <= 0 || h <= 0 || l <= 0) return;
    final desi = (w * h * l) / 3000;
    final cost = _desiToCost(desi);
    final range = _desiToRange(desi);
    setState(() {
      _shippingDesiValue = desi;
      _shippingDesiRange = range;
      _shippingCost = cost;
    });
  }

  double _desiToCost(double desi) {
    if (desi <= 1) return 44.99;
    if (desi <= 5) return 79.99;
    if (desi <= 10) return 99.99;
    if (desi <= 20) return 149.99;
    if (desi <= 30) return 199.99;
    return 299.99;
  }

  String _desiToRange(double desi) {
    if (desi <= 1) return '0-1';
    if (desi <= 5) return '2-5';
    if (desi <= 10) return '6-10';
    if (desi <= 20) return '11-20';
    if (desi <= 30) return '21-30';
    return '31+';
  }

  // ── Image picker ──────────────────────────────────────────────────────────
  Future<void> _pickImages() async {
    try {
      final List<XFile> images = await _imagePicker.pickMultiImage();
      if (images.isEmpty) return;
      if (images.length + _selectedImages.length > 5) {
        if (mounted) {
          AppDialog.showWarning(context, 'En fazla 5 resim');
        }
        return;
      }
      final bytes = await Future.wait(images.map((x) => x.readAsBytes()));
      setState(() {
        _selectedImages.addAll(images);
        _imageBytes.addAll(bytes);
      });
    } catch (e) {
      if (mounted) {
        AppDialog.showError(context, 'Resim yüklenemedi: ${AppDialog.cleanError(e)}');
      }
    }
  }

  void _removeImage(int i) => setState(() {
        _selectedImages.removeAt(i);
        _imageBytes.removeAt(i);
      });

  // ── Validation ─────────────────────────────────────────────────────────────
  String? _validateStep1() {
    final p = double.tryParse(_priceController.text);
    if (p == null || p <= 0) return 'Geçerli bir fiyat girin';
    final q = int.tryParse(_quantityController.text);
    if (q == null || q < 1) return 'Adet en az 1 olmalıdır';
    return null;
  }

  String? _validateStep2() {
    if (_productNameController.text.trim().isEmpty) {
      return 'Ürün adı gereklidir';
    }
    if (_deliveryType == 'shipping' && _selectedPackage == null) {
      return 'Paket boyutu seçiniz';
    }
    if (_deliveryType == 'shipping' &&
        _selectedPackage == 'large' &&
        _shippingCost == 0) {
      return 'Büyük paket için boyutları doldurun';
    }
    return null;
  }

  bool _canProceed() {
    if (_step == 1) return _validateStep1() == null;
    if (_step == 2) return _validateStep2() == null;
    return true;
  }

  void _nextStep() {
    String? err;
    if (_step == 1) err = _validateStep1();
    if (_step == 2) err = _validateStep2();
    if (err != null) {
      AppDialog.showWarning(context, err);
      return;
    }
    setState(() => _step++);
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  Future<void> _submit() async {
    setState(() => _isLoading = true);
    try {
      final qty = int.tryParse(_quantityController.text) ?? 1;
      final etaDays = int.tryParse(_etaDaysController.text) ?? 3;

      await _offerService.createOfferWithData(
        listingId: widget.listingId,
        price: double.parse(_priceController.text),
        quantity: qty,
        condition: _condition,
        productName: _productNameController.text.trim(),
        description: _descriptionController.text.trim().isNotEmpty
            ? _descriptionController.text.trim()
            : null,
        deliveryType: _deliveryType,
        shippingCost:
            _deliveryType == 'shipping' ? _shippingCost : null,
        shippingDesi: _deliveryType == 'shipping' && _shippingDesiRange.isNotEmpty
            ? _shippingDesiRange
            : null,
        etaDays: etaDays,
        validUntil: _validUntil,
        xFiles: _selectedImages.isNotEmpty ? _selectedImages : null,
      );

      if (mounted) _showSuccessDialog();
    } catch (e) {
      if (mounted) {
        AppDialog.showError(context, AppDialog.cleanError(e));
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showSuccessDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => AlertDialog(
        icon: const Icon(Icons.check_circle, size: 48, color: Colors.amber),
        title: const Text('Teklifiniz Onay Bekliyor',
            textAlign: TextAlign.center),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.amber.shade50,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.amber.shade200),
            ),
            child: const Text(
              '⏳ Teklifiniz başarıyla gönderildi!\n\nYönetici incelemesinden geçtikten sonra ilan sahibine iletilecektir.',
              style: TextStyle(fontSize: 13),
              textAlign: TextAlign.center,
            ),
          ),
        ]),
        actions: [
          FilledButton(
            onPressed: () {
              Navigator.pop(context);
              Navigator.pop(context, true);
            },
            child: const Text('Tamam'),
          ),
        ],
      ),
    );
  }

  // ── Build ─────────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Teklif Ver - Adım $_step/3'),
        elevation: 0,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(4),
          child: LinearProgressIndicator(
            value: _step / 3,
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
      case 1:
        return _buildStep1();
      case 2:
        return _buildStep2();
      case 3:
        return _buildStep3();
      default:
        return const SizedBox.shrink();
    }
  }

  // ── Step 1: Fiyat & Temel ─────────────────────────────────────────────────
  Widget _buildStep1() {
    final condLabel = {'new': 'Sıfır', 'used': 'İkinci El'}[_condition] ?? _condition;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Fiyat
        TextField(
          controller: _priceController,
          onChanged: (_) => setState(() {}),
          decoration: InputDecoration(
            labelText: 'Fiyat (₺) *',
            hintText: '0.00',
            border: const OutlineInputBorder(),
            contentPadding:
                const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
            helperText: widget.listingBudgetMax > 0
                ? 'Üst sınır: ${formatPriceShort(widget.listingBudgetMax)}'
                : null,
          ),
          keyboardType:
              const TextInputType.numberWithOptions(decimal: true),
          inputFormatters: [
            FilteringTextInputFormatter.allow(RegExp(r'^\d+\.?\d{0,2}')),
          ],
        ),
        const SizedBox(height: 14),

        // Adet
        TextField(
          controller: _quantityController,
          onChanged: (_) => setState(() {}),
          decoration: const InputDecoration(
            labelText: 'Adet *',
            hintText: '1',
            border: OutlineInputBorder(),
            contentPadding:
                EdgeInsets.symmetric(horizontal: 12, vertical: 14),
            helperText: '1 adet tekliflere öncelik verilmektedir',
          ),
          keyboardType: TextInputType.number,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
        ),
        const SizedBox(height: 16),

        // Ürün Durumu (filtered)
        if (_availableConditions.length == 1) ...[
          InputDecorator(
            decoration: const InputDecoration(
              labelText: 'Ürün Durumu',
              border: OutlineInputBorder(),
              contentPadding:
                  EdgeInsets.symmetric(horizontal: 12, vertical: 14),
            ),
            child: Text(
                {'new': 'Sıfır', 'used': 'İkinci El'}[_availableConditions.first] ??
                    _availableConditions.first),
          ),
        ] else
          DropdownButtonFormField<String>(
            value: _condition,
            decoration: const InputDecoration(
              labelText: 'Ürün Durumu *',
              border: OutlineInputBorder(),
              contentPadding:
                  EdgeInsets.symmetric(horizontal: 12, vertical: 14),
            ),
            items: _availableConditions
                .map((c) => DropdownMenuItem(
                    value: c,
                    child: Text({'new': 'Sıfır', 'used': 'İkinci El'}[c] ?? c)))
                .toList(),
            onChanged: (v) => setState(() => _condition = v ?? 'used'),
          ),
      ],
    );
  }

  // ── Step 2: Detaylar ──────────────────────────────────────────────────────
  Widget _buildStep2() {
    final showKargo = _deliveryType == 'shipping';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Ürün Adı
        TextField(
          controller: _productNameController,
          onChanged: (_) => setState(() {}),
          decoration: const InputDecoration(
            labelText: 'Ürün Adı *',
            border: OutlineInputBorder(),
            contentPadding:
                EdgeInsets.symmetric(horizontal: 12, vertical: 14),
          ),
        ),
        const SizedBox(height: 14),

        // Ürün Görselleri (optional)
        Text('Ürün Görselleri (isteğe bağlı)',
            style: TextStyle(color: Colors.grey.shade700, fontSize: 13)),
        const SizedBox(height: 8),
        _buildImageSection(),
        const SizedBox(height: 14),

        // Açıklama
        TextField(
          controller: _descriptionController,
          maxLines: 3,
          decoration: const InputDecoration(
            labelText: 'Ürün Açıklaması',
            hintText: 'Ürün hakkında detayları yazın...',
            border: OutlineInputBorder(),
            contentPadding:
                EdgeInsets.symmetric(horizontal: 12, vertical: 14),
          ),
        ),
        const SizedBox(height: 14),

        // Teslimat Şekli
        if (_availableDeliveries.length == 1) ...[
          InputDecorator(
            decoration: const InputDecoration(
              labelText: 'Teslimat Şekli',
              border: OutlineInputBorder(),
              contentPadding:
                  EdgeInsets.symmetric(horizontal: 12, vertical: 14),
            ),
            child: Text({
              'shipping': 'Kargo',
              'pickup': 'Elden Teslim'
            }[_availableDeliveries.first] ?? _availableDeliveries.first),
          ),
        ] else
          DropdownButtonFormField<String>(
            value: _deliveryType,
            decoration: const InputDecoration(
              labelText: 'Teslimat Şekli *',
              border: OutlineInputBorder(),
              contentPadding:
                  EdgeInsets.symmetric(horizontal: 12, vertical: 14),
            ),
            items: _availableDeliveries
                .map((d) => DropdownMenuItem(
                    value: d,
                    child: Text(
                        {'shipping': 'Kargo', 'pickup': 'Elden Teslim'}[d] ?? d)))
                .toList(),
            onChanged: (v) => setState(() {
              _deliveryType = v ?? 'shipping';
              _selectedPackage = null;
              _shippingCost = 0;
            }),
          ),
        const SizedBox(height: 14),

        // Package selection (kargo only)
        if (showKargo) ...[
          Text('Paket Boyutu *',
              style: TextStyle(color: Colors.grey.shade700, fontSize: 13)),
          const SizedBox(height: 8),
          _buildPackageCards(),
          const SizedBox(height: 8),

          // Large package dimensions
          if (_selectedPackage == 'large') ...[
            Text('Boyutlar (cm)',
                style:
                    TextStyle(color: Colors.grey.shade600, fontSize: 12)),
            const SizedBox(height: 6),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _bigWController,
                    onChanged: (_) {
                      setState(() {});
                      _calcLargePackage();
                    },
                    decoration: const InputDecoration(
                      labelText: 'En',
                      border: OutlineInputBorder(),
                      contentPadding: EdgeInsets.symmetric(
                          horizontal: 10, vertical: 12),
                    ),
                    keyboardType:
                        const TextInputType.numberWithOptions(decimal: true),
                    inputFormatters: [
                      FilteringTextInputFormatter.allow(
                          RegExp(r'^\d+\.?\d{0,1}'))
                    ],
                  ),
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: TextField(
                    controller: _bigHController,
                    onChanged: (_) {
                      setState(() {});
                      _calcLargePackage();
                    },
                    decoration: const InputDecoration(
                      labelText: 'Boy',
                      border: OutlineInputBorder(),
                      contentPadding: EdgeInsets.symmetric(
                          horizontal: 10, vertical: 12),
                    ),
                    keyboardType:
                        const TextInputType.numberWithOptions(decimal: true),
                    inputFormatters: [
                      FilteringTextInputFormatter.allow(
                          RegExp(r'^\d+\.?\d{0,1}'))
                    ],
                  ),
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: TextField(
                    controller: _bigLController,
                    onChanged: (_) {
                      setState(() {});
                      _calcLargePackage();
                    },
                    decoration: const InputDecoration(
                      labelText: 'Yükseklik',
                      border: OutlineInputBorder(),
                      contentPadding: EdgeInsets.symmetric(
                          horizontal: 10, vertical: 12),
                    ),
                    keyboardType:
                        const TextInputType.numberWithOptions(decimal: true),
                    inputFormatters: [
                      FilteringTextInputFormatter.allow(
                          RegExp(r'^\d+\.?\d{0,1}'))
                    ],
                  ),
                ),
              ],
            ),
            if (_shippingDesiValue > 0)
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Text(
                  'Hesaplanan desi: ${_shippingDesiValue.toStringAsFixed(2)} (${_shippingDesiRange} desi)',
                  style: TextStyle(
                      fontSize: 11, color: Colors.grey.shade600),
                ),
              ),
            const SizedBox(height: 8),
          ],

          // Kargo ücreti (read-only)
          InputDecorator(
            decoration: const InputDecoration(
              labelText: 'Kargo Ücreti',
              border: OutlineInputBorder(),
              contentPadding:
                  EdgeInsets.symmetric(horizontal: 12, vertical: 14),
              suffixText: '₺',
            ),
            child: Text(
              _selectedPackage != null
                  ? _shippingCost.toStringAsFixed(2)
                  : 'Paket seçtikten sonra hesaplanır',
              style: TextStyle(
                  color: _selectedPackage != null
                      ? Colors.black
                      : Colors.grey.shade500),
            ),
          ),
          const SizedBox(height: 14),

          // ETA
          TextField(
            controller: _etaDaysController,
            decoration: const InputDecoration(
              labelText: 'Kargoya Teslim Süresi (gün)',
              border: OutlineInputBorder(),
              contentPadding:
                  EdgeInsets.symmetric(horizontal: 12, vertical: 14),
            ),
            keyboardType: TextInputType.number,
            inputFormatters: [
              FilteringTextInputFormatter.digitsOnly
            ],
          ),
          const SizedBox(height: 14),
        ],

        // Geçerlilik tarihi
        GestureDetector(
          onTap: _pickValidUntil,
          child: InputDecorator(
            decoration: const InputDecoration(
              labelText: 'Geçerlilik Tarihi',
              border: OutlineInputBorder(),
              contentPadding:
                  EdgeInsets.symmetric(horizontal: 12, vertical: 14),
              suffixIcon: Icon(Icons.calendar_today, size: 18),
            ),
            child: Text(
              _validUntil != null
                  ? '${_validUntil!.day.toString().padLeft(2, '0')}.${_validUntil!.month.toString().padLeft(2, '0')}.${_validUntil!.year}'
                  : 'Tarih seçin (isteğe bağlı)',
              style: TextStyle(
                  color: _validUntil != null
                      ? Colors.black
                      : Colors.grey.shade500),
            ),
          ),
        ),
      ],
    );
  }

  Future<void> _pickValidUntil() async {
    final now = DateTime.now();
    final maxDate = widget.listingExpiresAt ?? now.add(const Duration(days: 365));
    final picked = await showDatePicker(
      context: context,
      initialDate: now.add(const Duration(days: 1)),
      firstDate: now.add(const Duration(days: 1)),
      lastDate: maxDate,
    );
    if (picked != null) setState(() => _validUntil = picked);
  }

  Widget _buildImageSection() {
    final count = _selectedImages.length;
    return Column(
      children: [
        GestureDetector(
          onTap: count < 5 ? _pickImages : null,
          child: Container(
            height: 80,
            decoration: BoxDecoration(
              border: Border.all(
                  color: count < 5
                      ? Colors.grey.shade400
                      : Colors.grey.shade200,
                  width: 1.5),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.add_photo_alternate,
                      size: 28,
                      color: count < 5
                          ? Colors.grey.shade400
                          : Colors.grey.shade300),
                  const SizedBox(height: 4),
                  Text(
                    count >= 5
                        ? 'Maks. 5 resim'
                        : 'Resim ekle (isteğe bağlı)',
                    style: TextStyle(
                        fontSize: 12,
                        color: count < 5
                            ? Colors.grey.shade600
                            : Colors.grey.shade400),
                  ),
                ],
              ),
            ),
          ),
        ),
        if (count > 0) ...[
          const SizedBox(height: 8),
          SizedBox(
            height: 70,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: count,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (context, i) => Stack(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: i < _imageBytes.length
                        ? Image.memory(_imageBytes[i],
                            width: 70, height: 70, fit: BoxFit.cover)
                        : const SizedBox(width: 70, height: 70),
                  ),
                  Positioned(
                    top: 2,
                    right: 2,
                    child: GestureDetector(
                      onTap: () => _removeImage(i),
                      child: Container(
                        padding: const EdgeInsets.all(2),
                        decoration: const BoxDecoration(
                            color: Colors.red, shape: BoxShape.circle),
                        child: const Icon(Icons.close,
                            size: 11, color: Colors.white),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildPackageCards() {
    return Row(
      children: [
        _PackageCard(
          selected: _selectedPackage == 'small',
          icon: Icons.inventory_2,
          title: 'Küçük',
          subtitle: '0-1 desi',
          price: '44,99 ₺',
          onTap: () => _selectPackage('small'),
        ),
        const SizedBox(width: 8),
        _PackageCard(
          selected: _selectedPackage == 'medium',
          icon: Icons.inventory_2,
          title: 'Orta',
          subtitle: '6-10 desi',
          price: '99,99 ₺',
          onTap: () => _selectPackage('medium'),
        ),
        const SizedBox(width: 8),
        _PackageCard(
          selected: _selectedPackage == 'large',
          icon: Icons.inventory_2,
          title: 'Büyük',
          subtitle: 'Boyuta göre',
          price: 'Hesapla',
          onTap: () => setState(() {
            _selectedPackage = 'large';
            _shippingCost = 0;
            _shippingDesiRange = '';
            _shippingDesiValue = 0;
          }),
        ),
      ],
    );
  }

  // ── Step 3: Önizleme ──────────────────────────────────────────────────────
  Widget _buildStep3() {
    final price = double.tryParse(_priceController.text) ?? 0;
    final qty = int.tryParse(_quantityController.text) ?? 1;
    final etaDays = int.tryParse(_etaDaysController.text) ?? 3;
    final condLabel = {'new': 'Sıfır', 'used': 'İkinci El'}[_condition] ?? _condition;
    final delivLabel = {'shipping': 'Kargo', 'pickup': 'Elden Teslim'}[_deliveryType] ?? _deliveryType;
    final pkgLabel = {
      'small': 'Küçük Paket (44,99 ₺)',
      'medium': 'Orta Paket (99,99 ₺)',
      'large': 'Büyük Paket'
    }[_selectedPackage ?? ''];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [Colors.blue.shade700, Colors.blue.shade500],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Teklif Önizlemesi',
                  style: TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.w600)),
              const SizedBox(height: 4),
              Text(
                _productNameController.text.trim(),
                style: TextStyle(
                    color: Colors.white.withOpacity(0.9), fontSize: 20,
                    fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Ürün Fiyatı',
                          style: TextStyle(
                              color: Colors.white70, fontSize: 11)),
                      Text(formatPriceShort(price),
                          style: const TextStyle(
                              color: Colors.white,
                              fontSize: 18,
                              fontWeight: FontWeight.bold)),
                    ],
                  ),
                  if (_deliveryType == 'shipping' && _shippingCost > 0)
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Kargo',
                            style: TextStyle(
                                color: Colors.white70, fontSize: 11)),
                        Text(formatPriceShort(_shippingCost),
                            style: const TextStyle(
                                color: Colors.white,
                                fontSize: 14)),
                      ],
                    ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text('Toplam',
                          style: TextStyle(
                              color: Colors.white70, fontSize: 11)),
                      Text(formatPriceShort(_totalPrice),
                          style: const TextStyle(
                              color: Colors.white,
                              fontSize: 22,
                              fontWeight: FontWeight.bold)),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),

        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.grey.shade50,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.grey.shade200),
          ),
          child: Column(
            children: [
              _PreviewRow('Ürün Adı', _productNameController.text.trim()),
              _PreviewRow('Fiyat', formatPriceShort(price)),
              _PreviewRow('Adet', '$qty adet'),
              _PreviewRow('Durum', condLabel),
              _PreviewRow('Teslimat', delivLabel),
              if (_deliveryType == 'shipping' && pkgLabel != null)
                _PreviewRow('Paket', pkgLabel),
              if (_deliveryType == 'shipping' && _shippingCost > 0)
                _PreviewRow('Kargo', formatPriceShort(_shippingCost)),
              if (_deliveryType == 'shipping')
                _PreviewRow('Teslim Süresi', '$etaDays gün'),
              if (_validUntil != null)
                _PreviewRow('Geçerlilik',
                    '${_validUntil!.day.toString().padLeft(2,'0')}.${_validUntil!.month.toString().padLeft(2,'0')}.${_validUntil!.year}'),
              if (_descriptionController.text.trim().isNotEmpty)
                _PreviewRow('Açıklama',
                    _descriptionController.text.trim(),
                    multiLine: true),
              if (_selectedImages.isNotEmpty)
                _PreviewRow(
                    'Görseller', '${_selectedImages.length} adet'),
            ],
          ),
        ),
        const SizedBox(height: 10),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.amber.shade50,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.amber.shade200),
          ),
          child: const Text(
            'ℹ️ Teklifiniz admin onayından sonra ilan sahibine iletilecektir.',
            style: TextStyle(fontSize: 12),
          ),
        ),
      ],
    );
  }

  // ── Bottom nav ──────────────────────────────────────────────────────
  Widget _buildBottomNav() {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
        child: Row(
          children: [
            if (_step > 1)
              Expanded(
                child: OutlinedButton(
                  onPressed: () => setState(() => _step--),
                  style: OutlinedButton.styleFrom(
                      padding:
                          const EdgeInsets.symmetric(vertical: 14)),
                  child: const Text('Geri'),
                ),
              ),
            if (_step > 1) const SizedBox(width: 12),
            Expanded(
              child: _step < 3
                  ? FilledButton(
                      onPressed: _canProceed() ? _nextStep : null,
                      style: FilledButton.styleFrom(
                          padding:
                              const EdgeInsets.symmetric(vertical: 14)),
                      child: const Text('İleri'),
                    )
                  : FilledButton(
                      onPressed: _isLoading ? null : _submit,
                      style: FilledButton.styleFrom(
                          backgroundColor: Colors.green,
                          padding:
                              const EdgeInsets.symmetric(vertical: 14)),
                      child: const Text('Teklifi Gönder'),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

//  Package Card 
class _PackageCard extends StatelessWidget {
  final bool selected;
  final IconData icon;
  final String title;
  final String subtitle;
  final String price;
  final VoidCallback onTap;

  const _PackageCard({
    required this.selected,
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.price,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
          decoration: BoxDecoration(
            border: Border.all(
                color: selected
                    ? Theme.of(context).colorScheme.primary
                    : Colors.grey.shade300,
                width: selected ? 2 : 1),
            borderRadius: BorderRadius.circular(8),
            color: selected
                ? Theme.of(context).colorScheme.primary.withOpacity(0.05)
                : null,
          ),
          child: Column(
            children: [
              Icon(icon,
                  size: 22,
                  color: selected
                      ? Theme.of(context).colorScheme.primary
                      : Colors.grey.shade600),
              const SizedBox(height: 4),
              Text(title,
                  style: TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                      color: selected
                          ? Theme.of(context).colorScheme.primary
                          : null)),
              Text(subtitle,
                  style: TextStyle(
                      fontSize: 10, color: Colors.grey.shade500),
                  textAlign: TextAlign.center),
              const SizedBox(height: 4),
              Text(price,
                  style: const TextStyle(
                      fontSize: 11, fontWeight: FontWeight.bold)),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Preview Row ───────────────────────────────────────────────────────────────
class _PreviewRow extends StatelessWidget {
  final String label;
  final String value;
  final bool multiLine;
  const _PreviewRow(this.label, this.value, {this.multiLine = false});

  @override
  Widget build(BuildContext context) {
    if (multiLine) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label,
                style: TextStyle(
                    color: Colors.grey.shade600, fontSize: 12)),
            const SizedBox(height: 2),
            Text(value, style: const TextStyle(fontSize: 13)),
            const Divider(height: 12),
          ],
        ),
      );
    }
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label,
              style: TextStyle(
                  color: Colors.grey.shade600, fontSize: 13)),
          Flexible(
            child: Text(value,
                textAlign: TextAlign.end,
                style: const TextStyle(
                    fontWeight: FontWeight.w500, fontSize: 13)),
          ),
        ],
      ),
    );
  }
}
