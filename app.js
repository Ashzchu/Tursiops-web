/**
 * TURSIOPS — Interactive Engine & Real-Time ASCII Ocean Simulation
 * Features dynamic ASCII water physics, jumping/diving dolphin, and developer UI mechanics.
 */

document.addEventListener('DOMContentLoaded', () => {
  initAsciiOcean();
  initCopyButtons();
  initDemoTabs();
  initTerminal();
  initAuthModal();
  initExtensionInteractions();
  initAiSimulation();
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
   Real-Time ASCII Ocean & Diving Dolphin Simulation Engine
   ========================================================================== */
function initAsciiOcean() {
  const canvas = document.getElementById('asciiCanvas');
  const container = document.getElementById('asciiCanvasContainer');
  const btnLeap = document.getElementById('btnLeapDolphin');
  const btnSea = document.getElementById('btnToggleSeaState');
  const btnPlay = document.getElementById('btnTogglePlay');
  const telemetry = document.getElementById('oceanTelemetry');
  const fpsLabel = document.getElementById('oceanFps');
  const seaStateLabel = document.getElementById('seaStateLabel');

  if (!canvas) return;

  // Grid Dimensions
  const COLS = 76;
  const ROWS = 17;
  const BASE_WATER_ROW = 9.5;

  // Sea State Profiles
  const seaProfiles = {
    'Swell': { amp1: 1.5, amp2: 0.8, freq1: 0.11, freq2: 0.23, speed: 2.2, label: 'Swell' },
    'Rough': { amp1: 2.3, amp2: 1.2, freq1: 0.14, freq2: 0.28, speed: 3.4, label: 'Rough' },
    'Calm':  { amp1: 0.8, amp2: 0.4, freq1: 0.08, freq2: 0.16, speed: 1.4, label: 'Calm' }
  };
  const seaKeys = ['Swell', 'Rough', 'Calm'];
  let currentSeaIndex = 0;
  let sea = seaProfiles[seaKeys[currentSeaIndex]];

  // Ripple propagation array
  const ripples = new Float32Array(COLS);
  const rippleVel = new Float32Array(COLS);

  // Particles: Splashes & Bubbles
  const particles = [];

  // Dolphin State Machine
  const STATE_CRUISING = 'Cruising';
  const STATE_PREPARING = 'Swooping';
  const STATE_LEAPING = 'Leaping';
  const STATE_APEX = 'Cresting';
  const STATE_DIVING = 'Diving';
  const STATE_RECOVERING = 'Submerging';

  const dolphin = {
    x: 8,
    y: 13,
    vx: 0.38,
    vy: 0,
    state: STATE_CRUISING,
    swimCycle: 0,
    leapCooldown: 0,
    jumpImpulse: 0
  };

  // ASCII Dolphin Sprites
  const sprites = {
    swim_a: [
      "          __            ",
      "        .'  \\           ",
      "    _.-'  (o) \\____     ",
      "  .'   _           >===>",
      " (   .' \\_      _.-'    ",
      "  '-'     '-..-'        "
    ],
    swim_b: [
      "          __            ",
      "        .'  \\           ",
      "    _.-'  (o) \\____     ",
      "  .'   _           >===<",
      " (   .' \\_      _.-'    ",
      "  '-'     '-..-'        "
    ],
    jump_up: [
      "        __       ",
      "      .'  \\     ",
      "    .'  (o)\\    ",
      "   /   _    \\    ",
      "  /  .' \\_   \\.-'\\",
      " /.-'     '-.____/"
    ],
    apex: [
      "       _.-''''-._       ",
      "     .'  (o)     `'.  /|",
      "    /    _          \\/ |",
      "  .'   .' \\_         \\ |",
      " '----'     '-.____..-''"
    ],
    dive_down: [
      " \\                     ",
      "  \\  (o)       /|      ",
      "   \\    _     / |      ",
      "    \\ .' \\_  /  |      ",
      "     '     '-.__/      "
    ]
  };

  let isPlaying = true;
  let lastTime = performance.now();
  let frameCount = 0;
  let lastFpsUpdate = performance.now();

  // Water level lookup for column
  function getWaterLevel(col, timeSec) {
    const w1 = Math.sin(col * sea.freq1 + timeSec * sea.speed) * sea.amp1;
    const w2 = Math.cos(col * sea.freq2 - timeSec * (sea.speed * 0.75)) * sea.amp2;
    return BASE_WATER_ROW + w1 + w2 + ripples[col];
  }

  // Trigger Dolphin Leap
  function triggerLeap() {
    if (dolphin.state === STATE_CRUISING || dolphin.state === STATE_RECOVERING) {
      dolphin.state = STATE_PREPARING;
      dolphin.jumpImpulse = 1.0;
      showToast('🐬 Dolphin leaping!');
    }
  }

  // Add ripple at column
  function addRipple(col, strength = 1.8) {
    if (col >= 0 && col < COLS) {
      ripples[col] += strength;
      if (col > 0) ripples[col - 1] += strength * 0.5;
      if (col < COLS - 1) ripples[col + 1] += strength * 0.5;
    }
  }

  // Spawn Splash Particles
  function spawnSplash(x, y, count = 12) {
    const chars = ['*', "'", '°', '.', '^', '`'];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: x + (Math.random() * 8 - 4),
        y: y + (Math.random() * 2 - 1),
        vx: (Math.random() - 0.5) * 1.4,
        vy: -(Math.random() * 0.8 + 0.5),
        char: chars[Math.floor(Math.random() * chars.length)],
        life: 0,
        maxLife: Math.floor(Math.random() * 14 + 10),
        type: 'splash'
      });
    }
  }

  // Spawn Bubble Particles
  function spawnBubble(x, y) {
    const chars = ['o', '°', '.', '·'];
    particles.push({
      x: x + (Math.random() * 6 - 3),
      y: y + Math.random() * 2,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -(Math.random() * 0.3 + 0.2),
      char: chars[Math.floor(Math.random() * chars.length)],
      life: 0,
      maxLife: Math.floor(Math.random() * 20 + 15),
      type: 'bubble'
    });
  }

  // Main Simulation Step
  function update(dt, timeSec) {
    // 1. Update Ripple Physics
    for (let c = 0; c < COLS; c++) {
      const left = c > 0 ? ripples[c - 1] : ripples[c];
      const right = c < COLS - 1 ? ripples[c + 1] : ripples[c];
      rippleVel[c] += (left + right - 2 * ripples[c]) * 0.15;
      rippleVel[c] *= 0.94; // damping
      ripples[c] += rippleVel[c];
      ripples[c] *= 0.97;
    }

    // 2. Update Dolphin State Machine
    dolphin.swimCycle += dt * 5;
    dolphin.x += dolphin.vx * (dt * 30);
    dolphin.y += dolphin.vy * (dt * 30);

    // Horizontal wrap-around with padding
    if (dolphin.x > COLS + 6) {
      dolphin.x = -24;
      if (dolphin.state !== STATE_LEAPING && dolphin.state !== STATE_APEX) {
        dolphin.state = STATE_CRUISING;
        dolphin.y = 13;
        dolphin.vy = 0;
      }
    }

    const waterAtDolphin = getWaterLevel(Math.max(0, Math.min(COLS - 1, Math.floor(dolphin.x + 10))), timeSec);

    switch (dolphin.state) {
      case STATE_CRUISING:
        dolphin.vy = Math.sin(dolphin.swimCycle) * 0.08;
        dolphin.y = 12.8 + Math.sin(dolphin.swimCycle * 0.6) * 0.8;
        
        // Spawn occasional bubbles
        if (Math.random() < 0.25) spawnBubble(dolphin.x + 20, dolphin.y + 3);

        // Auto trigger leap periodically
        dolphin.leapCooldown += dt;
        if (dolphin.leapCooldown > 4.5 && dolphin.x > 8 && dolphin.x < COLS - 35) {
          dolphin.state = STATE_PREPARING;
          dolphin.leapCooldown = 0;
        }
        break;

      case STATE_PREPARING:
        // Swoop down before launch
        dolphin.vy = 0.22;
        if (dolphin.y > 14.8) {
          dolphin.state = STATE_LEAPING;
          dolphin.vy = -0.78; // strong upward impulse
        }
        break;

      case STATE_LEAPING:
        // Ascending into the air
        dolphin.vy += 0.038; // gravity
        
        // When breaking water surface
        if (Math.abs(dolphin.y - waterAtDolphin) < 1.0) {
          spawnSplash(dolphin.x + 8, waterAtDolphin, 8);
          addRipple(Math.floor(dolphin.x + 8), 1.6);
        }

        if (dolphin.vy >= -0.15) {
          dolphin.state = STATE_APEX;
        }
        break;

      case STATE_APEX:
        // Cresting jump
        dolphin.vy += 0.045; // gravity accelerates down
        if (dolphin.vy > 0.2) {
          dolphin.state = STATE_DIVING;
        }
        break;

      case STATE_DIVING:
        // Falling toward water
        dolphin.vy += 0.048; // acceleration downward

        // Water entry
        if (dolphin.y >= waterAtDolphin - 1.0) {
          dolphin.state = STATE_RECOVERING;
          spawnSplash(dolphin.x + 4, waterAtDolphin, 14);
          addRipple(Math.floor(dolphin.x + 4), 2.4);
          addRipple(Math.floor(dolphin.x + 8), 1.8);
        }
        break;

      case STATE_RECOVERING:
        // Submerging and leveling out
        dolphin.vy *= 0.85; // water resistance
        spawnBubble(dolphin.x + 12, dolphin.y + 2);
        if (dolphin.y >= 13.5 || Math.abs(dolphin.vy) < 0.05) {
          dolphin.state = STATE_CRUISING;
          dolphin.vy = 0;
          dolphin.leapCooldown = 0;
        }
        break;
    }

    // 3. Update Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life++;
      p.x += p.vx;
      p.y += p.vy;

      if (p.type === 'splash') {
        p.vy += 0.04; // gravity on droplets
      } else if (p.type === 'bubble') {
        p.vx += Math.sin(p.life * 0.4) * 0.08; // wobble
      }

      if (p.life > p.maxLife || p.x < 0 || p.x >= COLS || p.y > ROWS + 2) {
        particles.splice(i, 1);
      }
    }

    // 4. Update Telemetry
    if (telemetry) {
      const depth = (waterAtDolphin - dolphin.y).toFixed(1);
      const depthLabel = depth >= 0 ? `+${depth}m (Air)` : `${depth}m (Deep)`;
      const speedKn = (Math.abs(dolphin.vx) * 32 + Math.abs(dolphin.vy) * 20).toFixed(1);
      telemetry.textContent = `State: [${dolphin.state}] • Depth: ${depthLabel} • Speed: ${speedKn} kn`;
    }
  }

  // Render ASCII Grid
  function render(timeSec) {
    // Character and style buffers
    const charGrid = Array.from({ length: ROWS }, () => new Array(COLS).fill(' '));
    const styleGrid = Array.from({ length: ROWS }, () => new Array(COLS).fill('sky'));

    // 1. Render Sky & Ambient Stars
    const starCycle = Math.floor(timeSec * 1.5);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        // Pseudo-random deterministic stars based on coordinates
        const starHash = ((c * 37 + r * 19 + starCycle) % 100);
        if (starHash === 7 && r < 6) {
          charGrid[r][c] = '·';
          styleGrid[r][c] = 'star';
        } else if (starHash === 42 && r < 4) {
          charGrid[r][c] = '+';
          styleGrid[r][c] = 'star';
        }
      }
    }

    // 2. Render Water Surface and Depth
    for (let c = 0; c < COLS; c++) {
      const waterY = Math.round(getWaterLevel(c, timeSec));
      for (let r = 0; r < ROWS; r++) {
        if (r === waterY) {
          // Surface wave line with animated glyphs
          const waveGlyphs = ['~', '≈', '~', '^', '~', '≈'];
          const gIndex = Math.floor((c + timeSec * 4) % waveGlyphs.length);
          charGrid[r][c] = waveGlyphs[gIndex];
          styleGrid[r][c] = 'water-surface';
        } else if (r === waterY + 1) {
          charGrid[r][c] = (c % 2 === 0) ? '~' : '-';
          styleGrid[r][c] = 'water-sub';
        } else if (r > waterY + 1) {
          // Deep underwater texture
          const deepCycle = (c + r + Math.floor(timeSec * 1.5)) % 7;
          if (deepCycle === 0) {
            charGrid[r][c] = '~';
            styleGrid[r][c] = 'water-deep';
          } else if (deepCycle === 3) {
            charGrid[r][c] = '·';
            styleGrid[r][c] = 'water-deep';
          } else {
            charGrid[r][c] = ' ';
            styleGrid[r][c] = 'water-deep';
          }
        }
      }
    }

    // 3. Render Dolphin Sprite
    let currentSprite;
    if (dolphin.state === STATE_LEAPING) {
      currentSprite = sprites.jump_up;
    } else if (dolphin.state === STATE_APEX) {
      currentSprite = sprites.apex;
    } else if (dolphin.state === STATE_DIVING) {
      currentSprite = sprites.dive_down;
    } else {
      // Swimming cycle tail waggle
      currentSprite = (Math.floor(dolphin.swimCycle) % 2 === 0) ? sprites.swim_a : sprites.swim_b;
    }

    const startX = Math.round(dolphin.x);
    const startY = Math.round(dolphin.y);

    for (let sr = 0; sr < currentSprite.length; sr++) {
      const line = currentSprite[sr];
      const targetR = startY + sr;
      if (targetR >= 0 && targetR < ROWS) {
        for (let sc = 0; sc < line.length; sc++) {
          const char = line[sc];
          const targetC = startX + sc;
          if (char !== ' ' && targetC >= 0 && targetC < COLS) {
            charGrid[targetR][targetC] = char;
            styleGrid[targetR][targetC] = 'dolphin';
          }
        }
      }
    }

    // 4. Render Particles (Splashes and Bubbles)
    for (const p of particles) {
      const pr = Math.round(p.y);
      const pc = Math.round(p.x);
      if (pr >= 0 && pr < ROWS && pc >= 0 && pc < COLS) {
        charGrid[pr][pc] = p.char;
        styleGrid[pr][pc] = p.type === 'splash' ? 'splash' : 'bubble';
      }
    }

    // 5. Build Styled HTML Output
    let html = '';
    for (let r = 0; r < ROWS; r++) {
      let currentStyle = null;
      let buffer = '';

      for (let c = 0; c < COLS; c++) {
        const char = charGrid[r][c];
        const style = styleGrid[r][c];

        if (style !== currentStyle) {
          if (buffer) {
            html += currentStyle ? `<span class="asc-${currentStyle}">${escapeHtml(buffer)}</span>` : escapeHtml(buffer);
            buffer = '';
          }
          currentStyle = style;
        }
        buffer += char;
      }

      if (buffer) {
        html += currentStyle ? `<span class="asc-${currentStyle}">${escapeHtml(buffer)}</span>` : escapeHtml(buffer);
      }
      html += '\n';
    }

    canvas.innerHTML = html;
  }

  // Animation Loop
  function loop(now) {
    if (!isPlaying) return;

    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    update(dt, now / 1000);
    render(now / 1000);

    // FPS Counter
    frameCount++;
    if (now - lastFpsUpdate >= 1000) {
      if (fpsLabel) fpsLabel.textContent = `${frameCount} FPS`;
      frameCount = 0;
      lastFpsUpdate = now;
    }

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);

  // Event Listeners for Ocean Controls
  if (btnLeap) {
    btnLeap.addEventListener('click', triggerLeap);
  }

  if (btnSea) {
    btnSea.addEventListener('click', () => {
      currentSeaIndex = (currentSeaIndex + 1) % seaKeys.length;
      sea = seaProfiles[seaKeys[currentSeaIndex]];
      if (seaStateLabel) seaStateLabel.textContent = sea.label;
      showToast(`🌊 Sea state adjusted to: ${sea.label}`);
    });
  }

  if (btnPlay) {
    btnPlay.addEventListener('click', () => {
      isPlaying = !isPlaying;
      const playIcon = document.getElementById('playIcon');
      const playLabel = document.getElementById('playLabel');
      if (isPlaying) {
        if (playIcon) playIcon.textContent = '⏸';
        if (playLabel) playLabel.textContent = 'Pause';
        lastTime = performance.now();
        requestAnimationFrame(loop);
      } else {
        if (playIcon) playIcon.textContent = '▶';
        if (playLabel) playLabel.textContent = 'Resume';
      }
    });
  }

  // Click on Ocean to create ripple
  if (container) {
    container.addEventListener('click', (e) => {
      const rect = container.getBoundingClientRect();
      const clickXRatio = (e.clientX - rect.left) / rect.width;
      const targetCol = Math.floor(clickXRatio * COLS);
      addRipple(targetCol, 2.5);
      showToast(`🌊 Created ripple at col ${targetCol}`);
    });
  }

  // Keyboard shortcut: Spacebar to leap
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      triggerLeap();
    }
  });
}

/* ==========================================================================
   Extension Showcase Interactions
   ========================================================================== */
function initExtensionInteractions() {
  const btnExtSignIn = document.getElementById('btnExtensionSignIn');
  const btnExtSignUp = document.getElementById('btnExtensionSignUp');
  const btnExtOffline = document.getElementById('btnExtensionOffline');
  const actButtons = document.querySelectorAll('.mockup-act-btn');

  if (btnExtSignIn) {
    btnExtSignIn.addEventListener('click', () => {
      openAuthModal('signin');
    });
  }

  if (btnExtSignUp) {
    btnExtSignUp.addEventListener('click', () => {
      openAuthModal('signup');
    });
  }

  if (btnExtOffline) {
    btnExtOffline.addEventListener('click', (e) => {
      e.preventDefault();
      showToast('🐬 Extension Offline Mode: Vault stored at ~/.tursiops/');
    });
  }

  actButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      actButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      showToast(`Extension tab: ${btn.getAttribute('title')}`);
    });
  });
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
function openAuthModal(mode = 'signin') {
  const modal = document.getElementById('authModal');
  const tabSignIn = document.getElementById('tabSignIn');
  const tabSignUp = document.getElementById('tabSignUp');
  const tabOffline = document.getElementById('tabOffline');
  const modalTitle = document.getElementById('modalTitle');
  const btnSubmitAuth = document.getElementById('btnSubmitAuth');
  const passwordGroup = document.getElementById('passwordGroup');

  if (!modal) return;

  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');

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
}

function initAuthModal() {
  const modal = document.getElementById('authModal');
  const btnClose = document.getElementById('btnCloseModal');
  const btnNavSignIn = document.getElementById('navSignInBtn');
  const btnModalOfflineSwitch = document.getElementById('btnModalOfflineSwitch');
  const tabSignIn = document.getElementById('tabSignIn');
  const tabSignUp = document.getElementById('tabSignUp');
  const tabOffline = document.getElementById('tabOffline');
  const authForm = document.getElementById('authForm');
  const btnGitAuth = document.getElementById('btnGitAuth');

  if (!modal) return;

  const closeModal = () => {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
  };

  if (btnNavSignIn) btnNavSignIn.addEventListener('click', () => openAuthModal('signin'));

  if (btnModalOfflineSwitch) {
    btnModalOfflineSwitch.addEventListener('click', () => openAuthModal('offline'));
  }

  if (tabSignIn) tabSignIn.addEventListener('click', () => openAuthModal('signin'));
  if (tabSignUp) tabSignUp.addEventListener('click', () => openAuthModal('signup'));
  if (tabOffline) tabOffline.addEventListener('click', () => openAuthModal('offline'));

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
      const email = document.getElementById('authEmail')?.value || 'developer';
      closeModal();
      showToast(`✓ Authentication complete for ${email}. Session connected.`);
    });
  }

  if (btnGitAuth) {
    btnGitAuth.addEventListener('click', () => {
      closeModal();
      showToast('✓ Authenticated with GitHub OAuth. Memory Vault connected.');
    });
  }
}

/* Helper to prevent XSS in simulated terminal */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
