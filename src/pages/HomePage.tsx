import { ArrowRight, CheckCircle2, Clock3 } from 'lucide-react'
import { countdownLabel, countdownTone, formatShortDate, money } from '../lib/date'
import { clientStatusLabel } from '../lib/labels'
import { clientChipStyle } from '../lib/clientTone'
import { memberToneClass } from '../lib/memberTone'
import type { StudioData } from '../types/studio'
import { ClientLogo } from '../components/ClientLogo'

export function HomePage({ data, onClient, onPayments, onTasks, onReminder, onPaid, onReorderClients }: { data: StudioData; onClient: (id: string) => void; onPayments: () => void; onTasks: () => void; onReminder: (paymentId: string) => void; onPaid: (paymentId: string) => void; onReorderClients: (ids: string[]) => Promise<void> }) {
  const activeClients = data.clients.filter(c => c.status !== 'archived' && c.status !== 'lead').sort((a,b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  const openTasks = data.tasks.filter(t => t.status !== 'done')
  const datedOpenTasks = openTasks.filter(t => Boolean(t.dueDate))
  const pendingPayments = data.payments.filter(p => p.status === 'pending').sort((a,b) => a.dueDate.localeCompare(b.dueDate))
  const upcomingTasks = [...datedOpenTasks].sort((a,b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? '')).slice(0, 6)
  const memberTaskCounts = data.members.filter(m => m.active).map(member => ({ member, count: datedOpenTasks.filter(t => t.assigneeId === member.id).length }))

  function client(id: string | null) { return data.clients.find(c => c.id === id) }
  function member(id: string | null) { return data.members.find(m => m.id === id) }

  return <div className="home-stack">
    <div className="dashboard-two-col home-priority-row">
      <section className="section-block compact-block home-tasks-card">
        <div className="section-heading"><h2>Task da chiudere</h2><button className="text-link" onClick={onTasks}>Tutte <ArrowRight size={14}/></button></div>
        <div className="home-task-list">
          {upcomingTasks.map(t => {
            const c = client(t.clientId)
            const m = member(t.assigneeId)
            return <button className="home-task-row" key={t.id} onClick={onTasks}>
              <span className={`home-task-check ${t.status}`}><span/></span>
              <div className="home-task-body">
                <div className="home-task-topline">
                  <strong>{t.title}</strong>
                  <span className={`home-task-assignee ${m ? memberToneClass(m.name) : 'unassigned'}`}>
                    <span>{m ? m.name.slice(0,1).toUpperCase() : '?'}</span>
                    {m?.name ?? 'Non assegnata'}
                  </span>
                </div>
                <div className="home-task-meta">
                  {c
                    ? <span className="home-task-client" style={clientChipStyle(c.id, data.clients)}><ClientLogo logoUrl={c.logoUrl} name={c.name} size="sm"/>{c.name}</span>
                    : <span className="home-task-client internal">4Bit Studio</span>}
                  <span className={`home-task-status ${t.status}`}>{t.status === 'doing' ? 'In corso' : 'Da fare'}</span>
                </div>
              </div>
              <span className="home-task-due">{t.dueDate ? formatShortDate(t.dueDate) : ''}</span>
            </button>
          })}
          {!upcomingTasks.length && <div className="empty-inline">Nessuna task pianificata da chiudere.</div>}
        </div>
      </section>

      <section className="section-block compact-block">
        <div className="section-heading"><h2>Team</h2></div>
        <div className="team-load-list">
          {memberTaskCounts.map(({ member: m, count }) => <div className={memberToneClass(m.name)} key={m.id}>
            <div className="avatar-mini">{m.name.slice(0,1)}</div>
            <div><strong>{m.name}</strong><small>{count} {count === 1 ? 'task aperta' : 'task aperte'}</small></div>
            <div className="load-bar"><span style={{ width: `${Math.min(100, count * 16)}%` }}/></div>
          </div>)}
        </div>
      </section>
    </div>

    <section className="section-block client-control">
      <div className="section-heading"><h2>Clienti attivi</h2><span className="counter-pill">{activeClients.length}</span></div>
      <div className="client-status-grid">
        {activeClients.map(c => {
          const tasks = datedOpenTasks.filter(t => t.clientId === c.id)
          const next = [...tasks].sort((a,b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))[0]
          return <button
            key={c.id}
            className="client-status-card draggable-client-card"
            draggable
            onDragStart={event => {
              event.dataTransfer.setData('text/4bit-client', c.id)
              event.dataTransfer.effectAllowed = 'move'
            }}
            onDragOver={event => {
              if (event.dataTransfer.types.includes('text/4bit-client')) event.preventDefault()
            }}
            onDrop={event => {
              event.preventDefault()
              const draggedId = event.dataTransfer.getData('text/4bit-client')
              if (!draggedId || draggedId === c.id) return
              const ordered = activeClients.map(client => client.id).filter(id => id !== draggedId)
              const targetIndex = ordered.indexOf(c.id)
              const rect = event.currentTarget.getBoundingClientRect()
              ordered.splice(event.clientX > rect.left + rect.width / 2 ? targetIndex + 1 : targetIndex, 0, draggedId)
              void onReorderClients(ordered)
            }}
            onClick={() => onClient(c.id)}
          >
            <div className="client-card-top"><span className={`status-dot status-${c.status}`}/><span>{clientStatusLabel[c.status]}</span><ArrowRight size={15}/></div>
            <div className="home-client-title"><ClientLogo logoUrl={c.logoUrl} name={c.name}/><h3>{c.name}</h3></div>
            <div className="client-task-count"><strong>{tasks.length}</strong><span>{tasks.length === 1 ? 'task aperta' : 'task aperte'}</span></div>
            <div className="client-next">{next ? <><Clock3 size={13}/><span>{next.title}</span><b>{formatShortDate(next.dueDate)}</b></> : <><CheckCircle2 size={13}/><span>Nessuna scadenza aperta</span></>}</div>
          </button>
        })}
      </div>
    </section>

    <section className="section-block payments-focus">
      <div className="section-heading"><h2>Pagamenti imminenti</h2><button className="text-link" onClick={onPayments}>Vedi tutti <ArrowRight size={14}/></button></div>
      <div className="payment-list">
        {pendingPayments.slice(0,5).map(p => {
          const c = client(p.clientId)
          const tone = countdownTone(p.dueDate)
          return <article className={`payment-row tone-${tone}`} key={p.id}>
            <div className="countdown-box"><small>scadenza</small><strong>{countdownLabel(p.dueDate)}</strong></div>
            <div className="payment-main"><h3>{c?.name ?? 'Cliente'}</h3><p>{p.label}</p>{p.reminderCount > 0 && <small>{p.reminderCount} {p.reminderCount === 1 ? 'sollecito' : 'solleciti'} inviati</small>}</div>
            <div className="payment-amount">{money(p.amount)}</div>
            <div className="row-actions"><button className="secondary-button" onClick={() => onReminder(p.id)}>Sollecita</button><button className="primary-button compact" onClick={() => onPaid(p.id)}>Segna pagato</button></div>
          </article>
        })}
        {pendingPayments.length === 0 && <div className="empty-inline">Nessun pagamento in sospeso.</div>}
      </div>
    </section>

    <section className="section-block compact-block recurrences-preview">
      <div className="section-heading"><h2>Ricorrenze attive</h2></div>
      <div className="recurrence-strip">
        {data.recurrences.filter(r => r.active).map(r => <div key={r.id}><strong>{client(r.clientId)?.name}</strong><span>{r.label}</span><b>{money(r.amount)}</b><small>{r.intervalMonths === 1 ? 'mensile' : r.intervalMonths === 3 ? 'trimestrale' : `ogni ${r.intervalMonths} mesi`} · {countdownLabel(r.nextDueDate)}</small></div>)}
        {!data.recurrences.some(r => r.active) && <div className="empty-inline">Nessuna ricorrenza attiva.</div>}
      </div>
    </section>
  </div>
}
