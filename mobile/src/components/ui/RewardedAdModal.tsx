import { useState } from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAdCompleted: () => void;
  onUpgrade: () => void;
  recordsToday: number;
  dailyLimit: number;
}

export function RewardedAdModal({ isOpen, onClose, onAdCompleted, onUpgrade, recordsToday, dailyLimit }: Props) {
  const [watching, setWatching] = useState(false);

  const handleWatchAd = async () => {
    setWatching(true);
    // Mock: simulate ad completion after 1.5s
    // TODO: Replace with real AdMob rewarded ad integration
    await new Promise((r) => setTimeout(r, 1500));
    setWatching(false);
    onAdCompleted();
    onClose();
  };

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/60">
        <View className="w-[85%] max-w-sm rounded-3xl bg-[#181538] border border-[#474464]/50 p-6">
          <View className="items-center mb-5">
            <View className="w-14 h-14 rounded-full bg-[#b79fff]/10 items-center justify-center mb-3">
              <Text className="text-[#b79fff] text-2xl">🎬</Text>
            </View>
            <Text className="text-lg font-bold text-[#e7e2ff] mb-1">Limite de registros</Text>
            <Text className="text-sm text-[#e7e2ff]/60 text-center">
              Voce ja fez {recordsToday} de {dailyLimit} registros hoje. Assista um video curto para liberar mais 5.
            </Text>
          </View>

          <View className="gap-2">
            <TouchableOpacity
              onPress={handleWatchAd}
              disabled={watching}
              className={`w-full py-3.5 rounded-2xl bg-[#b79fff]/15 flex-row items-center justify-center gap-2 ${watching ? 'opacity-50' : ''}`}
            >
              <Text className="text-[#b79fff] text-base">▶</Text>
              <Text className="text-[#b79fff] font-semibold text-sm">
                {watching ? 'Carregando...' : 'Assistir video (+5 registros)'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { onClose(); onUpgrade(); }}
              className="w-full py-3.5 rounded-2xl bg-[#b79fff] items-center"
            >
              <Text className="text-[#0d0a27] font-bold text-sm">
                Conhecer Yaya+ — Registros ilimitados
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onClose} className="w-full items-center py-2">
              <Text className="text-xs text-[#e7e2ff]/40">Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
