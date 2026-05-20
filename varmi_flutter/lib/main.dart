import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:app_links/app_links.dart';
import 'dart:async';
import 'config/theme.dart';
import 'providers/auth_provider.dart';
import 'providers/notification_provider.dart';
import 'providers/cart_provider.dart';
import 'providers/theme_provider.dart';
import 'screens/splash_screen.dart';
import 'screens/listings/listing_detail_screen.dart';
import 'services/local_notification_service.dart';
import 'services/fcm_service.dart';

/// Uygulama genelinde Navigator erişimi için global key (deep link navigasyonu)
final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('tr_TR', null);

  // Register the background FCM handler BEFORE Firebase.initializeApp()
  registerFcmBackgroundHandler();

  try {
    await Firebase.initializeApp();
    await LocalNotificationService().initialize();
    await FcmService().initialize();
  } catch (e) {
    debugPrint('Firebase init failed (continuing without push notifications): $e');
  }

  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
    ),
  );
  runApp(const VarmiApp());
}

class VarmiApp extends StatefulWidget {
  const VarmiApp({super.key});

  @override
  State<VarmiApp> createState() => _VarmiAppState();
}

class _VarmiAppState extends State<VarmiApp> {
  late final AppLinks _appLinks;
  StreamSubscription<Uri>? _linkSubscription;

  @override
  void initState() {
    super.initState();
    _initDeepLinks();
  }

  Future<void> _initDeepLinks() async {
    _appLinks = AppLinks();

    // Uygulama kapalıyken gelen link (cold start)
    try {
      final initialLink = await _appLinks.getInitialLink();
      if (initialLink != null) {
        // Uygulama tamamen yüklenene kadar bekle
        Future.delayed(const Duration(milliseconds: 1200), () {
          _handleDeepLink(initialLink);
        });
      }
    } catch (_) {}

    // Uygulama açıkken gelen link
    _linkSubscription = _appLinks.uriLinkStream.listen(
      _handleDeepLink,
      onError: (_) {},
    );
  }

  void _handleDeepLink(Uri uri) {
    if (uri.scheme != 'varmi') return;

    final host = uri.host;           // 'listing', 'order', 'dashboard'
    final id = uri.pathSegments.isNotEmpty ? uri.pathSegments.first : null;

    if (host == 'listing' && id != null) {
      // navigatorKey.currentState kullan - context üzerinden değil,
      // bu sayede _dependents.isEmpty assertion hatası önlenir
      navigatorKey.currentState?.push(
        MaterialPageRoute(
          builder: (_) => ListingDetailScreen(listingId: id),
        ),
      );
    }
    // Sipariş ve dashboard deep link'leri ileride eklenebilir
  }

  @override
  void dispose() {
    _linkSubscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => NotificationProvider()),
        ChangeNotifierProvider(create: (_) => CartProvider()),
        ChangeNotifierProvider(create: (_) => ThemeProvider()),
      ],
      child: Consumer<ThemeProvider>(
        builder: (context, themeProvider, _) {
          return MaterialApp(
            title: 'Var mıı?',
            debugShowCheckedModeBanner: false,
            theme: AppTheme.lightTheme,
            darkTheme: AppTheme.darkTheme,
            themeMode: themeProvider.themeMode,
            navigatorKey: navigatorKey,
            home: const SplashScreen(),
            builder: (context, child) {
              return MediaQuery(
                data: MediaQuery.of(context).copyWith(textScaler: const TextScaler.linear(1.0)),
                child: child!,
              );
            },
          );
        },
      ),
    );
  }
}
