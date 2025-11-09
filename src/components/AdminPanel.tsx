import { useEffect, useState } from 'react';
import { useCurrentAccount, useSuiClient, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { ADMIN_ADDRESS, PACKAGE_ID, MODULE_MARKET, FN_WITHDRAW } from '../configs/constants';

export default function AdminPanel() {
	const account = useCurrentAccount();
	const client = useSuiClient();
	const { mutateAsync, isPending } = useSignAndExecuteTransaction();
	const [feePercent, setFeePercent] = useState<string>('-');
	const [accumFees, setAccumFees] = useState<string>('-');
	const [msg, setMsg] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const isAdmin = ADMIN_ADDRESS && account?.address?.toLowerCase() === ADMIN_ADDRESS.toLowerCase();

	useEffect(() => {
		let cancelled = false;
		async function load() {
			// TODO: Replace with actual reads from your marketplace state object(s)
			if (!cancelled) {
				setFeePercent('—');
				setAccumFees('—');
			}
		}
		load();
		return () => {
			cancelled = true;
		};
	}, [client]);

	async function onWithdraw() {
		setMsg(null);
		setError(null);
		if (!isAdmin) return setError('Admin only');
		if (!PACKAGE_ID) return setError('Set PACKAGE_ID in env');
		const tx = new Transaction();
		tx.moveCall({ target: `${PACKAGE_ID}::${MODULE_MARKET}::${FN_WITHDRAW}`, arguments: [] });
		try {
			await mutateAsync({ signer: account!.address!, transaction: tx });
			setMsg('Withdraw submitted');
		} catch (e: any) {
			setError(e?.message || 'Withdraw failed');
		}
	}

	return (
		<section className="rounded border border-neutral-800 bg-neutral-900 p-4">
			<h2 className="mb-2 text-lg font-semibold">Admin</h2>
			<div className="text-sm text-neutral-300">Fee: {feePercent}</div>
			<div className="text-sm text-neutral-300">Accumulated fees: {accumFees}</div>
			<div className="mt-3">
				<button onClick={onWithdraw} disabled={!isAdmin || isPending} className="rounded bg-purple-600 px-4 py-2 font-medium disabled:opacity-50">
					{isPending ? 'Submitting…' : 'Withdraw Fees'}
				</button>
			</div>
			{!isAdmin && (
				<div className="mt-2 text-xs text-neutral-500">Set VITE_ADMIN_ADDRESS to enable admin actions.</div>
			)}
			{msg && <div className="mt-2 text-sm text-green-400">{msg}</div>}
			{error && <div className="mt-2 text-sm text-red-400">{error}</div>}
		</section>
	);
}

