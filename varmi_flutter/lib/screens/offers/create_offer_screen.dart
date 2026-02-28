import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dart:io';
import 'package:image_picker/image_picker.dart';
import '../../services/offer_service.dart';

class CreateOfferScreen extends StatefulWidget {
  final String listingId;

  const CreateOfferScreen({
    super.key,
    required this.listingId,
  });

  @override
  State<CreateOfferScreen> createState() => _CreateOfferScreenState();
}

class _CreateOfferScreenState extends State<CreateOfferScreen> {
  final _formKey = GlobalKey<FormState>();
  final OfferService _offerService = OfferService();
  final ImagePicker _imagePicker = ImagePicker();
  
  final TextEditingController _productNameController = TextEditingController();
  final TextEditingController _amountController = TextEditingController();
  final TextEditingController _quantityController = TextEditingController();
  final TextEditingController _descriptionController = TextEditingController();
  final TextEditingController _shippingDesiController = TextEditingController();
  final TextEditingController _shippingCostController = TextEditingController();
  
  String _deliveryType = 'shipping';
  final List<File> _selectedImages = [];
  bool _isLoading = false;

  @override
  void dispose() {
    _productNameController.dispose();
    _amountController.dispose();
    _quantityController.dispose();
    _descriptionController.dispose();
    _shippingDesiController.dispose();
    _shippingCostController.dispose();
    super.dispose();
  }

  Future<void> _pickImages() async {
    try {
      final List<XFile> images = await _imagePicker.pickMultiImage();
      
      if (images.length + _selectedImages.length > 5) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('En fazla 5 resim yükleyebilirsiniz'),
              backgroundColor: Colors.orange,
            ),
          );
        }
        return;
      }

      setState(() {
        _selectedImages.addAll(images.map((xFile) => File(xFile.path)));
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Resim seçme hatası: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _removeImage(int index) {
    setState(() {
      _selectedImages.removeAt(index);
    });
  }

  Future<void> _submitOffer() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    if (_selectedImages.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('En az 1 ürün resmi eklemelisiniz'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    setState(() {
      _isLoading = true;
    });

    try {
      final offerData = {
        'listing_id': widget.listingId,
        'product_name': _productNameController.text,
        'amount': double.parse(_amountController.text),
        'quantity': int.parse(_quantityController.text),
        'delivery_type': _deliveryType,
        'description': _descriptionController.text,
      };

      if (_deliveryType == 'shipping') {
        offerData['shipping_desi'] = double.parse(_shippingDesiController.text);
        offerData['shipping_cost'] = double.parse(_shippingCostController.text);
      }

      await _offerService.createOfferWithData(
        listingId: offerData['listing_id'] as String,
        amount: offerData['amount'] as double,
        productName: offerData['product_name'] as String,
        quantity: (offerData['quantity'] as int?) ?? 1,
        deliveryType: offerData['delivery_type'] as String,
        shippingDesi: offerData['shipping_desi'] as double?,
        shippingCost: offerData['shipping_cost'] as double?,
        description: offerData['description'] as String?,
        imagePaths: _selectedImages.map((f) => f.path).toList(),
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Teklifiniz başarıyla oluşturuldu'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Hata: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Teklif Ver'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Ürün Adı
                    TextFormField(
                      controller: _productNameController,
                      decoration: const InputDecoration(
                        labelText: 'Ürün Adı',
                        border: OutlineInputBorder(),
                        prefixIcon: Icon(Icons.shopping_bag),
                      ),
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Ürün adı gereklidir';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),

                    // Fiyat
                    TextFormField(
                      controller: _amountController,
                      decoration: const InputDecoration(
                        labelText: 'Fiyat (₺)',
                        border: OutlineInputBorder(),
                        prefixIcon: Icon(Icons.attach_money),
                      ),
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      inputFormatters: [
                        FilteringTextInputFormatter.allow(RegExp(r'^\d+\.?\d{0,2}')),
                      ],
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Fiyat gereklidir';
                        }
                        final amount = double.tryParse(value);
                        if (amount == null || amount <= 0) {
                          return 'Geçerli bir fiyat girin';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),

                    // Miktar
                    TextFormField(
                      controller: _quantityController,
                      decoration: const InputDecoration(
                        labelText: 'Miktar',
                        border: OutlineInputBorder(),
                        prefixIcon: Icon(Icons.production_quantity_limits),
                      ),
                      keyboardType: TextInputType.number,
                      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Miktar gereklidir';
                        }
                        final quantity = int.tryParse(value);
                        if (quantity == null || quantity <= 0) {
                          return 'Geçerli bir miktar girin';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),

                    // Teslimat Tipi
                    DropdownButtonFormField<String>(
                      value: _deliveryType,
                      decoration: const InputDecoration(
                        labelText: 'Teslimat Tipi',
                        border: OutlineInputBorder(),
                        prefixIcon: Icon(Icons.local_shipping),
                      ),
                      items: const [
                        DropdownMenuItem(
                          value: 'shipping',
                          child: Text('Kargo'),
                        ),
                        DropdownMenuItem(
                          value: 'hand_delivery',
                          child: Text('Elden Teslim'),
                        ),
                        DropdownMenuItem(
                          value: 'both',
                          child: Text('Her İkisi'),
                        ),
                      ],
                      onChanged: (value) {
                        setState(() {
                          _deliveryType = value!;
                        });
                      },
                    ),
                    const SizedBox(height: 16),

                    // Kargo Bilgileri (sadece kargo seçiliyse)
                    if (_deliveryType == 'shipping' || _deliveryType == 'both') ...[
                      TextFormField(
                        controller: _shippingDesiController,
                        decoration: const InputDecoration(
                          labelText: 'Kargo Desi',
                          border: OutlineInputBorder(),
                          prefixIcon: Icon(Icons.scale),
                        ),
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        inputFormatters: [
                          FilteringTextInputFormatter.allow(RegExp(r'^\d+\.?\d{0,2}')),
                        ],
                        validator: (value) {
                          if (_deliveryType == 'shipping' || _deliveryType == 'both') {
                            if (value == null || value.isEmpty) {
                              return 'Kargo desi gereklidir';
                            }
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _shippingCostController,
                        decoration: const InputDecoration(
                          labelText: 'Kargo Ücreti (₺)',
                          border: OutlineInputBorder(),
                          prefixIcon: Icon(Icons.local_shipping),
                        ),
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        inputFormatters: [
                          FilteringTextInputFormatter.allow(RegExp(r'^\d+\.?\d{0,2}')),
                        ],
                        validator: (value) {
                          if (_deliveryType == 'shipping' || _deliveryType == 'both') {
                            if (value == null || value.isEmpty) {
                              return 'Kargo ücreti gereklidir';
                            }
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),
                    ],

                    // Açıklama
                    TextFormField(
                      controller: _descriptionController,
                      decoration: const InputDecoration(
                        labelText: 'Açıklama',
                        border: OutlineInputBorder(),
                        prefixIcon: Icon(Icons.description),
                      ),
                      maxLines: 4,
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Açıklama gereklidir';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),

                    // Resim Seçimi
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text(
                                  'Ürün Resimleri',
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                TextButton.icon(
                                  onPressed: _selectedImages.length < 5 ? _pickImages : null,
                                  icon: const Icon(Icons.add_photo_alternate),
                                  label: const Text('Ekle'),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Text(
                              '${_selectedImages.length}/5 resim',
                              style: TextStyle(color: Colors.grey[600]),
                            ),
                            const SizedBox(height: 16),
                            if (_selectedImages.isNotEmpty)
                              SizedBox(
                                height: 120,
                                child: ListView.builder(
                                  scrollDirection: Axis.horizontal,
                                  itemCount: _selectedImages.length,
                                  itemBuilder: (context, index) {
                                    return Stack(
                                      children: [
                                        Container(
                                          margin: const EdgeInsets.only(right: 8),
                                          width: 120,
                                          height: 120,
                                          decoration: BoxDecoration(
                                            borderRadius: BorderRadius.circular(8),
                                            image: DecorationImage(
                                              image: FileImage(_selectedImages[index]),
                                              fit: BoxFit.cover,
                                            ),
                                          ),
                                        ),
                                        Positioned(
                                          top: 4,
                                          right: 12,
                                          child: GestureDetector(
                                            onTap: () => _removeImage(index),
                                            child: Container(
                                              padding: const EdgeInsets.all(4),
                                              decoration: const BoxDecoration(
                                                color: Colors.red,
                                                shape: BoxShape.circle,
                                              ),
                                              child: const Icon(
                                                Icons.close,
                                                size: 16,
                                                color: Colors.white,
                                              ),
                                            ),
                                          ),
                                        ),
                                      ],
                                    );
                                  },
                                ),
                              )
                            else
                              Container(
                                height: 100,
                                decoration: BoxDecoration(
                                  border: Border.all(color: Colors.grey),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: const Center(
                                  child: Text('Henüz resim seçilmedi'),
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Gönder Butonu
                    ElevatedButton(
                      onPressed: _submitOffer,
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                      child: const Text(
                        'Teklif Gönder',
                        style: TextStyle(fontSize: 16),
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}
