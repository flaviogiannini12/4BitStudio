import { BarChart3, CalendarRange, CheckSquare2, CircleDollarSign, House, UsersRound, WalletCards } from 'lucide-react'

export type AppPage = 'home' | 'clients' | 'tasks' | 'editorial' | 'payments' | 'team' | 'stats'

const items = [
  { id: 'home' as const, label: 'Home', icon: House },
  { id: 'clients' as const, label: 'Clienti', icon: UsersRound },
  { id: 'tasks' as const, label: 'Task', icon: CheckSquare2 },
  { id: 'editorial' as const, label: 'Piano Editoriale', icon: CalendarRange },
  { id: 'payments' as const, label: 'Economia', icon: CircleDollarSign },
  { id: 'team' as const, label: 'Team', icon: WalletCards },
  { id: 'stats' as const, label: 'Statistiche', icon: BarChart3 },
]

export function AppNav({ page, onChange }: { page: AppPage; onChange: (page: AppPage) => void }) {
  return (
    <>
      <nav className="glass-nav desktop-nav">
        {items.map(item => {
          const Icon = item.icon
          return <button key={item.id} onClick={() => onChange(item.id)} className={`nav-item nav-item-${item.id} ${page === item.id ? 'nav-active' : ''}`}><Icon size={15}/><span>{item.label}</span></button>
        })}
      </nav>
      <nav className="glass-nav mobile-nav">
        {items.map(item => {
          const Icon = item.icon
          return <button key={item.id} onClick={() => onChange(item.id)} className={`nav-item nav-item-${item.id} ${page === item.id ? 'nav-active' : ''}`}><Icon size={18}/><span>{item.label}</span></button>
        })}
      </nav>
    </>
  )
}
