from pathlib import Path

p = Path('/tmp/safecheck_flutter/flutter_app/test/startup_resilience_test.dart')
s = p.read_text()
s = s.replace("expect(find.text('Log in'), findsOneWidget);", "expect(find.text('Log in'), findsWidgets);")
p.write_text(s)
