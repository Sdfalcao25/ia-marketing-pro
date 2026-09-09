(function(){
  if(window.__safecheckAudit242)return;
  window.__safecheckAudit242=true;

  const FREE_USAGE_KEY='safecheck_free_usage_v240';
  const LOCAL_DAY_KEY='safecheck_free_local_day_v242';
  function localDay(){return new Date().toLocaleDateString('en-CA')}
  function utcDay(){return new Date().toISOString().slice(0,10)}
  function normalizeFreeDay(){
    try{
      const ld=localDay(),ud=utcDay(),previous=localStorage.getItem(LOCAL_DAY_KEY);
      const current=JSON.parse(localStorage.getItem(FREE_USAGE_KEY)||'null');
      if(previous!==ld){localStorage.setItem(LOCAL_DAY_KEY,ld);localStorage.setItem(FREE_USAGE_KEY,JSON.stringify({day:ud,count:0}));return}
      if(current&&current.day!==ud)localStorage.setItem(FREE_USAGE_KEY,JSON.stringify({day:ud,count:Math.max(0,Number(current.count)||0)}));
    }catch(_){ }
  }
  normalizeFreeDay();
  setInterval(normalizeFreeDay,60000);

  const exactOrSub=(host,domain)=>host===domain||host.endsWith('.'+domain);
  const trusted=['google.com','microsoft.com','live.com','apple.com','amazon.com','github.com','wikipedia.org','openai.com','chatgpt.com','gov.br','paypal.com','mercadopago.com.br','nubank.com.br','itau.com.br','bradesco.com.br','santander.com.br','bb.com.br','caixa.gov.br','bcb.gov.br'];
  const brands={nubank:['nubank.com.br'],itau:['itau.com.br'],bradesco:['bradesco.com.br'],santander:['santander.com.br'],caixa:['caixa.gov.br'],mercadopago:['mercadopago.com.br'],paypal:['paypal.com'],google:['google.com'],microsoft:['microsoft.com','live.com'],apple:['apple.com'],amazon:['amazon.com','amazon.com.br']};
  const classify=score=>score>=85?'critical':score>=70?'high':score>=50?'moderate':score>=25?'low':'very_low';
  const push=(arr,msg)=>{if(msg&&!arr.includes(msg))arr.push(msg)};

  const previousLocal=window.localAnalyze;
  if(typeof previousLocal==='function'){
    window.localAnalyze=function(raw,type){
      normalizeFreeDay();
      const base=previousLocal(raw,type);
      if(type!=='url')return base;
      let score=Math.max(0,Math.min(100,Number(base?.riskScore)||0));
      const reasons=Array.isArray(base?.reasons)?[...base.reasons]:[];
      const recommendations=Array.isArray(base?.recommendations)?[...base.recommendations]:[];
      try{
        const value=String(raw||'').trim();
        const candidate=(value.match(/https?:\/\/[^\s]+/i)||[])[0]||value.split(/\s+/)[0]||value;
        const url=new URL(/^https?:/i.test(candidate)?candidate:'https://'+candidate);
        const host=url.hostname.toLowerCase();
        const isTrusted=trusted.some(domain=>exactOrSub(host,domain));
        const whole=(host+url.pathname+url.search).toLowerCase();
        if(/^\d{1,3}(\.\d{1,3}){3}$/.test(host)){score=Math.max(score,60);push(reasons,'A URL utiliza um endereço IP no lugar de um domínio.')}
        if(url.username||url.password||candidate.includes('@')){score=Math.max(score,60);push(reasons,'A URL contém @ ou credenciais e pode mascarar o destino real.')}
        const tld=host.split('.').pop()||'';
        if(['zip','mov','top','click','work','gq','tk','ml','cf','ga','xyz'].includes(tld)){score=Math.max(score,40);push(reasons,'A extensão do domínio exige cautela adicional.')}
        if((host.match(/\./g)||[]).length>=4){score=Math.max(score,35);push(reasons,'O endereço possui muitos níveis de subdomínio e merece verificação adicional.')}
        const sensitive=/bank|banco|login|signin|secure|verify|wallet|pix|payment|pagamento|checkout|conta|account|senha|password/i.test(url.pathname);
        if(sensitive&&!isTrusted){score=Math.max(score,50);push(reasons,'O endereço não verificado contém caminho relacionado a login, banco ou pagamento.')}
        for(const [brand,domains] of Object.entries(brands)){
          if(whole.includes(brand)&&!domains.some(domain=>exactOrSub(host,domain))){score=Math.max(score,75);push(reasons,'A URL menciona uma marca conhecida fora de um domínio oficial reconhecido.');break}
        }
      }catch(_){score=Math.max(score,70);push(reasons,'A URL informada não possui formato confiável.')}
      score=Math.round(Math.min(100,score));
      if(score>=50)push(recommendations,'Não clique, pague ou informe dados antes de confirmar o domínio por uma fonte independente.');
      const level=classify(score);
      return{...base,riskScore:score,safeScore:100-score,riskLevel:level,reasons,recommendations,summary:score>(Number(base?.riskScore)||0)?(score>=85?'Risco muito alto. Interrompa a ação e não compartilhe dados sensíveis.':score>=70?'Há sinais fortes de endereço enganoso ou phishing.':score>=50?'Existem sinais relevantes de risco. Confirme a origem antes de continuar.':base.summary):base.summary};
    };
  }

  const previousSubmit=window.submitAnalysis;
  if(typeof previousSubmit==='function')window.submitAnalysis=function(){normalizeFreeDay();return previousSubmit.apply(this,arguments)};

  const previousLogout=window.logout;
  window.logout=async function(){
    let access='';
    try{access=session?.access_token||getStoredSession?.()?.access_token||''}catch(_){ }
    if(access){
      try{await fetch(SUPABASE_URL+'/auth/v1/logout',{method:'POST',headers:{apikey:PUBLISHABLE_KEY,Authorization:'Bearer '+access}})}catch(_){ }
    }
    if(typeof previousLogout==='function')return previousLogout();
    try{clearSession()}catch(_){ }
  };
})();
