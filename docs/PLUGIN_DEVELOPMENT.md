# (Under development) Plugin Development Guide

### **NOTE***: This guide is under development and is subject to change. The plugin might not work as expected. Detailed documentation will be available soon.

This guide is a step-by-step tutorial on how to create your first plugin for Brakit.

## How It Works

Brakit plugins are simple JavaScript files that run inside the Brakit Overlay on your website. When you run `npx brakit start`, the CLI automatically looks for files in your project's `.brakit/plugins` directory and injects them into the browser.

## Prerequisites

-   A project with Brakit initialized (you should have a `.brakit` folder).
-   If you haven't initialized Brakit yet, run:
    ```bash
    npx brakit init
    ```

## Step-by-Step Tutorial: Adding a Toolbar Button

Follow these steps to create a plugin that adds a custom button to the Brakit toolbar.

### 1. Create the Plugins Directory

Inside your project root, navigate to the `.brakit` folder and create a `plugins` directory if it doesn't exist.

```bash
mkdir -p .brakit/plugins
```

### 2. Create a Plugin File

Create a new file named `my-toolbar-plugin.js` inside `.brakit/plugins`.

```
my-project/
├── .brakit/
│   ├── config.json
│   └── plugins/
│       └── my-toolbar-plugin.js  <-- Your new file
├── package.json
└── ...
```

### 3. Write the Plugin Code

Open `my-toolbar-plugin.js` and paste the following code. This code waits for the Brakit toolbar to load and then appends a new button to it.

```javascript
// .brakit/plugins/my-toolbar-plugin.js

window.registerBrakitPlugin((context) => {
  const { document } = context;

  // Helper to create the button element
  const createButton = () => {
    const btn = document.createElement("button");
    btn.className = "brakit-tool-btn"; // Re-use Brakit's button styles
    btn.title = "My Custom Plugin";
    btn.innerHTML = `
      <span class="brakit-tool-icon">🚀</span>
      <span class="brakit-tool-label">Launch</span>
    `;
    
    btn.addEventListener("click", () => {
      alert("🚀 Plugin button clicked!");
    });
    
    return btn;
  };

  // Helper to find the toolbar and attach the button
  const attachToToolbar = () => {
    const toolbar = document.querySelector(".brakit-toolbar-tools");
    
    // If toolbar isn't ready yet, we wait (it loads asynchronously)
    if (!toolbar) return false;

    // Avoid adding duplicate buttons
    if (toolbar.querySelector("[data-my-plugin]")) return true;

    const button = createButton();
    button.dataset.myPlugin = "true"; // Mark as ours
    toolbar.appendChild(button);
    
    return true;
  };

  // 1. Try to attach immediately
  if (attachToToolbar()) return;

  // 2. If not found, observe the DOM until the toolbar appears
  const observer = new MutationObserver(() => {
    if (attachToToolbar()) {
      observer.disconnect(); // Stop watching once attached
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // 3. Return cleanup function
  return () => {
    observer.disconnect();
    const btn = document.querySelector("[data-my-plugin]");
    if (btn) btn.remove();
  };
});
```

### 4. Start the Server

Run the Brakit development server.

```bash
npx brakit start
```

### 5. Verify in Browser

Open your local development URL (usually `http://localhost:3000`).

1.  **Open the Brakit Toolbar** (click the bubble in the bottom-right if it's closed).
2.  Look for your new **"🚀 Launch"** button inside the toolbar.
3.  Click it to see the alert!

## Advanced Usage

### Using TypeScript

If you prefer TypeScript, you can write your plugin in `.ts`, but you **must compile it to JavaScript** before Brakit can use it, as the browser cannot run TypeScript directly.

1.  Write your code in `src/plugins/MyPlugin.ts`.
2.  Compile it to `.brakit/plugins/MyPlugin.js` using `tsc` or your build tool.

### The Plugin Context

The `context` argument passed to your function gives you access to Brakit internals:

```javascript
window.registerBrakitPlugin((context) => {
  const { 
    app,            // Main app instance
    document,       // The document (use this instead of global document)
    backend,        // Backend service client
    payloadService  // For handling data payloads
  } = context;

  // Example: Show a toast notification using the internal app API
  if (app.showToast) {
    app.showToast("Plugin initialized!");
  }
});
```

## Troubleshooting

**Q: I don't see my button.**
-   Ensure you opened the Brakit toolbar (it might be collapsed).
-   Check the browser console for errors.
-   Restart `npx brakit start` to ensure it picked up the new file.

**Q: I see "registerBrakitPlugin is not defined".**
-   Make sure you are running your app through the Brakit proxy (e.g., `localhost:3000`), not your direct app port (e.g., `localhost:3333`). The proxy injects the necessary scripts.
