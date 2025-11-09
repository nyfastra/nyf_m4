import { useEffect, useState } from 'react';
import { ConnectButton, useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';

export default function WalletPanel() {
	const account = useCurrentAccount();
	const client = useSuiClient();
	const [balance, setBalance] = useState<string>('0');

	useEffect(() => {
		let cancelled = false;
		async function loadBalance() {
			if (!account?.address) {
				setBalance('0');
				return;
			}
			try {
				const res = await client.getBalance({ owner: account.address });
				if (!cancelled) setBalance((Number(res.totalBalance) / 1e9).toFixed(4));
			} catch {
				if (!cancelled) setBalance('0');
			}
		}
		loadBalance();
		return () => {
			cancelled = true;
		};
	}, [account?.address, client]);

	return (
		<div className="flex items-center justify-between gap-4 rounded-lg border border-neutral-800 bg-neutral-900 p-3">
			<div className="flex items-center gap-3">
				<ConnectButton />
				{account?.address ? (
					<div className="text-sm text-neutral-300">
						<div className="font-mono">{account.address}</div>
						<div className="text-xs text-neutral-400">Balance: {balance} SUI</div>
					</div>
				) : (
					<div className="text-sm text-neutral-400">Connect a wallet to begin</div>
				)}
			</div>
		</div>
	);
}

