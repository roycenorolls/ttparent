import 'dart:convert';
import 'dart:io';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:gal/gal.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';
import 'package:webview_flutter_wkwebview/webview_flutter_wkwebview.dart';

import 'firebase_options.dart';

// Throwaway shell to check that the auth_token cookie survives an app kill.
// Point it at the web app with:
//   flutter run --dart-define=APP_URL=http://10.0.2.2:3000
const appUrl = String.fromEnvironment('APP_URL', defaultValue: 'http://10.0.2.2:3000');

// Only media from these hosts can be saved: the app itself, Cloudflare Images
// and the R2 bucket. On Android third-party iframes can reach TTShell too.
bool _isMediaUrl(Uri uri) {
  final app = Uri.parse(appUrl);
  if (uri.scheme == app.scheme && uri.host == app.host && uri.port == app.port) return true;
  return uri.scheme == 'https' && const {'imagedelivery.net', 'media.tutortime.co.id', 'kidsworld.co.id'}.contains(uri.host);
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: firebaseOptions);
  runApp(const MaterialApp(home: Shell()));
}

class Shell extends StatefulWidget {
  const Shell({super.key});

  @override
  State<Shell> createState() => _ShellState();
}

class _ShellState extends State<Shell> {
  late final controller = _createController();
  String? _pushToken;

  @override
  void initState() {
    super.initState();
    _initPush();
  }

  // Announcements arrive as FCM pushes; tapping one opens that post.
  Future<void> _initPush() async {
    final fm = FirebaseMessaging.instance;
    await fm.requestPermission();
    FirebaseMessaging.onMessageOpenedApp.listen(_openPush);
    final initial = await fm.getInitialMessage();
    if (initial != null) _openPush(initial);
    fm.onTokenRefresh.listen((t) { _pushToken = t; _sendPushToken(); });
    try {
      _pushToken = await fm.getToken();
      _sendPushToken();
    } catch (_) {} // no network / APNs not ready yet: onTokenRefresh retries
  }

  void _openPush(RemoteMessage m) {
    final id = m.data['update_id'];
    if (id != null) controller.loadRequest(Uri.parse('$appUrl/gallery/$id'));
  }

  // The token is saved through the web app's proxy, so it rides the parent's
  // auth cookie. Signed-out pages just get a 401; the next page load retries.
  void _sendPushToken() {
    if (_pushToken == null) return;
    controller.runJavaScript("fetch('/api/tt/parent/push-token',{method:'POST',"
        "headers:{'Content-Type':'application/json'},body:JSON.stringify({token:${jsonEncode(_pushToken)}})})");
  }

  WebViewController _createController() {
    // Inline video lets the QR camera preview play inside the page on iOS.
    final params = WebViewPlatform.instance is WebKitWebViewPlatform
        ? WebKitWebViewControllerCreationParams(allowsInlineMediaPlayback: true)
        : const PlatformWebViewControllerCreationParams();
    final c = WebViewController.fromPlatformCreationParams(params, onPermissionRequest: _onPermissionRequest)
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      // The web app's Save button posts {"url", "type"} here, since the WebView
      // can't download files itself.
      ..addJavaScriptChannel('TTShell', onMessageReceived: (m) => _save(m.message))
      // Links off the app (wa.me, tel:, …) open in their own apps; the WebView
      // can't follow them and would strand the user on an error page.
      ..setNavigationDelegate(NavigationDelegate(onPageFinished: (_) => _sendPushToken(), onNavigationRequest: (req) {
        final uri = Uri.parse(req.url);
        if (!req.isMainFrame || uri.host == Uri.parse(appUrl).host) return NavigationDecision.navigate;
        launchUrl(uri, mode: LaunchMode.externalApplication);
        return NavigationDecision.prevent;
      }));

    // Android WebView only passes navigator.geolocation through when the app
    // answers the prompt and holds the runtime permission. iOS asks by itself.
    if (c.platform is AndroidWebViewController) {
      (c.platform as AndroidWebViewController).setGeolocationPermissionsPromptCallbacks(
        onShowPrompt: (_) async => GeolocationPermissionsResponse(
          allow: await Permission.locationWhenInUse.request().isGranted,
          retain: false,
        ),
      );
    }
    return c..loadRequest(Uri.parse(appUrl));
  }

  // getUserMedia for the QR scanner. Only the camera is allowed; on Android the
  // app must also hold the runtime permission, iOS prompts by itself.
  Future<void> _onPermissionRequest(WebViewPermissionRequest req) async {
    final cameraOnly = req.types.every((t) => t == WebViewPermissionResourceType.camera);
    if (!cameraOnly || (Platform.isAndroid && !await Permission.camera.request().isGranted)) {
      return req.deny();
    }
    return req.grant();
  }

  // The web app posts {"url", "type", "action"}. Photos and videos go to the
  // photo library. A PDF is opened in the phone's own viewer ("open") or handed
  // to the share sheet, where "Save to Files" / Downloads lives ("save").
  Future<void> _save(String message) async {
    String result;
    final client = HttpClient()..connectionTimeout = const Duration(seconds: 15);
    File? file;
    try {
      final msg = jsonDecode(message) as Map<String, dynamic>;
      final type = msg['type'] as String? ?? '';
      final uri = Uri.parse(msg['url'] as String);
      final pdf = type == 'application/pdf';
      if ((!type.startsWith('image') && !type.startsWith('video') && !pdf) || !_isMediaUrl(uri)) {
        throw const FormatException('unsupported file');
      }

      if (pdf && msg['action'] == 'open') {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
        return;
      }
      if (!pdf && !await Gal.hasAccess()) await Gal.requestAccess();

      final res = await (await client.getUrl(uri)).close().timeout(const Duration(seconds: 30));
      if (res.statusCode != 200) throw HttpException('status ${res.statusCode}');

      if (type.startsWith('image')) {
        await Gal.putImageBytes(await consolidateHttpClientResponseBytes(res));
        result = 'Saved to your photos';
      } else {
        // Videos and PDFs can be large: stream to disk instead of holding them in memory.
        // The library needs a real extension: iPhone clips are video/quicktime, which is ".mov".
        final sub = type.split('/').last;
        final ext = pdf ? 'pdf' : (sub == 'quicktime' ? 'mov' : sub.replaceAll(RegExp(r'[^a-z0-9]'), ''));
        file = File('${Directory.systemTemp.path}/tt_${DateTime.now().millisecondsSinceEpoch}.$ext');
        await res.pipe(file.openWrite());
        if (pdf) {
          await Share.shareXFiles([XFile(file.path, mimeType: type)]);
          return;
        }
        await Gal.putVideo(file.path);
        result = 'Saved to your photos';
      }
    } on GalException catch (e) {
      result = e.type == GalExceptionType.accessDenied ? 'Allow photo access in Settings to save' : "Couldn't save this file (${e.type.name})";
    } catch (e) {
      result = "Couldn't save this file (${e.toString().split('\n').first})";
    } finally {
      client.close(force: true);
      if (file != null && await file.exists()) await file.delete();
    }
    if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(result)));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(body: SafeArea(child: WebViewWidget(controller: controller)));
  }
}
