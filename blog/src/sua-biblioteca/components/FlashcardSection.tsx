// FlashcardSection — sessão de revisão com flashcards.
// type='flashcards': data.cards = [{front, back}]
// Estado: componente apenas (sessão), sem persistência no banco.
// Lógica: embaralha no mount, mostra frente → clique → verso →
//   "Já sei" (remove da fila) | "Rever depois" (vai pro fim)
// Conclusão: mensagem + "Refazer" + "Continuar lendo"

import { useState, useMemo } from 'react'
import type { GuideSection } from '../../types'

interface Card { front: string; back: string }

interface Props {
  section: GuideSection
  onContinue: () => void
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function FlashcardSection({ section, onContinue }: Props) {
  const cards = ((section.data as { cards?: Card[] } | null)?.cards ?? [])
  const total = cards.length

  const initialQueue = useMemo(() => shuffle([...cards]), [])
  const [queue, setQueue] = useState<Card[]>(initialQueue)
  const [flipped, setFlipped] = useState(false)
  const [knownCount, setKnownCount] = useState(0)

  const current = queue[0] ?? null
  const done = queue.length === 0

  function handleFlip() {
    if (!flipped) setFlipped(true)
  }

  function handleKnown() {
    setQueue(q => q.slice(1))
    setFlipped(false)
    setKnownCount(c => c + 1)
  }

  function handleReview() {
    setQueue(q => [...q.slice(1), q[0]])
    setFlipped(false)
  }

  function handleReset() {
    setQueue(shuffle([...cards]))
    setFlipped(false)
    setKnownCount(0)
  }

  return (
    <div style={{
      maxWidth: 640,
      margin: '0 auto',
      padding: '0 0 48px',
      fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 11, fontWeight: 700,
          letterSpacing: '0.07em', textTransform: 'uppercase',
          color: 'var(--r-accent)', marginBottom: 10,
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: '"FILL" 1' }}>
            style
          </span>
          Revisão
        </div>
        <h1 style={{
          fontFamily: 'Fraunces, serif',
          fontSize: 'clamp(1.85rem, 6.5vw, 2.6em)',
          fontWeight: 700,
          fontVariationSettings: '"opsz" 72, "SOFT" 30',
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
          color: 'var(--r-text-strong)',
          margin: '0 0 8px',
        }}>
          {section.title}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--r-text-muted)', margin: 0, fontStyle: 'italic' }}>
          Vire os cards, confira as respostas e veja o que já está fixado.
        </p>
      </div>

      {done ? (
        /* ── Estado de conclusão ── */
        <div style={{
          textAlign: 'center',
          padding: '48px 24px',
          background: 'var(--r-surface)',
          border: '1px solid var(--r-border)',
          borderRadius: 16,
        }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>💜</div>
          <div style={{
            fontFamily: 'Manrope, system-ui, sans-serif',
            fontWeight: 800, fontSize: 18,
            color: 'var(--r-text-strong)',
            marginBottom: 8,
          }}>
            Você revisou todos os {total} cards!
          </div>
          <p style={{ fontSize: 14, color: 'var(--r-text-muted)', margin: '0 0 28px' }}>
            O que ficou no ar? Refaça a sessão ou continue lendo.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={handleReset}
              style={{
                padding: '12px 24px', borderRadius: 999,
                border: '1px solid var(--r-accent)', color: 'var(--r-accent)',
                background: 'transparent', fontFamily: 'inherit',
                fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}
            >
              Refazer
            </button>
            <button
              onClick={onContinue}
              style={{
                padding: '12px 24px', borderRadius: 999,
                background: 'var(--r-accent)', color: 'var(--r-on-accent)',
                border: 'none', fontFamily: 'inherit',
                fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}
            >
              Continuar lendo
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* ── Contador e barra ── */}
          <div style={{ marginBottom: 20 }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: 13, color: 'var(--r-text-subtle)',
              fontWeight: 600, marginBottom: 6,
            }}>
              <span>Card {knownCount + 1} de {total}</span>
              <span>{queue.length} restante{queue.length !== 1 ? 's' : ''}</span>
            </div>
            <div style={{ height: 3, background: 'var(--r-border)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${(knownCount / total) * 100}%`,
                background: 'var(--r-accent)',
                transition: 'width 0.4s ease',
                borderRadius: 99,
              }} />
            </div>
          </div>

          {/* ── Card com flip 3D ── */}
          <div
            onClick={handleFlip}
            role="button"
            aria-label={flipped ? 'Card virado — verso visível' : 'Clique para ver a resposta'}
            style={{
              perspective: '1000px',
              cursor: flipped ? 'default' : 'pointer',
              marginBottom: 20,
              userSelect: 'none',
            }}
          >
            <div style={{
              position: 'relative',
              transformStyle: 'preserve-3d',
              transition: 'transform 0.4s ease',
              transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              minHeight: 200,
            }}>
              {/* Frente */}
              <div style={{
                position: 'absolute', inset: 0,
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                background: 'var(--r-surface)',
                border: '1px solid color-mix(in srgb, var(--r-accent) 30%, var(--r-border))',
                borderRadius: 16,
                padding: '32px 28px',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                textAlign: 'center', gap: 14,
                boxShadow: '0 4px 20px color-mix(in srgb, var(--r-accent) 8%, transparent)',
              }}>
                <div style={{
                  fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: 'var(--r-accent)',
                }}>
                  Pergunta
                </div>
                <div style={{
                  fontFamily: 'Manrope, system-ui, sans-serif',
                  fontSize: 'clamp(16px, 3vw, 20px)',
                  fontWeight: 600, lineHeight: 1.4,
                  color: 'var(--r-text-strong)',
                }}>
                  {current?.front}
                </div>
                <div style={{
                  fontSize: 12, color: 'var(--r-text-subtle)',
                  display: 'flex', alignItems: 'center', gap: 4, marginTop: 8,
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>touch_app</span>
                  Clique para ver a resposta
                </div>
              </div>

              {/* Verso */}
              <div style={{
                position: 'absolute', inset: 0,
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                background: 'color-mix(in srgb, var(--r-accent) 5%, var(--r-surface))',
                border: '1px solid color-mix(in srgb, var(--r-accent) 35%, transparent)',
                borderRadius: 16,
                padding: '28px',
                display: 'flex', flexDirection: 'column',
                justifyContent: 'flex-start', gap: 12,
                boxShadow: '0 4px 20px color-mix(in srgb, var(--r-accent) 8%, transparent)',
              }}>
                <div style={{
                  fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: 'var(--r-accent)',
                }}>
                  Resposta
                </div>
                <div style={{
                  fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
                  fontSize: 15, lineHeight: 1.65,
                  color: 'var(--r-text)',
                }}>
                  {current?.back}
                </div>
              </div>
            </div>
          </div>

          {/* ── Botões — só aparecem após flip ── */}
          {flipped && (
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={handleReview}
                style={{
                  flex: '1 1 140px', maxWidth: 200,
                  padding: '13px 20px', borderRadius: 10,
                  border: '1px solid var(--r-accent)', color: 'var(--r-accent)',
                  background: 'transparent', fontFamily: 'inherit',
                  fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  transition: 'background 0.15s',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>replay</span>
                Rever depois
              </button>
              <button
                onClick={handleKnown}
                style={{
                  flex: '1 1 140px', maxWidth: 200,
                  padding: '13px 20px', borderRadius: 10,
                  background: 'var(--r-accent)', color: 'var(--r-on-accent)',
                  border: 'none', fontFamily: 'inherit',
                  fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  transition: 'opacity 0.15s',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check</span>
                Já sei
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
