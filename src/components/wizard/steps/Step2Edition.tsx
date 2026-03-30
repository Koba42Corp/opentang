import { Layers, ArrowRight, ArrowLeft, Zap, Server, Cpu } from "lucide-react";
import { useWizardStore } from "../../../store/useWizardStore";
import { Button } from "../../shared/Button";

interface Edition {
  id: "nanoclaw" | "hermes" | "openclaw";
  name: string;
  tagline: string;
  ram: string;
  disk: string;
  bestFor: string;
  features: string[];
  recommended?: boolean;
  Icon: React.ComponentType<{ className?: string }>;
}

const EDITIONS: Edition[] = [
  {
    id: "nanoclaw",
    name: "NanoClaw",
    tagline: "Minimal & local",
    ram: "~2 GB",
    disk: "~10 GB",
    bestFor: "Single user, local LLM",
    features: ["Core services only", "Minimal footprint", "Fast startup", "Low power usage"],
    Icon: Zap,
  },
  {
    id: "hermes",
    name: "Hermes",
    tagline: "Balanced",
    ram: "~4 GB",
    disk: "~20 GB",
    bestFor: "Home lab",
    features: ["All core services", "Monitoring stack", "Git server", "Recommended for most"],
    recommended: true,
    Icon: Server,
  },
  {
    id: "openclaw",
    name: "OpenClaw",
    tagline: "Full stack",
    ram: "~8 GB",
    disk: "~40 GB",
    bestFor: "Power users",
    features: ["Everything in Hermes", "Full AI toolchain", "Workflow automation", "All optional services"],
    Icon: Cpu,
  },
];

export default function Step2Edition() {
  const { nextStep, prevStep, completeStep, currentStep, edition, setEdition } = useWizardStore();

  function handleContinue() {
    completeStep(currentStep);
    nextStep();
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Layers className="w-6 h-6 text-ot-orange-500" />
          <h1 className="text-2xl font-bold text-ot-text">Choose Your Edition</h1>
        </div>
        <p className="text-ot-text-secondary text-sm">
          Select the edition that best fits your needs and available resources.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {EDITIONS.map(({ id, name, tagline, ram, disk, bestFor, features, recommended, Icon }) => {
          const isSelected = edition === id;
          return (
            <button
              key={id}
              onClick={() => setEdition(id)}
              className={[
                "relative text-left rounded-xl border p-5 transition-all duration-150",
                "bg-ot-elevated focus:outline-none",
                isSelected
                  ? "border-ot-orange-500 ring-2 ring-ot-orange-500"
                  : "border-ot-border hover:border-ot-orange-500/40",
              ].join(" ")}
            >
              {recommended && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-ot-orange-500 text-ot-text-inverse text-xs font-semibold whitespace-nowrap">
                  Recommended
                </span>
              )}

              {/* Radio indicator */}
              <div className="flex items-center justify-between mb-4">
                <div className={[
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                  isSelected ? "border-ot-orange-500 bg-ot-orange-500" : "border-ot-border",
                ].join(" ")}>
                  {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <Icon className={["w-5 h-5", isSelected ? "text-ot-orange-500" : "text-ot-text-muted"].join(" ")} />
              </div>

              <h3 className="text-ot-text font-bold text-lg mb-0.5">{name}</h3>
              <p className="text-ot-text-secondary text-xs mb-4">{tagline}</p>

              {/* Resource badges */}
              <div className="flex gap-2 mb-4">
                <span className="px-2 py-1 rounded bg-ot-overlay border border-ot-border text-ot-text-secondary text-xs font-mono">
                  {ram} RAM
                </span>
                <span className="px-2 py-1 rounded bg-ot-overlay border border-ot-border text-ot-text-secondary text-xs font-mono">
                  {disk} disk
                </span>
              </div>

              <p className="text-ot-text-muted text-xs mb-3">Best for: {bestFor}</p>

              <ul className="space-y-1.5">
                {features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-ot-text-secondary">
                    <span className={["w-1.5 h-1.5 rounded-full flex-shrink-0", isSelected ? "bg-ot-orange-500" : "bg-ot-text-muted"].join(" ")} />
                    {f}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={prevStep}>
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <Button onClick={handleContinue} disabled={!edition}>
          Continue
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
