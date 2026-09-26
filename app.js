/**
 * TURSIOPS — Interactive Landing Page Engine
 * Minimalist Developer-First Mechanics & Web Terminal Simulator
 */

document.addEventListener('DOMContentLoaded', () => {
  initCopyButtons();
  initDemoTabs();
  initTerminal();
  initAuthModal();
  initActivityBar();
  initAiSimulation();
  initAsciiEffect();
});

/* ==========================================================================
   Toast Notification System
   ========================================================================== */
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

/* ==========================================================================
   Clipboard Copy Handlers
   ========================================================================== */
function initCopyButtons() {
  const btnCopyInstall = document.getElementById('btnCopyInstall');
  const cliInstallCmd = document.getElementById('cliInstallCmd');
  const btnCtaInstall = document.getElementById('btnCtaInstall');

  const copyCommand = (cmdText, targetBtn) => {
    navigator.clipboard.writeText(cmdText).then(() => {
      if (targetBtn) {
        const statusSpan = targetBtn.querySelector('.copy-status');
        if (statusSpan) {
          const original = statusSpan.textContent;
          statusSpan.textContent = 'Copied!';
          setTimeout(() => {
            statusSpan.textContent = original;
          }, 2000);
        }
      }
      showToast('✓ Copied to clipboard: ' + cmdText);
    }).catch(() => {
      showToast('Clipboard access denied, copy manually.');
    });
  };

  if (btnCopyInstall && cliInstallCmd) {
    btnCopyInstall.addEventListener('click', () => {
      copyCommand(cliInstallCmd.textContent.trim(), btnCopyInstall);
    });
  }

  if (btnCtaInstall) {
    btnCtaInstall.addEventListener('click', () => {
      copyCommand('curl -fsSL https://tursiops.dev/install.sh | sh', btnCtaInstall);
    });
  }
}

/* ==========================================================================
   Hero IDE Activity Bar Icons
   ========================================================================== */
function initActivityBar() {
  const activityButtons = document.querySelectorAll('.activity-btn');
  const statusLed = document.querySelector('.status-led');

  activityButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      activityButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const title = btn.getAttribute('title') || 'View';
      showToast(`Switched view to: ${title}`);

      if (statusLed) {
        statusLed.style.backgroundColor = '#38bdf8';
        setTimeout(() => {
          statusLed.style.backgroundColor = '#10b981';
        }, 500);
      }
    });
  });
}

/* ==========================================================================
   Interactive Demo / IDE Tabs
   ========================================================================== */
function initDemoTabs() {
  const tabs = document.querySelectorAll('.demo-tab');
  const panes = {
    editor: document.getElementById('paneEditor'),
    memory: document.getElementById('paneMemory'),
    graph: document.getElementById('paneGraph')
  };

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      Object.values(panes).forEach(pane => {
        if (pane) pane.classList.remove('active');
      });

      if (panes[target]) {
        panes[target].classList.add('active');
      }
    });
  });
}

/* ==========================================================================
   AI Edit Simulation Trigger
   ========================================================================== */
function initAiSimulation() {
  const btnSimulate = document.getElementById('btnSimulatePrompt');
  const callout = document.getElementById('directiveCallout');
  let simulated = false;

  if (!btnSimulate || !callout) return;

  btnSimulate.addEventListener('click', () => {
    simulated = !simulated;

    if (simulated) {
      callout.style.background = 'rgba(239, 68, 68, 0.15)';
      callout.style.borderLeftColor = '#ef4444';
      callout.innerHTML = `
        <span class="directive-badge" style="color: #ef4444;">⚠️ REGRESSION BLOCKED BY TURSIOPS</span>
        <span class="directive-text" style="color: #fca5a5;">Agent Claude-3.7 attempted: <code>alg: 'HS256'</code> & omitted <code>tenant_id</code>.</span>
        <span class="directive-meta">Directive #dir_auth_09 strictly enforced. Reverted in 14ms.</span>
      `;
      btnSimulate.textContent = 'Reset Simulation';
      showToast('🛡️ Tursiops successfully guarded your architectural directive!');
    } else {
      callout.style.background = 'rgba(56, 189, 248, 0.07)';
      callout.style.borderLeftColor = 'var(--accent-cyan)';
      callout.innerHTML = `
        <span class="directive-badge">🐬 TURSIOPS DIRECTIVE ACTIVE</span>
        <span class="directive-text">CRITICAL RULE [Pinned by Dev, Session #14]: "Never downgrade algorithm from RS256 to HS256. All session tokens must include tenant_id claim."</span>
        <span class="directive-meta">Recorded across 4 AI sessions • 0 regressions detected</span>
      `;
      btnSimulate.textContent = 'Run AI Edit Simulation';
      showToast('Simulation reset to active memory state.');
    }
  });
}

/* ==========================================================================
   Terminal Playground Simulator
   ========================================================================== */
function initTerminal() {
  const termBody = document.getElementById('termBody');
  const termInput = document.getElementById('termInput');
  const termInputRow = document.getElementById('termInputRow');
  const btnClear = document.getElementById('btnClearTerm');
  const cmdPills = document.querySelectorAll('.cmd-pill');

  if (!termBody || !termInput) return;

  const commands = {
    'help': `Available commands:
  tursiops init                       Initialize memory vault in current git repo
  tursiops status                     Display tracked files and active directives
  tursiops recall [file]              Inspect persistent context for specific file
  tursiops remember [text]            Pin a persistent directive across AI agents
  tursiops diff                       Show directives modified in recent sessions
  clear                               Clear terminal screen`,

    'tursiops init': `[INFO] Initializing .tursiops/ repository vault...
[SUCCESS] Created .tursiops/directives.json
[SUCCESS] Created .tursiops/graph.db (SQLite local cache)
[INFO] Scanning workspace: 148 files indexed (AST symbols parsed)
[READY] Tursiops is active. Pinned directives will automatically inject into AI agent prompts.`,

    'tursiops status': `TURSIOPS PERSISTENT MEMORY STATUS (v1.2.0)
────────────────────────────────────────────────────
Repository:           github.com/Ashzchu/Tursiops-web
Vault Mode:           Local-First (Offline Ready)
Tracked Files:        148
Active Directives:    24 pinned rules
Cross-Agent Sync:     Claude Code, Cursor, Copilot, Antigravity
Merge Driver:         git-merge-tursiops [installed]
Last Memory Snapshot: 2 minutes ago`,

    'tursiops recall src/auth/session.ts': `MEMORIES FOR: src/auth/session.ts
────────────────────────────────────────────────────
[DIRECTIVE #dir_auth_09] (Severity: BLOCKER)
Rule:       "Never downgrade algorithm from RS256 to HS256. All tokens must include tenant_id."
Origin:     Session #14 (by Ashzchu)
Agents:     Claude Code, Cursor
Confidence: 100% (Pinned)`,

    'tursiops recall auth': `MEMORIES FOR: src/auth/session.ts
────────────────────────────────────────────────────
[DIRECTIVE #dir_auth_09] (Severity: BLOCKER)
Rule:       "Never downgrade algorithm from RS256 to HS256. All tokens must include tenant_id."
Origin:     Session #14 (by Ashzchu)
Agents:     Claude Code, Cursor
Confidence: 100% (Pinned)`,

    'tursiops diff': `DIRECTIVE REVISION HISTORY (Last 3 Sessions):
────────────────────────────────────────────────────
+ [ADD] src/routes/api.ts: "Rate limit strict on public POST endpoints"
+ [PIN] src/auth/session.ts: "RS256 algorithm enforcement"
~ [MOD] src/db/client.ts: "Added connection pool max limit: 20"`,

    'tursiops remember \'Always use CSP strict nonces\'': `[SAVED] New Directive registered:
ID:       dir_sec_${Math.floor(1000 + Math.random() * 9000)}
Target:   **/*.{html,ts,tsx}
Rule:     "Always use CSP strict nonces"
Scope:    Global Repository
Status:   Synced to .tursiops/directives.json`,

    'clear': '__CLEAR__'
  };

  const executeCommand = (cmdText) => {
    const raw = cmdText.trim();
    if (!raw) return;

    if (raw.toLowerCase() === 'clear') {
      const rows = termBody.querySelectorAll('.term-row:not(#termInputRow)');
      rows.forEach(r => r.remove());
      return;
    }

    // Add echo row
    const echoRow = document.createElement('div');
    echoRow.className = 'term-row';
    echoRow.innerHTML = `<span class="term-prompt">user@dev:~/repo$</span> <span class="term-hl">${escapeHtml(raw)}</span>`;
    termBody.insertBefore(echoRow, termInputRow);

    // Look up command
    let output = '';
    if (commands[raw]) {
      output = commands[raw];
    } else if (raw.startsWith('tursiops remember')) {
      const arg = raw.replace(/^tursiops remember\s*/, '').replace(/['"]/g, '');
      output = `[SAVED] Directive registered: "${arg}"\nTarget: Global\nStatus: Persisted locally in .tursiops/directives.json`;
    } else if (raw.startsWith('tursiops recall')) {
      output = commands['tursiops recall src/auth/session.ts'];
    } else {
      output = `tursiops: command not recognized: "${raw}". Type 'help' for available commands.`;
    }

    // Add response row
    const outRow = document.createElement('div');
    outRow.className = 'term-row';
    if (output.startsWith('[SUCCESS]') || output.startsWith('[SAVED]')) {
      outRow.classList.add('term-output-success');
    } else if (output.includes('not recognized')) {
      outRow.classList.add('term-output-error');
    } else {
      outRow.classList.add('term-output-info');
    }
    outRow.style.whiteSpace = 'pre-wrap';
    outRow.textContent = output;
    termBody.insertBefore(outRow, termInputRow);

    // Scroll to bottom
    termBody.scrollTop = termBody.scrollHeight;
  };

  termInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const val = termInput.value;
      termInput.value = '';
      executeCommand(val);
    }
  });

  cmdPills.forEach(pill => {
    pill.addEventListener('click', () => {
      const cmd = pill.dataset.cmd;
      if (cmd) {
        termInput.value = cmd;
        executeCommand(cmd);
        termInput.value = '';
      }
    });
  });

  if (btnClear) {
    btnClear.addEventListener('click', () => {
      const rows = termBody.querySelectorAll('.term-row:not(#termInputRow)');
      rows.forEach(r => r.remove());
    });
  }
}

/* ==========================================================================
   Sign In / Sign Up Modal Handling
   ========================================================================== */
function initAuthModal() {
  const modal = document.getElementById('authModal');
  const btnClose = document.getElementById('btnCloseModal');
  const btnHeroSignIn = document.getElementById('btnHeroSignIn');
  const btnHeroSignUp = document.getElementById('btnHeroSignUp');
  const btnNavSignIn = document.getElementById('navSignInBtn');
  const btnContinueOffline = document.getElementById('btnContinueOffline');
  const btnModalOfflineSwitch = document.getElementById('btnModalOfflineSwitch');
  const tabSignIn = document.getElementById('tabSignIn');
  const tabSignUp = document.getElementById('tabSignUp');
  const tabOffline = document.getElementById('tabOffline');
  const modalTitle = document.getElementById('modalTitle');
  const authForm = document.getElementById('authForm');
  const btnSubmitAuth = document.getElementById('btnSubmitAuth');
  const passwordGroup = document.getElementById('passwordGroup');

  if (!modal) return;

  const openModal = (mode = 'signin') => {
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    setModalMode(mode);
  };

  const closeModal = () => {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
  };

  const setModalMode = (mode) => {
    [tabSignIn, tabSignUp, tabOffline].forEach(t => t && t.classList.remove('active'));

    if (mode === 'signin') {
      if (tabSignIn) tabSignIn.classList.add('active');
      if (modalTitle) modalTitle.textContent = 'Sign In to Tursiops';
      if (btnSubmitAuth) btnSubmitAuth.textContent = 'Sign In to Memory Vault';
      if (passwordGroup) passwordGroup.style.display = 'flex';
    } else if (mode === 'signup') {
      if (tabSignUp) tabSignUp.classList.add('active');
      if (modalTitle) modalTitle.textContent = 'Create Developer Account';
      if (btnSubmitAuth) btnSubmitAuth.textContent = 'Initialize Vault & Register';
      if (passwordGroup) passwordGroup.style.display = 'flex';
    } else if (mode === 'offline') {
      if (tabOffline) tabOffline.classList.add('active');
      if (modalTitle) modalTitle.textContent = 'Generate Local Offline Key';
      if (btnSubmitAuth) btnSubmitAuth.textContent = 'Create Air-Gapped Keyphrase';
      if (passwordGroup) passwordGroup.style.display = 'none';
    }
  };

  if (btnHeroSignIn) btnHeroSignIn.addEventListener('click', () => openModal('signin'));
  if (btnNavSignIn) btnNavSignIn.addEventListener('click', () => openModal('signin'));
  if (btnHeroSignUp) btnHeroSignUp.addEventListener('click', () => openModal('signup'));

  if (btnContinueOffline) {
    btnContinueOffline.addEventListener('click', (e) => {
      e.preventDefault();
      showToast('🐬 Offline Vault Active! Local repository memory ready at .tursiops/');
    });
  }

  if (btnModalOfflineSwitch) {
    btnModalOfflineSwitch.addEventListener('click', () => {
      setModalMode('offline');
    });
  }

  if (tabSignIn) tabSignIn.addEventListener('click', () => setModalMode('signin'));
  if (tabSignUp) tabSignUp.addEventListener('click', () => setModalMode('signup'));
  if (tabOffline) tabOffline.addEventListener('click', () => setModalMode('offline'));

  if (btnClose) btnClose.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      closeModal();
    }
  });

  if (authForm) {
    authForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('authEmail')?.value || 'user';
      closeModal();
      showToast(`✓ Authentication complete for ${email}. Session connected.`);
    });
  }

  const btnGitAuth = document.getElementById('btnGitAuth');
  if (btnGitAuth) {
    btnGitAuth.addEventListener('click', () => {
      closeModal();
      showToast('✓ Authenticated with GitHub OAuth. Memory Vault connected.');
    });
  }
}

/* ==========================================================================
   ASCII Logo Dynamic Ambient Interaction
   ========================================================================== */
function initAsciiEffect() {
  const asciiWrapper = document.getElementById('asciiWrapper');
  const asciiLogo = asciiWrapper?.querySelector('.ascii-logo');

  if (!asciiWrapper || !asciiLogo) return;

  asciiWrapper.addEventListener('mousemove', (e) => {
    const rect = asciiWrapper.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    const angleX = (y / rect.height) * -8;
    const angleY = (x / rect.width) * 8;

    asciiLogo.style.transform = `perspective(500px) rotateX(${angleX}deg) rotateY(${angleY}deg)`;
  });

  asciiWrapper.addEventListener('mouseleave', () => {
    asciiLogo.style.transform = 'perspective(500px) rotateX(0deg) rotateY(0deg)';
  });
}

/* Helper to prevent XSS in simulated terminal */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
