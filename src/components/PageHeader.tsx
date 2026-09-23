import { Cloud, HardDrive, LogOut, Plus } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { formatLongDate } from '../lib/date'
import { cloudEnabled, supabase } from '../lib/supabase'

export function PageHeader({ title, eyebrow, onAdd, user }: { title: string; eyebrow?: string; onAdd: () => void; user: User | null }) {
  return (
    <header className="page-header">
      <div>
        <div className="brand-line"><strong>4Bit Studio</strong><span className="sync-pill">{cloudEnabled ? <Cloud size={11}/> : <HardDrive size={11}/>} {cloudEnabled ? 'Sync' : 'Locale'}</span></div>
        <p className="date-line">{formatLongDate()}</p>
        {eyebrow && <p className="page-eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
      </div>
      <div className="header-actions">
        {cloudEnabled && user && <button className="icon-button" title="Esci" onClick={() => void supabase?.auth.signOut()}><LogOut size={17}/></button>}
        <button className="primary-button add-main" onClick={onAdd}><Plus size={17}/><span>Nuovo</span></button>
      </div>
    </header>
  )
}
