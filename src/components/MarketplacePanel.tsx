import { useEffect, useState, useMemo, useRef } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClientInfiniteQuery, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { PACKAGE_ID, MODULE_MARKET, FN_LIST, FN_BUY, FN_CANCEL, TYPE_NFT, TYPE_LISTING, MARKETPLACE_ADDRESS } from '../configs/constants';

export default function MarketplacePanel() {
	return (
		<section className="space-y-6">
			<div className="flex items-center gap-3">
				<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-lg">
					<svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
					</svg>
				</div>
				<h2 className="text-2xl font-bold text-white">Marketplace</h2>
			</div>
			<ListForSale />
			<BuyListing />
			<CancelListing />
		</section>
	);
}

function ListForSale() {
	const account = useCurrentAccount();
	const suiClient = useSuiClient();
	const { mutateAsync, isPending } = useSignAndExecuteTransaction();
	const [objectId, setObjectId] = useState('');
	const [ownedNfts, setOwnedNfts] = useState<{ id: string; name: string }[]>([]);
	const [loadingNfts, setLoadingNfts] = useState(false);
	const [priceSui, setPriceSui] = useState('');
	const [msg, setMsg] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [refreshTrigger, setRefreshTrigger] = useState(0);

	useEffect(() => {
		async function load() {
			setOwnedNfts([]);
			if (!account?.address || !TYPE_NFT) return;
			setLoadingNfts(true);
			try {
				const resp = await suiClient.getOwnedObjects({
					owner: account.address,
					filter: { StructType: TYPE_NFT },
					options: { showType: true, showContent: true },
				});
				const items = (resp.data || []).map((o: any) => {
					const id = o.data?.objectId || o.data?.object?.objectId || o.objectId;
					const fields = o.data?.content?.fields || o.data?.content?.data?.fields || {};
					const name = typeof fields.name === 'string' && fields.name.length > 0 ? fields.name : id;
					return { id, name };
				});
				setOwnedNfts(items);
				if (items.length > 0) setObjectId(items[0].id);
			} catch (e) {
				// ignore; UI will show empty dropdown
			} finally {
				setLoadingNfts(false);
			}
		}
		load();
	}, [account?.address, TYPE_NFT, refreshTrigger]);

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

	async function onList(e: React.FormEvent) {
		e.preventDefault();
		setMsg(null);
		setError(null);
		if (!account?.address) return setError('Connect wallet');
		if (!PACKAGE_ID) return setError('Set PACKAGE_ID in env');
		if (!objectId) return setError('NFT object ID is required');
		const price = Number(priceSui);
		if (!Number.isFinite(price) || price <= 0) return setError('Enter a valid positive price');
		const priceMist = BigInt(Math.floor(price * 1e9));
		const tx = new Transaction();
		tx.moveCall({ target: `${PACKAGE_ID}::${MODULE_MARKET}::${FN_LIST}`, arguments: [tx.object(objectId), tx.pure.u64(priceMist)] });
		try {
			await mutateAsync({ signer: account.address, transaction: tx });
			setMsg('Listed for sale');
			setPriceSui('');
			// Dispatch event to refresh listings
			window.dispatchEvent(new CustomEvent('nftListed'));
			// Also trigger refresh after a delay
			setTimeout(() => {
				setRefreshTrigger(prev => prev + 1);
			}, 2000);
		} catch (e: any) {
			setError(e?.message || 'List failed');
		}
	}

	return (
		<div className="group relative overflow-hidden rounded-xl border border-neutral-800 bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-950 p-6 shadow-lg transition-all duration-300 hover:border-indigo-500/50 hover:shadow-indigo-500/10">
			<div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
			<div className="relative">
				<div className="mb-4 flex items-center gap-2">
					<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-lg">
						<svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
						</svg>
					</div>
					<h3 className="text-lg font-semibold text-white">List NFT for Sale</h3>
				</div>
				<form className="space-y-4" onSubmit={onList}>
					<div className="flex flex-col gap-3 sm:flex-row">
						<div className="relative flex-1">
				<select
								className="w-full appearance-none rounded-lg border border-neutral-700 bg-neutral-950 p-3.5 pr-10 text-white transition-all duration-200 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 hover:border-neutral-600 [&>option]:bg-neutral-950 [&>option]:text-white"
					value={objectId}
					onChange={(e) => setObjectId(e.target.value)}
					disabled={loadingNfts || ownedNfts.length === 0}
								style={{
									backgroundColor: '#0a0a0a',
									color: '#ffffff',
								}}
				>
					{ownedNfts.length === 0 ? (
									<option value="" style={{ backgroundColor: '#0a0a0a', color: '#ffffff' }}>{loadingNfts ? 'Loading your NFTs…' : 'No NFTs found'}</option>
					) : (
						ownedNfts.map((n) => (
										<option key={n.id} value={n.id} style={{ backgroundColor: '#0a0a0a', color: '#ffffff' }}>{n.name}</option>
						))
					)}
				</select>
							<div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
								<svg className="h-5 w-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
								</svg>
							</div>
						</div>
						<input
							className="w-full rounded-lg border border-neutral-700 bg-gradient-to-br from-neutral-950 to-neutral-900 p-3.5 text-white placeholder-neutral-500 transition-all duration-200 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 hover:border-neutral-600 sm:w-40"
							placeholder="Price (SUI)"
							value={priceSui}
							onChange={(e) => setPriceSui(e.target.value)}
						/>
						<button
							disabled={isPending}
							className="group/btn relative overflow-hidden rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 py-3.5 font-semibold text-white shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:from-indigo-500 hover:to-indigo-400 hover:shadow-indigo-500/50 active:scale-95"
						>
							<span className="relative z-10 flex items-center justify-center gap-2">
								{isPending ? (
									<>
										<svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
											<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
											<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
										</svg>
										Submitting...
									</>
								) : (
									'List for Sale'
								)}
							</span>
							<div className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-indigo-300 opacity-0 transition-opacity duration-300 group-hover/btn:opacity-100"></div>
						</button>
					</div>
			</form>
				{msg && (
					<div className="mt-4 animate-in fade-in slide-in-from-top-2 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-400 backdrop-blur-sm">
						<div className="flex items-center gap-2">
							<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
							</svg>
							{msg}
						</div>
					</div>
				)}
				{error && (
					<div className="mt-4 animate-in fade-in slide-in-from-top-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400 backdrop-blur-sm">
						<div className="flex items-center gap-2">
							<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
							</svg>
							{error}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

type ListingItem = {
	id: string;
	nftId?: string;
	nftName?: string;
	price?: string;
	priceSui?: number;
	fields?: Record<string, any>;
};

function BuyListing() {
	const account = useCurrentAccount();
	const suiClient = useSuiClient();
	const { mutateAsync, isPending } = useSignAndExecuteTransaction();
	const [listingId, setListingId] = useState('');
	const [msg, setMsg] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [selectedListing, setSelectedListing] = useState<ListingItem | null>(null);

	// Validate marketplace address format
	const isValidSuiAddress = (address: string): boolean => {
		if (!address) return false;
		// Sui addresses are 66 characters (0x + 64 hex chars) or 64 characters (without 0x)
		const cleanAddress = address.startsWith('0x') ? address.slice(2) : address;
		return cleanAddress.length === 64 && /^[0-9a-fA-F]+$/.test(cleanAddress);
	};

	const isValidMarketplaceAddress = isValidSuiAddress(MARKETPLACE_ADDRESS);

	// Fetch all listings from marketplace address specified in .env (VITE_MARKETPLACE_ADDRESS)
	// Using useSuiClient with React Query pattern for better error handling
	// Reference: https://sdk.mystenlabs.com/dapp-kit/rpc-hooks
	const [listingsData, setListingsData] = useState<{ pages: Array<{ data: any[]; hasNextPage: boolean; nextCursor: string | null }> } | null>(null);
	const [loadingListings, setLoadingListings] = useState(false);
	const [listingsError, setListingsError] = useState(false);
	const [listingsErrorDetails, setListingsErrorDetails] = useState<Error | null>(null);
	const [refreshTrigger, setRefreshTrigger] = useState(0);

	const canQuery = isValidMarketplaceAddress && !!MARKETPLACE_ADDRESS && !!TYPE_LISTING;

	// Fetch listings using useSuiClient with pagination
	useEffect(() => {
		if (!canQuery) {
			setListingsData(null);
			setLoadingListings(false);
			return;
		}

		async function loadListings() {
			setLoadingListings(true);
			setListingsError(false);
			setListingsErrorDetails(null);
			const allPages: Array<{ data: any[]; hasNextPage: boolean; nextCursor: string | null }> = [];

			try {
				let hasNextPage = true;
				let cursor: string | null = null;

				while (hasNextPage) {
					const response = await suiClient.getOwnedObjects({
						owner: MARKETPLACE_ADDRESS,
						filter: { StructType: TYPE_LISTING },
						options: { showContent: true, showType: true },
						cursor: cursor || undefined,
						limit: 50,
					});

					allPages.push({
						data: response.data || [],
						hasNextPage: response.hasNextPage || false,
						nextCursor: response.nextCursor || null,
					});

					hasNextPage = response.hasNextPage || false;
					cursor = response.nextCursor || null;

					if (!hasNextPage || !cursor) break;
				}

				setListingsData({ pages: allPages });
			} catch (error: any) {
				console.error('Error fetching listings:', error);
				setListingsError(true);
				setListingsErrorDetails(error);
			} finally {
				setLoadingListings(false);
			}
		}

		loadListings();
	}, [suiClient, MARKETPLACE_ADDRESS, TYPE_LISTING, canQuery, refreshTrigger]);

	// Refetch function for manual refresh
	const refetchListings = () => {
		setRefreshTrigger(prev => prev + 1);
	};

	// Auto-refresh every 30 seconds
	useEffect(() => {
		if (!canQuery) return;
		const interval = setInterval(() => {
			setRefreshTrigger(prev => prev + 1);
		}, 30000);
		return () => clearInterval(interval);
	}, [canQuery]);

	const fetchNextPage = () => {
		// Manual pagination handled in useEffect
	};

	const hasNextPage = listingsData?.pages?.[listingsData.pages.length - 1]?.hasNextPage || false;

	// Comprehensive debugging for listings fetch
	useEffect(() => {
		console.group('🔍 Listing Fetch Debug Info');
		console.log('📋 MARKETPLACE_ADDRESS:', MARKETPLACE_ADDRESS || '❌ NOT SET');
		console.log('📋 Address valid:', isValidMarketplaceAddress);
		if (MARKETPLACE_ADDRESS && !isValidMarketplaceAddress) {
			console.error('❌ Invalid Sui address format!', {
				provided: MARKETPLACE_ADDRESS,
				length: MARKETPLACE_ADDRESS.length,
				expected: '66 characters (0x + 64 hex) or 64 hex characters',
				example: '0x' + '0'.repeat(64),
			});
		}
		console.log('📋 TYPE_LISTING:', TYPE_LISTING || '❌ NOT SET');
		console.log('📋 Query enabled:', isValidMarketplaceAddress && !!TYPE_LISTING);
		console.log('📋 Loading state:', loadingListings);
		console.log('📋 Error state:', listingsError);
		if (listingsError) {
			console.error('❌ Query error:', listingsErrorDetails);
			if (listingsErrorDetails?.message?.includes('Invalid Sui address')) {
				console.error('💡 Fix: Set VITE_MARKETPLACE_ADDRESS in .env to a valid Sui address (0x followed by 64 hex characters)');
			}
		}
		console.log('📋 Has data:', !!listingsData);
		console.log('📋 Pages count:', listingsData?.pages?.length || 0);
		if (listingsData?.pages) {
			listingsData.pages.forEach((page, index) => {
				console.log(`📄 Page ${index + 1}:`, {
					dataLength: page.data?.length || 0,
					hasNextPage: page.hasNextPage,
					nextCursor: page.nextCursor,
					items: page.data?.map(item => ({
						objectId: item.data?.objectId,
						type: item.data?.type,
						hasContent: !!item.data?.content,
					})) || [],
				});
			});
		}
		console.groupEnd();
	}, [MARKETPLACE_ADDRESS, isValidMarketplaceAddress, TYPE_LISTING, loadingListings, listingsError, listingsErrorDetails, listingsData]);

	// Process listings from all pages using useMemo
	const listings = useMemo(() => {
		const allListings: ListingItem[] = [];

		console.log('🔄 Processing listings data...');
		console.log('📊 Raw listingsData:', listingsData);

		if (listingsData?.pages) {
			console.log(`📄 Processing ${listingsData.pages.length} page(s)`);
			
			for (const page of listingsData.pages) {
				const pageItems = page.data || [];
				console.log(`📄 Page has ${pageItems.length} items`);
				
				for (const item of pageItems) {
					const id = item.data?.objectId || '';
					if (!id) {
						console.warn('⚠️ Item missing objectId:', item);
						continue;
					}

					const objectType = item.data?.type;
					console.log(`🔍 Processing item ${id}:`, {
						type: objectType,
						expectedType: TYPE_LISTING,
						matches: objectType === TYPE_LISTING || (objectType && objectType.includes('Listing')),
					});

					if (objectType) {
						const typeStr = objectType as string;
						if (typeStr === TYPE_LISTING || typeStr.includes('Listing')) {
							const fields = (item.data.content as any)?.fields || {};
							const priceMist = fields.price || '0';
							const priceSui = Number(priceMist) / 1e9;

							// Extract NFT information from listing
							const nftFields = fields.nft?.fields || fields.nft || {};
							const nftName = nftFields.name || 'Unknown NFT';
							const nftId = nftFields.id?.id || id;
							const nftUrl = nftFields.url || '';
							const nftDescription = nftFields.description || '';

							console.log(`✅ Added listing: ${id} - ${nftName} - ${priceSui} SUI`);

							allListings.push({
								id,
								nftId: typeof nftId === 'string' ? nftId : id,
								nftName: typeof nftName === 'string' ? nftName : 'Unknown NFT',
								price: priceMist.toString(),
								priceSui,
								fields: {
									...fields,
									nft: {
										name: nftName,
										url: nftUrl,
										description: nftDescription,
									},
								},
							});
						} else {
							console.warn(`⚠️ Item ${id} type mismatch:`, {
								actual: typeStr,
								expected: TYPE_LISTING,
							});
						}
					} else {
						console.warn(`⚠️ Item ${id} missing type`);
					}
				}
			}
		} else {
			console.log('⚠️ No pages in listingsData');
		}

		// Remove duplicates based on listing ID
		const uniqueListings = Array.from(new Map(allListings.map((listing) => [listing.id, listing])).values());
		console.log(`✅ Processed ${uniqueListings.length} unique listings from ${allListings.length} total`);
		
		return uniqueListings;
	}, [listingsData, TYPE_LISTING]);

	// Listen for NFT listed event to refresh
	useEffect(() => {
		const handleNftListed = () => {
			setTimeout(() => {
				refetchListings();
			}, 2000);
		};

		window.addEventListener('nftListed', handleNftListed);
		return () => {
			window.removeEventListener('nftListed', handleNftListed);
		};
	}, [refetchListings]);

	// Set initial listing selection
	useEffect(() => {
		if (listings.length > 0 && !listingId) {
			setListingId(listings[0].id);
			setSelectedListing(listings[0]);
		}
	}, [listings, listingId]);

	// Set error state from query error
	useEffect(() => {
		if (listingsError) {
			setError(listingsErrorDetails?.message || 'Failed to load listings. Please try again.');
		}
	}, [listingsError, listingsErrorDetails]);

	// Load more pages if available
	// Using useRef to track if we've already triggered a fetch to prevent infinite loops
	const fetchingRef = useRef(false);
	const hasNextPageRef = useRef(hasNextPage);
	const loadingListingsRef = useRef(loadingListings);
	
	// Update refs
	hasNextPageRef.current = hasNextPage;
	loadingListingsRef.current = loadingListings;
	
	useEffect(() => {
		if (hasNextPageRef.current && !loadingListingsRef.current && !fetchingRef.current) {
			fetchingRef.current = true;
			fetchNextPage().finally(() => {
				fetchingRef.current = false;
			});
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [hasNextPage, loadingListings]);

	const handleListingChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const selectedId = e.target.value;
		setListingId(selectedId);
		const listing = listings.find(l => l.id === selectedId);
		setSelectedListing(listing || null);
	};

	async function onBuy(e: React.FormEvent) {
		e.preventDefault();
		setMsg(null);
		setError(null);
		if (!account?.address) return setError('Connect wallet');
		if (!PACKAGE_ID) return setError('Set PACKAGE_ID in env');
		if (!listingId) return setError('Listing object ID is required');
		
		// Get the listing price
		const listing = listings.find(l => l.id === listingId) || selectedListing;
		if (!listing || !listing.priceSui) {
			// Try to fetch the listing to get the price
			try {
				const obj = await suiClient.getObject({ 
					id: listingId, 
					options: { showContent: true } 
				});
				if (obj.data && obj.data.content) {
					const fields = (obj.data.content as any).fields || {};
					const priceMist = fields.price || '0';
					const priceSui = Number(priceMist) / 1e9;
					
					const tx = new Transaction();
					// Split a coin for payment (use gas coin as source)
					const [payment] = tx.splitCoins(tx.gas, [tx.pure.u64(BigInt(Math.floor(priceSui * 1e9)))]);
					tx.moveCall({ 
						target: `${PACKAGE_ID}::${MODULE_MARKET}::${FN_BUY}`, 
						arguments: [tx.object(listingId), payment] 
					});
					
					try {
						await mutateAsync({ signer: account.address, transaction: tx });
						setMsg('Purchase submitted');
						// Refresh listings after purchase using React Query refetch
						setTimeout(() => {
							refetchListings();
						}, 2000);
					} catch (e: any) {
						setError(e?.message || 'Buy failed');
					}
					return;
				}
			} catch (e) {
				return setError('Could not fetch listing price');
			}
		}
		
		const priceMist = BigInt(Math.floor(listing.priceSui * 1e9));
		const tx = new Transaction();
		// Split a coin for payment (use gas coin as source)
		const [payment] = tx.splitCoins(tx.gas, [tx.pure.u64(priceMist)]);
		tx.moveCall({ 
			target: `${PACKAGE_ID}::${MODULE_MARKET}::${FN_BUY}`, 
			arguments: [tx.object(listingId), payment] 
		});
		
		try {
			await mutateAsync({ signer: account.address, transaction: tx });
			setMsg('Purchase submitted');
			// Refresh listings after purchase using React Query refetch
			setTimeout(() => {
				refetchListings();
			}, 2000);
		} catch (e: any) {
			setError(e?.message || 'Buy failed');
		}
	}

	return (
		<div className="group relative overflow-hidden rounded-xl border border-neutral-800 bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-950 p-6 shadow-lg transition-all duration-300 hover:border-emerald-500/50 hover:shadow-emerald-500/10">
			<div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
			<div className="relative">
				<div className="mb-4 flex items-center justify-between">
					<div className="flex items-center gap-2">
						<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg">
							<svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
							</svg>
						</div>
						<div>
							<h3 className="text-lg font-semibold text-white">Buy a Listed NFT</h3>
							<p className="text-xs text-neutral-400">Public listings - visible to everyone</p>
						</div>
					</div>
					<button
						onClick={() => refetchListings()}
						disabled={loadingListings}
						className="rounded-lg border border-neutral-700 bg-neutral-800/50 p-2 transition-all duration-200 hover:border-emerald-500/50 hover:bg-emerald-500/10 disabled:opacity-50"
						title="Refresh listings"
					>
						<svg className={`h-4 w-4 text-neutral-400 ${loadingListings ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
						</svg>
					</button>
				</div>
				
				<form className="space-y-4" onSubmit={onBuy}>
					<div className="space-y-2">
						<label className="block text-sm font-medium text-neutral-300">Select NFT Listing</label>
						<div className="relative">
							<select
								className="w-full appearance-none rounded-lg border border-neutral-700 bg-neutral-950 p-3.5 pr-10 text-white transition-all duration-200 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 hover:border-neutral-600 [&>option]:bg-neutral-950 [&>option]:text-white"
								value={listingId}
								onChange={handleListingChange}
								disabled={loadingListings || isPending}
								style={{
									backgroundColor: '#0a0a0a',
									color: '#ffffff',
								}}
							>
							{loadingListings ? (
								<option value="" style={{ backgroundColor: '#0a0a0a', color: '#ffffff' }}>Loading available listings...</option>
							) : listings.length === 0 ? (
								<option value="" style={{ backgroundColor: '#0a0a0a', color: '#ffffff' }}>No listings found - List an NFT first or enter ID manually</option>
							) : (
									listings.map((listing) => (
										<option key={listing.id} value={listing.id} style={{ backgroundColor: '#0a0a0a', color: '#ffffff' }}>
											{listing.nftName || 'NFT'} - {listing.priceSui ? `${listing.priceSui.toFixed(2)} SUI` : 'Price N/A'} ({listing.id.substring(0, 8)}...)
										</option>
									))
								)}
							</select>
							<div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
								<svg className="h-5 w-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
								</svg>
							</div>
						</div>
						
						{selectedListing && listings.length > 0 && (
							<div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 backdrop-blur-sm">
								<div className="flex items-center justify-between">
									<div>
										<div className="text-sm font-medium text-emerald-400">{selectedListing.nftName || 'NFT'}</div>
										{selectedListing.priceSui && (
											<div className="mt-1 text-lg font-bold text-white">
												{selectedListing.priceSui.toFixed(2)} <span className="text-sm font-normal text-emerald-400">SUI</span>
											</div>
										)}
									</div>
									<div className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-300">
										Available
									</div>
								</div>
							</div>
						)}
						{listings.length === 0 && !loadingListings && (
							<div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 backdrop-blur-sm">
								<div className="flex items-start gap-2">
									<svg className="h-5 w-5 text-amber-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
									<div className="text-sm text-amber-300">
										<p className="font-medium mb-1">No listings found</p>
										<p className="text-xs text-amber-400/80 mb-2">All listings are public and visible to everyone. List an NFT for sale first, or enter a listing object ID manually below.</p>
										{(!MARKETPLACE_ADDRESS || !isValidMarketplaceAddress || !TYPE_LISTING) && (
											<div className="mt-2 p-2 bg-amber-900/30 rounded text-xs">
												<p className="font-semibold mb-1">⚠️ Configuration Issue:</p>
												{!MARKETPLACE_ADDRESS && <p>• MARKETPLACE_ADDRESS not set in .env</p>}
												{MARKETPLACE_ADDRESS && !isValidMarketplaceAddress && (
													<div>
														<p>• Invalid Sui address format in VITE_MARKETPLACE_ADDRESS</p>
														<p className="text-amber-400/70 mt-1">
															Current: {MARKETPLACE_ADDRESS.length > 30 ? `${MARKETPLACE_ADDRESS.substring(0, 30)}...` : MARKETPLACE_ADDRESS} ({MARKETPLACE_ADDRESS.length} chars)
														</p>
														<p className="text-amber-400/70">
															Expected: 66 characters (0x + 64 hex) or 64 hex characters
														</p>
														<p className="text-amber-400/70 mt-1">
															Example: <code className="bg-amber-950/50 px-1 rounded">0x{Array(64).fill('0').join('')}</code>
														</p>
													</div>
												)}
												{!TYPE_LISTING && <p>• TYPE_LISTING not set in .env</p>}
												<p className="mt-1 text-amber-400/70">Check browser console for detailed debug info.</p>
											</div>
										)}
										{listingsError && (
											<div className="mt-2 p-2 bg-red-900/30 rounded text-xs">
												<p className="font-semibold mb-1">❌ Query Error:</p>
												<p className="text-red-300">{listingsErrorDetails?.message || 'Unknown error'}</p>
												{listingsErrorDetails?.message?.includes('Invalid Sui address') && (
													<div className="mt-2 p-2 bg-red-950/30 rounded">
														<p className="text-red-200 text-xs mb-1">💡 How to fix:</p>
														<ol className="text-red-300/80 text-xs list-decimal list-inside space-y-1">
															<li>Open your <code className="bg-red-950/50 px-1 rounded">.env</code> file</li>
															<li>Set <code className="bg-red-950/50 px-1 rounded">VITE_MARKETPLACE_ADDRESS</code> to a valid Sui address</li>
															<li>Format: <code className="bg-red-950/50 px-1 rounded">0x</code> followed by 64 hexadecimal characters</li>
															<li>Example: <code className="bg-red-950/50 px-1 rounded">VITE_MARKETPLACE_ADDRESS=0x1234...abcd</code></li>
															<li>Restart your dev server after changing .env</li>
														</ol>
													</div>
												)}
											</div>
										)}
										{isValidMarketplaceAddress && TYPE_LISTING && !listingsError && (
											<div className="mt-2 p-2 bg-blue-900/30 rounded text-xs">
												<p className="font-semibold mb-1">ℹ️ Debug Info:</p>
												<p>• Marketplace Address: {MARKETPLACE_ADDRESS.substring(0, 20)}...</p>
												<p>• Listing Type: {TYPE_LISTING}</p>
												<p>• Query Status: {loadingListings ? 'Loading...' : 'Completed'}</p>
												<p>• Data Pages: {listingsData?.pages?.length || 0}</p>
												<p className="mt-1 text-blue-400/70">Check browser console (F12) for detailed logs.</p>
											</div>
										)}
									</div>
								</div>
							</div>
						)}
						{listings.length > 0 && !account?.address && (
							<div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 backdrop-blur-sm">
								<div className="flex items-start gap-2">
									<svg className="h-5 w-5 text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
									<div className="text-sm text-blue-300">
										<p className="font-medium mb-1">Connect wallet to purchase</p>
										<p className="text-xs text-blue-400/80">You can view all listings without a wallet. Connect your wallet to buy an NFT.</p>
									</div>
								</div>
							</div>
						)}
					</div>

					<div className="flex gap-3">
						<input
							className="flex-1 rounded-lg border border-neutral-700 bg-gradient-to-br from-neutral-950 to-neutral-900 p-3 text-white placeholder-neutral-500 transition-all duration-200 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 hover:border-neutral-600"
							placeholder="Or enter listing objectId manually"
							value={listingId}
							onChange={(e) => {
								setListingId(e.target.value);
								setSelectedListing(null);
							}}
							disabled={isPending}
						/>
						<button
							disabled={isPending || !listingId}
							className="group/btn relative overflow-hidden rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-3 font-semibold text-white shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:from-emerald-500 hover:to-emerald-400 hover:shadow-emerald-500/50 active:scale-95"
						>
							<span className="relative z-10 flex items-center gap-2">
								{isPending ? (
									<>
										<svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
											<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
											<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
										</svg>
										Submitting...
									</>
								) : (
									<>
										<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
										</svg>
										Buy Now
									</>
								)}
							</span>
							<div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-emerald-300 opacity-0 transition-opacity duration-300 group-hover/btn:opacity-100"></div>
						</button>
					</div>
			</form>
				
				{msg && (
					<div className="mt-4 animate-in fade-in slide-in-from-top-2 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-400 backdrop-blur-sm">
						<div className="flex items-center gap-2">
							<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
							</svg>
							{msg}
						</div>
					</div>
				)}
				{error && (
					<div className="mt-4 animate-in fade-in slide-in-from-top-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400 backdrop-blur-sm">
						<div className="flex items-center gap-2">
							<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
							</svg>
							{error}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

function CancelListing() {
	const account = useCurrentAccount();
	const { mutateAsync, isPending } = useSignAndExecuteTransaction();
	const [listingId, setListingId] = useState('');
	const [msg, setMsg] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	async function onCancel(e: React.FormEvent) {
		e.preventDefault();
		setMsg(null);
		setError(null);
		if (!account?.address) return setError('Connect wallet');
		if (!PACKAGE_ID) return setError('Set PACKAGE_ID in env');
		if (!listingId) return setError('Listing object ID is required');
		const tx = new Transaction();
		tx.moveCall({ target: `${PACKAGE_ID}::${MODULE_MARKET}::${FN_CANCEL}`, arguments: [tx.object(listingId)] });
		try {
			await mutateAsync({ signer: account.address, transaction: tx });
			setMsg('Cancel submitted');
		} catch (e: any) {
			setError(e?.message || 'Cancel failed');
		}
	}

	return (
		<div className="group relative overflow-hidden rounded-xl border border-neutral-800 bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-950 p-6 shadow-lg transition-all duration-300 hover:border-amber-500/50 hover:shadow-amber-500/10">
			<div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
			<div className="relative">
				<div className="mb-4 flex items-center gap-2">
					<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg">
						<svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
						</svg>
					</div>
					<h3 className="text-lg font-semibold text-white">Cancel a Listing</h3>
				</div>
				<form className="space-y-4" onSubmit={onCancel}>
					<div className="flex gap-3">
						<input
							className="flex-1 rounded-lg border border-neutral-700 bg-gradient-to-br from-neutral-950 to-neutral-900 p-3.5 text-white placeholder-neutral-500 transition-all duration-200 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 hover:border-neutral-600"
							placeholder="Listing objectId"
							value={listingId}
							onChange={(e) => setListingId(e.target.value)}
							disabled={isPending}
						/>
						<button
							disabled={isPending}
							className="group/btn relative overflow-hidden rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 px-6 py-3.5 font-semibold text-white shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:from-amber-500 hover:to-amber-400 hover:shadow-amber-500/50 active:scale-95"
						>
							<span className="relative z-10 flex items-center gap-2">
								{isPending ? (
									<>
										<svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
											<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
											<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
										</svg>
										Submitting...
									</>
								) : (
									<>
										<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
										</svg>
										Cancel Listing
									</>
								)}
							</span>
							<div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-amber-300 opacity-0 transition-opacity duration-300 group-hover/btn:opacity-100"></div>
						</button>
					</div>
			</form>
				{msg && (
					<div className="mt-4 animate-in fade-in slide-in-from-top-2 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-400 backdrop-blur-sm">
						<div className="flex items-center gap-2">
							<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
							</svg>
							{msg}
						</div>
					</div>
				)}
				{error && (
					<div className="mt-4 animate-in fade-in slide-in-from-top-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400 backdrop-blur-sm">
						<div className="flex items-center gap-2">
							<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
							</svg>
							{error}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

