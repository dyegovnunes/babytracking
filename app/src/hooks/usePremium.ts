import { usePurchase } from '../contexts/PurchaseContext';

export function usePremium() {
  const { isPremium, isLoading, purchase, restore } = usePurchase();
  return { isPremium, isLoading, purchase, restore };
}
