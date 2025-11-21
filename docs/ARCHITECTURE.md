# Brakit Core Architecture

Brakit Core is the open-source foundation for AI-assisted visual editing. It provides the essential infrastructure to connect a browser-based overlay to a local development server, enabling real-time code manipulation.

<div align="center">

[**Architecture**](./ARCHITECTURE.md) • [**Contributing**](./CONTRIBUTING.md) • [**Plugin Dev**](./PLUGIN_DEVELOPMENT.md)

</div>

## High-Level Overview

The system consists of three main components:

1.  **CLI (`cli/`)**: The entry point. It starts the backend server, the proxy, and manages the user's application process.
2.  **Backend (`backend/`)**: An Express server that handles file operations (read/write), AST transformations, and serves the overlay and plugins.
3.  **Overlay (`overlay/`)**: A React application injected into the user's browser. It provides the visual interface for selecting elements and triggering edits.

## The Plugin System

Brakit Core is designed to be extensible through a **Generic Plugin System**. This allows external features to be injected without modifying the core codebase.

### How it Works

1.  **Discovery** (`cli/src/plugins/`):
    -   `PluginScanner` scans the `.brakit/plugins/` directory in the user's project.
    -   Any `.js` file found there is treated as a plugin.

2.  **Injection** (`cli/src/plugins/`):
    -   `PluginInjector` generates `<script>` tags for each plugin.
    -   The CLI's proxy server injects these tags into the HTML response.

3.  **Serving** (`backend/plugins/`):
    -   `PluginManager` discovers and serves plugin files.
    -   The Backend exposes `/plugins/:pluginName.js` to serve plugin content.

4.  **Registration** (`overlay/src/plugins/`):
    -   `PluginHost` manages plugin lifecycle in the browser.
    -   Plugins call `window.registerBrakitPlugin()` to initialize.

### Creating a Plugin

A plugin is a JavaScript bundle (IIFE preferred) that runs in the browser and can:
- Add new tools to the overlay toolbar
- Listen for custom events
- Integrate with external services

## Directory Structure

```
backend/
├── plugins/           # Plugin discovery and serving
├── routes/            # API endpoints
└── services/          # Core services

cli/
├── plugins/           # Plugin scanning and injection
└── commands/          # CLI commands

overlay/
├── plugins/           # Plugin host and types
├── core/              # Overlay core logic
└── components/        # UI components
```

## Design Principles

-   **Decoupled**: Core should not depend on specific plugins.
-   **Clean**: Keep the codebase organized and well-documented.
-   **Extensible**: Allow users to extend functionality easily.
