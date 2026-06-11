import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:webview_flutter/webview_flutter.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Lock portrait mode
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
  ]);

  // Hide system overlays if desired
  SystemChrome.setEnabledSystemUIMode(
    SystemUiMode.edgeToEdge,
  );

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
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      child: Scaffold(
        backgroundColor: Colors.black,
        body: SizedBox.expand(
          child: WebViewWidget(
            controller: controller,
          ),
        ),
      ),
    );
  }
}