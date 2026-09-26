/**
 * TURSIOPS — Frontend Controller
 * Bland dashboard with header Sign In modal pop-up and Turso authentication flow.
 */

document.addEventListener('DOMContentLoaded', () => {
  initDashboardAuth();
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

function initDashboardAuth() {
  const headerAuthBtn = document.getElementById('headerAuthBtn');
  const headerUserEmail = document.getElementById('headerUserEmail');
  const headerSignOutBtn = document.getElementById('headerSignOutBtn');

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
  const labelModalPassword = document.getElementById('labelModalPassword');
  const groupConfirmPassword = document.getElementById('groupConfirmPassword');
  const modalConfirmPassword = document.getElementById('modalConfirmPassword');

  const btnModalSubmit = document.getElementById('btnModalSubmit');
  const modalSubmitText = document.getElementById('modalSubmitText');
  const modalSpinner = document.getElementById('modalSpinner');
  const authAlertBox = document.getElementById('authAlertBox');

  const deepLinkBanner = document.getElementById('deepLinkBanner');
  const deepLinkTarget = document.getElementById('deepLinkTarget');

  let mode = 'login'; // 'login' or 'signup'

  // 1. Detect dynamic deep link from query parameters (?redirect_uri=vscode://...)
  const urlParams = new URLSearchParams(window.location.search);
  const redirectUri = urlParams.get('redirect_uri');

  if (redirectUri && deepLinkBanner && deepLinkTarget) {
    deepLinkBanner.style.display = 'block';
    deepLinkTarget.textContent = redirectUri;
    // Auto-open modal if dynamic redirect is provided
    openModal('login');
  }

  // 2. Modal open & close
  function openModal(initialMode = 'login') {
    setMode(initialMode);
    authModal.classList.add('active');
    authModal.setAttribute('aria-hidden', 'false');
    clearAlert();
    setTimeout(() => {
      if (mode === 'signup' && modalName) {
        modalName.focus();
      } else {
        modalEmail.focus();
      }
    }, 100);
  }

  function closeModal() {
    authModal.classList.remove('active');
    authModal.setAttribute('aria-hidden', 'true');
    clearAlert();
  }

  if (headerAuthBtn) {
    headerAuthBtn.addEventListener('click', () => openModal('login'));
  }

  if (btnCloseModal) {
    btnCloseModal.addEventListener('click', closeModal);
  }

  authModal.addEventListener('click', (e) => {
    if (e.target === authModal) closeModal();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && authModal.classList.contains('active')) {
      closeModal();
    }
  });

  // 3. Tab switching inside popup (Sign In vs Sign Up)
  function setMode(newMode) {
    mode = newMode;
    clearAlert();

    if (mode === 'login') {
      modalTabSignIn.classList.add('active');
      modalTabSignUp.classList.remove('active');
      modalHeading.textContent = 'Sign In';
      modalSubmitText.textContent = redirectUri ? 'Sign In & Connect to IDE' : 'Sign In';
      groupName.style.display = 'none';
      modalName.removeAttribute('required');
      groupConfirmPassword.style.display = 'none';
      modalConfirmPassword.removeAttribute('required');
      labelModalPassword.textContent = 'Password';
      modalPassword.setAttribute('autocomplete', 'current-password');
    } else {
      modalTabSignIn.classList.remove('active');
      modalTabSignUp.classList.add('active');
      modalHeading.textContent = 'Create Developer Account';
      modalSubmitText.textContent = redirectUri ? 'Create Account & Connect IDE' : 'Create Account';
      groupName.style.display = 'block';
      modalName.setAttribute('required', 'true');
      groupConfirmPassword.style.display = 'block';
      modalConfirmPassword.setAttribute('required', 'true');
      labelModalPassword.textContent = 'Password (min 6 characters)';
      modalPassword.setAttribute('autocomplete', 'new-password');
    }
  }

  modalTabSignIn.addEventListener('click', () => setMode('login'));
  modalTabSignUp.addEventListener('click', () => setMode('signup'));

  function formatErrorMessage(errData) {
    if (!errData) return 'An error occurred during authentication.';
    if (typeof errData === 'string') return errData;
    if (typeof errData === 'object') {
      if (errData.message && typeof errData.message === 'string') return errData.message;
      if (errData.error) {
        if (typeof errData.error === 'string') return errData.error;
        if (errData.error.message && typeof errData.error.message === 'string') return errData.error.message;
      }
      try {
        return JSON.stringify(errData);
      } catch {
        return 'An error occurred during authentication.';
      }
    }
    return String(errData);
  }

  function showAlert(msg, type = 'error') {
    authAlertBox.textContent = formatErrorMessage(msg);
    authAlertBox.className = `auth-alert-box ${type}`;
  }

  function clearAlert() {
    authAlertBox.textContent = '';
    authAlertBox.className = 'auth-alert-box';
  }

  // 4. Session restoration check via /api/me
  const savedToken = localStorage.getItem('tursiops_token');
  if (savedToken && !redirectUri) {
    validateSession(savedToken);
  }

  async function validateSession(token) {
    try {
      const res = await fetch('/api/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          updateHeaderLoggedIn(data.user);
        }
      } else {
        localStorage.removeItem('tursiops_token');
      }
    } catch (e) {
      // offline or network glitch
    }
  }

  function updateHeaderLoggedIn(user) {
    if (headerAuthBtn) headerAuthBtn.style.display = 'none';
    if (headerUserEmail) {
      headerUserEmail.style.display = 'inline-block';
      headerUserEmail.textContent = user.name ? `${user.name} (${user.email})` : user.email;
    }
    if (headerSignOutBtn) headerSignOutBtn.style.display = 'inline-block';
  }

  if (headerSignOutBtn) {
    headerSignOutBtn.addEventListener('click', () => {
      localStorage.removeItem('tursiops_token');
      if (headerUserEmail) headerUserEmail.style.display = 'none';
      if (headerSignOutBtn) headerSignOutBtn.style.display = 'none';
      if (headerAuthBtn) headerAuthBtn.style.display = 'inline-block';
      showToast('Signed out successfully.');
    });
  }

  // 5. Form submission
  popupAuthForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert();

    const email = modalEmail.value.trim();
    const password = modalPassword.value;
    const name = modalName ? modalName.value.trim() : '';
    const confirmPassword = modalConfirmPassword ? modalConfirmPassword.value : '';

    if (!email || !password) {
      showAlert('Email and password are required.');
      return;
    }

    if (mode === 'signup') {
      if (!name) {
        showAlert('Please enter your name.');
        return;
      }
      if (password.length < 6) {
        showAlert('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        showAlert('Passwords do not match. Please re-enter.');
        return;
      }
    }

    btnModalSubmit.disabled = true;
    modalSpinner.style.display = 'inline';

    const endpoint = mode === 'signup' ? '/signup' : '/login';
    const query = redirectUri ? `?redirect_uri=${encodeURIComponent(redirectUri)}` : '';
    const fullUrl = `${endpoint}${query}`;

    try {
      if (redirectUri) {
        // If VS Code deep link redirect is active, submit via form post so browser directly performs the 302 to vscode://
        const tempForm = document.createElement('form');
        tempForm.method = 'POST';
        tempForm.action = fullUrl;

        if (mode === 'signup') {
          const nameInput = document.createElement('input');
          nameInput.type = 'hidden';
          nameInput.name = 'name';
          nameInput.value = name;
          tempForm.appendChild(nameInput);

          const confirmInput = document.createElement('input');
          confirmInput.type = 'hidden';
          confirmInput.name = 'confirmPassword';
          confirmInput.value = confirmPassword;
          tempForm.appendChild(confirmInput);
        }

        const emailInput = document.createElement('input');
        emailInput.type = 'hidden';
        emailInput.name = 'email';
        emailInput.value = email;
        tempForm.appendChild(emailInput);

        const passInput = document.createElement('input');
        passInput.type = 'hidden';
        passInput.name = 'password';
        passInput.value = password;
        tempForm.appendChild(passInput);

        document.body.appendChild(tempForm);
        tempForm.submit();
        return;
      }

      // Standard API JSON fetch
      const payload = { email, password };
      if (mode === 'signup') {
        payload.name = name;
        payload.confirmPassword = confirmPassword;
      }

      const res = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      let data;
      try {
        data = await res.json();
      } catch {
        data = { message: await res.text().catch(() => 'Authentication failed') };
      }

      if (!res.ok) {
        const errMsg = formatErrorMessage(data);
        throw new Error(errMsg);
      }

      if (data.token) {
        localStorage.setItem('tursiops_token', data.token);
      }

      showAlert(mode === 'signup' ? 'Account created successfully!' : 'Signed in successfully!', 'success');
      showToast(mode === 'signup' ? `✓ Welcome ${data.user?.name || email}!` : '✓ Authenticated successfully');

      if (data.user) {
        updateHeaderLoggedIn(data.user);
      }

      setTimeout(() => {
        closeModal();
      }, 700);

    } catch (err) {
      showAlert(err.message || 'An error occurred during authentication.');
    } finally {
      btnModalSubmit.disabled = false;
      modalSpinner.style.display = 'none';
    }
  });
}

