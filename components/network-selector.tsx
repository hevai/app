import { useEffect } from "react";
import { useSwitchActiveWalletChain } from "thirdweb/react";
import type { NetworkId } from "@compose-market/sdk/chains";
import { useNetwork } from "@/contexts/network";
import { useSession } from "@/hooks/use-session";
import { evmChainId, getChainObject, isEvmNetwork } from "@/lib/chains";
import { isDesktop } from "@/lib/platform";

export function NetworkSelector() {
  const { chains, selectedNetwork, setSelectedNetwork, isLoading } = useNetwork();
  const { session, clearSession } = useSession();
  const switchChain = useSwitchActiveWalletChain();
  const current = chains.find((chain) => chain.network === selectedNetwork);
  const evmChains = chains.filter((chain) => isEvmNetwork(chain.network));

  useEffect(() => {
    if (isDesktop() && session.network && session.network !== selectedNetwork) {
      setSelectedNetwork(session.network);
    }
  }, [selectedNetwork, session.network, setSelectedNetwork]);

  const changeNetwork = async (network: NetworkId) => {
    setSelectedNetwork(network);
    if (isDesktop()) {
      if (session.network && session.network !== network) clearSession();
      return;
    }
    if (!isEvmNetwork(network)) return;
    const chain = getChainObject(evmChainId(network));
    if (chain) await switchChain(chain);
  };

  return (
    <label className="network-selector" data-testnet={current?.isTestnet ?? false}>
      <span className="network-dot" />
      <select
        aria-label="Payment network"
        value={selectedNetwork}
        disabled={isLoading && chains.length === 0}
        onChange={(event) => void changeNetwork(event.target.value as NetworkId)}
      >
        {evmChains.length > 0 ? evmChains.map((chain) => (
          <option key={chain.network} value={chain.network}>{chain.name}</option>
        )) : (
          <option value={selectedNetwork}>{current?.name ?? selectedNetwork}</option>
        )}
      </select>
    </label>
  );
}
