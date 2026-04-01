//! AI Chat Panel — proxy commands for OpenClaw/Hermes/NanoClaw gateway chat.
//!
//! Architecture: Tauri Rust backend proxies all requests to the Gateway.
//! The OPENCLAW_SECRET token never touches the WebView — it stays in Rust.
//!
//! Flow:
//!   React UI  →  invoke("chat_send", {message, installPath, context})
//!             →  Rust reads OPENCLAW_SECRET from {installPath}/.env
//!             →  POST /v1/chat/completions to localhost:18789 with Bearer token
//!             →  SSE stream chunks forwarded via app.emit("chat-chunk", chunk)
//!             →  app.emit("chat-done", ()) when stream ends
//!             →  app.emit("chat-error", message) on failure

use serde::Serialize;
use std::path::PathBuf;
use tauri::Emitter;


const GATEWAY_PORT: u16 = 18789;

/// A single streaming chunk event payload.
#[derive(Serialize, Clone)]
pub struct ChatChunk {
    pub text: String,
}

/// Gateway health / availability response.
#[derive(Serialize)]
pub struct GatewayStatus {
    pub online: bool,
    pub url: String,
    pub edition: Option<String>,
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/// Resolve ~ in path.
fn resolve_path(p: &str) -> Result<PathBuf, String> {
    if p.starts_with("~/") || p == "~" {
        let home = dirs::home_dir().ok_or("Cannot resolve home directory")?;
        Ok(home.join(&p[2..]))
    } else {
        Ok(PathBuf::from(p))
    }
}

/// Read OPENCLAW_SECRET from {install_path}/.env
/// Values may be single-quoted: KEY='value' or KEY=value
fn read_secret(install_path: &str) -> Result<String, String> {
    let path = resolve_path(install_path)?.join(".env");
    let content = std::fs::read_to_string(&path)
        .map_err(|e| format!("Cannot read .env at {}: {e}", path.display()))?;

    for line in content.lines() {
        let line = line.trim();
        if line.starts_with("OPENCLAW_SECRET=") {
            let val = &line["OPENCLAW_SECRET=".len()..];
            // Strip surrounding single or double quotes
            let val = val.trim_matches('\'').trim_matches('"');
            if !val.is_empty() {
                return Ok(val.to_string());
            }
        }
    }
    Err("OPENCLAW_SECRET not found in .env".to_string())
}

/// Try to find a reachable gateway URL.
/// Tries localhost first, then host.docker.internal (macOS Docker).
async fn find_gateway_url() -> Option<String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(2))
        .build()
        .ok()?;

    for host in &["localhost", "host.docker.internal"] {
        let url = format!("http://{}:{}/v1/models", host, GATEWAY_PORT);
        if client.get(&url).send().await.is_ok() {
            return Some(format!("http://{}:{}", host, GATEWAY_PORT));
        }
    }
    None
}

// ── Commands ─────────────────────────────────────────────────────────────────

/// Check if the OpenClaw/Hermes/NanoClaw gateway is reachable.
/// Returns GatewayStatus { online, url, edition }.
#[tauri::command]
pub async fn chat_check_gateway(install_path: String) -> GatewayStatus {
    // Read edition from state file
    let edition = read_edition(&install_path);

    match find_gateway_url().await {
        Some(url) => GatewayStatus { online: true, url, edition },
        None => GatewayStatus {
            online: false,
            url: format!("http://localhost:{}", GATEWAY_PORT),
            edition,
        },
    }
}

/// Read the installed edition from opentang-state.json.
fn read_edition(install_path: &str) -> Option<String> {
    let path = resolve_path(install_path).ok()?.join("opentang-state.json");
    let content = std::fs::read_to_string(&path).ok()?;
    let v: serde_json::Value = serde_json::from_str(&content).ok()?;
    v.get("edition")?.as_str().map(|s| s.to_string())
}

/// Send a chat message to the gateway.
/// Streams response chunks back via Tauri events:
///   "chat-chunk"  { text: "..." }   — one token/chunk
///   "chat-done"   {}                — stream complete
///   "chat-error"  "message"         — error occurred
#[tauri::command]
pub async fn chat_send(
    message: String,
    install_path: String,
    context: Option<String>,
    app: tauri::AppHandle,
) -> Result<(), String> {
    // Read secret — fail fast with clear message
    let secret = read_secret(&install_path)
        .map_err(|e| format!("Cannot authenticate to gateway: {e}"))?;

    // Find gateway URL
    let base_url = find_gateway_url().await
        .ok_or_else(|| "Gateway is not reachable. Make sure your AI agent is running.".to_string())?;

    // Build messages array — inject system context if provided
    let mut messages = vec![];

    if let Some(ctx) = &context {
        messages.push(serde_json::json!({
            "role": "system",
            "content": format!(
                "You are an AI assistant embedded in the OpenTang dashboard. \
                 You help users troubleshoot and manage their self-hosted infrastructure.\n\n\
                 Current system status:\n{ctx}"
            )
        }));
    }

    messages.push(serde_json::json!({
        "role": "user",
        "content": message
    }));

    let body = serde_json::json!({
        "model": "openclaw/default",
        "messages": messages,
        "stream": true
    });

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .build()
        .map_err(|e| format!("HTTP client error: {e}"))?;

    let response = client
        .post(format!("{}/v1/chat/completions", base_url))
        .header("Authorization", format!("Bearer {}", secret))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Gateway request failed: {e}"))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        let _ = app.emit("chat-error", format!("Gateway error {status}: {body}"));
        return Err(format!("Gateway returned {status}"));
    }

    // Stream SSE response
    use futures_util::StreamExt;
    let mut stream = response.bytes_stream();

    let mut buffer = String::new();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("Stream read error: {e}"))?;
        buffer.push_str(&String::from_utf8_lossy(&chunk));

        // Process complete SSE lines from buffer
        while let Some(newline_pos) = buffer.find('\n') {
            let line = buffer[..newline_pos].trim().to_string();
            buffer = buffer[newline_pos + 1..].to_string();

            if line.starts_with("data: ") {
                let data = &line["data: ".len()..];
                if data == "[DONE]" {
                    let _ = app.emit("chat-done", ());
                    return Ok(());
                }
                // Parse OpenAI delta chunk
                if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(data) {
                    if let Some(text) = parsed
                        .get("choices")
                        .and_then(|c| c.get(0))
                        .and_then(|c| c.get("delta"))
                        .and_then(|d| d.get("content"))
                        .and_then(|c| c.as_str())
                    {
                        if !text.is_empty() {
                            let _ = app.emit("chat-chunk", ChatChunk { text: text.to_string() });
                        }
                    }
                }
            }
        }
    }

    let _ = app.emit("chat-done", ());
    Ok(())
}

// ── Spock (bundled AI) commands ───────────────────────────────────────────────

// ── Spock (bundled AI) commands ───────────────────────────────────────────────

#[derive(Serialize, Clone)]
pub struct SpockAuthStatus {
    pub authenticated: bool,
    pub auth_type: Option<String>,
    pub account: Option<String>,
}

/// Check if Claude OAuth tokens exist (~/.claude/oauth_tokens.json).
#[tauri::command]
pub async fn spock_check_auth() -> SpockAuthStatus {
    let home = match dirs::home_dir() {
        Some(h) => h,
        None => return SpockAuthStatus { authenticated: false, auth_type: None, account: None },
    };
    let tokens_path = home.join(".claude").join("oauth_tokens.json");
    if !tokens_path.exists() {
        return SpockAuthStatus { authenticated: false, auth_type: None, account: None };
    }
    let auth_type = std::fs::read_to_string(&tokens_path)
        .ok()
        .and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok())
        .and_then(|v| v.get("subscription_type").and_then(|t| t.as_str()).map(|s| s.to_string()));
    SpockAuthStatus { authenticated: true, auth_type: auth_type.clone(), account: auth_type }
}

/// Open Claude login in the default browser.
/// User authenticates, then clicks "Check now" in OpenTang to verify.
#[tauri::command]
pub async fn spock_launch_login(console_mode: bool) -> Result<(), String> {
    let url = if console_mode {
        "https://platform.claude.com"
    } else {
        "https://claude.ai/login"
    };
    ::opener::open(url).map_err(|e| format!("Cannot open browser: {e}"))
}

/// Find the bundled Spock/Claude binary.
fn find_spock_binary() -> Result<String, String> {
    // 1. Bundled next to the Tauri executable
    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            for name in &["spock", "claude"] {
                let p = parent.join(name);
                if p.exists() { return Ok(p.to_string_lossy().to_string()); }
            }
        }
    }
    // 2. PATH
    for bin in &["spock", "claude"] {
        if let Ok(out) = std::process::Command::new("which").arg(bin).output() {
            if out.status.success() {
                let p = String::from_utf8_lossy(&out.stdout).trim().to_string();
                if !p.is_empty() { return Ok(p); }
            }
        }
    }
    // 3. Common locations (macOS Homebrew, Linux local)
    let mut candidates = vec![
        std::path::PathBuf::from("/usr/local/bin/claude"),
        std::path::PathBuf::from("/opt/homebrew/bin/claude"),
        std::path::PathBuf::from("/usr/local/bin/spock"),
        std::path::PathBuf::from("/opt/homebrew/bin/spock"),
    ];
    if let Some(home) = dirs::home_dir() {
        candidates.push(home.join(".local/bin/spock"));
        candidates.push(home.join(".local/bin/claude"));
        candidates.push(home.join(".nvm/versions/node/current/bin/claude"));
    }
    for path in &candidates {
        if path.exists() { return Ok(path.to_string_lossy().to_string()); }
    }
    Err("Claude AI binary not found. Connect your Claude account and restart OpenTang.".to_string())
}

/// Send a message to the bundled Spock/Claude binary in headless mode.
/// Streams response chunks via Tauri events: spock-chunk, spock-done, spock-error.
#[tauri::command]
pub async fn spock_send(
    message: String,
    context: Option<String>,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let bin = find_spock_binary()?;
    let prompt = if let Some(ctx) = &context {
        format!(
            "You are an AI assistant in the OpenTang dashboard. Help troubleshoot self-hosted infrastructure.\n\nSystem status:\n{}\n\nUser: {}",
            ctx, message
        )
    } else {
        message.clone()
    };
    let mut child = std::process::Command::new(&bin)
        .args(["-p", "--output-format", "stream-json", &prompt])
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::null())
        .spawn()
        .map_err(|e| format!("Failed to start AI: {e}"))?;
    let stdout = child.stdout.take().ok_or_else(|| "No stdout".to_string())?;
    use std::io::{BufRead, BufReader};
    for line in BufReader::new(stdout).lines() {
        let line = match line { Ok(l) => l, Err(_) => break };
        if line.trim().is_empty() { continue; }
        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&line) {
            match parsed.get("type").and_then(|t| t.as_str()) {
                Some("content") => {
                    if let Some(text) = parsed.get("text").and_then(|t| t.as_str()) {
                        let _ = app.emit("spock-chunk", ChatChunk { text: text.to_string() });
                    }
                }
                Some("result") => { let _ = app.emit("spock-done", ()); return Ok(()); }
                Some("error") => {
                    let msg = parsed.get("message").and_then(|m| m.as_str()).unwrap_or("Unknown error");
                    let _ = app.emit("spock-error", msg.to_string());
                    return Ok(());
                }
                _ => {}
            }
        }
    }
    let _ = child.wait();
    let _ = app.emit("spock-done", ());
    Ok(())
}
