import { useAuth, signOut } from '../../../contexts/AuthContext'

export default function AccountSection() {
  const { user } = useAuth()

  return (
    <section className="bg-surface-container rounded-md p-4">
      <div className="flex items-center gap-3 mb-3">
        <span className="material-symbols-outlined text-on-surface-variant text-lg">
          account_circle
        </span>
        <p className="text-on-surface font-body text-sm truncate flex-1">{user?.email}</p>
      </div>
      <button
        onClick={signOut}
        className="w-full py-2.5 rounded-md bg-error/10 text-error font-label font-semibold text-sm"
      >
        Sair da conta
      </button>
    </section>
  )
}
