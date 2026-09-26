<div align="center">

```
 _____ _   _ ____  ____ ___ ___  ____  ____  
|_   _| | | |  _ \/ ___|_ _/ _ \|  _ \/ ___| 
  | | | | | | |_) \___ \| | | | | |_) \___ \ 
  | | | |_| |  _ < ___) | | |_| |  __/ ___) |
  |_|  \___/|_| \_\____/___\___/|_|   |____/ 
```

### Persistent Coding Memory for AI Sessions

*File-specific context and directives across AI coding sessions.*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.2.0-cyan.svg)](https://github.com/Ashzchu/Tursiops-web)
[![Offline Ready](https://img.shields.io/badge/offline-100%25-emerald.svg)](https://github.com/Ashzchu/Tursiops-web)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/Ashzchu/Tursiops-web/pulls)

[Live Demo](https://ashzchu.github.io/Tursiops-web) • [Documentation](#documentation) • [Architecture](#architecture) • [CLI Quickstart](#quickstart)

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

## 🖥️ Landing Page Design & Structure

This repository contains the minimalist developer-centric landing page for Tursiops, built entirely with standard web technologies:

- **`index.html`**: Clean semantic HTML5 structure with SEO meta tags, OpenGraph metadata, and accessible DOM hierarchy.
- **`style.css`**: Deep midnight palette (`#06090e`), custom CSS design tokens, glowing ASCII logo, IDE activity bar, tabbed code viewer, and responsive breakpoints.
- **`app.js`**: Interactive terminal engine, real-time command evaluation, code simulation triggers, developer modal authentication, and clipboard handlers.

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

## 🏗️ Architecture

```
Repository Root
├── src/
│   ├── auth/session.ts   <─── [Directives Injected via LSP/MCP]
│   └── db/client.ts
└── .tursiops/
    ├── directives.json   <─── Pinned rules and architectural constraints
    ├── graph.db          <─── Local SQLite context graph
    └── config.yaml       <─── Agent adapters (Claude, Cursor, Copilot)
```

### Just-In-Time (JIT) Injection
Unlike naive context approaches that dump entire conversation histories, Tursiops only injects directives when an AI assistant reads or modifies files matching target glob patterns (under 120 tokens per prompt).

---

## 🧪 Local Preview

To run this landing page locally:

```bash
# Clone the repository
git clone https://github.com/Ashzchu/Tursiops-web.git
cd Tursiops-web

# Serve with any static web server (e.g. Python, Node, or VS Code Live Server)
python -m http.server 3000
# or
npx serve .
```

Then open `http://localhost:3000` in your browser.

---

## 📄 License

Distributed under the MIT License. See [LICENSE](LICENSE) for details.

Developed with 🐬 by [Ashzchu](https://github.com/Ashzchu).
