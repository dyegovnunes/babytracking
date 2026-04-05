import { Outlet } from 'react-router-dom'
import Header from './Header'
import BottomNav from './BottomNav'

export default function AppShell() {
  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <Header />
      <main className="flex-1 pt-14 pb-20 overflow-y-auto">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
