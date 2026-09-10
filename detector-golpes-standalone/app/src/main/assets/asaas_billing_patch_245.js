(function(){
  if(window.__safecheckAsaas245)return;
  window.__safecheckAsaas245=true;

  const CHECKOUT_URL=SUPABASE_URL+'/functions/v1/safecheck-checkout';
  const MANAGE_URL=SUPABASE_URL+'/functions/v1/safecheck-subscription-manage';
  const active=b=>!!b&&(b.plan==='pro'||b.plan==='premium')&&['active','trialing'].includes(String(b.status||''));
  const label=p=>p==='premium'?'Premium':p==='pro'?'Pro':'Grátis';

  async function currentSession(){
    try{return await ensureSession()}catch{return session||null}
  }

  async function callFunction(url,payload){
    const s=await currentSession();
    if(!s?.access_token)throw new Error('Entre na sua conta para continuar.');
    const response=await fetch(url,{method:'POST',headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+s.access_token,'Content-Type':'application/json'},body:JSON.stringify(payload)});
    let data={};try{data=await response.json()}catch{}
    if(!response.ok)throw new Error(data.message||data.error||'Não foi possível concluir a operação.');
    return data;
  }

  window.startPaidPlan=async function(plan){
    if(plan!=='pro'&&plan!=='premium')return;
    let b=window.__safecheckBilling||{};
    try{if(window.refreshSafeCheckBilling)b=await window.refreshSafeCheckBilling()}catch{}
    if(active(b)){
      if(String(b.plan)===plan){toast('Este já é o seu plano atual.');return}
      return window.changeSafeCheckPlan(plan);
    }
    if(!session){try{openSafeCheckLogin(plan)}catch{};return}
    try{
      toast('Preparando checkout seguro do Asaas…');
      const data=await callFunction(CHECKOUT_URL,{plan});
      if(!data?.url)throw new Error('Checkout indisponível.');
      try{localStorage.setItem('safecheck_pending_plan_v240',plan)}catch{}
      setTimeout(()=>{window.location.href=data.url},180);
    }catch(e){toast(e?.message||'Não foi possível abrir o checkout Asaas.');}
  };

  window.changeSafeCheckPlan=async function(plan){
    if(plan!=='pro'&&plan!=='premium')return;
    const b=window.__safecheckBilling||{};
    if(!active(b)){return window.startPaidPlan(plan)}
    if(String(b.plan)===plan){toast('Este já é o seu plano atual.');return}
    if(!confirm('Programar a troca para '+label(plan)+' na próxima renovação?'))return;
    try{
      await callFunction(MANAGE_URL,{action:'change_plan',plan});
      toast('Troca para '+label(plan)+' programada para a próxima renovação.');
      setTimeout(()=>window.refreshSafeCheckBilling&&window.refreshSafeCheckBilling(),500);
    }catch(e){toast(e?.message||'Não foi possível trocar o plano.');}
  };

  window.cancelSafeCheckSubscription=async function(){
    const b=window.__safecheckBilling||{};
    if(!active(b)){toast('Nenhuma assinatura paga ativa.');return}
    if(!confirm('Cancelar a renovação do plano '+label(b.plan)+'? O acesso permanece até o fim do período já pago.'))return;
    try{
      await callFunction(MANAGE_URL,{action:'cancel'});
      toast('Renovação cancelada. Seu acesso permanece até o fim do período já pago.');
      setTimeout(()=>window.refreshSafeCheckBilling&&window.refreshSafeCheckBilling(),500);
    }catch(e){toast(e?.message||'Não foi possível cancelar a renovação.');}
  };

  window.manageSafeCheckSubscription=function(){
    const b=window.__safecheckBilling||{};
    if(!active(b)){try{window.openPlans()}catch{};return}
    const target=String(b.plan)==='pro'?'premium':'pro';
    const action=confirm('OK: trocar para '+label(target)+' na próxima renovação.\nCancelar: manter o plano atual e voltar.')?window.changeSafeCheckPlan(target):null;
    return action;
  };

  function enhance(){
    const b=window.__safecheckBilling||{};
    document.querySelectorAll('.safecheck-portal-plan-note').forEach(el=>{el.textContent='Assinaturas SafeCheck são processadas pelo Asaas. Trocas e cancelamento são feitos na área da conta e só valem para recursos identificados como SafeCheck.'});
    document.querySelectorAll('.legal-billing-card p').forEach(el=>{if(el.textContent?.includes('Stripe'))el.textContent=active(b)?'Gerencie a assinatura SafeCheck pelo Asaas sem alterar cobranças de outros produtos.':'Consulte os documentos oficiais e os planos do SafeCheck.'});
    document.querySelectorAll('.portal-action').forEach(btn=>{
      if(!active(b))return;
      btn.textContent='Gerenciar assinatura Asaas';
      btn.onclick=()=>{
        const box=document.createElement('div');
        box.className='legal-billing-card';
        box.innerHTML=`<h3>Minha assinatura</h3><p>Plano atual: ${label(b.plan)}${b.pendingPlan?' · troca para '+label(b.pendingPlan)+' agendada':''}${b.cancelAtPeriodEnd?' · renovação cancelada':''}</p><div class="legal-billing-actions"><button class="portal-action change">Trocar para ${b.plan==='pro'?'Premium':'Pro'}</button>${!b.cancelAtPeriodEnd?'<button class="legal-action cancel">Cancelar renovação</button>':''}</div>`;
        btn.closest('.legal-billing-card')?.after(box);
        box.querySelector('.change')?.addEventListener('click',()=>window.changeSafeCheckPlan(b.plan==='pro'?'premium':'pro'));
        box.querySelector('.cancel')?.addEventListener('click',()=>window.cancelSafeCheckSubscription());
        btn.disabled=true;
      };
    });
  }

  const observer=new MutationObserver(()=>setTimeout(enhance,20));
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  setTimeout(enhance,250);
})();
