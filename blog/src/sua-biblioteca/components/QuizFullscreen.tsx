// QuizFullscreen — overlay fullscreen pra responder quiz.
// Estrutura JSON esperada:
//   {
//     questions: [{ id, text, options: [{ value, label }] }],
//     results: { [value]: { title, description, recommended_sections } }
//   }
// Resultado final é o `value` mais frequente nas respostas.

import { useState, useEffect } from 'react'
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
  const [savedResult, setSavedResult] = useState<QuizResult | null>(null)

  // Tenta buscar resposta anterior
  useEffect(() => {
    let cancelled = false
    async function load() {
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
      setSavedResult(r)

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
  const cardContent = savedResult ? (
    <div style={resultPreviewCard}>
      <div style={{ fontSize: 12, color: 'var(--r-accent)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>
        Sua jornada
      </div>
      <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 28, margin: '0 0 8px', color: 'var(--r-text)', letterSpacing: '-0.01em' }}>
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
      <span className="material-symbols-outlined" style={{ fontSize: 36, color: 'var(--r-accent)' }}>quiz</span>
      <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: 26, margin: '12px 0 8px', color: 'var(--r-text)', letterSpacing: '-0.01em' }}>
        Descubra seu perfil
      </h3>
      <p style={{ fontSize: 14, color: 'var(--r-text-muted)', lineHeight: 1.6, margin: '0 0 20px' }}>
        {data.questions.length} perguntas rápidas pra recomendar as seções mais úteis pra você.
      </p>
      <button onClick={startQuiz} style={btnPrimary}>
        Iniciar quiz
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
            <ResultCard result={result} onClose={() => { close(); onComplete() }} />
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

function ResultCard({ result, onClose }: { result: QuizResult; onClose: () => void }) {
  return (
    <div style={{
      maxWidth: 540, width: '90%', textAlign: 'center',
      animation: 'quiz-slide-in 0.5s ease',
    }}>
      <div style={{ fontSize: 13, color: 'var(--r-accent)', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 16 }}>
        Sua jornada é
      </div>
      <h2 style={{
        fontFamily: 'Fraunces, serif',
        fontSize: 'clamp(2.4rem, 6vw, 4.2rem)',
        fontWeight: 800,
        fontVariationSettings: '"opsz" 144, "SOFT" 50',
        letterSpacing: '-0.03em',
        lineHeight: 1.05,
        color: 'var(--r-text)',
        background: 'linear-gradient(135deg, var(--r-accent), var(--r-accent-glow))',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        margin: '0 0 20px',
      }}>
        {result.title}
      </h2>
      <p style={{ fontSize: 16, color: 'var(--r-text-muted)', lineHeight: 1.65, marginBottom: 32 }}>
        {result.description}
      </p>
      <button onClick={onClose} style={btnPrimary}>
        Continuar a leitura
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
      </button>
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
