import { useState } from "react";
import { Clock, Shield, X, Zap } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/hooks/use-session";
import { useLocale } from "@/hooks/use-locale";
import { formatUsdc } from "@/lib/utils";

const BUDGETS = [
  { label: "$1", value: "1000000" },
  { label: "$10", value: "10000000" },
  { label: "$50", value: "50000000" },
  { label: "$100", value: "100000000" },
] as const;
const DURATIONS = [1, 6, 12, 24] as const;

export function SessionControl() {
  const { session, isCreating, error, createSession } = useSession();
  const { t, err, formatExpiry } = useLocale();
  const [open, setOpen] = useState(false);
  const [budget, setBudget] = useState<string>(BUDGETS[1].value);
  const [duration, setDuration] = useState<number>(24);

  if (!session.userAddress) return null;

  const start = async () => {
    try {
      await createSession(budget, duration);
      toast.success(t("session.started"));
      setOpen(false);
    } catch (cause) {
      toast.error(err(cause, "session.failed"));
    }
  };

  return (
    <>
      <button type="button" className="btn btn-ghost session-button" onClick={() => setOpen(true)}>
        <Zap size={14} />
        {session.active ? (
          `$${formatUsdc(session.budgetRemaining)}`
        ) : (
          <span className="session-label">{t("session.start")}</span>
        )}
      </button>
      {open ? (
        <div className="overlay" onClick={() => setOpen(false)}>
          <div className="modal session-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <span className="modal-title"><Shield size={17} /> {t("session.title")}</span>
              <button type="button" className="btn btn-icon btn-ghost" onClick={() => setOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body session-body">
              {session.active ? (
                <div className="session-summary">
                  <div><span>{t("session.remaining")}</span><strong>${formatUsdc(session.budgetRemaining)} USDC</strong></div>
                  <div><span>{t("session.expires")}</span><strong>{formatExpiry(session.expiresAt)}</strong></div>
                  <div><span>{t("session.network")}</span><strong>{session.network}</strong></div>
                </div>
              ) : (
                <>
                  <label className="field-label">{t("session.budgetLimit")}</label>
                  <div className="session-choices">
                    {BUDGETS.map((option) => (
                      <button key={option.value} type="button" className="btn btn-sm" data-active={budget === option.value} onClick={() => setBudget(option.value)}>
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <label className="field-label"><Clock size={13} /> {t("session.duration")}</label>
                  <div className="session-choices">
                    {DURATIONS.map((hours) => (
                      <button key={hours} type="button" className="btn btn-sm" data-active={duration === hours} onClick={() => setDuration(hours)}>
                        {hours}h
                      </button>
                    ))}
                  </div>
                  {error ? <div className="session-error">{err(error)}</div> : null}
                </>
              )}
            </div>
            {!session.active ? (
              <div className="modal-foot">
                <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>{t("common.cancel")}</button>
                <button type="button" className="btn btn-primary" disabled={isCreating} onClick={() => void start()}>
                  {isCreating ? t("session.creating") : t("session.start")}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
