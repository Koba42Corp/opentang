import { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Send, Bot, ExternalLink, Loader, WifiOff, RefreshCcw } from "lucide-react";
import { ServiceStatus } from "../../store/useWizardStore";

interface GatewayStatus {
  online: boolean;
  url: string;
  edition: string | null;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

interface ChatPanelProps {
  installPath: string;
  edition: string | null;
  services?: ServiceStatus[];
}

function editionLabel(edition: string | null): string {
  if (edition === "openclaw") return "OpenClaw";
  if (edition === "hermes") return "Hermes";
  if (edition === "nanoclaw") return "NanoClaw";
  return "AI Assistant";
}

function buildSystemContext(services: ServiceStatus[]): string {
  if (!services.length) return "";
  const running = services.filter(s => s.status === "running").map(s => s.name);
  const stopped = services.filter(s => s.status !== "running").map(s => s.name);
  let ctx = "";
  if (running.length) ctx += `Running services: ${running.join(", ")}\n`;
  if (stopped.length) ctx += `Stopped/errored services: ${stopped.join(", ")}\n`;
  return ctx;
}

export function ChatPanel({ installPath, edition, services = [] }: ChatPanelProps) {
  const [gateway, setGateway] = useState<GatewayStatus | null>(null);
  const [checking, setChecking] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const contextSentRef = useRef(false);

  const checkGateway = useCallback(async () => {
    setChecking(true);
    try {
      const status = await invoke<GatewayStatus>("chat_check_gateway", { installPath });
      setGateway(status);
    } catch {
      setGateway({ online: false, url: `http://localhost:18789`, edition: null });
    } finally {
      setChecking(false);
    }
  }, [installPath]);

  useEffect(() => {
    checkGateway();
  }, [checkGateway]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || sending || !gateway?.online) return;

    setInput("");
    setSending(true);

    // Append user message
    setMessages(prev => [...prev, { role: "user", content: text }]);

    // Append empty assistant message to stream into
    setMessages(prev => [...prev, { role: "assistant", content: "", streaming: true }]);

    // Build context on first message only
    const context = !contextSentRef.current ? buildSystemContext(services) : undefined;
    if (!contextSentRef.current) contextSentRef.current = true;

    // Set up stream listeners
    const unlistenChunk = await listen<{ text: string }>("chat-chunk", (event) => {
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === "assistant") {
          updated[updated.length - 1] = {
            ...last,
            content: last.content + event.payload.text,
            streaming: true,
          };
        }
        return updated;
      });
    });

    const unlistenDone = await listen("chat-done", () => {
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === "assistant") {
          updated[updated.length - 1] = { ...last, streaming: false };
        }
        return updated;
      });
      setSending(false);
      unlistenChunk();
      unlistenDone();
      unlistenError();
    });

    const unlistenError = await listen<string>("chat-error", (event) => {
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === "assistant") {
          updated[updated.length - 1] = {
            role: "assistant",
            content: `⚠️ ${event.payload}`,
            streaming: false,
          };
        }
        return updated;
      });
      setSending(false);
      unlistenChunk();
      unlistenDone();
      unlistenError();
    });

    try {
      await invoke("chat_send", {
        message: text,
        installPath,
        context: context || null,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === "assistant") {
          updated[updated.length - 1] = {
            role: "assistant",
            content: `⚠️ ${msg}`,
            streaming: false,
          };
        }
        return updated;
      });
      setSending(false);
      unlistenChunk();
      unlistenDone();
      unlistenError();
    }
  }, [input, sending, gateway, installPath, services]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const label = editionLabel(edition ?? gateway?.edition ?? null);

  // ── Offline state ────────────────────────────────────────────────────────
  if (checking) {
    return (
      <div className="rounded-xl border border-ot-border bg-ot-surface p-4 flex items-center gap-3 text-ot-text-muted text-sm">
        <Loader className="w-4 h-4 animate-spin text-ot-orange" />
        Connecting to {label}…
      </div>
    );
  }

  if (!gateway?.online) {
    return (
      <div className="rounded-xl border border-ot-border bg-ot-surface p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm font-medium text-ot-text-muted">
            <WifiOff className="w-4 h-4" />
            {label} is offline
          </div>
          <button
            onClick={checkGateway}
            className="flex items-center gap-1.5 text-xs text-ot-orange hover:text-orange-400 transition-colors"
          >
            <RefreshCcw className="w-3 h-3" /> Retry
          </button>
        </div>
        <p className="text-xs text-ot-text-muted leading-relaxed">
          Start your AI agent container to enable the chat assistant.
          Once running, it will appear here automatically.
        </p>
      </div>
    );
  }

  // ── Online chat UI ───────────────────────────────────────────────────────
  return (
    <div className="rounded-xl border border-ot-border bg-ot-surface flex flex-col" style={{ height: "420px" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-ot-border">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-ot-success animate-pulse" />
          <Bot className="w-4 h-4 text-ot-orange" />
          <span className="text-sm font-semibold text-ot-text">{label}</span>
          <span className="text-xs text-ot-text-muted">· AI Assistant</span>
        </div>
        <button
          onClick={() => openUrl(gateway.url)}
          className="flex items-center gap-1.5 text-xs text-ot-text-muted hover:text-ot-orange transition-colors"
          title="Open full Control UI"
        >
          <ExternalLink className="w-3 h-3" />
          Full UI
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-ot-text-muted">
            <Bot className="w-8 h-8 mb-2 text-ot-border" />
            <p className="text-sm font-medium">Ask {label} anything</p>
            <p className="text-xs mt-1 max-w-xs">
              Troubleshoot services, check logs, get help with your stack
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-ot-orange text-black font-medium"
                  : "bg-ot-elevated text-ot-text border border-ot-border"
              }`}
            >
              {msg.content || (msg.streaming ? (
                <span className="flex items-center gap-1 text-ot-text-muted">
                  <span className="w-1.5 h-1.5 rounded-full bg-ot-orange animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-ot-orange animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-ot-orange animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
              ) : "")}
              {msg.streaming && msg.content && (
                <span className="inline-block w-0.5 h-3.5 bg-ot-orange animate-pulse ml-0.5 align-middle" />
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-2 border-t border-ot-border flex items-end gap-2">
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Message ${label}… (Enter to send)`}
          disabled={sending}
          rows={1}
          className="flex-1 resize-none bg-ot-elevated border border-ot-border rounded-lg px-3 py-2 text-sm text-ot-text placeholder:text-ot-text-muted focus:outline-none focus:border-ot-orange transition-colors disabled:opacity-50"
          style={{ maxHeight: "80px" }}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || sending}
          className="flex-shrink-0 w-9 h-9 rounded-lg bg-ot-orange hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
        >
          {sending ? (
            <Loader className="w-4 h-4 animate-spin text-black" />
          ) : (
            <Send className="w-4 h-4 text-black" />
          )}
        </button>
      </div>
    </div>
  );
}
