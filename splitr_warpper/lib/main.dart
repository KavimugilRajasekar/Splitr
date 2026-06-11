import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'update_service.dart';
import 'update_dialog.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Lock portrait mode
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
  ]);
  runApp(const SplitrApp());
}

class SplitrApp extends StatelessWidget {
  const SplitrApp({super.key});

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      debugShowCheckedModeBanner: false,
      home: SplitrWebView(),
    );
  }
}

class SplitrWebView extends StatefulWidget {
  const SplitrWebView({super.key});

  @override
  State<SplitrWebView> createState() => _SplitrWebViewState();
}

class _SplitrWebViewState extends State<SplitrWebView> {
  late final WebViewController controller;

  @override
  void initState() {
    super.initState();

    controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..enableZoom(false)
      ..setBackgroundColor(Colors.black)
      ..loadRequest(
        Uri.parse('https://splitr-umber.vercel.app'),
      );

    // Trigger update check after the first frame so the WebView loads
    // immediately without any delay. The dialog only appears if a newer
    // version is found on GitHub.
    WidgetsBinding.instance.addPostFrameCallback((_) => _checkForUpdate());
  }

  Future<void> _checkForUpdate() async {
    final info = await UpdateService.checkForUpdate();
    // Guard: ensure widget is still in tree before showing dialog
    if (info != null && mounted) {
      await showUpdateDialog(context, info);
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      child: Scaffold(
        backgroundColor: Colors.white,
        body: SafeArea(
          child: WebViewWidget(
            controller: controller,
          ),
        ),
      ),
    );
  }
}