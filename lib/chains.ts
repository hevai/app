import { createThirdwebClient, defineChain } from "thirdweb";
import { arcTestnet, avalanche, avalancheFuji, arbitrum, arbitrumSepolia } from "thirdweb/chains";
import type { Chain } from "thirdweb/chains";
import type { SmartWalletOptions } from "thirdweb/wallets";
import type { EvmNetworkId, FacilitatorChain, NetworkId } from "@compose-market/sdk/chains";

const THIRDWEB_PRESETS: Record<number, Chain> = {
  43113: avalancheFuji,
  43114: avalanche,
  421614: arbitrumSepolia,
  42161: arbitrum,
  5042002: arcTestnet,
};

const clientId = import.meta.env.VITE_THIRDWEB_CLIENT_ID;

if (!clientId) {
  console.error("[hevai] VITE_THIRDWEB_CLIENT_ID is missing — set it in app/.env");
}

export const client = createThirdwebClient({
  clientId: clientId || "placeholder",
});

type AppChain = FacilitatorChain & { chainId?: number };

let registry: AppChain[] = [];
let chainObjects = new Map<number, Chain>(
  Object.entries(THIRDWEB_PRESETS).map(([k, v]) => [Number(k), v]),
);
let defaultNetwork: NetworkId = "eip155:5042002";

export function isEvmNetwork(network: NetworkId | string | null | undefined): network is EvmNetworkId {
  return typeof network === "string" && network.startsWith("eip155:");
}

export function evmChainId(network: EvmNetworkId): number {
  const value = Number.parseInt(network.slice("eip155:".length), 10);
  if (!Number.isInteger(value) || value <= 0) throw new Error(`Invalid EVM network: ${network}`);
  return value;
}

export function setChainRegistry(chains: FacilitatorChain[], fallback: NetworkId): void {
  registry = chains.map((chain) => ({
    ...chain,
    ...(isEvmNetwork(chain.network) ? { chainId: evmChainId(chain.network) } : {}),
  }));
  defaultNetwork = fallback;
  chainObjects = new Map(Object.entries(THIRDWEB_PRESETS).map(([k, v]) => [Number(k), v]));
  for (const chain of registry) {
    if (chain.chainId == null) continue;
    if (!(chain.namespace === "eip155" || chain.network.startsWith("eip155:"))) continue;
    const preset = THIRDWEB_PRESETS[chain.chainId];
    if (preset && !chain.rpcUrl) {
      chainObjects.set(chain.chainId, preset);
    } else {
      chainObjects.set(
        chain.chainId,
        defineChain({
          id: chain.chainId,
          rpc: chain.rpcUrl,
          name: chain.name,
          nativeCurrency: { decimals: 18, name: chain.asset, symbol: chain.asset },
          ...(chain.isTestnet ? { testnet: true as const } : {}),
          blockExplorers: [{ name: "Explorer", url: chain.explorer }],
        }),
      );
    }
  }
}

export function getChains(): AppChain[] {
  return registry;
}

export function getEvmChains(): AppChain[] {
  return registry.filter((chain) => chain.namespace === "eip155" || chain.network.startsWith("eip155:"));
}

export function getDefaultNetwork(): NetworkId {
  return defaultNetwork;
}

export function setDefaultNetwork(network: NetworkId): void {
  defaultNetwork = network;
}

export function getDefaultEvmNetwork(): EvmNetworkId {
  if (!isEvmNetwork(defaultNetwork)) {
    const first = getEvmChains().find((chain) => isEvmNetwork(chain.network));
    if (!first) throw new Error("No EVM network available");
    return first.network as EvmNetworkId;
  }
  return defaultNetwork;
}

export function getChainObject(chainId: number): Chain | undefined {
  return chainObjects.get(chainId);
}

export function getChainByNetwork(network: NetworkId | string): AppChain | undefined {
  return registry.find((chain) => chain.network === network);
}

export function getIdentityChain(): Chain | undefined {
  const network = getDefaultEvmNetwork();
  return getChainObject(evmChainId(network));
}

export function getAccountAbstraction(): SmartWalletOptions | undefined {
  const chain = getIdentityChain();
  if (!chain) return undefined;
  return { chain, sponsorGas: true };
}
