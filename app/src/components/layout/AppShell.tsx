import { Outlet } from 'react-router-dom'
import Header from './Header'
import BottomNav from './BottomNav'

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
      <BottomNav />
    </div>
  )
}
