// Self-hosted fonts (no external network required in Tauri webview)
import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/inter/800.css";
import "@fontsource/jetbrains-mono/400.css";

import "./index.css";

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// ── Tauri environment guard ──────────────────────────────────────────────────
// OpenTang requires the Tauri native runtime to communicate with the system.
// If window.__TAURI_INTERNALS__ is not present, the app is being opened in a
// regular browser instead of the native desktop app window — show a clear
// error rather than a confusing "invoke is undefined" crash.
const isTauri = typeof window !== "undefined" &&
  (
    (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ !== undefined ||
    (window as unknown as Record<string, unknown>).__TAURI__ !== undefined
  );

if (!isTauri) {
  document.getElementById("root")!.innerHTML = `
    <div style="
      min-height: 100vh;
      background: #0A0A0B;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: Inter, system-ui, sans-serif;
      color: #F8F8F8;
      padding: 24px;
    ">
      <div style="
        max-width: 520px;
        text-align: center;
        background: #111114;
        border: 1px solid #2A2A32;
        border-radius: 16px;
        padding: 48px 40px;
      ">
        <div style="font-size: 48px; margin-bottom: 16px;">🍊</div>
        <h1 style="font-size: 22px; font-weight: 700; margin: 0 0 12px; color: #F97316;">
          Launch the native app
        </h1>
        <p style="color: #8B8B9A; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
          OpenTang needs to run as a desktop application to access your system.
          It can't run in a regular browser.
        </p>
        <div style="
          background: #1A1A1F;
          border-radius: 10px;
          padding: 20px 24px;
          text-align: left;
          font-size: 14px;
          line-height: 2;
          color: #8B8B9A;
          margin-bottom: 28px;
        ">
          <div><span style="color:#F97316;">macOS</span> — Open <strong style="color:#F8F8F8;">OpenTang.app</strong> from Applications</div>
          <div><span style="color:#F97316;">Windows</span> — Run <strong style="color:#F8F8F8;">OpenTang_x64-setup.exe</strong></div>
          <div><span style="color:#F97316;">Linux</span> — Run the <strong style="color:#F8F8F8;">.AppImage</strong> or install the <strong style="color:#F8F8F8;">.deb</strong> / <strong style="color:#F8F8F8;">.rpm</strong></div>
        </div>
        <a
          href="https://github.com/Koba42Corp/opentang/releases/latest"
          target="_blank"
          rel="noopener noreferrer"
          style="
            display: inline-block;
            background: #F97316;
            color: #0A0A0B;
            font-weight: 700;
            font-size: 14px;
            padding: 12px 28px;
            border-radius: 8px;
            text-decoration: none;
          "
        >
          Download OpenTang →
        </a>
      </div>
    </div>
  `;
} else {
  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
