// NpsBlock — avaliação de 1-5 estrelas com comentário opcional.
// Mostrado no final da seção de conclusão (data.show_nps = true).
// Persiste em guide_ratings (1 avaliação por usuário por guia).
// Se nota >= 4: exibe CTA de compartilhamento no WhatsApp.

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

interface Props {
  guideId: string
  sectionId: string
  userId: string
}

type Status = 'loading' | 'pending' | 'submitting' | 'submitted'

const WHATSAPP_TEXT = encodeURIComponent(
  'Acabei de concluir o Guia das Últimas Semanas do Yaya 💜 Vale muito pra quem está esperando um bebê! blog.yayababy.app/sua-biblioteca'
)

export default function NpsBlock({ guideId, sectionId, userId }: Props) {
  const [status, setStatus] = useState<Status>('loading')
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')
  const [savedRating, setSavedRating] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data } = await supabase
        .from('guide_ratings')
        .select('rating, comment')
        .eq('user_id', userId)
        .eq('guide_id', guideId)
        .maybeSingle()
      if (cancelled) return
      if (data) {
        setSavedRating(data.rating)
        setStatus('submitted')
      } else {
        setStatus('pending')
      }
    }
    load()
    return () => { cancelled = true }
  }, [userId, guideId])

  async function handleSubmit() {
    if (!rating) return
    setStatus('submitting')
    const { error } = await supabase.from('guide_ratings').upsert({
      user_id: userId,
      guide_id: guideId,
      section_id: sectionId,
      rating,
      comment: comment.trim() || null,
    }, { onConflict: 'user_id,guide_id' })
    if (!error) {
      setSavedRating(rating)
      setStatus('submitted')
    } else {
      setStatus('pending')
    }
  }

  const displayRating = hovered || rating

  if (status === 'loading') return null

  return (
    <div style={{
      marginTop: '2.5em',
      padding: '20px 16px',
      background: 'color-mix(in srgb, #f59e0b 8%, var(--r-surface))',
      border: '1px solid color-mix(in srgb, #f59e0b 30%, transparent)',
      borderRadius: 14,
      textAlign: 'center',
      fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
    }}>
      {status === 'submitted' ? (
        <>
          <div style={{ fontSize: 28, marginBottom: 8 }}>💜</div>
          <div style={{
            fontFamily: 'Manrope, system-ui, sans-serif',
            fontWeight: 800, fontSize: 16,
            color: 'var(--r-text-strong)', marginBottom: 6,
          }}>
            Obrigada pela avaliação!
          </div>
          <p style={{ fontSize: 13, color: 'var(--r-text-muted)', margin: '0 0 20px' }}>
            Você avaliou com {savedRating} {savedRating === 1 ? 'estrela' : 'estrelas'}.
          </p>
          {savedRating >= 4 && (
            <a
              href={`https://wa.me/?text=${WHATSAPP_TEXT}`}
              target="_blank" rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '12px 22px', borderRadius: 999,
                background: '#25d366', color: '#ffffff',
                fontWeight: 700, fontSize: 14, textDecoration: 'none',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>share</span>
              Compartilhar no WhatsApp
            </a>
          )}
        </>
      ) : (
        <>
          <div style={{
            fontFamily: 'Manrope, system-ui, sans-serif',
            fontWeight: 800, fontSize: 16,
            color: 'var(--r-text-strong)', marginBottom: 4,
          }}>
            O que você achou do guia?
          </div>
          <p style={{ fontSize: 13, color: 'var(--r-text-muted)', margin: '0 0 16px' }}>
            Sua avaliação nos ajuda a melhorar.
          </p>

          {/* Estrelas */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHovered(star)}
                onMouseLeave={() => setHovered(0)}
                aria-label={`${star} estrela${star > 1 ? 's' : ''}`}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '4px 5px', lineHeight: 1,
                  transition: 'transform 0.12s',
                  transform: star <= displayRating ? 'scale(1.2)' : 'scale(1)',
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: 28,
                    color: star <= displayRating ? '#f59e0b' : 'var(--r-text-subtle)',
                    fontVariationSettings: '"FILL" 1',
                    transition: 'color 0.15s',
                    display: 'block',
                  }}
                >
                  {star <= displayRating ? 'star' : 'star_border'}
                </span>
              </button>
            ))}
          </div>

          {/* Comentário + botão alinhados no mesmo container */}
          <div style={{ width: '100%', maxWidth: 440, margin: '0 auto' }}>
            {rating > 0 && (
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Deixe um comentário (opcional)..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--r-surface)',
                  border: '1px solid var(--r-border)',
                  borderRadius: 10,
                  color: 'var(--r-text)',
                  fontFamily: 'inherit', fontSize: 13, lineHeight: 1.5,
                  resize: 'vertical', outline: 'none',
                  boxSizing: 'border-box', marginBottom: 10,
                  transition: 'border-color 0.15s',
                  display: 'block',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = '#f59e0b' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--r-border)' }}
              />
            )}

            <button
              onClick={handleSubmit}
              disabled={!rating || status === 'submitting'}
              style={{
                display: 'block', marginLeft: 'auto',
                padding: '12px 28px', borderRadius: 999,
                background: rating ? 'var(--r-accent)' : 'var(--r-surface-strong)',
                color: rating ? 'var(--r-on-accent)' : 'var(--r-text-subtle)',
                border: 'none', fontFamily: 'inherit',
                fontSize: 14, fontWeight: 700,
                cursor: rating ? 'pointer' : 'default',
                transition: 'background 0.2s, color 0.2s',
                opacity: status === 'submitting' ? 0.7 : 1,
              }}
            >
              {status === 'submitting' ? 'Enviando…' : 'Enviar avaliação'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
