import { useState } from 'react'
import { View, Text, TextInput, Pressable, Modal, Platform } from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import type { LogEntry } from '../../types'
import { DEFAULT_EVENTS } from '../../lib/constants'

interface Props {
  log: LogEntry
  onSave: (log: LogEntry) => void
  onDelete: (id: string) => void
  onClose: () => void
}

export default function EditModal({ log, onSave, onDelete, onClose }: Props) {
  const event = DEFAULT_EVENTS.find((e) => e.id === log.eventId)
  const [dateTime, setDateTime] = useState(new Date(log.timestamp))
  const [ml, setMl] = useState(log.ml ? String(log.ml) : '')
  const [confirmDel, setConfirmDel] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)

  function handleSave() {
    onSave({
      ...log,
      timestamp: dateTime.getTime(),
      ml: ml ? parseInt(ml) : undefined,
    })
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/75 justify-end" onPress={onClose}>
        <Pressable className="w-full bg-surface-container-highest rounded-t-3xl p-6" onPress={() => {}}>
          <View className="flex-row items-center gap-3 mb-5">
            {event && <Text className="text-2xl">{event.emoji}</Text>}
            <Text className="font-headline text-lg font-bold text-on-surface">
              Editar — {event?.label}
            </Text>
          </View>

          <View className="flex-row gap-3 mb-4">
            <View className="flex-1">
              <Text className="font-label text-xs text-primary font-semibold uppercase tracking-wider mb-1.5">
                Data
              </Text>
              <Pressable
                onPress={() => setShowDatePicker(true)}
                className="bg-surface-container-low rounded-lg px-3 py-2.5"
              >
                <Text className="text-on-surface font-body text-sm">
                  {dateTime.toLocaleDateString('pt-BR')}
                </Text>
              </Pressable>
              {showDatePicker && (
                <DateTimePicker
                  value={dateTime}
                  mode="date"
                  display="default"
                  onChange={(_e, date) => {
                    setShowDatePicker(false)
                    if (date) {
                      const updated = new Date(dateTime)
                      updated.setFullYear(date.getFullYear(), date.getMonth(), date.getDate())
                      setDateTime(updated)
                    }
                  }}
                />
              )}
            </View>
            <View className="flex-1">
              <Text className="font-label text-xs text-primary font-semibold uppercase tracking-wider mb-1.5">
                Horário
              </Text>
              <Pressable
                onPress={() => setShowTimePicker(true)}
                className="bg-surface-container-low rounded-lg px-3 py-2.5"
              >
                <Text className="text-on-surface font-body text-sm">
                  {dateTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </Pressable>
              {showTimePicker && (
                <DateTimePicker
                  value={dateTime}
                  mode="time"
                  display="default"
                  onChange={(_e, date) => {
                    setShowTimePicker(false)
                    if (date) {
                      const updated = new Date(dateTime)
                      updated.setHours(date.getHours(), date.getMinutes())
                      setDateTime(updated)
                    }
                  }}
                />
              )}
            </View>
          </View>

          {event?.hasAmount && (
            <View className="mb-4">
              <Text className="font-label text-xs text-primary font-semibold uppercase tracking-wider mb-1.5">
                Volume (ml)
              </Text>
              <TextInput
                keyboardType="number-pad"
                value={ml}
                onChangeText={setMl}
                placeholder="ex: 60"
                placeholderTextColor="#aca7cc"
                className="w-full bg-surface-container-low rounded-lg px-3 py-2.5 text-on-surface font-body text-sm"
              />
            </View>
          )}

          {!confirmDel ? (
            <View className="flex-row gap-2 mt-2">
              <Pressable
                onPress={() => setConfirmDel(true)}
                className="flex-1 py-3 rounded-xl items-center"
                style={{ backgroundColor: 'rgba(255,110,132,0.15)' }}
              >
                <Text className="text-error font-label font-semibold text-sm">Excluir</Text>
              </Pressable>
              <Pressable
                onPress={onClose}
                className="flex-1 py-3 rounded-xl bg-surface-variant items-center"
              >
                <Text className="text-on-surface-variant font-label font-semibold text-sm">Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={handleSave}
                className="py-3 rounded-xl bg-primary items-center"
                style={{ flex: 2 }}
              >
                <Text className="text-on-primary font-label font-semibold text-sm">Salvar</Text>
              </Pressable>
            </View>
          ) : (
            <View className="flex-row gap-2 mt-2">
              <Pressable
                onPress={() => setConfirmDel(false)}
                className="flex-1 py-3 rounded-xl bg-surface-variant items-center"
              >
                <Text className="text-on-surface-variant font-label font-semibold text-sm">Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={() => onDelete(log.id)}
                className="py-3 rounded-xl items-center"
                style={{ flex: 2, backgroundColor: '#ff6e84' }}
              >
                <Text className="text-on-error font-label font-semibold text-sm">Confirmar exclusão</Text>
              </Pressable>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  )
}
