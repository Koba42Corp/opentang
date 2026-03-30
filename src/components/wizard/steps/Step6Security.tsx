import { useEffect, useState } from "react";
import { Shield, ArrowRight, ArrowLeft, Eye, EyeOff, Copy, Download, AlertTriangle } from "lucide-react";
import { useWizardStore } from "../../../store/useWizardStore";
import { Button } from "../../shared/Button";

interface ServiceCred {
  service: string;
  username: string;
  passwordKey: string;
}

const SERVICES: ServiceCred[] = [
  { service: "Coolify (Admin)", username: "admin", passwordKey: "coolify" },
  { service: "Portainer", username: "admin", passwordKey: "portainer" },
  { service: "Database", username: "opentang", passwordKey: "database" },
  { service: "Secret Key", username: "—", passwordKey: "secretKey" },
  { service: "Gitea", username: "gitadmin", passwordKey: "gitea" },
  { service: "Grafana", username: "admin", passwordKey: "grafana" },
];

const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*";

function generatePassword(length = 24): string {
  const values = new Uint8Array(length);
  crypto.getRandomValues(values);
  return Array.from(values)
    .map((v) => CHARSET[v % CHARSET.length])
    .join("");
}

export default function Step6Security() {
  const { nextStep, prevStep, completeStep, currentStep, credentials, setCredentials } = useWizardStore();

  const [revealAll, setRevealAll] = useState(false);
  const [copied, setCopied] = useState(false);

  // Generate credentials on first mount
  useEffect(() => {
    if (Object.keys(credentials).length === 0) {
      const creds: Record<string, { username: string; password: string }> = {};
      SERVICES.forEach(({ service, username, passwordKey }) => {
        creds[passwordKey] = { username, password: generatePassword() };
        void service; // suppress unused warning
      });
      setCredentials(creds);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleContinue() {
    completeStep(currentStep);
    nextStep();
  }

  function handleCopyAll() {
    const lines = SERVICES.map(({ service, username, passwordKey }) => {
      const cred = credentials[passwordKey];
      return `${service}\n  Username: ${cred?.username ?? username}\n  Password: ${cred?.password ?? ""}`;
    });
    const text = `OpenTang Credentials\nGenerated: ${new Date().toISOString()}\n${"=".repeat(40)}\n\n${lines.join("\n\n")}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleDownload() {
    const lines = SERVICES.map(({ service, username, passwordKey }) => {
      const cred = credentials[passwordKey];
      return `${service}\n  Username: ${cred?.username ?? username}\n  Password: ${cred?.password ?? ""}`;
    });
    const text = `OpenTang Credentials\nGenerated: ${new Date().toISOString()}\n${"=".repeat(40)}\n\n${lines.join("\n\n")}\n\nIMPORTANT: Store this file securely. These credentials cannot be recovered after installation.\n`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "opentang-credentials.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  const hasCredentials = Object.keys(credentials).length > 0;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-6 h-6 text-ot-orange-500" />
          <h1 className="text-2xl font-bold text-ot-text">Security Hardening</h1>
        </div>
        <p className="text-ot-text-secondary text-sm">
          Auto-generated strong credentials for all services. Stored locally — never transmitted.
        </p>
      </div>

      {/* Warning banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-ot-warning/10 border border-ot-warning/30 mb-5">
        <AlertTriangle className="w-5 h-5 text-ot-warning flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-ot-warning">Save these now.</p>
          <p className="text-xs text-ot-warning/80 mt-0.5">These credentials cannot be recovered after installation. Download or copy them before continuing.</p>
        </div>
      </div>

      {/* Credentials table */}
      <div className="rounded-xl border border-ot-border bg-ot-elevated overflow-hidden mb-4">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-ot-border">
          <span className="text-xs font-semibold text-ot-text-secondary uppercase tracking-wider">Generated credentials</span>
          <button
            onClick={() => setRevealAll((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-ot-orange-400 hover:text-ot-orange-300 transition-colors"
          >
            {revealAll ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {revealAll ? "Hide all" : "Reveal all"}
          </button>
        </div>

        {/* Table header */}
        <div className="grid grid-cols-3 gap-4 px-4 py-2 border-b border-ot-border bg-ot-overlay">
          <span className="text-xs text-ot-text-muted font-medium">Service</span>
          <span className="text-xs text-ot-text-muted font-medium">Username</span>
          <span className="text-xs text-ot-text-muted font-medium">Password</span>
        </div>

        {SERVICES.map(({ service, username, passwordKey }, i) => {
          const cred = credentials[passwordKey];
          return (
            <div
              key={passwordKey}
              className={[
                "grid grid-cols-3 gap-4 px-4 py-3 items-center",
                i !== SERVICES.length - 1 ? "border-b border-ot-border" : "",
              ].join(" ")}
            >
              <span className="text-sm text-ot-text">{service}</span>
              <span className="text-sm text-ot-text-secondary font-mono">{cred?.username ?? username}</span>
              <div className="font-mono text-xs">
                {revealAll ? (
                  <span className="text-ot-text break-all">{cred?.password ?? "—"}</span>
                ) : (
                  <span className="text-ot-text-muted tracking-widest">{"•".repeat(12)}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={handleCopyAll}
          disabled={!hasCredentials}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-ot-border bg-ot-elevated text-sm text-ot-text hover:bg-ot-overlay transition-colors disabled:opacity-50"
        >
          <Copy className="w-4 h-4" />
          {copied ? "Copied!" : "Copy all"}
        </button>
        <button
          onClick={handleDownload}
          disabled={!hasCredentials}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-ot-border bg-ot-elevated text-sm text-ot-text hover:bg-ot-overlay transition-colors disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          Download .txt
        </button>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={prevStep}>
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <Button onClick={handleContinue} disabled={!hasCredentials}>
          Continue
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
