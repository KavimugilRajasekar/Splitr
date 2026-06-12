import 'dart:convert';
import 'dart:io';

import 'package:file_picker/file_picker.dart';
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
      // ── Export channel ──────────────────────────────────────────────────────
      // The web page calls: window.SplitrExport.postMessage(jsonString)
      // Flutter saves it to the Downloads folder.
      ..addJavaScriptChannel(
        'SplitrExport',
        onMessageReceived: (JavaScriptMessage msg) =>
            _handleExport(msg.message),
      )
      // ── Import channel ──────────────────────────────────────────────────────
      // The web page calls: window.SplitrImport.postMessage('pick')
      // Flutter opens a file picker, reads the file, and sends its content
      // back via window.__splitrImportCallback(jsonString).
      ..addJavaScriptChannel(
        'SplitrImport',
        onMessageReceived: (JavaScriptMessage msg) => _handleImport(),
      )
      ..loadRequest(
        Uri.parse('https://splitr-umber.vercel.app'),
      );

    WidgetsBinding.instance.addPostFrameCallback((_) => _checkForUpdate());
  }

  // ── Export ─────────────────────────────────────────────────────────────────
  Future<void> _handleExport(String jsonContent) async {
    try {
      // Use FilePicker's save-dialog (Android 11+ uses MediaStore automatically)
      final String? outputPath = await FilePicker.platform.saveFile(
        dialogTitle: 'Save settlement.json',
        fileName: 'settlement.json',
        type: FileType.custom,
        allowedExtensions: ['json'],
        bytes: utf8.encode(jsonContent),
      );

      if (!mounted) return;

      if (outputPath != null) {
        _showSnack('Exported to Downloads/settlement.json');
      }
      // If null the user cancelled — no error needed
    } catch (e) {
      if (!mounted) return;
      _showSnack('Export failed: $e', error: true);
    }
  }

  // ── Import ─────────────────────────────────────────────────────────────────
  Future<void> _handleImport() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['json'],
        withData: true,
      );

      if (!mounted) return;

      if (result == null || result.files.isEmpty) return; // user cancelled

      final PlatformFile picked = result.files.first;

      // Prefer in-memory bytes; fall back to reading the path
      String content;
      if (picked.bytes != null) {
        content = utf8.decode(picked.bytes!);
      } else if (picked.path != null) {
        content = await File(picked.path!).readAsString();
      } else {
        _showSnack('Could not read file', error: true);
        return;
      }

      // Escape for safe injection into a JS string literal
      final escaped = content
          .replaceAll('\\', '\\\\')
          .replaceAll('`', '\\`')
          .replaceAll('\$', '\\\$');

      // Send content back to the web page
      await controller.runJavaScript(
        'window.__splitrImportCallback(`$escaped`)',
      );
    } catch (e) {
      if (!mounted) return;
      _showSnack('Import failed: $e', error: true);
    }
  }

  void _showSnack(String msg, {bool error = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: error ? Colors.red[700] : Colors.green[700],
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  Future<void> _checkForUpdate() async {
    final info = await UpdateService.checkForUpdate();
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
