// Hook: escuta INSERTs em baby_members via Supabase Realtime.
// Quando um novo membro entra no grupo do bebê, notifica o dono do perfil.
//
// - Não toca o AppContext — canal local, sem risco de regressão.
// - Deduplicação via useRef<Set<string>> com chave `${memberId}_${babyId}`.
// - Não usa localStorage como bloqueio (pode repetir em sessões diferentes —
//   cada entrada de membro é um momento distinto, conforme spec).

import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

export interface MemberJoinNotification {
  memberName: string
  memberRole: string
}

export function useMemberJoinNotification(babyId: string | undefined) {
  const { user } = useAuth()
  const [notification, setNotification] = useState<MemberJoinNotification | null>(null)
  const seenRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!babyId || !user) return

    const channel = supabase
      .channel(`member-join-${babyId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'baby_members',
          filter: `baby_id=eq.${babyId}`,
        },
        async (payload) => {
          const row = payload.new as {
            user_id?: string
            display_name?: string
            role?: string
          }

          // Ignorar se foi o próprio usuário quem entrou
          if (row.user_id === user.id) return

          const dedupeKey = `${row.user_id}_${babyId}`
          if (seenRef.current.has(dedupeKey)) return
          seenRef.current.add(dedupeKey)

          // Usar display_name direto do payload, ou buscar o perfil
          let memberName = row.display_name ?? ''
          if (!memberName && row.user_id) {
            const { data } = await supabase
              .from('profiles')
              .select('display_name')
              .eq('id', row.user_id)
              .single()
            memberName = data?.display_name ?? 'Alguém'
          }
          if (!memberName) memberName = 'Alguém'

          setNotification({
            memberName,
            memberRole: row.role ?? 'caregiver',
          })
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [babyId, user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  function clearNotification() {
    setNotification(null)
  }

  return { notification, clearNotification }
}
