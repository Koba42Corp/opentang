import StepNav from "./StepNav";
import { useWizardStore } from "../../store/useWizardStore";

import Step1SystemCheck from "./steps/Step1SystemCheck";
import Step2Edition from "./steps/Step2Edition";
import Step3LLM from "./steps/Step3LLM";
import Step4Packages from "./steps/Step4Packages";
import Step5Network from "./steps/Step5Network";
import Step6Security from "./steps/Step6Security";
import Step7Install from "./steps/Step7Install";
import Step8Done from "./steps/Step8Done";

const STEP_MAP: Record<number, React.ComponentType> = {
  1: Step1SystemCheck,
  2: Step2Edition,
  3: Step3LLM,
  4: Step4Packages,
  5: Step5Network,
  6: Step6Security,
  7: Step7Install,
  8: Step8Done,
};

export default function WizardShell() {
  const currentStep = useWizardStore((state) => state.currentStep);

  const StepComponent = STEP_MAP[currentStep];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-ot-bg">
      {/* Left sidebar navigation */}
      <StepNav />

      {/* Main content area */}
      <main className="flex-1 overflow-y-auto">
        <div className="min-h-full px-8 py-10 animate-fade-slide-up">
          {StepComponent ? (
            <StepComponent />
          ) : (
            // Fallback — should never hit this in normal flow
            <div className="flex items-center justify-center h-full">
              <p className="text-ot-text-muted">Unknown step: {currentStep}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
