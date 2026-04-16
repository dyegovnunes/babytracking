import { Outlet } from 'react-router-dom'
import Header from './Header'
import BottomNav from './BottomNav'
import { AdBanner } from '../ui/AdBanner'

export default function AppShell() {
  return (
    <div className="h-dvh bg-surface flex flex-col overflow-hidden">
      <Header />
      <main
        className="flex-1 overflow-y-auto overscroll-contain"
        style={{
          paddingTop: 'calc(3.5rem + env(safe-area-inset-top))',
          paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))',
        }}
      >
        <Outlet />
      </main>
      {/* Banner AdMob — montado uma única vez no shell.
          Ao mudar de página não há mais sequência hide/show que causava crash. */}
      <AdBanner />
      <BottomNav />
    </div>
  )
}
