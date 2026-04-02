//! OAuth 2.0 PKCE login flow for Claude subscription auth.
//!
//! Ported line-by-line from Spock (Koba42Corp/spock) oauth_flow.rs
//! which itself is a clean-room reimplementation of Claude Code's OAuthService.
//!
//! Flow:
//!   1. Generate PKCE code_verifier / code_challenge / state
//!   2. Bind a random localhost TCP port for the callback server
//!   3. Build auth URL and open in browser (macOS: open, Linux: xdg-open, Windows: PowerShell)
//!   4. Race: wait for browser redirect to localhost/callback OR timeout after 120s
//!   5. Exchange authorization code for tokens via POST to TOKEN_URL
//!   6. Save tokens to ~/.claude/oauth_tokens.json
//!   7. Emit spock-auth-complete or spock-auth-error via Tauri events

use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::io::{Read, Write};
use std::net::TcpListener;
use std::time::Duration;
use tauri::Emitter;
use uuid::Uuid;

// ── OAuth constants (from Spock cc_core::oauth) ───────────────────────────────

const CLIENT_ID: &str = "9d1c250a-e61b-44d9-88ed-5944d1962f5e";
const CONSOLE_AUTHORIZE_URL: &str = "https://platform.claude.com/oauth/authorize";
const CLAUDE_AI_AUTHORIZE_URL: &str = "https://claude.com/cai/oauth/authorize";
const TOKEN_URL: &str = "https://platform.claude.com/v1/oauth/token";
const API_KEY_URL: &str = "https://api.anthropic.com/api/oauth/claude_cli/create_api_key";
const CLAUDEAI_SUCCESS_URL: &str = "https://platform.claude.com/oauth/code/success?app=claude-code";

/// All OAuth scopes (union of Console + Claude.ai).
const ALL_SCOPES: &[&str] = &[
    "org:create_api_key",
    "user:profile",
    "user:inference",
    "user:sessions:claude_code",
];

const CLAUDE_AI_INFERENCE_SCOPE: &str = "user:inference";

// ── Token file structure ──────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct OAuthTokens {
    pub access_token: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub refresh_token: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expires_at_ms: Option<i64>,
    #[serde(default)]
    pub scopes: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub account_uuid: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub email: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub organization_uuid: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub subscription_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub api_key: Option<String>,
}

impl OAuthTokens {
    fn token_file_path() -> Option<std::path::PathBuf> {
        dirs::home_dir().map(|h| h.join(".claude").join("oauth_tokens.json"))
    }

    fn save(&self) -> Result<(), String> {
        let path = Self::token_file_path().ok_or("Cannot find home dir")?;
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let json = serde_json::to_string_pretty(self).map_err(|e| e.to_string())?;
        std::fs::write(&path, json).map_err(|e| e.to_string())
    }
}

// ── Token exchange response ───────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
struct TokenExchangeResponse {
    access_token: String,
    #[serde(default)]
    refresh_token: Option<String>,
    expires_in: u64,
    #[serde(default)]
    scope: Option<String>,
    #[serde(default)]
    account: Option<serde_json::Value>,
    #[serde(default)]
    organization: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
struct CreateApiKeyResponse {
    raw_key: Option<String>,
}

// ── PKCE helpers ──────────────────────────────────────────────────────────────

/// Generate a random 32-byte PKCE code verifier, base64url-encoded.
fn generate_code_verifier() -> String {
    let u1 = Uuid::new_v4();
    let u2 = Uuid::new_v4();
    let mut bytes = [0u8; 32];
    bytes[..16].copy_from_slice(u1.as_bytes());
    bytes[16..].copy_from_slice(u2.as_bytes());
    URL_SAFE_NO_PAD.encode(bytes)
}

/// Derive PKCE challenge: BASE64URL(SHA256(verifier)).
fn generate_code_challenge(verifier: &str) -> String {
    let hash = Sha256::digest(verifier.as_bytes());
    URL_SAFE_NO_PAD.encode(hash)
}

/// Generate a random OAuth state for CSRF protection.
fn generate_state() -> String {
    let u1 = Uuid::new_v4();
    let u2 = Uuid::new_v4();
    let mut bytes = [0u8; 32];
    bytes[..16].copy_from_slice(u1.as_bytes());
    bytes[16..].copy_from_slice(u2.as_bytes());
    URL_SAFE_NO_PAD.encode(bytes)
}

/// Build the OAuth authorization URL with all PKCE parameters.
fn build_auth_url(authorize_base: &str, code_challenge: &str, state: &str, port: u16) -> String {
    let redirect_uri = format!("http://localhost:{}/callback", port);
    format!(
        "{}?code=true&client_id={}&response_type=code&redirect_uri={}&scope={}&code_challenge={}&code_challenge_method=S256&state={}",
        authorize_base,
        urlencoding::encode(CLIENT_ID),
        urlencoding::encode(&redirect_uri),
        urlencoding::encode(&ALL_SCOPES.join(" ")),
        urlencoding::encode(code_challenge),
        urlencoding::encode(state),
    )
}

// ── Browser opener ────────────────────────────────────────────────────────────

fn open_browser(url: &str) {
    #[cfg(target_os = "macos")]
    {
        let _ = std::process::Command::new("open").arg(url)
            .stdin(std::process::Stdio::null())
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .spawn();
    }
    #[cfg(target_os = "windows")]
    {
        let ps_cmd = format!("Start-Process '{}'", url.replace('\'', "''"));
        let _ = std::process::Command::new("powershell")
            .args(["-NoProfile", "-NonInteractive", "-Command", &ps_cmd])
            .stdin(std::process::Stdio::null())
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .spawn();
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        let _ = std::process::Command::new("xdg-open").arg(url)
            .stdin(std::process::Stdio::null())
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .spawn();
    }
}

// ── Token exchange ────────────────────────────────────────────────────────────

fn exchange_code_for_tokens(
    code: &str,
    state: &str,
    code_verifier: &str,
    port: u16,
) -> Result<TokenExchangeResponse, String> {
    let redirect_uri = format!("http://localhost:{}/callback", port);
    let body = serde_json::json!({
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": redirect_uri,
        "client_id": CLIENT_ID,
        "code_verifier": code_verifier,
        "state": state,
    });

    let client = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client
        .post(TOKEN_URL)
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .map_err(|e| format!("Token exchange request failed: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().unwrap_or_default();
        return Err(format!("Token exchange failed ({status}): {text}"));
    }

    resp.json::<TokenExchangeResponse>()
        .map_err(|e| format!("Failed to parse token response: {e}"))
}

fn create_api_key(access_token: &str) -> Result<String, String> {
    let client = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client
        .post(API_KEY_URL)
        .header("Authorization", format!("Bearer {}", access_token))
        .send()
        .map_err(|e| format!("API key creation failed: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().unwrap_or_default();
        return Err(format!("API key creation failed ({status}): {text}"));
    }

    let data: CreateApiKeyResponse = resp.json()
        .map_err(|e| format!("Failed to parse API key response: {e}"))?;
    data.raw_key.ok_or_else(|| "Server returned no API key".to_string())
}

// ── Callback server ───────────────────────────────────────────────────────────

/// Listen on the bound TcpListener for exactly one HTTP GET /callback?code=...&state=...
/// Sends a 302 redirect to the Anthropic success page, returns the auth code.
fn wait_for_callback(listener: TcpListener, expected_state: &str) -> Result<String, String> {
    listener.set_nonblocking(false).ok();

    let (mut stream, _) = listener.accept()
        .map_err(|e| format!("Failed to accept OAuth callback: {e}"))?;

    // Read the HTTP request (first line is enough)
    let mut buf = [0u8; 4096];
    let n = stream.read(&mut buf).map_err(|e| e.to_string())?;
    let request = String::from_utf8_lossy(&buf[..n]);

    // Send 302 to the success page immediately so browser shows confirmation
    let response = format!(
        "HTTP/1.1 302 Found\r\nLocation: {}\r\nContent-Length: 0\r\nConnection: close\r\n\r\n",
        CLAUDEAI_SUCCESS_URL
    );
    stream.write_all(response.as_bytes()).ok();

    // Parse GET /callback?code=...&state=... from first line
    let path = request.lines().next()
        .and_then(|l| l.split_whitespace().nth(1))
        .unwrap_or("");

    let full_url = format!("http://localhost{}", path);
    let parsed = url::Url::parse(&full_url)
        .map_err(|e| format!("Failed to parse callback URL: {e}"))?;

    let code = parsed.query_pairs()
        .find(|(k, _)| k == "code")
        .map(|(_, v)| v.to_string());

    let recv_state = parsed.query_pairs()
        .find(|(k, _)| k == "state")
        .map(|(_, v)| v.to_string());

    if recv_state.as_deref() != Some(expected_state) {
        return Err("OAuth state mismatch — possible CSRF attack".to_string());
    }

    code.ok_or_else(|| "No authorization code in callback".to_string())
}

// ── Main Tauri command ────────────────────────────────────────────────────────

/// Run the full OAuth PKCE login flow.
/// Opens the browser, waits for the callback, exchanges the code, saves tokens.
/// Emits spock-auth-complete or spock-auth-error on the Tauri event bus.
#[tauri::command]
pub async fn spock_launch_login(console_mode: bool, app: tauri::AppHandle) -> Result<(), String> {
    let code_verifier = generate_code_verifier();
    let code_challenge = generate_code_challenge(&code_verifier);
    let state = generate_state();

    // Bind callback listener on a random port
    let listener = TcpListener::bind("127.0.0.1:0")
        .map_err(|e| format!("Cannot bind OAuth callback server: {e}"))?;
    let port = listener.local_addr()
        .map_err(|e| e.to_string())?.port();

    let authorize_base = if console_mode { CONSOLE_AUTHORIZE_URL } else { CLAUDE_AI_AUTHORIZE_URL };
    let auth_url = build_auth_url(authorize_base, &code_challenge, &state, port);

    // Open browser
    open_browser(&auth_url);
    let _ = app.emit("spock-auth-started", ());

    // Move everything to a background thread — blocking I/O
    let app2 = app.clone();
    let state2 = state.clone();
    let verifier2 = code_verifier.clone();

    std::thread::spawn(move || {
        // Set 120-second timeout on the socket
        listener.set_nonblocking(false).ok();
        if let Ok(std_listener) = listener.try_clone() {
            // Use a separate thread to enforce timeout
            let (tx, rx) = std::sync::mpsc::channel();
            let tx2 = tx.clone();
            let state2_cb = state2.clone();
            std::thread::spawn(move || {
                let result = wait_for_callback(std_listener, &state2_cb);
                let _ = tx.send(result);
            });

            match rx.recv_timeout(Duration::from_secs(120)) {
                Ok(Ok(code)) => {
                    // Exchange code for tokens
                    match exchange_code_for_tokens(&code, &state2, &verifier2, port) {
                        Ok(token_resp) => {
                            let now_ms = std::time::SystemTime::now()
                                .duration_since(std::time::UNIX_EPOCH)
                                .map(|d| d.as_millis() as i64)
                                .unwrap_or(0);
                            let expires_at_ms = now_ms + (token_resp.expires_in as i64 * 1000);
                            let scopes: Vec<String> = token_resp.scope
                                .as_deref().unwrap_or("")
                                .split_whitespace()
                                .map(String::from)
                                .collect();
                            let uses_bearer = scopes.iter().any(|s| s == CLAUDE_AI_INFERENCE_SCOPE);
                            let account_uuid = token_resp.account.as_ref()
                                .and_then(|a| a.get("uuid")?.as_str().map(String::from));
                            let email = token_resp.account.as_ref()
                                .and_then(|a| a.get("email_address")?.as_str().map(String::from));
                            let organization_uuid = token_resp.organization.as_ref()
                                .and_then(|o| o.get("uuid")?.as_str().map(String::from));

                            let api_key = if !uses_bearer {
                                create_api_key(&token_resp.access_token).ok()
                            } else { None };

                            let tokens = OAuthTokens {
                                access_token: token_resp.access_token.clone(),
                                refresh_token: token_resp.refresh_token.clone(),
                                expires_at_ms: Some(expires_at_ms),
                                scopes,
                                account_uuid,
                                email,
                                organization_uuid,
                                subscription_type: None,
                                api_key,
                            };

                            match tokens.save() {
                                Ok(_) => { let _ = app2.emit("spock-auth-complete", ()); }
                                Err(e) => { let _ = app2.emit("spock-auth-error", format!("Failed to save tokens: {e}")); }
                            }
                        }
                        Err(e) => { let _ = app2.emit("spock-auth-error", e); }
                    }
                }
                Ok(Err(e)) => { let _ = app2.emit("spock-auth-error", e); }
                Err(_) => { let _ = app2.emit("spock-auth-error", "Authentication timed out after 120 seconds".to_string()); }
            }
        } else {
            let _ = app2.emit("spock-auth-error", "Failed to start callback server".to_string());
        }
    });

    Ok(())
}
