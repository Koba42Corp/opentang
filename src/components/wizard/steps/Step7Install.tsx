import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  Rocket, ArrowLeft, Edit2, CheckCircle, Clock,
  Terminal, ChevronDown, ChevronUp, Loader, XCircle, FolderOpen,
} from "lucide-react";
import { useWizardStore, InstallStep } from "../../../store/useWizardStore";
import { Button } from "../../shared/Button";

// ── Dynamic step list built from wizard config ───────────────────────────────

function buildInstallSteps(
  edition: string | null,
  packages: string[],
  llmMode: string | null
): { id: string; label: string }[] {
  const steps: { id: string; label: string }[] = [
    { id: "config", label: "Writing docker-compose.yml..." },
    { id: "pull", label: "Pulling container images..." },
    { id: "coolify", label: "Starting Coolify..." },
  ];
  if (packages.includes("portainer")) steps.push({ id: "portainer", label: "Starting Portainer..." });
  if (packages.includes("gitea")) steps.push({ id: "gitea", label: "Starting Gitea..." });
  if (packages.includes("grafana")) steps.push({ id: "grafana", label: "Starting Grafana..." });
  if (packages.includes("prometheus")) steps.push({ id: "prometheus", label: "Starting Prometheus..." });
  if (llmMode === "local") steps.push({ id: "ollama", label: "Starting Ollama (LLM)..." });
  if (edition) steps.push({ id: edition, label: `Starting ${editionLabel(edition)}...` });
  steps.push({ id: "finalise", label: "Finalising setup..." });
  return steps;
}

// ── Label helpers ─────────────────────────────────────────────────────────────

function editionLabel(e: string | null) {
  return e === "nanoclaw" ? "NanoClaw" : e === "hermes" ? "Hermes" : e === "openclaw" ? "OpenClaw" : "—";
}

function llmLabel(mode: string | null, config: { provider?: string; model?: string } | null) {
  if (mode === "local") return `Ollama (${config?.model ?? "—"})`;
  if (mode === "cloud") return `${config?.provider ?? "Cloud"} / ${config?.model ?? "—"}`;
  if (mode === "skip") return "Skipped";
  return "—";
}

function networkLabel(mode: string | null) {
  return mode === "local" ? "Local only" : mode === "lan" ? "LAN / Home server" : mode === "internet" ? "Internet-facing" : "—";
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Step7Install() {
  const {
    prevStep,
    completeStep,
    nextStep,
    currentStep,
    goToStep,
    edition,
    llmMode,
    llmConfig,
    selectedPackages,
    networkMode,
    credentials,
    isInstalling,
    installProgress,
    installPath,
    installLogs,
    startInstall,
    setInstallPath,
    updateInstallStep,
    appendInstallLog,
  } = useWizardStore();

  const [showLogs, setShowLogs] = useState(false);
  const [editingPath, setEditingPath] = useState(false);
  const [pathInput, setPathInput] = useState(installPath);
  const [installError, setInstallError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [installLogs]);

  // ── Real install flow ──────────────────────────────────────────────────────

  async function beginInstall() {
    setInstallError(null);

    const steps = buildInstallSteps(edition, selectedPackages, llmMode);
    const initialProgress: InstallStep[] = steps.map((s) => ({ ...s, status: "pending" }));
    useWizardStore.setState({ installProgress: initialProgress });

    startInstall(); // sets isInstalling: true, clears logs

    // Mark config step active immediately
    updateInstallStep("config", "active", "Writing docker-compose.yml...");

    try {
      // 1. Generate compose files on disk
      await invoke("generate_compose", {
        config: {
          edition: edition ?? "nanoclaw",
          packages: selectedPackages,
          network_mode: networkMode ?? "local",
          domain: networkMode !== "local" ? (useWizardStore.getState().networkConfig?.domain ?? null) : null,
          email: useWizardStore.getState().networkConfig?.email ?? null,
          llm_mode: llmMode ?? "skip",
          llm_model: llmConfig?.model ?? null,
          credentials,
          install_path: installPath,
        },
      });

      updateInstallStep("config", "done", "docker-compose.yml written.");
      appendInstallLog(`[INFO] Config written to ${installPath}`);

      // 2. Subscribe to progress events before starting
      const unlistenProgress = await listen<{
        step_id: string;
        status: string;
        message: string;
      }>("install-progress", (event) => {
        const { step_id, status, message } = event.payload;

        if (step_id === "log") {
          // Raw log line — append to log panel only
          appendInstallLog(message);
          return;
        }

        // Redact potential credential values from displayed messages
        const safeLine = message.replace(/password=\S+/gi, "password=***");

        appendInstallLog(`[${status.toUpperCase()}] ${safeLine}`);
        updateInstallStep(step_id, status as InstallStep["status"], safeLine);
      });

      const unlistenComplete = await listen("install-complete", () => {
        unlistenProgress();
        unlistenComplete();
        appendInstallLog("[INFO] Install complete — all services running.");
        completeStep(currentStep);
        setTimeout(() => nextStep(), 800);
      });

      // 3. Kick off docker compose up -d (streams events in background)
      await invoke("start_install", { installPath });

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setInstallError(msg);
      appendInstallLog(`[ERROR] ${msg}`);
    }
  }

  // ── Installing view ────────────────────────────────────────────────────────

  if (isInstalling) {
    const steps = buildInstallSteps(edition, selectedPackages, llmMode);
    const progress: InstallStep[] =
      installProgress.length > 0
        ? installProgress
        : steps.map((s) => ({ ...s, status: "pending" as const }));

    const doneCount = progress.filter((s) => s.status === "done").length;
    const hasError = progress.some((s) => s.status === "error");
    const pct = Math.round((doneCount / steps.length) * 100);

    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Rocket className="w-6 h-6 text-ot-orange-500" />
            <h1 className="text-2xl font-bold text-ot-text">Installing OpenTang...</h1>
          </div>
          <p className="text-ot-text-secondary text-sm">Sit tight while your stack comes online.</p>
        </div>

        {/* Progress bar */}
        <div className="h-2 rounded-full bg-ot-overlay overflow-hidden mb-6">
          <div
            className={[
              "h-full rounded-full transition-all duration-500",
              hasError ? "bg-red-500" : "bg-ot-orange-500",
            ].join(" ")}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Step list */}
        <div className="rounded-xl border border-ot-border bg-ot-elevated overflow-hidden mb-4">
          {progress.map((step, i) => (
            <div
              key={step.id}
              className={[
                "flex items-center gap-3 px-4 py-3",
                i !== progress.length - 1 ? "border-b border-ot-border" : "",
              ].join(" ")}
            >
              <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                {step.status === "done" && <CheckCircle className="w-4 h-4 text-ot-success" />}
                {step.status === "active" && <Loader className="w-4 h-4 text-ot-orange-500 animate-spin" />}
                {step.status === "error" && <XCircle className="w-4 h-4 text-red-500" />}
                {step.status === "pending" && <Clock className="w-4 h-4 text-ot-text-muted" />}
              </div>
              <div className="flex-1 min-w-0">
                <span
                  className={[
                    "text-sm",
                    step.status === "done" ? "text-ot-success" :
                    step.status === "active" ? "text-ot-orange-400 font-medium" :
                    step.status === "error" ? "text-red-400" :
                    "text-ot-text-muted",
                  ].join(" ")}
                >
                  {step.label}
                </span>
                {step.message && step.status === "error" && (
                  <p className="text-xs text-red-400 mt-0.5 truncate">{step.message}</p>
                )}
              </div>
              {step.status === "active" && (
                <span className="ml-auto w-2 h-2 rounded-full bg-ot-orange-500 animate-orange-pulse flex-shrink-0" />
              )}
            </div>
          ))}
        </div>

        {/* Top-level error */}
        {installError && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 mb-4 text-sm text-red-400">
            {installError}
          </div>
        )}

        {/* Logs toggle */}
        <button
          onClick={() => setShowLogs((v) => !v)}
          className="flex items-center gap-2 text-xs text-ot-text-secondary hover:text-ot-text transition-colors mb-2"
        >
          <Terminal className="w-3.5 h-3.5" />
          {showLogs ? "Hide logs" : "Show logs"}
          {showLogs ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {showLogs && (
          <div
            ref={logRef}
            className="rounded-xl bg-[#0D0D0F] border border-ot-border p-4 h-40 overflow-y-auto font-mono text-xs text-ot-text-secondary space-y-0.5"
          >
            {installLogs.map((line, i) => (
              <div key={i} className="leading-5">{line}</div>
            ))}
            {installLogs.length === 0 && <span className="text-ot-text-muted">Waiting for output...</span>}
          </div>
        )}
      </div>
    );
  }

  // ── Pre-install review ─────────────────────────────────────────────────────

  const summaryRows = [
    { label: "Edition", value: editionLabel(edition), step: 2 },
    { label: "LLM", value: llmLabel(llmMode, llmConfig), step: 3 },
    { label: "Packages", value: `${selectedPackages.length} selected`, step: 4 },
    { label: "Network", value: networkLabel(networkMode), step: 5 },
    { label: "Security", value: Object.keys(credentials).length > 0 ? "Credentials configured" : "Not configured", step: 6 },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Rocket className="w-6 h-6 text-ot-orange-500" />
          <h1 className="text-2xl font-bold text-ot-text">Review & Install</h1>
        </div>
        <p className="text-ot-text-secondary text-sm">
          Review your selections before installation begins.
        </p>
      </div>

      {/* Summary */}
      <div className="rounded-xl border border-ot-border bg-ot-elevated overflow-hidden mb-4">
        {summaryRows.map(({ label, value, step }, i) => (
          <div
            key={label}
            className={[
              "flex items-center justify-between px-5 py-3.5",
              i !== summaryRows.length - 1 ? "border-b border-ot-border" : "",
            ].join(" ")}
          >
            <div className="flex items-center gap-3">
              <CheckCircle className="w-4 h-4 text-ot-success flex-shrink-0" />
              <div>
                <p className="text-xs text-ot-text-muted">{label}</p>
                <p className="text-sm text-ot-text font-medium">{value}</p>
              </div>
            </div>
            <button
              onClick={() => goToStep(step)}
              className="flex items-center gap-1 text-xs text-ot-orange-400 hover:text-ot-orange-300 transition-colors"
            >
              <Edit2 className="w-3 h-3" />
              Edit
            </button>
          </div>
        ))}
      </div>

      {/* Install path */}
      <div className="rounded-xl border border-ot-border bg-ot-elevated px-5 py-3.5 mb-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <FolderOpen className="w-4 h-4 text-ot-text-muted flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-ot-text-muted">Install path</p>
              {editingPath ? (
                <input
                  autoFocus
                  value={pathInput}
                  onChange={(e) => setPathInput(e.target.value)}
                  onBlur={() => {
                    setInstallPath(pathInput || "~/.opentang");
                    setEditingPath(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setInstallPath(pathInput || "~/.opentang");
                      setEditingPath(false);
                    }
                    if (e.key === "Escape") {
                      setPathInput(installPath);
                      setEditingPath(false);
                    }
                  }}
                  className="text-sm font-mono text-ot-text bg-transparent border-b border-ot-orange-500 outline-none w-full"
                />
              ) : (
                <p className="text-sm text-ot-text font-mono truncate">{installPath}</p>
              )}
            </div>
          </div>
          {!editingPath && (
            <button
              onClick={() => { setPathInput(installPath); setEditingPath(true); }}
              className="flex items-center gap-1 text-xs text-ot-orange-400 hover:text-ot-orange-300 transition-colors flex-shrink-0"
            >
              <Edit2 className="w-3 h-3" />
              Edit
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={prevStep}>
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <Button
          size="lg"
          onClick={beginInstall}
          className="flex-1 justify-center"
        >
          Begin Installation
          <Rocket className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
