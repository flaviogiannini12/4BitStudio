import { useState } from 'react'
import { Calendar, Check, ChevronDown, Trash2 } from 'lucide-react'
import { formatShortDate } from '../lib/date'
import type { StudioData, ProjectStatus } from '../types/studio'
import type { useStudio } from '../hooks/useStudio'

type Actions = ReturnType<typeof useStudio>['actions']

export function ProjectsPage({ data, actions, onNew }: { data: StudioData; actions: Actions; onNew: () => void }) {
  const [showDone, setShowDone] = useState(false)
  const projects = data.projects.filter(p => showDone || p.status !== 'done')
  const client = (id: string) => data.clients.find(c => c.id === id)?.name ?? 'Cliente'
  const openTasks = (id: string) => data.tasks.filter(t => t.projectId === id && t.status !== 'done').length

  async function changeStatus(id: string, status: ProjectStatus) { await actions.updateProject(id, { status }) }

  return <section className="section-block page-section">
    <div className="section-heading responsive-heading"><div><p className="eyebrow">Dal brief al go-live</p><h2>Progetti</h2></div><div className="inline-actions"><label className="switch-label"><input type="checkbox" checked={showDone} onChange={e => setShowDone(e.target.checked)}/><span/>Mostra completati</label><button className="primary-button" onClick={onNew}>Nuovo progetto</button></div></div>
    <div className="project-grid">
      {projects.map(p => <article className="project-card" key={p.id}>
        <div className="project-top"><span className={`project-mark p-${p.status}`}/><span>{client(p.clientId)}</span><button className="icon-button tiny" onClick={() => void actions.deleteProject(p.id)}><Trash2 size={13}/></button></div>
        <h3>{p.name}</h3>
        <div className="project-meta"><span><strong>{openTasks(p.id)}</strong> task aperte</span><span><Calendar size={13}/>{formatShortDate(p.deadline)}</span></div>
        <label className="status-select"><span>Stato</span><div><select value={p.status} onChange={e => void changeStatus(p.id, e.target.value as ProjectStatus)}><option value="planning">Da iniziare</option><option value="in_progress">In lavorazione</option><option value="review">In revisione</option><option value="done">Completato</option></select><ChevronDown size={14}/></div></label>
        {p.status === 'done' && <div className="done-line"><Check size={13}/> Progetto completato</div>}
      </article>)}
      {projects.length === 0 && <div className="empty-page-mini">Nessun progetto da mostrare.</div>}
    </div>
  </section>
}
