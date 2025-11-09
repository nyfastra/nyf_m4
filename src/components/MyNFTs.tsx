import { useEffect, useMemo, useState } from 'react';
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { TYPE_NFT } from '../configs/constants';

type SimpleObject = {
	data?: { objectId: string; content?: { fields?: Record<string, any> } } | null;
};

export default function MyNFTs() {
	const account = useCurrentAccount();
	const client = useSuiClient();
	const [nfts, setNfts] = useState<SimpleObject[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const owner = account?.address;
	const [refreshTrigger, setRefreshTrigger] = useState(0);

	useEffect(() => {
		if (!owner || !TYPE_NFT) {
			setNfts([]);
			return;
		}
		let cancelled = false;
		async function load() {
			setLoading(true);
			setError(null);
			try {
				const res = await client.getOwnedObjects({
					owner,
					filter: { StructType: TYPE_NFT },
					options: { showContent: true },
				});
				if (!cancelled) setNfts(res.data as any);
			} catch (e: any) {
				if (!cancelled) setError(e?.message || 'Failed to fetch NFTs');
			} finally {
				if (!cancelled) setLoading(false);
			}
		}
		load();
		return () => {
			cancelled = true;
		};
	}, [owner, client, refreshTrigger]);

	// Listen for NFT minted event to refresh
	useEffect(() => {
		const handleNftMinted = () => {
			// Small delay to ensure blockchain state is updated
			setTimeout(() => {
				setRefreshTrigger(prev => prev + 1);
			}, 1000);
		};

		window.addEventListener('nftMinted', handleNftMinted);
		return () => {
			window.removeEventListener('nftMinted', handleNftMinted);
		};
	}, []);

	if (!owner) return null;

	return (
		<section>
			<h2 className="mb-2 text-lg font-semibold">My NFTs</h2>
			{loading && <div className="text-sm text-neutral-400">Loading…</div>}
			{error && <div className="text-sm text-red-400">{error}</div>}
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
				{nfts.map((o) => {
					const id = o.data?.objectId || 'unknown';
					const fields = (o.data?.content as any)?.fields || {};
					return (
						<div key={id} className="rounded-lg border border-neutral-800 bg-neutral-900 p-3">
							{fields.image_url ? (
								<img src={fields.image_url} alt={fields.name || id} className="mb-2 h-40 w-full rounded object-cover" />
							) : null}
							<div className="text-sm font-semibold">{fields.name || id}</div>
							{fields.description && (
								<div className="text-xs text-neutral-400">{fields.description}</div>
							)}
							<div className="mt-2 text-xs text-neutral-500">{id}</div>
						</div>
					);
				})}
			</div>
		</section>
	);
}

