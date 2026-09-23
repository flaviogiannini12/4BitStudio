import { AlertTriangle, CalendarClock, CheckCircle2, CircleDollarSign, Clock3, Repeat2, UsersRound } from 'lucide-react'
import { countdownLabel, money, todayISO } from '../lib/date'
import type { StudioData } from '../types/studio'

function pct(value: number) {
  return Math.round(value) + '%'
}

export function StatsPage({ data }: { data: StudioData }) {
  const today = todayISO()
  const activeClients = data.clients.filter(c => c.status !== 'archived' && c.status !== 'lead')
  const openTasks = data.tasks.filter(t => t.status !== 'done')
  const doneTasks = data.tasks.filter(t => t.status === 'done')
  const overdueTasks = openTasks.filter(t => t.dueDate && t.dueDate < today)
  const dueSoonTasks = openTasks.filter(t => t.dueDate && t.dueDate >= today && t.dueDate <= addDays(today, 7))
  const pending = data.payments.filter(p => p.status === 'pending')
  const paid = data.payments.filter(p => p.status === 'paid')
  const overduePayments = pending.filter(p => p.dueDate < today)
  const pendingTotal = pending.reduce((sum,p) => sum + p.amount, 0)
  const overdueTotal = overduePayments.reduce((sum,p) => sum + p.amount, 0)
  const collectedTotal = paid.reduce((sum,p) => sum + p.amount, 0)
  const annualRecurring = data.recurrences.filter(r => r.active).reduce((sum,r) => sum + r.amount * (12 / r.intervalMonths), 0)
  const completion = data.tasks.length ? doneTasks.length / data.tasks.length * 100 : 0
  const leads = data.clients.filter(c => c.status === 'lead')
  const ledgerIncome = data.ledgerEntries.filter(x => x.direction === 'income' && x.status === 'Incassato').reduce((s,x) => s+x.amount,0)
  const ledgerExpenses = data.ledgerEntries.filter(x => x.direction === 'expense').reduce((s,x) => s+x.amount,0)
  const totalCompensations = data.compensations.reduce((s,x) => s+x.amount,0)

  const taskByMember = data.members.filter(m => m.active).map(member => ({
    label: member.name,
    value: openTasks.filter(t => t.assigneeId === member.id).length,
    done: doneTasks.filter(t => t.assigneeId === member.id).length,
  })).sort((a,b) => b.value - a.value)

  const taskByClient = activeClients.map(client => ({
    label: client.name,
    value: openTasks.filter(t => t.clientId === client.id).length,
  })).filter(x => x.value > 0).sort((a,b) => b.value - a.value).slice(0,8)

  const moneyByClient = activeClients.map(client => ({
    label: client.name,
    value: pending.filter(p => p.clientId === client.id).reduce((sum,p) => sum + p.amount, 0),
  })).filter(x => x.value > 0).sort((a,b) => b.value - a.value).slice(0,8)

  const services = new Map<string, number>()
  activeClients.forEach(c => c.services.forEach(service => services.set(service, (services.get(service) ?? 0) + 1)))
  const serviceRows = [...services.entries()].map(([label,value]) => ({label,value})).sort((a,b) => b.value-a.value).slice(0,10)

  const nextDeadlines = openTasks.filter(t => t.dueDate).sort((a,b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? '')).slice(0,8)

  return <div className="stats-page">
    <section className="stats-hero-grid">
      <Metric icon={UsersRound} label="Clienti attivi" value={String(activeClients.length)} sub={data.clients.filter(c => c.status === 'archived').length + ' in archivio'}/>
      <Metric icon={Clock3} label="Task aperte" value={String(openTasks.length)} sub={overdueTasks.length + ' scadute'}/>
      <Metric icon={CheckCircle2} label="Completamento task" value={pct(completion)} sub={doneTasks.length + ' completate su ' + data.tasks.length}/>
      <Metric icon={CircleDollarSign} label="Da incassare" value={money(pendingTotal)} sub={pending.length + ' pagamenti aperti'}/>
      <Metric icon={AlertTriangle} label="Scaduto da incassare" value={money(overdueTotal)} sub={overduePayments.length + ' pagamenti scaduti'}/>
      <Metric icon={Repeat2} label="Ricorrente annualizzato" value={money(annualRecurring)} sub={data.recurrences.filter(r => r.active).length + ' ricorrenze attive'}/>
      <Metric icon={UsersRound} label="Lead" value={String(leads.length)} sub={leads.filter(x => x.leadStage === 'Da contattare').length + ' da contattare'}/>
      <Metric icon={CircleDollarSign} label="Saldo operativo" value={money(ledgerIncome - ledgerExpenses)} sub={money(ledgerExpenses) + ' di uscite'}/>
      <Metric icon={CheckCircle2} label="Compensi team" value={money(totalCompensations)} sub={data.compensations.length + ' movimenti registrati'}/>
    </section>

    <div className="stats-wide-grid">
      <section className="section-block stats-card-large">
        <div className="section-heading"><div><p className="eyebrow">Operatività</p><h2>Carico del team</h2></div><span className="stats-side-note">{openTasks.length} task aperte</span></div>
        <BarRows rows={taskByMember} suffix=" task" secondaryLabel="completate"/>
      </section>

      <section className="section-block stats-card-large">
        <div className="section-heading"><div><p className="eyebrow">Portafoglio</p><h2>Task per cliente</h2></div><span className="stats-side-note">Top 8</span></div>
        <BarRows rows={taskByClient} suffix=""/>
      </section>
    </div>

    <div className="stats-wide-grid">
      <section className="section-block stats-card-large">
        <div className="section-heading"><div><p className="eyebrow">Crediti</p><h2>Da incassare per cliente</h2></div><strong className="stats-total">{money(pendingTotal)}</strong></div>
        <MoneyRows rows={moneyByClient}/>
      </section>

      <section className="section-block stats-card-large">
        <div className="section-heading"><div><p className="eyebrow">Mix</p><h2>Servizi attivi</h2></div><span className="stats-side-note">{serviceRows.length} categorie</span></div>
        <BarRows rows={serviceRows} suffix=" clienti"/>
      </section>
    </div>

    <div className="stats-wide-grid">
      <section className="section-block stats-card-large">
        <div className="section-heading"><div><p className="eyebrow">Scadenze</p><h2>Prossime task</h2></div><CalendarClock size={18} className="heading-icon"/></div>
        <div className="stats-deadline-list">
          {nextDeadlines.map(task => {
            const client = data.clients.find(c => c.id === task.clientId)
            return <div key={task.id}>
              <span className={task.dueDate && task.dueDate < today ? 'deadline-dot late' : 'deadline-dot'}/>
              <div><strong>{task.title}</strong><small>{client?.name ?? '4Bit Studio'}</small></div>
              <b>{task.dueDate ? countdownLabel(task.dueDate) : '—'}</b>
            </div>
          })}
          {!nextDeadlines.length && <div className="empty-inline">Nessuna scadenza aperta.</div>}
        </div>
      </section>

      <section className="section-block stats-card-large stats-summary">
        <div className="section-heading"><div><p className="eyebrow">Quadro generale</p><h2>Snapshot</h2></div></div>
        <div className="stats-summary-grid">
          <div><span>Incassato registrato</span><strong>{money(collectedTotal)}</strong></div>
          <div><span>Task entro 7 giorni</span><strong>{dueSoonTasks.length}</strong></div>
          <div><span>Media task aperte / cliente</span><strong>{activeClients.length ? (openTasks.length / activeClients.length).toFixed(1) : '0'}</strong></div>
          <div><span>Media credito / cliente</span><strong>{activeClients.length ? money(pendingTotal / activeClients.length) : money(0)}</strong></div>
        </div>
      </section>
    </div>
  </div>
}

function Metric({ icon: Icon, label, value, sub }: { icon: typeof UsersRound; label: string; value: string; sub: string }) {
  return <article className="stat-metric">
    <div className="stat-metric-icon"><Icon size={17}/></div>
    <span>{label}</span>
    <strong>{value}</strong>
    <small>{sub}</small>
  </article>
}

function BarRows({ rows, suffix, secondaryLabel }: { rows: {label:string;value:number;done?:number}[]; suffix: string; secondaryLabel?: string }) {
  const max = Math.max(1, ...rows.map(x => x.value))
  return <div className="stats-bars">
    {rows.map(row => <div key={row.label} className="stats-bar-row">
      <div className="stats-bar-head"><strong>{row.label}</strong><span>{row.value}{suffix}{secondaryLabel && row.done !== undefined ? ' · ' + row.done + ' ' + secondaryLabel : ''}</span></div>
      <div className="stats-track"><span style={{width: Math.max(4,row.value/max*100) + '%'}}/></div>
    </div>)}
    {!rows.length && <div className="empty-inline">Non ci sono ancora dati sufficienti.</div>}
  </div>
}

function MoneyRows({ rows }: { rows: {label:string;value:number}[] }) {
  const max = Math.max(1, ...rows.map(x => x.value))
  return <div className="stats-bars">
    {rows.map(row => <div key={row.label} className="stats-bar-row">
      <div className="stats-bar-head"><strong>{row.label}</strong><span>{money(row.value)}</span></div>
      <div className="stats-track"><span style={{width: Math.max(4,row.value/max*100) + '%'}}/></div>
    </div>)}
    {!rows.length && <div className="empty-inline">Nessun importo aperto.</div>}
  </div>
}

function addDays(value: string, days: number) {
  const date = new Date(value + 'T12:00:00')
  date.setDate(date.getDate() + days)
  return date.getFullYear() + '-' + String(date.getMonth()+1).padStart(2,'0') + '-' + String(date.getDate()).padStart(2,'0')
}
