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
}

interface WizardState {
  currentStep: number;
  completedSteps: number[];

  // System check result from M2
  systemCheck: SystemCheckResult | null;

  // Step 2
  edition: "nanoclaw" | "hermes" | "openclaw" | null;

  // Step 3
  llmMode: "local" | "cloud" | "skip" | null;
  llmConfig: LlmConfig | null;

  // Step 4
  selectedPackages: string[];

  // Step 5
  networkMode: "local" | "lan" | "internet" | null;
  networkConfig: NetworkConfig | null;

  // Step 6
  credentials: Record<string, { username: string; password: string }>;

  // Step 7
  isInstalling: boolean;
  installProgress: InstallStep[];

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
  startInstall: () => void;
  updateInstallStep: (id: string, status: InstallStep["status"]) => void;
}

export const TOTAL_STEPS = 9; // Steps 0–8

export const useWizardStore = create<WizardState>()((set) => ({
  currentStep: 0,
  completedSteps: [],

  systemCheck: null,

  edition: null,
  llmMode: null,
  llmConfig: null,
  selectedPackages: [],
  networkMode: null,
  networkConfig: null,
  credentials: {},
  isInstalling: false,
  installProgress: [],

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

  startInstall: () => set({ isInstalling: true }),

  updateInstallStep: (id, status) =>
    set((state) => ({
      installProgress: state.installProgress.map((step) =>
        step.id === id ? { ...step, status } : step
      ),
    })),
}));
