import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  Search,
  Star,
  ExternalLink,
  Loader,
  CheckCircle,
  PauseCircle,
  XCircle,
  MoreVertical,
  Trash2,
  ArrowUpCircle,
  Cpu,
  HardDrive,
  Server,
  Bot,
  GitBranch,
  BarChart2,
  Activity,
  GitMerge,
  Lock,
  Cloud,
  Zap,
  LayoutDashboard,
} from "lucide-react";
import { useWizardStore, Package, Registry, ServiceStatus } from "../../store/useWizardStore";

// ── Category definitions ──────────────────────────────────────────────────────

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "ai", label: "🤖 AI & LLM" },
  { id: "infrastructure", label: "🏗 Infrastructure" },
  { id: "development", label: "💻 Development" },
  { id: "monitoring", label: "📊 Monitoring" },
  { id: "automation", label: "⚙️ Automation" },
  { id: "security", label: "🔒 Security" },
  { id: "productivity", label: "☁️ Productivity" },
];

// ── Icon mapping ──────────────────────────────────────────────────────────────

function PackageIcon({ icon, className = "w-5 h-5" }: { icon: string; className?: string }) {
  const props = { className };
  switch (icon) {
    case "bot": return <Bot {...props} />;
    case "cpu": return <Cpu {...props} />;
    case "server": return <Server {...props} />;
    case "git-branch": return <GitBranch {...props} />;
    case "bar-chart-2": return <BarChart2 {...props} />;
    case "activity": return <Activity {...props} />;
    case "git-merge": return <GitMerge {...props} />;
    case "lock": return <Lock {...props} />;
    case "cloud": return <Cloud {...props} />;
    case "zap": return <Zap {...props} />;
    case "layout-dashboard": return <LayoutDashboard {...props} />;
    case "search": return <Search {...props} />;
    default: return <Server {...props} />;
  }
}

// ── Package status helpers ────────────────────────────────────────────────────

type PkgStatus = "not-installed" | "installing" | "installed" | "stopped" | "error";

function getPackageStatus(
  pkg: Package,
  installedPackages: string[],
  serviceStatuses: ServiceStatus[],
  installingIds: Set<string>
): PkgStatus {
  if (installingIds.has(pkg.id)) return "installing";

  const isInstalled = installedPackages.includes(pkg.id);
  if (!isInstalled) return "not-installed";

  const svcStatus = serviceStatuses.find(
    (s) => s.name === pkg.compose_service || s.name.includes(pkg.id)
  );
  if (!svcStatus) return "installed"; // installed but not detected yet (still good)
  if (svcStatus.status === "running") return "installed";
  if (svcStatus.status === "error") return "error";
  return "stopped";
}

// ── Package Card ──────────────────────────────────────────────────────────────

interface PackageCardProps {
  pkg: Package;
  status: PkgStatus;
  onInstall: (id: string) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string) => void;
  onOpen: (port: number) => void;
}

function KebabMenu({
  onUpdate,
  onRemove,
}: {
  onUpdate: () => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="p-1 rounded hover:bg-ot-overlay text-ot-text-muted hover:text-ot-text transition-colors"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div
          className="absolute right-0 top-7 z-10 w-36 rounded-lg border border-ot-border bg-ot-overlay shadow-xl"
          onMouseLeave={() => setOpen(false)}
        >
          <button
            onClick={() => { onUpdate(); setOpen(false); }}
            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-ot-text hover:bg-ot-elevated transition-colors"
          >
            <ArrowUpCircle className="w-3.5 h-3.5 text-ot-info" />
            Update
          </button>
          <button
            onClick={() => { onRemove(); setOpen(false); }}
            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-ot-error hover:bg-ot-elevated transition-colors rounded-b-lg"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Remove
          </button>
        </div>
      )}
    </div>
  );
}

function PackageCard({ pkg, status, onInstall, onRemove, onUpdate, onOpen }: PackageCardProps) {
  const diskVal = typeof pkg.min_disk_gb === "number" ? pkg.min_disk_gb : 1;

  return (
    <div className="rounded-xl border border-ot-border bg-ot-elevated p-4 flex flex-col gap-3 hover:border-ot-orange-500/30 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-ot-overlay flex items-center justify-center text-ot-orange-400 flex-shrink-0">
            <PackageIcon icon={pkg.icon} className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-ot-text">{pkg.name}</span>
              {pkg.koba42_featured && (
                <Star className="w-3 h-3 text-ot-orange-400 fill-ot-orange-400" />
              )}
            </div>
            <span className="text-xs text-ot-text-muted">{pkg.version}</span>
          </div>
        </div>
        {(status === "installed" || status === "stopped" || status === "error") && (
          <KebabMenu onUpdate={() => onUpdate(pkg.id)} onRemove={() => onRemove(pkg.id)} />
        )}
      </div>

      {/* Description */}
      <p className="text-xs text-ot-text-secondary leading-relaxed flex-1">{pkg.description}</p>

      {/* Requirements */}
      <div className="flex items-center gap-3 text-xs text-ot-text-muted">
        <span className="flex items-center gap-1">
          <Cpu className="w-3 h-3" />
          {pkg.min_ram_mb >= 1024 ? `${pkg.min_ram_mb / 1024}GB` : `${pkg.min_ram_mb}MB`} RAM
        </span>
        <span className="flex items-center gap-1">
          <HardDrive className="w-3 h-3" />
          {diskVal}GB Disk
        </span>
      </div>

      {/* Action row */}
      <div className="flex items-center gap-2">
        {status === "not-installed" && (
          <button
            onClick={() => onInstall(pkg.id)}
            className="flex-1 py-1.5 rounded-lg bg-ot-info/10 border border-ot-info/30 text-ot-info text-xs font-semibold hover:bg-ot-info/20 transition-colors"
          >
            Install
          </button>
        )}

        {status === "installing" && (
          <div className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-ot-orange-500/30 bg-ot-orange-500/10 text-ot-orange-400 text-xs font-medium">
            <Loader className="w-3 h-3 animate-spin" />
            Installing...
          </div>
        )}

        {status === "installed" && (
          <>
            <span className="flex items-center gap-1 text-xs text-ot-success font-medium">
              <CheckCircle className="w-3.5 h-3.5" /> Installed
            </span>
            <button
              onClick={() => onOpen(pkg.port)}
              className="flex items-center gap-1 ml-auto px-3 py-1.5 rounded-lg bg-ot-orange-500/10 border border-ot-orange-500/20 text-ot-orange-400 text-xs font-medium hover:bg-ot-orange-500/20 transition-colors"
            >
              Open <ExternalLink className="w-3 h-3" />
            </button>
          </>
        )}

        {status === "stopped" && (
          <span className="flex items-center gap-1 text-xs text-ot-warning font-medium">
            <PauseCircle className="w-3.5 h-3.5" /> Stopped
          </span>
        )}

        {status === "error" && (
          <span className="flex items-center gap-1 text-xs text-ot-error font-medium">
            <XCircle className="w-3.5 h-3.5" /> Error
          </span>
        )}
      </div>
    </div>
  );
}

// ── App Store Tab ─────────────────────────────────────────────────────────────

export default function AppStoreTab() {
  const { installState, installPath, serviceStatuses, setServiceStatuses } = useWizardStore();

  const [registry, setRegistry] = useState<Registry | null>(null);
  const [loadingRegistry, setLoadingRegistry] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [installingIds, setInstallingIds] = useState<Set<string>>(new Set());

  // Derive installed packages from installState or empty
  const [installedPackages, setInstalledPackages] = useState<string[]>(
    installState?.installedPackages ?? []
  );

  const path = installState?.installPath ?? installPath;

  useEffect(() => {
    invoke<Registry>("get_registry")
      .then((r) => setRegistry(r))
      .catch(() => {})
      .finally(() => setLoadingRegistry(false));

    invoke<ServiceStatus[]>("get_service_status", { installPath: path })
      .then((s) => setServiceStatuses(s))
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleInstall(id: string) {
    setInstallingIds((s) => new Set(s).add(id));
    try {
      await invoke("install_package", { packageId: id, installPath: path });
      setInstalledPackages((prev) => [...prev, id]);
      // Persist updated list
      if (installState) {
        await invoke("save_install_state", {
          state: { ...installState, installedPackages: [...installedPackages, id] },
          installPath: path,
        });
      }
    } catch (e) {
      console.error("install_package error:", e);
    } finally {
      setInstallingIds((s) => { const n = new Set(s); n.delete(id); return n; });
    }
  }

  async function handleRemove(id: string) {
    try {
      await invoke("remove_package", { packageId: id, installPath: path });
      setInstalledPackages((prev) => prev.filter((p) => p !== id));
      if (installState) {
        await invoke("save_install_state", {
          state: { ...installState, installedPackages: installedPackages.filter((p) => p !== id) },
          installPath: path,
        });
      }
    } catch (e) {
      console.error("remove_package error:", e);
    }
  }

  async function handleUpdate(id: string) {
    setInstallingIds((s) => new Set(s).add(id));
    try {
      await invoke("update_package", { packageId: id, installPath: path });
    } catch (e) {
      console.error("update_package error:", e);
    } finally {
      setTimeout(() => {
        setInstallingIds((s) => { const n = new Set(s); n.delete(id); return n; });
      }, 3000);
    }
  }

  async function handleOpen(port: number) {
    const url = `http://localhost:${port}`;
    try {
      await openUrl(url);
    } catch {
      window.open(url, "_blank", "noreferrer");
    }
  }

  if (loadingRegistry) {
    return (
      <div className="flex items-center justify-center h-64 text-ot-text-muted text-sm gap-2">
        <Loader className="w-5 h-5 animate-spin" />
        Loading registry...
      </div>
    );
  }

  if (!registry) {
    return (
      <div className="flex items-center justify-center h-64 text-ot-error text-sm">
        Failed to load registry.
      </div>
    );
  }

  const allPackages = registry.packages;

  // Koba42 featured row
  const featured = allPackages.filter((p) => p.koba42_featured);

  // Filtered grid
  const filtered = allPackages.filter((p) => {
    const matchCat = activeCategory === "all" || p.category === activeCategory;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tags.some((t) => t.includes(q));
    return matchCat && matchSearch;
  });

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="w-48 flex-shrink-0 border-r border-ot-border bg-ot-surface p-3 flex flex-col gap-0.5">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={[
              "text-left px-3 py-2 rounded-lg text-sm transition-colors",
              activeCategory === cat.id
                ? "bg-ot-orange-500/15 text-ot-orange-400 font-medium"
                : "text-ot-text-secondary hover:text-ot-text hover:bg-ot-elevated",
            ].join(" ")}
          >
            {cat.label}
          </button>
        ))}
      </aside>

      {/* Main content */}
      <div className="flex-1 overflow-auto p-5">
        {/* Search */}
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ot-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search packages..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-ot-border bg-ot-elevated text-sm text-ot-text placeholder:text-ot-text-muted focus:outline-none focus:ring-1 focus:ring-ot-orange-500"
          />
        </div>

        {/* Koba42 Featured row — shown when no search active */}
        {!search && activeCategory === "all" && (
          <section className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-4 h-4 text-ot-orange-400 fill-ot-orange-400" />
              <h3 className="text-sm font-semibold text-ot-orange-400">Koba42 Featured</h3>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {featured.map((pkg) => {
                const status = getPackageStatus(pkg, installedPackages, serviceStatuses, installingIds);
                return (
                  <div key={pkg.id} className="w-56 flex-shrink-0">
                    <PackageCard
                      pkg={pkg}
                      status={status}
                      onInstall={handleInstall}
                      onRemove={handleRemove}
                      onUpdate={handleUpdate}
                      onOpen={handleOpen}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* All / filtered packages */}
        <section>
          <h3 className="text-sm font-semibold text-ot-text-secondary mb-3">
            {activeCategory === "all" && !search ? "All Packages" : "Results"}
            <span className="ml-2 text-ot-text-muted font-normal">({filtered.length})</span>
          </h3>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-ot-text-muted text-sm gap-2">
              <Search className="w-6 h-6" />
              No packages match your search.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map((pkg) => {
                const status = getPackageStatus(pkg, installedPackages, serviceStatuses, installingIds);
                return (
                  <PackageCard
                    key={pkg.id}
                    pkg={pkg}
                    status={status}
                    onInstall={handleInstall}
                    onRemove={handleRemove}
                    onUpdate={handleUpdate}
                    onOpen={handleOpen}
                  />
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
