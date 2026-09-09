(function(){
  if(window.__safecheckFreemium240)return;
  window.__safecheckFreemium240=true;

  const BILLING_URL=SUPABASE_URL+'/functions/v1/safecheck-billing';
  const PAID_ANALYZE_URL=SUPABASE_URL+'/functions/v1/safecheck-paid-analyze';
  const FREE_LIMIT=5;
  const FREE_USAGE_KEY='safecheck_free_usage_v240';
  const LOCAL_HISTORY_KEY='safecheck_local_history_v240';
  const PENDING_PLAN_KEY='safecheck_pending_plan_v240';
  let billingState={plan:'free',status:'guest',used:0,limit:0,checkout:null};
  let billingBusy=false;

  const shield='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.7c2.8 1.8 5.7 2.7 8.2 3.2v5.9c0 4.8-2.8 8.1-8.2 10.7-5.4-2.6-8.2-5.9-8.2-10.7V5.9C6.3 5.4 9.2 4.5 12 2.7Z"/><path d="m8.2 12.1 2.3 2.3 5.3-5.7"/></svg>';
  const crown='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 7 4 4 4-6 4 6 4-4-1.5 10H5.5L4 7Z"/><path d="M6 20h12"/></svg>';
  const cloud='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 18.5h10a4 4 0 0 0 .6-7.95A6.2 6.2 0 0 0 6.4 9.1 4.7 4.7 0 0 0 7.5 18.5Z"/><path d="m9.5 14 2.5-2.5 2.5 2.5M12 11.5v5"/></svg>';
  const userIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.3"/><path d="M5.2 20a6.8 6.8 0 0 1 13.6 0"/></svg>';

  function injectCss(){
    if(document.getElementById('safecheck-freemium-240'))return;
    const s=document.createElement('style');s.id='safecheck-freemium-240';s.textContent=`
      .plan-banner{display:flex;align-items:center;gap:12px;padding:14px 15px;margin:0 0 16px;border:1px solid #17515a;border-radius:18px;background:linear-gradient(145deg,#071c24,#092b31);box-shadow:0 8px 26px rgba(0,0,0,.18)}
      .plan-banner-icon{width:42px;height:42px;border-radius:13px;display:grid;place-items:center;background:#0b3438;color:#35dfb8;flex:0 0 42px}.plan-banner-icon svg,.plan-symbol svg{width:23px;height:23px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
      .plan-banner-copy{flex:1;min-width:0}.plan-banner-copy b{display:block;font-size:14px}.plan-banner-copy small{display:block;margin-top:3px;color:#96abad;font-size:11px;line-height:1.4}.plan-banner-btn{border:1px solid #267066;background:#0d3a38;color:#a4efdb;border-radius:11px;padding:9px 10px;font-size:11px;font-weight:900;white-space:nowrap}
      .plans-title{margin-bottom:5px}.plans-lead{color:#93aaac;line-height:1.5;font-size:13px;margin-bottom:16px}.plans-grid{display:grid;grid-template-columns:1fr;gap:12px}.plan-card{position:relative;padding:18px;border:1px solid #173d45;border-radius:20px;background:linear-gradient(145deg,#06171f,#08242b);overflow:hidden}.plan-card.featured{border-color:#258d76;box-shadow:0 0 0 1px rgba(32,217,169,.1),0 12px 32px rgba(0,0,0,.2)}.plan-card.current{border-color:#3ad9b3}.plan-top{display:flex;align-items:center;gap:12px}.plan-symbol{width:44px;height:44px;border-radius:14px;display:grid;place-items:center;background:#0b3438;color:#36ddb7;flex:0 0 44px}.plan-name{font-size:18px;font-weight:900}.plan-price{font-size:21px;font-weight:950;margin:15px 0 4px}.plan-period{font-size:11px;color:#8fa7aa;font-weight:600}.plan-features{list-style:none;padding:0;margin:14px 0}.plan-features li{font-size:12px;line-height:1.45;margin:7px 0;color:#c9d8d9;padding-left:20px;position:relative}.plan-features li:before{content:'✓';position:absolute;left:0;color:#35d9b3;font-weight:900}.plan-action{width:100%;border:0;border-radius:12px;padding:12px;font-weight:900;background:linear-gradient(135deg,#0c9c82,#18b994);color:#fff}.plan-action.secondary{background:#0a2930;border:1px solid #24555a;color:#a8e5da}.plan-action:disabled{opacity:.55}.plan-badge{position:absolute;right:14px;top:14px;border-radius:999px;padding:5px 8px;font-size:9px;font-weight:900;background:#0e3f34;color:#82e8be}.free-note{margin-top:12px;padding:12px;border-radius:14px;background:#071920;border:1px solid #17363d;color:#91a8aa;font-size:11px;line-height:1.5}
      .account-block{display:flex;align-items:center;gap:12px}.account-avatar{width:48px;height:48px;border-radius:15px;background:#0b3035;color:#37dbb5;display:grid;place-items:center}.account-avatar svg{width:25px;height:25px;fill:none;stroke:currentColor;stroke-width:1.7}.account-copy{flex:1}.account-copy b{display:block}.account-copy small{color:#8da4a7;font-size:11px}.usage-track{height:8px;border-radius:99px;background:#14323a;overflow:hidden;margin-top:10px}.usage-track i{display:block;height:100%;background:linear-gradient(90deg,#10a889,#2cdbb3);border-radius:99px}.guest-history .history-card{margin-bottom:11px}.paywall-box{text-align:center;padding:26px 18px}.paywall-box .plan-symbol{margin:0 auto 13px}.paywall-box h3{margin-bottom:8px}.paywall-box p{color:#91a8aa;font-size:13px;line-height:1.5}
      body.senior-light .plan-banner,body.senior-light .plan-card{background:#fff!important;border:2px solid #bdd1d3!important;color:#10242a!important}.senior-light .plan-banner-copy small,.senior-light .plans-lead,.senior-light .plan-period,.senior-light .free-note,.senior-light .account-copy small,.senior-light .paywall-box p{color:#425e63!important}.senior-light .plan-features li{color:#213e43!important}.senior-light .free-note{background:#f5faf9!important;border:2px solid #c5d7d8!important}.senior-light .plan-banner-icon,.senior-light .plan-symbol,.senior-light .account-avatar{background:#e5f6f2!important;color:#087b71!important}
    `;document.head.appendChild(s);
  }

  function todayKey(){return new Date().toISOString().slice(0,10)}
  function freeUsage(){try{const x=JSON.parse(localStorage.getItem(FREE_USAGE_KEY)||'null');return x&&x.day===todayKey()?Math.max(0,Number(x.count)||0):0}catch{return 0}}
  function consumeFree(){const n=freeUsage()+1;try{localStorage.setItem(FREE_USAGE_KEY,JSON.stringify({day:todayKey(),count:n}))}catch{}return n}
  function localHistory(){try{const a=JSON.parse(localStorage.getItem(LOCAL_HISTORY_KEY)||'[]');return Array.isArray(a)?a:[]}catch{return[]}}
  function saveLocal(report){const a=localHistory();a.unshift({id:'local-'+Date.now(),type:report.type,preview:report.inputPreview||'',riskScore:report.riskScore,riskLevel:report.riskLevel,summary:report.summary,date:new Date().toISOString()});try{localStorage.setItem(LOCAL_HISTORY_KEY,JSON.stringify(a.slice(0,5)))}catch{}}
  function isPaid(){return billingState.plan==='pro'||billingState.plan==='premium'}
  function planLabel(p){return p==='premium'?'Premium':p==='pro'?'Pro':'Grátis'}
  function signedEmail(){return session?.user?.email||(()=>{try{const p=session?.access_token?.split('.')[1];if(!p)return'';const n=p.replace(/-/g,'+').replace(/_/g,'/');return JSON.parse(atob(n+'='.repeat((4-n.length%4)%4))).email||''}catch{return''}})()}

  async function refreshBilling(silent=true){
    if(!session){billingState={plan:'free',status:'guest',used:0,limit:0,checkout:null};window.__safecheckBilling=billingState;enhance();return billingState}
    if(billingBusy)return billingState;billingBusy=true;
    try{const s=await ensureSession();if(!s)throw new Error('session');const data=await jsonFetch(BILLING_URL,{method:'GET',headers:authHeaders(s.access_token)},12000);billingState=data;window.__safecheckBilling=data;return data}
    catch(e){if(!silent)toast('Não foi possível atualizar a assinatura agora.');return billingState}
    finally{billingBusy=false;enhance()}
  }
  window.refreshSafeCheckBilling=()=>refreshBilling(false);

  function showGuestApp(){
    if(session)return;$('auth')?.classList.add('hidden');$('app')?.classList.remove('hidden');
    const home=document.querySelector('.nav[data-tab="home"]');try{window.go('home',home)}catch(_){ }
    setTimeout(enhance,30);
  }
  window.openSafeCheckLogin=function(plan){try{if(plan)localStorage.setItem(PENDING_PLAN_KEY,plan)}catch{};$('app')?.classList.add('hidden');$('auth')?.classList.remove('hidden');try{showLogin()}catch{};notice('loginNotice','Entre ou crie uma conta para assinar um plano e sincronizar seu histórico.','info');};

  function planBanner(){
    const page=document.querySelector('#content .page');if(!page||page.querySelector('.plan-banner'))return;
    const used=isPaid()?Number(billingState.used||0):freeUsage(),limit=isPaid()?Number(billingState.limit||0):FREE_LIMIT,remaining=Math.max(0,limit-used);
    const b=document.createElement('div');b.className='plan-banner';b.innerHTML=`<div class="plan-banner-icon">${isPaid()?crown:shield}</div><div class="plan-banner-copy"><b>${isPaid()?'Plano '+planLabel(billingState.plan):'Modo Grátis'}</b><small>${isPaid()?`${used} de ${limit} análises usadas neste mês`:`${remaining} de ${FREE_LIMIT} análises locais restantes hoje · sem cadastro`}</small></div><button class="plan-banner-btn" onclick="openPlans()">${isPaid()?'Meu plano':'Ver planos'}</button>`;
    const first=page.firstElementChild;page.insertBefore(b,first||null);
  }

  function features(p){
    if(p==='pro')return['100 análises por mês','IA híbrida antifraude','Histórico em nuvem','OCR de imagem e PDF','Sincronização entre aparelhos'];
    if(p==='premium')return['500 análises por mês','Tudo do plano Pro','Relatório avançado de URL','Histórico em nuvem','Limites ampliados para documentos'];
    return['5 análises locais por dia','Mensagem, link, PIX, oferta e perfil','Abre sem login','Histórico local das 5 últimas análises'];
  }
  function planCard(p,price,featured=false){const current=billingState.plan===p||(p==='free'&&!isPaid());const fs=features(p).map(x=>`<li>${esc(x)}</li>`).join('');let action='';if(p==='free')action=`<button class="plan-action secondary" disabled>${current?'Plano atual':'Grátis'}</button>`;else if(current)action=`<button class="plan-action secondary" disabled>Plano atual</button>`;else if(isPaid())action=`<button class="plan-action secondary" onclick="toast('Para evitar cobrança duplicada, a troca de plano fica bloqueada enquanto sua assinatura atual estiver ativa.')">Troca protegida</button>`;else action=`<button class="plan-action" onclick="startPaidPlan('${p}')">Assinar ${p==='pro'?'Pro':'Premium'}</button>`;return `<div class="plan-card ${featured?'featured':''} ${current?'current':''}">${featured?'<span class="plan-badge">RECOMENDADO</span>':''}<div class="plan-top"><div class="plan-symbol">${p==='free'?shield:crown}</div><div><div class="plan-name">${p==='free'?'Grátis':p==='pro'?'Pro':'Premium'}</div><div class="plan-period">${p==='free'?'Para começar':'Assinatura mensal'}</div></div></div><div class="plan-price">${price}<span class="plan-period">${p==='free'?'':' / mês'}</span></div><ul class="plan-features">${fs}</ul>${action}</div>`}

  window.openPlans=function(){
    const c=$('content');if(!c)return;document.querySelectorAll('.nav').forEach(n=>n.classList.remove('active'));
    c.innerHTML=`<div class="page"><h1 class="plans-title">Escolha sua proteção</h1><p class="plans-lead">Use o SafeCheck gratuitamente sem cadastro. Quando quiser IA híbrida, histórico na nuvem e análise de arquivos, escolha um plano pago.</p><div class="plans-grid">${planCard('free','R$ 0')}${planCard('pro','R$ 19,90',true)}${planCard('premium','R$ 39,90')}</div><div class="free-note">Pagamentos são processados pelo Stripe em página segura. Para assinar é necessário entrar ou criar uma conta, pois o plano fica vinculado ao seu usuário. Nesta versão de testes, o Stripe está em modo de teste e não efetua cobrança real.</div><div style="height:90px"></div></div>`;
  };

  window.startPaidPlan=async function(plan){
    if(plan!=='pro'&&plan!=='premium')return;if(!session){openSafeCheckLogin(plan);return}
    const b=await refreshBilling(false);if(b.plan==='pro'||b.plan==='premium'){toast('Você já possui uma assinatura ativa.');return}
    const url=b?.checkout?.[plan];if(!url){toast('Checkout temporariamente indisponível.');return}
    try{localStorage.setItem(PENDING_PLAN_KEY,plan)}catch{};toast('Abrindo pagamento seguro…');setTimeout(()=>{window.location.href=url},250);
  };

  function renderGuestHistory(){const c=$('content'),items=localHistory();if(!c)return;const cards=items.map(x=>`<div class="card history-card"><div class="history-top"><span class="chip">${esc(typeLabel?.(x.type)||x.type||'Análise')}</span><span class="risk-pill risk-${esc(x.riskLevel)}">${esc(riskMeta(x.riskLevel)[0])}</span></div><h3 style="margin:10px 0 7px">${Number(x.riskScore)||0}% de risco</h3><div class="preview">${esc(x.preview)}</div><p class="muted mini" style="margin:9px 0 0">${esc(x.summary)}</p><div class="date" style="margin-top:11px">${new Date(x.date).toLocaleString('pt-BR')}</div></div>`).join('');c.innerHTML=`<div class="page guest-history"><h1>Histórico local</h1><p class="muted">No modo Grátis, as 5 análises mais recentes ficam somente neste aparelho. Pro e Premium sincronizam o histórico na nuvem.</p>${items.length?cards:'<div class="card empty">Você ainda não fez análises neste aparelho.</div>'}<button class="btn btn-primary" onclick="openPlans()">Ver planos com histórico em nuvem</button><div style="height:90px"></div></div>`}

  function renderFreemiumAccount(){
    const c=$('content');if(!c)return;const mail=signedEmail(),paid=isPaid(),used=paid?Number(billingState.used||0):freeUsage(),limit=paid?Number(billingState.limit||0):FREE_LIMIT,pct=limit?Math.min(100,Math.round(used/limit*100)):0;
    c.innerHTML=`<div class="page"><h1>Conta e plano</h1><p class="muted">Gerencie acesso, assinatura e sincronização.</p><div class="card"><div class="account-block"><div class="account-avatar">${userIcon}</div><div class="account-copy"><b>${session?esc(mail||'Conta SafeCheck'):'Modo Grátis sem cadastro'}</b><small>${session?'Conta conectada ao SafeCheck':'Você pode usar o app imediatamente sem criar conta.'}</small></div></div></div><div class="card"><div class="between row"><div><b>Plano ${planLabel(billingState.plan)}</b><div class="mini muted" style="margin-top:4px">${paid?`${used} de ${limit} análises neste mês`:`${used} de ${FREE_LIMIT} análises locais hoje`}</div></div><span class="chip">${paid?esc(String(billingState.status||'ativo')):'GRÁTIS'}</span></div><div class="usage-track"><i style="width:${pct}%"></i></div>${paid&&billingState.currentPeriodEnd?`<div class="mini muted" style="margin-top:10px">Período atual até ${new Date(billingState.currentPeriodEnd).toLocaleDateString('pt-BR')}</div>`:''}</div>${!session?`<button class="btn btn-primary" onclick="openSafeCheckLogin()">Entrar ou criar conta</button><div class="spacer"></div>`:`<button class="btn btn-soft" onclick="refreshSafeCheckBilling()">Restaurar / atualizar assinatura</button><div class="spacer"></div>`}<button class="btn btn-primary" onclick="openPlans()">${paid?'Ver meu plano':'Ver planos Pro e Premium'}</button>${session?`<div class="spacer"></div><button class="btn btn-danger" onclick="logout()">Sair da conta</button>`:''}<div class="free-note">O modo Grátis funciona localmente e não exige login. A IA híbrida e o histórico em nuvem são liberados nos planos Pro e Premium.</div><div style="height:90px"></div></div>`;
  }

  const originalGo=window.go;
  window.go=function(tab,el){
    document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('active',n.dataset.tab===tab));
    try{currentTab=tab}catch{}
    if(tab==='account'){renderFreemiumAccount();return}
    if(tab==='history'&&!isPaid()){renderGuestHistory();return}
    if(typeof originalGo==='function')originalGo(tab,el);
    setTimeout(enhance,25);
  };

  const originalLogout=window.logout;
  window.logout=function(){try{clearSession()}catch{session=null;try{localStorage.removeItem(SESSION_KEY)}catch{}}billingState={plan:'free',status:'guest',used:0,limit:0,checkout:null};showGuestApp();toast('Você voltou ao modo Grátis.');};

  const originalEnterApp=window.enterApp;
  if(typeof originalEnterApp==='function')window.enterApp=function(){originalEnterApp();setTimeout(async()=>{await refreshBilling(true);const p=localStorage.getItem(PENDING_PLAN_KEY);if(p&&!isPaid()){localStorage.removeItem(PENDING_PLAN_KEY);openPlans();toast('Conta conectada. Agora escolha o plano para continuar.')}else enhance()},120)};

  const previousResume=window.onSafeCheckResume;
  window.onSafeCheckResume=function(){try{previousResume&&previousResume()}catch{};if(session){const before=billingState.plan;setTimeout(async()=>{await refreshBilling(true);if(before==='free'&&isPaid())toast('Assinatura ativada: plano '+planLabel(billingState.plan)+'!')},800);setTimeout(()=>refreshBilling(true),3500)}};

  window.submitAnalysis=async function(){
    if(busy)return;const type=$('analysisType').value,text=$('analysisText').value.trim(),context=$('analysisContext').value.trim();if(!text&&!fileData){toast('Cole um conteúdo ou selecione um arquivo.');return}
    if(!isPaid()){
      if(type==='image'||type==='pdf'){openPlans();toast('OCR de imagem e PDF está disponível nos planos Pro e Premium.');return}
      const used=freeUsage();if(used>=FREE_LIMIT){openPlans();toast('Você usou as 5 análises gratuitas de hoje.');return}
      const combined=(text+' '+context+' '+(fileData?.text||'')).trim();setBusy('analyzeBtn',true,'Analisando localmente…');
      try{const local=window.localAnalyze(combined,type);lastReport={...local,mode:'local',inputPreview:text||fileData?.name||'Conteúdo',type,signals:{...(local.signals||{}),plan:'free_local'}};consumeFree();saveLocal(lastReport);window.renderResult(lastReport);setTimeout(()=>{const page=document.querySelector('#content .page');if(page&&!page.querySelector('.free-result-upsell')){const x=document.createElement('div');x.className='card free-result-upsell';x.innerHTML=`<b>Quer uma segunda análise com IA?</b><p class="muted mini" style="margin:6px 0 10px">Pro e Premium combinam OpenAI, regras antifraude e inteligência técnica do SafeCheck.</p><button class="btn btn-primary" onclick="openPlans()">Conhecer planos</button>`;page.appendChild(x)}},20)}catch(e){toast('Não foi possível concluir a análise local.')}finally{busy=false;setBusy('analyzeBtn',false)}return;
    }
    const s=await ensureSession();if(!s){billingState={plan:'free',status:'guest',used:0,limit:0};showGuestApp();toast('Sua sessão expirou. Você voltou ao modo Grátis.');return}
    const payload={type,context,fileName:fileData?.name||undefined,extractedText:fileData?.text||undefined};if(type==='url')payload.url=text;else payload.text=text;setBusy('analyzeBtn',true,'IA analisando…');
    try{const data=await jsonFetch(PAID_ANALYZE_URL,{method:'POST',headers:authHeaders(s.access_token),body:JSON.stringify(payload)},42000);if(data.billing){billingState={...billingState,...data.billing,status:'active'};window.__safecheckBilling=billingState}lastReport={...data,mode:'server',inputPreview:text||fileData?.name||'Conteúdo',type};setOnline(true);window.renderResult(lastReport);if(billingState.plan==='pro'&&type==='url')setTimeout(()=>document.querySelector('.url-intel-card')?.remove(),40)}catch(e){if(Number(e?.status)===402){billingState={plan:'free',status:'inactive',used:0,limit:0};openPlans();toast('A IA híbrida exige plano Pro ou Premium.')}else if(Number(e?.status)===429){openPlans();toast('Você atingiu o limite mensal do seu plano.')}else{toast(friendlyError(e)||'A análise está temporariamente indisponível.')}}finally{busy=false;setBusy('analyzeBtn',false)};
  };

  document.addEventListener('click',e=>{const q=e.target?.closest?.('.quick');if(!q||isPaid())return;const t=(q.textContent||'').toLowerCase();if(t.includes('print')||t.includes('pdf')){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();openPlans();toast('Análise de imagem e PDF está disponível no Pro e Premium.')}},true);

  function enhance(){injectCss();const appVisible=!$('app')?.classList.contains('hidden');if(appVisible){if(document.querySelector('.quick'))planBanner();if(currentTab==='account')renderFreemiumAccount();if(billingState.plan==='pro')document.querySelector('.url-intel-card')?.remove();}}

  injectCss();
  const stored=(()=>{try{return getStoredSession()}catch{return null}})();if(stored&&!session)session=stored;
  if(!session)showGuestApp();else{try{$('auth')?.classList.add('hidden');$('app')?.classList.remove('hidden')}catch{};refreshBilling(true)}
  setTimeout(enhance,100);
  new MutationObserver(()=>{clearTimeout(window.__freemiumEnhance);window.__freemiumEnhance=setTimeout(enhance,35)}).observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
})();