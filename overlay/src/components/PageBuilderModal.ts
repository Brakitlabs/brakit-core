import { LitElement, html, css } from "lit";

interface PageBuilderCreateDetail {
  folder: string;
  name: string;
  layout: string;
}

type RouterKind = "app" | "pages" | "react-router" | "unknown";

interface FrameworkState {
  framework: "next" | "react";
  hasTailwind: boolean;
  router?: RouterKind;
  pageRoots?: string[];
  summary?: string;
}

type LayoutSection =
  | "header"
  | "hero"
  | "signup"
  | "content"
  | "sidebarLeft"
  | "sidebarRight"
  | "contentSplit"
  | "featureGrid"
  | "stats"
  | "testimonials"
  | "cta"
  | "pricing"
  | "faq"
  | "footer";

interface LayoutRowSingle {
  type: "single";
  id: LayoutSection;
}

interface LayoutRowSplitColumn {
  id: LayoutSection;
  span?: number;
}

interface LayoutRowSplit {
  type: "split";
  columns: LayoutRowSplitColumn[];
}

type LayoutRow = LayoutRowSingle | LayoutRowSplit;

interface LayoutDefinition {
  id: string;
  label: string;
  description: string;
  rows: LayoutRow[];
}

const LAYOUTS: LayoutDefinition[] = [
  {
    id: "blank",
    label: "Blank",
    description: "An empty canvas to start fresh.",
    rows: [{ type: "single", id: "content" }],
  },
  {
    id: "hero",
    label: "Hero",
    description: "Hero banner with supporting copy.",
    rows: [
      { type: "single", id: "header" },
      {
        type: "split",
        columns: [
          { id: "hero", span: 2 },
          { id: "featureGrid", span: 1 },
        ],
      },
      { type: "single", id: "cta" },
      { type: "single", id: "footer" },
    ],
  },
  {
    id: "twoColumn",
    label: "Two Column",
    description: "Content with a right sidebar.",
    rows: [
      { type: "single", id: "header" },
      {
        type: "split",
        columns: [
          { id: "content", span: 2 },
          { id: "sidebarRight", span: 1 },
        ],
      },
      { type: "single", id: "cta" },
      { type: "single", id: "footer" },
    ],
  },
  {
    id: "contentSplit",
    label: "Content Split",
    description: "Two equal columns for balanced content.",
    rows: [
      { type: "single", id: "header" },
      {
        type: "split",
        columns: [
          { id: "contentSplit", span: 1 },
          { id: "contentSplit", span: 1 },
        ],
      },
      { type: "single", id: "cta" },
      { type: "single", id: "footer" },
    ],
  },
  {
    id: "dashboard",
    label: "Dashboard",
    description: "Stat cards with supporting grid content.",
    rows: [
      { type: "single", id: "header" },
      { type: "single", id: "hero" },
      { type: "single", id: "stats" },
      { type: "single", id: "featureGrid" },
      { type: "single", id: "footer" },
    ],
  },
  {
    id: "form",
    label: "Signup Form",
    description: "Hero with signup form front and center.",
    rows: [
      { type: "single", id: "header" },
      {
        type: "split",
        columns: [
          { id: "hero", span: 2 },
          { id: "signup", span: 1 },
        ],
      },
      { type: "single", id: "faq" },
      { type: "single", id: "footer" },
    ],
  },
  {
    id: "pricing",
    label: "Pricing",
    description: "Ready-made pricing table with call to action.",
    rows: [
      { type: "single", id: "header" },
      { type: "single", id: "hero" },
      { type: "single", id: "pricing" },
      { type: "single", id: "testimonials" },
      { type: "single", id: "cta" },
      { type: "single", id: "footer" },
    ],
  },
  {
    id: "sidebarLeft",
    label: "Left Sidebar",
    description: "Navigation/sidebar on the left with content on the right.",
    rows: [
      { type: "single", id: "header" },
      {
        type: "split",
        columns: [
          { id: "sidebarLeft", span: 1 },
          { id: "content", span: 2 },
        ],
      },
      { type: "single", id: "footer" },
    ],
  },
  {
    id: "docs",
    label: "Documentation",
    description: "Docs style with sticky sidebar and content.",
    rows: [
      { type: "single", id: "header" },
      {
        type: "split",
        columns: [
          { id: "sidebarLeft", span: 1 },
          { id: "content", span: 2 },
        ],
      },
      { type: "single", id: "faq" },
      { type: "single", id: "footer" },
    ],
  },
];

export class PageBuilderModal extends LitElement {
  static properties = {
    open: { type: Boolean, reflect: true },
  };

  open = false;
  private folders: string[] = [];
  private foldersLoading = false;
  private foldersError: string | null = null;
  private frameworkInfo: FrameworkState | null = null;
  private selectedFolder = "/";
  private selectedLayout = "";
  private pageName = "";
  private creating = false;
  private createError: string | null = null;
  private expandedFolders: Set<string> = new Set();

  static styles = css`
    :host {
      position: fixed;
      inset: 0;
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 2147483645;
      font-family:
        -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue",
        Arial, sans-serif;
    }

    :host([open]) {
      display: flex;
    }

    .backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.35);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    }

    .modal {
      position: relative;
      width: 720px;
      max-width: calc(100vw - 48px);
      max-height: calc(100vh - 96px);
      background: rgba(255, 255, 255, 0.98);
      border-radius: 20px;
      box-shadow:
        0 25px 65px rgba(15, 23, 42, 0.18),
        0 10px 25px rgba(30, 41, 59, 0.12);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .modal-header {
      padding: 20px 24px 16px 24px;
      border-bottom: 1px solid rgba(15, 23, 42, 0.06);
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
    }

    .header-content {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .modal-title {
      font-size: 18px;
      font-weight: 600;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .modal-subtitle {
      font-size: 13px;
      color: #64748b;
      line-height: 1.4;
    }

    .context-banner {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      border-radius: 999px;
      background: rgba(59, 130, 246, 0.12);
      color: #1d4ed8;
      font-size: 12px;
      font-weight: 500;
    }

    .modal-body {
      display: flex;
      flex: 1;
      overflow: hidden;
    }

    .column {
      padding: 20px 24px;
      overflow-y: auto;
    }

    .column.folders {
      width: 38%;
      border-right: 1px solid rgba(15, 23, 42, 0.06);
      background: rgba(248, 250, 252, 0.7);
    }

    .column.layouts {
      flex: 1;
      background: rgba(255, 255, 255, 0.9);
    }

    .section-title {
      font-size: 13px;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 12px;
    }

    .folder-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .folder-state {
      width: 100%;
      padding: 10px 12px;
      border: 1px dashed rgba(148, 163, 184, 0.7);
      border-radius: 10px;
      font-size: 12px;
      color: #475569;
      background: rgba(148, 163, 184, 0.12);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .folder-state.folder-state--error {
      border-color: rgba(239, 68, 68, 0.5);
      background: rgba(254, 226, 226, 0.4);
      color: #b91c1c;
    }

    .folder-state.folder-state--empty {
      border-color: rgba(148, 163, 184, 0.5);
      background: rgba(241, 245, 249, 0.6);
    }

    .folder-state button {
      align-self: flex-start;
      padding: 6px 12px;
      border-radius: 8px;
      border: 1px solid rgba(59, 130, 246, 0.4);
      background: rgba(59, 130, 246, 0.12);
      color: #1d4ed8;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition:
        background 0.18s ease,
        border 0.18s ease;
    }

    .folder-state button:hover {
      background: rgba(59, 130, 246, 0.2);
      border-color: rgba(59, 130, 246, 0.6);
    }

    .folder-tree {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .tree-node {
      display: flex;
      flex-direction: column;
    }

    .tree-item {
      display: flex;
      align-items: center;
      gap: 6px;
      width: 100%;
      padding: 6px 8px;
      border: 1px solid transparent;
      border-radius: 6px;
      background: transparent;
      cursor: pointer;
      font-size: 13px;
      color: #1f2937;
      transition: all 0.18s ease;
      position: relative;
    }

    .tree-item:hover {
      background: rgba(59, 130, 246, 0.08);
    }

    .tree-item.active {
      border-color: rgba(59, 130, 246, 0.4);
      background: rgba(59, 130, 246, 0.12);
      color: #1e3a8a;
      font-weight: 600;
    }

    .tree-toggle {
      width: 16px;
      height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      border-radius: 3px;
      transition: background 0.15s ease;
      font-size: 12px;
      color: #6b7280;
    }

    .tree-toggle:hover {
      background: rgba(59, 130, 246, 0.1);
    }

    .tree-toggle.expanded {
      color: #1d4ed8;
    }

    .tree-toggle.empty {
      visibility: hidden;
    }

    .tree-icon {
      font-size: 14px;
      color: #6b7280;
    }

    .tree-item.active .tree-icon {
      color: #1d4ed8;
    }

    .tree-label {
      flex: 1;
      text-align: left;
    }

    .tree-children {
      margin-left: 16px;
      border-left: 1px solid rgba(148, 163, 184, 0.2);
      padding-left: 8px;
    }

    .folder-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 8px 10px;
      border: 1px solid transparent;
      border-radius: 8px;
      background: transparent;
      cursor: pointer;
      font-size: 13px;
      color: #1f2937;
      transition: all 0.18s ease;
    }

    .folder-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .folder-btn:hover {
      background: rgba(59, 130, 246, 0.08);
    }

    .folder-btn.active {
      border-color: rgba(59, 130, 246, 0.4);
      background: rgba(59, 130, 246, 0.12);
      color: #1e3a8a;
      font-weight: 600;
    }

    .folder-input {
      margin-top: 10px;
      width: 100%;
      border: 1px solid rgba(148, 163, 184, 0.6);
      border-radius: 8px;
      padding: 8px 10px;
      font-size: 13px;
      transition:
        border 0.18s ease,
        box-shadow 0.18s ease;
    }

    .folder-input:focus {
      border-color: rgba(59, 130, 246, 0.6);
      outline: none;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
    }

    .folder-tip {
      margin-top: 8px;
      font-size: 11px;
      color: #94a3b8;
      line-height: 1.4;
    }

    .layout-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 14px;
    }

    .layout-card {
      border: 1px solid rgba(148, 163, 184, 0.45);
      border-radius: 12px;
      padding: 12px;
      min-height: 160px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      cursor: pointer;
      transition:
        border 0.18s ease,
        box-shadow 0.18s ease,
        transform 0.18s ease;
    }

    .layout-card:hover {
      border-color: rgba(59, 130, 246, 0.5);
      box-shadow: 0 6px 18px rgba(30, 64, 175, 0.12);
      transform: translateY(-2px);
    }

    .layout-card.selected {
      border-color: rgba(59, 130, 246, 0.7);
      box-shadow: 0 6px 22px rgba(37, 99, 235, 0.2);
    }

    .layout-preview {
      flex: 1;
      border: 1px dashed rgba(148, 163, 184, 0.6);
      border-radius: 10px;
      padding: 10px;
      background: rgba(248, 250, 252, 0.65);
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .preview-row {
      border: 1px dashed rgba(148, 163, 184, 0.6);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.92);
      min-height: 26px;
      font-size: 11px;
      color: #475569;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      padding: 6px;
    }

    .preview-row--split {
      border: none;
      background: transparent;
      padding: 0;
      display: grid;
      gap: 6px;
      min-height: auto;
      align-items: stretch;
    }

    .preview-cell {
      border: 1px dashed rgba(148, 163, 184, 0.6);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.92);
      min-height: 24px;
      width: 100%;
      font-size: 11px;
      color: #475569;
      display: flex;
      align-items: center;
      justify-content: center;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      padding: 6px;
      box-sizing: border-box;
    }

    .preview-hero {
      background: rgba(59, 130, 246, 0.12);
    }

    .preview-signup {
      background: rgba(16, 185, 129, 0.12);
    }

    .preview-sidebarLeft,
    .preview-sidebarRight {
      background: rgba(251, 191, 36, 0.15);
    }

    .preview-pricing {
      background: rgba(168, 85, 247, 0.12);
    }

    .preview-faq,
    .preview-testimonials {
      background: rgba(248, 250, 252, 0.9);
    }

    .layout-meta {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .layout-name {
      font-weight: 600;
      color: #1f2937;
      font-size: 14px;
    }

    .layout-description {
      font-size: 12px;
      color: #6b7280;
      line-height: 1.4;
    }

    .page-name-input {
      width: 100%;
      border: 1px solid rgba(148, 163, 184, 0.6);
      border-radius: 8px;
      padding: 8px 10px;
      font-size: 13px;
      transition:
        border 0.18s ease,
        box-shadow 0.18s ease;
      margin-top: 12px;
    }

    .page-name-input:focus {
      border-color: rgba(59, 130, 246, 0.65);
      outline: none;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
    }

    .page-config-section {
      margin-top: 20px;
      padding: 16px;
      background: rgba(248, 250, 252, 0.8);
      border-radius: 12px;
      border: 1px solid rgba(148, 163, 184, 0.3);
    }

    .page-config-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }

    .config-item {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .config-label {
      font-size: 11px;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .config-value {
      font-size: 13px;
      font-weight: 500;
      color: #1f2937;
      padding: 6px 10px;
      background: rgba(255, 255, 255, 0.8);
      border: 1px solid rgba(148, 163, 184, 0.4);
      border-radius: 8px;
    }

    .config-separator {
      font-size: 16px;
      font-weight: 600;
      color: #94a3b8;
      margin-top: 16px;
    }

    .url-preview {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 8px 10px;
      background: rgba(59, 130, 246, 0.08);
      border: 1px solid rgba(59, 130, 246, 0.2);
      border-radius: 8px;
      margin-top: 10px;
    }

    .url-label {
      font-size: 11px;
      font-weight: 600;
      color: #1d4ed8;
    }

    .url-value {
      font-size: 11px;
      font-family: "SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace;
      color: #1e40af;
      background: rgba(255, 255, 255, 0.8);
      padding: 4px 6px;
      border-radius: 4px;
      word-break: break-all;
      line-height: 1.3;
    }

    .modal-footer {
      padding: 14px 24px 20px;
      border-top: 1px solid rgba(15, 23, 42, 0.06);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      background: rgba(248, 250, 252, 0.9);
    }

    .footer-note {
      font-size: 12px;
      color: #6b7280;
    }

    .footer-note.footer-note--error {
      color: #dc2626;
      font-weight: 500;
    }

    .footer-actions {
      display: flex;
      gap: 10px;
    }

    button.secondary {
      background: transparent;
      border: 1px solid rgba(148, 163, 184, 0.6);
      color: #1f2937;
      padding: 8px 18px;
      border-radius: 8px;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.18s ease;
    }

    button.secondary:hover {
      background: rgba(148, 163, 184, 0.1);
    }

    button.primary {
      background: #2563eb;
      border: none;
      color: white;
      padding: 9px 20px;
      border-radius: 10px;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      transition:
        background 0.18s ease,
        box-shadow 0.18s ease;
    }

    button.primary:disabled {
      background: rgba(59, 130, 246, 0.45);
      cursor: not-allowed;
      box-shadow: none;
    }

    button.primary:not(:disabled):hover {
      background: #1d4ed8;
      box-shadow: 0 10px 30px rgba(37, 99, 235, 0.28);
    }

    @media (max-width: 780px) {
      .modal {
        width: calc(100vw - 32px);
      }
      .modal-body {
        flex-direction: column;
      }
      .column.folders {
        width: 100%;
        border-right: none;
        border-bottom: 1px solid rgba(15, 23, 42, 0.06);
      }
    }
  `;

  render() {
    if (!this.open) {
      return html``;
    }

    return html`
      <div
        class="backdrop"
        @click=${this.handleBackdrop}
        @wheel=${this.handleWheelEvent}
      ></div>
      <div class="modal" @click=${(e: Event) => e.stopPropagation()}>
        <div class="modal-header">
          <div class="header-content">
            <div class="modal-title">
              <span>🆕</span>
              <span>Create a new page</span>
            </div>
            <div class="modal-subtitle">
              Pick a layout to jumpstart your next screen.
            </div>
            ${this.frameworkSummary
              ? html`<div class="context-banner">${this.frameworkSummary}</div>`
              : null}
          </div>
          <button class="secondary" @click=${this.handleClose}>Close</button>
        </div>

        <div class="modal-body">
          <div class="column folders">
            <div class="section-title">Folders</div>
            <div class="folder-list">${this.renderFolderList()}</div>
            <input
              class="folder-input"
              placeholder="Or type a new folder (e.g. src/pages/team)"
              .value=${this.selectedFolder}
              @input=${this.handleFolderInput}
            />
            <div class="folder-tip">
              Paths are relative to your project root. We'll create missing
              folders when you generate.
            </div>

            <div class="page-config-section">
              <div class="section-title">Page Configuration</div>
              <div class="page-config-row">
                <div class="config-item">
                  <label class="config-label">Folder Path</label>
                  <div class="config-value">${this.selectedFolder || "/"}</div>
                </div>
                <div class="config-separator">/</div>
                <div class="config-item">
                  <label class="config-label">File Name</label>
                  <div class="config-value">page.tsx</div>
                </div>
              </div>
              <input
                class="page-name-input"
                placeholder="Page name (e.g. Dashboard)"
                .value=${this.pageName}
                @input=${this.handleNameInput}
              />
              <div class="url-preview">
                <span class="url-label">Preview URL:</span>
                <span class="url-value">${this.getPreviewUrl()}</span>
              </div>
            </div>
          </div>

          <div class="column layouts">
            <div class="section-title">Layouts</div>
            <div class="layout-grid">
              ${LAYOUTS.map(
                (layout) => html`
                  <div
                    class="layout-card ${this.selectedLayout === layout.id
                      ? "selected"
                      : ""}"
                    @click=${() => this.selectLayout(layout.id)}
                  >
                    ${this.renderLayoutPreview(layout)}
                    <div class="layout-meta">
                      <div class="layout-name">${layout.label}</div>
                      <div class="layout-description">
                        ${layout.description}
                      </div>
                    </div>
                  </div>
                `
              )}
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <div
            class="footer-note ${this.createError ? "footer-note--error" : ""}"
          >
            ${this.createError
              ? this.createError
              : "Choose a layout and we’ll drop a starter file into your project."}
          </div>
          <div class="footer-actions">
            <button class="secondary" @click=${this.handleClose}>Cancel</button>
            <button
              class="primary"
              ?disabled=${!this.canCreate}
              @click=${this.handleCreate}
            >
              ${this.creating ? "Creating…" : "Create Page"}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  setFolderLoading(loading: boolean) {
    this.foldersLoading = loading;
    if (loading) {
      this.foldersError = null;
    }
    this.requestUpdate();
  }

  setFolderError(message: string | null) {
    this.foldersError = message;
    this.requestUpdate();
  }

  setFolders(folders: string[]) {
    const normalized = Array.isArray(folders)
      ? folders
          .filter((item): item is string => typeof item === "string")
          .map((item) => (item.trim().length === 0 ? "/" : item.trim()))
      : [];

    if (!normalized.includes("/")) {
      normalized.push("/");
    }

    const unique = Array.from(new Set(normalized)).sort((a, b) => {
      if (a === "/") return -1;
      if (b === "/") return 1;
      return a.localeCompare(b);
    });
    this.folders = unique;

    if (unique.length === 0) {
      this.selectedFolder = "/";
    } else if (!unique.includes(this.selectedFolder)) {
      this.selectedFolder = unique[0];
    }

    this.foldersError = null;
    this.requestUpdate();
  }

  setFramework(info: FrameworkState | null) {
    this.frameworkInfo = info;
    this.requestUpdate();
  }

  setCreatePending(pending: boolean) {
    this.creating = pending;
    this.requestUpdate();
  }

  setCreateError(message: string | null) {
    this.createError = message;
    if (message) {
      this.creating = false;
    }
    this.requestUpdate();
  }

  private clearCreateError() {
    if (this.createError) {
      this.createError = null;
      this.requestUpdate();
    }
  }

  private renderFolderList() {
    if (this.foldersLoading) {
      return html`<div class="folder-state">Loading folders…</div>`;
    }

    const errorBlock = this.foldersError
      ? html`
          <div class="folder-state folder-state--error">
            <div>${this.foldersError}</div>
            <button @click=${this.handleReloadFolders}>Retry</button>
          </div>
        `
      : null;

    if (!this.folders.length) {
      return html`
        ${errorBlock}
        <div class="folder-state folder-state--empty">
          No folders detected yet. Enter a path above to create one.
        </div>
      `;
    }

    const treeStructure = this.buildFolderTree();

    return html`
      ${errorBlock}
      <div class="folder-tree">${this.renderTreeNodes(treeStructure)}</div>
    `;
  }

  private buildFolderTree() {
    interface TreeNode {
      path: string;
      name: string;
      children: TreeNode[];
      level: number;
    }

    const tree: TreeNode[] = [];
    const nodeMap = new Map<string, TreeNode>();

    // Sort folders to ensure parent folders come before children
    const sortedFolders = [...this.folders].sort((a, b) => a.localeCompare(b));

    for (const folderPath of sortedFolders) {
      if (folderPath === "/") {
        // Special case for root
        tree.push({
          path: "/",
          name: "Project Root",
          children: [],
          level: 0,
        });
        continue;
      }

      const pathParts = folderPath.split("/").filter(Boolean);
      let currentPath = "";
      let parentNode: TreeNode | undefined;

      for (let i = 0; i < pathParts.length; i++) {
        currentPath = currentPath
          ? `${currentPath}/${pathParts[i]}`
          : pathParts[i];

        if (!nodeMap.has(currentPath)) {
          const node: TreeNode = {
            path: currentPath,
            name: pathParts[i],
            children: [],
            level: i + 1,
          };

          nodeMap.set(currentPath, node);

          if (parentNode) {
            parentNode.children.push(node);
          } else {
            tree.push(node);
          }
        }

        parentNode = nodeMap.get(currentPath);
      }
    }

    return tree;
  }

  private renderTreeNodes(nodes: any[]): any {
    return nodes.map((node) => this.renderTreeNode(node));
  }

  private renderTreeNode(node: any): any {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = this.expandedFolders.has(node.path);
    const isSelected = this.selectedFolder === node.path;

    return html`
      <div class="tree-node">
        <div
          class="tree-item ${isSelected ? "active" : ""}"
          @click=${() => this.selectFolder(node.path)}
        >
          <div
            class="tree-toggle ${hasChildren ? "" : "empty"} ${isExpanded
              ? "expanded"
              : ""}"
            @click=${(e: Event) => {
              e.stopPropagation();
              this.toggleFolder(node.path);
            }}
          >
            ${hasChildren ? (isExpanded ? "▼" : "▶") : ""}
          </div>
          <span class="tree-icon">${node.path === "/" ? "🏠" : "📁"}</span>
          <span class="tree-label">${node.name}</span>
        </div>
        ${hasChildren && isExpanded
          ? html`
              <div class="tree-children">
                ${this.renderTreeNodes(node.children)}
              </div>
            `
          : ""}
      </div>
    `;
  }

  private toggleFolder(path: string) {
    if (this.expandedFolders.has(path)) {
      this.expandedFolders.delete(path);
    } else {
      this.expandedFolders.add(path);
    }
    this.requestUpdate();
  }

  private get frameworkSummary(): string | null {
    if (!this.frameworkInfo) {
      return null;
    }

    if (this.frameworkInfo.summary) {
      return this.frameworkInfo.summary;
    }

    const parts: string[] = [
      this.frameworkInfo.framework === "next"
        ? "Next.js project"
        : "React project",
    ];

    if (this.frameworkInfo.router && this.frameworkInfo.router !== "unknown") {
      if (this.frameworkInfo.framework === "next") {
        parts.push(
          this.frameworkInfo.router === "app" ? "App Router" : "Pages Router"
        );
      } else if (this.frameworkInfo.router === "react-router") {
        parts.push("React Router");
      }
    }

    parts.push(
      this.frameworkInfo.hasTailwind
        ? "Tailwind CSS detected"
        : "Tailwind CSS not detected"
    );

    return parts.join(" • ");
  }

  getPreviewUrl(): string {
    if (!this.pageName.trim()) {
      return "Enter page name to see URL";
    }

    const currentOrigin = window.location.origin;

    // Clean up folder path - remove leading/trailing slashes and handle root
    let folderPath = this.selectedFolder;
    if (folderPath === "/" || folderPath === "") {
      folderPath = "";
    } else {
      folderPath = folderPath.replace(/^\/+|\/+$/g, ""); // Remove leading/trailing slashes
    }
    const slug = this.pageName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (
      this.frameworkInfo?.framework === "next" &&
      this.frameworkInfo?.router === "app"
    ) {
      // For Next.js App Router, remove src/app prefix from folder path
      let urlPath = folderPath;

      // Remove common Next.js App Router prefixes
      if (urlPath.startsWith("src/app/")) {
        urlPath = urlPath.substring(8); // Remove "src/app/"
      } else if (urlPath.startsWith("app/")) {
        urlPath = urlPath.substring(4); // Remove "app/"
      }

      // Clean up any remaining leading/trailing slashes
      urlPath = urlPath.replace(/^\/+|\/+$/g, "");

      return `${currentOrigin}${urlPath ? `/${urlPath}` : ""}`;
    }

    // For other frameworks or Pages Router
    const urlPath = folderPath ? `/${folderPath}` : "";
    return `${currentOrigin}${urlPath}/${slug}`;
  }

  openModal() {
    this.resetForm();
    this.open = true;
    // Prevent background scrolling when modal is open
    document.body.style.overflow = "hidden";
  }

  closeModal() {
    this.open = false;
    // Restore background scrolling when modal is closed
    document.body.style.overflow = "";
  }

  private get canCreate(): boolean {
    return Boolean(this.selectedLayout && this.pageName.trim());
  }

  private handleReloadFolders = () => {
    this.dispatchEvent(
      new CustomEvent("page-builder:reload-folders", {
        bubbles: true,
        composed: true,
      })
    );
  };

  private renderLayoutPreview(layout: LayoutDefinition) {
    return html`
      <div class="layout-preview">
        ${layout.rows.map((row) => {
          if (row.type === "single") {
            return html`
              <div class="preview-row preview-row--single preview-${row.id}">
                <span>${this.getSectionLabel(row.id)}</span>
              </div>
            `;
          }

          const columns = row.columns.reduce(
            (total, column) => total + (column.span ?? 1),
            0
          );
          return html`
            <div
              class="preview-row preview-row--split"
              style=${`grid-template-columns: repeat(${columns}, 1fr);`}
            >
              ${row.columns.map((column) => {
                const span = column.span
                  ? `grid-column: span ${column.span};`
                  : "";
                return html`
                  <div class="preview-cell preview-${column.id}" style=${span}>
                    <span>${this.getSectionLabel(column.id)}</span>
                  </div>
                `;
              })}
            </div>
          `;
        })}
      </div>
    `;
  }

  private getSectionLabel(section: LayoutSection): string {
    const labels: Record<LayoutSection, string> = {
      header: "Header",
      hero: "Hero",
      signup: "Signup",
      content: "Content",
      sidebarLeft: "Sidebar",
      sidebarRight: "Sidebar",
      contentSplit: "Split",
      featureGrid: "Features",
      stats: "Stats",
      testimonials: "Reviews",
      cta: "CTA",
      pricing: "Pricing",
      faq: "FAQ",
      footer: "Footer",
    };

    return labels[section] || section;
  }

  private resetForm() {
    this.selectedFolder = this.folders[0] ?? "/";
    this.selectedLayout = "";
    this.pageName = "";
    this.creating = false;
    this.createError = null;
  }

  private selectFolder(folder: string) {
    this.selectedFolder = folder;
    this.clearCreateError();
    this.requestUpdate();
  }

  private handleFolderInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.selectedFolder = value;
    this.clearCreateError();
    this.requestUpdate();
  }

  private selectLayout(layoutId: string) {
    this.selectedLayout = layoutId;
    this.clearCreateError();
    this.requestUpdate();
  }

  private handleNameInput(event: Event) {
    this.pageName = (event.target as HTMLInputElement).value;
    this.clearCreateError();
    this.requestUpdate();
  }

  private handleCreate() {
    if (!this.canCreate) return;

    this.creating = true;
    this.requestUpdate();
    const detail: PageBuilderCreateDetail = {
      folder: this.selectedFolder.trim(),
      name: this.pageName.trim(),
      layout: this.selectedLayout,
    };

    this.dispatchEvent(
      new CustomEvent<PageBuilderCreateDetail>("page-builder:create", {
        detail,
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleClose = () => {
    this.closeModal();
    this.dispatchEvent(
      new CustomEvent("page-builder:close", {
        bubbles: true,
        composed: true,
      })
    );
  };

  private handleBackdrop = () => {
    this.handleClose();
  };

  private handleWheelEvent = (e: WheelEvent) => {
    // Only prevent scroll events on the backdrop from reaching the background page
    e.stopPropagation();
    e.preventDefault();
  };
}

customElements.define("brakit-page-builder", PageBuilderModal);
