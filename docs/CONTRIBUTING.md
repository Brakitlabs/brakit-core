# Contributing to Brakit Core

Thank you for your interest in contributing to Brakit Core! We want to make this project as open and accessible as possible.

## Getting Started

1.  **Fork the repository** and clone it locally.
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Build the project**:
    ```bash
    npm run build
    ```

## Development Workflow

-   **Core Logic**: Located in `backend/` and `cli/`.
-   **Overlay**: The UI injected into the user's browser, located in `overlay/`.
-   **Plugins**: Core supports a generic plugin system. Plugins are loaded from `.brakit/plugins/`.

### Running Locally

To test your changes in a real project:

```bash
# 1. In the Brakit core directory, build and link
cd /path/to/brakit/core
npm run build
npm link

# 2. In your test project, link to the local Brakit
cd /path/to/your/test-project
npm link brakit

# 3. Start Brakit in your test project
npx brakit start
```

This allows you to test your local changes without publishing to npm.

## Code Style

-   We use **Prettier** for code formatting.
-   We use **ESLint** for linting.
-   Please run `npm run lint` before submitting a PR.

## Pull Request Process

1.  Ensure your code builds and passes linting.
2.  Update documentation if you are changing behavior.
3.  Submit a PR with a clear description of your changes.

## Plugin System

Brakit Core is designed to be extensible. If you are adding a feature that is not core to the editing experience (e.g., AI features, specific integrations), consider building it as a plugin.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for more details on the plugin system.
