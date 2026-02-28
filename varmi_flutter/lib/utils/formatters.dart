import 'package:intl/intl.dart';

class Formatters {
  static final _priceFormat = NumberFormat.currency(
    locale: 'tr_TR',
    symbol: '₺',
    decimalDigits: 2,
  );

  static final _priceShortFormat = NumberFormat.currency(
    locale: 'tr_TR',
    symbol: '₺',
    decimalDigits: 0,
  );

  static String formatPrice(double price) {
    return _priceFormat.format(price);
  }

  static String formatPriceShort(double price) {
    if (price >= 1000) {
      return '₺${(price / 1000).toStringAsFixed(price % 1000 == 0 ? 0 : 1)}B';
    }
    return '₺${price.toStringAsFixed(price == price.roundToDouble() ? 0 : 2)}';
  }

  static String formatDate(String? dateString) {
    if (dateString == null || dateString.isEmpty) return '';
    try {
      final date = DateTime.parse(dateString).toLocal();
      return DateFormat('dd.MM.yyyy', 'tr_TR').format(date);
    } catch (_) {
      return '';
    }
  }

  static String formatDateTime(String? dateString) {
    if (dateString == null || dateString.isEmpty) return '';
    try {
      final date = DateTime.parse(dateString).toLocal();
      return DateFormat('dd.MM.yyyy HH:mm', 'tr_TR').format(date);
    } catch (_) {
      return '';
    }
  }

  static String timeAgo(String? dateString) {
    if (dateString == null || dateString.isEmpty) return '';
    try {
      final date = DateTime.parse(dateString).toLocal();
      final now = DateTime.now();
      final diff = now.difference(date);

      if (diff.inMinutes < 1) return 'Az önce';
      if (diff.inMinutes < 60) return '${diff.inMinutes} dakika önce';
      if (diff.inHours < 24) return '${diff.inHours} saat önce';
      if (diff.inDays < 30) return '${diff.inDays} gün önce';
      if (diff.inDays < 365) return '${(diff.inDays / 30).floor()} ay önce';
      return '${(diff.inDays / 365).floor()} yıl önce';
    } catch (_) {
      return '';
    }
  }

  static String statusToTr(String status) {
    const map = {
      'active': 'Aktif',
      'inactive': 'Pasif',
      'closed': 'Kapalı',
      'deleted': 'Silindi',
      'pending': 'Beklemede',
      'approved': 'Onaylandı',
      'rejected': 'Reddedildi',
      'expired': 'Süresi Doldu',
      'accepted': 'Kabul Edildi',
      'withdrawn': 'Geri Çekildi',
      'confirmed': 'Onaylandı',
      'preparing': 'Hazırlanıyor',
      'shipped': 'Kargoda',
      'delivered': 'Teslim Edildi',
      'completed': 'Tamamlandı',
      'cancelled': 'İptal Edildi',
      'open': 'Açık',
      'resolved': 'Çözüldü',
      'in_progress': 'İşlemde',
    };
    return map[status] ?? status;
  }

  static String conditionToTr(String condition) {
    const map = {
      'new': 'Sıfır',
      'like-new': 'Sıfır Ayarında',
      'used': '2. El',
      'good': 'İyi',
      'fair': 'Orta',
      'poor': 'Kötü',
      'any': 'Fark Etmez',
    };
    return map[condition] ?? condition;
  }

  static String deliveryToTr(String delivery) {
    const map = {
      'shipping': 'Kargo',
      'pickup': 'Elden Teslim',
      'both': 'Kargo/Elden',
    };
    return map[delivery] ?? delivery;
  }
}

// Top-level convenience wrappers
String formatPrice(double price) => Formatters.formatPrice(price);
String formatPriceShort(double price) => Formatters.formatPriceShort(price);
String formatDate(String? dateString) => Formatters.formatDate(dateString);
String formatDateTime(String? dateString) => Formatters.formatDateTime(dateString);
String timeAgo(String? dateString) => Formatters.timeAgo(dateString);
String statusToTr(String status) => Formatters.statusToTr(status);
String conditionToTr(String condition) => Formatters.conditionToTr(condition);
String deliveryToTr(String delivery) => Formatters.deliveryToTr(delivery);
