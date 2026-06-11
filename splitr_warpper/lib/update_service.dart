import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:package_info_plus/package_info_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Holds information about an available GitHub release.
class UpdateInfo {
  /// The new version string, e.g. "1.2.0"
  final String version;

  /// URL to open in the browser (direct APK asset URL if available,
  /// otherwise the HTML release page).
  final String downloadUrl;

  /// Raw release notes from GitHub (may be empty).
  final String releaseNotes;

  const UpdateInfo({
    required this.version,
    required this.downloadUrl,
    required this.releaseNotes,
  });
}

class UpdateService {
  static const _githubApiUrl =
      'https://api.github.com/repos/KavimugilRajasekar/Splitr/releases/latest';

  static const _skippedVersionKey = 'splitr_skipped_update_version';

  // ── Public API ──────────────────────────────────────────────────────────────

  /// Checks GitHub for a newer release.
  ///
  /// Returns [UpdateInfo] when a newer version is found **and** the user
  /// has not previously chosen to skip that version.
  /// Returns `null` if up-to-date, network error, or parse failure.
  static Future<UpdateInfo?> checkForUpdate() async {
    try {
      final packageInfo = await PackageInfo.fromPlatform();
      final currentVersion = packageInfo.version; // e.g. "1.0.0"

      final response = await http
          .get(
            Uri.parse(_githubApiUrl),
            headers: {'Accept': 'application/vnd.github+json'},
          )
          .timeout(const Duration(seconds: 10));

      if (response.statusCode != 200) return null;

      final json = jsonDecode(response.body) as Map<String, dynamic>;

      // Parse the tag — strips leading "v" if present
      final rawTag = (json['tag_name'] as String? ?? '').trim();
      final remoteVersion = rawTag.startsWith('v') ? rawTag.substring(1) : rawTag;

      if (remoteVersion.isEmpty) return null;

      // Skip if user already dismissed this version
      if (await _isVersionSkipped(remoteVersion)) return null;

      // Compare versions
      if (!_isNewerVersion(current: currentVersion, remote: remoteVersion)) {
        return null;
      }

      // Try to find a direct APK asset in the release
      String downloadUrl = json['html_url'] as String? ?? _githubApiUrl;
      final assets = json['assets'] as List<dynamic>? ?? [];
      for (final asset in assets) {
        final name = (asset['name'] as String? ?? '').toLowerCase();
        if (name.endsWith('.apk')) {
          downloadUrl = asset['browser_download_url'] as String? ?? downloadUrl;
          break;
        }
      }

      final releaseNotes = json['body'] as String? ?? '';

      return UpdateInfo(
        version: remoteVersion,
        downloadUrl: downloadUrl,
        releaseNotes: releaseNotes,
      );
    } catch (_) {
      // Never crash the app due to update check failure
      return null;
    }
  }

  /// Persists the user's choice to skip [version].
  static Future<void> skipVersion(String version) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_skippedVersionKey, version);
    } catch (_) {}
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  static Future<bool> _isVersionSkipped(String version) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getString(_skippedVersionKey) == version;
    } catch (_) {
      return false;
    }
  }

  /// Semantic version comparison: returns `true` when [remote] > [current].
  /// Compares major, minor, patch numerically; ignores build metadata.
  static bool _isNewerVersion({
    required String current,
    required String remote,
  }) {
    final cur = _parseSemVer(current);
    final rem = _parseSemVer(remote);

    for (int i = 0; i < 3; i++) {
      if (rem[i] > cur[i]) return true;
      if (rem[i] < cur[i]) return false;
    }
    return false; // equal
  }

  /// Splits a version string like "1.2.3" into [1, 2, 3].
  /// Missing parts default to 0.
  static List<int> _parseSemVer(String version) {
    // Strip build metadata (+...) and pre-release (-...)
    final clean = version.split('+').first.split('-').first;
    final parts = clean.split('.');
    return List.generate(3, (i) {
      if (i >= parts.length) return 0;
      return int.tryParse(parts[i]) ?? 0;
    });
  }
}
