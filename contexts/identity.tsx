import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  useActiveAccount,
  useActiveWallet,
  useActiveWalletConnectionStatus,
  useAdminWallet,
  useAuthToken,
} from "thirdweb/react";
import { api } from "@/lib/api";
import { useSession } from "@/hooks/use-session";
import { isDesktop } from "@/lib/platform";
import type { User } from "@/types";

interface IdentityValue {
  address: string | null;
  jwt: string | null;
  user: User | null;
  isConnected: boolean;
  isConnecting: boolean;
  isAuthenticating: boolean;
  connect: () => void;
  disconnect: () => void;
  updateProfile: (patch: { name?: string; email?: string; image?: string }) => Promise<void>;
}

const Identity = createContext<IdentityValue | null>(null);

const hasBackend = Boolean((import.meta.env.VITE_API_URL ?? "").trim());

const PROFILE_PREFIX = "hevai:profile";

function loadProfile(wallet: string): { name: string; email: string; image: string } | null {
  try {
    const raw = localStorage.getItem(`${PROFILE_PREFIX}:${wallet.toLowerCase()}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function storeProfile(wallet: string, patch: { name?: string; email?: string; image?: string }): void {
  try {
    const current = loadProfile(wallet) ?? { name: "", email: "", image: "" };
    const next = { ...current, ...patch };
    localStorage.setItem(`${PROFILE_PREFIX}:${wallet.toLowerCase()}`, JSON.stringify(next));
  } catch {
    // non-fatal
  }
}

export function IdentityProvider({ children }: { children: ReactNode }) {
  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const adminWallet = useAdminWallet();
  const status = useActiveWalletConnectionStatus();
  const jwt = useAuthToken() ?? null;
  const { session, clearSession } = useSession();
  const desktop = isDesktop();

  const address = desktop ? session.userAddress : account?.address ?? null;
  const isConnected = Boolean(address);
  const isConnecting = desktop ? false : status === "connecting";

  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    let active = true;
    if (!address) {
      setUser(null);
      return;
    }

    // Set immediate Thirdweb smart-account identity
    const defaultUser: User = {
      id: address,
      wallet: address,
      name: "",
      email: "",
      image: "",
      orgs: [],
    };
    setUser((prev) => (prev && prev.wallet === address ? prev : defaultUser));

    // Cached profile first for an instant paint
    const cached = loadProfile(address);
    if (cached) {
      setUser((prev) =>
        prev && prev.wallet === address
          ? { ...prev, name: cached.name, email: cached.email, image: cached.image }
          : prev,
      );
    }

    // Then the authoritative copy from the users DB
    if (hasBackend) {
      api
        .profile(address)
        .then((profile) => {
          if (!active || !profile) return;
          const patch = {
            name: profile.name ?? "",
            email: profile.email ?? "",
            image: profile.image ?? "",
          };
          storeProfile(address, patch);
          setUser((prev) => (prev && prev.wallet === address ? { ...prev, ...patch } : prev));
        })
        .catch(() => {
          // offline — the cached copy above stays in place
        });
    }

    if (!hasBackend || desktop || !jwt) return;

    setIsAuthenticating(true);
    // Non-blocking Neon sync: store jwt:smart-account pair in database
    api
      .storeIdentityPair(address, jwt)
      .catch((error) => {
        console.info("[hevai] background user sync", error);
      })
      .finally(() => {
        if (active) setIsAuthenticating(false);
      });

    return () => {
      active = false;
    };
  }, [address, desktop, jwt]);

  const updateProfile = useCallback(
    async (patch: { name?: string; email?: string; image?: string }) => {
      if (!address) return;
      setUser((prev) => (prev ? { ...prev, ...patch } : prev));
      storeProfile(address, patch);
      if (hasBackend) {
        try {
          await api.updateProfile(address, patch);
        } catch (error) {
          console.warn("[hevai] profile sync failed", error);
        }
      }
    },
    [address],
  );

  const disconnect = useCallback(() => {
    clearSession();
    setUser(null);
    void wallet?.disconnect();
    if (adminWallet && adminWallet !== wallet) void adminWallet.disconnect();
  }, [adminWallet, clearSession, wallet]);

  const connect = useCallback(() => {
    // ConnectButton drives the actual connection; kept for API symmetry.
  }, []);

  return (
    <Identity.Provider
      value={{
        address,
        jwt: desktop ? session.token : jwt,
        user,
        isConnected,
        isConnecting,
        isAuthenticating,
        connect,
        disconnect,
        updateProfile,
      }}
    >
      {children}
    </Identity.Provider>
  );
}

export function useIdentity(): IdentityValue {
  const value = useContext(Identity);
  if (!value) throw new Error("useIdentity must be used within an IdentityProvider");
  return value;
}
