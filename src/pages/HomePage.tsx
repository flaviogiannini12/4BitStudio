import { ArrowRight, CalendarClock, CheckCircle2, Clock3, UserRound } from 'lucide-react'
import { countdownLabel, countdownTone, formatShortDate, money } from '../lib/date'
import { clientStatusLabel } from '../lib/labels'
import type { StudioData } from '../types/studio'
import { ClientLogo } from '../components/ClientLogo'

export function HomePage({ data, onClient, onPayments, onTasks, onReminder, onPaid }: { data: StudioData; onClient: (id: string) => void; onPayments: () => void; onTasks: () => void; onReminder: (paymentId: string) => void; onPaid: (paymentId: string) => void }) {
  const activeClients = data.clients.filter(c => c.status !== 'archived' && c.status !== 'lead')
  const openTasks = data.tasks.filter(t => t.status !== 'done')
  const pendingPayments = data.payments.filter(p => p.status === 'pending').sort((a,b) => a.dueDate.localeCompare(b.dueDate))
  const upcomingTasks = openTasks.filter(t => t.dueDate).sort((a,b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? '')).slice(0, 6)
  const memberTaskCounts = data.members.filter(m => m.active).map(member => ({ member, count: openTasks.filter(t => t.assigneeId === member.id).length }))

  function client(id: string | null) { return data.clients.find(c => c.id === id) }
  function member(id: string | null) { return data.members.find(m => m.id === id) }

  return <div className="home-stack">
    <section className="section-block client-control">
      <div className="section-heading"><div><p className="eyebrow">Control room</p><h2>Clienti attivi</h2></div><span className="counter-pill">{activeClients.length}</span></div>
      <div className="client-status-grid">
        {activeClients.map(c => {
          const tasks = openTasks.filter(t => t.clientId === c.id)
          const next = tasks.filter(t => t.dueDate).sort((a,b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))[0]
          return <button key={c.id} className="client-status-card" onClick={() => onClient(c.id)}>
            <div className="client-card-top"><span className={`status-dot status-${c.status}`}/><span>{clientStatusLabel[c.status]}</span><ArrowRight size={15}/></div>
            <div className="home-client-title"><ClientLogo logoUrl={c.logoUrl} name={c.name}/><h3>{c.name}</h3></div>
            <div className="client-task-count"><strong>{tasks.length}</strong><span>{tasks.length === 1 ? 'task aperta' : 'task aperte'}</span></div>
            <div className="client-next">{next ? <><Clock3 size={13}/><span>{next.title}</span><b>{formatShortDate(next.dueDate)}</b></> : <><CheckCircle2 size={13}/><span>Nessuna scadenza aperta</span></>}</div>
          </button>
        })}
      </div>
    </section>

    <section className="section-block payments-focus">
      <div className="section-heading"><div><p className="eyebrow">Da tenere d'occhio</p><h2>Pagamenti imminenti</h2></div><button className="text-link" onClick={onPayments}>Vedi tutti <ArrowRight size={14}/></button></div>
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

    <div className="dashboard-two-col">
      <section className="section-block compact-block">
        <div className="section-heading"><div><p className="eyebrow">Operatività</p><h2>Task da chiudere</h2></div><button className="text-link" onClick={onTasks}>Tutte <ArrowRight size={14}/></button></div>
        <div className="simple-list">
          {upcomingTasks.map(t => <div className="simple-task" key={t.id}><span className={`task-state-mini ${t.status}`}/><div><strong>{t.title}</strong><small>{client(t.clientId)?.name ?? '4Bit Studio'} · {member(t.assigneeId)?.name ?? 'Non assegnata'}</small></div><span>{t.dueDate ? formatShortDate(t.dueDate) : ''}</span></div>)}
        </div>
      </section>
      <section className="section-block compact-block">
        <div className="section-heading"><div><p className="eyebrow">Carico attuale</p><h2>Team</h2></div><UserRound size={18} className="heading-icon"/></div>
        <div className="team-load-list">
          {memberTaskCounts.map(({ member: m, count }) => <div key={m.id}><div className="avatar-mini">{m.name.slice(0,1)}</div><div><strong>{m.name}</strong><small>{count} {count === 1 ? 'task aperta' : 'task aperte'}</small></div><div className="load-bar"><span style={{ width: `${Math.min(100, count * 16)}%` }}/></div></div>)}
        </div>
      </section>
    </div>

    <section className="section-block compact-block recurrences-preview">
      <div className="section-heading"><div><p className="eyebrow">Automazioni</p><h2>Ricorrenze attive</h2></div><CalendarClock size={18} className="heading-icon"/></div>
      <div className="recurrence-strip">{data.recurrences.filter(r => r.active).map(r => <div key={r.id}><strong>{client(r.clientId)?.name}</strong><span>{r.label}</span><b>{money(r.amount)}</b><small>{r.intervalMonths === 1 ? 'mensile' : r.intervalMonths === 3 ? 'trimestrale' : `ogni ${r.intervalMonths} mesi`} · {countdownLabel(r.nextDueDate)}</small></div>)}</div>
    </section>
  </div>
}
