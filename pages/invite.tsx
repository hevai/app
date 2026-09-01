import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ExternalLink, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useIdentity } from "@/hooks/use-identity";
import { useScope } from "@/hooks/use-scope";
import { useLocale } from "@/hooks/use-locale";
import { isDesktop } from "@/lib/platform";
import { Empty } from "@/components/empty";
import { Connector } from "@/components/connector";
import { initials } from "@/lib/utils";
import type { Preview } from "@/types";

const webBase = (import.meta.env.VITE_WEB_APP_URL ?? "https://app.hevai.org").replace(/\/+$/, "");

export function InvitePage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { address, isConnected } = useIdentity();
  const { refresh } = useScope();
  const { t, err, roleLabel, formatExpiry } = useLocale();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const triedRef = useRef(false);

  useEffect(() => {
    let active = true;
    if (!code) return;
    api
      .peekInvite(code)
      .then((value) => {
        if (active) setPreview(value);
      })
      .catch((error) => {
        if (active) setFailed(err(error, "invite.invalid"));
      });
    return () => {
      active = false;
    };
  }, [code, err]);

  const accept = useCallback(async () => {
    if (!code || !address || triedRef.current) return;
    triedRef.current = true;
    setBusy(true);
    try {
      const org = await api.acceptInvite(code, address);
      refresh();
      toast.success(t("invite.joined", { name: org.name }));
      navigate(`/org/${org.id}`);
    } catch (error) {
      triedRef.current = false;
      setFailed(err(error, "invite.invalid"));
    } finally {
      setBusy(false);
    }
  }, [address, code, err, navigate, refresh, t]);

  // The invitee links to the team the moment their account exists — no
  // extra step between connecting and membership.
  useEffect(() => {
    if (preview && isConnected && address) void accept();
  }, [preview, isConnected, address, accept]);

  if (!code || failed) {
    return (
      <Empty
        icon="alert"
        title={t("invite.invalidTitle")}
        description={failed ?? t("invite.invalid")}
      />
    );
  }

  if (!preview) {
    return <Empty icon="building" title={t("invite.loading")} description={t("common.loading")} />;
  }

  const openInBrowser = async () => {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(`${webBase}/invite/${encodeURIComponent(code)}`);
  };

  return (
    <div className="org-page">
      <div className="card">
        <div className="card-head">
          {preview.org.image ? (
            <img
              src={preview.org.image}
              alt=""
              style={{ width: 30, height: 30, borderRadius: "var(--r-full)", objectFit: "cover" }}
            />
          ) : (
            <span className="avatar" style={{ width: 30, height: 30 }}>
              {initials(preview.org.name)}
            </span>
          )}
          <span className="card-title">{preview.org.name}</span>
          <span className="chip" data-tone="accent">
            {roleLabel(preview.role)}
          </span>
        </div>
        <div className="card-body">{t("invite.expires", { time: formatExpiry(preview.expires) })}</div>
      </div>

      <div className="card">
        <div className="card-head">
          <span className="card-icon">
            <UserPlus size={16} />
          </span>
          <span className="card-title">{t("invite.title")}</span>
        </div>
        <div className="card-body">
          {isConnected ? t("invite.ready") : isDesktop() ? t("invite.desktopHint") : t("invite.connect")}
        </div>
        <div style={{ display: "flex", gap: "var(--sp-2)", marginTop: "var(--sp-2)", flexWrap: "wrap" }}>
          {isConnected ? (
            <button type="button" className="btn btn-primary" onClick={() => void accept()} disabled={busy}>
              <UserPlus size={14} />
              {busy ? t("invite.joining") : t("invite.join")}
            </button>
          ) : isDesktop() ? (
            <button type="button" className="btn btn-primary" onClick={() => void openInBrowser()}>
              <ExternalLink size={14} />
              {t("invite.openWeb")}
            </button>
          ) : (
            <Connector />
          )}
        </div>
      </div>
    </div>
  );
}
