from pathlib import Path

root = Path('/tmp/safecheck_flutter/flutter_app')
api = root / 'lib/src/services/api.dart'
s = api.read_text()
public_url = 'https://safecheck-ai-ytshny.v2.appdeploy.ai'
s = s.replace("defaultValue: 'http://10.0.2.2:8000'", f"defaultValue: '{public_url}'")
start = s.index('  @override\n  Future<CheckResult> imageCheck(XFile file) async {')
end = s.index('\n  @override\n  Future<List<CheckResult>> history()', start)
replacement = '''  @override\n  Future<CheckResult> imageCheck(XFile file) async {\n    final bytes = await file.readAsBytes();\n    final name = file.name.toLowerCase();\n    final mimeType = name.endsWith('.png')\n        ? 'image/png'\n        : name.endsWith('.webp')\n            ? 'image/webp'\n            : 'image/jpeg';\n    final response = await _authorized(\n      'POST',\n      '/api/checks/image-json',\n      body: {\n        'data': base64Encode(bytes),\n        'mimeType': mimeType,\n        'filename': file.name,\n      },\n    );\n    return CheckResult.fromJson(Map<String, dynamic>.from(_decoded(response) as Map));\n  }\n'''
s = s[:start] + replacement + s[end:]
api.write_text(s)

test = root / 'test/public_backend_test.dart'
test.write_text('''import 'package:flutter_test/flutter_test.dart';\nimport 'package:safecheck_ai/src/services/api.dart';\n\nvoid main() {\n  test('public beta backend is the default API endpoint', () {\n    final api = HttpSafeCheckApi();\n    expect(api.baseUrl, 'https://safecheck-ai-ytshny.v2.appdeploy.ai');\n  });\n}\n''')
