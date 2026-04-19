import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCelebrationQueue } from '../useCelebrationQueue'
import CelebrationModal from './CelebrationModal'
import BigCelebration from './BigCelebration'
import Toast from '../../../components/ui/Toast'

/**
 * Host global de celebrações. Montado uma vez no AppShell (nível topo).
 *
 * Responsabilidades:
 *   1. Consome `useCelebrationQueue` — renderiza o item atual (medium ou
 *      big) como modal/fullscreen e chama `next()` ao fechar. Fila
 *      processada um por vez.
 *   2. Escuta evento `yaya:micro-toast` e renderiza Toast por ~3s.
 *      Permite múltiplos micros empilhados (array).
 *
 * Não renderiza nada quando a fila está vazia e sem toast micro.
 */
export default function CelebrationHost() {
  const { current, next } = useCelebrationQueue()
  const navigate = useNavigate()
  const [microToasts, setMicroToasts] = useState<
    Array<{ id: number; message: string }>
  >([])

  // Ouve micro toasts disparados pela queue
  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<{ message: string }>
      const id = Date.now() + Math.random()
      setMicroToasts((prev) => [...prev, { id, message: custom.detail.message }])
    }
    window.addEventListener('yaya:micro-toast', handler)
    return () => window.removeEventListener('yaya:micro-toast', handler)
  }, [])

  const dismissMicro = (id: number) => {
    setMicroToasts((prev) => prev.filter((t) => t.id !== id))
  }

  const handleViewJourney = () => {
    // Fecha a celebração atual e navega. JourneyBadge no Hero vai abrir
    // sheet automaticamente? Não — a forma mais direta é navegar pra
    // home e abrir o sheet por evento.
    next()
    navigate('/')
    // Pequeno delay pra home montar antes do sheet tentar abrir
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('yaya:open-achievement-sheet'))
    }, 300)
  }

  return (
    <>
      {/* Medium */}
      {current && current.def.celebration === 'medium' && (
        <CelebrationModal
          achievement={current.def}
          onClose={next}
          onViewJourney={handleViewJourney}
        />
      )}

      {/* Big (fullscreen) */}
      {current && current.def.celebration === 'big' && (
        <BigCelebration
          achievement={current.def}
          onClose={next}
          onViewJourney={handleViewJourney}
        />
      )}

      {/* Micro toasts */}
      {microToasts.map((t) => (
        <Toast
          key={t.id}
          message={t.message}
          variant="success"
          duration={3000}
          onDismiss={() => dismissMicro(t.id)}
        />
      ))}
    </>
  )
}
