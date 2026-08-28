import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchChains, type FacilitatorChain, type NetworkId } from "@compose-market/sdk/chains";
import { setChainRegistry, setDefaultNetwork as setIdentityNetwork } from "@/lib/chains";

interface NetworkValue {
  chains: FacilitatorChain[];
  defaultNetwork: NetworkId;
  selectedNetwork: NetworkId;
  setSelectedNetwork: (network: NetworkId) => void;
  isLoading: boolean;
  error: Error | null;
}

const Network = createContext<NetworkValue | null>(null);

const REGISTRY_CACHE_KEY = "hevai:chains";
const FETCH_TIMEOUT_MS = 8_000;
const SELECTED_NETWORK_KEY = "hevai:selected-network";

interface CachedRegistry {
  chains: FacilitatorChain[];
  defaultNetwork: NetworkId;
  fetchedAt: number;
}

function readCachedRegistry(): CachedRegistry | null {
  try {
    const raw = localStorage.getItem(REGISTRY_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedRegistry;
    if (!Array.isArray(parsed?.chains) || parsed.chains.length === 0) return null;
    if (typeof parsed?.defaultNetwork !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCachedRegistry(chains: FacilitatorChain[], defaultNetwork: NetworkId): void {
  try {
    localStorage.setItem(
      REGISTRY_CACHE_KEY,
      JSON.stringify({ chains, defaultNetwork, fetchedAt: Date.now() } satisfies CachedRegistry),
    );
  } catch {
    // non-fatal
  }
}

export function ChainProvider({ children }: { children: ReactNode }) {
  const [cachedRegistry] = useState<CachedRegistry | null>(() => {
    const cached = readCachedRegistry();
    if (cached) setChainRegistry(cached.chains, cached.defaultNetwork);
    return cached;
  });
  const [chains, setChains] = useState<FacilitatorChain[]>(cachedRegistry?.chains ?? []);
  const [defaultNetwork, setDefaultNetwork] = useState<NetworkId>(
    cachedRegistry?.defaultNetwork ?? "eip155:5042002",
  );
  const [selectedNetwork, setSelectedNetworkState] = useState<NetworkId>(() => {
    const stored = localStorage.getItem(SELECTED_NETWORK_KEY) as NetworkId | null;
    const fallback = cachedRegistry?.defaultNetwork ?? "eip155:5042002";
    setIdentityNetwork(stored ?? fallback);
    return stored ?? fallback;
  });
  const [isLoading, setIsLoading] = useState(!cachedRegistry);
  const [error, setError] = useState<Error | null>(null);

  const setSelectedNetwork = useCallback((network: NetworkId) => {
    setSelectedNetworkState(network);
    setIdentityNetwork(network);
    localStorage.setItem(SELECTED_NETWORK_KEY, network);
  }, []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timer = globalThis.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    fetchChains({ signal: controller.signal }).then(
      (result) => {
        if (!active) return;
        setChainRegistry(result.chains, result.defaultNetwork);
        writeCachedRegistry(result.chains, result.defaultNetwork);
        setChains(result.chains);
        setDefaultNetwork(result.defaultNetwork);
        setSelectedNetworkState((current) => {
          if (result.chains.some((chain) => chain.network === current)) {
            setIdentityNetwork(current);
            return current;
          }
          setIdentityNetwork(result.defaultNetwork);
          localStorage.setItem(SELECTED_NETWORK_KEY, result.defaultNetwork);
          return result.defaultNetwork;
        });
        setIsLoading(false);
      },
      (err: unknown) => {
        if (!active) return;
        if (cachedRegistry) {
          console.warn("[hevai] chain revalidation failed, using cache", err);
          setIsLoading(false);
          return;
        }
        setError(err instanceof Error ? err : new Error("Failed to fetch chains"));
        setIsLoading(false);
      },
    );

    return () => {
      active = false;
      globalThis.clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Network.Provider value={{ chains, defaultNetwork, selectedNetwork, setSelectedNetwork, isLoading, error }}>
      {children}
    </Network.Provider>
  );
}

export function useNetwork(): NetworkValue {
  const value = useContext(Network);
  if (!value) throw new Error("useNetwork must be used within a ChainProvider");
  return value;
}
