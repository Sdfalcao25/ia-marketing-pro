(function(){
  if(window.__safecheckLegalBilling244)return;
  window.__safecheckLegalBilling244=true;

  const SITE='https://safecheck-ai-jy2owv.v2.appdeploy.ai/';
  const LEGAL={terms:SITE+'#terms',privacy:SITE+'#privacy',refunds:SITE+'#refunds'};
  const active=b=>!!b&&(b.plan==='pro'||b.plan==='premium')&&['active','trialing'].includes(String(b.status||''));

  function css(){
    if(document.getElementById('safecheck-legal-244'))return;
    const s=document.createElement('style');s.id='safecheck-legal-244';s.textContent=`
      .legal-billing-card{margin:14px 0;padding:16px;border:1px solid #17434a;border-radius:18px;background:linear-gradient(145deg,#061920,#08252b)}
      .legal-billing-card h3{margin:0 0 7px;font-size:15px}.legal-billing-card p{margin:0 0 12px;color:#8fa6a8;font-size:11px;line-height:1.5}
      .legal-billing-actions{display:grid;grid-template-columns:1fr;gap:8px}.legal-billing-actions button{width:100%;border-radius:11px;padding:11px 12px;font-size:11px;font-weight:900}
      .portal-action{border:0;background:linear-gradient(135deg,#0c9c82,#18b994);color:#fff}.legal-action{border:1px solid #24555a;background:#08272e;color:#a8e5da}
      .legal-mini{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}.legal-mini button{border:0;background:transparent;color:#70cdb9;padding:3px 0;font-size:10px;text-decoration:underline;text-underline-offset:2px}
      body.senior-light .legal-billing-card{background:#fff!important;border:2px solid #bdd1d3!important;color:#10242a!important}body.senior-light .legal-billing-card p{color:#425e63!important}
    `;document.head.appendChild(s);
  }

  window.openSafeCheckLegal=function(kind){const url=LEGAL[kind]||LEGAL.terms;window.location.href=url};

  window.manageSafeCheckSubscription=async function(){
    if(!session){try{openSafeCheckLogin()}catch{};return}
    let b=window.__safecheckBilling||{};
    try{if(window.refreshSafeCheckBilling)b=await window.refreshSafeCheckBilling()}catch{}
    if(!active(b)){toast('Você ainda não possui uma assinatura paga ativa.');try{window.openPlans()}catch{};return}
    if(b.portalUrl){toast('Abrindo o Portal do Cliente Stripe…');setTimeout(()=>{window.location.href=b.portalUrl},180);return}
    toast('O Portal do Cliente Stripe ainda precisa ser ativado na conta. Sua assinatura continua normal.');
  };

  function enhancePlans(){
    const b=window.__safecheckBilling||{};if(!active(b))return;
    document.querySelectorAll('.plan-card').forEach(card=>{
      const name=(card.querySelector('.plan-name')?.textContent||'').trim().toLowerCase();
      if(name!=='pro'&&name!=='premium')return;
      if(name===String(b.plan))return;
      const btn=card.querySelector('.plan-action');if(!btn)return;
      btn.removeAttribute('disabled');btn.textContent='Trocar para '+(name==='premium'?'Premium':'Pro');btn.onclick=()=>window.manageSafeCheckSubscription();
    });
    const page=document.querySelector('#content .page');
    if(page&&!page.querySelector('.safecheck-portal-plan-note')){const n=document.createElement('div');n.className='free-note safecheck-portal-plan-note';n.textContent='Já assina? Troca de plano e cancelamento são feitos pelo Portal do Cliente Stripe para evitar assinaturas duplicadas.';page.appendChild(n)}
  }

  function enhanceAccount(){
    const activeAccount=document.querySelector('.nav[data-tab="account"].active');
    const page=document.querySelector('#content .page');
    if(!activeAccount||!page||page.querySelector('.legal-billing-card'))return;
    const b=window.__safecheckBilling||{};
    const card=document.createElement('section');card.className='legal-billing-card';
    card.innerHTML=`<h3>Assinatura, privacidade e termos</h3><p>${active(b)?'Gerencie sua assinatura em ambiente seguro do Stripe e consulte os documentos oficiais do SafeCheck.':'Consulte os documentos oficiais do SafeCheck. Assinaturas Pro e Premium podem ser gerenciadas pelo Portal do Cliente.'}</p><div class="legal-billing-actions">${active(b)?'<button class="portal-action" type="button">Gerenciar assinatura</button>':''}<button class="legal-action terms" type="button">Termos de Uso</button><button class="legal-action privacy" type="button">Política de Privacidade</button><button class="legal-action refunds" type="button">Política de Reembolso</button></div>`;
    card.querySelector('.portal-action')?.addEventListener('click',()=>window.manageSafeCheckSubscription());
    card.querySelector('.terms')?.addEventListener('click',()=>window.openSafeCheckLegal('terms'));
    card.querySelector('.privacy')?.addEventListener('click',()=>window.openSafeCheckLegal('privacy'));
    card.querySelector('.refunds')?.addEventListener('click',()=>window.openSafeCheckLegal('refunds'));
    page.appendChild(card);
  }

  function enhance(){css();enhanceAccount();enhancePlans()}
  const oldPlans=window.openPlans;if(typeof oldPlans==='function')window.openPlans=function(){oldPlans.apply(this,arguments);setTimeout(enhance,30)};
  const observer=new MutationObserver(()=>setTimeout(enhance,20));observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  setTimeout(enhance,250);
})();