import * as vscode from 'vscode';
import { getNonce } from './utils';
import { i18n, languageNames, getLocale } from './i18n';

export function getWebviewContent(
  webview: vscode.Webview,
  version: string,
  initialState: { className?: string } = {}
): string {
  const nonce = getNonce();
  const locale = getLocale();
  const t = i18n[locale] || i18n.en;
  const i18nJson = JSON.stringify(i18n);
  const langNamesJson = JSON.stringify(languageNames);
  const initialStateJson = JSON.stringify(initialState);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>JsonToDart</title>
  <style>
    ${getStyles()}
  </style>
</head>
<body>
  ${getHtmlBody(t, locale, version)}

  <!-- 字段配置浮层弹窗 -->
  ${getFieldConfigModal(t)}

  <script nonce="${nonce}">
    ${getScript(i18nJson, langNamesJson, locale, initialStateJson)}
  </script>
</body>
</html>`;
}

function getStyles(): string {
  return `
    :root {
      color-scheme: dark;
      --text: #f0f6ff;
      --text-secondary: #a8c5e8;
      --muted: #6b8bb8;
      --accent: #00d4aa;
      --accent-hover: #00f5c4;
      --accent-2: #4da3ff;
      --accent-purple: #a855f7;
      --panel: rgba(12, 20, 35, 0.92);
      --panel-hover: rgba(18, 28, 48, 0.95);
      --border: rgba(100, 140, 200, 0.25);
      --border-hover: rgba(100, 180, 255, 0.4);
      --input: rgba(8, 15, 28, 0.9);
      --input-border: rgba(80, 120, 180, 0.3);
      --input-focus: #4da3ff;
      --success: #22c55e;
      --error: #ef4444;
      --warning: #f59e0b;
      --shadow-soft: 0 4px 24px rgba(0, 0, 0, 0.4);
      --shadow-glow: 0 0 40px rgba(77, 163, 255, 0.15);
      --ring: 0 0 0 3px rgba(77, 163, 255, 0.3);
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: #030712;
      background-image:
        radial-gradient(ellipse 80% 50% at 50% -20%, rgba(77, 163, 255, 0.15), transparent),
        radial-gradient(ellipse 60% 40% at 100% 0%, rgba(168, 85, 247, 0.1), transparent),
        radial-gradient(ellipse 60% 40% at 0% 100%, rgba(0, 212, 170, 0.08), transparent);
      color: var(--text);
      min-height: 100vh;
      line-height: 1.5;
    }

    .canvas {
      min-height: 100vh;
      padding: 40px 24px;
      display: flex;
      justify-content: center;
      align-items: flex-start;
    }

    .panel {
      width: min(720px, 100%);
      padding: 0;
      border-radius: 24px;
      background: var(--panel);
      border: 1px solid var(--border);
      box-shadow: var(--shadow-soft), var(--shadow-glow);
      position: relative;
      overflow: hidden;
      backdrop-filter: blur(20px) saturate(150%);
      animation: panel-in 400ms cubic-bezier(0.16, 1, 0.3, 1);
    }

    .panel::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1) 20%, rgba(255, 255, 255, 0.2) 50%, rgba(255, 255, 255, 0.1) 80%, transparent);
    }

    .header {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 28px 32px 24px;
      background: linear-gradient(180deg, rgba(77, 163, 255, 0.08) 0%, transparent 100%);
      border-bottom: 1px solid var(--border);
    }

    .logo {
      width: 48px;
      height: 48px;
      border-radius: 14px;
      background: linear-gradient(135deg, var(--accent), var(--accent-2));
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 24px rgba(0, 212, 170, 0.3);
      position: relative;
      overflow: hidden;
    }

    .logo::before {
      content: "";
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, rgba(255,255,255,0.3), transparent 60%);
    }

    .logo svg {
      width: 26px;
      height: 26px;
      position: relative;
      z-index: 1;
    }

    .header-text {
      flex: 1;
    }

    .title {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.02em;
      background: linear-gradient(135deg, var(--text), var(--text-secondary));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .subtitle {
      font-size: 13px;
      color: var(--muted);
      margin-top: 4px;
    }

    .version-badge {
      padding: 4px 10px;
      border-radius: 20px;
      background: rgba(77, 163, 255, 0.15);
      border: 1px solid rgba(77, 163, 255, 0.3);
      font-size: 11px;
      font-weight: 600;
      color: var(--accent-2);
      letter-spacing: 0.02em;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .lang-selector {
      position: relative;
    }

    .lang-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      border-radius: 8px;
      border: 1px solid var(--input-border);
      background: rgba(51, 65, 85, 0.4);
      color: var(--text-secondary);
      font-size: 12px;
      cursor: pointer;
      transition: all 200ms ease;
    }

    .lang-btn:hover {
      background: rgba(71, 85, 105, 0.5);
      border-color: var(--border-hover);
      color: var(--text);
    }

    .lang-btn svg {
      width: 14px;
      height: 14px;
    }

    .lang-dropdown {
      position: absolute;
      top: calc(100% + 4px);
      right: 0;
      min-width: 140px;
      max-height: 280px;
      overflow-y: auto;
      background: rgba(15, 23, 42, 0.98);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 6px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
      z-index: 100;
      display: none;
    }

    .lang-dropdown.show {
      display: block;
      animation: dropdown-in 200ms ease;
    }

    .lang-option {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 13px;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 150ms ease;
    }

    .lang-option:hover {
      background: rgba(77, 163, 255, 0.15);
      color: var(--text);
    }

    .lang-option.active {
      background: rgba(0, 212, 170, 0.15);
      color: var(--accent);
    }

    .lang-option.active::before {
      content: "✓";
      font-size: 12px;
      margin-right: 4px;
    }

    @keyframes dropdown-in {
      from {
        opacity: 0;
        transform: translateY(-8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .content {
      padding: 24px 32px 28px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group:last-child {
      margin-bottom: 0;
    }

    .form-row {
      display: flex;
      gap: 12px;
      align-items: flex-end;
    }

    .form-row .form-group {
      flex: 1;
      margin-bottom: 0;
    }

    .label-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .label-row label {
      margin-bottom: 0;
    }

    .btn-small {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 8px;
      border: 1px solid var(--input-border);
      background: rgba(51, 65, 85, 0.5);
      color: var(--text-secondary);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 200ms ease;
    }

    .btn-small svg {
      width: 14px;
      height: 14px;
    }

    .btn-small:hover {
      background: rgba(71, 85, 105, 0.6);
      border-color: var(--border-hover);
      color: var(--text);
    }

    /* 字段配置面板样式 - 浮层弹窗 */
    .field-config-wrapper {
      margin-top: 12px;
    }

    .field-config-toggle {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      background: rgba(30, 41, 59, 0.5);
      border: 1px solid var(--input-border);
      border-radius: 10px;
      cursor: pointer;
      transition: all 200ms ease;
    }

    .field-config-toggle:hover {
      background: rgba(40, 55, 80, 0.6);
      border-color: var(--border-hover);
    }

    .field-config-toggle.active {
      background: rgba(77, 163, 255, 0.1);
      border-color: rgba(77, 163, 255, 0.3);
    }

    .field-config-toggle-left {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 500;
      color: var(--text-secondary);
    }

    .field-config-toggle-left svg {
      width: 16px;
      height: 16px;
    }

    .field-config-toggle.active .field-config-toggle-left {
      color: var(--accent-2);
    }

    .field-config-toggle-right {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--muted);
    }

    .field-config-toggle-right svg {
      width: 14px;
      height: 14px;
      transition: transform 200ms ease;
    }

    .field-count {
      padding: 2px 8px;
      background: rgba(77, 163, 255, 0.15);
      border-radius: 10px;
      font-size: 11px;
      font-weight: 600;
      color: var(--accent-2);
    }

    /* 浮层遮罩 */
    .field-config-overlay {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      z-index: 1000;
      justify-content: center;
      align-items: center;
      padding: 20px;
    }

    .field-config-overlay.show {
      display: flex;
      animation: overlay-in 200ms ease;
    }

    @keyframes overlay-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    /* 浮层弹窗 */
    .field-config-modal {
      width: 100%;
      max-width: 800px;
      max-height: 80vh;
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      display: flex;
      flex-direction: column;
      animation: modal-in 300ms cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes modal-in {
      from {
        opacity: 0;
        transform: scale(0.95) translateY(10px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    .field-config-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--border);
      background: rgba(30, 41, 59, 0.5);
      border-radius: 16px 16px 0 0;
    }

    .field-config-modal-title {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 15px;
      font-weight: 600;
      color: var(--text);
    }

    .field-config-modal-title svg {
      width: 18px;
      height: 18px;
      color: var(--accent-2);
    }

    .field-config-modal-close {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      border: none;
      background: rgba(51, 65, 85, 0.5);
      color: var(--text-secondary);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 150ms ease;
      font-size: 20px;
      line-height: 1;
    }

    .field-config-modal-close:hover {
      background: rgba(239, 68, 68, 0.2);
      color: #f87171;
    }

    .field-config-modal-body {
      flex: 1;
      overflow-y: auto;
      overflow-x: auto;
      padding: 0;
    }

    .field-config-table {
      width: 100%;
      min-width: 700px;
    }

    .field-config-header {
      display: grid;
      grid-template-columns: minmax(160px, 2.1fr) minmax(120px, 1.4fr) minmax(120px, 1.1fr) 72px minmax(140px, 1.6fr);
      column-gap: 12px;
      padding: 12px 16px;
      background: rgba(30, 41, 59, 0.5);
      border-bottom: 1px solid var(--border);
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--muted);
      position: sticky;
      top: 0;
      z-index: 1;
    }

    .field-config-header > span {
      min-width: 0;
    }

    .field-config-header > span:nth-child(4) {
      text-align: center;
    }

    .field-config-body {
      padding: 0;
    }

    /* 树形结构行 */
    .field-config-row {
      display: grid;
      grid-template-columns: minmax(160px, 2.1fr) minmax(120px, 1.4fr) minmax(120px, 1.1fr) 72px minmax(140px, 1.6fr);
      column-gap: 12px;
      padding: 8px 16px;
      border-bottom: 1px solid rgba(100, 140, 200, 0.1);
      align-items: flex-start;
      transition: background 150ms ease;
    }

    .field-config-row:last-child {
      border-bottom: none;
    }

    .field-config-row:hover {
      background: rgba(77, 163, 255, 0.05);
    }

    .field-config-row.parent-row {
      background: rgba(77, 163, 255, 0.03);
    }

    /* 各列固定宽度 */
    .field-col-key { min-width: 0; padding-top: 6px; }
    .field-col-name { min-width: 0; }
    .field-col-type { min-width: 0; padding-top: 6px; overflow: hidden; }
    .field-col-nullable { display: flex; justify-content: center; padding-top: 6px; }
    .field-col-default { min-width: 0; }

    /* 树形缩进 - 在第一列内部 */
    .field-key-wrapper {
      display: flex;
      align-items: flex-start;
      gap: 4px;
      min-width: 0;
    }

    .field-tree-indent {
      flex-shrink: 0;
      display: flex;
      align-items: center;
    }

    .field-tree-indent-1 { width: 20px; }
    .field-tree-indent-2 { width: 40px; }
    .field-tree-indent-3 { width: 60px; }
    .field-tree-indent-4 { width: 80px; }

    .field-tree-icon {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
      color: var(--muted);
      cursor: pointer;
      transition: transform 200ms ease;
    }

    .field-tree-icon.collapsed {
      transform: rotate(-90deg);
    }

    .field-tree-icon.leaf {
      width: 16px;
      visibility: hidden;
    }

    .field-key {
      font-family: "SF Mono", "Fira Code", "Consolas", monospace;
      font-size: 12px;
      color: var(--accent);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .field-type-badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }

    .field-input {
      width: 100%;
      padding: 6px 10px;
      border-radius: 6px;
      border: 1px solid var(--input-border);
      background: var(--input);
      color: var(--text);
      font-size: 12px;
      outline: none;
      transition: all 150ms ease;
    }

    .field-input:focus {
      border-color: var(--input-focus);
      box-shadow: 0 0 0 2px rgba(77, 163, 255, 0.2);
    }

    .field-input::placeholder {
      color: var(--muted);
      opacity: 0.6;
    }

    .field-checkbox {
      width: 18px;
      height: 18px;
      border-radius: 4px;
      border: 2px solid var(--input-border);
      background: var(--input);
      cursor: pointer;
      transition: all 150ms ease;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .field-checkbox:hover {
      border-color: var(--border-hover);
    }

    .field-checkbox.checked {
      background: linear-gradient(135deg, var(--accent), var(--accent-2));
      border-color: transparent;
    }

    .field-checkbox.checked::after {
      content: "✓";
      color: #030712;
      font-size: 12px;
      font-weight: bold;
    }

    .field-default-input {
      width: 100%;
      padding: 6px 10px;
      border-radius: 6px;
      border: 1px solid var(--input-border);
      background: var(--input);
      color: var(--text);
      font-size: 11px;
      font-family: "SF Mono", "Fira Code", "Consolas", monospace;
      outline: none;
      transition: all 150ms ease;
    }

    .field-default-input:focus {
      border-color: var(--input-focus);
      box-shadow: 0 0 0 2px rgba(77, 163, 255, 0.2);
    }

    .field-config-empty {
      padding: 30px;
      text-align: center;
      color: var(--muted);
      font-size: 13px;
    }

    .field-config-empty svg {
      width: 40px;
      height: 40px;
      margin-bottom: 12px;
      opacity: 0.5;
    }

    label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-secondary);
    }

    label svg {
      width: 14px;
      height: 14px;
      opacity: 0.7;
    }

    input[type="text"], textarea {
      width: 100%;
      border-radius: 12px;
      border: 1px solid var(--input-border);
      background: var(--input);
      color: var(--text);
      padding: 12px 16px;
      font-size: 14px;
      font-family: inherit;
      outline: none;
      transition: all 200ms ease;
    }

    input[type="text"]:hover, textarea:hover {
      border-color: var(--border-hover);
    }

    input[type="text"]:focus, textarea:focus {
      border-color: var(--input-focus);
      box-shadow: var(--ring);
      background: rgba(12, 20, 38, 0.95);
    }

    input[type="text"]::placeholder, textarea::placeholder {
      color: var(--muted);
      opacity: 0.6;
    }

    textarea {
      min-height: 220px;
      resize: vertical;
      font-family: "SF Mono", "Fira Code", "Consolas", monospace;
      font-size: 13px;
      line-height: 1.6;
    }

    .options-section {
      display: flex;
      gap: 16px;
      align-items: center;
      flex-wrap: wrap;
      padding: 16px 0;
    }

    .toggle-wrapper {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 16px;
      border-radius: 12px;
      background: rgba(30, 41, 59, 0.5);
      border: 1px solid var(--input-border);
      cursor: pointer;
      transition: all 200ms ease;
      user-select: none;
    }

    .toggle-wrapper:hover {
      background: rgba(40, 55, 80, 0.6);
      border-color: var(--border-hover);
    }

    .toggle-wrapper.active {
      background: rgba(0, 212, 170, 0.1);
      border-color: rgba(0, 212, 170, 0.4);
    }

    .toggle {
      position: relative;
      width: 40px;
      height: 22px;
      background: rgba(100, 116, 139, 0.4);
      border-radius: 11px;
      transition: all 200ms ease;
      flex-shrink: 0;
    }

    .toggle::after {
      content: "";
      position: absolute;
      top: 3px;
      left: 3px;
      width: 16px;
      height: 16px;
      background: #fff;
      border-radius: 50%;
      transition: all 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }

    .toggle-wrapper.active .toggle {
      background: linear-gradient(135deg, var(--accent), var(--accent-2));
    }

    .toggle-wrapper.active .toggle::after {
      transform: translateX(18px);
    }

    .toggle-label {
      font-size: 13px;
      font-weight: 500;
      color: var(--text-secondary);
      transition: color 200ms ease;
    }

    .toggle-wrapper.active .toggle-label {
      color: var(--text);
    }

    input[type="checkbox"] {
      display: none;
    }

    .defaults-card {
      margin-top: 16px;
      padding: 20px;
      border-radius: 16px;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid var(--input-border);
      animation: expand-in 300ms cubic-bezier(0.16, 1, 0.3, 1);
    }

    .defaults-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border);
    }

    .defaults-header svg {
      width: 18px;
      height: 18px;
      color: var(--accent-2);
    }

    .defaults-header span {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .defaults-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 12px;
    }

    .default-item {
      display: flex;
      flex-direction: column;
    }

    .default-item label {
      font-size: 11px;
      margin-bottom: 6px;
      color: var(--muted);
    }

    .default-item input {
      padding: 10px 12px;
      font-size: 13px;
      font-family: "SF Mono", "Fira Code", "Consolas", monospace;
    }

    .type-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .type-string { background: rgba(34, 197, 94, 0.15); color: #4ade80; }
    .type-int { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
    .type-double { background: rgba(168, 85, 247, 0.15); color: #c084fc; }
    .type-bool { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
    .type-list { background: rgba(236, 72, 153, 0.15); color: #f472b6; }
    .type-object { background: rgba(99, 102, 241, 0.15); color: #818cf8; }

    .field-config-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      color: var(--muted);
      text-align: center;
    }

    .field-config-empty svg {
      width: 48px;
      height: 48px;
      margin-bottom: 12px;
      opacity: 0.4;
    }

    .field-config-empty div {
      font-size: 13px;
    }

    .error-box {
      margin-top: 16px;
      padding: 14px 16px;
      border-radius: 12px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      display: none;
      animation: shake 400ms cubic-bezier(0.36, 0.07, 0.19, 0.97);
    }

    .error-box.show {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }

    .error-icon {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
      color: #f87171;
    }

    .error-content {
      flex: 1;
    }

    .error-title {
      font-size: 13px;
      font-weight: 600;
      color: #fca5a5;
      margin-bottom: 2px;
    }

    .error-message {
      font-size: 12px;
      color: #fca5a5;
      opacity: 0.9;
    }

    .footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding: 20px 32px;
      background: rgba(15, 23, 42, 0.5);
      border-top: 1px solid var(--border);
    }

    .footer-hint {
      font-size: 12px;
      color: var(--muted);
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .footer-hint svg {
      width: 14px;
      height: 14px;
    }

    .footer-actions {
      display: flex;
      gap: 10px;
    }

    button {
      border: none;
      border-radius: 10px;
      padding: 12px 24px;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.02em;
      cursor: pointer;
      transition: all 200ms ease;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    button svg {
      width: 16px;
      height: 16px;
    }

    .btn-primary {
      background: linear-gradient(135deg, var(--accent), var(--accent-2));
      color: #030712;
      box-shadow: 0 4px 16px rgba(0, 212, 170, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2);
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0, 212, 170, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2);
    }

    .btn-primary:active {
      transform: translateY(0);
    }

    .btn-secondary {
      background: rgba(51, 65, 85, 0.6);
      color: var(--text);
      border: 1px solid var(--input-border);
    }

    .btn-secondary:hover {
      background: rgba(71, 85, 105, 0.7);
      border-color: var(--border-hover);
    }

    .btn-ghost {
      background: transparent;
      color: var(--muted);
      padding: 12px 16px;
    }

    .btn-ghost:hover {
      color: var(--text);
      background: rgba(51, 65, 85, 0.4);
    }

    .btn-icon {
      padding: 10px;
      border-radius: 10px;
      background: rgba(51, 65, 85, 0.5);
      border: 1px solid var(--input-border);
    }

    .btn-icon:hover {
      background: rgba(71, 85, 105, 0.6);
      border-color: var(--border-hover);
    }

    @keyframes panel-in {
      from {
        opacity: 0;
        transform: translateY(20px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @keyframes expand-in {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes shake {
      10%, 90% { transform: translateX(-1px); }
      20%, 80% { transform: translateX(2px); }
      30%, 50%, 70% { transform: translateX(-3px); }
      40%, 60% { transform: translateX(3px); }
    }

    @media (max-width: 640px) {
      .canvas {
        padding: 16px;
      }
      .panel {
        border-radius: 20px;
      }
      .header {
        padding: 20px;
      }
      .content {
        padding: 20px;
      }
      .footer {
        flex-direction: column;
        padding: 16px 20px;
      }
      .footer-actions {
        width: 100%;
      }
      .footer-actions button {
        flex: 1;
      }
      .options-section {
        flex-direction: column;
        align-items: stretch;
      }
      .toggle-wrapper {
        justify-content: space-between;
      }
    }
  `;
}

function getHtmlBody(t: any, locale: string, version: string): string {
  return `
  <div class="canvas">
    <div class="panel">
      <div class="header">
        <div class="logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="#030712" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="12" y1="18" x2="12" y2="12"/>
            <line x1="9" y1="15" x2="15" y2="15"/>
          </svg>
        </div>
        <div class="header-text">
          <div class="title" data-i18n="title">${t.title}</div>
          <div class="subtitle" data-i18n="subtitle">${t.subtitle}</div>
        </div>
        <div class="header-actions">
          <div class="lang-selector">
            <button class="lang-btn" id="langBtn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              <span id="currentLangName">${languageNames[locale]}</span>
            </button>
            <div class="lang-dropdown" id="langDropdown"></div>
          </div>
          <div class="version-badge">v${version}</div>
        </div>
      </div>

      <div class="content">
        <div class="form-group">
          <label>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span data-i18n="className">${t.className}</span>
          </label>
          <input id="className" type="text" placeholder="${t.classNamePlaceholder}" data-i18n-placeholder="classNamePlaceholder" />
        </div>

        <div class="form-group" style="margin-top: 20px;">
          <div class="label-row">
            <label>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              <span data-i18n="jsonInput">${t.jsonInput}</span>
            </label>
            <button class="btn-small" id="formatBtn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="4 7 4 4 20 4 20 7"/>
                <line x1="9" y1="20" x2="15" y2="20"/>
                <line x1="12" y1="4" x2="12" y2="20"/>
              </svg>
              <span data-i18n="format">${t.format}</span>
            </button>
          </div>
          <textarea id="jsonText" placeholder='${t.jsonInputPlaceholder}' data-i18n-placeholder="jsonInputPlaceholder"></textarea>

          <!-- 字段配置按钮 -->
          <div class="field-config-wrapper">
            <div class="field-config-toggle" id="fieldConfigToggle">
              <div class="field-config-toggle-left">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7m0-18H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7m0-18v18"/>
                </svg>
                <span data-i18n="expandPanel">${t.expandPanel}</span>
              </div>
              <div class="field-config-toggle-right">
                <span class="field-count" id="fieldCount">0</span>
              </div>
            </div>
          </div>
        </div>

        <div class="options-section">
          <div class="toggle-wrapper" id="nullableWrapper">
            <input type="checkbox" id="nullableToggle" />
            <div class="toggle"></div>
            <span class="toggle-label" data-i18n="nullableFields">${t.nullableFields}</span>
          </div>
          <div class="toggle-wrapper" id="defaultWrapper">
            <input type="checkbox" id="defaultToggle" />
            <div class="toggle"></div>
            <span class="toggle-label" data-i18n="defaultValues">${t.defaultValues}</span>
          </div>
        </div>

        <div class="defaults-card" id="defaultsSection" style="display: none;">
          <div class="defaults-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v6m0 6v10"/>
              <path d="M20.66 4.93l-4.24 4.24m-8.84 0L3.34 4.93"/>
              <path d="M20.66 19.07l-4.24-4.24m-8.84 0l-4.24 4.24"/>
            </svg>
            <span data-i18n="configureDefaults">${t.configureDefaults}</span>
          </div>
          <div class="defaults-grid">
            <div class="default-item">
              <label><span class="type-badge type-string">String</span></label>
              <input id="defaultString" type="text" value="" placeholder='""' />
            </div>
            <div class="default-item">
              <label><span class="type-badge type-int">int</span></label>
              <input id="defaultInt" type="text" value="0" />
            </div>
            <div class="default-item">
              <label><span class="type-badge type-double">double</span></label>
              <input id="defaultDouble" type="text" value="0.0" />
            </div>
            <div class="default-item">
              <label><span class="type-badge type-bool">bool</span></label>
              <input id="defaultBool" type="text" value="false" />
            </div>
            <div class="default-item">
              <label><span class="type-badge type-list">List</span></label>
              <input id="defaultList" type="text" value="[]" />
            </div>
          </div>
        </div>

        <div id="error" class="error-box">
          <svg class="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div class="error-content">
            <div class="error-title" data-i18n="error">${t.error}</div>
            <div class="error-message" id="errorMessage"></div>
          </div>
        </div>
      </div>

      <div class="footer">
        <div class="footer-hint">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span data-i18n="footerHint">${t.footerHint}</span>
        </div>
        <div class="footer-actions">
          <button class="btn-ghost" id="cancelBtn" data-i18n="cancel">${t.cancel}</button>
          <button class="btn-primary" id="makeBtn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 5v14"/>
              <path d="M5 12h14"/>
            </svg>
            <span data-i18n="generate">${t.generate}</span>
          </button>
        </div>
      </div>
    </div>
  </div>`;
}

function getFieldConfigModal(t: any): string {
  return `
  <div class="field-config-overlay" id="fieldConfigOverlay">
    <div class="field-config-modal">
      <div class="field-config-modal-header">
        <div class="field-config-modal-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7m0-18H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7m0-18v18"/>
          </svg>
          <span data-i18n="fieldConfig">${t.fieldConfig}</span>
        </div>
        <button class="field-config-modal-close" id="fieldConfigClose">×</button>
      </div>
      <div class="field-config-modal-body">
        <div class="field-config-header">
          <span data-i18n="fieldName">${t.fieldName}</span>
          <span data-i18n="dartName">${t.dartName}</span>
          <span data-i18n="type">${t.type}</span>
          <span data-i18n="nullable">${t.nullable}</span>
          <span data-i18n="defaultValue">${t.defaultValue}</span>
        </div>
        <div class="field-config-body" id="fieldConfigBody">
          <div class="field-config-empty" id="fieldConfigEmpty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="12" y1="18" x2="12" y2="12"/>
              <line x1="9" y1="15" x2="15" y2="15"/>
            </svg>
            <div data-i18n="noFieldsFound">${t.noFieldsFound}</div>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

function getScript(
  i18nJson: string,
  langNamesJson: string,
  locale: string,
  initialStateJson: string
): string {
  return `
    const vscode = acquireVsCodeApi();
    const i18nData = ${i18nJson};
    const langNames = ${langNamesJson};
    let currentLang = '${locale}';
    const initialState = ${initialStateJson};

    const errorBox = document.getElementById('error');
    const errorMessage = document.getElementById('errorMessage');
    const nullableToggle = document.getElementById('nullableToggle');
    const nullableWrapper = document.getElementById('nullableWrapper');
    const defaultToggle = document.getElementById('defaultToggle');
    const defaultWrapper = document.getElementById('defaultWrapper');
    const defaultsSection = document.getElementById('defaultsSection');
    const langBtn = document.getElementById('langBtn');
    const langDropdown = document.getElementById('langDropdown');
    const currentLangName = document.getElementById('currentLangName');

    function setError(message) {
      if (message) {
        errorMessage.textContent = message;
        errorBox.classList.add('show');
      } else {
        errorMessage.textContent = '';
        errorBox.classList.remove('show');
      }
    }

    // 语言切换相关函数
    function getT(key) {
      return i18nData[currentLang]?.[key] || i18nData.en[key] || key;
    }

    function updateAllTexts() {
      // 更新所有 data-i18n 元素的文本
      document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = getT(key);
      });
      // 更新所有 data-i18n-placeholder 元素的 placeholder
      document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        el.placeholder = getT(key);
      });
      // 更新当前语言显示
      currentLangName.textContent = langNames[currentLang];
      // 更新下拉菜单的激活状态
      updateLangDropdown();
    }

    function updateLangDropdown() {
      langDropdown.innerHTML = '';
      Object.keys(langNames).forEach(code => {
        const option = document.createElement('div');
        option.className = 'lang-option' + (code === currentLang ? ' active' : '');
        option.textContent = langNames[code];
        option.addEventListener('click', (e) => {
          e.stopPropagation();
          currentLang = code;
          updateAllTexts();
          langDropdown.classList.remove('show');
        });
        langDropdown.appendChild(option);
      });
    }

    // 初始化语言下拉菜单
    updateLangDropdown();

    // 语言按钮点击事件
    langBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      langDropdown.classList.toggle('show');
    });

    // 点击其他地方关闭下拉菜单
    document.addEventListener('click', () => {
      langDropdown.classList.remove('show');
    });

    function updateToggleUI(checkbox, wrapper) {
      if (checkbox.checked) {
        wrapper.classList.add('active');
      } else {
        wrapper.classList.remove('active');
      }
    }

    function updateDefaultsState() {
      const enabled = defaultToggle.checked;
      defaultsSection.style.display = enabled ? 'block' : 'none';
      defaultsSection.querySelectorAll('input').forEach((input) => {
        input.disabled = !enabled;
      });
      // 更新字段配置面板中的默认值列显示
      updateFieldConfigDefaultsVisibility();
    }

    // 字段配置面板相关
    const fieldConfigToggle = document.getElementById('fieldConfigToggle');
    const fieldConfigOverlay = document.getElementById('fieldConfigOverlay');
    const fieldConfigClose = document.getElementById('fieldConfigClose');
    const fieldConfigBody = document.getElementById('fieldConfigBody');
    const fieldConfigEmpty = document.getElementById('fieldConfigEmpty');
    const fieldCount = document.getElementById('fieldCount');
    const jsonTextArea = document.getElementById('jsonText');
    const classNameInput = document.getElementById('className');
    let fieldConfigs = [];
    let treeData = [];
    let isPanelOpen = false;

    if (initialState && typeof initialState.className === 'string') {
      classNameInput.value = initialState.className;
    }

    function openFieldConfigModal() {
      isPanelOpen = true;
      fieldConfigToggle.classList.add('active');
      fieldConfigOverlay.classList.add('show');
      parseAndUpdateFields();
      updateToggleText();
    }

    function closeFieldConfigModal() {
      isPanelOpen = false;
      fieldConfigToggle.classList.remove('active');
      fieldConfigOverlay.classList.remove('show');
      updateToggleText();
    }

    function toggleFieldConfigPanel() {
      if (isPanelOpen) {
        closeFieldConfigModal();
      } else {
        openFieldConfigModal();
      }
    }

    function updateToggleText() {
      const textSpan = fieldConfigToggle.querySelector('.field-config-toggle-left span');
      textSpan.textContent = isPanelOpen ? getT('collapsePanel') : getT('expandPanel');
    }

    function inferType(value) {
      if (value === null) return 'Object?';
      if (Array.isArray(value)) {
        if (value.length === 0) return 'List<dynamic>';
        const firstItem = value.find(item => item !== null);
        if (firstItem === undefined) return 'List<dynamic>';
        if (typeof firstItem === 'object' && !Array.isArray(firstItem)) return 'List<Object>';
        return 'List<' + inferType(firstItem) + '>';
      }
      if (typeof value === 'object') return 'Object';
      if (typeof value === 'string') return 'String';
      if (typeof value === 'number') return Number.isInteger(value) ? 'int' : 'double';
      if (typeof value === 'boolean') return 'bool';
      return 'dynamic';
    }

    function toCamelCase(str) {
      const parts = str
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .split(/[^A-Za-z0-9]+/)
        .filter(Boolean);
      if (!parts.length) return '';
      const result = parts.map((part, index) => {
        if (index === 0) return part.toLowerCase();
        return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
      }).join('');
      return /^[0-9]/.test(result) ? 'field' + result : result;
    }

    function getTypeClass(type) {
      const baseType = type.replace(/\\?$/, '');
      if (baseType.startsWith('List')) return 'type-list';
      if (baseType === 'String') return 'type-string';
      if (baseType === 'int') return 'type-int';
      if (baseType === 'double') return 'type-double';
      if (baseType === 'bool') return 'type-bool';
      if (baseType === 'Object' || baseType === 'dynamic') return 'type-object';
      return 'type-string';
    }

    function getDefaultForType(type) {
      const baseType = type.replace(/\\?$/, '');
      if (baseType.startsWith('List')) return '[]';
      if (baseType === 'String') return "''";
      if (baseType === 'int') return '0';
      if (baseType === 'double') return '0.0';
      if (baseType === 'bool') return 'false';
      return 'null';
    }

    // 递归解析 JSON 为树形结构
    function parseJsonToTree(obj, path = '', depth = 0) {
      const nodes = [];

      for (const [key, value] of Object.entries(obj)) {
        const fullPath = path ? path + '.' + key : key;
        const inferredType = inferType(value);
        const isObject = typeof value === 'object' && value !== null && !Array.isArray(value);
        const isArray = Array.isArray(value);
        const hasChildren = isObject || (isArray && value.length > 0 && typeof value[0] === 'object' && value[0] !== null);

        const node = {
          id: fullPath,
          jsonKey: key,
          dartName: toCamelCase(key),
          type: inferredType,
          nullable: nullableToggle.checked,
          defaultValue: getDefaultForType(inferredType),
          depth: depth,
          hasChildren: hasChildren,
          expanded: true,
          children: []
        };

        // 递归处理子对象
        if (isObject) {
          node.children = parseJsonToTree(value, fullPath, depth + 1);
        } else if (isArray && value.length > 0) {
          const firstItem = value.find(item => item !== null && typeof item === 'object' && !Array.isArray(item));
          if (firstItem) {
            node.children = parseJsonToTree(firstItem, fullPath + '[0]', depth + 1);
          }
        }

        nodes.push(node);
      }

      return nodes;
    }

    // 展平树形结构用于显示
    function flattenTree(nodes, visibleOnly = true) {
      const flat = [];

      function traverse(nodeList) {
        for (const node of nodeList) {
          flat.push(node);
          if (node.children && node.children.length > 0 && (!visibleOnly || node.expanded)) {
            traverse(node.children);
          }
        }
      }

      traverse(nodes);
      return flat;
    }

    // 计算总字段数（只计算叶子节点，即实际字段）
    function countFields(nodes) {
      let count = 0;
      for (const node of nodes) {
        count++; // 每个节点都计数
        if (node.children && node.children.length > 0) {
          count += countFields(node.children);
        }
      }
      return count;
    }

    function clearChildren(element) {
      while (element.firstChild) {
        element.removeChild(element.firstChild);
      }
    }

    function createSvgElement(tag) {
      return document.createElementNS('http://www.w3.org/2000/svg', tag);
    }

    function createTreeIcon(node) {
      const svg = createSvgElement('svg');
      svg.classList.add('field-tree-icon');
      svg.setAttribute('viewBox', '0 0 24 24');

      if (!node.hasChildren) {
        svg.classList.add('leaf');
        return svg;
      }

      if (!node.expanded) {
        svg.classList.add('collapsed');
      }

      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('stroke-width', '2');
      svg.setAttribute('stroke-linecap', 'round');
      svg.setAttribute('stroke-linejoin', 'round');

      const polyline = createSvgElement('polyline');
      polyline.setAttribute('points', '6 9 12 15 18 9');
      svg.appendChild(polyline);

      return svg;
    }

    function parseAndUpdateFields() {
      const jsonText = jsonTextArea.value.trim();
      if (!jsonText) {
        treeData = [];
        fieldConfigs = [];
        renderFieldRows();
        return;
      }

      try {
        const parsed = JSON.parse(jsonText);
        if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) {
          treeData = [];
          fieldConfigs = [];
          renderFieldRows();
          return;
        }

        // 保留已有配置
        const existingMap = new Map();
        function collectExisting(nodes) {
          for (const node of nodes) {
            existingMap.set(node.id, { dartName: node.dartName, nullable: node.nullable, defaultValue: node.defaultValue });
            if (node.children) collectExisting(node.children);
          }
        }
        collectExisting(treeData);

        // 解析新的树形结构
        treeData = parseJsonToTree(parsed);

        // 恢复已有配置
        function restoreConfig(nodes) {
          for (const node of nodes) {
            const existing = existingMap.get(node.id);
            if (existing) {
              node.dartName = existing.dartName;
              node.nullable = existing.nullable;
              node.defaultValue = existing.defaultValue;
            }
            if (node.children) restoreConfig(node.children);
          }
        }
        restoreConfig(treeData);

        // 更新 fieldConfigs（只保留根级别的字段用于代码生成）
        fieldConfigs = treeData.map(node => ({
          jsonKey: node.jsonKey,
          dartName: node.dartName,
          type: node.type,
          nullable: node.nullable,
          defaultValue: node.defaultValue
        }));

        renderFieldRows();
      } catch (error) {
        treeData = [];
        fieldConfigs = [];
        renderFieldRows();
      }
    }

    function renderFieldRows() {
      const totalCount = countFields(treeData);
      fieldCount.textContent = totalCount.toString();

      if (treeData.length === 0) {
        clearChildren(fieldConfigBody);
        fieldConfigBody.appendChild(fieldConfigEmpty);
        fieldConfigEmpty.style.display = 'flex';
        return;
      }

      fieldConfigEmpty.style.display = 'none';
      const showDefaults = defaultToggle.checked;
      const flatNodes = flattenTree(treeData);

      clearChildren(fieldConfigBody);
      const fragment = document.createDocumentFragment();

      flatNodes.forEach((node) => {
        const row = document.createElement('div');
        row.className = 'field-config-row' + (node.hasChildren ? ' parent-row' : '');
        row.dataset.id = node.id;

        const keyCol = document.createElement('div');
        keyCol.className = 'field-col-key';
        const keyWrapper = document.createElement('div');
        keyWrapper.className = 'field-key-wrapper';
        const indent = document.createElement('span');
        indent.className = 'field-tree-indent' + (node.depth > 0 ? ' field-tree-indent-' + Math.min(node.depth, 4) : '');
        const treeIcon = createTreeIcon(node);
        const key = document.createElement('span');
        key.className = 'field-key';
        key.title = node.jsonKey;
        key.textContent = node.jsonKey;
        keyWrapper.appendChild(indent);
        keyWrapper.appendChild(treeIcon);
        keyWrapper.appendChild(key);
        keyCol.appendChild(keyWrapper);

        const nameCol = document.createElement('div');
        nameCol.className = 'field-col-name';
        const nameInput = document.createElement('input');
        nameInput.className = 'field-input dart-name-input';
        nameInput.type = 'text';
        nameInput.value = node.dartName;
        nameCol.appendChild(nameInput);

        const typeCol = document.createElement('div');
        typeCol.className = 'field-col-type';
        const typeBadge = document.createElement('span');
        typeBadge.className = 'field-type-badge ' + getTypeClass(node.type);
        typeBadge.textContent = node.type;
        typeCol.appendChild(typeBadge);

        const nullableCol = document.createElement('div');
        nullableCol.className = 'field-col-nullable';
        const checkbox = document.createElement('div');
        checkbox.className = 'field-checkbox' + (node.nullable ? ' checked' : '');
        nullableCol.appendChild(checkbox);

        const defaultCol = document.createElement('div');
        defaultCol.className = 'field-col-default';
        const defaultInput = document.createElement('input');
        defaultInput.className = 'field-default-input';
        defaultInput.type = 'text';
        defaultInput.value = node.defaultValue;
        if (!showDefaults) {
          defaultInput.style.opacity = '0.4';
          defaultInput.style.pointerEvents = 'none';
        }
        defaultCol.appendChild(defaultInput);

        row.appendChild(keyCol);
        row.appendChild(nameCol);
        row.appendChild(typeCol);
        row.appendChild(nullableCol);
        row.appendChild(defaultCol);

        if (node.hasChildren) {
          treeIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            node.expanded = !node.expanded;
            renderFieldRows();
          });
        }

        nameInput.addEventListener('input', (e) => {
          node.dartName = e.target.value;
          updateFieldConfigs();
        });

        checkbox.addEventListener('click', (e) => {
          node.nullable = !node.nullable;
          e.target.classList.toggle('checked');
          updateFieldConfigs();
        });

        defaultInput.addEventListener('input', (e) => {
          node.defaultValue = e.target.value;
          updateFieldConfigs();
        });

        fragment.appendChild(row);
      });

      fieldConfigBody.appendChild(fragment);
    }

    function findNodeById(nodes, id) {
      for (const node of nodes) {
        if (node.id === id) return node;
        if (node.children) {
          const found = findNodeById(node.children, id);
          if (found) return found;
        }
      }
      return null;
    }

    function updateFieldConfigs() {
      fieldConfigs = treeData.map(node => ({
        jsonKey: node.jsonKey,
        dartName: node.dartName,
        type: node.type,
        nullable: node.nullable,
        defaultValue: node.defaultValue
      }));
    }

    function updateFieldConfigDefaultsVisibility() {
      const showDefaults = defaultToggle.checked;
      fieldConfigBody.querySelectorAll('.field-default-input').forEach(input => {
        if (showDefaults) {
          input.style.opacity = '1';
          input.style.pointerEvents = 'auto';
        } else {
          input.style.opacity = '0.4';
          input.style.pointerEvents = 'none';
        }
      });
    }

    function updateAllFieldsNullable() {
      const nullable = nullableToggle.checked;
      function updateNodes(nodes) {
        for (const node of nodes) {
          node.nullable = nullable;
          if (node.children) updateNodes(node.children);
        }
      }
      updateNodes(treeData);
      updateFieldConfigs();
      if (isPanelOpen) renderFieldRows();
    }

    // 字段配置面板事件
    fieldConfigToggle.addEventListener('click', toggleFieldConfigPanel);
    fieldConfigClose.addEventListener('click', closeFieldConfigModal);

    // 点击遮罩关闭
    fieldConfigOverlay.addEventListener('click', (e) => {
      if (e.target === fieldConfigOverlay) {
        closeFieldConfigModal();
      }
    });

    // ESC 键关闭
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isPanelOpen) {
        closeFieldConfigModal();
      }
    });

    // JSON 输入变化时更新字段计数
    let jsonInputTimeout;
    jsonTextArea.addEventListener('input', () => {
      clearTimeout(jsonInputTimeout);
      jsonInputTimeout = setTimeout(() => {
        // 临时解析更新计数
        try {
          const parsed = JSON.parse(jsonTextArea.value.trim());
          if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
            const tempTree = parseJsonToTree(parsed);
            fieldCount.textContent = countFields(tempTree).toString();
          }
        } catch (e) {
          fieldCount.textContent = '0';
        }
        if (isPanelOpen) {
          parseAndUpdateFields();
        }
      }, 300);
    });

    // Toggle click handlers
    nullableWrapper.addEventListener('click', (e) => {
      if (e.target === nullableToggle) return;
      nullableToggle.checked = !nullableToggle.checked;
      updateToggleUI(nullableToggle, nullableWrapper);
      updateAllFieldsNullable();
    });

    nullableToggle.addEventListener('change', () => {
      updateToggleUI(nullableToggle, nullableWrapper);
      updateAllFieldsNullable();
    });

    defaultWrapper.addEventListener('click', (e) => {
      if (e.target === defaultToggle) return;
      defaultToggle.checked = !defaultToggle.checked;
      updateToggleUI(defaultToggle, defaultWrapper);
      updateDefaultsState();
    });

    defaultToggle.addEventListener('change', () => {
      updateToggleUI(defaultToggle, defaultWrapper);
      updateDefaultsState();
    });

    document.getElementById('formatBtn').addEventListener('click', () => {
      const jsonText = document.getElementById('jsonText');
      try {
        const parsed = JSON.parse(jsonText.value);
        jsonText.value = JSON.stringify(parsed, null, 2);
        setError('');
      } catch (error) {
        setError(getT('invalidJson'));
      }
    });

    document.getElementById('makeBtn').addEventListener('click', () => {
      const payload = {
        type: 'generate',
        className: document.getElementById('className').value,
        jsonText: document.getElementById('jsonText').value,
        fieldConfigs: fieldConfigs.length > 0 ? fieldConfigs : null,
        options: {
          makeNullable: nullableToggle.checked,
          useDefaultValues: defaultToggle.checked,
          defaults: {
            stringValue: document.getElementById('defaultString').value,
            intValue: document.getElementById('defaultInt').value,
            doubleValue: document.getElementById('defaultDouble').value,
            boolValue: document.getElementById('defaultBool').value,
            listValue: document.getElementById('defaultList').value
          }
        }
      };
      vscode.postMessage(payload);
    });

    document.getElementById('cancelBtn').addEventListener('click', () => {
      vscode.postMessage({ type: 'cancel' });
    });

    // Initialize states
    updateToggleUI(nullableToggle, nullableWrapper);
    updateToggleUI(defaultToggle, defaultWrapper);
    updateDefaultsState();

    window.addEventListener('message', (event) => {
      const message = event.data;
      if (message.type === 'error') {
        setError(message.message);
      }
      if (message.type === 'info') {
        setError('');
      }
    });
  `;
}
