/**
 * TURSIOPS — VS Code Extension Portal & User Manual Controller
 * Floating Hover Navigation, Interactive Manual Commands, and Extension Authentication Routing.
 */

document.addEventListener('DOMContentLoaded', () => {
  initPortalApp();
});

let toastTimeout = null;
function showToast(message, duration = 3000) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

function initPortalApp() {
  // 1. Floating Nav Active Tracking & Smooth Scroll
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      const targetId = item.getAttribute('href');
      if (targetId && targetId.startsWith('#')) {
        navItems.forEach(n => n.classList.remove('active'));
        item.classList.add('active');
      }
    });
  });

  // 2. Interactive User Manual Command Tabs
  const manualTabs = [
    {
      btnId: 'mTab1',
      name: 'Tursiops: Show File Memory',
      shortcut: 'Ctrl+Alt+M / Cmd+Alt+M',
      desc: 'Retrieves and displays the full architectural decision log, prompt history, diff changes, and type validation records attached to the currently open file in VS Code.',
      syntax: 'Press Ctrl+Shift+P -> Type "Tursiops: Show File Memory" -> Select active file'
    },
    {
      btnId: 'mTab2',
      name: 'Tursiops: Remember Prompt',
      shortcut: 'Ctrl+Alt+R / Cmd+Alt+R',
      desc: 'Pins a prompt directive and AI modification summary to the active AST file scope. Stored forever in local .tursiops/ directory memory.',
      syntax: 'Press Ctrl+Shift+P -> Type "Tursiops: Remember Prompt" -> Enter directive text'
    },
    {
      btnId: 'mTab3',
      name: 'Tursiops: Inspect Diff',
      shortcut: 'Ctrl+Alt+D / Cmd+Alt+D',
      desc: 'Opens an interactive side-by-side diff viewer comparing proposed AI code modifications against the local file baseline before approving changes.',
      syntax: 'Press Ctrl+Shift+P -> Type "Tursiops: Inspect Diff" -> Review & Approve'
    }
  ];

  const cmdName = document.getElementById('cmdName');
  const cmdDesc = document.getElementById('cmdDesc');
  const cmdSyntax = document.getElementById('cmdSyntax');

  manualTabs.forEach(tab => {
    const btn = document.getElementById(tab.btnId);
    if (!btn) return;
    btn.addEventListener('click', () => {
      manualTabs.forEach(t => {
        const b = document.getElementById(t.btnId);
        if (b) b.classList.remove('active');
      });
      btn.classList.add('active');

      if (cmdName) cmdName.textContent = tab.name;
      if (cmdDesc) cmdDesc.textContent = tab.desc;
      if (cmdSyntax) cmdSyntax.innerHTML = `<code>${tab.syntax}</code>`;
    });
  });

  // 3. Extension Auth Buttons & Modal Handling
  const btnNavAuth = document.getElementById('btnNavAuth');
  const btnHeroAuth = document.getElementById('btnHeroAuth');
  const authModal = document.getElementById('authModal');
  const btnCloseModal = document.getElementById('btnCloseModal');

  const modalHeading = document.getElementById('modalHeading');
  const modalTabSignIn = document.getElementById('modalTabSignIn');
  const modalTabSignUp = document.getElementById('modalTabSignUp');

  const popupAuthForm = document.getElementById('popupAuthForm');
  const groupName = document.getElementById('groupName');
  const modalName = document.getElementById('modalName');
  const modalEmail = document.getElementById('modalEmail');
  const modalPassword = document.getElementById('modalPassword');
  const groupConfirmPassword = document.getElementById('groupConfirmPassword');
  const modalConfirmPassword = document.getElementById('modalConfirmPassword');

  const btnModalSubmit = document.getElementById('btnModalSubmit');
  const modalSubmitText = document.getElementById('modalSubmitText');
  const modalSpinner = document.getElementById('modalSpinner');
  const authAlertBox = document.getElementById('authAlertBox');

  const btnModalOpenVsCode = document.getElementById('btnModalOpenVsCode');
  const modalVsCodeIcon = document.getElementById('modalVsCodeIcon');
  const modalVsCodeLabel = document.getElementById('modalVsCodeLabel');
  const modalUnlockHint = document.getElementById('modalUnlockHint');
  const modalActiveSessionContainer = document.getElementById('modalActiveSessionContainer');

  const deepLinkBanner = document.getElementById('deepLinkBanner');
  const deepLinkTarget = document.getElementById('deepLinkTarget');

  let mode = 'login'; // 'login' or 'signup'

  // Detect dynamic URL paths & query parameters (/signup, /signin, /landing, ?mode=signup)
  const pathname = window.location.pathname.toLowerCase();
  const urlParams = new URLSearchParams(window.location.search);
  const redirectUri = urlParams.get('redirect_uri');
  const redirect = urlParams.get('redirect');
  const target = redirectUri || redirect;
  const modeParam = urlParams.get('mode');

  if (target && deepLinkBanner && deepLinkTarget) {
    deepLinkBanner.style.display = 'block';
    deepLinkTarget.textContent = target;
  }

  // Automatic Modal Opening based on 3 Base URL Links (/signup, /signin, /landing)
  if (pathname === '/signup' || modeParam === 'signup') {
    openModal('signup');
  } else if (pathname === '/signin' || pathname === '/login' || modeParam === 'signin' || modeParam === 'login' || target) {
    openModal('login');
  }

  function unlockModalVsCodeButton(rollbackUrl, email) {
    if (!btnModalOpenVsCode) return;
    btnModalOpenVsCode.classList.remove('locked');
    btnModalOpenVsCode.classList.add('unlocked');
    btnModalOpenVsCode.removeAttribute('aria-disabled');
    btnModalOpenVsCode.href = rollbackUrl;
    if (modalVsCodeIcon) modalVsCodeIcon.textContent = '🐬';
    if (modalVsCodeLabel) modalVsCodeLabel.textContent = 'OPEN IN VS CODE';
    if (modalUnlockHint) {
      modalUnlockHint.className = 'vscode-unlock-hint unlocked doto-font';
      modalUnlockHint.textContent = `✓ Unlocked for ${email}! Click above to return to VS Code.`;
    }
  }

  function lockModalVsCodeButton() {
    if (!btnModalOpenVsCode) return;
    btnModalOpenVsCode.classList.remove('unlocked');
    btnModalOpenVsCode.classList.add('locked');
    btnModalOpenVsCode.setAttribute('aria-disabled', 'true');
    btnModalOpenVsCode.href = '#';
    if (modalVsCodeIcon) modalVsCodeIcon.textContent = '🔒';
    if (modalVsCodeLabel) {
      modalVsCodeLabel.textContent = mode === 'signup' 
        ? 'OPEN IN VS CODE (CREATE ACCOUNT FIRST)' 
        : 'OPEN IN VS CODE (SIGN IN FIRST)';
    }
    if (modalUnlockHint) {
      modalUnlockHint.className = 'vscode-unlock-hint doto-font';
      modalUnlockHint.textContent = mode === 'signup'
        ? '> Complete account creation above to unlock VS Code integration.'
        : '> Complete sign in above to unlock VS Code integration.';
    }
  }

  // Check stored session in localStorage
  function checkStoredSession() {
    const storedToken = localStorage.getItem('tursiops_token');
    if (!storedToken) return;

    fetch('/api/me', {
      headers: { 'Authorization': `Bearer ${storedToken}` }
    })
    .then(res => res.ok ? res.json() : null)
    .then(data => {
      if (data && data.valid && data.user) {
        const rollbackUrl = `vscode://tursiops-ai.tursiops/auth?token=${encodeURIComponent(storedToken)}&email=${encodeURIComponent(data.user.email)}`;
        unlockModalVsCodeButton(rollbackUrl, data.user.email);

        if (modalActiveSessionContainer) {
          modalActiveSessionContainer.innerHTML = `
            <div class="active-session-badge doto-font">
              <span>✓ Active session: <strong>${data.user.email}</strong></span>
              <a id="btnModalSwitchAccount">Switch Account</a>
            </div>
          `;
          document.getElementById('btnModalSwitchAccount')?.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('tursiops_token');
            modalActiveSessionContainer.innerHTML = '';
            lockModalVsCodeButton();
            popupAuthForm.reset();
            clearAlert();
          });
        }
      }
    })
    .catch(() => {});
  }
  checkStoredSession();

  // Handle click on VS Code button inside modal
  if (btnModalOpenVsCode) {
    btnModalOpenVsCode.addEventListener('click', (e) => {
      if (btnModalOpenVsCode.classList.contains('locked')) {
        e.preventDefault();
        btnModalOpenVsCode.classList.remove('shake');
        void btnModalOpenVsCode.offsetWidth;
        btnModalOpenVsCode.classList.add('shake');
        showAlert(mode === 'signup' 
          ? 'Please create an account first to unlock VS Code integration.' 
          : 'Please sign in first to unlock VS Code integration.');
      }
    });
  }

  function openModal(initialMode = 'login') {
    setMode(initialMode);
    authModal.classList.add('active');
    authModal.setAttribute('aria-hidden', 'false');
    clearAlert();
  }

  function closeModal() {
    authModal.classList.remove('active');
    authModal.setAttribute('aria-hidden', 'true');
    clearAlert();
  }

  [btnNavAuth, btnHeroAuth].forEach(btn => {
    if (btn) btn.addEventListener('click', () => openModal('login'));
  });

  if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);

  authModal.addEventListener('click', (e) => {
    if (e.target === authModal) closeModal();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && authModal.classList.contains('active')) {
      closeModal();
    }
  });

  function setMode(newMode) {
    mode = newMode;
    clearAlert();
    btnModalSubmit.style.display = '';

    if (mode === 'signup') {
      modalTabSignUp.classList.add('active');
      modalTabSignIn.classList.remove('active');
      modalHeading.textContent = 'CREATE EXTENSION ACCOUNT';
      modalSubmitText.textContent = 'CREATE ACCOUNT';
      groupName.style.display = 'block';
      groupConfirmPassword.style.display = 'block';
      if (btnModalOpenVsCode && btnModalOpenVsCode.classList.contains('locked')) {
        if (modalVsCodeLabel) modalVsCodeLabel.textContent = 'OPEN IN VS CODE (CREATE ACCOUNT FIRST)';
        if (modalUnlockHint) modalUnlockHint.textContent = '> Complete account creation above to unlock VS Code integration.';
      }
    } else {
      modalTabSignIn.classList.add('active');
      modalTabSignUp.classList.remove('active');
      modalHeading.textContent = 'AUTHORIZE VS CODE EXTENSION';
      modalSubmitText.textContent = 'SIGN IN';
      groupName.style.display = 'none';
      groupConfirmPassword.style.display = 'none';
      if (btnModalOpenVsCode && btnModalOpenVsCode.classList.contains('locked')) {
        if (modalVsCodeLabel) modalVsCodeLabel.textContent = 'OPEN IN VS CODE (SIGN IN FIRST)';
        if (modalUnlockHint) modalUnlockHint.textContent = '> Complete sign in above to unlock VS Code integration.';
      }
    }
  }

  modalTabSignIn.addEventListener('click', () => setMode('login'));
  modalTabSignUp.addEventListener('click', () => setMode('signup'));

  function showAlert(msg, isError = true) {
    authAlertBox.textContent = msg;
    authAlertBox.className = `auth-alert-box ${isError ? 'error' : 'success'}`;
    authAlertBox.style.display = 'block';
  }

  function clearAlert() {
    authAlertBox.style.display = 'none';
    authAlertBox.textContent = '';
  }

  // Submit Handler
  popupAuthForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert();

    const email = modalEmail.value.trim();
    const password = modalPassword.value;
    const name = modalName.value.trim();
    const confirmPassword = modalConfirmPassword.value;

    if (!email || !password) {
      return showAlert('Please fill in all required fields.');
    }

    if (mode === 'signup') {
      if (password !== confirmPassword) {
        return showAlert('Passwords do not match.');
      }
      if (password.length < 8) {
        return showAlert('Password must be at least 8 characters.');
      }
    }

    btnModalSubmit.disabled = true;
    modalSpinner.style.display = 'inline-block';
    modalSubmitText.textContent = mode === 'signup' ? 'CREATING...' : 'SIGNING IN...';

    try {
      const endpoint = mode === 'signup' ? '/api/signup' : '/api/login';
      const body = { email, password };
      if (mode === 'signup') body.name = name || undefined;
      if (redirect) body.redirect = redirect;
      if (redirectUri) body.redirect_uri = redirectUri;

      const params = new URLSearchParams();
      if (redirect) params.set('redirect', redirect);
      if (redirectUri) params.set('redirect_uri', redirectUri);
      const queryString = params.toString();
      const fetchUrl = queryString ? `${endpoint}?${queryString}` : endpoint;

      const res = await fetch(fetchUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || 'Authorization failed');
      }

      if (data.token) {
        localStorage.setItem('tursiops_token', data.token);
      }

      const rollbackUrl = data.redirect_url || data.vscode_link || `vscode://tursiops-ai.tursiops/auth?token=${encodeURIComponent(data.token)}&email=${encodeURIComponent(data.user?.email || email)}`;

      unlockModalVsCodeButton(rollbackUrl, data.user?.email || email);

      modalSubmitText.textContent = mode === 'signup' ? '✓ ACCOUNT CREATED' : '✓ SIGNED IN';
      showAlert(mode === 'signup' 
        ? '✓ Account created! VS Code integration unlocked.' 
        : '✓ Sign-in successful! VS Code integration unlocked.', false);

      showToast(mode === 'signup' ? '✓ Account created! Redirecting to VS Code...' : '✓ Authorized for VS Code!');

      // Automatically trigger deep link navigation
      window.location.href = rollbackUrl;

    } catch (err) {
      showAlert(err.message || 'Error processing request.');
      btnModalSubmit.disabled = false;
      modalSubmitText.textContent = mode === 'signup' ? 'CREATE ACCOUNT' : 'SIGN IN';
    } finally {
      modalSpinner.style.display = 'none';
    }
  });
}

