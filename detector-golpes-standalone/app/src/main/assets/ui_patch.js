(function () {
  if (window.__safecheckUiPatch210) return;
  window.__safecheckUiPatch210 = true;

  const LOGO = "https://safecheck.local/safecheck_logo.jpg";
  const THEME_KEY = "safecheck_theme_v210";

  const icons = {
    message: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4.8h16v11.4H8.6L4 19.7V4.8Z"/><path d="M8 9h8M8 12.5h5"/></svg>',
    url: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.8 14.2 14.2 9.8"/><path d="M7.1 16.9 5.4 18.6a3.5 3.5 0 0 1-5-5l3.2-3.2a3.5 3.5 0 0 1 5 0" transform="translate(3 0)"/><path d="m13.4 7.1 1.7-1.7a3.5 3.5 0 1 1 5 5l-3.2 3.2a3.5 3.5 0 0 1-5 0" transform="translate(-1 0)"/></svg>',
    pix: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.3 5.8 9.5a3.5 3.5 0 0 0 0 5L12 20.7l6.2-6.2a3.5 3.5 0 0 0 0-5L12 3.3Z"/><path d="m8.3 12 3.7-3.7 3.7 3.7-3.7 3.7L8.3 12Z"/></svg>',
    offer: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 5.5v6.7l8.3 8.3 8.7-8.7-8.3-8.3H5.5a2 2 0 0 0-2 2Z"/><circle cx="8" cy="8" r="1.5"/></svg>',
    image: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m5.5 17 4.2-4.2 3.2 3.2 2.2-2.2 3.4 3.2"/></svg>',
    pdf: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2.8h8l4 4V21H6V2.8Z"/><path d="M14 2.8V7h4M8.5 16v-5h2a1.6 1.6 0 0 1 0 3.2h-2M13.5 11v5h1.4a2.3 2.3 0 0 0 0-5h-1.4ZM18 11h2.8M18 13h2"/></svg>',
    profile: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="8" r="3"/><path d="M4.5 19a5.5 5.5 0 0 1 11 0M17 9.5h4M19 7.5v4"/></svg>',
    home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 11 9-7 9 7v9H7v-6h10v6"/></svg>',
    history: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 8.5A8 8 0 1 1 4 14"/><path d="M4.5 4.5v4h4M12 8v5l3 2"/></svg>',
    learn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h7V5h-7a3 3 0 0 0-3 3v12a3 3 0 0 1 3-3h7M9 20H5V5h4"/><path d="M12 9h4M12 12h4"/></svg>',
    account: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.3"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>'
  };

  function injectStyles() {
    if (document.getElementById('safecheck-ui-210')) return;
    const style = document.createElement('style');
    style.id = 'safecheck-ui-210';
    style.textContent = `
      :root{--sc-bg:#020b11;--sc-card:#061820;--sc-card2:#0a2029;--sc-line:#163a42;--sc-text:#f2f8f7;--sc-muted:#9bb0b2;--sc-brand:#061d25;--sc-accent:#20d9a9;--sc-accent2:#0fad91}
      body:not(.senior-light){background:var(--sc-bg)!important;color:var(--sc-text)!important}
      body:not(.senior-light) #app{background:var(--sc-bg)!important}
      body:not(.senior-light) .topbar{background:rgba(2,11,17,.96)!important;border-bottom-color:var(--sc-line)!important;color:var(--sc-text)!important}
      body:not(.senior-light) .auth-shell{background:linear-gradient(180deg,#03151b 0,#03151b 38%,#020b11 38%)!important}
      body:not(.senior-light) .auth-card,body:not(.senior-light) .card,body:not(.senior-light) .quick{background:var(--sc-card)!important;border-color:var(--sc-line)!important;color:var(--sc-text)!important;box-shadow:0 10px 30px rgba(0,0,0,.22)!important}
      body:not(.senior-light) .hero{background:linear-gradient(145deg,#04151c,#08333a)!important;border:1px solid #15545a!important;box-shadow:0 14px 38px rgba(0,0,0,.28)!important}
      body:not(.senior-light) .input,body:not(.senior-light) .file-box{background:#04141c!important;border-color:var(--sc-line)!important;color:var(--sc-text)!important}
      body:not(.senior-light) .muted,body:not(.senior-light) .quick small,body:not(.senior-light) .preview,body:not(.senior-light) .date,body:not(.senior-light) .risk-sub{color:var(--sc-muted)!important}
      body:not(.senior-light) .bottom-nav{background:#04131a!important;border-top-color:var(--sc-line)!important;box-shadow:0 -8px 25px rgba(0,0,0,.3)!important}
      body:not(.senior-light) .nav{color:#83989b!important} body:not(.senior-light) .nav.active{color:var(--sc-accent)!important}
      body:not(.senior-light) .gauge:after{background:var(--sc-card)!important}
      body:not(.senior-light) .score-safe{background:#0b252b!important;color:#d7efeb!important}
      body:not(.senior-light) .chip{background:#0b272d!important;color:#9ce7d6!important}
      body:not(.senior-light) .btn-soft{background:#0b2830!important;color:#9ce7d6!important;border:1px solid #1a4951!important}
      body:not(.senior-light) .notice.info{background:#09262d!important;color:#b5ddd7!important}
      body:not(.senior-light) .status-line{border-bottom-color:var(--sc-line)!important}
      body:not(.senior-light) .risk-very_low,body:not(.senior-light) .risk-low{background:#0c2e25!important;color:#71e0a7!important}
      body:not(.senior-light) .risk-moderate{background:#342810!important;color:#f3bd54!important}
      body:not(.senior-light) .risk-high{background:#3d2017!important;color:#ff9d6c!important}
      body:not(.senior-light) .risk-critical{background:#3c171c!important;color:#ff7b80!important}
      body:not(.senior-light) h1,body:not(.senior-light) h2,body:not(.senior-light) h3,body:not(.senior-light) b,body:not(.senior-light) label{color:var(--sc-text)}
      .btn-primary{background:linear-gradient(135deg,#0d9c83,#16b998)!important;color:#fff!important}
      .brand-logo-img{width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block}
      .brand .shield{width:58px!important;height:58px!important;border:0!important;border-radius:17px!important;overflow:hidden!important;background:#061820!important;box-shadow:0 8px 24px rgba(0,0,0,.28)}
      .top-brand .mini-shield{width:42px!important;height:42px!important;border-radius:13px!important;overflow:hidden!important;padding:0!important;background:#061820!important;box-shadow:0 5px 16px rgba(0,0,0,.2)}
      .top-brand b{font-size:18px!important}.top-brand .mini{font-size:11px!important}
      .pro-icon{width:44px;height:44px;border-radius:14px;display:grid;place-items:center;background:linear-gradient(145deg,#0a2930,#0c3940);border:1px solid #1d5256;margin-bottom:12px}
      .pro-icon svg,.nav svg{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
      .pro-icon{color:#38d8b6}.quick{min-height:142px!important;align-items:flex-start!important;text-align:left!important}.quick b{font-size:15px!important}.quick small{font-size:12px!important}
      .nav span{height:24px;display:grid;place-items:center}.nav svg{width:22px;height:22px}
      .top-actions{display:flex;align-items:center;gap:10px}.senior-toggle{border:1px solid #1f5358;background:#08242b;color:#b8ebe1;border-radius:12px;min-width:42px;height:38px;font-weight:900;padding:0 9px}
      .developer-footer{margin-top:22px;padding:15px;border:1px solid var(--sc-line);border-radius:18px;background:linear-gradient(145deg,#06171f,#08232a);display:flex;align-items:center;gap:12px}
      .developer-footer img{width:42px;height:42px;border-radius:13px;object-fit:cover}.developer-footer b{display:block;font-size:13px}.developer-footer small{display:block;color:#8fa9aa;margin-top:3px;font-size:11px}
      .senior-card{margin-top:14px}.senior-card .btn{margin-top:12px}.senior-card h3{margin-bottom:7px}
      body.senior-light{--ink:#10242a;--muted:#425e63;--brand:#0c3f43;--accent:#087b71;--bg:#fff;--card:#fff;--line:#b8ccce;background:#fff!important;color:#10242a!important;font-size:18px!important}
      body.senior-light #app{background:#fff!important} body.senior-light .topbar{background:#fff!important;border-bottom:2px solid #b5c9cc!important}
      body.senior-light .auth-shell{background:linear-gradient(180deg,#07383d 0,#07383d 34%,#fff 34%)!important}
      body.senior-light .auth-card,body.senior-light .card,body.senior-light .quick{background:#fff!important;border:2px solid #c1d1d3!important;box-shadow:0 5px 16px rgba(8,50,54,.08)!important;color:#10242a!important}
      body.senior-light .hero{background:#07383d!important;color:#fff!important;border:0!important}
      body.senior-light .input,body.senior-light .file-box{background:#fff!important;border:2px solid #9eb9bc!important;color:#10242a!important}
      body.senior-light .muted,body.senior-light .quick small,body.senior-light .preview,body.senior-light .date,body.senior-light .risk-sub{color:#425e63!important}
      body.senior-light .bottom-nav{background:#fff!important;border-top:2px solid #b5c9cc!important;height:78px!important}
      body.senior-light .nav{color:#506a6e!important;font-size:12px!important}.senior-light .nav.active{color:#087b71!important}
      body.senior-light .btn{min-height:54px;font-size:16px!important}.senior-light .link-btn{font-size:15px!important}.senior-light .quick{min-height:155px!important}.senior-light .quick b{font-size:17px!important}.senior-light .quick small{font-size:14px!important;line-height:1.5!important}
      body.senior-light h1{font-size:30px!important}body.senior-light h2{font-size:25px!important}body.senior-light h3{font-size:20px!important}body.senior-light p,body.senior-light li{font-size:16px!important;line-height:1.6!important}
      body.senior-light .gauge:after{background:#fff!important}.senior-light .score-safe{background:#e9f5f2!important;color:#123f3c!important}.senior-light .developer-footer{background:#f3f8f8!important;border:2px solid #c1d1d3!important}.senior-light .developer-footer b{color:#10242a!important}.senior-light .developer-footer small{color:#425e63!important}
      body.senior-light .senior-toggle{background:#07383d;color:#fff;border-color:#07383d}
    `;
    document.head.appendChild(style);
  }

  function logoHTML() { return '<img class="brand-logo-img" src="' + LOGO + '" alt="SafeCheck AI">'; }
  function applyBranding() {
    document.querySelectorAll('.shield,.mini-shield').forEach(el => { if (!el.querySelector('img')) el.innerHTML = logoHTML(); });
    const authTitle = document.querySelector('.brand b'); if (authTitle) authTitle.textContent = 'SafeCheck AI';
    const authSub = document.querySelector('.brand small'); if (authSub) authSub.textContent = 'Proteção digital contra golpes';
    const topTitle = document.querySelector('.top-brand b'); if (topTitle) topTitle.textContent = 'SafeCheck AI';
    const topSub = document.querySelector('.top-brand .mini'); if (topSub) topSub.textContent = 'Proteção digital · versão 2.1';
  }
  function iconSvg(type) { return icons[type] || icons.message; }
  window.quick = function (_icon, title, desc, type) { return `<button class="quick" onclick="openAnalyze('${type}')"><div class="pro-icon">${iconSvg(type)}</div><div><b>${title}</b><br><small>${desc}</small></div></button>`; };
  function upgradeNav() {
    document.querySelectorAll('.nav').forEach(btn => { const span = btn.querySelector('span'); if (!span) return; const key = btn.dataset.tab === 'home' ? 'home' : btn.dataset.tab === 'history' ? 'history' : btn.dataset.tab === 'learn' ? 'learn' : 'account'; if (!span.querySelector('svg')) span.innerHTML = iconSvg(key); });
  }
  function developerFooter() { return `<div class="developer-footer"><img src="${LOGO}" alt="SafeCheck AI"><div><b>Carlos Alisson Silva Falcão Lins</b><small>Desenvolvedor · CEO Impulso Digital</small></div></div>`; }
  function ensureFooter() { const page = document.querySelector('#content .page'); if (page && !page.querySelector('.developer-footer')) page.insertAdjacentHTML('beforeend', developerFooter()); }
  function ensureTopActions() {
    const topbar = document.querySelector('.topbar'); if (!topbar) return; const dot = document.getElementById('onlineDot'); if (!dot) return; if (dot.parentElement?.classList.contains('top-actions')) return;
    const wrap = document.createElement('div'); wrap.className = 'top-actions'; const button = document.createElement('button'); button.className = 'senior-toggle'; button.id = 'seniorToggle'; button.setAttribute('aria-label','Alternar modo claro e acessível'); button.onclick = window.toggleSeniorMode;
    dot.parentNode.insertBefore(wrap,dot); wrap.appendChild(button); wrap.appendChild(dot); updateThemeButton();
  }
  function ensureSeniorCard() {
    if (typeof currentTab === 'undefined' || currentTab !== 'account') return; const page = document.querySelector('#content .page'); if (!page || page.querySelector('.senior-card')) return;
    const card = document.createElement('div'); card.className = 'card senior-card'; card.innerHTML = `<h3>Leitura facilitada</h3><p class="muted mini">Modo claro para idosos aumenta contraste, tamanho dos textos e áreas de toque. A preferência fica salva neste aparelho.</p><button class="btn btn-soft" onclick="toggleSeniorMode()">Alternar modo claro / padrão</button>`;
    const logoutButton = page.querySelector('.btn-danger'); if (logoutButton) page.insertBefore(card,logoutButton); else page.appendChild(card);
  }
  function updateThemeButton() { const b = document.getElementById('seniorToggle'); if (!b) return; b.textContent = document.body.classList.contains('senior-light') ? 'Escuro' : 'Aa Claro'; }
  function applyTheme(mode) { const senior = mode === 'senior'; document.body.classList.toggle('senior-light', senior); try { localStorage.setItem(THEME_KEY, senior ? 'senior' : 'dark'); } catch (_) {} if (window.SafeCheckNative?.setSeniorMode) SafeCheckNative.setSeniorMode(senior); updateThemeButton(); }
  window.toggleSeniorMode = function () { applyTheme(document.body.classList.contains('senior-light') ? 'dark' : 'senior'); };

  function has(re, text) { return re.test(text); }
  function pushUnique(arr, msg) { if (!arr.includes(msg)) arr.push(msg); }
  function classify(score) { return score >= 85 ? 'critical' : score >= 70 ? 'high' : score >= 50 ? 'moderate' : score >= 25 ? 'low' : 'very_low'; }
  function summary(level) { return ({critical:'Risco muito alto. Interrompa o contato, não pague e não compartilhe dados.',high:'Há vários sinais consistentes com engenharia social ou tentativa de golpe.',moderate:'Há sinais relevantes de risco. Confirme a identidade antes de continuar.',low:'Existem alguns pontos de atenção; confirme a origem antes de agir.',very_low:'Poucos sinais clássicos foram encontrados, mas isso não garante segurança.'})[level]; }
  function clientSafetyFloor(report, raw, type) {
    const r = report || {}; const t = String(raw || '').normalize('NFKC').toLowerCase(); let floor = Number(r.riskScore) || 0; const reasons = Array.isArray(r.reasons) ? [...r.reasons] : []; const recommendations = Array.isArray(r.recommendations) ? [...r.recommendations] : [];
    const payment = has(/pix|transfer[êe]ncia|dep[oó]sito|pagamento|pague|valor a receber/,t); const unknown = has(/n[aã]o conhe(c|ç)|n[aã]o conhecia|desconhecid[oa]|nunca falei|pessoa que n[aã]o conhe[cç]o|n[uú]mero desconhecido/,t); const channel = has(/whatsapp|telegram|envie seu whatsapp|passa seu whatsapp|me chama|falamos mais|chama no zap/,t); const bait = has(/tenho (um )?pix para (te|lhe|voc[eê]) enviar|vou (te|lhe) enviar (um )?pix|pix para (te|lhe|voc[eê]) enviar|dinheiro para (te|lhe) enviar/,t);
    if (unknown) { floor = Math.max(floor, 48); pushUnique(reasons,'Você informou que não conhece a pessoa ou remetente.'); }
    if (channel) { floor = Math.max(floor, 45); pushUnique(reasons,'Há tentativa de mover a conversa para WhatsApp/Telegram ou outro canal privado.'); }
    if (payment) floor = Math.max(floor, 38);
    if (bait) { floor = Math.max(floor, 72); pushUnique(reasons,'A promessa de enviar um PIX funciona como isca para manter o contato e merece alta cautela.'); }
    if (payment && unknown) floor = Math.max(floor, 70); if (payment && channel) floor = Math.max(floor, 72); if (unknown && channel) floor = Math.max(floor, 74); if (payment && unknown && channel) floor = Math.max(floor, 84); if (bait && unknown && channel) floor = Math.max(floor, 90);
    floor = Math.min(100, Math.round(floor)); const level = classify(floor);
    if (floor >= 70) { pushUnique(recommendations,'Não continue a conversa nem envie dados pessoais antes de confirmar a identidade por outro canal confiável.'); pushUnique(recommendations,'Não clique em links nem faça transferências solicitadas durante esse contato.'); }
    return {...r,riskScore:floor,safeScore:100-floor,riskLevel:level,summary:floor>(Number(r.riskScore)||0)?summary(level):(r.summary||summary(level)),reasons,recommendations};
  }
  const originalLocalAnalyze = window.localAnalyze;
  if (typeof originalLocalAnalyze === 'function') window.localAnalyze = function (raw, type) { return clientSafetyFloor(originalLocalAnalyze(raw,type), raw, type); };
  window.submitAnalysis = async function () {
    if (busy) return; const type = $('analysisType').value; const text = $('analysisText').value.trim(); const context = $('analysisContext').value.trim(); if (!text && !fileData) { toast('Cole um conteúdo ou selecione um arquivo.'); return; }
    const s = await ensureSession(); if (!s) { toast('Sua sessão expirou. Entre novamente.'); logout(); return; } const payload = {type,context,fileName:fileData?.name||undefined,extractedText:fileData?.text||undefined}; if (type === 'url') payload.url = text; else payload.text = text; const combined = (text + ' ' + context + ' ' + (fileData?.text || '')).trim();
    setBusy('analyzeBtn',true,'Analisando no servidor…');
    try { const data = await jsonFetch(ANALYZE_URL,{method:'POST',headers:authHeaders(s.access_token),body:JSON.stringify(payload)},18000); const hardened = clientSafetyFloor(data,combined,type); lastReport = {...hardened,mode:'server',inputPreview:text||fileData?.name||'Arquivo',type}; setOnline(true); renderResult(lastReport); }
    catch (e) { setOnline(false); const local = window.localAnalyze(combined,type); lastReport = {...local,mode:'local',inputPreview:text||fileData?.name||'Arquivo',type,error:friendlyError(e)}; renderResult(lastReport); toast('Servidor indisponível: exibindo análise local de emergência.'); }
    finally { busy = false; }
  };
  function enhance() { applyBranding(); upgradeNav(); ensureTopActions(); ensureSeniorCard(); ensureFooter(); }
  injectStyles(); let initialTheme = 'dark'; try { initialTheme = localStorage.getItem(THEME_KEY) || 'dark'; } catch (_) {} applyTheme(initialTheme); enhance(); const target = document.getElementById('app') || document.body; new MutationObserver(() => { clearTimeout(window.__scEnhance); window.__scEnhance=setTimeout(enhance,25); }).observe(target,{childList:true,subtree:true});
})();
