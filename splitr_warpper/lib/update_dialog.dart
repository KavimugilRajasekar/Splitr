import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'update_service.dart';

/// Shows the update-available dialog.
///
/// Must be called with a valid [BuildContext] that is still mounted.
Future<void> showUpdateDialog(BuildContext context, UpdateInfo info) async {
  final packageInfo = await PackageInfo.fromPlatform();
  final currentVersion = packageInfo.version;

  if (!context.mounted) return;

  await showDialog<void>(
    context: context,
    barrierDismissible: false,
    builder: (_) => _UpdateDialog(
      info: info,
      currentVersion: currentVersion,
    ),
  );
}

// ── Dialog widget ─────────────────────────────────────────────────────────────

class _UpdateDialog extends StatelessWidget {
  const _UpdateDialog({
    required this.info,
    required this.currentVersion,
  });

  final UpdateInfo info;
  final String currentVersion;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    // Trim release notes to a reasonable preview length
    final notes = info.releaseNotes.trim();
    final preview = notes.length > 220 ? '${notes.substring(0, 220)}…' : notes;

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      clipBehavior: Clip.hardEdge,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // ── Header gradient banner ─────────────────────────────────────────
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 24),
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFF6C3AFF), Color(0xFF00D4FF)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
            child: Column(
              children: [
                // App icon
                Container(
                  width: 72,
                  height: 72,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.2),
                        blurRadius: 12,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  padding: const EdgeInsets.all(8),
                  child: Image.asset(
                    'assets/icons/splitr.png',
                    fit: BoxFit.contain,
                  ),
                ),
                const SizedBox(height: 14),
                const Text(
                  '🎉  New Update Available',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.3,
                  ),
                ),
                const SizedBox(height: 6),
                // Version pill
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: Colors.white.withValues(alpha: 0.4),
                    ),
                  ),
                  child: Text(
                    'v$currentVersion  →  v${info.version}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
              ],
            ),
          ),

          // ── Body ──────────────────────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Release notes
                if (preview.isNotEmpty) ...[
                  Text(
                    "What's new",
                    style: textTheme.labelLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: colorScheme.onSurface,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: colorScheme.surfaceContainerHighest
                          .withValues(alpha: 0.5),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      preview,
                      style: textTheme.bodySmall?.copyWith(
                        color: colorScheme.onSurfaceVariant,
                        height: 1.5,
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                ] else
                  const SizedBox(height: 4),

                // ── Primary CTA ─────────────────────────────────────────────
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: () => _openDownload(context),
                    style: FilledButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      backgroundColor: const Color(0xFF6C3AFF),
                    ),
                    icon: const Icon(Icons.download_rounded, size: 20),
                    label: const Text(
                      'Download Update',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 0.3,
                      ),
                    ),
                  ),
                ),

                const SizedBox(height: 10),

                // ── Secondary actions ────────────────────────────────────────
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => _skipVersion(context),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                          side: BorderSide(
                            color: colorScheme.outlineVariant,
                          ),
                        ),
                        child: Text(
                          'Skip version',
                          style: TextStyle(
                            fontSize: 13,
                            color: colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: TextButton(
                        onPressed: () => Navigator.of(context).pop(),
                        style: TextButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                        child: Text(
                          'Remind me later',
                          style: TextStyle(
                            fontSize: 13,
                            color: colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 8),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── Handlers ─────────────────────────────────────────────────────────────────

  Future<void> _openDownload(BuildContext context) async {
    Navigator.of(context).pop();
    final uri = Uri.parse(info.downloadUrl);
    try {
      final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!launched && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not open browser. Visit github.com/KavimugilRajasekar/Splitr/releases manually.')),
        );
      }
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not open browser.')),
        );
      }
    }
  }

  Future<void> _skipVersion(BuildContext context) async {
    await UpdateService.skipVersion(info.version);
    if (context.mounted) Navigator.of(context).pop();
  }
}
