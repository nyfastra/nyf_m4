import { createNetworkConfig, SuiClientProvider } from '@mysten/dapp-kit';

export const DEFAULT_NETWORK = (import.meta as any).env.VITE_SUI_NETWORK || 'testnet';
export const CUSTOM_RPC_URL = (import.meta as any).env.VITE_SUI_RPC_URL || undefined;

export const { networkConfig, useNetworkVariable } = createNetworkConfig({
	localnet: { url: 'http://127.0.0.1:9000' },
	devnet: { url: 'https://fullnode.devnet.sui.io' },
	testnet: { url: 'https://fullnode.testnet.sui.io' },
	mainnet: { url: 'https://fullnode.mainnet.sui.io' },
});

export function getSuiClientProviderProps() {
	if (CUSTOM_RPC_URL) {
		return { networks: { custom: { url: CUSTOM_RPC_URL } }, defaultNetwork: 'custom' as const };
	}
	return { networks: networkConfig, defaultNetwork: DEFAULT_NETWORK as keyof typeof networkConfig };
}

export type SuiProviderProps = ReturnType<typeof getSuiClientProviderProps>;

