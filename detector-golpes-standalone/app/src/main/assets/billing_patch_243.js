(function(){
  if(window.__safecheckBillingPatch243)return;
  window.__safecheckBillingPatch243=true;
  const PENDING='safecheck_pending_plan_v240';
  let activationTimer=null;
  const state=()=>window.__safecheckBilling||{plan:'free',status:'guest',checkout:null};
  const isActive=b=>!!b&&(b.plan==='pro'||b.plan==='premium')&&(['active','trialing'].includes(String(b.status||''))||b.status==='active');
  const label=p=>p==='premium'?'Premium':p==='pro'?'Pro':'Grátis';
  function stopPoll(){if(activationTimer){clearInterval(activationTimer);activationTimer=null}}
  async function fresh(){try{return await window.refreshSafeCheckBilling()}catch{return state()}}
  function markActivated(b){stopPoll();try{localStorage.removeItem(PENDING)}catch{};toast('Pagamento confirmado. Plano '+label(b.plan)+' ativado no SafeCheck!');try{window.go('account',document.querySelector('.nav[data-tab="account"]'))}catch{}}
  function watchActivation(plan){stopPoll();let attempts=0;const check=async()=>{attempts++;const b=await fresh();if(isActive(b)){markActivated(b);return}if(attempts>=36){stopPoll();toast('Aguardando confirmação do Stripe. Se você já pagou, use Restaurar / atualizar assinatura na Conta.')}};setTimeout(check,1200);activationTimer=setInterval(check,2500)}

  window.startPaidPlan=async function(plan){
    if(plan!=='pro'&&plan!=='premium')return;
    try{localStorage.setItem(PENDING,plan)}catch{}
    if(!session){openSafeCheckLogin(plan);return}
    const b=await fresh();
    if(isActive(b)){toast('Você já possui o plano '+label(b.plan)+' ativo. Uma segunda assinatura não será criada.');try{window.go('account',document.querySelector('.nav[data-tab="account"]'))}catch{}return}
    const url=b?.checkout?.[plan];
    if(!url){toast('Checkout temporariamente indisponível. Tente novamente em alguns segundos.');return}
    toast('Abrindo pagamento seguro do Stripe…');
    watchActivation(plan);
    setTimeout(()=>{window.location.href=url},180);
  };

  const previousEnter=window.enterApp;
  if(typeof previousEnter==='function')window.enterApp=function(){const wanted=(()=>{try{return localStorage.getItem(PENDING)}catch{return null}})();previousEnter();if(wanted==='pro'||wanted==='premium'){setTimeout(async()=>{try{localStorage.setItem(PENDING,wanted)}catch{};const b=await fresh();if(isActive(b))markActivated(b);else window.startPaidPlan(wanted)},700)}};

  const previousResume=window.onSafeCheckResume;
  window.onSafeCheckResume=function(){try{previousResume&&previousResume()}catch{};setTimeout(async()=>{if(!session)return;const b=await fresh();if(isActive(b)){const wanted=(()=>{try{return localStorage.getItem(PENDING)}catch{return null}})();if(wanted)markActivated(b)}},900)};
})();
