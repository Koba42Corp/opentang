import { Shield, ArrowRight, ArrowLeft } from "lucide-react";
import { useWizardStore } from "../../../store/useWizardStore";
import { Button } from "../../shared/Button";
import { Card } from "../../shared/Card";

export default function Step6Security() {
  const { nextStep, prevStep, completeStep, currentStep } = useWizardStore();

  function handleContinue() {
    completeStep(currentStep);
    nextStep();
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-6 h-6 text-ot-orange-500" />
          <h1 className="text-2xl font-bold text-ot-text">Security Hardening</h1>
        </div>
        <p className="text-ot-text-secondary text-sm">
          Auto-generate strong credentials for all services. Secrets are stored
          locally and never transmitted.
        </p>
      </div>

      <Card>
        <div className="flex items-center justify-center py-12 flex-col gap-4">
          <div className="w-14 h-14 rounded-full bg-ot-overlay border border-ot-border flex items-center justify-center">
            <Shield className="w-7 h-7 text-ot-text-muted" />
          </div>
          <div className="text-center">
            <p className="text-ot-text font-semibold mb-1">Credential Generation</p>
            <p className="text-ot-text-secondary text-sm max-w-sm">
              Auto-generated strong passwords, local <span className="font-mono text-xs bg-ot-overlay px-1.5 py-0.5 rounded">.env</span> file creation,
              and optional Vault integration coming in the next milestone.
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
