import { Globe, ArrowRight, ArrowLeft } from "lucide-react";
import { useWizardStore } from "../../../store/useWizardStore";
import { Button } from "../../shared/Button";
import { Card } from "../../shared/Card";

export default function Step5Network() {
  const { nextStep, prevStep, completeStep, currentStep } = useWizardStore();

  function handleContinue() {
    completeStep(currentStep);
    nextStep();
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Globe className="w-6 h-6 text-ot-orange-500" />
          <h1 className="text-2xl font-bold text-ot-text">Network Setup</h1>
        </div>
        <p className="text-ot-text-secondary text-sm">
          Configure how your services will be accessible: localhost only, LAN, or
          internet-facing with automatic SSL.
        </p>
      </div>

      <Card>
        <div className="flex items-center justify-center py-12 flex-col gap-4">
          <div className="w-14 h-14 rounded-full bg-ot-overlay border border-ot-border flex items-center justify-center">
            <Globe className="w-7 h-7 text-ot-text-muted" />
          </div>
          <div className="text-center">
            <p className="text-ot-text font-semibold mb-1">Network Mode</p>
            <p className="text-ot-text-secondary text-sm max-w-sm">
              Local / LAN / internet-facing mode selection, domain configuration,
              and Traefik + Let's Encrypt auto-SSL setup coming in the next milestone.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-ot-overlay border border-ot-border text-ot-text-muted text-xs font-mono">
            M2 feature
          </span>
        </div>
      </Card>

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
