import 'package:flutter/material.dart';

class AppDialog {
  /// Strips "Exception: " / "DioException: " prefixes from thrown errors.
  static String cleanError(dynamic e) {
    return e
        .toString()
        .replaceAll('Exception: ', '')
        .replaceAll('DioException: ', '');
  }

  // Hata dialog (kırmızı)
  static Future<void> showError(BuildContext context, String message) {
    return _show(
      context: context,
      icon: Icons.error_outline_rounded,
      iconColor: const Color(0xFFDC2626),
      iconBg: const Color(0xFFFEE2E2),
      title: 'Hata',
      message: message,
      buttonColor: const Color(0xFFDC2626),
    );
  }

  // Uyarı dialog (turuncu)
  static Future<void> showWarning(BuildContext context, String message) {
    return _show(
      context: context,
      icon: Icons.warning_amber_rounded,
      iconColor: const Color(0xFFD97706),
      iconBg: const Color(0xFFFEF3C7),
      title: 'Uyarı',
      message: message,
      buttonColor: const Color(0xFFD97706),
    );
  }

  // Başarı dialog (yeşil)
  static Future<void> showSuccess(BuildContext context, String message) {
    return _show(
      context: context,
      icon: Icons.check_circle_outline_rounded,
      iconColor: const Color(0xFF059669),
      iconBg: const Color(0xFFD1FAE5),
      title: 'Başarılı',
      message: message,
      buttonColor: const Color(0xFF059669),
    );
  }

  // Bilgi dialog (mor)
  static Future<void> showInfo(BuildContext context, String message) {
    return _show(
      context: context,
      icon: Icons.info_outline_rounded,
      iconColor: const Color(0xFF7C3AED),
      iconBg: const Color(0xFFEDE9FE),
      title: 'Bilgi',
      message: message,
      buttonColor: const Color(0xFF7C3AED),
    );
  }

  static Future<void> _show({
    required BuildContext context,
    required IconData icon,
    required Color iconColor,
    required Color iconBg,
    required String title,
    required String message,
    required Color buttonColor,
  }) {
    return showDialog<void>(
      context: context,
      barrierDismissible: true,
      builder: (ctx) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        elevation: 0,
        backgroundColor: Colors.transparent,
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.12),
                blurRadius: 24,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // İkon
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(color: iconBg, shape: BoxShape.circle),
                child: Icon(icon, color: iconColor, size: 32),
              ),
              const SizedBox(height: 16),
              // Başlık
              Text(
                title,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.black87,
                ),
              ),
              const SizedBox(height: 10),
              // Mesaj
              Text(
                message,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey[600],
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 24),
              // Tamam butonu
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => Navigator.pop(ctx),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: buttonColor,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12)),
                    elevation: 0,
                  ),
                  child: const Text('Tamam',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}