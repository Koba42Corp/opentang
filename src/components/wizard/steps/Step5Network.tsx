import { useState } from "react";
import { Globe, ArrowRight, ArrowLeft, Monitor, Wifi, Cloud, AlertTriangle } from "lucide-react";
import { useWizardStore } from "../../../store/useWizardStore";
import { Button } from "../../shared/Button";

type NetworkModeType = "local" | "lan" | "internet";

export default function Step5Network() {
  const {
    nextStep,
    prevStep,
    completeStep,
    currentStep,
    networkMode,
    networkConfig,
    setNetworkMode,
    setNetworkConfig,
    systemCheck,
  } = useWizardStore();

  const detectedIp = systemCheck ? "192.168.1.x" : "Unknown";

  const [selectedMode, setSelectedMode] = useState<NetworkModeType | null>(networkMode);
  const [domain, setDomain] = useState(networkConfig?.domain ?? "");
  const [email, setEmail] = useState(networkConfig?.email ?? "");
  const [hostname, setHostname] = useState(networkConfig?.hostname ?? "homeserver.local");
  const [cloudflareTunnel, setCloudflareTunnel] = useState(networkConfig?.cloudflareTunnel ?? false);

  function handleContinue() {
    if (!selectedMode) return;
    setNetworkMode(selectedMode);
    setNetworkConfig({
      localIp: detectedIp,
      domain: selectedMode === "internet" ? domain : undefined,
      email: selectedMode === "internet" ? email : undefined,
      hostname: selectedMode === "lan" ? hostname : undefined,
      cloudflareTunnel: selectedMode === "internet" ? cloudflareTunnel : undefined,
    });
    completeStep(currentStep);
    nextStep();
  }

  const canContinue =
    selectedMode === "local" ||
    selectedMode === "lan" ||
    (selectedMode === "internet" && domain.trim().length > 0 && email.trim().length > 0);

  const modes: { id: NetworkModeType; label: string; sublabel: string; url: string; Icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "local", label: "Local Only", sublabel: "Accessible only on this machine", url: "http://localhost", Icon: Monitor },
    { id: "lan", label: "LAN / Home Server", sublabel: "Accessible on your home network", url: `http://${detectedIp}`, Icon: Wifi },
    { id: "internet", label: "Internet-Facing", sublabel: "Public access with auto SSL via Traefik", url: domain ? `https://${domain}` : "https://yourdomain.com", Icon: Cloud },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Globe className="w-6 h-6 text-ot-orange-500" />
          <h1 className="text-2xl font-bold text-ot-text">Network Setup</h1>
        </div>
        <p className="text-ot-text-secondary text-sm">
          Configure how your services will be accessible.
        </p>
      </div>

      <div className="space-y-3 mb-6">
        {modes.map(({ id, label, sublabel, url, Icon }) => {
          const isSelected = selectedMode === id;
          return (
            <div
              key={id}
              className={[
                "rounded-xl border transition-all cursor-pointer bg-ot-elevated",
                isSelected
                  ? "border-ot-orange-500 ring-2 ring-ot-orange-500"
                  : "border-ot-border hover:border-ot-orange-500/40",
              ].join(" ")}
              onClick={() => setSelectedMode(id)}
            >
              <div className="p-5">
                <div className="flex items-start gap-3">
                  <div className={[
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0 mt-0.5",
                    isSelected ? "border-ot-orange-500 bg-ot-orange-500" : "border-ot-border",
                  ].join(" ")}>
                    {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <Icon className={["w-4 h-4 mt-0.5 flex-shrink-0", isSelected ? "text-ot-orange-500" : "text-ot-text-muted"].join(" ")} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-ot-text font-semibold text-sm">{label}</p>
                      <span className="text-xs text-ot-text-muted font-mono bg-ot-overlay px-2 py-0.5 rounded">{url}</span>
                    </div>
                    <p className="text-ot-text-secondary text-xs mt-0.5">{sublabel}</p>

                    {/* LAN extras */}
                    {isSelected && id === "lan" && (
                      <div className="mt-4 space-y-3" onClick={(e) => e.stopPropagation()}>
                        <div>
                          <label className="block text-xs text-ot-text-secondary mb-1.5">Detected local IP</label>
                          <input
                            type="text"
                            readOnly
                            value={detectedIp}
                            className="w-full bg-ot-overlay border border-ot-border rounded-lg px-3 py-2 text-sm text-ot-text-muted font-mono focus:outline-none cursor-default"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-ot-text-secondary mb-1.5">Custom hostname (optional)</label>
                          <input
                            type="text"
                            value={hostname}
                            onChange={(e) => setHostname(e.target.value)}
                            placeholder="homeserver.local"
                            className="w-full bg-ot-overlay border border-ot-border rounded-lg px-3 py-2 text-sm text-ot-text placeholder:text-ot-text-muted focus:outline-none focus:border-ot-orange-500 font-mono"
                          />
                          <p className="text-xs text-ot-text-muted mt-1">mDNS auto-discovery via .local domains.</p>
                        </div>
                      </div>
                    )}

                    {/* Internet extras */}
                    {isSelected && id === "internet" && (
                      <div className="mt-4 space-y-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-ot-warning/10 border border-ot-warning/30">
                          <AlertTriangle className="w-3.5 h-3.5 text-ot-warning flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-ot-warning">Ensure ports 80 and 443 are open on your firewall before continuing.</p>
                        </div>
                        <div>
                          <label className="block text-xs text-ot-text-secondary mb-1.5">Domain name <span className="text-ot-error">*</span></label>
                          <input
                            type="text"
                            value={domain}
                            onChange={(e) => setDomain(e.target.value)}
                            placeholder="yourdomain.com"
                            className="w-full bg-ot-overlay border border-ot-border rounded-lg px-3 py-2 text-sm text-ot-text placeholder:text-ot-text-muted focus:outline-none focus:border-ot-orange-500 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-ot-text-secondary mb-1.5">Email for Let's Encrypt SSL <span className="text-ot-error">*</span></label>
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            className="w-full bg-ot-overlay border border-ot-border rounded-lg px-3 py-2 text-sm text-ot-text placeholder:text-ot-text-muted focus:outline-none focus:border-ot-orange-500"
                          />
                          <p className="text-xs text-ot-text-muted mt-1">SSL certificates auto-configured via Traefik + Let's Encrypt.</p>
                        </div>
                        <div
                          className="flex items-center justify-between p-3 rounded-lg bg-ot-overlay border border-ot-border cursor-pointer hover:border-ot-orange-500/40 transition-colors"
                          onClick={(e) => { e.stopPropagation(); setCloudflareTunnel((v) => !v); }}
                        >
                          <div>
                            <p className="text-sm text-ot-text font-medium">Cloudflare Tunnel</p>
                            <p className="text-xs text-ot-text-muted">Avoids port forwarding — recommended if behind NAT</p>
                          </div>
                          <div className={["relative w-9 h-5 rounded-full transition-colors", cloudflareTunnel ? "bg-ot-orange-500" : "bg-ot-overlay border border-ot-border"].join(" ")}>
                            <span className={["absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform", cloudflareTunnel ? "translate-x-4" : "translate-x-0.5"].join(" ")} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
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
