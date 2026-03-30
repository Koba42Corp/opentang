import { useEffect } from "react";
import { Package, ArrowRight, ArrowLeft, AlertTriangle } from "lucide-react";
import { useWizardStore } from "../../../store/useWizardStore";
import { Button } from "../../shared/Button";

interface PkgDef {
  id: string;
  name: string;
  description: string;
  ramMb: number;
  diskMb: number;
  featured?: boolean;
  tier: "core" | "tier1" | "tier2";
  defaultOn?: boolean;
}

const PACKAGES: PkgDef[] = [
  // Core — always on
  { id: "docker", name: "Docker + Compose", description: "Container runtime", ramMb: 0, diskMb: 500, tier: "core" },
  { id: "traefik", name: "Traefik", description: "Reverse proxy + SSL", ramMb: 64, diskMb: 200, tier: "core" },
  { id: "coolify", name: "Coolify", description: "Self-hosted PaaS", ramMb: 256, diskMb: 1000, tier: "core", featured: true },
  // Tier 1 — default on
  { id: "openclaw-agent", name: "AI Agent", description: "OpenClaw / Hermes / NanoClaw (from edition)", ramMb: 512, diskMb: 2000, tier: "tier1", defaultOn: true, featured: true },
  { id: "gitea", name: "Gitea", description: "Private Git server", ramMb: 256, diskMb: 1000, tier: "tier1", defaultOn: true },
  { id: "portainer", name: "Portainer", description: "Docker management UI", ramMb: 128, diskMb: 500, tier: "tier1", defaultOn: true },
  { id: "grafana", name: "Grafana", description: "Monitoring dashboards", ramMb: 256, diskMb: 500, tier: "tier1", defaultOn: true },
  { id: "prometheus", name: "Prometheus", description: "Metrics collection", ramMb: 256, diskMb: 500, tier: "tier1", defaultOn: true },
  // Tier 2 — default off
  { id: "ollama", name: "Ollama", description: "Local LLM runtime", ramMb: 2048, diskMb: 5120, tier: "tier2" },
  { id: "n8n", name: "n8n", description: "Workflow automation", ramMb: 512, diskMb: 1000, tier: "tier2" },
  { id: "uptime-kuma", name: "Uptime Kuma", description: "Uptime monitoring", ramMb: 128, diskMb: 500, tier: "tier2" },
  { id: "vaultwarden", name: "Vaultwarden", description: "Password manager", ramMb: 64, diskMb: 250, tier: "tier2" },
  { id: "nextcloud", name: "Nextcloud", description: "Cloud storage", ramMb: 512, diskMb: 2000, tier: "tier2" },
  { id: "searxng", name: "SearXNG", description: "Private search", ramMb: 256, diskMb: 500, tier: "tier2" },
];

const CORE_IDS = PACKAGES.filter((p) => p.tier === "core").map((p) => p.id);
const TIER1_DEFAULTS = PACKAGES.filter((p) => p.tier === "tier1" && p.defaultOn).map((p) => p.id);

function formatMb(mb: number) {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb} MB`;
}

export default function Step4Packages() {
  const { nextStep, prevStep, completeStep, currentStep, selectedPackages, setSelectedPackages, togglePackage, systemCheck } = useWizardStore();

  // Seed defaults on first mount
  useEffect(() => {
    if (selectedPackages.length === 0) {
      setSelectedPackages([...CORE_IDS, ...TIER1_DEFAULTS]);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const availableRamMb = (systemCheck?.ram_available_gb ?? 16) * 1024;

  // Calculate totals for selected + core (always included)
  const allSelected = new Set(selectedPackages);
  CORE_IDS.forEach((id) => allSelected.add(id));

  const totalRamMb = PACKAGES.filter((p) => allSelected.has(p.id)).reduce((sum, p) => sum + p.ramMb, 0);
  const totalDiskMb = PACKAGES.filter((p) => allSelected.has(p.id)).reduce((sum, p) => sum + p.diskMb, 0);
  const ramPercent = Math.min((totalRamMb / availableRamMb) * 100, 100);
  const ramOverLimit = totalRamMb > availableRamMb * 0.8;

  function handleContinue() {
    completeStep(currentStep);
    nextStep();
  }

  const tier1 = PACKAGES.filter((p) => p.tier === "tier1");
  const tier2 = PACKAGES.filter((p) => p.tier === "tier2");
  const core = PACKAGES.filter((p) => p.tier === "core");

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Package className="w-6 h-6 text-ot-orange-500" />
          <h1 className="text-2xl font-bold text-ot-text">Package Selection</h1>
        </div>
        <p className="text-ot-text-secondary text-sm">
          Choose which services to install. Core packages are always included.
        </p>
      </div>

      {/* Core packages */}
      <div className="mb-5">
        <p className="text-xs font-semibold text-ot-text-muted uppercase tracking-wider mb-2">Core — always installed</p>
        <div className="rounded-xl border border-ot-border bg-ot-elevated overflow-hidden">
          {core.map((pkg, i) => (
            <div
              key={pkg.id}
              className={["flex items-center gap-3 px-4 py-3", i !== core.length - 1 ? "border-b border-ot-border" : ""].join(" ")}
            >
              <div className="w-4 h-4 rounded bg-ot-orange-500/20 border border-ot-orange-500/40 flex items-center justify-center flex-shrink-0">
                <span className="text-ot-orange-500 text-[9px] font-bold">✓</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-ot-text font-medium">{pkg.name}</span>
                  {pkg.featured && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-ot-orange-500/20 text-ot-orange-400 border border-ot-orange-500/30">
                      Koba42
                    </span>
                  )}
                </div>
                <p className="text-xs text-ot-text-muted">{pkg.description}</p>
              </div>
              <span className="text-xs text-ot-text-muted font-mono whitespace-nowrap">{formatMb(pkg.diskMb)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tier 1 */}
      <PackageSection
        title="Recommended — on by default"
        packages={tier1}
        selectedPackages={selectedPackages}
        onToggle={togglePackage}
      />

      {/* Tier 2 */}
      <PackageSection
        title="Optional extras — off by default"
        packages={tier2}
        selectedPackages={selectedPackages}
        onToggle={togglePackage}
      />

      {/* Resource estimator */}
      <div className="mt-5 rounded-xl border border-ot-border bg-ot-elevated p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-ot-text-secondary uppercase tracking-wider">Estimated resources</span>
          <span className="text-xs font-mono text-ot-text-secondary">
            ~{formatMb(totalRamMb)} RAM · ~{formatMb(totalDiskMb)} disk
          </span>
        </div>
        {/* RAM bar */}
        <div className="h-2 rounded-full bg-ot-overlay overflow-hidden mb-1">
          <div
            className={["h-full rounded-full transition-all duration-300", ramOverLimit ? "bg-ot-error" : "bg-ot-orange-500"].join(" ")}
            style={{ width: `${ramPercent}%` }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-ot-text-muted">{ramPercent.toFixed(0)}% of available RAM</span>
          {systemCheck && (
            <span className="text-xs text-ot-text-muted font-mono">{systemCheck.ram_available_gb.toFixed(1)} GB available</span>
          )}
        </div>
        {ramOverLimit && (
          <div className="flex items-center gap-2 mt-2 p-2 rounded-lg bg-ot-warning/10 border border-ot-warning/30">
            <AlertTriangle className="w-3.5 h-3.5 text-ot-warning flex-shrink-0" />
            <p className="text-xs text-ot-warning">Selected packages exceed 80% of available RAM. Consider disabling some optional packages.</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 mt-6">
        <Button variant="ghost" onClick={prevStep}>
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <Button onClick={handleContinue}>
          Continue
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

function PackageSection({
  title,
  packages,
  selectedPackages,
  onToggle,
}: {
  title: string;
  packages: PkgDef[];
  selectedPackages: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="mb-5">
      <p className="text-xs font-semibold text-ot-text-muted uppercase tracking-wider mb-2">{title}</p>
      <div className="rounded-xl border border-ot-border bg-ot-elevated overflow-hidden">
        {packages.map((pkg, i) => {
          const isOn = selectedPackages.includes(pkg.id);
          return (
            <div
              key={pkg.id}
              className={[
                "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-ot-overlay",
                i !== packages.length - 1 ? "border-b border-ot-border" : "",
              ].join(" ")}
              onClick={() => onToggle(pkg.id)}
            >
              {/* Toggle */}
              <div
                className={[
                  "relative w-8 h-4.5 rounded-full transition-colors flex-shrink-0",
                  "w-9 h-5",
                  isOn ? "bg-ot-orange-500" : "bg-ot-overlay border border-ot-border",
                ].join(" ")}
              >
                <span
                  className={[
                    "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                    isOn ? "translate-x-4" : "translate-x-0.5",
                  ].join(" ")}
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={["text-sm font-medium", isOn ? "text-ot-text" : "text-ot-text-secondary"].join(" ")}>
                    {pkg.name}
                  </span>
                  {pkg.featured && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-ot-orange-500/20 text-ot-orange-400 border border-ot-orange-500/30">
                      Koba42
                    </span>
                  )}
                </div>
                <p className="text-xs text-ot-text-muted">{pkg.description}</p>
              </div>

              <div className="text-right flex-shrink-0">
                <p className="text-xs text-ot-text-muted font-mono">{formatMb(pkg.ramMb)} RAM</p>
                <p className="text-xs text-ot-text-muted font-mono">{formatMb(pkg.diskMb)} disk</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
