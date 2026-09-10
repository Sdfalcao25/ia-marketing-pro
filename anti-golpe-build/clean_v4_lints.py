from pathlib import Path

# 1) Remove redundant null assertion after explicit null check.
p = Path('lib/core/services/site_research_service.dart')
s = p.read_text().replace('difference(registrationDate!.toUtc())', 'difference(registrationDate.toUtc())')
p.write_text(s)

# 2) Avoid reading State.context directly in an async catch block.
p = Path('lib/features/account/account_screen.dart')
s = p.read_text()
if 'void _showError(Object error)' not in s:
    marker = 'class _AccountScreenState extends ConsumerState<AccountScreen>{\n'
    helper = marker + "void _showError(Object error){if(!mounted)return;ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text(error.toString())));}\n"
    if marker not in s:
        raise SystemExit('AccountScreen state marker not found')
    s = s.replace(marker, helper, 1)
s = s.replace("if(mounted)ScaffoldMessenger.of(context).showSnackBar(SnackBar(content:Text(e.toString())));", "_showError(e);")
p.write_text(s)

# 3) Dart now treats '_' as a wildcard; a second named underscore is unnecessary.
p = Path('lib/features/learn/learn_screen.dart')
s = p.read_text().replace('separatorBuilder: (_, __) => const SizedBox(width: 8),', 'separatorBuilder: (_, _) => const SizedBox(width: 8),')
p.write_text(s)

checks = {
    'lib/core/services/site_research_service.dart': ['difference(registrationDate.toUtc())'],
    'lib/features/account/account_screen.dart': ['void _showError(Object error)', '_showError(e);'],
    'lib/features/learn/learn_screen.dart': ['separatorBuilder: (_, _) => const SizedBox(width: 8),'],
}
for filename, needles in checks.items():
    body = Path(filename).read_text()
    for needle in needles:
        if needle not in body:
            raise SystemExit(f'Lint cleanup failed: {needle!r} missing in {filename}')
print('V4 analyzer cleanup applied successfully')
