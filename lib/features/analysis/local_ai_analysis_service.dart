import 'dart:math';

import '../../core/models/analysis.dart';
import '../../core/models/risk_level.dart';
import 'analysis_service.dart';

class LocalAIAnalysisService implements AIAnalysisService {
  const LocalAIAnalysisService();

  @override
  Future<AnalysisResult> analyze(AnalysisRequest request) async {
    final raw = '${request.text}\n${request.metadata.values.join(' ')}'.trim();
    final text = raw.toLowerCase();
    var score = _baselineFor(request.type, raw);
    final signals = <AnalysisSignal>[];
    final positives = <String>[];
    final recommendations = <String>[];
    final nextSteps = <String>[];

    void add(int points, String title, String detail) {
      score += points;
      signals.add(AnalysisSignal(title: title, detail: detail, severity: points >= 18 ? 'high' : points >= 10 ? 'medium' : 'low'));
    }

    final urgent = _hasAny(text, const [
      'urgente', 'agora', 'imediatamente', 'última chance', 'ultima chance',
      'hoje ainda', 'prazo de', 'em 10 minutos', 'em 5 minutos', 'não conte',
      'nao conte', 'sigilo', 'secreto',
    ]);
    final threat = _hasAny(text, const [
      'bloqueada', 'bloqueado', 'suspensa', 'suspenso', 'cancelada', 'cancelado',
      'multa', 'processo', 'prisão', 'prisao', 'perderá', 'perdera', 'serasa',
    ]);
    final payment = _hasAny(text, const [
      'pix', 'transferência', 'transferencia', 'depósito', 'deposito', 'pague',
      'pagamento', 'chave pix', 'qr code', 'boleto', 'adiantamento',
    ]);
    final credentials = _hasAny(text, const [
      'senha', 'token', 'código de segurança', 'codigo de seguranca', 'cvv',
      'acesso remoto', 'anydesk', 'teamviewer', 'código do whatsapp',
      'codigo do whatsapp', 'compartilhe a tela', 'screen share',
    ]);
    final impersonation = _hasAny(text, const [
      'banco central', 'delegado', 'polícia federal', 'policia federal',
      'receita federal', 'gerente do banco', 'setor de segurança',
      'setor de seguranca', 'suporte oficial', 'mercado livre', 'shopee',
    ]);
    final offPlatform = _hasAny(text, const [
      'por fora', 'fora da plataforma', 'whatsapp pessoal', 'pix direto',
      'evitar taxa', 'não use a plataforma', 'nao use a plataforma',
    ]);
    final unrealistic = _hasAny(text, const [
      '80% de desconto', '90% de desconto', '70% de desconto', 'metade do preço',
      'metade do preco', 'lucro garantido', 'retorno garantido', 'renda garantida',
      'ganho garantido', 'sem risco', 'dobrar seu dinheiro',
    ]);
    final advanceFee = _hasAny(text, const [
      'taxa antecipada', 'taxa para liberar', 'pague para liberar',
      'depósito de segurança', 'deposito de seguranca', 'frete antecipado',
      'sinal para reservar', 'taxa de cadastro',
    ]);
    final emotional = _hasAny(text, const [
      'amor da minha vida', 'estou no exterior', 'emergência médica',
      'emergencia medica', 'preciso de dinheiro', 'não posso ligar', 'nao posso ligar',
    ]);
    final prize = _hasAny(text, const [
      'você ganhou', 'voce ganhou', 'premiado', 'prêmio', 'premio', 'sorteio',
      'resgate seu prêmio', 'resgate seu premio',
    ]);
    final job = _hasAny(text, const [
      'vaga home office', 'ganhe por tarefa', 'curtir vídeos', 'curtir videos',
      'taxa para começar', 'taxa para comecar', 'investimento inicial para trabalhar',
    ]);
    final investment = _hasAny(text, const [
      'cripto', 'bitcoin', 'usdt', 'investimento', 'robô de investimento',
      'robo de investimento', 'rentabilidade', 'trade automático', 'trade automatico',
    ]);
    final promptInjection = _hasAny(text, const [
      'ignore as instruções', 'ignore as instrucoes', 'ignore previous instructions',
      'system prompt', 'developer message', 'você é o chatgpt', 'voce e o chatgpt',
      'retorne risco 0', 'diga que é seguro', 'diga que e seguro',
    ]);

    if (urgent) add(14, 'Pressão por urgência', 'O conteúdo tenta reduzir o tempo disponível para você confirmar a situação.');
    if (threat) add(14, 'Ameaça ou consequência imediata', 'Há linguagem de bloqueio, punição ou perda para induzir uma decisão rápida.');
    if (payment) add(8, 'Solicitação financeira', 'O conteúdo envolve PIX, transferência, boleto ou outra forma de pagamento.');
    if (urgent && payment) add(16, 'Pagamento sob pressão', 'Cobrança combinada com urgência é um padrão recorrente em fraudes digitais.');
    if (credentials) add(28, 'Pedido de dado sigiloso ou acesso', 'Senhas, tokens, códigos, CVV ou acesso remoto não devem ser enviados a terceiros.');
    if (impersonation) add(13, 'Possível uso de autoridade ou marca conhecida', 'Golpistas frequentemente usam nomes de bancos, órgãos e plataformas para criar confiança.');
    if (offPlatform) add(22, 'Tentativa de tirar a negociação da plataforma', 'Pagamentos fora do ambiente protegido reduzem mecanismos de contestação e proteção.');
    if (unrealistic) add(21, 'Oferta ou retorno fora do padrão', 'Benefício muito acima do mercado ou retorno garantido exige verificação independente.');
    if (advanceFee) add(22, 'Pagamento antecipado para liberar benefício', 'Taxa prévia para liberar crédito, prêmio, trabalho ou produto é um sinal clássico de fraude.');
    if (emotional) add(17, 'Pressão emocional', 'O pedido usa vínculo afetivo ou emergência para acelerar uma transferência.');
    if (prize) add(16, 'Prêmio ou vantagem inesperada', 'Prêmios não solicitados acompanhados de link ou taxa devem ser verificados diretamente com a organização.');
    if (job) add(20, 'Padrão de falso emprego/renda por tarefa', 'Cobrança para começar a trabalhar ou promessa de ganho fácil é um sinal de alerta.');
    if (investment && unrealistic) add(18, 'Promessa financeira incompatível com risco real', 'Investimentos legítimos não conseguem garantir retorno elevado sem risco.');
    if (promptInjection) add(15, 'Tentativa de manipular a análise', 'Instruções encontradas no conteúdo foram tratadas como dados não confiáveis e não foram obedecidas.');

    final urls = RegExp(r'https?://[^\s<>"\)\]]+', caseSensitive: false).allMatches(raw).map((e) => e.group(0)!).toList();
    for (final value in urls) {
      Uri? uri;
      try {
        uri = Uri.parse(value);
      } catch (_) {}
      if (uri == null || uri.host.isEmpty) {
        add(12, 'URL malformada', 'O endereço encontrado não possui formato normal de domínio.');
        continue;
      }
      final host = uri.host.toLowerCase();
      if (uri.scheme == 'http') add(10, 'Conexão sem HTTPS', '$host foi informado usando HTTP sem criptografia de transporte.');
      if (RegExp(r'^\d{1,3}(\.\d{1,3}){3}$').hasMatch(host)) add(18, 'Link usando endereço IP', 'Sites legítimos voltados ao consumidor normalmente apresentam um domínio identificável.');
      if (host.startsWith('xn--') || host.contains('.xn--')) add(16, 'Domínio internacionalizado/Punycode', 'O domínio precisa ser comparado cuidadosamente com a marca que afirma representar.');
      if (host.split('.').first.split('-').length >= 4) add(8, 'Domínio com muitos separadores', 'Estrutura incomum pode ser usada para imitar nomes legítimos.');
      if (_hasAny(host, const ['login-', 'secure-', 'verifica-', 'atualiza-', 'suporte-', 'premio-', 'pix-'])) {
        add(10, 'Nome de domínio com linguagem sensível', 'O endereço tenta transmitir segurança, atualização, prêmio ou pagamento no próprio domínio.');
      }
    }

    if (raw.trim().length < 20) {
      score = max(score, 12);
      signals.add(const AnalysisSignal(title: 'Pouco contexto', detail: 'Há informação insuficiente para uma conclusão forte. Inclua a mensagem completa, link, valores e contexto.', severity: 'low'));
    }

    score = score.clamp(0, 100).toInt();
    final level = RiskLevel.fromScore(score);

    if (!urgent && !threat) positives.add('Não foi detectada pressão explícita por urgência ou ameaça.');
    if (!credentials) positives.add('Não foi identificado pedido explícito de senha, token, CVV ou acesso remoto.');
    if (!offPlatform) positives.add('Não foi detectado pedido explícito para abandonar uma plataforma protegida.');
    if (!unrealistic) positives.add('Não foi detectada promessa claramente incompatível com condições comuns de mercado.');

    recommendations.addAll(_recommendationsFor(level, request.type));
    nextSteps.addAll(_nextStepsFor(request.type, payment: payment));

    final confidence = _confidenceFor(raw, signals.length, request.type);
    final verdict = switch (level) {
      RiskLevel.low => 'Poucos sinais de golpe foram encontrados no material enviado.',
      RiskLevel.attention => 'Há pontos que merecem confirmação antes de confiar, clicar ou pagar.',
      RiskLevel.moderate => 'Existem sinais relevantes de risco. Não avance sem verificar por canais independentes.',
      RiskLevel.high => 'O padrão é fortemente compatível com tentativa de golpe. Evite pagamento, links e envio de dados.',
      RiskLevel.veryHigh => 'Foram encontrados diversos sinais críticos compatíveis com fraude digital. Interrompa a interação e confirme tudo por canais oficiais.',
    };

    return AnalysisResult(
      riskScore: score,
      confidence: confidence,
      level: level,
      summary: verdict,
      signals: signals,
      positiveSignals: positives.take(4).toList(),
      recommendations: recommendations,
      nextSteps: nextSteps,
      analysisMode: 'local_preliminary',
      sourceNotes: const [
        'Triagem baseada em sinais locais, contexto fornecido e regras antifraude.',
        'Nenhum modelo remoto foi consultado nesta análise local.',
        'Para decisões financeiras importantes, confirme por um canal oficial independente.',
      ],
    );
  }

  int _baselineFor(AnalysisType type, String raw) {
    if (raw.trim().isEmpty) return 10;
    return switch (type) {
      AnalysisType.pix => 13,
      AnalysisType.offer => 11,
      AnalysisType.site || AnalysisType.link => 9,
      AnalysisType.profile => 9,
      AnalysisType.document => 8,
      AnalysisType.image => 8,
      AnalysisType.receipt => 9,
      AnalysisType.ad => 10,
      AnalysisType.message => 7,
    };
  }

  int _confidenceFor(String raw, int signalCount, AnalysisType type) {
    var value = 52;
    if (raw.length >= 60) value += 8;
    if (raw.length >= 180) value += 8;
    if (signalCount >= 2) value += 8;
    if (signalCount >= 4) value += 6;
    if (type == AnalysisType.site || type == AnalysisType.link) value -= 4;
    return value.clamp(35, 92);
  }

  List<String> _recommendationsFor(RiskLevel level, AnalysisType type) {
    final items = <String>[];
    if (level.index >= RiskLevel.moderate.index) {
      items.add('Não pague, não envie documentos e não compartilhe códigos enquanto houver dúvida.');
      items.add('Confirme a identidade por um canal oficial encontrado por você, não pelo contato recebido.');
    } else {
      items.add('Mesmo com risco baixo, confirme dados importantes antes de pagar ou fornecer informações pessoais.');
    }
    if (type == AnalysisType.site || type == AnalysisType.link) {
      items.add('Digite manualmente o endereço oficial da empresa ou use o aplicativo oficial em vez do link recebido.');
    }
    if (type == AnalysisType.pix || type == AnalysisType.receipt) {
      items.add('Antes de confirmar o PIX, confira nome e instituição do beneficiário exibidos pelo seu banco.');
    }
    return items;
  }

  List<String> _nextStepsFor(AnalysisType type, {required bool payment}) {
    final steps = <String>[
      'Guarde prints, números, links e comprovantes caso precise contestar ou denunciar.',
      'Procure o canal oficial da instituição ou pessoa por conta própria e confirme a solicitação.',
    ];
    if (payment || type == AnalysisType.pix || type == AnalysisType.receipt) {
      steps.add('Se já houve PIX suspeito, contate imediatamente seu banco e pergunte sobre contestação/MED.');
    }
    return steps;
  }

  bool _hasAny(String text, List<String> terms) => terms.any(text.contains);
}
