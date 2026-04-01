import { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Send, Loader, Sparkles, LogIn, Key, RefreshCcw } from "lucide-react";
import { ServiceStatus } from "../../store/useWizardStore";

interface SpockAuthStatus {
  authenticated: boolean;
  auth_type: string | null;
  account: string | null;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

interface SpockPanelProps {
  services?: ServiceStatus[];
}

function buildContext(services: ServiceStatus[]): string {
  const running = services.filter(s => s.status === "running").map(s => s.name);
  const stopped = services.filter(s => s.status !== "running").map(s => s.name);
  let ctx = "";
  if (running.length) ctx += `Running: ${running.join(", ")}\n`;
  if (stopped.length) ctx += `Stopped: ${stopped.join(", ")}\n`;
  return ctx;
}

export function SpockPanel({ services = [] }: SpockPanelProps) {
  const [auth, setAuth] = useState<SpockAuthStatus | null>(null);
  const [checking, setChecking] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const contextSentRef = useRef(false);

  const checkAuth = useCallback(async () => {
    setChecking(true);
    try {
      const status = await invoke<SpockAuthStatus>("spock_check_auth");
      setAuth(status);
    } catch {
      setAuth({ authenticated: false, auth_type: null, account: null });
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleLogin = async (consoleMode: boolean) => {
    setLoginLoading(true);
    setLoginError(null);
    try {
      await invoke("spock_launch_login", { consoleMode });
      setTimeout(checkAuth, 12000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setLoginError(msg);
    } finally {
      setTimeout(() => setLoginLoading(false), 3000);
    }
  };

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);
    setMessages(prev => [...prev, { role: "user", content: text }]);
    setMessages(prev => [...prev, { role: "assistant", content: "", streaming: true }]);

    const context = !contextSentRef.current ? buildContext(services) : undefined;
    if (!contextSentRef.current) contextSentRef.current = true;

    const unlistenChunk = await listen<{ text: string }>("spock-chunk", (e) => {
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === "assistant") updated[updated.length - 1] = { ...last, content: last.content + e.payload.text, streaming: true };
        return updated;
      });
    });

    const cleanup = () => { setSending(false); unlistenChunk(); unlistenDone(); unlistenError(); };

    const unlistenDone = await listen("spock-done", () => {
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === "assistant") updated[updated.length - 1] = { ...last, streaming: false };
        return updated;
      });
      cleanup();
    });

    const unlistenError = await listen<string>("spock-error", (e) => {
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === "assistant") updated[updated.length - 1] = { role: "assistant", content: `⚠️ ${e.payload}`, streaming: false };
        return updated;
      });
      cleanup();
    });

    try {
      await invoke("spock_send", { message: text, context: context || null });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === "assistant") updated[updated.length - 1] = { role: "assistant", content: `⚠️ ${msg}`, streaming: false };
        return updated;
      });
      cleanup();
    }
  }, [input, sending, services]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  if (checking) return (
    <div className="rounded-xl border border-ot-border bg-ot-surface p-4 flex items-center gap-3 text-ot-text-muted text-sm">
      <Loader className="w-4 h-4 animate-spin text-ot-orange" />
      Checking AI status…
    </div>
  );

  if (!auth?.authenticated) return (
    <div className="rounded-xl border border-ot-border bg-ot-surface p-5">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-ot-orange" />
        <span className="text-sm font-semibold text-ot-text">AI Assistant</span>
        <span className="text-xs bg-ot-orange/10 text-ot-orange px-1.5 py-0.5 rounded font-medium">Powered by Claude</span>
      </div>
      <p className="text-xs text-ot-text-muted mb-4 leading-relaxed">
        Connect your Claude account to get an AI assistant built into your dashboard.
        Works with Claude Pro, Max, and Team subscriptions — no API key required.
      </p>
      <div className="flex flex-col gap-2">
        <button onClick={() => handleLogin(false)} disabled={loginLoading}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
          style={{ backgroundColor: '#F97316', color: '#000000' }}>
          {loginLoading ? <Loader className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
          Connect Claude Account (Subscription)
        </button>
        <button onClick={() => handleLogin(true)} disabled={loginLoading}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          style={{ backgroundColor: '#2A2A32', color: '#F8F8F8', border: '1px solid #4A4A58' }}>
          <Key className="w-3.5 h-3.5" />
          Use API Key (Console)
        </button>
      </div>
      {loginError && (
        <div className="mt-3 p-3 rounded-lg text-xs leading-relaxed" style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
          <div className="font-medium mb-1">⚠️ Could not launch login</div>
          <div style={{ color: '#8B8B9A' }}>{loginError}</div>
          {(loginError.includes("not found") || loginError.includes("binary")) && (
            <div className="mt-2 p-2 rounded" style={{ backgroundColor: 'rgba(0,0,0,0.3)', color: '#8B8B9A' }}>
              The AI binary hasn't been bundled yet in this build.<br />
              To use now, install Claude Code manually:<br />
              <code style={{ color: '#F97316' }}>npm install -g @anthropic-ai/claude-code</code><br />
              then restart OpenTang.
            </div>
          )}
        </div>
      )}
      <p className="text-xs text-ot-text-muted mt-3">
        After connecting, click to check.{" "}
        <button onClick={checkAuth} className="text-ot-orange hover:underline">Check now</button>
      </p>
    </div>
  );

  return (
    <div className="rounded-xl border border-ot-border bg-ot-surface flex flex-col" style={{ height: "420px" }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-ot-border">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-ot-success animate-pulse" />
          <Sparkles className="w-4 h-4 text-ot-orange" />
          <span className="text-sm font-semibold text-ot-text">AI Assistant</span>
          <span className="text-xs text-ot-text-muted">· {auth.auth_type ?? "Claude"}</span>
        </div>
        <button onClick={checkAuth} className="text-xs text-ot-text-muted hover:text-ot-orange transition-colors">
          <RefreshCcw className="w-3 h-3" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-ot-text-muted">
            <Sparkles className="w-8 h-8 mb-2 text-ot-border" />
            <p className="text-sm font-medium">Ask anything about your stack</p>
            <p className="text-xs mt-1 max-w-xs">Troubleshoot services, check configs, get infrastructure help</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
              msg.role === "user" ? "bg-ot-orange text-black font-medium" : "bg-ot-elevated text-ot-text border border-ot-border"
            }`}>
              {msg.content || (msg.streaming ? (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-ot-orange animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-ot-orange animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-ot-orange animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
              ) : "")}
              {msg.streaming && msg.content && <span className="inline-block w-0.5 h-3.5 bg-ot-orange animate-pulse ml-0.5 align-middle" />}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="px-3 py-2 border-t border-ot-border flex items-end gap-2">
        <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
          placeholder="Ask about your infrastructure… (Enter to send)" disabled={sending} rows={1}
          className="flex-1 resize-none bg-ot-elevated border border-ot-border rounded-lg px-3 py-2 text-sm text-ot-text placeholder:text-ot-text-muted focus:outline-none focus:border-ot-orange transition-colors disabled:opacity-50"
          style={{ maxHeight: "80px" }} />
        <button onClick={sendMessage} disabled={!input.trim() || sending}
          className="flex-shrink-0 w-9 h-9 rounded-lg bg-ot-orange hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors">
          {sending ? <Loader className="w-4 h-4 animate-spin text-black" /> : <Send className="w-4 h-4 text-black" />}
        </button>
      </div>
    </div>
  );
}
