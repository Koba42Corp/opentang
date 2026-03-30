import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { CheckCircle, ExternalLink, RotateCcw, PlusCircle, BookOpen, Package, XCircle, Loader } from "lucide-react";
import { useWizardStore, ServiceStatus } from "../../../store/useWizardStore";
import { Button } from "../../shared/Button";

// All possible services with their default ports
const ALL_SERVICE_LINKS = [
  { id: "coolify",    name: "Coolify Dashboard", port: 8000 },
  { id: "portainer",  name: "Portainer",          port: 9000 },
  { id: "gitea",      name: "Gitea",              port: 3000 },
  { id: "grafana",    name: "Grafana",            port: 3001 },
  { id: "prometheus", name: "Prometheus",         port: 9090 },
  { id: "ollama",     name: "Ollama API",         port: 11434 },
];

export default function Step8Done() {
  const {
    goToStep,
    selectedPackages,
    networkMode,
    networkConfig,
    edition,
    llmMode,
    installPath,
    serviceStatuses,
    setServiceStatuses,
  } = useWizardStore();

  // Fetch real service statuses on mount
  useEffect(() => {
    invoke<ServiceStatus[]>("get_service_status", { installPath })
      .then((statuses) => setServiceStatuses(statuses))
      .catch(() => {/* silently ignore — we still show the static list */});
  }, [installPath]); // eslint-disable-line react-hooks/exhaustive-deps

  function getBaseUrl(port: number) {
    if (networkMode === "internet" && networkConfig?.domain) {
      return `https://${networkConfig.domain}`;
    }
    if (networkMode === "lan" && networkConfig?.localIp) {
      return `http://${networkConfig.localIp}:${port}`;
    }
    return `http://localhost:${port}`;
  }

  function getServiceStatus(id: string): ServiceStatus["status"] | null {
    if (serviceStatuses.length === 0) return null; // not loaded yet
    return serviceStatuses.find((s) => s.name === id || s.name.includes(id))?.status ?? "stopped";
  }

  // Determine which services are visible (coolify always + selected packages + ollama if local llm)
  const visibleLinks = ALL_SERVICE_LINKS.filter(({ id }) => {
    if (id === "coolify") return true;
    if (id === "ollama") return llmMode === "local";
    return selectedPackages.includes(id);
  });

  const editionName =
    edition === "nanoclaw" ? "NanoClaw" :
    edition === "hermes" ? "Hermes" :
    edition === "openclaw" ? "OpenClaw" : "OpenTang";

  const coolifyUrl = getBaseUrl(8000);

  async function openDashboard() {
    try {
      await openUrl(coolifyUrl);
    } catch {
      window.open(coolifyUrl, "_blank", "noreferrer");
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-ot-success/10 border border-ot-success/30 mb-6">
          <CheckCircle className="w-10 h-10 text-ot-success" />
        </div>
        <h1 className="text-3xl font-bold text-ot-text mb-2">OpenTang is ready!</h1>
        <p className="text-ot-orange-400 font-medium">Your self-hosted AI stack is up and running.</p>
        <p className="text-ot-text-secondary text-sm mt-1">
          Edition: {editionName} · {visibleLinks.length} services installed
        </p>
      </div>

      {/* Installed services */}
      <div className="rounded-xl border border-ot-border bg-ot-elevated overflow-hidden mb-4">
        <div className="px-4 py-3 border-b border-ot-border">
          <span className="text-xs font-semibold text-ot-text-secondary uppercase tracking-wider">Installed services</span>
        </div>
        {visibleLinks.map(({ id, name, port }, i) => {
          const url = getBaseUrl(port);
          const liveStatus = getServiceStatus(id);
          return (
            <div
              key={id}
              className={[
                "flex items-center justify-between px-4 py-3",
                i !== visibleLinks.length - 1 ? "border-b border-ot-border" : "",
              ].join(" ")}
            >
              <div className="flex items-center gap-3">
                {liveStatus === null && <CheckCircle className="w-4 h-4 text-ot-success flex-shrink-0" />}
                {liveStatus === "running" && <CheckCircle className="w-4 h-4 text-ot-success flex-shrink-0" />}
                {liveStatus === "stopped" && <Loader className="w-4 h-4 text-ot-text-muted flex-shrink-0" />}
                {liveStatus === "error" && <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                <span className="text-sm text-ot-text">{name}</span>
              </div>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs text-ot-orange-400 hover:text-ot-orange-300 transition-colors font-mono"
              >
                {url}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          );
        })}
      </div>

      {/* Primary CTA — uses tauri-plugin-opener */}
      <button
        onClick={openDashboard}
        className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-ot-orange-500 hover:bg-ot-orange-400 text-white font-semibold text-base transition-colors mb-3"
      >
        Open Dashboard
        <ExternalLink className="w-4 h-4" />
      </button>

      {/* Secondary actions */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <button
          onClick={() => goToStep(4)}
          className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-ot-border bg-ot-elevated text-sm text-ot-text hover:bg-ot-overlay transition-colors"
        >
          <PlusCircle className="w-4 h-4 text-ot-orange-400" />
          Add more packages
        </button>
        <a
          href="#"
          className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-ot-border bg-ot-elevated text-sm text-ot-text hover:bg-ot-overlay transition-colors"
        >
          <BookOpen className="w-4 h-4 text-ot-text-muted" />
          View documentation
        </a>
      </div>

      {/* App Store placeholder */}
      <div className="rounded-xl border border-dashed border-ot-border p-4 flex items-center gap-3 mb-8 opacity-60">
        <Package className="w-5 h-5 text-ot-text-muted flex-shrink-0" />
        <div>
          <p className="text-sm text-ot-text font-medium">App Store</p>
          <p className="text-xs text-ot-text-muted">Browse and install additional community packages — coming in v0.2.0</p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-ot-border">
        <p className="text-xs text-ot-text-muted">
          Powered by <span className="text-ot-orange-400 font-semibold">Koba42</span>
        </p>
        <Button variant="ghost" size="sm" onClick={() => goToStep(0)}>
          <RotateCcw className="w-3.5 h-3.5" />
          Start over
        </Button>
      </div>
    </div>
  );
}
