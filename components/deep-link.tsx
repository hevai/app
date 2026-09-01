import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { toast } from "sonner";
import { useSession } from "@/hooks/use-session";
import { useLocale } from "@/contexts/locale";
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

export function DeepLinkHandler() {
  const { redeemLocalLink } = useSession();
  const { t, err } = useLocale();
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

    void (async () => {
      dispose = await listen<DeepLinkEvent>("deep-link", (event) => void redeem(event.payload.url));
      const pending = await invoke<string[]>("consume_pending_deep_links");
      const newest = [...pending].reverse().find((url: string) => parseToken(url));
      if (newest) await redeem(newest);
    })();

    return () => dispose?.();
  }, [redeemLocalLink, t, err]);

  return null;
}
