import { usePurchase } from '../contexts/PurchaseContext';

export function usePremium() {
  return usePurchase();
}
