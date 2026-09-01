import { createContext, useContext } from "react";
import type { FacilitatorChain, NetworkId } from "@compose-market/sdk/chains";

export interface NetworkValue {
  chains: FacilitatorChain[];
  defaultNetwork: NetworkId;
  selectedNetwork: NetworkId;
  setSelectedNetwork: (network: NetworkId) => void;
  isLoading: boolean;
  error: Error | null;
}

export const Network = createContext<NetworkValue | null>(null);

export function useNetwork(): NetworkValue {
  const value = useContext(Network);
  if (!value) throw new Error("useNetwork must be used within a ChainProvider");
  return value;
}
