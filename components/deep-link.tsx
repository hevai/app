import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { toast } from "sonner";
import { useSession } from "@/hooks/use-session";
import { useLocale } from "@/hooks/use-locale";
import { getDeviceId, isDesktop } from "@/lib/platform";

interface DeepLinkEvent {
  url: string;
}

function parseToken(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "hevai:" || url.hostname !== "auth" || url.pathname !== "/callback") return null;
    return url.searchParams.get("token");
  } catch {
    return null;
  }
}

function parseInvite(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "hevai:" || url.hostname !== "invite") return null;
    const code = url.pathname.replace(/^\/+/, "");
    return /^[A-Za-z0-9_-]+$/.test(code) ? code : null;
  } catch {
    return null;
  }
}

export function DeepLinkHandler() {
  const { redeemLocalLink } = useSession();
  const { t, err } = useLocale();
  const navigate = useNavigate();
  const sequence = useRef(0);

  useEffect(() => {
    if (!isDesktop()) return;
    let dispose: (() => void) | undefined;

    const redeem = async (raw: string) => {
      const token = parseToken(raw);
      if (!token) return;
      const current = ++sequence.current;
      try {
        await redeemLocalLink(token, getDeviceId());
        if (current === sequence.current) toast.success(t("link.connected"));
      } catch (cause) {
        if (current === sequence.current) {
          toast.error(err(cause, "link.failed"));
        }
      }
    };

    const openInvite = (raw: string) => {
      const code = parseInvite(raw);
      if (code) navigate(`/invite/${code}`);
    };

    void (async () => {
      dispose = await listen<DeepLinkEvent>("deep-link", (event) => {
        openInvite(event.payload.url);
        void redeem(event.payload.url);
      });
      const pending = await invoke<string[]>("consume_pending_deep_links");
      for (const url of [...pending].reverse()) {
        openInvite(url);
        await redeem(url);
      }
    })();

    return () => dispose?.();
  }, [redeemLocalLink, t, err, navigate]);

  return null;
}
