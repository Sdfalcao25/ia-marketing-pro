(function(){
  if(window.__safecheckRiskPatch220)return;
  window.__safecheckRiskPatch220=true;

  function uniquePush(arr,msg){if(msg&&!arr.includes(msg))arr.push(msg)}
  function classify(score){return score>=85?'critical':score>=70?'high':score>=50?'moderate':score>=25?'low':'very_low'}
  function summary(l){return({critical:'Risco muito alto. Interrompa a ação, não pague e não compartilhe dados sensíveis.',high:'Há sinais fortes de endereço enganoso, domínio recente ou engenharia social.',moderate:'Existem sinais relevantes de risco. Confirme a origem antes de continuar.',low:'O conteúdo não está plenamente verificado. Confirme a origem antes de agir.',very_low:'Poucos sinais de risco foram encontrados em uma fonte reconhecida, mas isso não é garantia absoluta.'})[l]}
  const trusted=['google.com','microsoft.com','live.com','apple.com','amazon.com','github.com','wikipedia.org','openai.com','chatgpt.com','gov.br','paypal.com','mercadopago.com.br','nubank.com.br','itau.com.br','bradesco.com.br','santander.com.br','bb.com.br','caixa.gov.br','bcb.gov.br'];
  const exactOrSub=(h,d)=>h===d||h.endsWith('.'+d);
  const isTrusted=h=>trusted.some(d=>exactOrSub(h,d));

  function urlFloor(raw){
    let floor=0;const reasons=[];let u;
    const value=String(raw||'').trim();
    try{u=new URL(/^https?:\/\//i.test(value)?value:'https://'+value)}catch(_){return{floor:70,reasons:['A URL informada não possui formato confiável.']}}
    const host=u.hostname.toLowerCase(),path=(u.pathname+u.search).toLowerCase();
    if(!isTrusted(host)){floor=Math.max(floor,25);uniquePush(reasons,'O domínio não é uma fonte amplamente reconhecida pelo modo local; ele deve ser tratado como não verificado.')}
    if(u.protocol!=='https:'){floor=Math.max(floor,45);uniquePush(reasons,'O endereço não utiliza HTTPS.')}
    if(host.includes('xn--')){floor=Math.max(floor,55);uniquePush(reasons,'O domínio usa punycode e pode imitar caracteres de outro endereço.')}
    if(/^\d{1,3}(\.\d{1,3}){3}$/.test(host)){floor=Math.max(floor,60);uniquePush(reasons,'A URL utiliza um endereço IP no lugar de um domínio.')}
    if(u.username||u.password||value.includes('@')){floor=Math.max(floor,60);uniquePush(reasons,'A URL contém @ ou credenciais e pode mascarar o destino real.')}
    const sensitive=/\b(bank|banco|login|signin|sign-in|secure|verify|wallet|pix|payment|pagamento|checkout|conta|account|senha|password|cartao|cartão)\b/i.test(path.replace(/[\/_-]+/g,' '));
    const unrelated=/(xvideos|porn|xxx|sex|adult|flix|stream|filme|series|anime|torrent|download|games?|jogos?)/i.test(host);
    if(sensitive&&unrelated){floor=Math.max(floor,70);uniquePush(reasons,'O caminho da URL menciona banco, login ou pagamento em um domínio de categoria incompatível.')}
    if(/\b(bit\.ly|tinyurl\.com|t\.co|cutt\.ly|is\.gd|rebrand\.ly|rb\.gy)\b/i.test(host)){floor=Math.max(floor,55);uniquePush(reasons,'O endereço usa encurtador e pode esconder o destino final.')}
    return{floor,reasons};
  }

  function harden(report,primary,combined,type){
    const r=report||{};const text=String(combined||primary||'').normalize('NFKC').toLowerCase();let floor=Number(r.riskScore)||0;const reasons=Array.isArray(r.reasons)?[...r.reasons]:[];const recommendations=Array.isArray(r.recommendations)?[...r.recommendations]:[];
    const payment=/pix|transfer[êe]ncia|dep[oó]sito|pagamento|valor a receber/.test(text);
    const unknown=/n[aã]o conhe(c|ç)|n[aã]o conhecia|desconhecid[oa]|nunca falei|n[uú]mero desconhecido/.test(text);
    const channel=/whatsapp|telegram|envie uma mensagem neste n[uú]mero|mande mensagem neste n[uú]mero|basta enviar uma mensagem|basta mandar uma mensagem|falamos mais/.test(text);
    const pixBait=/tenho (um )?pix (para|pra) (te|lhe|voc[eê])|tem (um )?pix (para|pra) (te|lhe|voc[eê])|voc[eê] (tem|recebeu|ganhou) (um )?pix|pix (dispon[ií]vel|liberado) (para|pra) voc[eê]/.test(text);
    const linkFollow=/te envio (o )?link|lhe envio (o )?link|envio (o )?link|mando (o )?link|receber[aá] (o )?link/.test(text);
    if(unknown){floor=Math.max(floor,48);uniquePush(reasons,'Você informou que não conhece a pessoa ou remetente.')}
    if(channel){floor=Math.max(floor,45);uniquePush(reasons,'Há tentativa de iniciar ou mover a conversa para outro número/canal privado.')}
    if(payment)floor=Math.max(floor,38);
    if(pixBait){floor=Math.max(floor,65);uniquePush(reasons,'A promessa de um PIX pode funcionar como isca para manter o contato.')}
    if(pixBait&&channel)floor=Math.max(floor,80);
    if(pixBait&&linkFollow)floor=Math.max(floor,82);
    if(payment&&channel&&linkFollow)floor=Math.max(floor,82);
    if(payment&&unknown&&channel)floor=Math.max(floor,84);
    if(pixBait&&unknown&&channel)floor=Math.max(floor,90);

    if(type==='url'){
      const uf=urlFloor(primary);floor=Math.max(floor,uf.floor);uf.reasons.forEach(x=>uniquePush(reasons,x));
      const sig=r.signals||{};const age=Number(sig.domain_age_days);
      if(Number.isFinite(age)){
        if(age<7){floor=Math.max(floor,80);uniquePush(reasons,'O domínio tem menos de 7 dias de registro.')}
        else if(age<30){floor=Math.max(floor,70);uniquePush(reasons,'O domínio tem menos de 30 dias e ainda possui pouquíssimo histórico de reputação.')}
        else if(age<90){floor=Math.max(floor,60);uniquePush(reasons,'O domínio tem menos de 90 dias e exige cautela adicional.')}
      }
      if(sig.verified_threat_intel){floor=Math.max(floor,96);uniquePush(reasons,'Uma fonte de inteligência de ameaças confirmou sinal de risco para a URL.')}
    }

    floor=Math.min(100,Math.round(floor));const l=classify(floor);
    if(floor>=50)uniquePush(recommendations,'Não clique, pague ou informe dados antes de confirmar o domínio e a origem por uma fonte independente.');
    if(floor>=70)uniquePush(recommendations,'Evite continuar a interação até confirmar a identidade e o endereço oficial por outro canal.');
    return{...r,riskScore:floor,safeScore:100-floor,riskLevel:l,summary:floor>(Number(r.riskScore)||0)?summary(l):(r.summary||summary(l)),reasons,recommendations};
  }

  const previousLocal=window.localAnalyze;
  if(typeof previousLocal==='function')window.localAnalyze=function(raw,type){const base=previousLocal(raw,type);const candidate=type==='url'?(String(raw).match(/https?:\/\/[^\s]+/i)?.[0]||String(raw).split(/\s+/)[0]):raw;return harden(base,candidate,raw,type)};

  window.submitAnalysis=async function(){
    if(busy)return;const type=$('analysisType').value;const text=$('analysisText').value.trim(),context=$('analysisContext').value.trim();if(!text&&!fileData){toast('Cole um conteúdo ou selecione um arquivo.');return}
    const s=await ensureSession();if(!s){toast('Sua sessão expirou. Entre novamente.');logout();return}
    const payload={type,context,fileName:fileData?.name||undefined,extractedText:fileData?.text||undefined};if(type==='url')payload.url=text;else payload.text=text;const combined=(text+' '+context+' '+(fileData?.text||'')).trim();
    setBusy('analyzeBtn',true,'Analisando domínio e sinais…');
    try{const data=await jsonFetch(ANALYZE_URL,{method:'POST',headers:authHeaders(s.access_token),body:JSON.stringify(payload)},22000);const checked=harden(data,text,combined,type);lastReport={...checked,mode:'server',inputPreview:text||fileData?.name||'Arquivo',type};setOnline(true);renderResult(lastReport)}
    catch(e){setOnline(false);const local=window.localAnalyze(combined,type);lastReport={...local,mode:'local',inputPreview:text||fileData?.name||'Arquivo',type,error:friendlyError(e)};renderResult(lastReport);toast('Servidor indisponível: exibindo análise local conservadora.')}
    finally{busy=false}
  };

  window.riskMeta=function(l){return{very_low:['Baixo','#25945f'],low:['Cautela','#7ecb72'],moderate:['Atenção','#d89a28'],high:['Alto','#d46b2d'],critical:['Crítico','#cb4236']}[l]||['Não verificado','#61767a']};
  function refreshBrandVersion(){const sub=document.querySelector('.top-brand .mini');if(sub)sub.textContent='Proteção digital · versão 2.2'}
  refreshBrandVersion();new MutationObserver(()=>{clearTimeout(window.__risk220Brand);window.__risk220Brand=setTimeout(refreshBrandVersion,60)}).observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
})();
