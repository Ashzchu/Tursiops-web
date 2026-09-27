/**
 * TURSIOPS v2.2 — VS Code Extension Portal & User Manual Controller
 * Pixel Theme, Dynamic Navigation Scrollspy, ASCII Dolphin Cursor Follower,
 * and Button Pixel Dispersion Particles.
 * 
 * NOTE: All Authorization Modal flows, Turso DB calls, and VS Code deep link callbacks
 * are strictly preserved and untouched.
 */

document.addEventListener('DOMContentLoaded', () => {
  initPortalApp();
  initDynamicNavHighlight();
  initInteractiveBackgroundWithAsciiTrail();
  initPixelDispersionEngine();
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

/**
 * 1. DYNAMIC NAVIGATION BAR SCROLLSPY HIGHLIGHT
 * Dynamically highlights the current section as the user scrolls
 */
function initDynamicNavHighlight() {
  const navItems = document.querySelectorAll('.nav-item');
  const sections = ['how-it-works', 'features', 'security', 'manual'];

  function updateActiveNav() {
    const scrollPosition = window.scrollY + 160;

    let currentSection = '';

    for (let i = sections.length - 1; i >= 0; i--) {
      const sectionEl = document.getElementById(sections[i]);
      if (sectionEl) {
        const top = sectionEl.offsetTop;
        if (scrollPosition >= top) {
          currentSection = sections[i];
          break;
        }
      }
    }

    // Default to first if near top
    if (!currentSection && window.scrollY < 300) {
      currentSection = 'how-it-works';
    }

    navItems.forEach(item => {
      const href = item.getAttribute('href') || '';
      const targetId = href.replace('#', '');
      const dataSec = item.getAttribute('data-section');

      if (targetId === currentSection || dataSec === currentSection) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }

  window.addEventListener('scroll', updateActiveNav, { passive: true });
  window.addEventListener('resize', updateActiveNav, { passive: true });
  updateActiveNav();

  // Click smooth handler
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      const targetId = item.getAttribute('href');
      if (targetId && targetId.startsWith('#')) {
        navItems.forEach(n => n.classList.remove('active'));
        item.classList.add('active');
      }
    });
  });
}

/**
 * 2. INTERACTIVE BACKGROUND & BLUE ASCII CURSOR TRAIL
 * Reference: adityandt.in interactive background grid with subtle organic floating wobble,
 * mouse distance repulsion and luminescence, plus a glowing Blue ASCII trail streaming
 * from the cursor's tail in the background.
 */
function initInteractiveBackgroundWithAsciiTrail() {
  const canvas = document.getElementById('interactive-bg');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  let width, height;
  let mouseX = -2000;
  let mouseY = -2000;

  const spacing = 28;
  const hoverRadius = 160;

  // Blue theme color palette for ASCII trail & shards
  const asciiChars = ['*', '+', '×', '·', '°', '~', '^', '░', '▒', '1', '0', ':', '<', '>', '/', '#', '$', '%'];
  const bluePalette = ['#00f0ff', '#38bdf8', '#60a5fa', '#93c5fd', '#0284c7', '#a5f3fc', '#ffffff'];
  const asciiTrail = [];

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
  }

  window.addEventListener('resize', resize);
  resize();

  window.addEventListener('mousemove', (e) => {
    const prevX = mouseX;
    const prevY = mouseY;
    mouseX = e.clientX;
    mouseY = e.clientY;

    const dx = mouseX - prevX;
    const dy = mouseY - prevY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Spawn glowing blue ASCII characters emerging from cursor's tail
    if (dist > 1.5 && prevX > -1000) {
      const spawnCount = Math.min(4, Math.max(1, Math.floor(dist / 14) + 1));
      for (let i = 0; i < spawnCount; i++) {
        // Position slightly behind cursor movement vector
        const offsetRatio = i / spawnCount;
        const trailX = mouseX - dx * offsetRatio + (Math.random() * 8 - 4);
        const trailY = mouseY - dy * offsetRatio + (Math.random() * 8 - 4);

        asciiTrail.push({
          char: asciiChars[Math.floor(Math.random() * asciiChars.length)],
          x: trailX,
          y: trailY,
          vx: -(dx * 0.08) + (Math.random() - 0.5) * 1.6,
          vy: -(dy * 0.08) + (Math.random() - 0.5) * 1.6 - 0.3,
          color: bluePalette[Math.floor(Math.random() * bluePalette.length)],
          alpha: 1.0,
          decay: Math.random() * 0.018 + 0.016, // fade smoothly over ~1-1.5s
          size: Math.floor(Math.random() * 6) + 13, // 13px - 18px
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.06
        });
      }
    }
  });

  window.addEventListener('mouseleave', () => {
    mouseX = -2000;
    mouseY = -2000;
  });

  function draw() {
    ctx.clearRect(0, 0, width, height);
    const time = performance.now() * 0.001;

    // A. adityandt.in Inspired Interactive Background Matrix
    for (let x = 0; x < width; x += spacing) {
      for (let y = 0; y < height; y += spacing) {
        // Floating organic wobble
        const wobbleX = Math.sin(x * 0.05 + time) * 3;
        const wobbleY = Math.cos(y * 0.05 + time * 0.8) * 3;

        let finalX = x + wobbleX;
        let finalY = y + wobbleY;

        const dx = mouseX - finalX;
        const dy = mouseY - finalY;
        const distSq = dx * dx + dy * dy;

        // Hash for deterministic subtle flicker variation
        const hash = Math.floor(Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453));
        const flickerRate = 1.0 + (hash % 5) * 0.2;
        const flicker = (Math.sin(time * flickerRate + hash) + 1) / 2;
        let opacity = 0.04 + flicker * 0.14; // Subtle ambient baseline
        let currentRadius = 1.0;

        // Mouse interaction: push repulsion + luminescent cyan flare
        if (distSq < hoverRadius * hoverRadius) {
          const distance = Math.sqrt(distSq);
          const rawFactor = 1 - (distance / hoverRadius);
          const factor = rawFactor * rawFactor * (3 - 2 * rawFactor);

          opacity = opacity * (1 - factor) + 0.75 * factor; // Brighten up to 0.75

          if (distance > 0) {
            const pushForce = factor * 7;
            finalX -= (dx / distance) * pushForce;
            finalY -= (dy / distance) * pushForce;
          }

          currentRadius = 1.0 + (factor * 2.0);
        }

        // Render pixelated shard / diamond point in cyber blue
        ctx.fillStyle = `rgba(0, 240, 255, ${opacity})`;
        ctx.beginPath();
        const numVerts = 4; // 4-pointed diamond/square shard
        for (let v = 0; v < numVerts; v++) {
          const angle = (v / numVerts) * Math.PI * 2 + (hash % 100) * 0.1 + time * 0.15;
          const px = finalX + Math.cos(angle) * currentRadius * 1.5;
          const py = finalY + Math.sin(angle) * currentRadius * 1.5;
          if (v === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      }
    }

    // B. Blue ASCII Trail Emerging from Cursor's Tail
    for (let i = asciiTrail.length - 1; i >= 0; i--) {
      const p = asciiTrail[i];
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.vRot;
      p.alpha -= p.decay;

      if (p.alpha <= 0) {
        asciiTrail.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.font = `${p.size}px 'VT323', monospace`;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillText(p.char, 0, 0);
      ctx.restore();
    }

    requestAnimationFrame(draw);
  }

  draw();
}


/**
 * 3. BUTTON PIXEL DISPERSION ENGINE
 * On hover over 'Authorize VS Code' or 'Open User Manual' buttons,
 * square pixels disperse from the buttons into the surrounding air.
 */
function initPixelDispersionEngine() {
  const canvas = document.getElementById('pixelDispersionCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  const particles = [];
  const palette = ['#00f0ff', '#38bdf8', '#0284c7', '#ffffff', '#10b981', '#67e8f9', '#93c5fd'];
  const disperseButtons = document.querySelectorAll('.btn-pixel-disperse, #btnHeroAuth, #btnHeroManual, #btnNavAuth');

  const trackedButtons = [];

  disperseButtons.forEach(btn => {
    const item = {
      element: btn,
      isHovered: false,
      lastMouseX: 0,
      lastMouseY: 0
    };

    btn.addEventListener('mouseenter', (e) => {
      item.isHovered = true;
      item.lastMouseX = e.clientX;
      item.lastMouseY = e.clientY;
      // Burst of pixels on enter
      spawnPixelBurst(item.element, e.clientX, e.clientY, 16);
    });

    btn.addEventListener('mouseleave', () => {
      item.isHovered = false;
    });

    btn.addEventListener('mousemove', (e) => {
      item.lastMouseX = e.clientX;
      item.lastMouseY = e.clientY;
      // Continuous cursor trace pixels
      spawnPointPixels(e.clientX, e.clientY, 3);
    });

    trackedButtons.push(item);
  });

  function spawnPixelBurst(element, originX, originY, count = 12) {
    const rect = element.getBoundingClientRect();
    for (let i = 0; i < count; i++) {
      const size = Math.floor(Math.random() * 4) + 3; // 3 to 6 px
      const color = palette[Math.floor(Math.random() * palette.length)];
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3.5 + 1.2;

      particles.push({
        x: originX || (rect.left + Math.random() * rect.width),
        y: originY || (rect.top + Math.random() * rect.height),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5, // upward bias
        size: size,
        color: color,
        alpha: 1.0,
        decay: Math.random() * 0.02 + 0.015,
        life: 1.0
      });
    }
  }

  function spawnPointPixels(x, y, count = 2) {
    for (let i = 0; i < count; i++) {
      const size = Math.floor(Math.random() * 3) + 3;
      const color = palette[Math.floor(Math.random() * palette.length)];
      particles.push({
        x: x + (Math.random() * 12 - 6),
        y: y + (Math.random() * 12 - 6),
        vx: (Math.random() - 0.5) * 3,
        vy: -(Math.random() * 3 + 1), // floating upward
        size: size,
        color: color,
        alpha: 1.0,
        decay: Math.random() * 0.025 + 0.02,
        life: 1.0
      });
    }
  }

  function spawnEdgePixels(element) {
    const rect = element.getBoundingClientRect();
    const count = 3;

    for (let i = 0; i < count; i++) {
      const side = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
      let px, py, vx, vy;
      const size = Math.floor(Math.random() * 4) + 3;
      const color = palette[Math.floor(Math.random() * palette.length)];

      if (side === 0) { // top
        px = rect.left + Math.random() * rect.width;
        py = rect.top;
        vx = (Math.random() - 0.5) * 2;
        vy = -(Math.random() * 3 + 1.5);
      } else if (side === 1) { // right
        px = rect.right;
        py = rect.top + Math.random() * rect.height;
        vx = Math.random() * 2.5 + 0.5;
        vy = -(Math.random() * 2 + 0.5);
      } else if (side === 2) { // bottom
        px = rect.left + Math.random() * rect.width;
        py = rect.bottom;
        vx = (Math.random() - 0.5) * 2;
        vy = Math.random() * 1.5 + 0.5;
      } else { // left
        px = rect.left;
        py = rect.top + Math.random() * rect.height;
        vx = -(Math.random() * 2.5 + 0.5);
        vy = -(Math.random() * 2 + 0.5);
      }

      particles.push({
        x: px,
        y: py,
        vx: vx,
        vy: vy,
        size: size,
        color: color,
        alpha: 1.0,
        decay: Math.random() * 0.02 + 0.015,
        life: 1.0
      });
    }
  }

  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;

    // Spawn edge dispersion while hovered
    trackedButtons.forEach(item => {
      if (item.isHovered) {
        spawnEdgePixels(item.element);
      }
    });

    // Update & draw particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy -= 0.035; // gentle upward buoyancy
      p.alpha -= p.decay;

      if (p.alpha <= 0) {
        particles.splice(i, 1);
        continue;
      }

      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.alpha);
      // Snap to crisp pixel coordinate
      ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
    }

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}

/**
 * 4. EXTENSION PORTAL CONTROLLER & MODAL AUTHENTICATION
 * UNTOUCHED Form Submission, Turso Database Integration, JWT Verification & VS Code Deep Linking
 */
function initPortalApp() {
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
  const modalCredentialsArea = document.getElementById('modalCredentialsArea');
  const navAuthActions = document.getElementById('navAuthActions');

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
      modalUnlockHint.className = 'vscode-unlock-hint unlocked';
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
      modalUnlockHint.className = 'vscode-unlock-hint';
      modalUnlockHint.textContent = mode === 'signup'
        ? '> Complete account creation above to unlock VS Code integration.'
        : '> Complete sign in above to unlock VS Code integration.';
    }
  }

  function renderModalSignedInState(user, token) {
    const rollbackUrl = `vscode://tursiops-ai.tursiops/auth?token=${encodeURIComponent(token)}&email=${encodeURIComponent(user.email)}`;
    unlockModalVsCodeButton(rollbackUrl, user.email);

    if (modalCredentialsArea) modalCredentialsArea.style.display = 'none';
    if (modalActiveSessionContainer) {
      modalActiveSessionContainer.innerHTML = `
        <div class="signed-in-panel pixel-box">
          <div class="signed-in-user-row">
            <div class="signed-in-avatar">🐬</div>
            <div class="signed-in-meta">
              <div class="signed-in-label">ACTIVE SESSION</div>
              <div class="signed-in-email">${user.email}</div>
            </div>
          </div>
          <button type="button" class="btn-signout" id="btnModalSignOut">
            <span>🚪 SIGN OUT</span>
          </button>
          <a href="#" class="switch-account-link" id="btnModalSwitchAccount">Sign in with a different account &rarr;</a>
        </div>
      `;
      document.getElementById('btnModalSignOut')?.addEventListener('click', performModalSignOut);
      document.getElementById('btnModalSwitchAccount')?.addEventListener('click', (e) => {
        e.preventDefault();
        if (modalCredentialsArea) modalCredentialsArea.style.display = 'block';
      });
    }

    // Update nav actions if present
    if (navAuthActions) {
      navAuthActions.innerHTML = `
        <div class="nav-user-badge">
          <span class="nav-user-email">${user.email}</span>
          <button type="button" class="nav-btn-signout" id="navBtnSignOut">SIGN OUT</button>
        </div>
      `;
      document.getElementById('navBtnSignOut')?.addEventListener('click', performModalSignOut);
    }
  }

  function renderModalSignedOutState() {
    if (modalCredentialsArea) modalCredentialsArea.style.display = 'block';
    if (modalActiveSessionContainer) modalActiveSessionContainer.innerHTML = '';
    if (navAuthActions) {
      navAuthActions.innerHTML = `
        <button type="button" class="nav-btn-auth btn-pixel-disperse" id="btnNavAuth">
          <span class="btn-inner">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <span>AUTHORIZE EXTENSION</span>
          </span>
        </button>
      `;
      document.getElementById('btnNavAuth')?.addEventListener('click', () => openModal('login'));
    }
    lockModalVsCodeButton();
    if (popupAuthForm) popupAuthForm.reset();
    if (btnModalSubmit) {
      btnModalSubmit.disabled = false;
      modalSubmitText.textContent = mode === 'signup' ? 'CREATE ACCOUNT' : 'SIGN IN';
    }
  }

  async function performModalSignOut(e) {
    if (e) e.preventDefault();
    localStorage.removeItem('tursiops_token');
    await fetch('/api/logout', { method: 'POST' }).catch(() => {});
    renderModalSignedOutState();
    showToast('✓ You have signed out successfully.');
    showAlert('✓ Signed out successfully.', false);
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
        renderModalSignedInState(data.user, storedToken);
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
    if (!authModal) return;
    setMode(initialMode);
    authModal.classList.add('active');
    authModal.setAttribute('aria-hidden', 'false');
    clearAlert();
  }

  function closeModal() {
    if (!authModal) return;
    authModal.classList.remove('active');
    authModal.setAttribute('aria-hidden', 'true');
    clearAlert();
  }

  [btnNavAuth, btnHeroAuth].forEach(btn => {
    if (btn) btn.addEventListener('click', () => openModal('login'));
  });

  if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);

  if (authModal) {
    authModal.addEventListener('click', (e) => {
      if (e.target === authModal) closeModal();
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && authModal && authModal.classList.contains('active')) {
      closeModal();
    }
  });

  function setMode(newMode) {
    mode = newMode;
    clearAlert();
    if (btnModalSubmit) btnModalSubmit.style.display = '';

    if (mode === 'signup') {
      if (modalTabSignUp) modalTabSignUp.classList.add('active');
      if (modalTabSignIn) modalTabSignIn.classList.remove('active');
      if (modalHeading) modalHeading.textContent = 'CREATE EXTENSION ACCOUNT';
      if (modalSubmitText) modalSubmitText.textContent = 'CREATE ACCOUNT';
      if (groupName) groupName.style.display = 'block';
      if (groupConfirmPassword) groupConfirmPassword.style.display = 'block';
      if (btnModalOpenVsCode && btnModalOpenVsCode.classList.contains('locked')) {
        if (modalVsCodeLabel) modalVsCodeLabel.textContent = 'OPEN IN VS CODE (CREATE ACCOUNT FIRST)';
        if (modalUnlockHint) modalUnlockHint.textContent = '> Complete account creation above to unlock VS Code integration.';
      }
    } else {
      if (modalTabSignIn) modalTabSignIn.classList.add('active');
      if (modalTabSignUp) modalTabSignUp.classList.remove('active');
      if (modalHeading) modalHeading.textContent = 'AUTHORIZE VS CODE EXTENSION';
      if (modalSubmitText) modalSubmitText.textContent = 'SIGN IN';
      if (groupName) groupName.style.display = 'none';
      if (groupConfirmPassword) groupConfirmPassword.style.display = 'none';
      if (btnModalOpenVsCode && btnModalOpenVsCode.classList.contains('locked')) {
        if (modalVsCodeLabel) modalVsCodeLabel.textContent = 'OPEN IN VS CODE (SIGN IN FIRST)';
        if (modalUnlockHint) modalUnlockHint.textContent = '> Complete sign in above to unlock VS Code integration.';
      }
    }
  }

  if (modalTabSignIn) modalTabSignIn.addEventListener('click', () => setMode('login'));
  if (modalTabSignUp) modalTabSignUp.addEventListener('click', () => setMode('signup'));

  function showAlert(msg, isError = true) {
    if (!authAlertBox) return;
    authAlertBox.textContent = msg;
    authAlertBox.className = `auth-alert-box ${isError ? 'error' : 'success'}`;
    authAlertBox.style.display = 'block';
  }

  function clearAlert() {
    if (!authAlertBox) return;
    authAlertBox.style.display = 'none';
    authAlertBox.textContent = '';
  }

  // Submit Handler
  if (popupAuthForm) {
    popupAuthForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearAlert();

      const email = modalEmail?.value.trim();
      const password = modalPassword?.value;
      const name = modalName?.value.trim();
      const confirmPassword = modalConfirmPassword?.value;

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

      if (btnModalSubmit) btnModalSubmit.disabled = true;
      if (modalSpinner) modalSpinner.style.display = 'inline-block';
      if (modalSubmitText) modalSubmitText.textContent = mode === 'signup' ? 'CREATING...' : 'SIGNING IN...';

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

        const user = data.user || { email };
        renderModalSignedInState(user, data.token);

        showAlert(mode === 'signup' 
          ? '✓ Account created! VS Code integration unlocked.' 
          : '✓ Sign-in successful! VS Code integration unlocked.', false);

        showToast(mode === 'signup' ? '✓ Account created! Redirecting to VS Code...' : '✓ Authorized for VS Code!');

        const rollbackUrl = data.redirect_url || data.vscode_link || `vscode://tursiops-ai.tursiops/auth?token=${encodeURIComponent(data.token)}&email=${encodeURIComponent(user.email)}`;

        // Trigger deep link navigation
        window.location.href = rollbackUrl;

      } catch (err) {
        showAlert(err.message || 'Error processing request.');
        if (btnModalSubmit) btnModalSubmit.disabled = false;
        if (modalSubmitText) modalSubmitText.textContent = mode === 'signup' ? 'CREATE ACCOUNT' : 'SIGN IN';
      } finally {
        if (modalSpinner) modalSpinner.style.display = 'none';
      }
    });
  }
}
