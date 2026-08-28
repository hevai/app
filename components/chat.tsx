import { useRef, useState } from "react";
import { MessageCircle, X, Sparkles } from "lucide-react";
import { clamp } from "@/lib/utils";

export function Chat() {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 24, y: 0 });
  const [placed, setPlaced] = useState(false);
  const drag = useRef<{ startX: number; startY: number; baseX: number; baseY: number; moved: boolean } | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const size = 52;

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
            <span>Project assistant</span>
            <button
              type="button"
              className="btn btn-ghost btn-icon"
              style={{ marginLeft: "auto" }}
              onClick={() => setOpen(false)}
              aria-label="Close chat"
            >
              <X size={15} />
            </button>
          </div>
          <div className="chat-body">
            <div className="chat-empty">
              The AI assistant isn&apos;t connected yet.
              <br />
              It arrives in the next iteration.
            </div>
          </div>
          <div className="chat-foot">
            <input className="input" placeholder="Ask about this project…" disabled />
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
        aria-label="Open project assistant"
      >
        <MessageCircle size={22} />
      </button>
    </>
  );
}
