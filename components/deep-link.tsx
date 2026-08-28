import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { toast } from "sonner";
import { useSession } from "@/hooks/use-session";
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
        if (current === sequence.current) toast.success("Desktop session connected");
      } catch (cause) {
        if (current === sequence.current) {
          toast.error(cause instanceof Error ? cause.message : "Desktop authorization failed");
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
  }, [redeemLocalLink]);

  return null;
}
