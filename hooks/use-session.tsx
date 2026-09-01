import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useActiveAccount } from "thirdweb/react";
import { getContract, sendTransaction } from "thirdweb";
import { allowance, approve, balanceOf } from "thirdweb/extensions/erc20";
import type {
  BudgetEvent,
  KeyCreateResponse,
  LocalLinkCreateResponse,
  LocalRedeemedContext,
  SessionActiveEvent,
} from "@compose-market/sdk";
import type { NetworkId } from "@compose-market/sdk/chains";
import { useNetwork } from "@/contexts/network";
import { useLocale } from "@/contexts/locale";
import { client, evmChainId, getChainObject, isEvmNetwork } from "@/lib/chains";
import { isDesktop } from "@/lib/platform";
import { sdk } from "@/lib/sdk";

const DESKTOP_CONTEXT_KEY = "hevai:compose-context";

export interface SessionState {
  active: boolean;
  userAddress: string | null;
  network: NetworkId | null;
  keyId: string | null;
  token: string | null;
  budgetLimit: string;
  budgetUsed: string;
  budgetLocked: string;
  budgetRemaining: string;
  expiresAt: number | null;
  source: "web" | "desktop" | null;
}

interface SessionContextValue {
  session: SessionState;
  isCreating: boolean;
  error: string | null;
  createSession: (budgetWei: string, durationHours: number) => Promise<KeyCreateResponse>;
  createLocalLink: (deviceId: string) => Promise<LocalLinkCreateResponse>;
  redeemLocalLink: (token: string, deviceId: string) => Promise<LocalRedeemedContext>;
  refreshSession: () => Promise<void>;
  clearSession: () => void;
}

const emptySession: SessionState = {
  active: false,
  userAddress: null,
  network: null,
  keyId: null,
  token: null,
  budgetLimit: "0",
  budgetUsed: "0",
  budgetLocked: "0",
  budgetRemaining: "0",
  expiresAt: null,
  source: null,
};

const SessionContext = createContext<SessionContextValue | null>(null);

function readDesktopContext(): LocalRedeemedContext | null {
  try {
    const raw = localStorage.getItem(DESKTOP_CONTEXT_KEY);
    return raw ? (JSON.parse(raw) as LocalRedeemedContext) : null;
  } catch {
    return null;
  }
}

function storeDesktopContext(context: LocalRedeemedContext | null): void {
  if (context) localStorage.setItem(DESKTOP_CONTEXT_KEY, JSON.stringify(context));
  else localStorage.removeItem(DESKTOP_CONTEXT_KEY);
}

function stateFromContext(context: LocalRedeemedContext): SessionState {
  if (!context.hasSession) {
    return {
      ...emptySession,
      userAddress: context.userAddress,
      network: context.network,
      source: "desktop",
    };
  }
  return {
    active: context.key.expiresAt > Date.now(),
    userAddress: context.userAddress,
    network: context.network,
    keyId: context.key.keyId,
    token: context.key.token,
    budgetLimit: context.session.budget,
    budgetUsed: "0",
    budgetLocked: "0",
    budgetRemaining: context.session.budget,
    expiresAt: context.session.expiresAt,
    source: "desktop",
  };
}

function storeSession(state: SessionState): void {
  const context = readDesktopContext();
  if (!context || !state.userAddress || !state.network) return;
  storeDesktopContext({
    ...context,
    userAddress: state.userAddress,
    network: state.network,
    key: {
      keyId: state.keyId ?? "",
      token: state.token ?? "",
      expiresAt: state.expiresAt ?? 0,
    },
    session: {
      sessionId: state.keyId ?? "",
      budget: state.budgetRemaining,
      duration: state.expiresAt ? Math.max(0, state.expiresAt - Date.now()) : 0,
      expiresAt: state.expiresAt ?? 0,
    },
    hasSession: state.active,
  });
}

function mergeActiveEvent(previous: SessionState, event: SessionActiveEvent): SessionState {
  return {
    ...previous,
    active: true,
    network: event.network,
    budgetLimit: event.budgetLimit ?? previous.budgetLimit,
    budgetUsed: event.budgetUsed ?? previous.budgetUsed,
    budgetLocked: event.budgetLocked ?? previous.budgetLocked,
    budgetRemaining: event.budgetRemaining ?? previous.budgetRemaining,
    expiresAt: event.expiresAt ?? previous.expiresAt,
  };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const desktop = isDesktop();
  const account = useActiveAccount();
  const { chains, selectedNetwork } = useNetwork();
  const { t } = useLocale();
  const [session, setSession] = useState<SessionState>(emptySession);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const attachedRef = useRef<string | null>(null);

  const attach = useCallback((address: string, network: NetworkId, token?: string | null) => {
    const key = `${address.toLowerCase()}:${network}`;
    if (attachedRef.current !== key) {
      sdk.wallets.attach({ address, network });
      attachedRef.current = key;
    }
    if (token) sdk.keys.use(token);
  }, []);

  const refreshSession = useCallback(async () => {
    const address = session.userAddress ?? (!desktop ? account?.address ?? null : null);
    const network = session.network ?? (!desktop ? selectedNetwork : null);
    if (!address || !network) return;
    attach(address, network, session.token);
    const status = await sdk.keys.getActive({ network });
    if (!status.hasSession) {
      sdk.keys.clearToken();
      setSession((previous) => {
        const next = { ...emptySession, userAddress: address, network, source: previous.source };
        if (desktop) storeSession(next);
        return next;
      });
      return;
    }
    setSession((previous) => {
      const next: SessionState = {
        ...previous,
        active: status.status?.isActive ?? true,
        userAddress: address,
        network: status.network ?? network,
        keyId: status.keyId ?? previous.keyId,
        token: sdk.keys.currentToken() ?? previous.token,
        budgetLimit: status.budgetLimit ?? "0",
        budgetUsed: status.budgetUsed ?? "0",
        budgetLocked: status.budgetLocked ?? "0",
        budgetRemaining: status.budgetRemaining ?? "0",
        expiresAt: status.expiresAt ?? null,
        source: previous.source ?? (desktop ? "desktop" : "web"),
      };
      if (desktop) storeSession(next);
      return next;
    });
  }, [account?.address, attach, desktop, selectedNetwork, session.network, session.token, session.userAddress]);

  useEffect(() => {
    if (desktop) {
      const context = readDesktopContext();
      if (!context) return;
      attach(context.userAddress, context.network, context.key.token);
      setSession(stateFromContext(context));
      return;
    }
    if (!account?.address) {
      sdk.wallets.clear();
      attachedRef.current = null;
      setSession(emptySession);
      return;
    }
    attach(account.address, selectedNetwork);
    setSession((previous) => ({
      ...previous,
      userAddress: account.address,
      network: selectedNetwork,
      source: "web",
    }));
  }, [account?.address, attach, desktop, selectedNetwork]);

  useEffect(() => {
    if (!session.userAddress || !session.network) return;
    void refreshSession().catch((cause) => {
      console.warn("[hevai] Session refresh failed", cause);
    });
  }, [session.userAddress, session.network]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const disposers = [
      sdk.events.on("budget", (event: BudgetEvent) => {
        setSession((previous) => {
          const next = {
            ...previous,
            budgetLimit: event.snapshot.limitWei ?? previous.budgetLimit,
            budgetUsed: event.snapshot.usedWei ?? previous.budgetUsed,
            budgetLocked: event.snapshot.lockedWei ?? previous.budgetLocked,
            budgetRemaining: event.snapshot.remainingWei ?? previous.budgetRemaining,
          };
          if (desktop) storeSession(next);
          return next;
        });
      }),
      sdk.events.on("sessionActive", (event) => setSession((previous) => {
        const next = mergeActiveEvent(previous, event);
        if (desktop) storeSession(next);
        return next;
      })),
      sdk.events.on("sessionExpired", () => {
        sdk.keys.clearToken();
        setSession((previous) => {
          const next = { ...previous, active: false, token: null, budgetRemaining: "0" };
          if (desktop) storeSession(next);
          return next;
        });
      }),
      sdk.events.on("sessionInvalid", () => void refreshSession()),
    ];
    return () => disposers.forEach((dispose) => dispose());
  }, [desktop, refreshSession]);

  useEffect(() => {
    if (!session.active || !session.userAddress || !session.network) return;
    const controller = new AbortController();
    void (async () => {
      try {
        for await (const _event of sdk.session.subscribe({
          userAddress: session.userAddress!,
          network: session.network!,
          signal: controller.signal,
        })) {
          void _event;
        }
      } catch (cause) {
        if (!controller.signal.aborted) console.warn("[hevai] session-events ended", cause);
      }
    })();
    return () => controller.abort();
  }, [session.active, session.network, session.userAddress]);

  const createSession = useCallback(async (budgetWei: string, durationHours: number) => {
    const address = desktop ? session.userAddress : account?.address ?? null;
    if (!address) throw new Error("Connect your account first");
    const network = selectedNetwork;

    setIsCreating(true);
    setError(null);
    try {
      attach(address, network, desktop ? session.token : null);

      if (!desktop) {
        if (!account || !isEvmNetwork(network)) {
          throw new Error("Session approval requires an EVM smart account");
        }
        const chain = getChainObject(evmChainId(network));
        const config = chains.find((item) => item.network === network);
        const support = await sdk.x402.facilitator.supported();
        const kind = support.kinds.find((item) => item.network === network && item.scheme === "upto");
        const spender = kind?.extra?.facilitatorAddress;
        if (!chain || !config || typeof spender !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(spender)) {
          throw new Error(`Session approval is unavailable for ${network}`);
        }

        const contract = getContract({
          client,
          chain,
          address: config.assetAddress as `0x${string}`,
        });
        const amount = BigInt(budgetWei);
        const [funds, approved] = await Promise.all([
          balanceOf({ contract, address: account.address }),
          allowance({ contract, owner: account.address, spender: spender as `0x${string}` }),
        ]);
        if (funds < amount) {
          throw new Error(`Insufficient USDC balance. Available: ${(Number(funds) / 1_000_000).toFixed(2)} USDC`);
        }
        if (approved < amount) {
          await sendTransaction({
            account,
            transaction: approve({
              contract,
              spender: spender as `0x${string}`,
              amountWei: amount,
            }),
          });
        }
      }

      const response = await sdk.fetch("/api/keys", {
        method: "POST",
        key: sdk.keys.currentToken(),
        userAddress: address,
        network,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          budgetLimit: budgetWei,
          expiresAt: Date.now() + durationHours * 60 * 60 * 1_000,
          network,
          purpose: "session",
          name: t("session.name", { date: new Date().toISOString().slice(0, 10) }),
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string | { message?: string }; message?: string } | null;
        const message = typeof body?.error === "string"
          ? body.error
          : body?.error?.message ?? body?.message ?? `Session creation failed (${response.status})`;
        throw new Error(message);
      }
      const created = await response.json() as KeyCreateResponse;
      sdk.keys.use(created.token);
      const next: SessionState = {
        active: true,
        userAddress: address,
        network: created.network,
        keyId: created.keyId,
        token: created.token,
        budgetLimit: created.budgetLimit,
        budgetUsed: created.budgetUsed,
        budgetLocked: "0",
        budgetRemaining: created.budgetRemaining,
        expiresAt: created.expiresAt,
        source: desktop ? "desktop" : "web",
      };
      setSession(next);
      if (desktop) storeSession(next);
      await refreshSession();
      return created;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Failed to create session";
      setError(message);
      throw cause;
    } finally {
      setIsCreating(false);
    }
  }, [account, attach, chains, desktop, refreshSession, selectedNetwork, session.token, session.userAddress, t]);

  const createLocalLink = useCallback(async (deviceId: string) => {
    if (desktop || !account?.address) throw new Error("Connect with Thirdweb on the web app first");
    const network = selectedNetwork;
    attach(account.address, network, session.token);
    return sdk.local.link.create({
      userAddress: account.address,
      network,
      deviceId,
    });
  }, [account?.address, attach, desktop, selectedNetwork, session.token]);

  const redeemLocalLink = useCallback(async (token: string, deviceId: string) => {
    const result = await sdk.local.link.redeem({ token, deviceId });
    const context = result.context;
    attach(context.userAddress, context.network, context.key.token);
    storeDesktopContext(context);
    setSession(stateFromContext(context));
    return context;
  }, [attach]);

  const clearSession = useCallback(() => {
    sdk.keys.clearToken();
    sdk.wallets.clear();
    attachedRef.current = null;
    storeDesktopContext(null);
    setSession(emptySession);
  }, []);

  return (
    <SessionContext.Provider value={{
      session,
      isCreating,
      error,
      createSession,
      createLocalLink,
      redeemLocalLink,
      refreshSession,
      clearSession,
    }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used within SessionProvider");
  return value;
}
