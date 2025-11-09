import WalletPanel from './components/WalletPanel';
import MintForm from './components/MintForm';
import MyNFTs from './components/MyNFTs';
import MarketplacePanel from './components/MarketplacePanel';
import AdminPanel from './components/AdminPanel';

function App() {
	return (
		<div className="mx-auto max-w-6xl p-4">
			<header className="mb-4 flex items-center justify-between">
				<h1 className="text-xl font-semibold">Sui NFT Marketplace</h1>
				<WalletPanel />
			</header>
			<main className="space-y-6">
				<MintForm />
				<MyNFTs />
				<MarketplacePanel />
				<AdminPanel />
			</main>
		</div>
	);
}

export default App
