from pathlib import Path

root = Path('/tmp/safecheck_flutter/flutter_app')

# 1) Make HttpSafeCheckApi endpoint changeable at runtime.
p = root / 'lib/src/services/api.dart'
s = p.read_text()
s = s.replace('  final String baseUrl;\n', '  String baseUrl;\n')
needle = "  Uri _uri(String path) => Uri.parse('$baseUrl$path');\n"
replacement = """  void updateBaseUrl(String value) {\n    final cleaned = value.trim().replaceAll(RegExp(r'/+$'), '');\n    final uri = Uri.tryParse(cleaned);\n    if (uri == null || !{'http', 'https'}.contains(uri.scheme) || uri.host.isEmpty) {\n      throw const FormatException('Invalid API server URL');\n    }\n    baseUrl = cleaned;\n  }\n\n  Uri _uri(String path) => Uri.parse('$baseUrl$path');\n"""
if 'void updateBaseUrl(String value)' not in s:
    if needle not in s:
        raise SystemExit('api.dart patch anchor not found')
    s = s.replace(needle, replacement)
p.write_text(s)

# 2) Advanced server setup on login, persisted on-device.
p = root / 'lib/src/screens/auth_screen.dart'
s = p.read_text()
if "package:shared_preferences/shared_preferences.dart" not in s:
    s = s.replace("import 'package:flutter/material.dart';\n", "import 'package:flutter/material.dart';\nimport 'package:shared_preferences/shared_preferences.dart';\n")
if 'final _server = TextEditingController();' not in s:
    s = s.replace('  final _name = TextEditingController();\n', '  final _name = TextEditingController();\n  final _server = TextEditingController();\n')
    s = s.replace('  bool _loading = false;\n', '  bool _loading = false;\n  bool _showServer = false;\n')
    insert = """\n  static const _serverPrefKey = 'api_base_url';\n\n  @override\n  void initState() {\n    super.initState();\n    _loadServer();\n  }\n\n  Future<void> _loadServer() async {\n    final api = widget.api;\n    if (api is! HttpSafeCheckApi) return;\n    final prefs = await SharedPreferences.getInstance();\n    final saved = prefs.getString(_serverPrefKey);\n    if (saved != null && saved.trim().isNotEmpty) {\n      try {\n        api.updateBaseUrl(saved);\n      } on FormatException {\n        // Ignore a corrupted local preference and keep the build default.\n      }\n    }\n    if (!mounted) return;\n    _server.text = api.baseUrl;\n  }\n\n  Future<void> _applyServer() async {\n    final api = widget.api;\n    if (api is! HttpSafeCheckApi) return;\n    api.updateBaseUrl(_server.text);\n    final prefs = await SharedPreferences.getInstance();\n    await prefs.setString(_serverPrefKey, api.baseUrl);\n  }\n"""
    s = s.replace('  @override\n  void dispose() {', insert + '\n  @override\n  void dispose() {')
    s = s.replace('    _name.dispose();\n', '    _name.dispose();\n    _server.dispose();\n')
    s = s.replace('    try {\n      final profile = _register', '    try {\n      await _applyServer();\n      final profile = _register')
    s = s.replace('    } on ApiException catch (error) {', "    } on FormatException {\n      if (mounted) setState(() => _error = AppStrings.of(context).t('invalidServer'));\n    } on ApiException catch (error) {")
    marker = """                  TextButton(\n                    onPressed: _loading ? null : () => setState(() => _register = !_register),\n                    child: Text(_register ? s.t('haveAccount') : s.t('noAccount')),\n                  ),\n"""
    addition = marker + """                  if (widget.api is HttpSafeCheckApi) ...[\n                    const SizedBox(height: 8),\n                    const Divider(),\n                    TextButton.icon(\n                      onPressed: _loading ? null : () => setState(() => _showServer = !_showServer),\n                      icon: const Icon(Icons.dns_outlined),\n                      label: Text(s.t('serverSettings')),\n                    ),\n                    if (_showServer) ...[\n                      const SizedBox(height: 8),\n                      TextField(\n                        controller: _server,\n                        keyboardType: TextInputType.url,\n                        autocorrect: false,\n                        enableSuggestions: false,\n                        decoration: InputDecoration(\n                          labelText: s.t('serverUrl'),\n                          helperText: s.t('serverHelp'),\n                          helperMaxLines: 3,\n                        ),\n                      ),\n                    ],\n                  ],\n"""
    if marker not in s:
        raise SystemExit('auth_screen.dart patch anchor not found')
    s = s.replace(marker, addition)
p.write_text(s)

# 3) Localized labels.
p = root / 'lib/src/localization/app_strings.dart'
s = p.read_text()
if "'serverSettings': 'Server settings'" not in s:
    s = s.replace("      'version': 'Risk engine version',\n", "      'version': 'Risk engine version',\n      'serverSettings': 'Server settings',\n      'serverUrl': 'API server URL',\n      'serverHelp': 'For Android emulator use http://10.0.2.2:8000. On a real phone, use your computer LAN address or an HTTPS test server.',\n      'invalidServer': 'Enter a valid API server URL starting with http:// or https://.',\n")
    s = s.replace("      'version': 'Versão do motor de risco',\n", "      'version': 'Versão do motor de risco',\n      'serverSettings': 'Configuração do servidor',\n      'serverUrl': 'URL do servidor da API',\n      'serverHelp': 'No emulador Android use http://10.0.2.2:8000. No celular real, use o IP local do seu computador ou um servidor de teste HTTPS.',\n      'invalidServer': 'Informe uma URL válida começando com http:// ou https://.',\n")
p.write_text(s)

# 4) Regression test for the endpoint validator.
test = root / 'test/server_config_test.dart'
test.write_text("""import 'package:flutter_test/flutter_test.dart';\nimport 'package:safecheck_ai/src/services/api.dart';\n\nvoid main() {\n  test('runtime API server accepts HTTP/HTTPS and rejects unsupported schemes', () {\n    final api = HttpSafeCheckApi(baseUrl: 'http://10.0.2.2:8000');\n    api.updateBaseUrl('https://example.test/api/');\n    expect(api.baseUrl, 'https://example.test/api');\n    api.updateBaseUrl('http://192.168.1.20:8000');\n    expect(api.baseUrl, 'http://192.168.1.20:8000');\n    expect(() => api.updateBaseUrl('ftp://example.test'), throwsFormatException);\n    expect(() => api.updateBaseUrl('not-a-url'), throwsFormatException);\n  });\n}\n""")
