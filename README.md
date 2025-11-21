# Brakit

AI-assisted visual editing for modern Next.js & React codebases. Brakit connects a browser-based design overlay to your source files so you can edit copy, typography, colors, layout, and even delete elements without leaving the page you are viewing.

> **Status:** Public beta — production-ready for local development on Node.js 20+ with Next.js 13/14 (App Router) or React 18 projects.

<div align="center">

[![npm version](https://img.shields.io/npm/v/brakit.svg?style=flat-square)](https://www.npmjs.com/package/brakit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

[**Architecture**](docs/ARCHITECTURE.md) • [**Contributing**](docs/CONTRIBUTING.md) • [**Plugin Dev**](docs/PLUGIN_DEVELOPMENT.md)

</div>

---

## Text Edit Demo

<div align="center">
  <img src="https://aehd8eoytkvtjqax.public.blob.vercel-storage.com/Text_Demo.gif" alt="Text editing demo" width="100%" />
</div>

---

## 📦 Installation

Use your preferred package manager; the example below uses npm:

```bash
npm install --save-dev brakit
```

### Prerequisites

| Requirement             | Notes                                      |
| ----------------------- | ------------------------------------------ |
| Node.js                 | 20.x or newer                              |
| Framework               | Next.js 13/14 (App Router) or React 18 SPA |
| Tailwind CSS (optional) | Required for color/font helpers            |

---

## 🚀 Quick Start

```bash
# 1. From your Next.js/React project
cd my-app

# 2. Generate config (run once per project)
npx brakit init

# 3. Launch overlay + backend + your dev server
npx brakit start
```

Open the printed proxy URL, click the Brakit bubble, and choose a tool:

| Tool         | Icon | Usage                                                                           |
| ------------ | ---- | ------------------------------------------------------------------------------- |
| Text edit    | `A`  | Double-click text to edit, press Enter to save.                                 |
| Font size    | `Aa` | Drag the slider to update tailwind `text-*` classes or inline styles.           |
| Color picker | 🎨   | Adjust text, background, hover states; maps to Tailwind tokens when possible.   |
| Delete       | 🗑️   | Select an element; Brakit removes only the corresponding JSX/TSX node.          |
| Create Page  | ➕   | Launch the workflow to scaffold a brand-new page/route from within the overlay. |
| Undo         | ↩️   | Undo to revert the last Brakit edit in the current session.                     |

Changes are written back to your repo in real time.

---

## 🔌 Plugins & Extensions

Brakit Core is designed to be extensible. It supports a **Generic Plugin System** that allows you to add new features, such as AI assistance or custom tools, without modifying the core codebase.

### How to use Plugins

1.  Place your plugin bundle (e.g., `my-plugin.js`) in the `.brakit/plugins/` directory of your project.
2.  Restart Brakit: `npx brakit start`.
3.  The plugin will be automatically injected into the overlay.

### Creating Plugins

You can extend Brakit's functionality by creating custom plugins. Plugins are JavaScript bundles that register with the overlay and can add new tools, UI components, or integrate with external services.

For more details on how the plugin system works, see [Plugin Guide](docs/PLUGIN_DEVELOPMENT.md) and [Architecture Guide](docs/ARCHITECTURE.md).
To contribute to Core, check out [Contributing Guide](docs/CONTRIBUTING.md).

---

## 🤝 Collaboration & Workflow

1. Start Brakit locally.
2. Perform edits via the browser overlay.
3. Review diffs in your editor (`git diff`).
4. Commit once you’re satisfied — no additional build steps required.

We recommend committing frequently and pairing Brakit sessions with design reviews.

---

## 📄 License & Support

- **License:** [MIT](./LICENSE)
- **Support:** dev@brakit.ai
- **Twitter:** [@brakit_ai](https://x.com/brakit_ai)

Built with ❤️ by the Brakit team. Happy editing!
