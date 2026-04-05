import { ScrollView, Pressable, Text } from 'react-native'
import type { EventCategory } from '../../types'

interface Props {
  selected: EventCategory | 'all'
  onChange: (cat: EventCategory | 'all') => void
}

const categories: { id: EventCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'Tudo' },
  { id: 'feed', label: 'Mamadas' },
  { id: 'diaper', label: 'Fraldas' },
  { id: 'sleep', label: 'Sono' },
  { id: 'care', label: 'Cuidados' },
]

export default function CategoryFilter({ selected, onChange }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
    >
      {categories.map((cat) => (
        <Pressable
          key={cat.id}
          onPress={() => onChange(cat.id)}
          className="px-4 py-2 rounded-full"
          style={{
            backgroundColor: selected === cat.id ? '#b79fff' : '#2a2547',
          }}
        >
          <Text
            className="font-label text-sm font-medium"
            style={{ color: selected === cat.id ? '#0d0a27' : '#aca7cc' }}
          >
            {cat.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  )
}
