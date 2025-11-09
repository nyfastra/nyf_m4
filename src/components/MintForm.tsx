import { useState } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { PACKAGE_ID, MODULE_NFT, FN_MINT } from '../configs/constants';

export default function MintForm() {
	const account = useCurrentAccount();
	const { mutateAsync, isPending } = useSignAndExecuteTransaction();
    const suiClient = useSuiClient();
	const [name, setName] = useState('');
	const [description, setDescription] = useState('');
	const [imageUrl, setImageUrl] = useState('');
	const [status, setStatus] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [txDigest, setTxDigest] = useState<string | null>(null);
    const [nftId, setNftId] = useState<string | null>(null);
    const [modalStatus, setModalStatus] = useState<string>('');

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setStatus(null);
		setError(null);
		if (!account?.address) return setError('Connect wallet');
		if (!PACKAGE_ID) return setError('Set PACKAGE_ID in env');
		if (!name || !imageUrl) return setError('Name and image URL are required');
		const tx = new Transaction();
		tx.moveCall({
			target: `${PACKAGE_ID}::${MODULE_NFT}::${FN_MINT}`,
			arguments: [tx.pure.string(name), tx.pure.string(description), tx.pure.string(imageUrl)],
		});
		try {
			setIsModalOpen(true);
			setModalStatus('Submitting transaction…');
			setTxDigest(null);
			setNftId(null);
			const res = await mutateAsync({
				signer: account.address,
				transaction: tx,
				options: { showEffects: true },
			});
			const digest = (res as any)?.digest as string | undefined;
			if (digest) {
				setTxDigest(digest);
				setModalStatus('Transaction submitted. Waiting for confirmation…');
				const confirmed = await suiClient.waitForTransaction({ digest, options: { showEffects: true } });
				const created = (confirmed as any)?.effects?.created;
				const createdId = created && created.length > 0 ? created[0]?.reference?.objectId : null;
				if (createdId) {
					setNftId(createdId);
					setModalStatus('Mint confirmed');
					// Dispatch custom event to refresh NFT lists
					window.dispatchEvent(new CustomEvent('nftMinted', { detail: { nftId: createdId } }));
				} else {
					setModalStatus('Confirmed, but NFT id not found');
				}
			} else {
				setModalStatus('Submitted. Digest unavailable from response.');
			}
			setStatus('Mint submitted');
		} catch (e: any) {
			setError(e?.message || 'Mint failed');
			setModalStatus('Mint failed');
		}
	}

	return (
		<section>
			<h2 className="mb-2 text-lg font-semibold">Mint NFT</h2>
			<form className="grid grid-cols-1 gap-3 md:grid-cols-3" onSubmit={onSubmit}>
				<input
					type="text"
					placeholder="Name"
					className="rounded border border-neutral-700 bg-neutral-950 p-2 outline-none"
					value={name}
					onChange={(e) => setName(e.target.value)}
				/>
				<input
					type="text"
					placeholder="Description"
					className="rounded border border-neutral-700 bg-neutral-950 p-2 outline-none"
					value={description}
					onChange={(e) => setDescription(e.target.value)}
				/>
				<input
					type="url"
					placeholder="Image URL"
					className="rounded border border-neutral-700 bg-neutral-950 p-2 outline-none"
					value={imageUrl}
					onChange={(e) => setImageUrl(e.target.value)}
				/>
				<button
					type="submit"
					disabled={isPending}
					className="rounded bg-indigo-600 px-4 py-2 font-medium disabled:opacity-50"
				>
					{isPending ? 'Submitting…' : 'Mint'}
				</button>
			</form>
			{status && <div className="mt-2 text-sm text-green-400">{status}</div>}
			{error && <div className="mt-2 text-sm text-red-400">{error}</div>}

			{isModalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center">
					<div className="absolute inset-0 bg-black/60" onClick={() => setIsModalOpen(false)} />
					<div className="relative z-10 w-full max-w-lg rounded border border-neutral-700 bg-neutral-950 p-4 text-sm">
						<div className="mb-2 text-base font-semibold">Mint Status</div>
						<div className="mb-2">{modalStatus}</div>
						{txDigest && (
							<div className="mb-2 break-all">
								Transaction: <a className="text-indigo-400 underline" href={`https://suiexplorer.com/txblock/${txDigest}?network=testnet`} target="_blank" rel="noreferrer">{txDigest}</a>
							</div>
						)}
						{nftId && (
							<div className="mb-2 break-all">NFT Object ID: {nftId}</div>
						)}
						<div className="mt-3 flex justify-end gap-2">
							<button className="rounded border border-neutral-600 px-3 py-1" onClick={() => setIsModalOpen(false)}>Close</button>
						</div>
					</div>
				</div>
			)}
		</section>
	);
}

