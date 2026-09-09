(() => {
'use strict';

const $ = id => document.getElementById(id);
let lastInput = '';
let applying = false;
let awaitingResult = false;

const clamp = n => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));

function riskProfile(risk) {
  risk = clamp(risk);
  if (risk >= 90) return { key:'critical', label:'RISCO CRÍTICO', short:'CRÍTICO', accent:'#ff3347', tone:'red', summary:'Há uma chance muito alta de golpe. Interrompa a ação, não faça pagamentos, não abra links e não compartilhe dados antes de confirmar tudo por um canal oficial independente.' };
  if (risk >= 80) return { key:'very-high', label:'ALTO RISCO DE GOLPE', short:'MUITO ALTO', accent:'#ff4d5e', tone:'red', summary:'Foram detectados sinais relevantes de golpe. Não faça ou devolva PIX, não clique em links e não compartilhe seus dados antes de validar a origem da mensagem.' };
  if (risk >= 70) return { key:'high', label:'RISCO ALTO', short:'ALTO', accent:'#ff7a38', tone:'orange', summary:'Há vários sinais suspeitos. Evite pagamentos, links e envio de dados até confirmar a identidade e o contexto por um canal oficial.' };
  if (risk >= 60) return { key:'moderate', label:'RISCO MODERADO', short:'MODERADO', accent:'#ffbd45', tone:'amber', summary:'Existem sinais relevantes de risco. Verifique com cuidado antes de confiar, pagar, clicar ou compartilhar informações.' };
  if (risk >= 50) return { key:'attention', label:'ATENÇÃO', short:'ATENÇÃO', accent:'#ffd84a', tone:'yellow', summary:'Existem pontos que exigem atenção. Confirme a origem e os dados antes de prosseguir.' };
  if (risk >= 30) return { key:'caution', label:'CUIDADO', short:'CUIDADO', accent:'#40d89b', tone:'green', summary:'O risco estimado é baixo, mas ainda é recomendável confirmar a origem antes de tomar uma decisão importante.' };
  return { key:'low', label:'BAIXO RISCO', short:'BAIXO', accent:'#22d890', tone:'green', summary:'Poucos sinais de golpe foram encontrados. Ainda assim, nenhuma análise garante que algo seja 100% seguro.' };
}

function inspectText(text) {
  const t = String(text || '').normalize('NFKC').toLowerCase();
  let risk = 5;
  const flags = [];
  const findings = [];
  const add = (condition, value, flag, finding) => {
    if (!condition) return;
    risk += value;
    if (flag) flags.push(flag);
    if (finding) findings.push(finding);
  };

  const payment = /\b(pix|pagamento|pague|transfer[eê]ncia|dep[oó]sito|boleto|dinheiro)\b/i.test(t);
  const unexpectedGift = /\b(presente|pr[eê]mio|premio|brinde|sorteio|ganhou|ganhei|benef[ií]cio|pix\s+(?:de\s+)?presente|pix\s+gr[aá]tis)\b/i.test(t);
  const asksContact = /(envie|manda|mande|passe|informe|me d[eê]).{0,28}(seu\s+)?(n[uú]mero|telefone|whatsapp|contato)|(qual|me passa).{0,18}(n[uú]mero|whatsapp)/i.test(t);
  const promisedLink = /(envio|enviar|mandar|mando|vou\s+mandar|vou\s+enviar).{0,28}(o\s+)?link|link.{0,24}(depois|em seguida|para voc[eê])/i.test(t);
  const directLink = /https?:\/\/|www\.|bit\.ly|tinyurl|cutt\.ly|rb\.gy/i.test(t);
  const unknown = /(n[aã]o\s+conhe[cç]o|n[aã]o\s+conhecia|desconhecid[oa]|nunca\s+falei|nunca\s+vi)/i.test(t);
  const urgency = /\b(agora|urgente|imediatamente|j[aá]|hoje|[uú]ltima chance|expira)\b/i.test(t);
  const credential = /(senha|password|otp|token|c[oó]digo.{0,18}(sms|seguran[cç]a|verifica[cç][aã]o)|cvv|pin)/i.test(t);
  const remote = /(anydesk|teamviewer|rustdesk|acesso remoto|compartilh.{0,12}tela)/i.test(t);
  const advanceFee = /(taxa.{0,24}(liberar|receber|resgatar)|pague.{0,24}(receber|liberar)|dep[oó]sito de garantia)/i.test(t);
  const impersonation = /(central do banco|central de seguran[cç]a|setor antifraude|receita federal|pol[ií]cia|gerente da sua conta)/i.test(t);
  const investment = /(retorno garantido|lucro garantido|renda garantida|sem risco|dobrar.{0,15}dinheiro)/i.test(t);

  add(payment, 15, 'Pagamento / PIX', 'Existe solicitação ou contexto envolvendo pagamento, transferência ou PIX.');
  add(unexpectedGift, 25, 'Oferta / presente inesperado', 'A mensagem oferece presente, prêmio, benefício ou PIX inesperado, um padrão que exige verificação adicional.');
  add(asksContact, 20, 'Pedido de contato', 'A mensagem pede telefone, WhatsApp ou outro dado de contato para continuar a conversa.');
  add(promisedLink, 20, 'Link prometido', 'A pessoa informa que enviará um link posteriormente; o destino deve ser verificado antes de abrir.');
  add(directLink, 12, 'Link', 'Há link ou endereço externo associado à mensagem.');
  add(unknown, 15, 'Remetente desconhecido', 'Você indicou que não conhece o remetente ou não possui relação prévia com ele.');
  add(urgency, 8, 'Pressa / urgência', 'A mensagem usa pressa ou urgência para acelerar sua decisão.');
  add(credential, 35, 'Credencial sensível', 'Há pedido ou menção a senha, OTP, token, CVV ou código de segurança.');
  add(remote, 40, 'Acesso remoto', 'Há pedido ou ferramenta de acesso remoto, um sinal de risco elevado.');
  add(advanceFee, 38, 'Taxa antecipada', 'Há cobrança antecipada para liberar dinheiro, prêmio, crédito ou serviço.');
  add(impersonation, 28, 'Possível falsa autoridade', 'Há sinais de possível personificação de banco, órgão público ou setor de segurança.');
  add(investment, 35, 'Promessa financeira', 'Há promessa financeira incompatível com risco real de investimento.');

  if (payment && unexpectedGift && asksContact && (promisedLink || directLink)) risk = Math.max(risk, 82);
  if (unexpectedGift && unknown && (asksContact || promisedLink || directLink)) risk = Math.max(risk, 78);
  if (credential || remote || advanceFee) risk = Math.max(risk, 82);

  return { risk: clamp(risk), flags:[...new Set(flags)], findings:[...new Set(findings)] };
}

function addUniqueListItems(list, items) {
  if (!list || !items?.length) return;
  const existing = [...list.querySelectorAll('li')].map(li => li.textContent.trim().toLowerCase());
  for (const text of items) {
    if (!text || existing.includes(text.toLowerCase())) continue;
    const li = document.createElement('li');
    li.textContent = text;
    list.appendChild(li);
    existing.push(text.toLowerCase());
  }
}

function addUniqueFlags(box, items) {
  if (!box || !items?.length) return;
  const existing = [...box.querySelectorAll('span')].map(el => el.textContent.trim().toLowerCase());
  for (const text of items) {
    if (!text || existing.includes(text.toLowerCase())) continue;
    const span = document.createElement('span');
    span.textContent = text;
    box.appendChild(span);
    existing.push(text.toLowerCase());
  }
}

function ensureRiskGuide() {
  const result = $('result');
  const summary = $('summaryBanner');
  if (!result || !summary || $('riskGuide')) return;
  const guide = document.createElement('article');
  guide.id = 'riskGuide';
  guide.className = 'result-card risk-guide';
  guide.innerHTML = `
    <div class="risk-guide-title"><span class="risk-bars"><i></i><i></i><i></i></span><b>Escala de risco</b></div>
    <div class="risk-scale">
      <div class="risk-scale-item scale-low"><strong>0–49</strong><span>Baixo risco</span><small>Cuidado</small></div>
      <div class="risk-scale-item scale-attention"><strong>50–59</strong><span>Atenção</span><small>Verifique</small></div>
      <div class="risk-scale-item scale-moderate"><strong>60–69</strong><span>Moderado</span><small>Mais sinais</small></div>
      <div class="risk-scale-item scale-high"><strong>70–79</strong><span>Alto</span><small>Provável risco</small></div>
      <div class="risk-scale-item scale-critical"><strong>80–100</strong><span>Muito alto</span><small>Chance de golpe</small></div>
    </div>`;
  summary.insertAdjacentElement('afterend', guide);
}

function installStyles() {
  if ($('riskUiStyles')) return;
  const style = document.createElement('style');
  style.id = 'riskUiStyles';
  style.textContent = `
    #result{--risk-accent:#22d890;--risk-soft:rgba(34,216,144,.12)}
    #result .score-card{transition:border-color .22s ease,background .22s ease,box-shadow .22s ease}
    #result .score-card .eyebrow{color:var(--risk-accent)!important}
    #result .score strong{color:var(--risk-accent);text-shadow:0 0 24px color-mix(in srgb,var(--risk-accent) 18%,transparent)}
    #result .risk-badge{color:var(--risk-accent)!important;border:1px solid color-mix(in srgb,var(--risk-accent) 46%,transparent)!important;background:color-mix(in srgb,var(--risk-accent) 12%,transparent)!important;max-width:180px;text-align:center;line-height:1.2}
    #result .summary-banner{border-left-color:var(--risk-accent)!important;background:linear-gradient(90deg,color-mix(in srgb,var(--risk-accent) 10%,#0c1a2b),#0c1a2b);font-weight:600}
    #result.risk-stage-red .score-card{border-color:color-mix(in srgb,var(--risk-accent) 62%,#1d3249);background:radial-gradient(circle at 88% 10%,color-mix(in srgb,var(--risk-accent) 17%,transparent),transparent 44%),linear-gradient(150deg,#1e1220,#0d1929);box-shadow:0 0 26px color-mix(in srgb,var(--risk-accent) 8%,transparent)}
    #result.risk-stage-orange .score-card,#result.risk-stage-amber .score-card,#result.risk-stage-yellow .score-card{border-color:color-mix(in srgb,var(--risk-accent) 48%,#1d3249);background:radial-gradient(circle at 88% 10%,color-mix(in srgb,var(--risk-accent) 13%,transparent),transparent 44%),linear-gradient(150deg,#151c28,#0d1929)}
    #result.risk-stage-red .flags span{border-color:color-mix(in srgb,var(--risk-accent) 55%,#334156);color:#ff9aa3;background:color-mix(in srgb,var(--risk-accent) 8%,#1d2632)}
    #result.risk-stage-orange .flags span{border-color:rgba(255,122,56,.45);color:#ffad84}
    .risk-guide{padding:15px 15px 13px!important}
    .risk-guide-title{display:flex;align-items:center;gap:9px;margin-bottom:12px;font-size:13px}
    .risk-bars{display:flex;align-items:flex-end;gap:2px;width:19px;height:18px}
    .risk-bars i{display:block;width:4px;border-radius:2px;background:var(--risk-accent)}
    .risk-bars i:nth-child(1){height:7px}.risk-bars i:nth-child(2){height:12px}.risk-bars i:nth-child(3){height:17px}
    .risk-scale{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}
    .risk-scale-item{min-width:0;text-align:center;padding:9px 4px 7px;border-radius:11px;border:1px solid #26394c;background:#0a1725;display:grid;gap:3px}
    .risk-scale-item strong{font-size:10px;color:#f5f8fb}.risk-scale-item span{font-size:8px;font-weight:900}.risk-scale-item small{font-size:7px;color:#71899e}
    .scale-low span{color:#31dc9a}.scale-attention span{color:#ffd84a}.scale-moderate span{color:#ffbd45}.scale-high span{color:#ff8a45}.scale-critical span{color:#ff5363}
    .risk-scale-item.active{border-color:var(--risk-accent);background:color-mix(in srgb,var(--risk-accent) 12%,#0a1725);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--risk-accent) 20%,transparent)}
    .risk-score-caption{font-size:9px;color:#7890aa;margin-top:4px;font-weight:700;letter-spacing:.04em}
    @media(max-width:430px){.risk-scale{gap:4px}.risk-scale-item{padding:8px 2px 6px}.risk-scale-item strong{font-size:9px}.risk-scale-item span{font-size:7px}.risk-scale-item small{display:none}}
  `;
  document.head.appendChild(style);
}

function currentText() {
  return lastInput || String($('checkInput')?.value || '');
}

function updateGuideActive(profile) {
  const guide = $('riskGuide');
  if (!guide) return;
  const selector = profile.key === 'critical' || profile.key === 'very-high' ? '.scale-critical' : profile.key === 'high' ? '.scale-high' : profile.key === 'moderate' ? '.scale-moderate' : profile.key === 'attention' ? '.scale-attention' : '.scale-low';
  guide.querySelectorAll('.risk-scale-item').forEach(el => el.classList.toggle('active', el.matches(selector)));
}

function applyRiskPresentation(forceCapture = false) {
  if (applying) return;
  const result = $('result');
  const scoreEl = $('score');
  const riskEl = $('risk');
  if (!result || !scoreEl || !riskEl || result.classList.contains('hidden')) return;

  const rawScore = parseInt(scoreEl.textContent, 10);
  if (!Number.isFinite(rawScore)) return;

  const lastDisplayed = scoreEl.dataset.riskDisplayed;
  if (forceCapture || awaitingResult || !lastDisplayed || String(rawScore) !== lastDisplayed) {
    scoreEl.dataset.internalSafe = String(rawScore);
    awaitingResult = false;
  }

  const internalSafe = clamp(parseInt(scoreEl.dataset.internalSafe || rawScore, 10));
  const baseRisk = clamp(100 - internalSafe);
  const heuristic = inspectText(currentText());
  const displayedRisk = Math.max(baseRisk, heuristic.risk);
  const profile = riskProfile(displayedRisk);
  const displayedText = String(displayedRisk);

  applying = true;
  try {
    if (scoreEl.textContent !== displayedText) scoreEl.textContent = displayedText;
    scoreEl.dataset.riskDisplayed = displayedText;
    scoreEl.setAttribute('aria-label', `${displayedRisk} de 100 de risco estimado de golpe`);

    const eyebrow = result.querySelector('.score-card .eyebrow');
    if (eyebrow && eyebrow.textContent !== 'RISCO DE GOLPE') eyebrow.textContent = 'RISCO DE GOLPE';

    if (riskEl.textContent !== profile.label) riskEl.textContent = profile.label;
    if (riskEl.className !== 'risk-badge') riskEl.className = 'risk-badge';
    riskEl.style.removeProperty('color');

    result.style.setProperty('--risk-accent', profile.accent);
    const desiredStage = 'risk-stage-' + profile.tone;
    if (!result.classList.contains(desiredStage)) {
      result.classList.remove('risk-stage-red','risk-stage-orange','risk-stage-amber','risk-stage-yellow','risk-stage-green');
      result.classList.add(desiredStage);
    }

    const summary = $('summaryBanner');
    if (summary && summary.textContent !== profile.summary) summary.textContent = profile.summary;

    addUniqueListItems($('findings'), heuristic.findings);
    addUniqueFlags($('flags'), heuristic.flags);

    if (displayedRisk >= 70) {
      addUniqueListItems($('actions'), [
        'Não forneça telefone, WhatsApp, senha, código ou documento antes de confirmar quem está falando com você.',
        'Não abra o link que for enviado sem verificar primeiro o domínio e a origem.',
        'Não faça nem devolva PIX por solicitação do contato sem confirmar o recebedor por um canal oficial independente.'
      ]);
    }

    ensureRiskGuide();
    updateGuideActive(profile);
  } finally {
    applying = false;
  }
}

function patchHistory() {
  let stored = [];
  try { stored = JSON.parse(localStorage.getItem('safecheck_history') || '[]') || []; } catch (_) {}
  document.querySelectorAll('.history-item').forEach(item => {
    const score = item.querySelector('.history-score b');
    const label = item.querySelector('.history-score small');
    if (!score || !label || score.dataset.riskHistory === '1') return;
    const safe = clamp(parseInt(score.textContent,10));
    const row = stored.find(x => String(x.id) === String(item.dataset.id));
    const h = inspectText(row?.raw || '');
    const risk = Math.max(100 - safe, h.risk);
    const p = riskProfile(risk);
    score.textContent = String(risk);
    score.style.color = p.accent;
    label.textContent = p.short;
    score.dataset.riskHistory = '1';
  });
}

function setAiAnswer(type) {
  const answer = $('aiAnswer');
  const score = clamp(parseInt($('score')?.textContent || '0',10));
  if (!answer) return;
  if (type === 'payment') {
    answer.textContent = score >= 60
      ? 'Não recomendo fazer ou devolver PIX nem realizar outro pagamento enquanto os sinais não forem esclarecidos. Confirme identidade, recebedor e empresa por um canal oficial aberto por você.'
      : 'O risco estimado é baixo, mas isso não prova legitimidade. Confira o nome do recebedor, o contexto e a proteção ao comprador antes de pagar.';
  } else if (type === 'verify') {
    answer.textContent = 'Confirme a identidade por um segundo canal independente. Não use o telefone ou link fornecido na própria mensagem; procure o contato oficial por conta própria.';
  } else {
    answer.textContent = score >= 70
      ? 'Não envie novos dados. Informe apenas que fará a confirmação por um canal oficial. Se houver pressão, bloqueie o contato e preserve as evidências.'
      : 'Responda sem fornecer dados sensíveis e confirme a identidade por outro canal antes de continuar.';
  }
}

function hookInputs() {
  $('checkBtn')?.addEventListener('click', () => {
    lastInput = String($('checkInput')?.value || '');
    awaitingResult = true;
  }, true);

  document.addEventListener('click', e => {
    const history = e.target.closest?.('.history-item');
    if (history) {
      try {
        const rows = JSON.parse(localStorage.getItem('safecheck_history') || '[]') || [];
        lastInput = String(rows.find(x => String(x.id) === String(history.dataset.id))?.raw || '');
        awaitingResult = true;
      } catch (_) {}
    }

    const ai = e.target.closest?.('[data-ai]');
    if (ai) {
      e.preventDefault();
      e.stopImmediatePropagation();
      setAiAnswer(ai.dataset.ai);
    }
  }, true);

  const bridge = window.SafeCheckNativeBridge;
  if (bridge?.receiveSharedText) {
    const original = bridge.receiveSharedText.bind(bridge);
    bridge.receiveSharedText = text => { lastInput = String(text || ''); awaitingResult = true; return original(text); };
  }
  if (bridge?.receiveNativeExtraction) {
    const original = bridge.receiveNativeExtraction.bind(bridge);
    bridge.receiveNativeExtraction = payload => {
      const pieces = [];
      if (Array.isArray(payload?.barcodes)) pieces.push(...payload.barcodes);
      if (payload?.text) pieces.push(payload.text);
      lastInput = pieces.join('\n\n');
      awaitingResult = true;
      return original(payload);
    };
  }
}

installStyles();
hookInputs();
ensureRiskGuide();

const observer = new MutationObserver(() => {
  if (applying) return;
  queueMicrotask(() => {
    applyRiskPresentation(false);
    patchHistory();
  });
});
observer.observe(document.body, {subtree:true, childList:true, characterData:true});

setTimeout(() => { applyRiskPresentation(true); patchHistory(); }, 150);
})();
