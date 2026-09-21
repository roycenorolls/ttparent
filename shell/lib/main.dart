import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

// Throwaway shell to check that the auth_token cookie survives an app kill.
// Point it at the web app with:
//   flutter run --dart-define=APP_URL=http://10.0.2.2:3000
const appUrl = String.fromEnvironment('APP_URL', defaultValue: 'http://10.0.2.2:3000');

void main() => runApp(const MaterialApp(home: Shell()));

class Shell extends StatefulWidget {
  const Shell({super.key});

  @override
  State<Shell> createState() => _ShellState();
}

class _ShellState extends State<Shell> {
  final controller = WebViewController()
    ..setJavaScriptMode(JavaScriptMode.unrestricted)
    ..loadRequest(Uri.parse(appUrl));

  @override
  Widget build(BuildContext context) {
    return Scaffold(body: SafeArea(child: WebViewWidget(controller: controller)));
  }
}
