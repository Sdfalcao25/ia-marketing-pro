(function () {
  if (window.__safecheckAuthPatch201) return;
  window.__safecheckAuthPatch201 = true;

  const PENDING_EMAIL_KEY = 'safecheck_pending_email_v201';
  let pendingAutoLogin = false;
  let lastResumeAttempt = 0;

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .brand-logo-svg{width:100%;height:100%;display:block}
      .shield,.mini-shield{overflow:hidden;border:none!important;background:transparent!important;padding:0!important}
      .shield{width:48px!important;height:52px!important}
      .mini-shield{width:34px!important;height:38px!important}
      .confirm-box{background:#eaf7f5;border:1px solid #b9ded8;color:#1d5c58;border-radius:14px;padding:14px;margin:12px 0}
      .confirm-box strong{display:block;color:#173a3f;margin-bottom:5px;font-size:14px}
      .confirm-box p{margin:0 0 11px;color:#466a68;font-size:13px;line-height:1.45}
      .confirm-actions{display:grid;grid-template-columns:1fr;gap:8px}
      .confirm-actions button{border-radius:11px;padding:11px 12px;font-weight:800;border:0}
      .confirm-enter{background:#167c80;color:#fff}
      .confirm-resend{background:#fff;color:#176b6e;border:1px solid #b9d8d7!important}
      .auth-help{font-size:12px;line-height:1.45;color:#61767a;margin-top:10px;text-align:center}
      .notice.error{border:1px solid #f0cbc7}
      .notice.ok{border:1px solid #c4e6d3}
      .notice.info{border:1px solid #c5e1e1}
    `;
    document.head.appendChild(style);
  }

  function logoSvg() {
    return '<svg class="brand-logo-svg" viewBox="0 0 108 108" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<path d="M54 8C42 15 31 18 20 20v30c0 23 14 40 34 50 20-10 34-27 34-50V20C77 18 66 15 54 8z" fill="#1b8588"/>' +
      '<path d="M37 53l11 11 24-27" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>';
  }

  function applyBranding() {
    document.querySelectorAll('.shield,.mini-shield').forEach(el => { el.innerHTML = logoSvg(); });
    const brandTitle = document.querySelector('.brand b');
    const brandSub = document.querySelector('.brand small');
    if (brandTitle) brandTitle.textContent = 'SafeCheck AI';
    if (brandSub) brandSub.textContent = 'Detector de Golpes · proteção digital';
  }

  function errorCode(e) {
    return String(e?.data?.code || e?.data?.error_code || '').toLowerCase();
  }

  window.friendlyError = function friendlyErrorPatched(e) {
    const m = String(e?.message || 'Erro inesperado');
    const code = errorCode(e);
    if (code.includes('email_not_confirmed') || /email not confirmed/i.test(m)) {
      return 'Seu cadastro existe, mas o e-mail ainda precisa ser confirmado.';
    }
    if (code.includes('invalid_credentials') || /invalid login credentials/i.test(m)) {
      return 'E-mail ou senha incorretos.';
    }
    if (code.includes('user_already_exists') || /user already registered|already been registered/i.test(m)) {
      return 'Este e-mail já possui cadastro. Use Entrar ou recupere sua senha.';
    }
    if (code.includes('over_email_send_rate_limit') || /rate limit|too many requests/i.test(m)) {
      return 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.';
    }
    if (/password.*short|weak password/i.test(m)) {
      return 'A senha precisa ter pelo menos 8 caracteres.';
    }
    if (/abort|network|failed to fetch|load failed/i.test(m)) {
      return 'Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.';
    }
    return m;
  };

  function showConfirmationState(email, password) {
    showLogin();
    if ($('loginEmail')) $('loginEmail').value = email || '';
    if (password && $('loginPassword')) $('loginPassword').value = password;
    try { localStorage.setItem(PENDING_EMAIL_KEY, email || ''); } catch (_) {}
    pendingAutoLogin = true;
    const el = $('loginNotice');
    if (!el) return;
    el.innerHTML = `<div class="confirm-box">
      <strong>Cadastro criado com sucesso</strong>
      <p>Enviamos uma confirmação para <b>${esc(email || '')}</b>. Abra o e-mail, toque no link de confirmação e volte ao SafeCheck. Seu cadastro não foi perdido.</p>
      <div class="confirm-actions">
        <button type="button" class="confirm-enter" onclick="login()">Já confirmei · entrar</button>
        <button type="button" class="confirm-resend" onclick="resendConfirmation()">Reenviar e-mail de confirmação</button>
      </div>
      <div class="auth-help">Se não encontrar a mensagem, confira Spam, Promoções e Lixeira.</div>
    </div>`;
  }

  window.resendConfirmation = async function resendConfirmation() {
    const email = ($('loginEmail')?.value || localStorage.getItem(PENDING_EMAIL_KEY) || '').trim();
    if (!email) {
      notice('loginNotice', 'Informe o e-mail da conta para reenviar a confirmação.', 'error');
      return;
    }
    try {
      const buttons = document.querySelectorAll('.confirm-resend');
      buttons.forEach(b => { b.disabled = true; b.textContent = 'Enviando…'; });
      await jsonFetch(SUPABASE_URL + '/auth/v1/resend', {
        method: 'POST',
        headers: { 'apikey': PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'signup', email })
      });
      showConfirmationState(email, $('loginPassword')?.value || '');
      const box = document.querySelector('.confirm-box p');
      if (box) box.innerHTML = `Novo e-mail enviado para <b>${esc(email)}</b>. Abra a mensagem, confirme e volte ao SafeCheck.`;
      toast('E-mail de confirmação reenviado.');
    } catch (e) {
      showConfirmationState(email, $('loginPassword')?.value || '');
      const box = document.querySelector('.confirm-box p');
      if (box) box.textContent = friendlyError(e);
    }
  };

  window.signup = async function signupPatched() {
    if (busy) return;
    const name = $('signupName').value.trim();
    const email = $('signupEmail').value.trim().toLowerCase();
    const password = $('signupPassword').value;
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      notice('signupNotice', 'Informe um endereço de e-mail válido.', 'error');
      return;
    }
    if (password.length < 8) {
      notice('signupNotice', 'Use uma senha com pelo menos 8 caracteres.', 'error');
      return;
    }
    setBusy('signupBtn', true, 'Criando conta…');
    try {
      const data = await jsonFetch(SUPABASE_URL + '/auth/v1/signup', {
        method: 'POST',
        headers: { 'apikey': PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, data: { display_name: name } })
      });
      if (data.access_token) {
        saveSession(data);
        try { localStorage.removeItem(PENDING_EMAIL_KEY); } catch (_) {}
        await ensureProfile(name);
        enterApp();
        toast('Conta criada e conectada.');
      } else {
        showConfirmationState(email, password);
      }
    } catch (e) {
      if (/already|registered|user_already/i.test(String(e?.message || '') + errorCode(e))) {
        showLogin();
        $('loginEmail').value = email;
        notice('loginNotice', 'Este e-mail já possui cadastro. Digite sua senha para entrar.', 'info');
      } else {
        notice('signupNotice', friendlyError(e), 'error');
      }
    } finally {
      setBusy('signupBtn', false);
    }
  };

  window.login = async function loginPatched() {
    if (busy) return;
    const email = $('loginEmail').value.trim().toLowerCase();
    const password = $('loginPassword').value;
    if (!email || !password) {
      notice('loginNotice', 'Preencha e-mail e senha.', 'error');
      return;
    }
    setBusy('loginBtn', true, 'Entrando…');
    try {
      const data = await jsonFetch(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
        method: 'POST',
        headers: { 'apikey': PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      saveSession(data);
      try { localStorage.removeItem(PENDING_EMAIL_KEY); } catch (_) {}
      pendingAutoLogin = false;
      await ensureProfile();
      enterApp();
      toast('Login realizado com sucesso.');
    } catch (e) {
      if (errorCode(e).includes('email_not_confirmed') || /email not confirmed/i.test(String(e?.message || ''))) {
        showConfirmationState(email, password);
      } else {
        notice('loginNotice', friendlyError(e), 'error');
      }
    } finally {
      setBusy('loginBtn', false);
    }
  };

  window.onSafeCheckResume = function onSafeCheckResume() {
    if (!pendingAutoLogin || busy) return;
    const now = Date.now();
    if (now - lastResumeAttempt < 5000) return;
    const password = $('loginPassword')?.value || '';
    const email = $('loginEmail')?.value || '';
    if (!password || !email) return;
    lastResumeAttempt = now;
    setTimeout(() => {
      if (pendingAutoLogin && !busy && !$('loginPanel')?.classList.contains('hidden')) login();
    }, 450);
  };

  injectStyles();
  applyBranding();

  const pendingEmail = (() => { try { return localStorage.getItem(PENDING_EMAIL_KEY) || ''; } catch (_) { return ''; } })();
  if (pendingEmail && !session) {
    showLogin();
    if ($('loginEmail')) $('loginEmail').value = pendingEmail;
    const el = $('loginNotice');
    if (el) el.innerHTML = `<div class="notice info">Seu cadastro está aguardando a confirmação do e-mail. Depois de confirmar, informe a senha e toque em <b>Entrar</b>.</div>`;
  }
})();
