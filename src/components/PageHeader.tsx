import { LogOut, Plus } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { cloudEnabled, supabase } from '../lib/supabase'

export function PageHeader({ title, eyebrow, onAdd, user, showAdd = true, addLabel = 'Nuova attività' }: { title: string; eyebrow?: string; onAdd: () => void; user: User | null; showAdd?: boolean; addLabel?: string }) {
  return (
    <header className="page-header page-header-clean">
      <div>
        {eyebrow && <p className="page-eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
      </div>
      <div className="header-actions">
        {cloudEnabled && user && <button className="icon-button" title="Esci" onClick={() => void supabase?.auth.signOut()}><LogOut size={17}/></button>}
        {showAdd && <button className="primary-button add-main" onClick={onAdd}><Plus size={18}/><span>{addLabel}</span></button>}
      </div>
    </header>
  )
}
