// OpenTang M4 — Real Docker Compose install engine

use std::collections::HashMap;
use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::process::Stdio;

// ── Structs ──────────────────────────────────────────────────────────────────

#[derive(serde::Deserialize)]
pub struct CredentialPair {
    pub username: String,
    pub password: String,
}

#[derive(serde::Deserialize)]
pub struct InstallConfig {
    pub edition: String,
    pub packages: Vec<String>,
    pub network_mode: String,
    pub domain: Option<String>,
    pub email: Option<String>,
    pub llm_mode: String,
    pub llm_model: Option<String>,
    pub credentials: HashMap<String, CredentialPair>,
    pub install_path: String,
}

#[derive(serde::Serialize, Clone)]
pub struct ProgressEvent {
    pub step_id: String,
    pub status: String, // "active" | "done" | "error"
    pub message: String,
}

#[derive(serde::Serialize)]
pub struct ServiceStatus {
    pub name: String,
    pub status: String, // "running" | "stopped" | "error"
    pub ports: Vec<String>,
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/// Expand `~` prefix to the real home directory.
fn resolve_path(raw: &str) -> Result<PathBuf, String> {
    if raw.starts_with('~') {
        let home = dirs::home_dir().ok_or("Could not determine home directory")?;
        Ok(home.join(&raw[2..]))
    } else {
        Ok(PathBuf::from(raw))
    }
}

/// Generate a pseudo-random 32-byte base64 key using time + pid mixing.
fn generate_app_key() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .subsec_nanos();
    let pid = std::process::id();

    // FNV-1a mix
    let mut h: u64 = 14_695_981_039_346_656_037;
    for b in nanos.to_le_bytes().iter().chain(pid.to_le_bytes().iter()) {
        h ^= *b as u64;
        h = h.wrapping_mul(1_099_511_628_211);
    }

    // LCG to produce 32 bytes
    let mut bytes = [0u8; 32];
    let mut state = h;
    for chunk in bytes.chunks_mut(8) {
        state = state
            .wrapping_mul(6_364_136_223_846_793_005)
            .wrapping_add(1_442_695_040_888_963_407);
        let b = state.to_le_bytes();
        for (i, byte) in chunk.iter_mut().enumerate() {
            *byte = b[i];
        }
    }
    base64_encode(&bytes)
}

fn base64_encode(data: &[u8]) -> String {
    const CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity((data.len() + 2) / 3 * 4);
    let mut i = 0;
    while i < data.len() {
        let b0 = data[i] as u32;
        let b1 = if i + 1 < data.len() {
            data[i + 1] as u32
        } else {
            0
        };
        let b2 = if i + 2 < data.len() {
            data[i + 2] as u32
        } else {
            0
        };
        out.push(CHARS[((b0 >> 2) & 0x3F) as usize] as char);
        out.push(CHARS[(((b0 << 4) | (b1 >> 4)) & 0x3F) as usize] as char);
        out.push(if i + 1 < data.len() {
            CHARS[(((b1 << 2) | (b2 >> 6)) & 0x3F) as usize] as char
        } else {
            '='
        });
        out.push(if i + 2 < data.len() {
            CHARS[(b2 & 0x3F) as usize] as char
        } else {
            '='
        });
        i += 3;
    }
    out
}

/// Build the docker-compose.yml string from config.
fn build_compose(config: &InstallConfig) -> String {
    let mut services = String::new();
    let mut volumes = String::from("volumes:\n  coolify_data:\n  coolify_db:\n");

    // Always: Coolify
    services.push_str(
        r#"  coolify:
    image: coollabsio/coolify:latest
    restart: unless-stopped
    ports:
      - "8000:8000"
      - "6001:6001"
    environment:
      APP_ID: opentang
      APP_KEY: base64:${APP_KEY}
      DB_PASSWORD: ${COOLIFY_DB_PASSWORD}
      REDIS_PASSWORD: ${REDIS_PASSWORD}
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - coolify_data:/data/coolify
    networks:
      - opentang
"#,
    );

    // Portainer
    if config.packages.iter().any(|p| p == "portainer") {
        volumes.push_str("  portainer_data:\n");
        services.push_str(
            r#"  portainer:
    image: portainer/portainer-ce:latest
    restart: unless-stopped
    ports:
      - "9000:9000"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
    networks:
      - opentang
"#,
        );
    }

    // Gitea
    if config.packages.iter().any(|p| p == "gitea") {
        volumes.push_str("  gitea_data:\n");
        services.push_str(
            r#"  gitea:
    image: gitea/gitea:latest
    restart: unless-stopped
    ports:
      - "3000:3000"
      - "222:22"
    environment:
      USER_UID: 1000
      USER_GID: 1000
    volumes:
      - gitea_data:/data
    networks:
      - opentang
"#,
        );
    }

    // Grafana
    if config.packages.iter().any(|p| p == "grafana") {
        volumes.push_str("  grafana_data:\n");
        services.push_str(
            r#"  grafana:
    image: grafana/grafana:latest
    restart: unless-stopped
    ports:
      - "3001:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD}
    volumes:
      - grafana_data:/var/lib/grafana
    networks:
      - opentang
"#,
        );
    }

    // Prometheus
    if config.packages.iter().any(|p| p == "prometheus") {
        volumes.push_str("  prometheus_data:\n");
        services.push_str(
            r#"  prometheus:
    image: prom/prometheus:latest
    restart: unless-stopped
    ports:
      - "9090:9090"
    volumes:
      - prometheus_data:/prometheus
    networks:
      - opentang
"#,
        );
    }

    // Ollama (local LLM)
    if config.llm_mode == "local" {
        volumes.push_str("  ollama_data:\n");
        services.push_str(
            r#"  ollama:
    image: ollama/ollama:latest
    restart: unless-stopped
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    networks:
      - opentang
"#,
        );
    }

    // Edition service (openclaw / hermes / nanoclaw)
    let edition_image = match config.edition.as_str() {
        "hermes" => "openclaw/hermes:latest",
        "nanoclaw" => "openclaw/nanoclaw:latest",
        _ => "openclaw/openclaw:latest",
    };
    volumes.push_str("  openclaw_data:\n");
    services.push_str(&format!(
        r#"  {edition}:
    image: {image}
    restart: unless-stopped
    ports:
      - "3002:3000"
    environment:
      OPENCLAW_SECRET: ${{OPENCLAW_SECRET}}
    volumes:
      - openclaw_data:/app/data
    networks:
      - opentang
"#,
        edition = config.edition,
        image = edition_image,
    ));

    format!(
        "version: '3.8'\n\nnetworks:\n  opentang:\n    driver: bridge\n\n{volumes}\nservices:\n{services}"
    )
}

/// Build the .env file contents.
fn build_env(config: &InstallConfig) -> String {
    let app_key = generate_app_key();

    let coolify_db_pw = config
        .credentials
        .get("coolify")
        .map(|c| c.password.clone())
        .unwrap_or_else(|| "changeme_coolify_db".to_string());

    let grafana_pw = config
        .credentials
        .get("grafana")
        .map(|c| c.password.clone())
        .unwrap_or_else(|| "changeme_grafana".to_string());

    let openclaw_secret = config
        .credentials
        .get("openclaw")
        .or_else(|| config.credentials.get(&config.edition))
        .map(|c| c.password.clone())
        .unwrap_or_else(|| "changeme_openclaw".to_string());

    let redis_pw = config
        .credentials
        .get("redis")
        .map(|c| c.password.clone())
        .unwrap_or_else(|| "changeme_redis".to_string());

    format!(
        "COOLIFY_DB_PASSWORD={coolify_db_pw}\nGRAFANA_PASSWORD={grafana_pw}\nOPENCLAW_SECRET={openclaw_secret}\nAPP_KEY={app_key}\nREDIS_PASSWORD={redis_pw}\n"
    )
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
    ];
    KNOWN.iter().find(|&&svc| lower.contains(svc)).copied()
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

    emit("pull", "active", "Starting docker compose up -d ...");

    let mut child = match std::process::Command::new("docker")
        .args(["compose", "up", "-d"])
        .current_dir(&path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
    {
        Ok(c) => c,
        Err(e) => {
            emit(
                "pull",
                "error",
                &format!("Failed to start docker compose: {e}"),
            );
            return;
        }
    };

    let stdout = child.stdout.take().unwrap();
    let stderr = child.stderr.take().unwrap();

    let app_out = app.clone();
    let app_err = app.clone();

    let process_line = |line: &str, app: &tauri::AppHandle| {
        // Emit the raw line for the log panel
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

    let stdout_handle = std::thread::spawn(move || {
        for line in BufReader::new(stdout).lines().flatten() {
            process_line(&line, &app_out);
        }
    });

    let stderr_handle = std::thread::spawn(move || {
        for line in BufReader::new(stderr).lines().flatten() {
            process_line(&line, &app_err);
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
        emit(
            "finalise",
            "error",
            "docker compose up exited with an error. Check logs for details.",
        );
    }
}

// ── Commands ─────────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn generate_compose(config: InstallConfig) -> Result<String, String> {
    let path = resolve_path(&config.install_path)?;

    // Create install directory
    std::fs::create_dir_all(&path)
        .map_err(|e| format!("Failed to create install directory: {e}"))?;

    let compose_yaml = build_compose(&config);
    let env_contents = build_env(&config);

    std::fs::write(path.join("docker-compose.yml"), &compose_yaml)
        .map_err(|e| format!("Failed to write docker-compose.yml: {e}"))?;

    std::fs::write(path.join(".env"), &env_contents)
        .map_err(|e| format!("Failed to write .env: {e}"))?;

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

    let output = std::process::Command::new("docker")
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
