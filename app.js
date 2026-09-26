/**
 * TURSIOPS — Frontend Authentication Controller
 * Connects directly to /login and /signup backend endpoints with Turso database and dynamic VS Code deep link support.
 */

document.addEventListener('DOMContentLoaded', () => {
  initAuthApp();
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

function initAuthApp() {
  const btnTabSignIn = document.getElementById('btnTabSignIn');
  const btnTabSignUp = document.getElementById('btnTabSignUp');
  const mainAuthForm = document.getElementById('mainAuthForm');
  const inputEmail = document.getElementById('inputEmail');
  const inputPassword = document.getElementById('inputPassword');
  const labelPassword = document.getElementById('labelPassword');
  const btnSubmit = document.getElementById('btnSubmit');
  const submitText = document.getElementById('submitText');
  const submitSpinner = document.getElementById('submitSpinner');
  const authAlert = document.getElementById('authAlert');
  const deepLinkNotice = document.getElementById('deepLinkNotice');
  const deepLinkVal = document.getElementById('deepLinkVal');
  const userProfileCard = document.getElementById('userProfileCard');
  const profileEmail = document.getElementById('profileEmail');
  const profileUserId = document.getElementById('profileUserId');
  const btnSignOut = document.getElementById('btnSignOut');

  let mode = 'login'; // 'login' or 'signup'

  // 1. Detect dynamic deep link from URL params (e.g. ?redirect_uri=vscode://...)
  const urlParams = new URLSearchParams(window.location.search);
  const redirectUri = urlParams.get('redirect_uri');

  if (redirectUri && deepLinkNotice && deepLinkVal) {
    deepLinkNotice.style.display = 'flex';
    deepLinkVal.textContent = redirectUri;
  }

  // 2. Tab switching logic
  function setMode(newMode) {
    mode = newMode;
    clearAlert();

    if (mode === 'login') {
      btnTabSignIn.classList.add('active');
      btnTabSignUp.classList.remove('active');
      submitText.textContent = redirectUri ? 'Sign In & Redirect to IDE' : 'Sign In to Tursiops';
      labelPassword.textContent = 'Password';
      inputPassword.placeholder = '••••••••••••';
      inputPassword.setAttribute('autocomplete', 'current-password');
    } else {
      btnTabSignIn.classList.remove('active');
      btnTabSignUp.classList.add('active');
      submitText.textContent = redirectUri ? 'Create Account & Connect IDE' : 'Create Tursiops Account';
      labelPassword.textContent = 'Choose Password (min 6 chars)';
      inputPassword.placeholder = 'At least 6 characters';
      inputPassword.setAttribute('autocomplete', 'new-password');
    }
  }

  btnTabSignIn.addEventListener('click', () => setMode('login'));
  btnTabSignUp.addEventListener('click', () => setMode('signup'));

  function showAlert(msg, type = 'error') {
    authAlert.textContent = msg;
    authAlert.className = `auth-alert ${type}`;
  }

  function clearAlert() {
    authAlert.textContent = '';
    authAlert.className = 'auth-alert';
  }

  // 3. Check existing token in localStorage for standard web sessions
  const storedToken = localStorage.getItem('tursiops_token');
  if (storedToken && !redirectUri) {
    fetchProfile(storedToken);
  }

  async function fetchProfile(token) {
    try {
      const res = await fetch('/api/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          showUserProfile(data.user);
        }
      } else {
        localStorage.removeItem('tursiops_token');
      }
    } catch (e) {
      // Ignore network errors on auto-check
    }
  }

  function showUserProfile(user) {
    if (userProfileCard && profileEmail && profileUserId) {
      profileEmail.textContent = `User: ${user.email}`;
      profileUserId.textContent = `ID: ${user.id}`;
      userProfileCard.classList.add('active');
      if (mainAuthForm) mainAuthForm.style.display = 'none';
      if (btnTabSignIn) btnTabSignIn.parentElement.style.display = 'none';
    }
  }

  if (btnSignOut) {
    btnSignOut.addEventListener('click', () => {
      localStorage.removeItem('tursiops_token');
      if (userProfileCard) userProfileCard.classList.remove('active');
      if (mainAuthForm) mainAuthForm.style.display = 'block';
      if (btnTabSignIn) btnTabSignIn.parentElement.style.display = 'flex';
      showToast('Signed out of session');
    });
  }

  // 4. Form Submit Handler
  mainAuthForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert();

    const email = inputEmail.value.trim();
    const password = inputPassword.value;

    if (!email || !password) {
      showAlert('Please enter both email and password.');
      return;
    }

    if (mode === 'signup' && password.length < 6) {
      showAlert('Password must be at least 6 characters.');
      return;
    }

    // Set loading state
    btnSubmit.disabled = true;
    submitSpinner.style.display = 'inline';

    const endpoint = mode === 'signup' ? '/signup' : '/login';
    const query = redirectUri ? `?redirect_uri=${encodeURIComponent(redirectUri)}` : '';
    const fullUrl = `${endpoint}${query}`;

    try {
      if (redirectUri) {
        // If there's an IDE redirect_uri, submit as a standard HTML form to let the browser trigger the 302 to vscode://
        const tempForm = document.createElement('form');
        tempForm.method = 'POST';
        tempForm.action = fullUrl;

        const emailField = document.createElement('input');
        emailField.type = 'hidden';
        emailField.name = 'email';
        emailField.value = email;
        tempForm.appendChild(emailField);

        const passField = document.createElement('input');
        passField.type = 'hidden';
        passField.name = 'password';
        passField.value = password;
        tempForm.appendChild(passField);

        document.body.appendChild(tempForm);
        tempForm.submit();
        return;
      }

      // Standard Web Session: JSON API fetch
      const res = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || 'Authentication failed');
      }

      // Save token and display session
      if (data.token) {
        localStorage.setItem('tursiops_token', data.token);
      }

      showAlert(mode === 'signup' ? 'Account created successfully!' : 'Signed in successfully!', 'success');
      showToast(mode === 'signup' ? '✓ Registered with Turso libSQL' : '✓ Authenticated successfully');

      if (data.user) {
        showUserProfile(data.user);
      }
    } catch (err) {
      showAlert(err.message || 'An error occurred during authentication.');
    } finally {
      btnSubmit.disabled = false;
      submitSpinner.style.display = 'none';
    }
  });
}
