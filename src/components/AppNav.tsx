import { BarChart3, CalendarRange, CheckSquare2, CircleDollarSign, UsersRound } from 'lucide-react'

export type AppPage = 'clients' | 'tasks' | 'editorial' | 'payments' | 'team'

const items = [
  { id: 'clients' as const, label: 'Clienti', icon: UsersRound },
  { id: 'tasks' as const, label: 'Task', icon: CheckSquare2 },
  { id: 'editorial' as const, label: 'Piano Editoriale', icon: CalendarRange },
  { id: 'payments' as const, label: 'Economia', icon: CircleDollarSign },
  { id: 'team' as const, label: 'Team e statistiche', icon: BarChart3 }
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
