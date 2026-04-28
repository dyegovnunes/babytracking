import { useState } from 'react'
import { useSheetBackClose } from '../../../hooks/useSheetBackClose'
import { hapticLight, hapticSuccess } from '../../../lib/haptics'
import type { MealPayload } from '../../../types'

interface Props {
  babyName: string
  onConfirm: (payload: MealPayload) => void
  onClose: () => void
}

/* ─── Catálogo de alimentos por categoria ─── */
interface FoodCategory {
  id: string
  label: string
  emoji: string
  items: string[]
}

const FOOD_CATEGORIES: FoodCategory[] = [
  {
    id: 'frutas',
    label: 'Frutas',
    emoji: '🍎',
    items: ['Banana', 'Maçã', 'Pera', 'Mamão', 'Melão', 'Abacate', 'Manga', 'Pêssego', 'Ameixa', 'Uva'],
  },
  {
    id: 'legumes',
    label: 'Legumes',
    emoji: '🥕',
    items: ['Cenoura', 'Batata doce', 'Inhame', 'Mandioquinha', 'Abobrinha', 'Abóbora', 'Beterraba', 'Chuchu', 'Brócolis', 'Couve-flor'],
  },
  {
    id: 'cereais',
    label: 'Cereais',
    emoji: '🌾',
    items: ['Arroz', 'Aveia', 'Milho', 'Macarrão', 'Quinoa', 'Polenta'],
  },
  {
    id: 'proteinas',
    label: 'Proteínas',
    emoji: '🍗',
    items: ['Frango', 'Carne bovina', 'Peixe', 'Ovo', 'Feijão', 'Lentilha', 'Grão-de-bico', 'Tofu'],
  },
  {
    id: 'laticinios',
    label: 'Laticínios',
    emoji: '🧀',
    items: ['Iogurte natural', 'Queijo', 'Leite de vaca'],
  },
]

const METHODS: { id: MealPayload['method']; label: string; emoji: string }[] = [
  { id: 'pureed',            label: 'Papinha',       emoji: '🥣' },
  { id: 'blw',               label: 'BLW',           emoji: '✋' },
  { id: 'mixed',             label: 'Misto',         emoji: '🍽️' },
  { id: 'breast_plus_solid', label: 'Peito + sólido', emoji: '🤱' },
]

const ACCEPTANCES: { id: MealPayload['acceptance']; label: string; emoji: string }[] = [
  { id: 'loved',    label: 'Adorou',  emoji: '😋' },
  { id: 'accepted', label: 'Aceitou', emoji: '🙂' },
  { id: 'refused',  label: 'Recusou', emoji: '🙅' },
  { id: 'reaction', label: 'Reação',  emoji: '⚠️' },
]

const ALLERGENS: { id: string; label: string }[] = [
  { id: 'leite_vaca',  label: 'Leite de vaca' },
  { id: 'ovo',         label: 'Ovo' },
  { id: 'amendoim',    label: 'Amendoim' },
  { id: 'trigo',       label: 'Trigo/Glúten' },
  { id: 'soja',        label: 'Soja' },
  { id: 'oleaginosas', label: 'Oleaginosas' },
  { id: 'peixe',       label: 'Peixe' },
  { id: 'frutos_mar',  label: 'Frutos do mar' },
]

export default function MealModal({ babyName, onConfirm, onClose }: Props) {
  useSheetBackClose(true, onClose)

  const [food, setFood]             = useState('')
  const [activeCat, setActiveCat]   = useState<string | null>(null)
  const [method, setMethod]         = useState<MealPayload['method']>()
  const [acceptance, setAcceptance] = useState<MealPayload['acceptance']>()
  const [isNewFood, setIsNewFood]   = useState(false)
  const [allergenKey, setAllergenKey] = useState<string>()

  function selectFood(name: string) {
    hapticLight()
    setFood(name)
    setActiveCat(null) // fecha o sub-painel após selecionar
  }

  const handleConfirm = () => {
    const payload: MealPayload = {
      food: food.trim() || undefined,
      method,
      acceptance,
      isNewFood: isNewFood || undefined,
      allergenKey: isNewFood ? allergenKey : undefined,
    }
    hapticSuccess()
    onConfirm(payload)
  }

  const activeCatData = FOOD_CATEGORIES.find((c) => c.id === activeCat)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg bg-surface-container-highest rounded-t-md pb-sheet animate-slide-up max-h-[92vh] overflow-y-auto">

        {/* ── Header sticky ── */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 sticky top-0 bg-surface-container-highest z-10">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🥣</span>
            <div>
              <h2 className="font-headline text-base font-bold text-on-surface">Refeição</h2>
              <p className="font-label text-xs text-on-surface-variant">{babyName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 -m-1 rounded-md active:bg-surface-container">
            <span className="material-symbols-outlined text-on-surface-variant">close</span>
          </button>
        </div>

        <div className="px-5 space-y-5 pb-4">

          {/* ── Seletor de alimento ── */}
          <div>
            <p className="font-label text-xs text-on-surface-variant mb-2">
              O que comeu? <span className="text-on-surface-variant/50">(opcional)</span>
            </p>

            {/* Chips de categoria */}
            <div className="flex gap-2 overflow-x-auto pb-1 mb-3 scrollbar-none">
              {FOOD_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    hapticLight()
                    setActiveCat(activeCat === cat.id ? null : cat.id)
                  }}
                  className={[
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-label whitespace-nowrap shrink-0 transition-colors',
                    activeCat === cat.id
                      ? 'bg-primary/15 border-primary/40 text-primary font-semibold'
                      : 'bg-surface-container border-outline-variant text-on-surface-variant',
                  ].join(' ')}
                >
                  <span>{cat.emoji}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>

            {/* Sub-painel com itens da categoria ativa */}
            {activeCatData && (
              <div className="mb-3 p-3 bg-surface-container rounded-md border border-outline-variant/40">
                <p className="font-label text-[10px] text-on-surface-variant uppercase tracking-wide mb-2">
                  {activeCatData.emoji} {activeCatData.label}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {activeCatData.items.map((item) => (
                    <button
                      key={item}
                      onClick={() => selectFood(item)}
                      className={[
                        'px-2.5 py-1 rounded-full border text-xs font-body transition-colors',
                        food === item
                          ? 'bg-primary text-on-primary border-primary'
                          : 'bg-surface border-outline-variant text-on-surface active:bg-surface-container',
                      ].join(' ')}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Campo de texto livre */}
            <input
              type="text"
              value={food}
              onChange={(e) => setFood(e.target.value)}
              placeholder="Ou escreva: ex. arroz com feijão..."
              className="w-full px-3 py-2.5 rounded-md bg-surface-container border border-outline-variant text-on-surface font-body text-sm focus:outline-none focus:border-primary"
            />
          </div>

          {/* ── Método ── */}
          <div>
            <p className="font-label text-xs text-on-surface-variant mb-2">Método</p>
            <div className="grid grid-cols-2 gap-2">
              {METHODS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => { hapticLight(); setMethod(m.id) }}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-md border text-sm font-label transition-colors ${
                    method === m.id
                      ? 'border-primary bg-primary/10 text-primary font-semibold'
                      : 'border-outline-variant bg-surface-container text-on-surface-variant'
                  }`}
                >
                  <span>{m.emoji}</span>
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Aceitação ── */}
          <div>
            <p className="font-label text-xs text-on-surface-variant mb-2">Como foi?</p>
            <div className="grid grid-cols-2 gap-2">
              {ACCEPTANCES.map((a) => (
                <button
                  key={a.id}
                  onClick={() => { hapticLight(); setAcceptance(a.id) }}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-md border text-sm font-label transition-colors ${
                    acceptance === a.id
                      ? 'border-primary bg-primary/10 text-primary font-semibold'
                      : 'border-outline-variant bg-surface-container text-on-surface-variant'
                  }`}
                >
                  <span>{a.emoji}</span>
                  <span>{a.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Alimento novo ── */}
          <button
            onClick={() => { hapticLight(); setIsNewFood(!isNewFood) }}
            className="flex items-center gap-3 w-full"
          >
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
              isNewFood ? 'border-primary bg-primary' : 'border-outline-variant bg-transparent'
            }`}>
              {isNewFood && <span className="material-symbols-outlined text-on-primary text-[14px]">check</span>}
            </div>
            <span className="font-body text-sm text-on-surface">Alimento novo (primeira vez)</span>
          </button>

          {/* ── Alérgeno ── */}
          {isNewFood && (
            <div>
              <p className="font-label text-xs text-on-surface-variant mb-2">
                É um dos principais alérgenos? <span className="text-on-surface-variant/50">(opcional)</span>
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {ALLERGENS.map((al) => (
                  <button
                    key={al.id}
                    onClick={() => { hapticLight(); setAllergenKey(allergenKey === al.id ? undefined : al.id) }}
                    className={`px-2.5 py-2 rounded-md border text-xs font-label text-left transition-colors ${
                      allergenKey === al.id
                        ? 'border-primary bg-primary/10 text-primary font-semibold'
                        : 'border-outline-variant bg-surface-container text-on-surface-variant'
                    }`}
                  >
                    {al.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Confirmar ── */}
          <button
            onClick={handleConfirm}
            className="w-full py-3 rounded-md bg-primary text-on-primary font-label font-semibold text-sm active:bg-primary/90"
          >
            Registrar refeição
          </button>
        </div>
      </div>
    </div>
  )
}
