import { useState } from 'react'
import { Archive, ArrowLeft, CalendarClock, Globe2, Mail, MoreHorizontal, Phone, Plus, RotateCcw } from 'lucide-react'
import { countdownLabel, formatShortDate, money } from '../lib/date'
import { clientStatusLabel, projectStatusLabel, taskStatusLabel } from '../lib/labels'
import type { Client, ClientStatus, StudioData } from '../types/studio'
import type { useStudio } from '../hooks/useStudio'

type Actions = ReturnType<typeof useStudio>['actions']

export function ClientsPage({ data, actions, selectedId, onSelect, onNew }: { data: StudioData; actions: Actions; selectedId: string | null; onSelect: (id: string | null) => void; onNew: () => void }) {
  const [tab, setTab] = useState<'active' | 'archive'>('active')
  const selected = data.clients.find(c => c.id === selectedId) ?? null
  if (selected) return <ClientDetail client={selected} data={data} actions={actions} onBack={() => onSelect(null)} />

  const list = data.clients.filter(c => tab === 'archive' ? c.status === 'archived' : c.status !== 'archived')
  return <section className="section-block page-section">
    <div className="section-heading responsive-heading"><div><p className="eyebrow">Un cliente, un solo fascicolo</p><h2>Clienti</h2></div><button className="primary-button" onClick={onNew}><Plus size={15}/> Nuovo cliente</button></div>
    <div className="segmented client-tabs"><button className={tab === 'active' ? 'active' : ''} onClick={() => setTab('active')}>Attivi</button><button className={tab === 'archive' ? 'active' : ''} onClick={() => setTab('archive')}>Archivio</button></div>
    <div className="clients-list">
      {list.map(c => {
        const open = data.tasks.filter(t => t.clientId === c.id && t.status !== 'done')
        const projects = data.projects.filter(p => p.clientId === c.id && p.status !== 'done')
        const payment = data.payments.filter(p => p.clientId === c.id && p.status === 'pending').sort((a,b) => a.dueDate.localeCompare(b.dueDate))[0]
        return <button className="client-list-row" key={c.id} onClick={() => onSelect(c.id)}>
          <div className="client-monogram">{c.name.slice(0,2).toUpperCase()}</div><div className="client-list-main"><div><h3>{c.name}</h3><span className={`status-chip client-${c.status}`}>{clientStatusLabel[c.status]}</span></div><p>{c.services.length ? c.services.join(' · ') : 'Nessun servizio inserito'}</p></div>
          <div className="client-list-stat"><strong>{open.length}</strong><span>task</span></div><div className="client-list-stat"><strong>{projects.length}</strong><span>progetti</span></div><div className="client-next-payment"><small>Prossimo pagamento</small><strong>{payment ? countdownLabel(payment.dueDate) : '—'}</strong></div><MoreHorizontal size={17}/>
        </button>
      })}
      {list.length === 0 && <div className="empty-page-mini">{tab === 'archive' ? 'Archivio vuoto.' : 'Nessun cliente attivo.'}</div>}
    </div>
  </section>
}

function ClientDetail({ client, data, actions, onBack }: { client: Client; data: StudioData; actions: Actions; onBack: () => void }) {
  const tasks = data.tasks.filter(t => t.clientId === client.id && t.status !== 'done')
  const projects = data.projects.filter(p => p.clientId === client.id)
  const payments = data.payments.filter(p => p.clientId === client.id).sort((a,b) => b.dueDate.localeCompare(a.dueDate))
  const recurrences = data.recurrences.filter(r => r.clientId === client.id)
  const nextDue = tasks.filter(t => t.dueDate).sort((a,b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))[0]

  async function setStatus(status: ClientStatus) { await actions.updateClient(client.id, { status }) }

  return <div className="client-detail-wrap">
    <button className="back-button" onClick={onBack}><ArrowLeft size={15}/> Tutti i clienti</button>
    <section className="client-detail-hero section-block">
      <div className="client-detail-title"><div className="client-monogram big">{client.name.slice(0,2).toUpperCase()}</div><div><div className="client-title-status"><span className={`status-dot status-${client.status}`}/>{clientStatusLabel[client.status]}</div><h2>{client.name}</h2><p>{client.services.join(' · ') || 'Nessun servizio inserito'}</p></div></div>
      <div className="client-detail-actions">{client.status !== 'archived' ? <button className="secondary-button" onClick={() => void setStatus('archived')}><Archive size={14}/> Archivia</button> : <button className="secondary-button" onClick={() => void setStatus('active')}><RotateCcw size={14}/> Riattiva</button>}</div>
      <div className="client-quick-grid"><div><small>Task aperte</small><strong>{tasks.length}</strong></div><div><small>Progetti</small><strong>{projects.filter(p => p.status !== 'done').length}</strong></div><div><small>Prossima deadline</small><strong>{nextDue ? formatShortDate(nextDue.dueDate) : '—'}</strong></div><div><small>Pagamenti aperti</small><strong>{payments.filter(p => p.status === 'pending').length}</strong></div></div>
    </section>

    <div className="client-detail-grid">
      <section className="section-block compact-block"><div className="section-heading"><div><p className="eyebrow">Adesso</p><h2>Task aperte</h2></div></div><div className="simple-list">{tasks.map(t => <div className="simple-task" key={t.id}><span className={`task-state-mini ${t.status}`}/><div><strong>{t.title}</strong><small>{taskStatusLabel[t.status]}</small></div><span>{formatShortDate(t.dueDate)}</span></div>)}{!tasks.length && <div className="empty-inline">Nessuna task aperta.</div>}</div></section>
      <section className="section-block compact-block"><div className="section-heading"><div><p className="eyebrow">Lavori</p><h2>Progetti</h2></div></div><div className="simple-list">{projects.map(p => <div className="simple-task" key={p.id}><span className={`project-mark p-${p.status}`}/><div><strong>{p.name}</strong><small>{projectStatusLabel[p.status]}</small></div><span>{formatShortDate(p.deadline)}</span></div>)}{!projects.length && <div className="empty-inline">Nessun progetto.</div>}</div></section>
    </div>

    <section className="section-block compact-block"><div className="section-heading"><div><p className="eyebrow">Storico e prossime scadenze</p><h2>Pagamenti</h2></div></div><div className="client-payments">{payments.slice(0,8).map(p => <div key={p.id}><span className={`payment-dot ${p.status}`}/><div><strong>{p.label}</strong><small>{formatShortDate(p.dueDate)}{p.recurrenceId ? ' · ricorrente' : ''}</small></div><b>{money(p.amount)}</b><span className={`status-chip ${p.status === 'paid' ? 'payment-paid' : 'payment-pending'}`}>{p.status === 'paid' ? 'Pagato' : countdownLabel(p.dueDate)}</span></div>)}{!payments.length && <div className="empty-inline">Nessun pagamento.</div>}</div></section>

    <div className="client-detail-grid lower">
      <section className="section-block compact-block"><div className="section-heading"><div><p className="eyebrow">Automatici</p><h2>Ricorrenze</h2></div><CalendarClock size={18} className="heading-icon"/></div><div className="simple-list">{recurrences.map(r => <div className="simple-task" key={r.id}><span className={`status-dot ${r.active ? 'status-active' : 'status-paused'}`}/><div><strong>{r.label}</strong><small>{r.intervalMonths === 1 ? 'Mensile' : `Ogni ${r.intervalMonths} mesi`}</small></div><span>{money(r.amount)}</span></div>)}{!recurrences.length && <div className="empty-inline">Nessuna ricorrenza.</div>}</div></section>
      <section className="section-block compact-block"><div className="section-heading"><div><p className="eyebrow">Contatti</p><h2>Informazioni</h2></div></div><div className="contact-lines">{client.website && <div><Globe2 size={15}/><span>{client.website}</span></div>}{client.email && <div><Mail size={15}/><span>{client.email}</span></div>}{client.phone && <div><Phone size={15}/><span>{client.phone}</span></div>}{!client.website && !client.email && !client.phone && <div className="empty-inline">Nessun contatto inserito.</div>}</div>{client.notes && <p className="client-notes">{client.notes}</p>}</section>
    </div>
  </div>
}
