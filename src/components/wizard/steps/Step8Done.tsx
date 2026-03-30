import { PartyPopper, ExternalLink, RotateCcw } from "lucide-react";
import { useWizardStore } from "../../../store/useWizardStore";
import { Button } from "../../shared/Button";
import { Card } from "../../shared/Card";

export default function Step8Done() {
  const { completeStep, currentStep, goToStep } = useWizardStore();

  function handleFinish() {
    completeStep(currentStep);
  }

  function handleReset() {
    goToStep(0);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <PartyPopper className="w-6 h-6 text-ot-orange-500" />
          <h1 className="text-2xl font-bold text-ot-text">Done!</h1>
        </div>
        <p className="text-ot-text-secondary text-sm">
          Your stack has been configured. Here's a summary of what was set up.
        </p>
      </div>

      <Card>
        <div className="flex items-center justify-center py-12 flex-col gap-4">
          {/* Success icon */}
          <div className="w-16 h-16 rounded-full bg-ot-success/10 border border-ot-success/30 flex items-center justify-center">
            <PartyPopper className="w-8 h-8 text-ot-success" />
          </div>

          <div className="text-center">
            <p className="text-ot-text font-semibold text-lg mb-1">
              Setup Complete
            </p>
            <p className="text-ot-text-secondary text-sm max-w-sm">
              Service URLs, quick-access links to Coolify dashboard, community
              invite, and "Add More Packages" shortcut coming in the next milestone.
            </p>
          </div>

          <span className="px-3 py-1 rounded-full bg-ot-overlay border border-ot-border text-ot-text-muted text-xs font-mono">
            M3 feature
          </span>
        </div>
      </Card>

      {/* Quick links placeholder */}
      <Card className="mt-4">
        <h3 className="text-sm font-semibold text-ot-text-secondary uppercase tracking-wider mb-3">
          Quick Access
        </h3>
        <div className="space-y-2">
          {["Coolify Dashboard", "Portainer", "Gitea", "Grafana"].map((service) => (
            <div
              key={service}
              className="flex items-center justify-between py-2 px-3 rounded-lg bg-ot-overlay border border-ot-border opacity-50"
            >
              <span className="text-sm text-ot-text-secondary">{service}</span>
              <div className="flex items-center gap-2 text-ot-text-muted text-xs">
                <span className="font-mono">localhost:????</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </div>
            </div>
          ))}
        </div>
        <p className="text-ot-text-muted text-xs mt-3">
          Service URLs will be populated after installation completes.
        </p>
      </Card>

      {/* Actions */}
      <div className="flex items-center gap-3 mt-6">
        <Button variant="ghost" onClick={handleReset}>
          <RotateCcw className="w-4 h-4" />
          Start Over
        </Button>
        <Button onClick={handleFinish}>
          Finish
          <PartyPopper className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
