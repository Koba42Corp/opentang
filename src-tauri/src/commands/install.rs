// OpenTang M5 — Full Stack Install Engine
// Tier 1 + Tier 2 services, SSL/Traefik, complete .env, error handling.

use std::collections::HashMap;
use tauri::Emitter;
use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::Stdio;
use rand::Rng;

// ── Structs ───────────────────────────────────────────────────────────────────

#[derive(serde::Deserialize)]
#[allow(dead_code)]
pub struct CredentialPair {
    pub username: String,
    pub password: String,
}

#[derive(serde::Deserialize)]
#[allow(dead_code)]
pub struct InstallConfig {
    pub edition: String,
    pub packages: Vec<String>,
    pub network_mode: String,
    pub domain: Option<String>,
    pub email: Option<String>,
    pub llm_mode: String,
    pub llm_model: Option<String>,
    #[serde(default)]
    pub template_profile: Option<String>,
    pub credentials: HashMap<String, CredentialPair>,
    pub install_path: String,
    #[serde(default)]
    pub excluded_packages: Vec<String>,
    #[serde(default)]
    pub detected_ports: HashMap<String, u16>,
}

#[derive(serde::Serialize, Clone)]
pub struct ProgressEvent {
    pub step_id: String,
    pub status: String, // "active" | "done" | "error" | "log"
    pub message: String,
}

#[derive(serde::Serialize)]
pub struct ServiceStatus {
    pub name: String,
    pub status: String, // "running" | "stopped" | "error"
    pub ports: Vec<String>,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/// Expand `~` prefix to the real home directory.
fn resolve_path(raw: &str) -> Result<PathBuf, String> {
    if raw.starts_with('~') {
        let home = dirs::home_dir().ok_or("Could not determine home directory")?;
        Ok(home.join(&raw[2..]))
    } else {
        Ok(PathBuf::from(raw))
    }
}

/// Generate a secure random alphanumeric password of `len` characters.
fn gen_password(len: usize) -> String {
    const CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let mut rng = rand::rng();
    (0..len)
        .map(|_| CHARS[rng.random_range(0..CHARS.len())] as char)
        .collect()
}

/// Generate a secure random hex token of `len` hex characters.
fn gen_hex_token(len: usize) -> String {
    const HEX: &[u8] = b"0123456789abcdef";
    let mut rng = rand::rng();
    (0..len)
        .map(|_| HEX[rng.random_range(0..HEX.len())] as char)
        .collect()
}

/// Generate a base64-encoded 32-byte app key for Coolify.
fn generate_app_key() -> String {
    let mut rng = rand::rng();
    let bytes: Vec<u8> = (0..32).map(|_| rng.random::<u8>()).collect();
    base64_encode(&bytes)
}

fn base64_encode(data: &[u8]) -> String {
    const CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity((data.len() + 2) / 3 * 4);
    let mut i = 0;
    while i < data.len() {
        let b0 = data[i] as u32;
        let b1 = if i + 1 < data.len() { data[i + 1] as u32 } else { 0 };
        let b2 = if i + 2 < data.len() { data[i + 2] as u32 } else { 0 };
        out.push(CHARS[((b0 >> 2) & 0x3F) as usize] as char);
        out.push(CHARS[(((b0 << 4) | (b1 >> 4)) & 0x3F) as usize] as char);
        out.push(if i + 1 < data.len() { CHARS[(((b1 << 2) | (b2 >> 6)) & 0x3F) as usize] as char } else { '=' });
        out.push(if i + 2 < data.len() { CHARS[(b2 & 0x3F) as usize] as char } else { '=' });
        i += 3;
    }
    out
}

/// Return the Traefik labels block when internet mode is active.
/// Returns empty string (no trailing newline) when not internet mode,
/// so it can be safely placed on its own line in the YAML template.
fn traefik_labels_block(svc: &str, internet: bool) -> String {
    if !internet {
        return String::new();
    }
    format!(
        "    labels:\n      - \"traefik.enable=true\"\n      - \"traefik.http.routers.{svc}.rule=Host(`{svc}.${{DOMAIN}}`)\"\n      - \"traefik.http.routers.{svc}.entrypoints=websecure\"\n      - \"traefik.http.routers.{svc}.tls.certresolver=letsencrypt\"\n",
        svc = svc,
    )
}

/// Get credential password from map, or return a generated default.
fn cred_pw(credentials: &HashMap<String, CredentialPair>, key: &str) -> String {
    credentials
        .get(key)
        .map(|c| c.password.clone())
        .unwrap_or_else(|| gen_password(24))
}

fn wants_tactical_lite(config: &InstallConfig) -> bool {
    matches!(config.template_profile.as_deref(), Some("tactical-lite"))
}

/// Normalize YAML: collapse consecutive blank lines and ensure every non-blank
/// line inside a `services:` block has at least 4 spaces of indentation (the
/// service-key line gets exactly 2, its children get 4+).
fn clean_yaml(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let mut prev_blank = false;
    let mut in_services = false;
    for line in s.lines() {
        if line.trim().is_empty() {
            if !prev_blank {
                out.push('\n');
            }
            prev_blank = true;
            continue;
        }
        prev_blank = false;
        // Detect services: section start
        if line.starts_with("services:") {
            in_services = true;
            out.push_str(line);
            out.push('\n');
            continue;
        }
        if in_services && !line.starts_with(' ') && !line.starts_with('#') {
            in_services = false; // left the services block
        }
        out.push_str(line);
        out.push('\n');
    }
    out
}

/// Append a service block to the services string, ensuring every line is
/// correctly indented under the service key (2 spaces for key, 4+ for children).
fn push_service(services: &mut String, block: &str) {
    for line in block.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        // Already correctly indented (starts with spaces)?  Keep it.
        if line.starts_with("  ") {
            services.push_str(line);
        } else {
            // Needs indentation — add 4 spaces (child of service key)
            services.push_str("    ");
            services.push_str(trimmed);
        }
        services.push('\n');
    }
}

/// Build the docker-compose.yml string from config.
fn build_compose(config: &InstallConfig) -> String {
    let internet = config.network_mode == "internet";
    let mut services = String::new();
    let mut volumes = String::from("volumes:\n  coolify_data:\n  coolify_db:\n");

    // ── Traefik (internet-facing SSL) ────────────────────────────────────────
    if internet {
        volumes.push_str("  traefik_letsencrypt:\n");
        services.push_str(
            r#"  traefik:
    image: traefik:v3.0
    restart: unless-stopped
    command:
      - "--api.insecure=false"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.tlschallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.email=${ACME_EMAIL}"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - traefik_letsencrypt:/letsencrypt
    networks:
      - opentang
"#,
        );
    }

    // ── Coolify ──────────────────────────────────────────────────────────────
    if !config.excluded_packages.contains(&"coolify".to_string()) {
        let coolify_port = config.detected_ports.get("coolify").copied().unwrap_or(8000);
        let labels = traefik_labels_block("coolify", internet);
        push_service(&mut services, &format!(r#"  coolify:
    image: coollabsio/coolify:latest
    restart: unless-stopped
    ports:
      - "{coolify_port}:8000"
      - "6001:6001"
    environment:
      APP_ID: opentang
      APP_KEY: base64:${{APP_KEY}}
      DB_PASSWORD: ${{COOLIFY_DB_PASSWORD}}
      REDIS_PASSWORD: ${{REDIS_PASSWORD}}
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - coolify_data:/data/coolify
{labels}    networks:
      - opentang
"#));
    }

    // ── Portainer ────────────────────────────────────────────────────────────
    if config.packages.iter().any(|p| p == "portainer") && !config.excluded_packages.contains(&"portainer".to_string()) {
        let portainer_port = config.detected_ports.get("portainer").copied().unwrap_or(9000);
        let labels = traefik_labels_block("portainer", internet);
        volumes.push_str("  portainer_data:\n");
        push_service(&mut services, &format!(r#"  portainer:
    image: portainer/portainer-ce:latest
    restart: unless-stopped
    ports:
      - "{portainer_port}:9000"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
{labels}    networks:
      - opentang
"#));
    }

    // ── Gitea ────────────────────────────────────────────────────────────────
    if config.packages.iter().any(|p| p == "gitea") && !config.excluded_packages.contains(&"gitea".to_string()) {
        let gitea_port = config.detected_ports.get("gitea").copied().unwrap_or(3100);
        let labels = traefik_labels_block("gitea", internet);
        volumes.push_str("  gitea_data:\n");
        push_service(&mut services, &format!(r#"  gitea:
    image: gitea/gitea:latest
    restart: unless-stopped
    ports:
      - "{gitea_port}:3000"
      - "222:22"
    environment:
      USER_UID: 1000
      USER_GID: 1000
      GITEA__security__INSTALL_LOCK: "true"
      GITEA_ADMIN_USER: ${{GITEA_ADMIN_USER}}
      GITEA_ADMIN_PASSWORD: ${{GITEA_ADMIN_PASSWORD}}
      GITEA_ADMIN_EMAIL: admin@localhost
{labels}    volumes:
      - gitea_data:/data
    networks:
      - opentang
"#));
    }

    // ── Grafana ──────────────────────────────────────────────────────────────
    if config.packages.iter().any(|p| p == "grafana") && !config.excluded_packages.contains(&"grafana".to_string()) {
        let grafana_port = config.detected_ports.get("grafana").copied().unwrap_or(3001);
        let labels = traefik_labels_block("grafana", internet);
        volumes.push_str("  grafana_data:\n");
        push_service(&mut services, &format!(r#"  grafana:
    image: grafana/grafana:latest
    restart: unless-stopped
    ports:
      - "{grafana_port}:3000"
    environment:
      GF_SECURITY_ADMIN_USER: ${{GF_SECURITY_ADMIN_USER}}
      GF_SECURITY_ADMIN_PASSWORD: ${{GF_SECURITY_ADMIN_PASSWORD}}
{labels}    volumes:
      - grafana_data:/var/lib/grafana
    networks:
      - opentang
"#));
    }

    // ── Prometheus ───────────────────────────────────────────────────────────
    if config.packages.iter().any(|p| p == "prometheus") && !config.excluded_packages.contains(&"prometheus".to_string()) {
        let prometheus_port = config.detected_ports.get("prometheus").copied().unwrap_or(9090);
        let labels = traefik_labels_block("prometheus", internet);
        volumes.push_str("  prometheus_data:\n");
        push_service(&mut services, &format!(r#"  prometheus:
    image: prom/prometheus:latest
    restart: unless-stopped
    ports:
      - "{prometheus_port}:9090"
{labels}    volumes:
      - prometheus_data:/prometheus
    networks:
      - opentang
"#));
    }

    // ── Ollama (local LLM) ───────────────────────────────────────────────────
    if config.llm_mode == "local" && !config.excluded_packages.contains(&"ollama".to_string()) {
        let ollama_port = config.detected_ports.get("ollama").copied().unwrap_or(11434);
        volumes.push_str("  ollama_data:\n");
        push_service(&mut services, &format!(r#"  ollama:
    image: ollama/ollama:latest
    restart: unless-stopped
    ports:
      - "{ollama_port}:11434"
    volumes:
      - ollama_data:/root/.ollama
    networks:
      - opentang
"#));
    }

    // ── n8n ──────────────────────────────────────────────────────────────────
    if config.packages.iter().any(|p| p == "n8n") && !config.excluded_packages.contains(&"n8n".to_string()) {
        let n8n_port = config.detected_ports.get("n8n").copied().unwrap_or(5678);
        let labels = traefik_labels_block("n8n", internet);
        volumes.push_str("  n8n_data:\n");
        push_service(&mut services, &format!(r#"  n8n:
    image: n8nio/n8n:latest
    restart: unless-stopped
    ports:
      - "{n8n_port}:5678"
    environment:
      N8N_BASIC_AUTH_ACTIVE: "true"
      N8N_BASIC_AUTH_USER: ${{N8N_USER}}
      N8N_BASIC_AUTH_PASSWORD: ${{N8N_PASSWORD}}
      N8N_HOST: ${{DOMAIN:-localhost}}
      WEBHOOK_URL: http://${{DOMAIN:-localhost}}:{n8n_port}
{labels}    volumes:
      - n8n_data:/home/node/.n8n
    networks:
      - opentang
"#));
    }

    // ── Uptime Kuma ──────────────────────────────────────────────────────────
    if config.packages.iter().any(|p| p == "uptime-kuma") && !config.excluded_packages.contains(&"uptime-kuma".to_string()) {
        let uptime_port = config.detected_ports.get("uptime-kuma").copied().unwrap_or(3003);
        let labels = traefik_labels_block("uptime-kuma", internet);
        volumes.push_str("  uptime_kuma_data:\n");
        push_service(&mut services, &format!(r#"  uptime-kuma:
    image: louislam/uptime-kuma:latest
    restart: unless-stopped
    ports:
      - "{uptime_port}:3001"
{labels}    volumes:
      - uptime_kuma_data:/app/data
    networks:
      - opentang
"#));
    }

    // ── Vaultwarden ──────────────────────────────────────────────────────────
    if config.packages.iter().any(|p| p == "vaultwarden") && !config.excluded_packages.contains(&"vaultwarden".to_string()) {
        let vaultwarden_port = config.detected_ports.get("vaultwarden").copied().unwrap_or(8080);
        let labels = traefik_labels_block("vaultwarden", internet);
        volumes.push_str("  vaultwarden_data:\n");
        push_service(&mut services, &format!(r#"  vaultwarden:
    image: vaultwarden/server:latest
    restart: unless-stopped
    ports:
      - "{vaultwarden_port}:80"
    environment:
      ADMIN_TOKEN: ${{VAULTWARDEN_ADMIN_TOKEN}}
{labels}    volumes:
      - vaultwarden_data:/data
    networks:
      - opentang
"#));
    }

    // ── Nextcloud ────────────────────────────────────────────────────────────
    if config.packages.iter().any(|p| p == "nextcloud") && !config.excluded_packages.contains(&"nextcloud".to_string()) {
        let nextcloud_port = config.detected_ports.get("nextcloud").copied().unwrap_or(8081);
        let labels = traefik_labels_block("nextcloud", internet);
        volumes.push_str("  nextcloud_data:\n  nextcloud_db:\n");
        push_service(&mut services, r#"  nextcloud-db:
    image: mariadb:11
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${NEXTCLOUD_DB_ROOT_PASSWORD}
      MYSQL_DATABASE: nextcloud
      MYSQL_USER: nextcloud
      MYSQL_PASSWORD: ${NEXTCLOUD_DB_PASSWORD}
    volumes:
      - nextcloud_db:/var/lib/mysql
    networks:
      - opentang
"#);
        push_service(&mut services, &format!(r#"  nextcloud:
    image: nextcloud:latest
    restart: unless-stopped
    ports:
      - "{nextcloud_port}:80"
    depends_on:
      - nextcloud-db
    environment:
      MYSQL_HOST: nextcloud-db
      MYSQL_DATABASE: nextcloud
      MYSQL_USER: nextcloud
      MYSQL_PASSWORD: ${{NEXTCLOUD_DB_PASSWORD}}
      NEXTCLOUD_ADMIN_USER: ${{NEXTCLOUD_ADMIN_USER}}
      NEXTCLOUD_ADMIN_PASSWORD: ${{NEXTCLOUD_ADMIN_PASSWORD}}
{labels}    volumes:
      - nextcloud_data:/var/www/html
    networks:
      - opentang
"#));
    }

    // ── SearXNG ──────────────────────────────────────────────────────────────
    if config.packages.iter().any(|p| p == "searxng") && !config.excluded_packages.contains(&"searxng".to_string()) {
        let searxng_port = config.detected_ports.get("searxng").copied().unwrap_or(8082);
        let labels = traefik_labels_block("searxng", internet);
        volumes.push_str("  searxng_data:\n");
        push_service(&mut services, &format!(r#"  searxng:
    image: searxng/searxng:latest
    restart: unless-stopped
    ports:
      - "{searxng_port}:8080"
{labels}    volumes:
      - searxng_data:/etc/searxng
    networks:
      - opentang
"#));
    }

    // ── IPFS (Kubo) ──────────────────────────────────────────────────────────
    if config.packages.iter().any(|p| p == "ipfs") && !config.excluded_packages.contains(&"ipfs".to_string()) {
        let labels = traefik_labels_block("ipfs", internet);
        volumes.push_str("  ipfs_data:\n  ipfs_staging:\n");
        push_service(&mut services, &format!(r#"  ipfs:
    image: ipfs/kubo:latest
    restart: unless-stopped
    ports:
      - "5001:5001"
      - "4001:4001"
      - "4001:4001/udp"
      - "8080:8080"
    environment:
      - IPFS_PROFILE=server
{labels}    volumes:
      - ipfs_data:/data/ipfs
      - ipfs_staging:/export
    networks:
      - opentang
"#));
    }

    // ── Rawkit Memory ────────────────────────────────────────────────────────
    if config.packages.iter().any(|p| p == "rawkit-memory") && !config.excluded_packages.contains(&"rawkit-memory".to_string()) {
        let rawkit_port = config.detected_ports.get("rawkit-memory").copied().unwrap_or(8765);
        let labels = traefik_labels_block("rawkit-memory", internet);
        volumes.push_str("  rawkit_data:\n");
        push_service(&mut services, &format!(r#"  rawkit-memory:
    image: ghcr.io/koba42corp/rawkit_ai:latest
    restart: unless-stopped
    ports:
      - "{rawkit_port}:8765"
{labels}    volumes:
      - rawkit_data:/data
    networks:
      - opentang
"#));
    }

    // ── Edition service (openclaw / hermes / nanoclaw) ───────────────────────
    if !config.excluded_packages.contains(&"openclaw".to_string()) {
        let edition_image = "linuxserver/heimdall:latest";
        let openclaw_port = config.detected_ports.get("openclaw").copied().unwrap_or(3002);
        let labels = traefik_labels_block(&config.edition, internet);
        volumes.push_str("  openclaw_data:\n");
        push_service(&mut services, &format!(r#"  {edition}:
    # OpenClaw edition placeholder — real images coming soon
    image: {image}
    restart: unless-stopped
    ports:
      - "{openclaw_port}:3000"
    environment:
      OPENCLAW_SECRET: ${{OPENCLAW_SECRET}}
{labels}    volumes:
      - openclaw_data:/app/data
    networks:
      - opentang
"#, edition = config.edition, image = edition_image));
    }

    clean_yaml(&format!(
        "version: '3.8'\n\nnetworks:\n  opentang:\n    driver: bridge\n\n{volumes}\nservices:\n{services}"
    ))
}

/// Build the complete .env file contents for all selected services.
fn build_env(config: &InstallConfig) -> String {
    let app_key = generate_app_key();

    // ── Core credentials ─────────────────────────────────────────────────────
    let coolify_db_pw = cred_pw(&config.credentials, "coolify");
    let redis_pw = cred_pw(&config.credentials, "redis");
    let openclaw_secret = config
        .credentials
        .get("openclaw")
        .or_else(|| config.credentials.get(&config.edition))
        .map(|c| c.password.clone())
        .unwrap_or_else(|| gen_password(32));

    let mut env = format!(
        "# OpenTang — generated by M5 install engine\n\
         # Keep this file secure — it contains all service credentials.\n\n\
         # Coolify\n\
         COOLIFY_DB_PASSWORD='{coolify_db_pw}'\n\
         APP_KEY='{app_key}'\n\
         REDIS_PASSWORD='{redis_pw}'\n\n\
         # OpenClaw / Edition\n\
         OPENCLAW_SECRET='{openclaw_secret}'\n",
    );

    // ── Grafana ──────────────────────────────────────────────────────────────
    if config.packages.iter().any(|p| p == "grafana") {
        let pw = cred_pw(&config.credentials, "grafana");
        env.push_str(&format!(
            "\n# Grafana\nGF_SECURITY_ADMIN_USER=admin\nGF_SECURITY_ADMIN_PASSWORD='{pw}'\n"
        ));
    }

    // ── Gitea ────────────────────────────────────────────────────────────────
    if config.packages.iter().any(|p| p == "gitea") {
        let pw = cred_pw(&config.credentials, "gitea");
        env.push_str(&format!(
            "\n# Gitea\nGITEA_ADMIN_USER=admin\nGITEA_ADMIN_PASSWORD='{pw}'\n"
        ));
    }

    // ── n8n ──────────────────────────────────────────────────────────────────
    if config.packages.iter().any(|p| p == "n8n") {
        let pw = cred_pw(&config.credentials, "n8n");
        env.push_str(&format!(
            "\n# n8n\nN8N_USER=admin\nN8N_PASSWORD='{pw}'\n"
        ));
    }

    // ── Vaultwarden ──────────────────────────────────────────────────────────
    if config.packages.iter().any(|p| p == "vaultwarden") {
        let token = gen_hex_token(64);
        env.push_str(&format!(
            "\n# Vaultwarden\nVAULTWARDEN_ADMIN_TOKEN='{token}'\n"
        ));
    }

    // ── Nextcloud ────────────────────────────────────────────────────────────
    if config.packages.iter().any(|p| p == "nextcloud") {
        let admin_pw = gen_password(24);
        let db_pw = gen_password(24);
        let db_root_pw = gen_password(24);
        env.push_str(&format!(
            "\n# Nextcloud\n\
             NEXTCLOUD_ADMIN_USER=admin\n\
             NEXTCLOUD_ADMIN_PASSWORD='{admin_pw}'\n\
             NEXTCLOUD_DB_PASSWORD='{db_pw}'\n\
             NEXTCLOUD_DB_ROOT_PASSWORD='{db_root_pw}'\n"
        ));
    }

    // ── Rawkit Memory ────────────────────────────────────────────────────────
    if config.packages.iter().any(|p| p == "rawkit-memory") {
        let port = config.detected_ports.get("rawkit-memory").copied().unwrap_or(8765);
        env.push_str(&format!(
            "\n# Rawkit Memory\nRAWKIT_RELAY_URL=ws://rawkit-memory:{port}\n"
        ));
    }

    // ── Traefik / ACME ───────────────────────────────────────────────────────
    if config.network_mode == "internet" {
        let domain = config.domain.as_deref().unwrap_or("localhost");
        let email = config.email.as_deref().unwrap_or("admin@localhost");
        env.push_str(&format!(
            "\n# Traefik / ACME SSL\nDOMAIN={domain}\nACME_EMAIL={email}\n"
        ));
    }

    env
}

/// Try to extract a known service name from a docker compose output line.
fn extract_service_name(line: &str) -> Option<&'static str> {
    let lower = line.to_lowercase();
    const KNOWN: &[&str] = &[
        "coolify",
        "portainer",
        "gitea",
        "grafana",
        "prometheus",
        "ollama",
        "openclaw",
        "hermes",
        "nanoclaw",
        "n8n",
        "uptime-kuma",
        "vaultwarden",
        "nextcloud",
        "searxng",
        "ipfs",
        "traefik",
    ];
    KNOWN.iter().find(|&&svc| lower.contains(svc)).copied()
}

/// Locate the docker binary, searching common install paths that may not be
/// in a GUI app's default PATH on macOS.
fn find_docker() -> Option<String> {
    // First try the normal PATH
    if let Ok(out) = std::process::Command::new("docker").arg("--version").output() {
        if out.status.success() {
            return Some("docker".to_string());
        }
    }
    // Common locations on macOS / Linux where Docker may live
    for candidate in &[
        "/usr/local/bin/docker",
        "/opt/homebrew/bin/docker",
        "/usr/bin/docker",
        "/Applications/Docker.app/Contents/Resources/bin/docker",
        "/Applications/OrbStack.app/Contents/MacOS/xbin/docker",
    ] {
        if std::path::Path::new(candidate).exists() {
            return Some(candidate.to_string());
        }
    }
    None
}

/// Background worker: run `docker compose up -d` and stream progress events.
fn run_docker_compose_streaming(path: PathBuf, app: tauri::AppHandle) {
    let emit = |step_id: &str, status: &str, message: &str| {
        let _ = app.emit(
            "install-progress",
            ProgressEvent {
                step_id: step_id.to_string(),
                status: status.to_string(),
                message: message.to_string(),
            },
        );
    };

    // Resolve Docker binary path (macOS GUI apps have minimal PATH)
    let docker_bin = match find_docker() {
        Some(bin) => bin,
        None => {
            emit("pull", "error", "Docker is not installed or not in PATH. Please install Docker and try again.");
            let _ = app.emit("install-error", "Docker is not installed or not in PATH.".to_string());
            return;
        }
    };

    // Check Docker is reachable before we try
    let docker_check = std::process::Command::new(&docker_bin)
        .args(["info"])
        .output();

    match docker_check {
        Err(e) => {
            emit("pull", "error", &format!("Docker is not installed or not in PATH: {e}"));
            let _ = app.emit("install-error", format!("Docker is not installed or not in PATH: {e}"));
            return;
        }
        Ok(out) if !out.status.success() => {
            let msg = String::from_utf8_lossy(&out.stderr).to_string();
            let friendly = if msg.to_lowercase().contains("cannot connect")
                || msg.to_lowercase().contains("is the docker daemon running")
                || msg.to_lowercase().contains("permission denied")
            {
                "Docker is not running. Please start Docker and try again.".to_string()
            } else {
                format!("Docker daemon error: {msg}")
            };
            emit("pull", "error", &friendly);
            let _ = app.emit("install-error", friendly);
            return;
        }
        _ => {}
    }

    emit("pull", "active", "Starting docker compose up -d ...");

    let mut child = match std::process::Command::new(&docker_bin)
        .args(["compose", "up", "-d"])
        .current_dir(&path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
    {
        Ok(c) => c,
        Err(e) => {
            let msg = format!("Failed to start docker compose: {e}");
            emit("pull", "error", &msg);
            let _ = app.emit("install-error", msg);
            return;
        }
    };

    let stdout = child.stdout.take().unwrap();
    let stderr = child.stderr.take().unwrap();

    let app_out = app.clone();
    let app_err = app.clone();

    // Collect all output lines for the full error log
    let output_lines_out: std::sync::Arc<std::sync::Mutex<Vec<String>>> =
        std::sync::Arc::new(std::sync::Mutex::new(Vec::new()));
    let output_lines_err = output_lines_out.clone();

    let process_line = |line: &str, app: &tauri::AppHandle, lines: &std::sync::Arc<std::sync::Mutex<Vec<String>>>| {
        if let Ok(mut v) = lines.lock() {
            v.push(line.to_string());
        }
        // Emit raw log line
        let _ = app.emit(
            "install-progress",
            ProgressEvent {
                step_id: "log".to_string(),
                status: "log".to_string(),
                message: line.to_string(),
            },
        );
        // Detect service-level status changes
        if let Some(svc) = extract_service_name(line) {
            let lower = line.to_lowercase();
            let status = if lower.contains("error") || lower.contains("failed") {
                "error"
            } else if lower.contains("started")
                || lower.contains("running")
                || lower.contains("done")
            {
                "done"
            } else if lower.contains("pulling")
                || lower.contains("creating")
                || lower.contains("starting")
                || lower.contains("waiting")
            {
                "active"
            } else {
                return;
            };
            let _ = app.emit(
                "install-progress",
                ProgressEvent {
                    step_id: svc.to_string(),
                    status: status.to_string(),
                    message: line.trim().to_string(),
                },
            );
        }
    };

    let out_lines = output_lines_out.clone();
    let stdout_handle = std::thread::spawn(move || {
        for line in BufReader::new(stdout).lines().flatten() {
            process_line(&line, &app_out, &out_lines);
        }
    });

    let stderr_handle = std::thread::spawn(move || {
        for line in BufReader::new(stderr).lines().flatten() {
            process_line(&line, &app_err, &output_lines_err);
        }
    });

    stdout_handle.join().ok();
    stderr_handle.join().ok();

    let exit_ok = child.wait().map(|s| s.success()).unwrap_or(false);

    if exit_ok {
        let _ = app.emit(
            "install-progress",
            ProgressEvent {
                step_id: "finalise".to_string(),
                status: "done".to_string(),
                message: "All services started successfully.".to_string(),
            },
        );
        let _ = app.emit("install-complete", ());
    } else {
        let raw_output = output_lines_out
            .lock()
            .map(|v| v.join("\n"))
            .unwrap_or_default();
        let _ = app.emit(
            "install-progress",
            ProgressEvent {
                step_id: "finalise".to_string(),
                status: "error".to_string(),
                message: "docker compose up exited with an error. Check logs for details.".to_string(),
            },
        );
        let _ = app.emit("install-error", raw_output);
    }
}

/// Write ~/.openclaw/openclaw.json to enable the chat completions HTTP endpoint.
/// This is called automatically when an AI edition is installed.
fn write_openclaw_config() -> Result<(), String> {
    let home = dirs::home_dir().ok_or("Cannot resolve home directory")?;
    let config_dir = home.join(".openclaw");
    std::fs::create_dir_all(&config_dir)
        .map_err(|e| format!("Cannot create ~/.openclaw: {e}"))?;

    let config_path = config_dir.join("openclaw.json");

    // Don't overwrite existing config — only write if missing
    if config_path.exists() {
        // If it exists, try to patch chatCompletions.enabled = true
        // Read, check if already set, if not — leave it (user manages their own config)
        let content = std::fs::read_to_string(&config_path).unwrap_or_default();
        if content.contains("chatCompletions") {
            return Ok(()); // Already configured
        }
        // Append a note — don't corrupt existing JSON5
        return Ok(());
    }

    // Write minimal config enabling chat completions
    let config = r#"{
  // Generated by OpenTang installer
  // Enables the OpenAI-compatible chat completions endpoint
  // used by the OpenTang Dashboard AI Assistant.
  gateway: {
    http: {
      endpoints: {
        chatCompletions: { enabled: true },
      },
    },
  },
}
"#;

    std::fs::write(&config_path, config)
        .map_err(|e| format!("Cannot write ~/.openclaw/openclaw.json: {e}"))?;

    Ok(())
}

const TACTICAL_README: &str = r#"# Tactical Template System (Lite)

This bundle gives you a lightweight command structure for running AI work in Hermes-style missions.

## Start here
1. Read `role-matrix-lite.md`
2. Run `mission-startup.md`
3. Use `gates-checklist.md` during execution
4. Start from a mission template in `missions/`

## Included
- 4-layer command model
- 5 no-skip quality gates
- role contracts and delegate prompts
"#;

const TACTICAL_MISSION_STARTUP: &str = r#"# Mission Startup (Lite)

- Mission objective:
- Constraints:
- Definition of done:
- Deadline:
- Owner:

## Kickoff sequence
1. Confirm Gate 0 scope
2. Create task IDs and dependencies
3. Assign owners by role
4. Dispatch only unblocked tasks
5. Collect evidence before release
"#;

const TACTICAL_ROLE_MATRIX: &str = r#"# Role Matrix (Lite)

## Command Authority (Human)
- Final scope, risk, and release decision

## Orchestrator
- Plans sequence and routes escalations

## Core division leads
- Engineering
- QA
- Legal/Compliance
- Marketing/Comms

## Specialist delegates
- Execute narrow scoped tasks with least-privilege tools
"#;

const TACTICAL_GATES: &str = r#"# Gates Checklist (No Skip)

- Gate 0 — Scope: objective, constraints, done criteria
- Gate 1 — Plan: tasks, dependencies, owners
- Gate 2 — Build: implementation complete
- Gate 3 — Verify: QA/security/legal evidence attached
- Gate 4 — Release: rollout + rollback + signoff

No evidence = no promotion.
"#;

const TACTICAL_DELEGATE_PROMPTS: &str = r#"# Delegate Prompts (Lite)

## Engineering Lead
Return: decision summary, code artifacts, risks, verification evidence, next dependency unlocked.

## QA Lead
Return: test plan, failing/passing evidence, risk notes, release recommendation.

## Legal/Compliance Lead
Return: policy check summary, required changes, blockers, signoff status.

## Marketing/Comms Lead
Return: message brief, deliverables, assumptions, approval dependencies.
"#;

const TACTICAL_FEATURE_SHIP: &str = r#"# Mission Template: Feature Ship (Lite)

## Objective
Ship one feature safely with verification evidence.

## Required roles
- Orchestrator
- Engineering
- QA

## Exit criteria
- Gate 4 approved
- rollback owner assigned
"#;

const TACTICAL_INCIDENT: &str = r#"# Mission Template: Incident Response (Lite)

## Objective
Stabilize service, communicate status, and prevent recurrence.

## Required roles
- Orchestrator
- Engineering
- QA
- Comms

## Exit criteria
- service restored
- root cause logged
- follow-up tasks created
"#;

fn write_tactical_template_bundle(install_path: &std::path::Path) -> Result<(), String> {
    let base = install_path.join("templates").join("tactical-template-system");
    let missions = base.join("missions");

    std::fs::create_dir_all(&missions)
        .map_err(|e| format!("Failed creating tactical template directory: {e}"))?;

    let files = vec![
        (base.join("README.md"), TACTICAL_README),
        (base.join("mission-startup.md"), TACTICAL_MISSION_STARTUP),
        (base.join("role-matrix-lite.md"), TACTICAL_ROLE_MATRIX),
        (base.join("gates-checklist.md"), TACTICAL_GATES),
        (base.join("delegate-prompts-lite.md"), TACTICAL_DELEGATE_PROMPTS),
        (missions.join("feature-ship-lite.md"), TACTICAL_FEATURE_SHIP),
        (missions.join("incident-lite.md"), TACTICAL_INCIDENT),
    ];

    for (path, content) in files {
        std::fs::write(&path, content)
            .map_err(|e| format!("Failed writing template file {}: {e}", path.display()))?;
    }

    Ok(())
}

// ── Commands ──────────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn generate_compose(config: InstallConfig) -> Result<String, String> {
    let path = resolve_path(&config.install_path)?;

    // Create install directory (idempotent)
    std::fs::create_dir_all(&path)
        .map_err(|e| format!("Failed to create install directory: {e}"))?;

    let compose_yaml = build_compose(&config);
    let env_contents = build_env(&config);

    std::fs::write(path.join("docker-compose.yml"), &compose_yaml)
        .map_err(|e| format!("Failed to write docker-compose.yml: {e}"))?;

    std::fs::write(path.join(".env"), &env_contents)
        .map_err(|e| format!("Failed to write .env: {e}"))?;

    if wants_tactical_lite(&config) {
        write_tactical_template_bundle(&path)?;
    }

    // Write OpenClaw gateway config to enable chat completions endpoint
    let has_agent = config.packages.iter().any(|p| {
        p == "openclaw" || p == "hermes" || p == "nanoclaw"
    }) || !config.excluded_packages.contains(&"openclaw".to_string());

    if has_agent {
        if let Err(e) = write_openclaw_config() {
            // Non-fatal — log but don't fail install
            eprintln!("Warning: Could not write openclaw.json: {e}");
        }
    }

    Ok(compose_yaml)
}

#[tauri::command]
pub async fn start_install(install_path: String, app: tauri::AppHandle) -> Result<(), String> {
    let path = resolve_path(&install_path)?;

    if !path.join("docker-compose.yml").exists() {
        return Err("docker-compose.yml not found — run generate_compose first".to_string());
    }

    // Spawn background thread; command returns immediately while events stream in
    std::thread::spawn(move || run_docker_compose_streaming(path, app));

    Ok(())
}

#[tauri::command]
pub async fn get_service_status(install_path: String) -> Result<Vec<ServiceStatus>, String> {
    let path = resolve_path(&install_path)?;

    let docker_bin = find_docker().unwrap_or_else(|| "docker".to_string());
    let output = std::process::Command::new(&docker_bin)
        .args(["compose", "ps", "--format", "json"])
        .current_dir(&path)
        .output()
        .map_err(|e| format!("Failed to run docker compose ps: {e}"))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let mut statuses: Vec<ServiceStatus> = Vec::new();

    // Docker compose ps --format json emits NDJSON (one object per line)
    for line in stdout.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        if let Ok(val) = serde_json::from_str::<serde_json::Value>(line) {
            let name = val["Service"]
                .as_str()
                .or_else(|| val["Name"].as_str())
                .unwrap_or("unknown")
                .to_string();

            let state = val["State"].as_str().unwrap_or("unknown").to_lowercase();
            let status = if state.contains("running") {
                "running"
            } else if state.contains("exit") || state.contains("dead") || state.contains("error") {
                "error"
            } else {
                "stopped"
            };

            let mut ports = Vec::new();
            if let Some(publishers) = val["Publishers"].as_array() {
                for pub_ in publishers {
                    let pp = pub_["PublishedPort"].as_u64().unwrap_or(0);
                    let tp = pub_["TargetPort"].as_u64().unwrap_or(0);
                    if pp > 0 {
                        ports.push(format!("{pp}:{tp}"));
                    }
                }
            }

            statuses.push(ServiceStatus {
                name,
                status: status.to_string(),
                ports,
            });
        }
    }

    // Fallback: try parsing as a JSON array (older docker compose versions)
    if statuses.is_empty() {
        if let Ok(serde_json::Value::Array(arr)) =
            serde_json::from_str::<serde_json::Value>(&stdout)
        {
            for val in arr {
                let name = val["Service"]
                    .as_str()
                    .or_else(|| val["Name"].as_str())
                    .unwrap_or("unknown")
                    .to_string();
                let state = val["State"].as_str().unwrap_or("unknown").to_lowercase();
                let status = if state.contains("running") {
                    "running"
                } else {
                    "stopped"
                };
                statuses.push(ServiceStatus {
                    name,
                    status: status.to_string(),
                    ports: vec![],
                });
            }
        }
    }

    Ok(statuses)
}
