from pathlib import Path

root = Path('/tmp/safecheck_flutter/flutter_app')

# Startup resilience: local preferences must never keep the app on an empty screen.
p = root / 'lib/src/app.dart'
s = p.read_text()
old = '''  Future<void> _loadSettings() async {\n    final mode = await _settings.themeMode();\n    final locale = await _settings.locale();\n    if (!mounted) return;\n    setState(() {\n      _themeMode = mode;\n      _locale = AppStrings.supportedLocales.any((item) => item.languageCode == locale.languageCode) ? locale : const Locale('en');\n      _settingsLoaded = true;\n    });\n  }\n'''
new = '''  Future<void> _loadSettings() async {\n    ThemeMode mode = ThemeMode.system;\n    Locale locale = const Locale('en');\n    try {\n      mode = await _settings.themeMode().timeout(const Duration(seconds: 3));\n      locale = await _settings.locale().timeout(const Duration(seconds: 3));\n    } catch (_) {\n      // Corrupted or unavailable preferences must not block startup.\n    }\n    if (!mounted) return;\n    setState(() {\n      _themeMode = mode;\n      _locale = AppStrings.supportedLocales.any((item) => item.languageCode == locale.languageCode) ? locale : const Locale('en');\n      _settingsLoaded = true;\n    });\n  }\n'''
if old not in s:
    raise SystemExit('app.dart settings anchor not found')
s = s.replace(old, new)
old = '''  Future<void> _bootstrap() async {\n    final seen = await widget.settingsStore.onboardingSeen();\n    final profile = await widget.api.restoreSession();\n    if (!mounted) return;\n    setState(() {\n      _onboardingSeen = seen;\n      _profile = profile;\n      _loading = false;\n    });\n  }\n'''
new = '''  Future<void> _bootstrap() async {\n    bool seen = false;\n    UserProfile? profile;\n    try {\n      seen = await widget.settingsStore.onboardingSeen().timeout(\n            const Duration(seconds: 3),\n            onTimeout: () => false,\n          );\n    } catch (_) {\n      seen = false;\n    }\n    try {\n      profile = await widget.api.restoreSession().timeout(\n            const Duration(seconds: 5),\n            onTimeout: () => null,\n          );\n    } catch (_) {\n      profile = null;\n    }\n    if (!mounted) return;\n    setState(() {\n      _onboardingSeen = seen;\n      _profile = profile;\n      _loading = false;\n    });\n  }\n'''
if old not in s:
    raise SystemExit('app.dart bootstrap anchor not found')
s = s.replace(old, new)
p.write_text(s)

# A corrupt/stale secure-storage entry must fall back to logged-out state.
p = root / 'lib/src/services/api.dart'
s = p.read_text()
old = '''  @override\n  Future<UserProfile?> restoreSession() async {\n    if (await tokenStore.readAccessToken() == null && await tokenStore.readRefreshToken() == null) return null;\n    try {\n      return await me();\n    } catch (_) {\n      await tokenStore.clear();\n      return null;\n    }\n  }\n'''
new = '''  @override\n  Future<UserProfile?> restoreSession() async {\n    try {\n      final access = await tokenStore.readAccessToken().timeout(const Duration(seconds: 3));\n      final refresh = await tokenStore.readRefreshToken().timeout(const Duration(seconds: 3));\n      if ((access == null || access.isEmpty) && (refresh == null || refresh.isEmpty)) return null;\n      return await me().timeout(const Duration(seconds: 5));\n    } catch (_) {\n      try {\n        await tokenStore.clear().timeout(const Duration(seconds: 2));\n      } catch (_) {\n        // Best-effort cleanup only. Login must stay available.\n      }\n      return null;\n    }\n  }\n'''
if old not in s:
    raise SystemExit('api.dart restoreSession anchor not found')
s = s.replace(old, new)
p.write_text(s)

# Render a visible, sanitized fallback instead of a white screen on widget failure.
p = root / 'lib/main.dart'
s = p.read_text()
old = '''import 'package:flutter/material.dart';\n\nimport 'src/app.dart';\n\nvoid main() {\n  WidgetsFlutterBinding.ensureInitialized();\n  runApp(const SafeCheckApp());\n}\n'''
new = '''import 'package:flutter/material.dart';\n\nimport 'src/app.dart';\n\nvoid main() {\n  WidgetsFlutterBinding.ensureInitialized();\n  ErrorWidget.builder = (details) {\n    FlutterError.presentError(details);\n    return const Material(\n      child: SafeArea(\n        child: Center(\n          child: Padding(\n            padding: EdgeInsets.all(24),\n            child: Column(\n              mainAxisSize: MainAxisSize.min,\n              children: [\n                Icon(Icons.error_outline, size: 48),\n                SizedBox(height: 16),\n                Text(\n                  'SafeCheck AI could not load this screen.',\n                  textAlign: TextAlign.center,\n                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),\n                ),\n                SizedBox(height: 8),\n                Text(\n                  'Close and reopen the app. If the problem continues, update to the latest build.',\n                  textAlign: TextAlign.center,\n                ),\n              ],\n            ),\n          ),\n        ),\n      ),\n    );\n  };\n  runApp(const SafeCheckApp());\n}\n'''
if old not in s:
    raise SystemExit('main.dart anchor not found')
s = s.replace(old, new)
p.write_text(s)

# Regression tests for the exact white-screen class of failures.
t = root / 'test/startup_resilience_test.dart'
t.write_text('''import 'package:flutter/material.dart';\nimport 'package:flutter_test/flutter_test.dart';\nimport 'package:image_picker/image_picker.dart';\nimport 'package:safecheck_ai/src/app.dart';\nimport 'package:safecheck_ai/src/models/check_result.dart';\nimport 'package:safecheck_ai/src/services/api.dart';\nimport 'package:safecheck_ai/src/services/settings_store.dart';\n\nclass ThrowingSettingsStore implements SettingsStore {\n  @override\n  Future<bool> onboardingSeen() async => throw StateError('corrupt prefs');\n  @override\n  Future<void> setOnboardingSeen(bool value) async {}\n  @override\n  Future<ThemeMode> themeMode() async => throw StateError('corrupt prefs');\n  @override\n  Future<void> setThemeMode(ThemeMode mode) async {}\n  @override\n  Future<Locale> locale() async => throw StateError('corrupt prefs');\n  @override\n  Future<void> setLocale(Locale locale) async {}\n}\n\nclass ThrowingRestoreApi implements SafeCheckApi {\n  @override\n  Future<UserProfile?> restoreSession() async => throw StateError('secure storage unavailable');\n  @override\n  Future<UserProfile> login(String email, String password) => throw UnimplementedError();\n  @override\n  Future<UserProfile> register(String name, String email, String password) => throw UnimplementedError();\n  @override\n  Future<void> forgotPassword(String email) async {}\n  @override\n  Future<void> resetPassword(String token, String newPassword) async {}\n  @override\n  Future<void> logout() async {}\n  @override\n  Future<UserProfile> me() => throw UnimplementedError();\n  @override\n  Future<CheckResult> universalCheck(String content) => throw UnimplementedError();\n  @override\n  Future<CheckResult> urlCheck(String url) => throw UnimplementedError();\n  @override\n  Future<CheckResult> imageCheck(XFile file) => throw UnimplementedError();\n  @override\n  Future<List<CheckResult>> history() async => const [];\n  @override\n  Future<CheckResult> getCheck(int id) => throw UnimplementedError();\n  @override\n  Future<void> deleteCheck(int id) async {}\n  @override\n  Future<List<PlanInfo>> plans() async => const [];\n}\n\nvoid main() {\n  testWidgets('corrupted settings cannot leave a blank startup screen', (tester) async {\n    await tester.pumpWidget(SafeCheckApp(api: ThrowingRestoreApi(), settingsStore: ThrowingSettingsStore()));\n    await tester.pumpAndSettle();\n    expect(find.text('SafeCheck AI'), findsOneWidget);\n    expect(find.text('Get started'), findsOneWidget);\n    expect(find.byType(Scaffold), findsOneWidget);\n  });\n\n  testWidgets('failed session restore falls back to login', (tester) async {\n    await tester.pumpWidget(SafeCheckApp(api: ThrowingRestoreApi(), settingsStore: MemorySettingsStore(seen: true)));\n    await tester.pumpAndSettle();\n    expect(find.text('Log in'), findsOneWidget);\n    expect(find.byType(Scaffold), findsOneWidget);\n  });\n}\n''')
