import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import '../../config/api_config.dart';
import '../../models/offer.dart';
import '../../services/offer_service.dart';
import '../../utils/app_dialog.dart';

class EditOfferScreen extends StatefulWidget {
  final Offer offer;

  const EditOfferScreen({super.key, required this.offer});

  @override
  State<EditOfferScreen> createState() => _EditOfferScreenState();
}

class _EditOfferScreenState extends State<EditOfferScreen> {
  final OfferService _offerService = OfferService();
  bool _isLoading = false;

  late final TextEditingController _priceController;
  late final TextEditingController _quantityController;
  late final TextEditingController _productNameController;
  late final TextEditingController _descriptionController;
  late final TextEditingController _shippingCostController;

  DateTime? _validUntil;
  bool get _isShipping => widget.offer.deliveryType == 'shipping';

  // Image editing state
  late List<String> _existingImageUrls; // kept existing (URL paths)
  final List<XFile> _newImages = [];    // newly picked, not yet uploaded
  final List<Uint8List> _newImageBytes = []; // preview bytes
  static const int _maxImages = 5;

  @override
  void initState() {
    super.initState();
    final o = widget.offer;
    _priceController = TextEditingController(text: o.amount.toInt().toString());
    _quantityController = TextEditingController(text: o.quantity.toString());
    _productNameController = TextEditingController(text: o.productName);
    _descriptionController = TextEditingController(text: o.description ?? '');
    _shippingCostController = TextEditingController(
      text: (o.shippingCost ?? 0) > 0 ? o.shippingCost!.toInt().toString() : '',
    );
    _validUntil = o.validUntil;
    // Keep only URL-based images (not base64) for display/editing
    _existingImageUrls = o.images
        .where((img) => !img.startsWith('data:') && img.length < 500)
        .toList();
  }

  @override
  void dispose() {
    _priceController.dispose();
    _quantityController.dispose();
    _productNameController.dispose();
    _descriptionController.dispose();
    _shippingCostController.dispose();
    super.dispose();
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

  // ── Validation ──────────────────────────────────────────────────────────────
  String? _validate() {
    final p = double.tryParse(_priceController.text);
    if (p == null || p <= 0) return 'Geçerli bir fiyat girin';
    if (_productNameController.text.trim().isEmpty) return 'Ürün adı gereklidir';
    final q = int.tryParse(_quantityController.text);
    if (q == null || q < 1) return 'Adet en az 1 olmalıdır';
    return null;
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
      final shippingCostText = _shippingCostController.text.trim();
      final shippingCost = shippingCostText.isNotEmpty
          ? double.tryParse(shippingCostText)
          : null;

      // Upload any new images first
      List<String> newUrls = [];
      if (_newImages.isNotEmpty) {
        newUrls = await _offerService.uploadOfferXFiles(widget.offer.id, _newImages);
      }
      final allImages = [..._existingImageUrls, ...newUrls];

      await _offerService.updateOffer(
        widget.offer.id,
        amount: double.parse(_priceController.text),
        productName: _productNameController.text.trim(),
        quantity: int.parse(_quantityController.text),
        description: _descriptionController.text.trim().isNotEmpty
            ? _descriptionController.text.trim()
            : null,
        validUntil: _validUntil,
        shippingCost: _isShipping ? shippingCost : null,
        images: allImages.isNotEmpty ? allImages : null,
      );

      if (mounted) _showSuccessDialog();
    } catch (e) {
      if (mounted) AppDialog.showError(context, AppDialog.cleanError(e));
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
        title: const Text('Teklifiniz Güncellendi', textAlign: TextAlign.center),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.amber.shade50,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.amber.shade200),
            ),
            child: const Text(
              '✅ Teklifiniz başarıyla güncellendi!\n\n'
              'Yönetici incelemesinden geçtikten sonra ilan sahibine iletilecektir.',
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
            child: const Text('Tamam'),
          ),
        ],
      ),
    );
  }

  // ── Date picker ─────────────────────────────────────────────────────────────
  Future<void> _pickValidUntil() async {
    final now = DateTime.now();
    final initial = _validUntil != null && _validUntil!.isAfter(now)
        ? _validUntil!
        : now.add(const Duration(days: 7));

    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: now.add(const Duration(days: 1)),
      lastDate: now.add(const Duration(days: 90)),
      helpText: 'Geçerlilik Tarihi Seç',
    );
    if (picked != null) {
      setState(() => _validUntil = picked);
    }
  }

  String _fmtDate(DateTime d) =>
      '${d.day.toString().padLeft(2, '0')}.${d.month.toString().padLeft(2, '0')}.${d.year}';

  // ── Build ────────────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Teklifi Düzenle'),
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
                        Icon(Icons.info_outline,
                            color: Colors.blue.shade700, size: 16),
                        const SizedBox(width: 8),
                        const Expanded(
                          child: Text(
                            'Güncelleme sonrası teklifiniz tekrar onay sürecine girecektir.',
                            style: TextStyle(fontSize: 12),
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Ürün Adı
                  _sectionLabel('Ürün Adı'),
                  TextField(
                    controller: _productNameController,
                    decoration: _inputDecor('Sattığınız ürünün adı'),
                    textCapitalization: TextCapitalization.sentences,
                  ),
                  const SizedBox(height: 16),

                  // Fiyat + Adet row
                  Row(
                    children: [
                      Expanded(
                        flex: 2,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _sectionLabel('Fiyat (₺)'),
                            TextField(
                              controller: _priceController,
                              keyboardType: TextInputType.number,
                              inputFormatters: [
                                FilteringTextInputFormatter.digitsOnly
                              ],
                              decoration: _inputDecor('0'),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _sectionLabel('Adet'),
                            TextField(
                              controller: _quantityController,
                              keyboardType: TextInputType.number,
                              inputFormatters: [
                                FilteringTextInputFormatter.digitsOnly
                              ],
                              decoration: _inputDecor('1'),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Shipping cost (only if shipping)
                  if (_isShipping) ...[
                    _sectionLabel('Kargo Ücreti (₺)'),
                    TextField(
                      controller: _shippingCostController,
                      keyboardType: TextInputType.number,
                      inputFormatters: [
                        FilteringTextInputFormatter.digitsOnly
                      ],
                      decoration: _inputDecor('Kargo ücretini girin'),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Geçerlilik tarihi
                  _sectionLabel('Geçerlilik Tarihi'),
                  GestureDetector(
                    onTap: _pickValidUntil,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 14),
                      decoration: BoxDecoration(
                        color: Colors.grey[50],
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.grey[300]!),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.calendar_today_outlined,
                              color: Colors.grey[600], size: 18),
                          const SizedBox(width: 10),
                          Text(
                            _validUntil != null
                                ? _fmtDate(_validUntil!)
                                : 'Tarih seçin (isteğe bağlı)',
                            style: TextStyle(
                              color: _validUntil != null
                                  ? Colors.black87
                                  : Colors.grey[500],
                              fontSize: 14,
                            ),
                          ),
                          const Spacer(),
                          if (_validUntil != null)
                            GestureDetector(
                              onTap: () => setState(() => _validUntil = null),
                              child: Icon(Icons.clear,
                                  color: Colors.grey[500], size: 18),
                            ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Açıklama
                  _sectionLabel('Açıklama (isteğe bağlı)'),
                  TextField(
                    controller: _descriptionController,
                    maxLines: 4,
                    decoration: _inputDecor('Ürün hakkında ek bilgiler…'),
                    textCapitalization: TextCapitalization.sentences,
                  ),
                  const SizedBox(height: 24),

                  // Görseller
                  _sectionLabel('Görseller (max $_maxImages)'),
                  _buildImageGrid(),
                  const SizedBox(height: 32),

                  // Submit Button
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      onPressed: _isLoading ? null : _submit,
                      icon: const Icon(Icons.send_outlined),
                      label: const Text('Güncelle & Yeniden Gönder'),
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
                border: Border.all(color: Colors.grey[300]!),
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

  Widget _sectionLabel(String text) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
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
}
