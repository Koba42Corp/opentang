import { useWizardStore } from "./store/useWizardStore";
import Step0Welcome from "./components/wizard/steps/Step0Welcome";
import WizardShell from "./components/wizard/WizardShell";

export default function App() {
  const currentStep = useWizardStore((state) => state.currentStep);

  // Step 0 is the full-screen welcome splash. All subsequent steps
  // live inside the WizardShell with the sidebar navigation.
  if (currentStep === 0) {
    return <Step0Welcome />;
  }

  return <WizardShell />;
}
