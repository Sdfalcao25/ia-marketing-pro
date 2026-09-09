(function(){
  if(window.__safecheckClient230)return;
  window.__safecheckClient230=true;

  const icons={
    message:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4.75h14a1.75 1.75 0 0 1 1.75 1.75v8A1.75 1.75 0 0 1 19 16.25H10l-5.5 3v-2.95A1.75 1.75 0 0 1 3.25 14.5v-8A1.75 1.75 0 0 1 5 4.75Z"/><path d="M7.5 9h9M7.5 12.25h6"/></svg>',
    url:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.4 14.6 5.2-5.2"/><path d="m7.4 16.6-1.55 1.55a3.1 3.1 0 0 1-4.4-4.4L5.2 10a3.1 3.1 0 0 1 4.4 0" transform="translate(2 0)"/><path d="m14.6 7.4 1.55-1.55a3.1 3.1 0 1 1 4.4 4.4L16.8 14a3.1 3.1 0 0 1-4.4 0" transform="translate(-1 0)"/></svg>',
    pix:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.1 3.8 3.8 8.1a3.6 3.6 0 0 0 0 5.1l4.3 4.3a3.6 3.6 0 0 0 5.1 0l7-7"/><path d="m15.9 20.2 4.3-4.3a3.6 3.6 0 0 0 0-5.1l-4.3-4.3a3.6 3.6 0 0 0-5.1 0l-7 7"/><path d="m8.5 12 3.5-3.5 3.5 3.5-3.5 3.5L8.5 12Z"/></svg>',
    offer:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.75v6.1l7.95 7.95 7.85-7.85L11.85 4H5.75A1.75 1.75 0 0 0 4 5.75Z"/><circle cx="8" cy="8" r="1.25"/></svg>',
    image:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="4" width="17" height="16" rx="2.2"/><circle cx="9" cy="9" r="1.8"/><path d="m5.75 17 4.1-4.15 3.05 3.05 2.3-2.25 3.1 3.35"/></svg>',
    pdf:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6V3Z"/><path d="M14 3v4h4M8.2 16.7v-5.2h2.05a1.65 1.65 0 0 1 0 3.3H8.2M13.1 11.5v5.2h1.35a2.6 2.6 0 0 0 0-5.2H13.1ZM18 11.5h2.7M18 14h2.15"/></svg>',
    profile:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="8" r="3.25"/><path d="M4.75 19.25a5.25 5.25 0 0 1 10.5 0M18 8.5v5M15.5 11h5"/></svg>'
  };

  function injectCss(){
    if(document.getElementById('safecheck-client-230'))return;
    const s=document.createElement('style');s.id='safecheck-client-230';s.textContent=`
      .quick{position:relative!important;overflow:hidden!important;min-height:132px!important;padding:18px 16px!important;justify-content:flex-start!important;gap:18px!important}
      .quick .icon,.quick .pro-icon{font-size:0!important;width:46px!important;height:46px!important;border-radius:14px!important;display:grid!important;place-items:center!important;background:linear-gradient(145deg,#092932,#0a3439)!important;border:1px solid #19515a!important;color:#32dfb7!important;margin:0!important;box-shadow:inset 0 1px rgba(255,255,255,.04)!important}
      .quick .icon svg,.quick .pro-icon svg{width:25px!important;height:25px!important;fill:none!important;stroke:currentColor!important;stroke-width:1.7!important;stroke-linecap:round!important;stroke-linejoin:round!important}
      .quick b{font-size:15px!important;letter-spacing:-.01em!important}.quick small{font-size:12px!important;line-height:1.4!important}
      .quick:after{content:"";position:absolute;right:-24px;top:-28px;width:92px;height:92px;border-radius:50%;background:radial-gradient(circle,rgba(32,217,169,.08),transparent 68%);pointer-events:none}
      body.senior-light .quick .icon,body.senior-light .quick .pro-icon{background:#e8f7f3!important;border:2px solid #9ecdc4!important;color:#087b71!important}
      .analysis-badge{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:6px 10px;font-size:10px;font-weight:900;background:#0b2f29;color:#79e7bf;border:1px solid #18533f}
      body.senior-light .analysis-badge{background:#e9f7f2;color:#13674f;border:1px solid #9bcdbd}
    `;document.head.appendChild(s);
  }

  function typeOf(btn){
    const attr=btn.getAttribute('onclick')||'';const m=attr.match(/openAnalyze\(['\"]([^'\"]+)/);if(m)return m[1];
    const txt=(btn.textContent||'').toLowerCase();if(txt.includes('mensagem'))return'message';if(txt.includes('link'))return'url';if(txt.includes('pix'))return'pix';if(txt.includes('oferta'))return'offer';if(txt.includes('print'))return'image';if(txt.includes('pdf'))return'pdf';if(txt.includes('perfil'))return'profile';return'message';
  }
  function upgradeQuickIcons(){
    document.querySelectorAll('.quick').forEach(btn=>{
      const type=typeOf(btn),svg=icons[type]||icons.message;let el=btn.querySelector('.icon,.pro-icon');
      if(!el){el=document.createElement('div');btn.insertBefore(el,btn.firstChild)}
      el.className='pro-icon';el.innerHTML=svg;el.setAttribute('aria-hidden','true');
    });
  }

  function hideTechnicalInfrastructure(){
    document.querySelectorAll('#content .card').forEach(card=>{
      const t=(card.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();
      if(t.includes('backend')&&t.includes('banco')&&t.includes('autenticação')&&t.includes('ocr')&&t.includes('versão'))card.remove();
    });
    document.querySelectorAll('.card.mini.muted').forEach(card=>{
      if((card.textContent||'').includes('Motor:'))card.innerHTML=card.innerHTML.replace(/<br>\s*Motor:[\s\S]*/i,'');
    });
  }

  function customerFacingStatus(){
    document.querySelectorAll('.server-badge').forEach(b=>{
      if(b.classList.contains('local')){b.textContent='Análise local';return}
      const result=window.lastReport||null;const ai=!!result?.signals?.ai_analysis?.used;b.classList.add('analysis-badge');b.textContent=ai?'IA + análise técnica':'Análise técnica';
    });
  }

  function cleanHeader(){
    const sub=document.querySelector('.top-brand .mini');if(sub)sub.textContent='Proteção digital contra golpes';
  }

  function updatePrivacyCopy(){
    document.querySelectorAll('#content .card').forEach(card=>{
      const t=(card.textContent||'').toLowerCase();if(!t.includes('privacidade por desenho'))return;
      const p=card.querySelector('p');if(p)p.textContent='Imagens e PDFs são lidos no aparelho. O texto extraído e os dados enviados são processados de forma segura pelo servidor e pela IA antifraude quando disponível; o arquivo original não é enviado para a análise textual.';
    });
  }

  function enhance(){injectCss();upgradeQuickIcons();hideTechnicalInfrastructure();customerFacingStatus();cleanHeader();updatePrivacyCopy()}
  enhance();
  new MutationObserver(()=>{clearTimeout(window.__client230Timer);window.__client230Timer=setTimeout(enhance,25)}).observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
})();
