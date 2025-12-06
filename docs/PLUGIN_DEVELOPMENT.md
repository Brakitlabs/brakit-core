# Brakit Plugin Development Guide

<div align="center">

[**Architecture**](./ARCHITECTURE.md) • [**Contributing**](./CONTRIBUTING.md) • [**Plugin Dev**](./PLUGIN_DEVELOPMENT.md)

</div>

This guide walks you through creating Brakit plugins from scratch. No prior experience with Brakit internals required.

---

## Your First Plugin (5 minutes)

### What You'll Build

A toolbar button that shows "Hello World" when clicked.

### Step 1: Create the Plugin File

```bash
cd your-app
mkdir -p .brakit/plugins
```

Create `.brakit/plugins/hello-world.js`:

```javascript
window.registerBrakitPlugin((context) => {
  console.log('Plugin loaded!');

  // Add button to toolbar
  const addButton = () => {
    const toolbar = document.querySelector('.brakit-toolbar-tools');
    if (!toolbar) return false;
    if (toolbar.querySelector('[data-hello]')) return true;

    const btn = document.createElement('button');
    btn.className = 'brakit-tool-btn';
    btn.dataset.hello = 'true';
    btn.innerHTML = `
      <span class="brakit-tool-icon">👋</span>
      <span class="brakit-tool-label">Hello</span>
    `;
    btn.onclick = () => alert('Hello from your plugin!');

    toolbar.appendChild(btn);
    return true;
  };

  if (!addButton()) {
    const observer = new MutationObserver(() => {
      if (addButton()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  return () => {
    const btn = document.querySelector('[data-hello]');
    if (btn) btn.remove();
  };
});
```

### Step 2: Start Brakit

```bash
npx brakit start
```

Open your app → Click Brakit overlay → See your "👋 Hello" button!

---

## Adding a Backend Server

Most useful plugins modify source code. Here's how to build one.

### What You'll Build

Click text in your app → Plugin changes it in the actual source file → See changes in your editor.

### Step 1: Create Plugin Directory

```bash
mkdir -p brakit-plugins/text-changer
cd brakit-plugins/text-changer
npm init -y
```

### Step 2: Install Dependencies

```bash
npm install express cors @babel/parser @babel/traverse @babel/generator @babel/types
```

### Step 3: Create Server

Create `server.js`:

```javascript
const express = require('express');
const cors = require('cors');
const fs = require('fs/promises');
const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;

const app = express();
app.use(cors());
app.use(express.json());

app.post('/change-text', async (req, res) => {
  try {
    const { filePath, oldText, newText } = req.body;

    const code = await fs.readFile(filePath, 'utf-8');

    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
    });

    let changed = false;
    traverse(ast, {
      StringLiteral(path) {
        if (path.node.value === oldText) {
          path.node.value = newText;
          changed = true;
        }
      },
      JSXText(path) {
        if (path.node.value.trim() === oldText) {
          path.node.value = newText;
          changed = true;
        }
      },
    });

    if (!changed) {
      return res.json({ success: false, error: 'Text not found' });
    }

    const output = generate(ast);
    await fs.writeFile(filePath, output.code);

    console.log(`✅ Changed "${oldText}" to "${newText}"`);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(4002, () => {
  console.log('🚀 Text Changer server running on port 4002');
});
```

Add to `package.json`:

```json
{
  "scripts": {
    "start": "node server.js"
  }
}
```

### Step 4: Start the Server

```bash
npm start
```

Keep this running in a separate terminal.

### Step 5: Register with Brakit Backend

Go back to your app directory and create a **new file** `.brakit/backend-plugins.js`:

```bash
cd your-app  # Go back to your app root
touch .brakit/backend-plugins.js
```

Add this to `.brakit/backend-plugins.js`:

```javascript
// .brakit/backend-plugins.js
module.exports = {
  plugins: [
    {
      name: 'text-changer',
      endpoint: 'http://localhost:4002/change-text',
      type: 'text-changer',
    },
  ],
};
```

Brakit will auto-load this file on startup.

### Step 6: Create Frontend UI

Create a **new file** `.brakit/plugins/text-changer.js`:

```bash
touch .brakit/plugins/text-changer.js
```

Add this code to `.brakit/plugins/text-changer.js`:

```javascript
window.registerBrakitPlugin((context) => {
  const { getReactSourceInfo } = context;
  let active = false;

  const btn = document.createElement('button');
  btn.className = 'brakit-tool-btn';
  btn.innerHTML = '<span class="brakit-tool-icon">📝</span>';
  btn.onclick = () => {
    active = !active;
    btn.classList.toggle('active', active);
    document.body.style.cursor = active ? 'crosshair' : '';
  };

  document.querySelector('.brakit-toolbar-tools')?.appendChild(btn);

  document.addEventListener('click', async (e) => {
    if (!active) return;
    e.preventDefault();
    e.stopPropagation();

    const text = e.target.textContent?.trim();
    const sourceInfo = getReactSourceInfo?.(e.target);

    if (!sourceInfo?.fileName) {
      alert('Cannot find source file');
      return;
    }

    const newText = prompt(`Change "${text}" to:`, text);
    if (!newText || newText === text) return;

    const res = await fetch('http://localhost:3001/api/plugin/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'text-changer',
        filePath: sourceInfo.fileName,
        metadata: { oldText: text, newText },
      }),
    });

    const result = await res.json();
    alert(result.success ? '✅ Text changed!' : `❌ ${result.error}`);
  }, true);

  return () => {
    btn.remove();
    document.body.style.cursor = '';
  };
});
```

### Step 7: Test It

1. Start both servers (plugin server + Brakit)
2. Open your app
3. Click the "📝" button
4. Click any text on the page
5. Enter new text
6. Check your code editor - file updated! ✨

---

## Plugin API Quick Reference

### Frontend

```javascript
window.registerBrakitPlugin((context) => {
  // Main APIs
  context.document              // Use instead of global document
  context.backend               // Brakit backend client
  context.getReactSourceInfo(el) // Get source file + line number
  context.tokenManager          // Design tokens (if configured)

  // Return cleanup function
  return () => {
    // Cleanup logic
  };
});
```

**Get source info:**
```javascript
const info = context.getReactSourceInfo(element);
// { fileName: "src/Button.tsx", lineNumber: 42, componentName: "Button" }
```

**Call your backend:**
```javascript
await fetch('http://localhost:3001/api/plugin/update', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'your-plugin-type',
    filePath: 'src/components/Button.tsx',
    metadata: { /* your data */ },
  }),
});
```

### Backend

```javascript
pluginRegistry.registerPlugin({
  name: 'my-plugin',
  canHandle: (request) => request.type === 'my-plugin',
  handle: async (request, context) => {
    // Transform code using @babel/parser, @babel/traverse, @babel/generator
    return { success: true, filesChanged: [request.filePath] };
  },
});
```

---

## Common Patterns

**Toggle button with active state:**
```javascript
let active = false;
btn.onclick = () => {
  active = !active;
  btn.classList.toggle('active', active);
};
```

**AST transformation:**
```javascript
const ast = parse(code, { sourceType: 'module', plugins: ['jsx', 'typescript'] });
traverse(ast, {
  JSXAttribute(path) {
    // Modify AST
  },
});
const output = generate(ast);
```

**Wait for toolbar:**
```javascript
if (!addButton()) {
  const observer = new MutationObserver(() => {
    if (addButton()) observer.disconnect();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
```

---

## Troubleshooting

**Plugin not loading?**
- File must be `.js` not `.ts`
- File must be in `.brakit/plugins/`
- Access via Brakit proxy (`localhost:3000`), not direct app port
- Check browser console for errors

**Backend not responding?**
- Plugin server running? (`npm start`)
- CORS enabled? (`app.use(cors())`)
- Plugin registered in Brakit backend?
- Check Network tab in browser DevTools

**getReactSourceInfo returns undefined?**
- Element might not be a React component
- Check if element has React fiber: `element[Object.keys(element).find(k => k.startsWith('__reactFiber'))]`

---

## What to Build Next

**Ideas:**
- Component variant switcher
- Design token applier
- Props editor
- Style duplicator
- A/B test generator
- Screenshot annotator
- Accessibility checker

**Resources:**
- [AST Explorer](https://astexplorer.net/) - Test AST transformations
- [Babel Handbook](https://github.com/jamiebuilds/babel-handbook) - Learn AST manipulation
- [Architecture Docs](./ARCHITECTURE.md) - How Brakit works
- [Contributing](./CONTRIBUTING.md) - Contribute to Brakit

---

**Happy building! 🚀**
