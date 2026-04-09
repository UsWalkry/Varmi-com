import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../utils/app_dialog.dart';
import '../../providers/auth_provider.dart';
import '../../services/auth_service.dart';

class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({super.key});

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  final AuthService _authService = AuthService();

  late TextEditingController _firstNameController;
  late TextEditingController _lastNameController;
  late TextEditingController _phoneController;
  late TextEditingController _cityController;
  late TextEditingController _districtController;
  late TextEditingController _addressController;

  String? _selectedGender;
  bool _isLoading = false;

  String? _normalizeGender(String? g) {
    if (g == null) return null;
    switch (g.toLowerCase()) {
      case 'male':
        return 'Erkek';
      case 'female':
        return 'Kadın';
      case 'other':
        return 'Diğer';
      case 'prefer_not_to_say':
      case 'belirtmek istemiyorum':
        return 'Belirtmek istemiyorum';
      default:
        return ['Erkek', 'Kadın', 'Diğer', 'Belirtmek istemiyorum'].contains(g) ? g : null;
    }
  }

  /// Strips +90, 0090 or leading 0 from stored phone so we keep only 10 digits
  String _stripPhonePrefix(String? raw) {
    if (raw == null || raw.isEmpty) return '';
    String s = raw.trim().replaceAll(' ', '').replaceAll('-', '');
    if (s.startsWith('+90')) s = s.substring(3);
    if (s.startsWith('0090')) s = s.substring(4);
    if (s.startsWith('0') && s.length == 11) s = s.substring(1);
    return s;
  }

  @override
  void initState() {
    super.initState();
    final user = Provider.of<AuthProvider>(context, listen: false).user!;
    _firstNameController = TextEditingController(text: user.firstName ?? '');
    _lastNameController = TextEditingController(text: user.lastName ?? '');
    _phoneController =
        TextEditingController(text: _stripPhonePrefix(user.phone));
    _cityController = TextEditingController(text: user.city ?? '');
    _districtController = TextEditingController(text: user.district ?? '');
    _addressController = TextEditingController(text: user.addressLine1 ?? '');
    _selectedGender = _normalizeGender(user.gender);
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _phoneController.dispose();
    _cityController.dispose();
    _districtController.dispose();
    _addressController.dispose();
    super.dispose();
  }

  Future<void> _saveProfile() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isLoading = true);
    try {
      final rawPhone = _phoneController.text.trim();
      final fullPhone = rawPhone.isEmpty ? null : '+90$rawPhone';

      await _authService.updateProfile(
        firstName: _firstNameController.text.trim(),
        lastName: _lastNameController.text.trim(),
        phone: fullPhone,
        city: _cityController.text.trim().isEmpty
            ? null
            : _cityController.text.trim(),
        district: _districtController.text.trim().isEmpty
            ? null
            : _districtController.text.trim(),
        addressLine1: _addressController.text.trim().isEmpty
            ? null
            : _addressController.text.trim(),
        gender: _selectedGender,
      );

      if (mounted) {
        final authProvider =
            Provider.of<AuthProvider>(context, listen: false);
        final nav = Navigator.of(context);
        await authProvider.loadUser();
        if (mounted) {
          await AppDialog.showSuccess(context, 'Profil başarıyla güncellendi');
          if (mounted) nav.pop();
        }
      }
    } catch (e) {
      if (mounted) {
        AppDialog.showError(context, AppDialog.cleanError(e));
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Kişisel Bilgilerim'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
        surfaceTintColor: Colors.white,
      ),
      backgroundColor: Colors.white,
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Ad
              TextFormField(
                controller: _firstNameController,
                textCapitalization: TextCapitalization.words,
                decoration: const InputDecoration(
                  labelText: 'Ad *',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.person_outline),
                ),
                validator: (v) =>
                    (v == null || v.trim().isEmpty) ? 'Ad gereklidir' : null,
              ),
              const SizedBox(height: 16),

              // Soyad
              TextFormField(
                controller: _lastNameController,
                textCapitalization: TextCapitalization.words,
                decoration: const InputDecoration(
                  labelText: 'Soyad *',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.person_outline),
                ),
                validator: (v) =>
                    (v == null || v.trim().isEmpty) ? 'Soyad gereklidir' : null,
              ),
              const SizedBox(height: 16),

              // Telefon (+90 prefix)
              TextFormField(
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                inputFormatters: [
                  FilteringTextInputFormatter.digitsOnly,
                  LengthLimitingTextInputFormatter(10),
                ],
                decoration: const InputDecoration(
                  labelText: 'Telefon',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.phone_outlined),
                  prefixText: '+90 ',
                  hintText: '5XX XXX XX XX',
                ),
                validator: (v) {
                  if (v == null || v.trim().isEmpty) return null; // optional
                  final digits = v.trim();
                  if (digits.length != 10) return 'Telefon 10 haneli olmalıdır';
                  if (!digits.startsWith('5')) return 'Numara 5 ile başlamalıdır';
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // İl
              TextFormField(
                controller: _cityController,
                textCapitalization: TextCapitalization.words,
                decoration: const InputDecoration(
                  labelText: 'İl',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.location_city_outlined),
                ),
              ),
              const SizedBox(height: 16),

              // İlçe
              TextFormField(
                controller: _districtController,
                textCapitalization: TextCapitalization.words,
                decoration: const InputDecoration(
                  labelText: 'İlçe',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.location_on_outlined),
                ),
              ),
              const SizedBox(height: 16),

              // Adres
              TextFormField(
                controller: _addressController,
                textCapitalization: TextCapitalization.sentences,
                maxLines: 2,
                decoration: const InputDecoration(
                  labelText: 'Adres',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.home_outlined),
                  alignLabelWithHint: true,
                ),
              ),
              const SizedBox(height: 16),

              // Cinsiyet
              DropdownButtonFormField<String>(
                initialValue: _selectedGender,
                decoration: const InputDecoration(
                  labelText: 'Cinsiyet',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.person_2_outlined),
                ),
                items: const [
                  DropdownMenuItem(value: null, child: Text('Belirtilmemiş')),
                  DropdownMenuItem(value: 'Erkek', child: Text('Erkek')),
                  DropdownMenuItem(value: 'Kadın', child: Text('Kadın')),
                  DropdownMenuItem(value: 'Diğer', child: Text('Diğer')),
                  DropdownMenuItem(value: 'Belirtmek istemiyorum', child: Text('Belirtmek istemiyorum')),
                ],
                onChanged: (v) => setState(() => _selectedGender = v),
              ),
              const SizedBox(height: 28),

              // Kaydet
              ElevatedButton(
                onPressed: _isLoading ? null : _saveProfile,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: _isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2))
                    : const Text('Kaydet', style: TextStyle(fontSize: 16)),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}