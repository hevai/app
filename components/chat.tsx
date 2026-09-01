import { useEffect, useRef, useState } from "react";
import { MessageCircle, Trash2, X, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { clamp } from "@/lib/utils";
import { api } from "@/lib/api";
import { SessionInvalidError, streamChat } from "@/lib/compose";
import { useIdentity } from "@/contexts/identity";
import { useSession } from "@/hooks/use-session";
import { useLocale } from "@/contexts/locale";
import { MarkdownRenderer } from "@/components/markdown";
import type { ChatMessage, Project } from "@/types";

const STORAGE_PREFIX = "hevai:chat";
const TRANSCRIPT_WINDOW = 12;

function storageKey(wallet: string, projectId: string): string {
  return `${STORAGE_PREFIX}:${wallet.toLowerCase()}:${projectId}`;
}

function load(wallet: string, projectId: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(storageKey(wallet, projectId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatMessage[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (message) =>
        (message?.role === "user" || message?.role === "assistant") &&
        typeof message?.text === "string" &&
        message.text.trim().length > 0,
    );
  } catch {
    return [];
  }
}

export function Chat({ project }: { project: Project }) {
  const { address } = useIdentity();
  const { session, refreshSession } = useSession();
  const { t, err, lang } = useLocale();

  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 24, y: 0 });
  const [placed, setPlaced] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const drag = useRef<{ startX: number; startY: number; baseX: number; baseY: number; moved: boolean } | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  const size = 52;

  useEffect(() => {
    setMessages(address ? load(address, project.id) : []);
    setDraft("");
  }, [address, project.id]);

  useEffect(() => {
    if (!address || messages.length === 0) return;
    try {
      localStorage.setItem(storageKey(address, project.id), JSON.stringify(messages));
    } catch {
      // non-fatal
    }
  }, [address, project.id, messages]);

  useEffect(() => {
    const body = bodyRef.current;
    if (body) body.scrollTop = body.scrollHeight;
  }, [messages, busy, open]);

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || busy) return;
    if (!address) {
      toast.error(t("spark.needAccount"));
      return;
    }
    if (!session.active || !session.token) {
      toast.error(t("chat.needSession"));
      return;
    }

    const transcript: ChatMessage[] = [...messages, { role: "user", text }];
    setMessages([...transcript, { role: "assistant", text: "" }]);
    setDraft("");
    setBusy(true);
    try {
      const payload = await api.runAssistant({
        wallet: address,
        project: project.id,
        messages: transcript.slice(-TRANSCRIPT_WINDOW),
        locale: lang,
      });
      const result = await streamChat(payload, (delta) => {
        setMessages((current) => {
          const last = current[current.length - 1];
          if (!last || last.role !== "assistant") return current;
          return [...current.slice(0, -1), { role: "assistant", text: last.text + delta }];
        });
      });
      setMessages((current) => {
        const last = current[current.length - 1];
        if (!last || last.role !== "assistant") return current;
        return [...current.slice(0, -1), { role: "assistant", text: result.text }];
      });
      void refreshSession();
    } catch (cause) {
      if (cause instanceof SessionInvalidError) {
        toast.error(t("spark.sessionProblem"));
        void refreshSession();
      } else {
        toast.error(err(cause, "chat.failed"));
      }
      setMessages((current) => {
        const last = current[current.length - 1];
        if (last && last.role === "assistant" && !last.text) return current.slice(0, -1);
        return current;
      });
    } finally {
      setBusy(false);
    }
  };

  const clear = () => {
    if (address) {
      try {
        localStorage.removeItem(storageKey(address, project.id));
      } catch {
        // non-fatal
      }
    }
    setMessages([]);
  };

  const onPointerDown = (event: React.PointerEvent) => {
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    drag.current = {
      startX: event.clientX,
      startY: event.clientY,
      baseX: pos.x,
      baseY: pos.y,
      moved: false,
    };
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (!drag.current) return;
    const dx = event.clientX - drag.current.startX;
    const dy = event.clientY - drag.current.startY;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.current.moved = true;
    const maxX = window.innerWidth - size - 8;
    const maxY = window.innerHeight - size - 8;
    setPos({
      x: clamp(drag.current.baseX + dx, 8, maxX),
      y: clamp(drag.current.baseY + dy, 8, maxY),
    });
  };

  const onPointerUp = () => {
    if (drag.current && !drag.current.moved) {
      setOpen((value) => !value);
    }
    drag.current = null;
  };

  const bottom = placed ? undefined : "var(--sp-4)";
  const top = placed ? pos.y : undefined;
  const left = placed ? pos.x : undefined;

  return (
    <>
      {open ? (
        <div
          ref={panelRef}
          className="chat-panel"
          style={{
            left: clamp(pos.x, 8, Math.max(8, window.innerWidth - 380)),
            bottom: pos.y > window.innerHeight / 2 ? size + 16 : undefined,
            top: pos.y <= window.innerHeight / 2 ? size + 16 : undefined,
          }}
        >
          <div className="chat-head">
            <Sparkles size={15} style={{ color: "var(--accent)" }} />
            <span>{t("chat.title")}</span>
            <button
              type="button"
              className="btn btn-ghost btn-icon"
              style={{ marginLeft: "auto" }}
              onClick={clear}
              disabled={messages.length === 0}
              aria-label={t("chat.clear")}
              title={t("chat.clear")}
            >
              <Trash2 size={15} />
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-icon"
              onClick={() => setOpen(false)}
              aria-label={t("chat.close")}
            >
              <X size={15} />
            </button>
          </div>
          <div className="chat-body" ref={bodyRef}>
            {messages.length === 0 ? (
              <div className="chat-empty">
                {t("chat.emptyPre")} <strong>{project.name}</strong> {t("chat.emptyPost")}
                <div className="chat-chips">
                  {(["chat.suggestion1", "chat.suggestion2", "chat.suggestion3"] as const).map((key) => (
                    <button
                      key={key}
                      type="button"
                      className="chat-chip"
                      onClick={() => void send(t(key))}
                    >
                      {t(key)}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message, index) => {
                const thinking =
                  busy && message.role === "assistant" && index === messages.length - 1 && !message.text;
                return (
                  <div key={index} className="chat-msg" data-role={message.role}>
                    {thinking ? (
                      <span className="chat-busy">
                        <i />
                        <i />
                        <i />
                      </span>
                    ) : message.role === "assistant" ? (
                      <MarkdownRenderer content={message.text} />
                    ) : (
                      message.text
                    )}
                  </div>
                );
              })
            )}
          </div>
          <div className="chat-foot">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void send(draft);
              }}
            >
              <input
                className="input"
                placeholder={t("chat.placeholder")}
                value={draft}
                disabled={busy}
                onChange={(e) => setDraft(e.target.value)}
              />
            </form>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        className="chat-fab"
        style={{
          left,
          top,
          bottom,
          position: "fixed",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => {
          setPlaced(true);
          onPointerUp();
        }}
        aria-label={t("chat.open")}
      >
        <MessageCircle size={22} />
      </button>
    </>
  );
}
