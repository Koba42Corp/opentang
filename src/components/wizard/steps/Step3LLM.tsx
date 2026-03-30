import { useState } from "react";
import { Cpu, ArrowRight, ArrowLeft, Cloud, Server, SkipForward, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { useWizardStore } from "../../../store/useWizardStore";
import { Button } from "../../shared/Button";

interface OllamaModel {
  id: string;
  label: string;
  size: string;
  ramGb: number;
  note?: string;
}

const OLLAMA_MODELS: OllamaModel[] = [
  { id: "llama3.2:3b", label: "llama3.2:3b", size: "~2 GB", ramGb: 2, note: "Recommended for NanoClaw" },
  { id: "llama3.1:8b", label: "llama3.1:8b", size: "~5 GB", ramGb: 5, note: "Balanced" },
  { id: "mistral:7b", label: "mistral:7b", size: "~4 GB", ramGb: 4, note: "Smart" },
  { id: "phi3:mini", label: "phi3:mini", size: "~1.8 GB", ramGb: 1.8, note: "Tiny & fast" },
  { id: "gemma2:9b", label: "gemma2:9b", size: "~5.5 GB", ramGb: 5.5, note: "Google's model" },
];

const OPENAI_MODELS = ["gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"];
const ANTHROPIC_MODELS = ["claude-3-5-sonnet-20241022", "claude-3-haiku-20240307"];

type LlmModeType = "local" | "cloud" | "skip";
type CloudProvider = "openai" | "anthropic" | "custom";

export default function Step3LLM() {
  const { nextStep, prevStep, completeStep, currentStep, llmMode, llmConfig, setLlmMode, setLlmConfig, systemCheck } = useWizardStore();

  const [selectedMode, setSelectedMode] = useState<LlmModeType | null>(llmMode);
  const [ollamaModel, setOllamaModel] = useState(llmConfig?.model ?? "llama3.2:3b");
  const [cloudProvider, setCloudProvider] = useState<CloudProvider>((llmConfig?.provider as CloudProvider) ?? "openai");
  const [cloudModel, setCloudModel] = useState(llmConfig?.model ?? "gpt-4o");
  const [apiKey, setApiKey] = useState(llmConfig?.apiKey ?? "");
  const [baseUrl, setBaseUrl] = useState(llmConfig?.baseUrl ?? "");
  const [customModel, setCustomModel] = useState(llmConfig?.model ?? "");
  const [showKey, setShowKey] = useState(false);

  const availableRam = systemCheck?.ram_available_gb ?? 99;
  const selectedOllamaModel = OLLAMA_MODELS.find((m) => m.id === ollamaModel);
  const ramWarning = selectedMode === "local" && selectedOllamaModel && selectedOllamaModel.ramGb > availableRam;

  function handleContinue() {
    if (!selectedMode) return;
    setLlmMode(selectedMode);
    if (selectedMode === "local") {
      setLlmConfig({ provider: "ollama", model: ollamaModel });
    } else if (selectedMode === "cloud") {
      const model = cloudProvider === "openai" ? cloudModel
        : cloudProvider === "anthropic" ? cloudModel
        : customModel;
      setLlmConfig({
        provider: cloudProvider,
        model,
        apiKey,
        baseUrl: cloudProvider === "custom" ? baseUrl : undefined,
      });
    }
    completeStep(currentStep);
    nextStep();
  }

  const canContinue = selectedMode === "local" || selectedMode === "skip" ||
    (selectedMode === "cloud" && apiKey.trim().length > 0 && (cloudProvider !== "custom" || (baseUrl.trim().length > 0 && customModel.trim().length > 0)));

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Cpu className="w-6 h-6 text-ot-orange-500" />
          <h1 className="text-2xl font-bold text-ot-text">LLM Configuration</h1>
        </div>
        <p className="text-ot-text-secondary text-sm">
          Connect a local LLM via Ollama, use a cloud API key, or skip for now.
        </p>
      </div>

      <div className="space-y-3 mb-6">
        {/* Option A: Local LLM */}
        <div
          className={[
            "rounded-xl border transition-all cursor-pointer",
            "bg-ot-elevated",
            selectedMode === "local"
              ? "border-ot-orange-500 ring-2 ring-ot-orange-500"
              : "border-ot-border hover:border-ot-orange-500/40",
          ].join(" ")}
          onClick={() => setSelectedMode("local")}
        >
          <div className="p-5">
            <div className="flex items-center gap-3">
              <div className={[
                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0",
                selectedMode === "local" ? "border-ot-orange-500 bg-ot-orange-500" : "border-ot-border",
              ].join(" ")}>
                {selectedMode === "local" && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <Server className={["w-4 h-4", selectedMode === "local" ? "text-ot-orange-500" : "text-ot-text-muted"].join(" ")} />
              <div>
                <p className="text-ot-text font-semibold text-sm">Local LLM (Ollama)</p>
                <p className="text-ot-text-secondary text-xs">Run models locally — private, no API costs</p>
              </div>
            </div>

            {selectedMode === "local" && (
              <div className="mt-4 ml-8 space-y-3" onClick={(e) => e.stopPropagation()}>
                <div>
                  <label className="block text-xs text-ot-text-secondary mb-1.5">Model</label>
                  <select
                    value={ollamaModel}
                    onChange={(e) => setOllamaModel(e.target.value)}
                    className="w-full bg-ot-overlay border border-ot-border rounded-lg px-3 py-2 text-sm text-ot-text focus:outline-none focus:border-ot-orange-500"
                  >
                    {OLLAMA_MODELS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label} — {m.size}{m.note ? ` (${m.note})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {ramWarning && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-ot-warning/10 border border-ot-warning/30">
                    <AlertTriangle className="w-4 h-4 text-ot-warning flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-ot-warning">
                      This model requires ~{selectedOllamaModel?.ramGb} GB RAM but only {availableRam.toFixed(1)} GB is available.
                      Performance may be degraded.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Option B: Cloud API */}
        <div
          className={[
            "rounded-xl border transition-all cursor-pointer",
            "bg-ot-elevated",
            selectedMode === "cloud"
              ? "border-ot-orange-500 ring-2 ring-ot-orange-500"
              : "border-ot-border hover:border-ot-orange-500/40",
          ].join(" ")}
          onClick={() => setSelectedMode("cloud")}
        >
          <div className="p-5">
            <div className="flex items-center gap-3">
              <div className={[
                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0",
                selectedMode === "cloud" ? "border-ot-orange-500 bg-ot-orange-500" : "border-ot-border",
              ].join(" ")}>
                {selectedMode === "cloud" && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <Cloud className={["w-4 h-4", selectedMode === "cloud" ? "text-ot-orange-500" : "text-ot-text-muted"].join(" ")} />
              <div>
                <p className="text-ot-text font-semibold text-sm">Cloud API</p>
                <p className="text-ot-text-secondary text-xs">Use OpenAI, Anthropic, or a custom endpoint</p>
              </div>
            </div>

            {selectedMode === "cloud" && (
              <div className="mt-4 ml-8 space-y-3" onClick={(e) => e.stopPropagation()}>
                {/* Provider picker */}
                <div className="flex gap-2">
                  {(["openai", "anthropic", "custom"] as CloudProvider[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => {
                        setCloudProvider(p);
                        setCloudModel(p === "openai" ? "gpt-4o" : p === "anthropic" ? "claude-3-5-sonnet-20241022" : "");
                      }}
                      className={[
                        "flex-1 py-1.5 rounded-lg border text-xs font-medium transition-colors",
                        cloudProvider === p
                          ? "bg-ot-orange-500 border-ot-orange-500 text-white"
                          : "bg-ot-overlay border-ot-border text-ot-text-secondary hover:border-ot-orange-500/40",
                      ].join(" ")}
                    >
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Model dropdown */}
                {cloudProvider !== "custom" && (
                  <div>
                    <label className="block text-xs text-ot-text-secondary mb-1.5">Model</label>
                    <select
                      value={cloudModel}
                      onChange={(e) => setCloudModel(e.target.value)}
                      className="w-full bg-ot-overlay border border-ot-border rounded-lg px-3 py-2 text-sm text-ot-text focus:outline-none focus:border-ot-orange-500"
                    >
                      {(cloudProvider === "openai" ? OPENAI_MODELS : ANTHROPIC_MODELS).map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Custom fields */}
                {cloudProvider === "custom" && (
                  <>
                    <div>
                      <label className="block text-xs text-ot-text-secondary mb-1.5">Base URL</label>
                      <input
                        type="url"
                        value={baseUrl}
                        onChange={(e) => setBaseUrl(e.target.value)}
                        placeholder="https://api.example.com/v1"
                        className="w-full bg-ot-overlay border border-ot-border rounded-lg px-3 py-2 text-sm text-ot-text placeholder:text-ot-text-muted focus:outline-none focus:border-ot-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-ot-text-secondary mb-1.5">Model name</label>
                      <input
                        type="text"
                        value={customModel}
                        onChange={(e) => setCustomModel(e.target.value)}
                        placeholder="model-name"
                        className="w-full bg-ot-overlay border border-ot-border rounded-lg px-3 py-2 text-sm text-ot-text placeholder:text-ot-text-muted focus:outline-none focus:border-ot-orange-500"
                      />
                    </div>
                  </>
                )}

                {/* API key */}
                <div>
                  <label className="block text-xs text-ot-text-secondary mb-1.5">API Key</label>
                  <div className="relative">
                    <input
                      type={showKey ? "text" : "password"}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={cloudProvider === "openai" ? "sk-..." : cloudProvider === "anthropic" ? "sk-ant-..." : "Your API key"}
                      className="w-full bg-ot-overlay border border-ot-border rounded-lg px-3 py-2 pr-10 text-sm text-ot-text placeholder:text-ot-text-muted focus:outline-none focus:border-ot-orange-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-ot-text-muted hover:text-ot-text transition-colors"
                    >
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-ot-text-muted mt-1">Stored locally only — never transmitted by this app.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Option C: Skip */}
        <div
          className={[
            "rounded-xl border transition-all cursor-pointer",
            "bg-ot-elevated",
            selectedMode === "skip"
              ? "border-ot-orange-500 ring-2 ring-ot-orange-500"
              : "border-ot-border hover:border-ot-orange-500/40",
          ].join(" ")}
          onClick={() => setSelectedMode("skip")}
        >
          <div className="p-5 flex items-center gap-3">
            <div className={[
              "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0",
              selectedMode === "skip" ? "border-ot-orange-500 bg-ot-orange-500" : "border-ot-border",
            ].join(" ")}>
              {selectedMode === "skip" && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>
            <SkipForward className={["w-4 h-4", selectedMode === "skip" ? "text-ot-orange-500" : "text-ot-text-muted"].join(" ")} />
            <div>
              <p className="text-ot-text font-semibold text-sm">Skip for now</p>
              <p className="text-ot-text-secondary text-xs">You can configure LLM settings later in the dashboard.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={prevStep}>
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <Button onClick={handleContinue} disabled={!canContinue}>
          Continue
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
