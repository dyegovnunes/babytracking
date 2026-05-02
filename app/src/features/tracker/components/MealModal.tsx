/**
 * MealModal — registro e edição de refeição.
 *
 * - Grid 2 linhas de categorias com cor por categoria
 * - Múltipla seleção sem × (clicar no item faz uncheck)
 * - Itens selecionados aparecem abaixo do campo "Outro"
 * - Modo edição: horário + data editáveis + botão excluir
 */

import { useState } from 'react'
import { useSheetBackClose } from '../../../hooks/useSheetBackClose'
import { hapticLight, hapticSuccess } from '../../../lib/haptics'
import type { LogEntry, MealPayload } from '../../../types'

interface Props {
  babyName: string
  /** Passar o log completo para modo edição (pré-popula tudo + habilita excluir) */
  initialLog?: LogEntry
  onConfirm: (payload: MealPayload, timestamp?: number) => void
  onDelete?: () => void
  onClose: () => void
}

/* ─── Catálogo de alimentos ─── */
interface FoodCategory {
  id: string
  label: string
  emoji: string
  /** Classes Tailwind para o chip inativo */
  idleCls: string
  /** Classes Tailwind para o chip ativo */
  activeCls: string
  items: string[]
}

export const FOOD_CATEGORIES: FoodCategory[] = [
  {
    id: 'frutas', label: 'Frutas', emoji: '🍎',
    idleCls:   'bg-[#FF8A65]/12 border-[#FF8A65]/30 text-[#FF8A65]',
    activeCls: 'bg-[#FF8A65]/28 border-[#FF8A65]/55 text-[#FF8A65] font-semibold',
    items: ['Banana', 'Maçã', 'Pera', 'Mamão', 'Melão', 'Abacate', 'Manga', 'Pêssego', 'Ameixa', 'Uva', 'Kiwi', 'Laranja'],
  },
  {
    id: 'legumes', label: 'Legumes', emoji: '🥕',
    idleCls:   'bg-[#81C784]/12 border-[#81C784]/30 text-[#81C784]',
    activeCls: 'bg-[#81C784]/28 border-[#81C784]/55 text-[#81C784] font-semibold',
    items: ['Cenoura', 'Batata doce', 'Inhame', 'Mandioquinha', 'Abobrinha', 'Abóbora', 'Beterraba', 'Chuchu', 'Brócolis', 'Couve-flor', 'Espinafre', 'Ervilha'],
  },
  {
    id: 'cereais', label: 'Cereais', emoji: '🌾',
    idleCls:   'bg-[#FFD54F]/12 border-[#FFD54F]/30 text-[#FFD54F]',
    activeCls: 'bg-[#FFD54F]/28 border-[#FFD54F]/55 text-[#FFD54F] font-semibold',
    items: ['Arroz', 'Aveia', 'Milho', 'Macarrão', 'Polenta', 'Quinoa', 'Pão'],
  },
  {
    id: 'proteinas', label: 'Proteínas', emoji: '🍗',
    idleCls:   'bg-[#EF9A9A]/12 border-[#EF9A9A]/30 text-[#EF9A9A]',
    activeCls: 'bg-[#EF9A9A]/28 border-[#EF9A9A]/55 text-[#EF9A9A] font-semibold',
    items: ['Frango', 'Carne bovina', 'Peixe', 'Ovo', 'Feijão', 'Lentilha', 'Grão-de-bico', 'Tofu', 'Carne de porco'],
  },
  {
    id: 'laticinios', label: 'Laticínios', emoji: '🧀',
    idleCls:   'bg-[#90CAF9]/12 border-[#90CAF9]/30 text-[#90CAF9]',
    activeCls: 'bg-[#90CAF9]/28 border-[#90CAF9]/55 text-[#90CAF9] font-semibold',
    items: ['Iogurte natural', 'Queijo', 'Leite de vaca', 'Requeijão'],
  },
]

const METHODS: { id: MealPayload['method']; label: string; emoji: string }[] = [
  { id: 'pureed',            label: 'Papinha',        emoji: '🥣' },
  { id: 'blw',               label: 'BLW',            emoji: '✋' },
  { id: 'mixed',             label: 'Misto',          emoji: '🍽️' },
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

/** Alimentos do catálogo que são alérgenos — detectados automaticamente */
const FOOD_ALLERGEN_MAP: Record<string, string> = {
  'Ovo':             'ovo',
  'Peixe':           'peixe',
  'Tofu':            'soja',
  'Leite de vaca':   'leite_vaca',
  'Iogurte natural': 'leite_vaca',
  'Queijo':          'leite_vaca',
  'Requeijão':       'leite_vaca',
  'Macarrão':        'trigo',
  'Pão':             'trigo',
  'Aveia':           'trigo',
}

const ALLERGEN_LABEL: Record<string, string> = {
  leite_vaca:  'Leite de vaca',
  ovo:         'Ovo',
  amendoim:    'Amendoim',
  trigo:       'Trigo/Glúten',
  soja:        'Soja',
  oleaginosas: 'Oleaginosas',
  peixe:       'Peixe',
  frutos_mar:  'Frutos do mar',
}

const ALL_CATALOG_ITEMS = new Set(FOOD_CATEGORIES.flatMap((c) => c.items))

/* helpers */
function parseFoods(food?: string): string[] {
  if (!food) return []
  return food.split(', ').filter(Boolean)
}

function tsToTimeDate(ts?: number) {
  const d = ts ? new Date(ts) : new Date()
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return { time, date }
}

export default function MealModal({ babyName, initialLog, onConfirm, onDelete, onClose }: Props) {
  useSheetBackClose(true, onClose)

  const isEdit = !!initialLog
  const initPayload = initialLog?.payload as MealPayload | undefined

  /* ─ food state ─ */
  const [selectedFoods, setSelectedFoods] = useState<string[]>(parseFoods(initPayload?.food))
  const [customInput,   setCustomInput]   = useState('')
  const [activeCat,     setActiveCat]     = useState<string | null>(null)

  /* ─ metadata state ─ */
  const [method,      setMethod]      = useState<MealPayload['method']>(initPayload?.method)
  const [acceptance,  setAcceptance]  = useState<MealPayload['acceptance']>(initPayload?.acceptance)
  const [isNewFood,   setIsNewFood]   = useState(initPayload?.isNewFood ?? false)
  const [allergenKey, setAllergenKey] = useState<string | undefined>(initPayload?.allergenKey)

  /* ─ time/date (edit mode only) ─ */
  const init = tsToTimeDate(initialLog?.timestamp)
  const [timeVal, setTimeVal] = useState(init.time)
  const [dateVal, setDateVal] = useState(init.date)

  const [confirmDel, setConfirmDel] = useState(false)

  /* helpers */
  function toggleFood(name: string) {
    hapticLight()
    setSelectedFoods((prev) =>
      prev.includes(name) ? prev.filter((f) => f !== name) : [...prev, name],
    )
  }

  function addCustom() {
    const trimmed = customInput.trim()
    if (!trimmed) return
    hapticLight()
    if (!selectedFoods.includes(trimmed)) {
      setSelectedFoods((prev) => [...prev, trimmed])
    }
    setCustomInput('')
  }

  function buildTimestamp(): number {
    const [h, m] = timeVal.split(':').map(Number)
    const [y, mo, day] = dateVal.split('-').map(Number)
    return new Date(y, mo - 1, day, h, m).getTime()
  }

  function handleConfirm() {
    const allFoods = [...selectedFoods]
    if (customInput.trim()) allFoods.push(customInput.trim())
    const payload: MealPayload = {
      food:        allFoods.length > 0 ? allFoods.join(', ') : undefined,
      method,
      acceptance,
      isNewFood:   isNewFood || undefined,
      allergenKey: isNewFood ? (autoDetectedAllergen ?? allergenKey) : undefined,
    }
    hapticSuccess()
    onConfirm(payload, isEdit ? buildTimestamp() : undefined)
  }

  const activeCatData = FOOD_CATEGORIES.find((c) => c.id === activeCat)

  /** Alérgeno detectado automaticamente a partir dos alimentos selecionados do catálogo */
  const autoDetectedAllergen = selectedFoods
    .map((f) => FOOD_ALLERGEN_MAP[f])
    .find(Boolean) as string | undefined

  /** Verdadeiro se há algum alimento digitado manualmente (não está no catálogo) */
  const hasCustomFoodSelected = selectedFoods.some((f) => !ALL_CATALOG_ITEMS.has(f))

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg bg-surface-container-highest rounded-t-md pb-sheet animate-slide-up max-h-[92vh] overflow-y-auto">

        {/* ── Header sticky ── */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 sticky top-0 bg-surface-container-highest z-10 border-b border-outline-variant/20">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🥣</span>
            <div>
              <h2 className="font-headline text-base font-bold text-on-surface">
                {isEdit ? 'Editar refeição' : 'Refeição'}
              </h2>
              <p className="font-label text-xs text-on-surface-variant">{babyName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 -m-1 rounded-md active:bg-surface-container">
            <span className="material-symbols-outlined text-on-surface-variant">close</span>
          </button>
        </div>

        <div className="px-5 space-y-5 pt-4 pb-4">

          {/* ── Horário (modo edição) ── */}
          {isEdit && (
            <div className="flex gap-3">
              <div className="flex-1">
                <p className="font-label text-xs text-on-surface-variant mb-1.5">Data</p>
                <input
                  type="date"
                  value={dateVal}
                  onChange={(e) => setDateVal(e.target.value)}
                  className="w-full px-3 py-3 rounded-md bg-surface-container border border-outline-variant text-on-surface font-body text-base focus:outline-none focus:border-primary min-h-[44px]"
                />
              </div>
              <div className="flex-1">
                <p className="font-label text-xs text-on-surface-variant mb-1.5">Horário</p>
                <input
                  type="time"
                  value={timeVal}
                  onChange={(e) => setTimeVal(e.target.value)}
                  className="w-full px-3 py-3 rounded-md bg-surface-container border border-outline-variant text-on-surface font-body text-base focus:outline-none focus:border-primary min-h-[44px]"
                />
              </div>
            </div>
          )}

          {/* ── Seleção de alimentos ── */}
          <div>
            <p className="font-label text-xs text-on-surface-variant mb-2">
              O que comeu?
              <span className="text-on-surface-variant/50"> (pode selecionar vários)</span>
            </p>

            {/* Grid 3 colunas — max 2 linhas para 5 categorias (3+2) */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {FOOD_CATEGORIES.map((cat) => {
                const isActive = activeCat === cat.id
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      hapticLight()
                      setActiveCat(isActive ? null : cat.id)
                    }}
                    className={[
                      'flex flex-col items-center justify-center gap-0.5 py-2.5 px-1 rounded-md border text-xs font-label transition-colors',
                      isActive ? cat.activeCls : cat.idleCls,
                    ].join(' ')}
                  >
                    <span className="text-xl leading-none">{cat.emoji}</span>
                    <span className="text-[11px] mt-0.5 truncate w-full text-center">{cat.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Sub-painel com itens da categoria ativa */}
            {activeCatData && (
              <div className="mb-3 p-3 bg-surface-container rounded-md border border-outline-variant/30">
                <p className="font-label text-[10px] text-on-surface-variant/70 uppercase tracking-wide mb-2">
                  {activeCatData.emoji} {activeCatData.label} — toque para selecionar
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {activeCatData.items.map((item) => {
                    const sel = selectedFoods.includes(item)
                    return (
                      <button
                        key={item}
                        onClick={() => toggleFood(item)}
                        className={[
                          'px-2.5 py-1 rounded-md border text-xs font-body transition-colors',
                          sel
                            ? 'bg-primary/20 border-primary/40 text-on-surface font-medium'
                            : 'bg-surface border-outline-variant/50 text-on-surface-variant active:bg-surface-container',
                        ].join(' ')}
                      >
                        {sel && <span className="material-symbols-outlined text-primary text-[11px] align-middle mr-0.5">check</span>}
                        {item}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Campo "Outro" */}
            <div className="flex gap-2">
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustom()}
                placeholder="Outro alimento..."
                className="flex-1 px-3 py-2 rounded-md bg-surface-container border border-outline-variant text-on-surface font-body text-base focus:outline-none focus:border-primary"
              />
              <button
                onClick={addCustom}
                disabled={!customInput.trim()}
                className="flex items-center gap-1 px-3 py-2 rounded-md bg-surface-container border border-outline-variant text-on-surface-variant font-label text-xs disabled:opacity-40 active:bg-surface-container-high"
              >
                <span className="material-symbols-outlined text-base">add</span>
                Add
              </button>
            </div>

            {/* Chips dos selecionados — abaixo do campo Outro, sem × */}
            {selectedFoods.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <p className="w-full font-label text-[10px] text-on-surface-variant/60 mb-0.5">
                  Selecionados (toque para remover):
                </p>
                {selectedFoods.map((f) => (
                  <button
                    key={f}
                    onClick={() => toggleFood(f)}
                    className="px-2.5 py-1 rounded-md bg-primary/15 border border-primary/30 text-on-surface font-label text-xs active:bg-primary/25"
                  >
                    {f}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Método ── */}
          <div>
            <p className="font-label text-xs text-on-surface-variant mb-2">Método</p>
            <div className="grid grid-cols-2 gap-2">
              {METHODS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => { hapticLight(); setMethod(method === m.id ? undefined : m.id) }}
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
                  onClick={() => { hapticLight(); setAcceptance(acceptance === a.id ? undefined : a.id) }}
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
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
              isNewFood ? 'border-primary bg-primary' : 'border-outline-variant bg-transparent'
            }`}>
              {isNewFood && <span className="material-symbols-outlined text-on-primary text-[14px]">check</span>}
            </div>
            <span className="font-body text-sm text-on-surface">Alimento novo (primeira vez)</span>
          </button>

          {/* ── Alérgeno ── auto-detectado do catálogo, ou picker manual p/ "Outro" */}
          {isNewFood && autoDetectedAllergen && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-500/8 border border-amber-500/20 rounded-md">
              <span className="text-base leading-none">⚠️</span>
              <p className="font-label text-xs text-on-surface-variant">
                Alérgeno detectado:{' '}
                <span className="font-semibold text-amber-600">
                  {ALLERGEN_LABEL[autoDetectedAllergen] ?? autoDetectedAllergen}
                </span>
              </p>
            </div>
          )}
          {isNewFood && !autoDetectedAllergen && hasCustomFoodSelected && (
            <div>
              <p className="font-label text-xs text-on-surface-variant mb-2">
                É um dos principais alérgenos?{' '}
                <span className="text-on-surface-variant/50">(opcional)</span>
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
            {isEdit ? 'Salvar alterações' : 'Registrar refeição'}
          </button>

          {/* ── Excluir (modo edição) ── */}
          {isEdit && onDelete && (
            confirmDel ? (
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDel(false)}
                  className="flex-1 py-2.5 rounded-md border border-outline-variant text-on-surface-variant font-label text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => { hapticLight(); onDelete() }}
                  className="flex-1 py-2.5 rounded-md bg-error/15 border border-error/30 text-error font-label text-sm font-semibold"
                >
                  Confirmar exclusão
                </button>
              </div>
            ) : (
              <button
                onClick={() => { hapticLight(); setConfirmDel(true) }}
                className="w-full py-2.5 rounded-md border border-outline-variant/50 text-on-surface-variant/60 font-label text-sm flex items-center justify-center gap-1.5 active:text-error active:border-error/30"
              >
                <span className="material-symbols-outlined text-base">delete</span>
                Excluir registro
              </button>
            )
          )}
        </div>
      </div>
    </div>
  )
}
