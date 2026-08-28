import { useEffect, useMemo, useState } from "react";
import { Check, Monitor, Shield } from "lucide-react";
import { Connector } from "@/components/connector";
import { NetworkSelector } from "@/components/network-selector";
import { useIdentity } from "@/contexts/identity";
import { useSession } from "@/hooks/use-session";
import { useNetwork } from "@/contexts/network";
import type { NetworkId } from "@compose-market/sdk/chains";

function deviceIdFromQuery(): string | null {
  const value = new URLSearchParams(window.location.search).get("device_id");
  return value && /^[0-9a-f-]{36}$/i.test(value) ? value : null;
}

export function ConnectLocalPage() {
  const deviceId = useMemo(deviceIdFromQuery, []);
  const { isConnected } = useIdentity();
  const { createLocalLink } = useSession();
  const { chains, setSelectedNetwork } = useNetwork();
  const [authorizing, setAuthorizing] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(deviceId ? null : "Invalid device ID");

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("network") as NetworkId | null;
    if (requested && chains.some((chain) => chain.network === requested)) setSelectedNetwork(requested);
  }, [chains, setSelectedNetwork]);

  const authorize = async () => {
    if (!deviceId) return;
    setAuthorizing(true);
    setError(null);
    try {
      const link = await createLocalLink(deviceId);
      setComplete(true);
      window.location.href = `hevai://auth/callback?token=${encodeURIComponent(link.token)}`;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Authorization failed");
    } finally {
      setAuthorizing(false);
    }
  };

  return (
    <div className="connect-local-page">
      <div className="connect-local-card">
        <span className="empty-icon">{complete ? <Check size={25} /> : <Monitor size={25} />}</span>
        <h1>{complete ? "Desktop authorized" : "Connect hevai Desktop"}</h1>
        <p>
          {complete
            ? "The desktop app should open automatically."
            : "Sign in here, then authorize this desktop device."}
        </p>
        {error ? <div className="session-error">{error}</div> : null}
        {!complete ? (
          <div className="connect-local-actions">
            <NetworkSelector />
            {!isConnected ? <Connector /> : null}
            {isConnected ? (
              <button type="button" className="btn btn-primary" disabled={authorizing || !deviceId} onClick={() => void authorize()}>
                <Shield size={15} />
                {authorizing ? "Authorizing..." : "Authorize desktop"}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
