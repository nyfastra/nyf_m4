import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import '@mysten/dapp-kit/dist/index.css';
import App from './App.tsx'
import { WalletProvider } from '@mysten/dapp-kit'
import { SuiClientProvider } from '@mysten/dapp-kit'
import { getSuiClientProviderProps } from './configs/sui'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<QueryClientProvider client={queryClient}>
			<SuiClientProvider {...getSuiClientProviderProps()}>
				<WalletProvider autoConnect>
					<App />
				</WalletProvider>
			</SuiClientProvider>
		</QueryClientProvider>
	</StrictMode>,
)
