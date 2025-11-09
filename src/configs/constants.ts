export const PACKAGE_ID = (import.meta as any).env.VITE_PACKAGE_ID || '';
export function getPackageId(): string {
  if (typeof window !== 'undefined') {
    return window.localStorage.getItem('PACKAGE_ID') || PACKAGE_ID;
  }
  return PACKAGE_ID;
}
export function setPackageId(value: string) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('PACKAGE_ID', value);
  }
}
export const MODULE_NFT = (import.meta as any).env.VITE_MODULE_NFT || 'nft';
export const MODULE_MARKET = (import.meta as any).env.VITE_MODULE_MARKET || 'market';

export const FN_MINT = (import.meta as any).env.VITE_FN_MINT || 'mint';
export const FN_LIST = (import.meta as any).env.VITE_FN_LIST || 'list';
export const FN_BUY = (import.meta as any).env.VITE_FN_BUY || 'buy';
export const FN_CANCEL = (import.meta as any).env.VITE_FN_CANCEL || 'cancel';
export const FN_WITHDRAW = (import.meta as any).env.VITE_FN_WITHDRAW || 'withdraw';

export const TYPE_NFT = (import.meta as any).env.VITE_TYPE_NFT || '';
export const TYPE_LISTING = (import.meta as any).env.VITE_TYPE_LISTING || '';

export const ADMIN_ADDRESS = (import.meta as any).env.VITE_ADMIN_ADDRESS || '';
export const MARKETPLACE_ADDRESS = (import.meta as any).env.VITE_MARKETPLACE_ADDRESS || '';
