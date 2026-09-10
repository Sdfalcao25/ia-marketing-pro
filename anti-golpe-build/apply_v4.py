from pathlib import Path

# Strengthen the on-device fallback against PIX bait / unknown sender / channel shift.
p = Path('lib/features/analysis/local_ai_analysis_service.dart')
s = p.read_text()
if 'final channelShift = has(' not in s:
    marker = "    final unknownSender = has(r'\\b(n[aã]o conhe[cç]o|desconhecid[oa]|nunca falei|nunca vi|pessoa que n[aã]o conhe[cç]o|contato desconhecido)\\b');\n"
    insert = marker + (
        "    final channelShift = has(r'(envie seu whatsapp|mande seu whatsapp|passa seu whatsapp|passe seu whatsapp|me chama no whatsapp|chama no zap|falamos mais|fale comigo no whatsapp|telegram|mande mensagem neste n[uú]mero|envie uma mensagem neste n[uú]mero)');\n"
        "    final pixBait = has(r'(tenho (um )?pix para|pix para (lhe|te|voc[eê]) enviar|voc[eê] ganhou (um )?pix|pix liberado|pix dispon[ií]vel|ganhei (um|o) pix)');\n"
    )
    if marker not in s:
        raise SystemExit('V4 patch: unknownSender marker not found')
    s = s.replace(marker, insert, 1)

old = "    if (unknownSender && (prize || unexpectedPix)) add('Remetente desconhecido em contexto financeiro', 18, 'Você informou que não conhece a pessoa. Em mensagens sobre prêmio, PIX ou dinheiro isso exige confirmação independente antes de qualquer ação.', severity: 'high');\n"
new = (
    "    if (pixBait) add('PIX usado como isca', 24, 'Prometer enviar/liberar um PIX para iniciar ou manter a conversa é um padrão de engenharia social que exige confirmação independente.', severity: 'high');\n"
    "    if (channelShift) add('Mudança para canal privado', 18, 'O contato tenta levar a conversa para WhatsApp, Telegram ou outro canal privado antes de comprovar a identidade.', severity: 'high');\n"
    "    if (unknownSender && (prize || unexpectedPix || pixBait)) add('Remetente desconhecido em contexto financeiro', 18, 'Você informou que não conhece a pessoa. Em mensagens sobre prêmio, PIX ou dinheiro isso exige confirmação independente antes de qualquer ação.', severity: 'high');\n"
)
if old in s:
    s = s.replace(old, new, 1)
elif "if (pixBait) add('PIX usado como isca'" not in s:
    raise SystemExit('V4 patch: unknownSender scoring marker not found')

if 'if (payment && unknownSender) score = max(score, 72);' not in s:
    marker = "    if (injection) add('Tentativa de manipular a análise', 8, 'Instruções encontradas no conteúdo foram tratadas somente como dados e não controlam o analisador.');\n\n"
    floors = marker + (
        "    if (payment && unknownSender) score = max(score, 72);\n"
        "    if (pixBait && unknownSender) score = max(score, 78);\n"
        "    if (payment && unknownSender && channelShift) score = max(score, 86);\n"
        "    if (unexpectedPix && refundPix) score = max(score, 82);\n"
        "    if (unexpectedPix && refundPix && differentRefundKey) score = max(score, 92);\n\n"
    )
    if marker not in s:
        raise SystemExit('V4 patch: floor insertion marker not found')
    s = s.replace(marker, floors, 1)
p.write_text(s)

# Regression tests for the exact failure reported by the user.
p = Path('test/local_analysis_service_test.dart')
s = p.read_text()
if 'REGRESSÃO V4 PIX prometido por desconhecido + WhatsApp' not in s:
    extra = r'''
  test('REGRESSÃO V4 PIX prometido por desconhecido + WhatsApp é risco muito alto', () async {
    final r = await service.analyze(const AnalysisRequest(
      type: AnalysisType.message,
      fields: {
        'content': 'Tenho um PIX para lhe enviar. Envie seu WhatsApp e falamos mais.',
        'context': 'Não conheço a pessoa.'
      },
    ));
    expect(r.riskScore, greaterThanOrEqualTo(80));
    expect(r.signals.any((s) => s.title.contains('isca') || s.title.contains('canal privado')), isTrue);
  });

  test('REGRESSÃO V4 PIX inesperado + devolução para outra chave é muito alto', () async {
    final r = await service.analyze(const AnalysisRequest(
      type: AnalysisType.message,
      fields: {'content': 'Recebi um PIX por engano de uma pessoa desconhecida e ela pediu para devolver para outra chave.'},
    ));
    expect(r.riskScore, greaterThanOrEqualTo(90));
  });
'''
    pos = s.rfind('\n}')
    if pos < 0:
        raise SystemExit('V4 patch: test main closing brace not found')
    s = s[:pos] + '\n' + extra + s[pos:]
p.write_text(s)

# Make the UI accurately identify a server-side fallback instead of calling it local.
p = Path('lib/features/analysis/result_screen.dart')
s = p.read_text()
if "'server_fallback' => 'Motor antifraude do servidor'" not in s:
    s = s.replace(
        "        'local_fallback' => 'Contingência local',\n",
        "        'local_fallback' => 'Contingência local',\n        'server_fallback' => 'Motor antifraude do servidor',\n",
        1,
    )
old = "                    : result.analysisMode == 'local_fallback'\n                        ? 'A IA remota não respondeu. Para não deixar você sem proteção, o app recalculou o resultado pelo motor local avançado.'\n                        : 'Este resultado foi calculado pelo motor local avançado. Ele é útil para triagem, mas não substitui uma confirmação independente.',"
new = "                    : result.analysisMode == 'local_fallback'\n                        ? 'A IA remota não respondeu. Para não deixar você sem proteção, o app recalculou o resultado pelo motor local avançado.'\n                        : result.analysisMode == 'server_fallback'\n                            ? 'A IA remota não estava disponível para esta consulta. O servidor aplicou o motor antifraude de contingência e devolveu uma análise estruturada, sem fingir que consultou a IA.'\n                            : 'Este resultado foi calculado pelo motor local avançado. Ele é útil para triagem, mas não substitui uma confirmação independente.',"
if old in s:
    s = s.replace(old, new, 1)
elif "result.analysisMode == 'server_fallback'" not in s:
    raise SystemExit('V4 patch: result banner marker not found')
p.write_text(s)

# Version the build as V4.
p = Path('pubspec.yaml')
s = p.read_text()
s = s.replace('version: 0.3.0+3', 'version: 0.4.0+4')
p.write_text(s)

# Fail fast if any expected change did not land.
checks = {
    'lib/features/analysis/local_ai_analysis_service.dart': ['final channelShift', 'final pixBait', 'score = max(score, 86)', 'score = max(score, 92)'],
    'test/local_analysis_service_test.dart': ['REGRESSÃO V4 PIX prometido', 'REGRESSÃO V4 PIX inesperado'],
    'lib/features/analysis/result_screen.dart': ["'server_fallback' => 'Motor antifraude do servidor'"],
    'pubspec.yaml': ['version: 0.4.0+4'],
}
for filename, needles in checks.items():
    body = Path(filename).read_text()
    for needle in needles:
        if needle not in body:
            raise SystemExit(f'V4 patch validation failed: {needle!r} missing in {filename}')
print('V4 application patch applied successfully')
