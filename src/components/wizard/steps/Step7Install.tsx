import { useEffect, useRef, useState } from "react";
import { Rocket, ArrowLeft, Edit2, CheckCircle, Clock, Terminal, ChevronDown, ChevronUp, Loader } from "lucide-react";
import { useWizardStore, InstallStep } from "../../../store/useWizardStore";
import { Button } from "../../shared/Button";

const INSTALL_STEPS: { id: string; label: string }[] = [
  { id: "config", label: "Preparing Docker Compose configuration..." },
  { id: "network", label: "Creating Docker network..." },
  { id: "pull", label: "Pulling container images..." },
  { id: "coolify", label: "Starting Coolify..." },
  { id: "traefik", label: "Starting Traefik (reverse proxy)..." },
  { id: "agent", label: "Starting AI Agent..." },
  { id: "gitea", label: "Starting Gitea..." },
  { id: "monitoring", label: "Starting Grafana + Prometheus..." },
  { id: "finalise", label: "Finalising setup..." },
];

const FAKE_LOGS = [
  "[INFO] Loading docker-compose.yml ...",
  "[INFO] Validating configuration ...",
  "[INFO] Creating network opentang_net ...",
  "[INFO] Pulling traefik:v3.0 ...",
  "[INFO] Pulling coolify/coolify:latest ...",
  "[INFO] Pulling gitea/gitea:latest ...",
  "[INFO] Pulling grafana/grafana:latest ...",
  "[INFO] Pulling prom/prometheus:latest ...",
  "[INFO] Starting traefik ... done",
  "[INFO] Starting coolify ... done",
  "[INFO] Coolify health check OK",
  "[INFO] Starting gitea ... done",
  "[INFO] Starting grafana ... done",
  "[INFO] Starting prometheus ... done",
  "[INFO] Applying Traefik routing rules ...",
  "[INFO] Setup complete. All services running.",
];

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
    startInstall,
    updateInstallStep,
  } = useWizardStore();

  const [showLogs, setShowLogs] = useState(false);
  const [logLines, setLogLines] = useState<string[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  // Fake install animation
  useEffect(() => {
    if (!isInstalling) return;

    // Set all steps to pending in store
    const steps: InstallStep[] = INSTALL_STEPS.map((s) => ({ ...s, status: "pending" }));
    useWizardStore.setState({ installProgress: steps });

    let stepIdx = 0;
    let logIdx = 0;

    function advance() {
      if (stepIdx >= INSTALL_STEPS.length) {
        // All done — go to step 8
        completeStep(currentStep);
        setTimeout(() => nextStep(), 600);
        return;
      }

      // Activate current step
      updateInstallStep(INSTALL_STEPS[stepIdx].id, "active");

      // Add some log lines during this step
      const logInterval = setInterval(() => {
        if (logIdx < FAKE_LOGS.length) {
          setLogLines((prev) => [...prev, FAKE_LOGS[logIdx]]);
          logIdx++;
        }
      }, 200);

      // Mark done after ~600ms per step
      setTimeout(() => {
        clearInterval(logInterval);
        updateInstallStep(INSTALL_STEPS[stepIdx].id, "done");
        stepIdx++;
        setTimeout(advance, 150);
      }, 600);
    }

    const timer = setTimeout(advance, 300);
    return () => clearTimeout(timer);
  }, [isInstalling]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll logs
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logLines]);

  if (isInstalling) {
    const progress = installProgress.length > 0 ? installProgress : INSTALL_STEPS.map((s) => ({ ...s, status: "pending" as const }));
    const doneCount = progress.filter((s) => s.status === "done").length;
    const pct = Math.round((doneCount / INSTALL_STEPS.length) * 100);

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
            className="h-full rounded-full bg-ot-orange-500 transition-all duration-500"
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
                {step.status === "pending" && <Clock className="w-4 h-4 text-ot-text-muted" />}
              </div>
              <span className={[
                "text-sm",
                step.status === "done" ? "text-ot-success" :
                step.status === "active" ? "text-ot-orange-400 font-medium" :
                "text-ot-text-muted",
              ].join(" ")}>
                {step.label}
              </span>
              {step.status === "active" && (
                <span className="ml-auto w-2 h-2 rounded-full bg-ot-orange-500 animate-orange-pulse flex-shrink-0" />
              )}
            </div>
          ))}
        </div>

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
            {logLines.map((line, i) => (
              <div key={i} className="leading-5">{line}</div>
            ))}
            {logLines.length === 0 && <span className="text-ot-text-muted">Waiting for output...</span>}
          </div>
        )}
      </div>
    );
  }

  // Pre-install review
  const summaryRows = [
    { label: "Edition", value: editionLabel(edition), step: 2 },
    { label: "LLM", value: llmLabel(llmMode, llmConfig), step: 3 },
    { label: "Packages", value: `${selectedPackages.length} selected`, step: 4 },
    { label: "Network", value: networkLabel(networkMode), step: 5 },
    { label: "Security", value: Object.keys(credentials).length > 0 ? "Credentials generated" : "Not configured", step: 6 },
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
      <div className="rounded-xl border border-ot-border bg-ot-elevated overflow-hidden mb-6">
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

      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={prevStep}>
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <Button
          size="lg"
          onClick={() => startInstall()}
          className="flex-1 justify-center"
        >
          Begin Installation
          <Rocket className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
