import { useEffect, useRef } from 'react'

/**
 * Intercepta o botão "Voltar" do navegador/aparelho para fechar uma
 * sheet/modal ao invés de navegar para a página anterior.
 *
 * Uso:
 *   useSheetBackClose(isOpen, onClose)
 *
 * Funcionamento:
 *  - Quando `isOpen` vira true, empurra uma entrada "sheet" no histórico.
 *  - Intercepta `popstate`: quando o usuário aperta voltar, chama onClose
 *    ao invés de deixar o React Router navegar.
 *  - Quando o sheet fecha por outro motivo (botão X, backdrop, ação
 *    interna), o cleanup remove a entrada chamando `history.back()` para
 *    manter a pilha consistente.
 *
 * Cada sheet gera uma chave única para que, em cenários aninhados, a
 * entrada correta seja identificada na limpeza.
 */
let sheetCounter = 0

export function useSheetBackClose(isOpen: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!isOpen) return

    const key = `sheet_${++sheetCounter}`
    window.history.pushState({ sheet: key }, '')

    const handlePopState = () => {
      onCloseRef.current()
    }
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
      // Se a entrada que empurramos ainda é o topo, o sheet está fechando
      // por um caminho que não seja o back button: remove nossa entrada
      // para manter o histórico limpo.
      if (window.history.state?.sheet === key) {
        window.history.back()
      }
    }
  }, [isOpen])
}
