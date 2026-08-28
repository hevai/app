import { useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function Confirm({
  open,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  tone = "danger",
  busy = false,
  onConfirm,
  onClose,
}: ConfirmProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="overlay" style={{ zIndex: 60 }} onClick={onClose}>
      <div className="modal modal-sm" onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <span className="modal-title" style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
            {tone === "danger" ? <AlertTriangle size={17} style={{ color: "var(--danger)" }} /> : null}
            {title}
          </span>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        {description ? (
          <div className="modal-body">
            <span className="confirm-desc">{description}</span>
          </div>
        ) : null}
        <div className="modal-foot">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={tone === "danger" ? "btn btn-danger-fill" : "btn btn-primary"}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
