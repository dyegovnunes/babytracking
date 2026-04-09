import { View, Text } from 'react-native';
import { usePremium } from '../../hooks/usePremium';

export function AdBanner() {
  const { isPremium } = usePremium();

  if (isPremium) return null;

  // TODO: Replace with real AdMob banner integration
  return (
    <View className="w-full h-14 bg-[#181538] border-t border-[#474464]/10 items-center justify-center">
      <Text className="text-xs text-[#e7e2ff]/40">Ad Space</Text>
    </View>
  );
}
