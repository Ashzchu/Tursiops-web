<div align="center">

```
 _____ _   _ ____  ____ ___ ___  ____  ____  
|_   _| | | |  _ \/ ___|_ _/ _ \|  _ \/ ___| 
  | | | | | | |_) \___ \| | | | | |_) \___ \ 
  | | | |_| |  _ < ___) | | |_| |  __/ ___) |
  |_|  \___/|_| \_\____/___\___/|_|   |____/ 
```

### Persistent Coding Memory for AI Sessions
*File-specific context and directives across AI coding sessions. Memory that never sinks.*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.2.0-cyan.svg)](https://github.com/Ashzchu/Tursiops-web)
[![ASCII Physics](https://img.shields.io/badge/ASCII_Ocean-60_FPS-38bdf8.svg)](https://github.com/Ashzchu/Tursiops-web)
[![Offline Ready](https://img.shields.io/badge/offline-100%25-emerald.svg)](https://github.com/Ashzchu/Tursiops-web)

[Live Demo](http://localhost:8000) • [Architecture](#architecture) • [CLI Quickstart](#quickstart) • [VS Code Extension](#extension-ui)

</div>

---

## ⚡ Overview

**Tursiops** gives your AI coding assistants an unshakeable, persistent memory layer. When working with AI coding tools like Claude Code, Cursor, Copilot, Antigravity, or terminal CLI agents, developers frequently lose crucial context whenever a chat thread is cleared or compressed.

Tursiops solves this by attaching **file-specific memory nodes and architectural directives** directly to your repository's files and AST symbols.

- **Zero Context Decay**: Stop repeating architectural constraints and formatting rules across every new chat session.
- **Cross-Agent Interoperability**: Seamlessly switch between Cursor, VS Code, Claude Code, and Neovim without losing memory.
- **100% Offline & Git-Native**: All memory graphs and directives live in `.tursiops/` as version-controlled JSON and SQLite files.
- **Deterministic Regression Guard**: Blocks AI agents from reverting established security policies or schema rules.

---

## 🐬 Real-Time ASCII Ocean & Diving Dolphin

Inspired by developer terminal culture and ASCII art aesthetics, the Tursiops hero features a **pure ASCII water physics simulation**:
- **Dynamic Wave Equations**: Multi-octave sinusoidal ocean wave undulations with interactive ripple propagation.
- **Dolphin Kinematics**: Procedural ASCII dolphin with full swimming, swooping, leaping, cresting, and diving phases.
- **Particle System**: Splash droplets (`*`, `'`, `°`) on breaching and re-entry, with floating bubbles (`o`, `°`, `.`) in deep water.
- **Interactive Controls**:
  - Click anywhere on the water surface to create dynamic ripples.
  - Press `Spacebar` or click **"Make Dolphin Leap!"** to launch the dolphin into a high breach.
  - Toggle sea states between **Calm**, **Swell**, and **Rough**.

---

## 🖥️ IDE Extension UI Showcase

Tursiops provides an official IDE sidebar extension for VS Code and Cursor:
- **Directives in Editor Gutter**: Inline architectural rules pinned right to AST symbols.
- **Instant Authentication & Offline Vault**: Sign in via GitHub or run 100% offline air-gapped with local keys.
- **Live Memory Inspector**: Track active directives across sessions with zero cognitive load.

---

## 📁 Repository Structure

Cleanly separated vanilla web stack:

```
├── index.html       # Semantic HTML5 layout, hero, ASCII canvas, extension showcase
├── style.css        # CSS custom properties, dark theme tokens, ASCII color styles
├── app.js           # ASCII physics simulation, terminal emulator, interactive tabs
├── README.md        # Documentation and quickstart
├── LICENSE          # MIT License
└── .gitignore       # Git hygiene
```

---

## 🚀 Quickstart

### Install via Shell (macOS & Linux)
```bash
curl -fsSL https://tursiops.dev/install.sh | sh
```

### Install via Homebrew / Scoop
```bash
# macOS
brew install tursiops/tap/tursiops

# Windows (Scoop)
scoop bucket add tursiops https://github.com/Ashzchu/Tursiops-web
scoop install tursiops
```

### Initialize Your Repository
```bash
cd your-project-repo
tursiops init
```

---

## ⌨️ CLI Usage

| Command | Description |
| :--- | :--- |
| `tursiops init` | Initializes `.tursiops/` repository vault and indexes AST symbols |
| `tursiops status` | Displays tracked files, active directives, and session continuity |
| `tursiops recall <path>` | Prints persistent memory and directives for a specific file |
| `tursiops remember "<rule>"` | Pins a project-wide architectural directive across all agents |
| `tursiops diff` | Inspects memory directives modified in recent sessions |

---

## 🧪 Local Preview

To view the landing page locally:

```bash
# Serve with Python
python -m http.server 8000
```

Open **`http://localhost:8000`** in your browser.

---

## 📄 License

Distributed under the MIT License. See [LICENSE](LICENSE) for details.

Developed with 🐬 by [Ashzchu](https://github.com/Ashzchu).
