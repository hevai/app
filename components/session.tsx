import { useState } from "react";
import { Clock, Shield, X, Zap } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/hooks/use-session";

const BUDGETS = [
  { label: "$1", value: "1000000" },
  { label: "$10", value: "10000000" },
  { label: "$50", value: "50000000" },
  { label: "$100", value: "100000000" },
] as const;
const DURATIONS = [1, 6, 12, 24] as const;

export function formatUsdc(value: string): string {
  try {
    const amount = BigInt(value);
    const whole = amount / 1_000_000n;
    const fraction = ((amount % 1_000_000n) / 10_000n).toString().padStart(2, "0");
    return `${whole}.${fraction}`;
  } catch {
    return "0.00";
  }
}

function formatExpiry(expiresAt: number | null): string {
  if (!expiresAt) return "No expiry";
  const minutes = Math.max(0, Math.floor((expiresAt - Date.now()) / 60_000));
  if (minutes >= 1_440) return `${Math.floor(minutes / 1_440)}d ${Math.floor((minutes % 1_440) / 60)}h`;
  if (minutes >= 60) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  return minutes > 0 ? `${minutes}m` : "Expired";
}

export function SessionControl() {
  const { session, isCreating, error, createSession } = useSession();
  const [open, setOpen] = useState(false);
  const [budget, setBudget] = useState<string>(BUDGETS[1].value);
  const [duration, setDuration] = useState<number>(24);

  if (!session.userAddress) return null;

  const start = async () => {
    try {
      await createSession(budget, duration);
      toast.success("Session started");
      setOpen(false);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Failed to start session");
    }
  };

  return (
    <>
      <button type="button" className="btn btn-ghost session-button" onClick={() => setOpen(true)}>
        <Zap size={14} />
        {session.active ? `$${formatUsdc(session.budgetRemaining)}` : "Start session"}
      </button>
      {open ? (
        <div className="overlay" onClick={() => setOpen(false)}>
          <div className="modal session-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <span className="modal-title"><Shield size={17} /> Session</span>
              <button type="button" className="btn btn-icon btn-ghost" onClick={() => setOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body session-body">
              {session.active ? (
                <div className="session-summary">
                  <div><span>Remaining</span><strong>${formatUsdc(session.budgetRemaining)} USDC</strong></div>
                  <div><span>Expires</span><strong>{formatExpiry(session.expiresAt)}</strong></div>
                  <div><span>Network</span><strong>{session.network}</strong></div>
                </div>
              ) : (
                <>
                  <label className="field-label">Budget limit</label>
                  <div className="session-choices">
                    {BUDGETS.map((option) => (
                      <button key={option.value} type="button" className="btn btn-sm" data-active={budget === option.value} onClick={() => setBudget(option.value)}>
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <label className="field-label"><Clock size={13} /> Duration</label>
                  <div className="session-choices">
                    {DURATIONS.map((hours) => (
                      <button key={hours} type="button" className="btn btn-sm" data-active={duration === hours} onClick={() => setDuration(hours)}>
                        {hours}h
                      </button>
                    ))}
                  </div>
                  {error ? <div className="session-error">{error}</div> : null}
                </>
              )}
            </div>
            {!session.active ? (
              <div className="modal-foot">
                <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
                <button type="button" className="btn btn-primary" disabled={isCreating} onClick={() => void start()}>
                  {isCreating ? "Creating..." : "Start session"}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
