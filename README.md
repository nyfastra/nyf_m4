# Sui NFT Marketplace – React Front‑End

Production‑ready DApp front‑end for a Sui NFT marketplace using React + Vite, TypeScript, Sui TypeScript SDK, and Sui DApp Kit.

## Prerequisites

- Sui testnet or localnet available
- Published package ID of your marketplace Move contracts
- A Sui browser wallet (e.g., Sui Wallet)

## Setup

1) Install dependencies

```bash
npm install
```

2) Configure environment

Copy `ENV.EXAMPLE` to `.env` and fill values:

```bash
cp ENV.EXAMPLE .env
```

Required keys:

- `VITE_SUI_NETWORK` or `VITE_SUI_RPC_URL`
- `VITE_PACKAGE_ID`
- `VITE_MODULE_NFT`, `VITE_MODULE_MARKET`
- `VITE_FN_MINT`, `VITE_FN_LIST`, `VITE_FN_BUY`, `VITE_FN_CANCEL`, `VITE_FN_WITHDRAW`
- `VITE_TYPE_NFT`, `VITE_TYPE_LISTING`
- `VITE_ADMIN_ADDRESS`

3) Run the app

```bash
npm run dev
```

## Contract Mapping

Configured in `src/configs/constants.ts` via env vars. The UI calls:

- Mint: `${PACKAGE_ID}::${MODULE_NFT}::${FN_MINT}(name, description, imageUrl)`
- List: `${PACKAGE_ID}::${MODULE_MARKET}::${FN_LIST}(nftObjectId, priceMist)`
- Buy: `${PACKAGE_ID}::${MODULE_MARKET}::${FN_BUY}(listingObjectId)`
- Cancel: `${PACKAGE_ID}::${MODULE_MARKET}::${FN_CANCEL}(listingObjectId)`
- Withdraw: `${PACKAGE_ID}::${MODULE_MARKET}::${FN_WITHDRAW}()`

Object types used for reads:

- NFT: `VITE_TYPE_NFT`
- Listing: `VITE_TYPE_LISTING` (browsing all listings may require an indexer or contract‑specific storage scanning)

## Features

- Wallet connect/disconnect, address + SUI balance
- Mint NFT form (PTB)
- View your NFTs
- Marketplace actions: list, buy, cancel (by objectId)
- Admin: show placeholders for fee/accumulated fees and withdraw button (admin‑guarded)

## Notes

- Browsing listed NFTs globally often requires contract‑specific storage layout or an indexer; adapt `MarketplacePanel` accordingly to your contract’s listing storage.
- UI states with basic inline alerts are implemented; you can add a toast library for richer UX.
