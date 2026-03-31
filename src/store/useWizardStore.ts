import { create } from "zustand";

export interface CheckItem {
  id: string;
  label: string;
  status: "Pass" | "Warn" | "Fail";
  message: string;
}

export interface SystemCheckResult {
  os: string;
  os_version: string;
  arch: string;
  ram_gb: number;
  ram_available_gb: number;
  disk_gb: number;
  disk_available_gb: number;
  docker_installed: boolean;
  docker_version: string | null;
  docker_running: boolean;
  wsl2_available: boolean;
  checks: CheckItem[];
}

export interface LlmConfig {
  provider?: "ollama" | "openai" | "anthropic" | "custom";
  model?: string;
  apiKey?: string;
  baseUrl?: string;
}

export interface NetworkConfig {
  domain?: string;
  email?: string;
  localIp?: string;
  hostname?: string;
  cloudflareTunnel?: boolean;
}

export interface InstallStep {
  id: string;
  label: string;
  status: "pending" | "active" | "done" | "error";
  message?: string;
}

export interface ServiceStatus {
  name: string;
  status: "running" | "stopped" | "error";
  ports: string[];
}

// ── v0.1.1: Pre-install detection types ───────────────────────────────────────

export interface PortMapping {
  host_port: number;
  container_port: number;
}

export interface DetectedService {
  id: string;
  name: string;
  container_name: string;
  image: string;
  status: string; // "running" | "stopped" | "unknown"
  ports: PortMapping[];
}

// ── M6: Registry types ────────────────────────────────────────────────────────

export interface Package {
  id: string;
  name: string;
  version: string;
  description: string;
  category: string;
  tags: string[];
  icon: string;
  min_ram_mb: number;
  min_disk_gb: number;
  port: number;
  url_path?: string;
  koba42_featured: boolean;
  official: boolean;
  compose_service: string;
}

export interface Registry {
  version: string;
  updated: string;
  packages: Package[];
}

export interface InstallState {
  version: string;
  installedAt: string;
  edition: string;
  installPath: string;
  networkMode: string;
  domain: string | null;
  installedPackages: string[];
}

// ── Store interface ───────────────────────────────────────────────────────────

interface WizardState {
  // M6: App mode — wizard during setup, management after install
  appMode: "wizard" | "management";
  setAppMode: (mode: "wizard" | "management") => void;

  // M6: Persisted install state
  installState: InstallState | null;
  setInstallState: (state: InstallState) => void;

  // M6: Active management tab
  managementTab: "dashboard" | "appstore" | "settings";
  setManagementTab: (tab: "dashboard" | "appstore" | "settings") => void;

  // Navigation
  currentStep: number;
  completedSteps: number[];

  // System check result from M2
  systemCheck: SystemCheckResult | null;

  // Step 2
  edition: "nanoclaw" | "hermes" | "openclaw" | null;

  // Step 3
  llmMode: "local" | "cloud" | "skip" | null;
  llmConfig: LlmConfig | null;

  // Step 1 — detected services
  detectedServices: DetectedService[];
  setDetectedServices: (services: DetectedService[]) => void;

  // Step 4
  selectedPackages: string[];
  forceReinstallPackages: string[];
  toggleForceReinstall: (id: string) => void;

  // Step 5
  networkMode: "local" | "lan" | "internet" | null;
  networkConfig: NetworkConfig | null;

  // Step 6
  credentials: Record<string, { username: string; password: string }>;

  // Step 7 — install
  isInstalling: boolean;
  installProgress: InstallStep[];
  installPath: string;
  installLogs: string[];

  // Step 8 — done
  serviceStatuses: ServiceStatus[];

  // Navigation actions
  goToStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  completeStep: (step: number) => void;

  // Selection setters
  setSystemCheck: (result: SystemCheckResult) => void;
  setEdition: (edition: WizardState["edition"]) => void;
  setLlmMode: (mode: WizardState["llmMode"]) => void;
  setLlmConfig: (config: LlmConfig) => void;
  togglePackage: (pkg: string) => void;
  setSelectedPackages: (packages: string[]) => void;
  setNetworkMode: (mode: WizardState["networkMode"]) => void;
  setNetworkConfig: (config: NetworkConfig) => void;
  setCredentials: (creds: Record<string, { username: string; password: string }>) => void;

  // Install actions
  startInstall: () => void;
  setInstallPath: (path: string) => void;
  updateInstallStep: (id: string, status: InstallStep["status"], message?: string) => void;
  appendInstallLog: (line: string) => void;
  setServiceStatuses: (statuses: ServiceStatus[]) => void;
}

export const TOTAL_STEPS = 9; // Steps 0–8

export const useWizardStore = create<WizardState>()((set) => ({
  appMode: "wizard",
  setAppMode: (appMode) => set({ appMode }),

  installState: null,
  setInstallState: (installState) => set({ installState }),

  managementTab: "dashboard",
  setManagementTab: (managementTab) => set({ managementTab }),

  currentStep: 0,
  completedSteps: [],

  systemCheck: null,
  detectedServices: [],

  edition: null,
  llmMode: null,
  llmConfig: null,
  selectedPackages: [],
  forceReinstallPackages: [],
  networkMode: null,
  networkConfig: null,
  credentials: {},
  isInstalling: false,
  installProgress: [],
  installPath: "~/.opentang",
  installLogs: [],
  serviceStatuses: [],

  goToStep: (step) =>
    set({ currentStep: Math.max(0, Math.min(step, TOTAL_STEPS - 1)) }),

  nextStep: () =>
    set((state) => ({
      currentStep: Math.min(state.currentStep + 1, TOTAL_STEPS - 1),
    })),

  prevStep: () =>
    set((state) => ({
      currentStep: Math.max(state.currentStep - 1, 0),
    })),

  completeStep: (step) =>
    set((state) => ({
      completedSteps: state.completedSteps.includes(step)
        ? state.completedSteps
        : [...state.completedSteps, step],
    })),

  setSystemCheck: (result) => set({ systemCheck: result }),
  setDetectedServices: (detectedServices) => set({ detectedServices }),
  setEdition: (edition) => set({ edition }),
  setLlmMode: (llmMode) => set({ llmMode }),
  setLlmConfig: (llmConfig) => set({ llmConfig }),
  setNetworkMode: (networkMode) => set({ networkMode }),
  setNetworkConfig: (networkConfig) => set({ networkConfig }),
  setCredentials: (credentials) => set({ credentials }),

  togglePackage: (pkg) =>
    set((state) => ({
      selectedPackages: state.selectedPackages.includes(pkg)
        ? state.selectedPackages.filter((p) => p !== pkg)
        : [...state.selectedPackages, pkg],
    })),

  setSelectedPackages: (packages) => set({ selectedPackages: packages }),

  toggleForceReinstall: (id) =>
    set((state) => ({
      forceReinstallPackages: state.forceReinstallPackages.includes(id)
        ? state.forceReinstallPackages.filter((p) => p !== id)
        : [...state.forceReinstallPackages, id],
    })),

  startInstall: () => set({ isInstalling: true, installLogs: [] }),

  setInstallPath: (installPath) => set({ installPath }),

  updateInstallStep: (id, status, message) =>
    set((state) => ({
      installProgress: state.installProgress.map((step) =>
        step.id === id ? { ...step, status, ...(message !== undefined ? { message } : {}) } : step
      ),
    })),

  appendInstallLog: (line) =>
    set((state) => ({
      installLogs: [...state.installLogs, line],
    })),

  setServiceStatuses: (serviceStatuses) => set({ serviceStatuses }),
}));
