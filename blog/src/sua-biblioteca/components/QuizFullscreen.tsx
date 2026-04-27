// QuizFullscreen — overlay fullscreen pra responder quiz.
// Estrutura JSON esperada:
//   {
//     questions: [{ id, text, options: [{ value, label }] }],
//     results: { [value]: { title, description, recommended_sections } }
//   }
// Resultado final é o `value` mais frequente nas respostas.

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import type { Guide, GuideSection } from '../../types'

interface QuizQuestion {
  id: string
  text: string
  options: Array<{ value: string; label: string }>
}
interface QuizResult {
  title: string
  description: string
  recommended_sections?: string[]
}
interface QuizData {
  questions: QuizQuestion[]
  results: Record<string, QuizResult>
}

interface Props {
  section: GuideSection
  guide: Guide
  userId: string
  onComplete: () => void
}

export default function QuizFullscreen({ section, guide, userId, onComplete }: Props) {
  const data = section.data as unknown as QuizData | null
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [result, setResult] = useState<QuizResult | null>(null)
  const [resultKey, setResultKey] = useState<string | null>(null)
  const [savedResult, setSavedResult] = useState<QuizResult | null>(null)
  const [savedResultKey, setSavedResultKey] = useState<string | null>(null)

  // Tenta buscar resposta anterior
  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!userId) return   // userId ainda não disponível — re-roda quando mudar
      const { data: existing } = await supabase
        .from('guide_quiz_responses')
        .select('result, answers')
        .eq('user_id', userId)
        .eq('section_id', section.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      if (cancelled || !existing || !data) return
      const profile = existing.result as string | null
      if (profile && data.results[profile]) {
        setSavedResult(data.results[profile])
        setSavedResultKey(profile)
      }
    }
    load()
    return () => { cancelled = true }
  }, [userId, section.id])

  if (!data || !data.questions || data.questions.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: 'var(--r-text-muted)' }}>
        Quiz sem perguntas configuradas.
      </div>
    )
  }

  function startQuiz() {
    setStep(0)
    setAnswers({})
    setResult(null)
    setOpen(true)
  }

  function answerQuestion(questionId: string, value: string) {
    const newAnswers = { ...answers, [questionId]: value }
    setAnswers(newAnswers)

    if (step < data!.questions.length - 1) {
      // Próxima pergunta após delay pra usuário ver feedback
      setTimeout(() => setStep(step + 1), 250)
    } else {
      // Calcula resultado: value mais frequente
      const counts: Record<string, number> = {}
      Object.values(newAnswers).forEach(v => { counts[v] = (counts[v] ?? 0) + 1 })
      const winner = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
      const r = data!.results[winner]
      setResult(r)
      setResultKey(winner)
      setSavedResult(r)
      setSavedResultKey(winner)

      // Salva no DB
      supabase.from('guide_quiz_responses').insert({
        user_id: userId,
        guide_id: guide.id,
        section_id: section.id,
        answers: newAnswers,
        result: winner,
      })
    }
  }

  function close() {
    setOpen(false)
    setStep(0)
    setResult(null)
  }

  // ── Card antes de iniciar ─────────────────────────────────────────────
  const profileEmoji: Record<string, string> = { a: '📊', b: '🌸', c: '💛', d: '⚡' }

  const cardContent = savedResult ? (
    <div style={{ ...resultPreviewCard, background: 'linear-gradient(135deg, rgba(183,159,255,0.1), rgba(255,193,255,0.06))', border: '1px solid color-mix(in srgb, var(--r-accent) 30%, transparent)' }}>
      <div style={{ fontSize: 12, color: 'var(--r-accent)', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 12 }}>
        ✨ Seu perfil descoberto
      </div>
      <div style={{ fontSize: 36, marginBottom: 8 }}>
        {profileEmoji[savedResultKey ?? ''] ?? '💜'}
      </div>
      <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 26, fontWeight: 700, margin: '0 0 10px', color: 'var(--r-text-strong)', letterSpacing: '-0.02em' }}>
        {savedResult.title}
      </h3>
      <p style={{ fontSize: 14, color: 'var(--r-text-muted)', lineHeight: 1.6, margin: '0 0 20px' }}>
        {savedResult.description}
      </p>
      <button onClick={startQuiz} style={btnGhost}>
        Refazer quiz
      </button>
    </div>
  ) : (
    <div style={resultPreviewCard}>
      <span className="material-symbols-outlined" style={{ fontSize: 36, color: 'var(--r-accent)' }}>auto_awesome</span>
      <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 24, fontWeight: 700, margin: '12px 0 8px', color: 'var(--r-text-strong)', letterSpacing: '-0.02em' }}>
        Qual é o seu estilo de cuidar?
      </h3>
      <p style={{ fontSize: 14, color: 'var(--r-text-muted)', lineHeight: 1.6, margin: '0 0 20px' }}>
        {data.questions.length} perguntas rápidas. No final, você descobre seu perfil — e recebe recomendações personalizadas pra essa fase.
      </p>
      <button onClick={startQuiz} style={btnPrimary}>
        Descobrir meu perfil
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
      </button>
    </div>
  )

  return (
    <>
      <div style={{ marginTop: 32 }}>
        {cardContent}
      </div>

      {/* Fullscreen overlay */}
      {open && (
        <div style={overlay}>
          <button onClick={close} style={closeBtn} aria-label="Fechar quiz">
            <span className="material-symbols-outlined" style={{ fontSize: 24 }}>close</span>
          </button>

          {/* Progress */}
          {!result && (
            <div style={{ position: 'absolute', top: 24, left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--r-text-subtle)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>
                Pergunta {step + 1} de {data.questions.length}
              </div>
              <div style={{ width: 200, height: 3, background: 'rgba(183,159,255,0.15)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  width: `${((step + 1) / data.questions.length) * 100}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, var(--r-accent), var(--r-accent-glow))',
                  transition: 'width 0.4s ease',
                }} />
              </div>
            </div>
          )}

          {!result ? (
            <QuestionCard
              key={step}
              question={data.questions[step]}
              onAnswer={(v) => answerQuestion(data.questions[step].id, v)}
            />
          ) : (
            <ResultCard
              result={result}
              resultKey={resultKey ?? ''}
              sectionId={section.id}
              onClose={() => { close(); onComplete() }}
            />
          )}
        </div>
      )}
    </>
  )
}

// ── Subcomponentes ─────────────────────────────────────────────────────────

function QuestionCard({ question, onAnswer }: { question: QuizQuestion; onAnswer: (v: string) => void }) {
  const [picked, setPicked] = useState<string | null>(null)
  return (
    <div style={{
      maxWidth: 680, width: '90%',
      animation: 'quiz-slide-in 0.35s ease',
    }}>
      <h2 style={{
        fontFamily: 'Fraunces, serif',
        fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
        fontWeight: 700,
        fontVariationSettings: '"opsz" 72',
        letterSpacing: '-0.02em',
        lineHeight: 1.2,
        color: 'var(--r-text)',
        textAlign: 'center',
        marginBottom: 40,
      }}>
        {question.text}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {question.options.map(opt => (
          <button
            key={opt.value}
            onClick={() => { setPicked(opt.value); onAnswer(opt.value) }}
            disabled={picked !== null}
            style={{
              padding: '18px 24px',
              borderRadius: 14,
              border: `1px solid ${picked === opt.value ? 'var(--r-accent)' : 'var(--r-border)'}`,
              background: picked === opt.value ? 'rgba(183,159,255,0.15)' : 'var(--r-surface)',
              color: 'var(--r-text)',
              fontFamily: 'inherit',
              fontSize: 16,
              cursor: picked ? 'default' : 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s',
              opacity: picked && picked !== opt.value ? 0.4 : 1,
            }}
            onMouseEnter={e => { if (!picked) e.currentTarget.style.background = 'rgba(183,159,255,0.08)' }}
            onMouseLeave={e => { if (!picked) e.currentTarget.style.background = 'var(--r-surface)' }}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <style>{`
        @keyframes quiz-slide-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

const PROFILE_EMOJI: Record<string, string> = { a: '📊', b: '🌸', c: '💛', d: '⚡' }
const PROFILE_COMFORT: Record<string, string> = {
  a: 'Você transforma incerteza em clareza. Isso é um dom raro.',
  b: 'Confiar no instinto é sabedoria que nenhum livro consegue ensinar.',
  c: 'Você se preocupa porque ama muito. E isso é lindo de ver.',
  d: 'Você faz acontecer. Seu bebê tem muita sorte por isso.',
}

function ResultCard({ result, resultKey, sectionId, onClose }: {
  result: QuizResult
  resultKey: string
  sectionId: string
  onClose: () => void
}) {
  const [pct, setPct] = useState<number | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const didFetch = useRef(false)

  useEffect(() => {
    if (didFetch.current) return
    didFetch.current = true
    async function fetchStats() {
      const { data } = await supabase
        .from('guide_quiz_responses')
        .select('result')
        .eq('section_id', sectionId)
      if (!data || data.length === 0) return
      const total = data.length
      const same = data.filter(r => r.result === resultKey).length
      setTotalCount(total)
      setPct(Math.round((same / total) * 100))
    }
    fetchStats()
  }, [sectionId, resultKey])

  const emoji = PROFILE_EMOJI[resultKey] ?? '💜'
  const comfort = PROFILE_COMFORT[resultKey] ?? result.description

  return (
    <div style={{
      maxWidth: 540, width: '90%', textAlign: 'center',
      animation: 'quiz-result-in 0.6s cubic-bezier(0.34, 1.4, 0.64, 1) both',
    }}>
      {/* Emoji grande */}
      <div style={{
        fontSize: 64, lineHeight: 1, marginBottom: 16,
        animation: 'quiz-emoji-pop 0.5s 0.2s cubic-bezier(0.34, 1.8, 0.64, 1) both',
      }}>
        {emoji}
      </div>

      <div style={{ fontSize: 12, color: 'var(--r-accent)', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 12 }}>
        Você é
      </div>

      <h2 style={{
        fontFamily: 'Fraunces, serif',
        fontSize: 'clamp(2.6rem, 6vw, 4.4rem)',
        fontWeight: 800,
        fontVariationSettings: '"opsz" 144, "SOFT" 50',
        letterSpacing: '-0.03em',
        lineHeight: 1.05,
        background: 'linear-gradient(135deg, var(--r-accent), var(--r-accent-glow))',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        margin: '0 0 20px',
      }}>
        {result.title}
      </h2>

      {/* Stat de comunidade */}
      {pct !== null && totalCount >= 5 && (
        <div style={{
          display: 'inline-block',
          padding: '8px 18px',
          borderRadius: 999,
          background: 'color-mix(in srgb, var(--r-accent) 12%, transparent)',
          border: '1px solid color-mix(in srgb, var(--r-accent) 28%, transparent)',
          fontSize: 13,
          fontWeight: 700,
          color: 'var(--r-accent)',
          marginBottom: 20,
          animation: 'quiz-stat-in 0.4s 0.5s ease both',
        }}>
          Como {pct}% das mães que responderam este quiz 💜
        </div>
      )}

      <p style={{ fontSize: 15, color: 'var(--r-text)', lineHeight: 1.7, marginBottom: 12 }}>
        {result.description}
      </p>

      <p style={{
        fontSize: 14, color: 'var(--r-accent)',
        fontStyle: 'italic', lineHeight: 1.6,
        marginBottom: 36,
        padding: '0 12px',
      }}>
        {comfort}
      </p>

      <button onClick={onClose} style={btnPrimary}>
        Continuar a leitura
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
      </button>

      <style>{`
        @keyframes quiz-result-in {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes quiz-emoji-pop {
          from { opacity: 0; transform: scale(0.3); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes quiz-stat-in {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}

// ── Estilos compartilhados ─────────────────────────────────────────────────

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0,
  background: 'var(--r-overlay)',
  backdropFilter: 'blur(24px)',
  zIndex: 100,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 24,
}

const closeBtn: React.CSSProperties = {
  position: 'absolute', top: 16, right: 16,
  width: 44, height: 44,
  background: 'transparent',
  border: 'none',
  color: 'var(--r-text-muted)',
  cursor: 'pointer',
  borderRadius: 8,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const resultPreviewCard: React.CSSProperties = {
  background: 'linear-gradient(135deg, rgba(183,159,255,0.06), rgba(255,193,255,0.04))',
  border: '1px solid var(--r-border)',
  borderRadius: 16,
  padding: 32,
  textAlign: 'center',
}

const btnPrimary: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 8,
  padding: '14px 28px',
  borderRadius: 999,
  border: 'none',
  background: 'var(--r-accent)',
  color: 'var(--r-on-accent)',
  fontFamily: 'inherit',
  fontSize: 15,
  fontWeight: 700,
  cursor: 'pointer',
}

const btnGhost: React.CSSProperties = {
  padding: '10px 20px',
  borderRadius: 999,
  border: '1px solid var(--r-border)',
  background: 'transparent',
  color: 'var(--r-text-muted)',
  fontFamily: 'inherit',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
}
