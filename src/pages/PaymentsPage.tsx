import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  Banknote,
  CalendarDays,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  LayoutDashboard,
  Landmark,
  ListChecks,
  PauseCircle,
  Pencil,
  PlayCircle,
  Plus,
  Repeat2,
  Wallet,
  WalletCards,
} from 'lucide-react'
import { countdownLabel, countdownTone, formatShortDate, money, todayISO } from '../lib/date'
import type { StudioData } from '../types/studio'
import type { useStudio } from '../hooks/useStudio'
import { RecordEditorModal } from '../components/RecordEditorModal'

type Actions = ReturnType<typeof useStudio>['actions']
type Tab = 'overview' | 'income' | 'compensations' | 'debts' | 'operations'
type EditorKind = 'payment' | 'recurrence' | 'ledger' | 'deadline' | 'compensation' | 'debt'

const MONTHS = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic']

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`
}

function monthLabel(key: string) {
  const [year,month] = key.split('-').map(Number)
  return `${MONTHS[month-1]} ${year}`
}

function monthKeyAtOffset(offset: number) {
  const date = new Date()
  date.setDate(1)
  date.setMonth(date.getMonth()+offset)
  return monthKey(date)
}

function statusIsPaid(status: string) {
  const value = status.trim().toLowerCase()
  return value === 'pagato' || value === 'paid' || value === 'saldato' || value === 'restituito'
}

export function PaymentsPage({
  data,
  actions,
  onReminder,
}: {
  data: StudioData
  actions: Actions
  onReminder: (id: string) => void
}) {
  const [tab,setTab] = useState<Tab>('overview')
  const [showPaid,setShowPaid] = useState(false)
  const [showClosedDebts,setShowClosedDebts] = useState(false)
  const [editor,setEditor] = useState<{kind:EditorKind;record:any} | null>(null)

  const today = todayISO()
  const currentMonth = monthKey(new Date())
  const clients = data.clients ?? []
  const payments = data.payments ?? []
  const recurrences = data.recurrences ?? []
  const ledgerEntries = data.ledgerEntries ?? []
  const compensations = data.compensations ?? []
  const debts = data.debts ?? []
  const deadlines = data.deadlines ?? []
  const client = (id: string | null) => clients.find(c => c.id === id)?.name ?? '4Bit Studio'

  const pendingPayments = payments.filter(p => p.status === 'pending')
  const paidPayments = payments.filter(p => p.status === 'paid')
  const overduePayments = pendingPayments.filter(p => p.dueDate < today)
  const pendingTotal = pendingPayments.reduce((sum,p) => sum+p.amount,0)
  const overdueTotal = overduePayments.reduce((sum,p) => sum+p.amount,0)
  const paidThisMonth = paidPayments.filter(p => p.paidAt?.startsWith(currentMonth)).reduce((sum,p) => sum+p.amount,0)
  const incomingThisMonth = pendingPayments.filter(p => p.dueDate.startsWith(currentMonth)).reduce((sum,p) => sum+p.amount,0)

  const openCompensations = compensations.filter(c => !statusIsPaid(c.status))
  const openCompensationsTotal = openCompensations.reduce((sum,c) => sum+c.amount,0)
  const paidCompensationsTotal = compensations.filter(c => statusIsPaid(c.status)).reduce((sum,c) => sum+c.amount,0)
  const compensationThisMonth = compensations.filter(c => c.entryDate?.startsWith(currentMonth)).reduce((sum,c) => sum+c.amount,0)

  const openDebts = debts.filter(d => d.status === 'open')
  const openDebtsTotal = openDebts.reduce((sum,d) => sum+d.amount,0)

  const incomingMonths = useMemo(() => Array.from({length:6},(_,offset) => {
    const key = monthKeyAtOffset(offset)
    const rows = pendingPayments.filter(p => p.dueDate.startsWith(key)).sort((a,b) => a.dueDate.localeCompare(b.dueDate))
    return {key,label:monthLabel(key),rows,total:rows.reduce((sum,p) => sum+p.amount,0)}
  }), [pendingPayments])

  const maxIncomingMonth = Math.max(1,...incomingMonths.map(m => m.total))
  const visiblePayments = payments
    .filter(p => showPaid || p.status === 'pending')
    .sort((a,b) => a.status === b.status ? a.dueDate.localeCompare(b.dueDate) : a.status === 'pending' ? -1 : 1)
  const visibleDebts = debts
    .filter(d => showClosedDebts || d.status === 'open')
    .sort((a,b) => {
      if (a.status !== b.status) return a.status === 'open' ? -1 : 1
      return (a.dueDate ?? '9999-12-31').localeCompare(b.dueDate ?? '9999-12-31')
    })
  const movements = [...ledgerEntries].sort((a,b) => (b.entryDate ?? '').localeCompare(a.entryDate ?? ''))
  const sortedCompensations = [...compensations].sort((a,b) => (b.entryDate ?? '').localeCompare(a.entryDate ?? ''))
  const sortedDeadlines = [...deadlines].sort((a,b) => a.dueDate.localeCompare(b.dueDate))

  return <div className="economy-page">
    <section className="section-block economy-hero economy-hero-compact">
      <div className="economy-kpi-grid economy-kpi-grid-top">
        <EconomyKpi icon={Banknote} label="Incassato questo mese" value={money(paidThisMonth)} note="pagamenti registrati come incassati" tone="positive"/>
        <EconomyKpi icon={CalendarDays} label="In arrivo questo mese" value={money(incomingThisMonth)} note={pendingPayments.filter(p => p.dueDate.startsWith(currentMonth)).length + ' incassi previsti'} tone="brand"/>
        <EconomyKpi icon={Wallet} label="Stipendi / compensi da pagare" value={money(openCompensationsTotal)} note={openCompensations.length + ' voci ancora aperte'} tone="warning"/>
        <EconomyKpi icon={Landmark} label="Debiti da restituire" value={money(openDebtsTotal)} note={openDebts.length ? openDebts.length + ' debiti aperti' : 'nessun debito aperto'} tone="neutral"/>
      </div>
    </section>

    <div className="economy-tabs" role="tablist" aria-label="Sezioni economia">
      <button className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}><LayoutDashboard size={14}/><span>Panoramica</span></button>
      <button className={tab === 'income' ? 'active' : ''} onClick={() => setTab('income')}><CircleDollarSign size={14}/><span>Incassi</span></button>
      <button className={tab === 'compensations' ? 'active' : ''} onClick={() => setTab('compensations')}><WalletCards size={14}/><span>Stipendi</span></button>
      <button className={tab === 'debts' ? 'active' : ''} onClick={() => setTab('debts')}><Landmark size={14}/><span>Debiti</span></button>
      <button className={tab === 'operations' ? 'active' : ''} onClick={() => setTab('operations')}><ListChecks size={14}/><span>Altre voci</span></button>
    </div>

    {tab === 'overview' && <div className="economy-overview-grid">
      <section className="section-block economy-panel economy-incoming-panel">
        <div className="section-heading economy-section-heading">
          <div className="economy-heading-copy"><span className="economy-heading-icon"><CalendarClock size={17}/></span><div><p className="eyebrow">Previsione semplice</p><h2>Incassi mensili in arrivo</h2></div></div>
          <strong className="stats-total">{money(pendingTotal)}</strong>
        </div>
        <div className="economy-month-list">
          {incomingMonths.map(month => <button key={month.key} type="button" className="economy-month-row" onClick={() => setTab('income')}>
            <div className="economy-month-copy">
              <strong>{month.label}</strong>
              <span>{month.rows.length ? month.rows.length + (month.rows.length === 1 ? ' incasso' : ' incassi') : 'Nessun incasso previsto'}</span>
            </div>
            <div className="economy-month-track"><i style={{width:`${month.total ? Math.max(5,month.total/maxIncomingMonth*100) : 0}%`}}/></div>
            <b>{money(month.total)}</b>
          </button>)}
        </div>
      </section>

      <section className="section-block economy-panel economy-attention-panel">
        <div className="section-heading economy-section-heading"><div className="economy-heading-copy"><span className="economy-heading-icon warning"><AlertTriangle size={17}/></span><div><p className="eyebrow">Da controllare</p><h2>Tre cose importanti</h2></div></div></div>
        <button className={`economy-attention-row ${overduePayments.length ? 'danger' : ''}`} onClick={() => setTab('income')}>
          <span className="economy-attention-icon"><AlertTriangle size={18}/></span>
          <div><strong>Incassi scaduti</strong><small>{overduePayments.length} voci</small></div>
          <b>{money(overdueTotal)}</b>
        </button>
        <button className="economy-attention-row" onClick={() => setTab('compensations')}>
          <span className="economy-attention-icon"><WalletCards size={18}/></span>
          <div><strong>Compensi da pagare</strong><small>{openCompensations.length} voci</small></div>
          <b>{money(openCompensationsTotal)}</b>
        </button>
        <button className="economy-attention-row" onClick={() => setTab('debts')}>
          <span className="economy-attention-icon"><Landmark size={18}/></span>
          <div><strong>Debiti aperti</strong><small>{openDebts.length} voci</small></div>
          <b>{money(openDebtsTotal)}</b>
        </button>
      </section>
    </div>}

    {tab === 'income' && <section className="section-block economy-panel">
      <div className="section-heading responsive-heading">
        <div className="economy-heading-copy"><span className="economy-heading-icon positive"><CircleDollarSign size={17}/></span><div><p className="eyebrow">Entrate</p><h2>Incassi</h2></div></div>
        <button className="primary-button" onClick={() => setEditor({kind:'payment',record:null})}><Plus size={15}/> Nuovo incasso</button>
      </div>
      <div className="economy-mini-summary">
        <div><span>Da incassare</span><strong>{money(pendingTotal)}</strong></div>
        <div className={overdueTotal ? 'danger' : ''}><span>Scaduto</span><strong>{money(overdueTotal)}</strong></div>
        <div><span>Incassato mese</span><strong>{money(paidThisMonth)}</strong></div>
      </div>
      <div className="list-toolbar"><p><strong>{pendingPayments.length}</strong> incassi aperti</p><label className="switch-label"><input type="checkbox" checked={showPaid} onChange={e => setShowPaid(e.target.checked)}/><span/>Mostra incassati</label></div>
      <div className="payment-list full-list">
        {visiblePayments.map(p => <article className={`payment-row tone-${p.status === 'paid' ? 'paid' : countdownTone(p.dueDate)}`} key={p.id}>
          <div className="countdown-box"><small>{p.status === 'paid' ? 'stato' : 'scadenza'}</small><strong>{p.status === 'paid' ? 'incassato' : countdownLabel(p.dueDate)}</strong></div>
          <div className="payment-main"><h3>{client(p.clientId)}</h3><p>{p.label}</p><small>{p.recurrenceId ? 'Ricorrente' : 'Una tantum'}{p.reminderCount ? ` · ${p.reminderCount} solleciti` : ''}</small></div>
          <div className="payment-date"><small>Data</small><strong>{formatShortDate(p.dueDate)}</strong></div>
          <div className="payment-amount">{money(p.amount)}</div>
          <div className="row-actions">
            {p.status === 'pending'
              ? <><button className="secondary-button" onClick={() => onReminder(p.id)}>Sollecita</button><button className="primary-button compact" onClick={() => void actions.markPaymentPaid(p.id)}>Segna incassato</button></>
              : <span className="paid-badge"><CheckCircle2 size={14}/> Incassato</span>}
            <button className="icon-button tiny" title="Modifica" onClick={() => setEditor({kind:'payment',record:p})}><Pencil size={13}/></button>
          </div>
        </article>)}
        {!visiblePayments.length && <div className="empty-inline">Nessun incasso da mostrare.</div>}
      </div>
    </section>}

    {tab === 'compensations' && <section className="section-block economy-panel">
      <div className="section-heading responsive-heading">
        <div className="economy-heading-copy"><span className="economy-heading-icon"><WalletCards size={17}/></span><div><p className="eyebrow">Persone</p><h2>Stipendi & compensi</h2></div></div>
        <button className="primary-button" onClick={() => setEditor({kind:'compensation',record:null})}><Plus size={15}/> Nuovo compenso</button>
      </div>
      <div className="economy-mini-summary">
        <div><span>Da pagare</span><strong>{money(openCompensationsTotal)}</strong></div>
        <div><span>Voci del mese</span><strong>{money(compensationThisMonth)}</strong></div>
        <div><span>Pagato storico</span><strong>{money(paidCompensationsTotal)}</strong></div>
      </div>
      <div className="economy-record-list">
        {sortedCompensations.map(c => {
          const paid = statusIsPaid(c.status)
          return <article className={`economy-record-row ${paid ? 'is-done' : ''}`} key={c.id}>
            <span className="economy-record-icon"><WalletCards size={17}/></span>
            <div className="economy-record-main"><strong>{c.memberName || 'Collaboratore'}</strong><span>{c.description}</span><small>{client(c.clientId)} · {c.entryDate ? formatShortDate(c.entryDate) : 'Data non indicata'}</small></div>
            <b>{money(c.amount)}</b>
            <span className={`economy-status ${paid ? 'done' : 'open'}`}>{c.status || (paid ? 'Pagato' : 'Da pagare')}</span>
            <div className="economy-record-actions">
              {!paid && <button className="secondary-button compact" onClick={() => void actions.updateCompensation(c.id,{status:'Pagato'})}>Segna pagato</button>}
              <button className="icon-button tiny" title="Modifica" onClick={() => setEditor({kind:'compensation',record:c})}><Pencil size={13}/></button>
            </div>
          </article>
        })}
        {!sortedCompensations.length && <div className="empty-inline">Nessun compenso registrato.</div>}
      </div>
    </section>}

    {tab === 'debts' && <section className="section-block economy-panel">
      <div className="section-heading responsive-heading">
        <div className="economy-heading-copy"><span className="economy-heading-icon debt"><Landmark size={17}/></span><div><p className="eyebrow">Soldi da restituire</p><h2>Debiti</h2></div></div>
        <button className="primary-button" onClick={() => setEditor({kind:'debt',record:null})}><Plus size={15}/> Nuovo debito</button>
      </div>
      <div className="economy-debt-total">
        <div><span>Debito aperto totale</span><strong>{money(openDebtsTotal)}</strong><small>{openDebts.length ? openDebts.length + ' voci da restituire' : 'Nessun importo da restituire'}</small></div>
        <Landmark size={28}/>
      </div>
      <div className="list-toolbar"><p>Inserisci qui anticipi, prestiti, rimborsi o qualsiasi somma da restituire.</p><label className="switch-label"><input type="checkbox" checked={showClosedDebts} onChange={e => setShowClosedDebts(e.target.checked)}/><span/>Mostra restituiti</label></div>
      <div className="economy-record-list">
        {visibleDebts.map(d => {
          const paid = d.status === 'paid'
          const overdue = !paid && Boolean(d.dueDate && d.dueDate < today)
          return <article className={`economy-record-row debt ${paid ? 'is-done' : ''} ${overdue ? 'is-overdue' : ''}`} key={d.id}>
            <span className="economy-record-icon"><Landmark size={17}/></span>
            <div className="economy-record-main"><strong>{d.creditor}</strong><span>{d.description || 'Debito / rimborso'}</span><small>{d.dueDate ? `Entro ${formatShortDate(d.dueDate)}` : 'Nessuna scadenza'}{d.notes ? ' · ' + d.notes : ''}</small></div>
            <b>{money(d.amount)}</b>
            <span className={`economy-status ${paid ? 'done' : overdue ? 'danger' : 'open'}`}>{paid ? 'Restituito' : overdue ? 'Scaduto' : 'Da restituire'}</span>
            <div className="economy-record-actions">
              {!paid && <button className="primary-button compact" onClick={() => void actions.updateDebt(d.id,{status:'paid',paidAt:new Date().toISOString()})}>Segna restituito</button>}
              <button className="icon-button tiny" title="Modifica" onClick={() => setEditor({kind:'debt',record:d})}><Pencil size={13}/></button>
            </div>
          </article>
        })}
        {!visibleDebts.length && <div className="economy-empty-state"><Landmark size={22}/><strong>Nessun debito aperto</strong><span>Quando avrai una somma da restituire, comparirà qui.</span></div>}
      </div>
    </section>}

    {tab === 'operations' && <div className="economy-operations-stack">
      <section className="section-block economy-panel">
        <div className="section-heading responsive-heading"><div><p className="eyebrow">Entrate ricorrenti</p><h2>Ricorrenze</h2></div><button className="secondary-button" onClick={() => setEditor({kind:'recurrence',record:null})}><Repeat2 size={14}/> Aggiungi</button></div>
        <div className="recurrence-grid">
          {recurrences.map(r => <article className={`recurrence-card ${r.active ? '' : 'inactive'}`} key={r.id}>
            <div className="recurrence-icon"><CalendarClock size={20}/></div>
            <div className="recurrence-head"><div><p>{client(r.clientId)}</p><h3>{r.label}</h3></div><strong>{money(r.amount)}</strong></div>
            <div className="recurrence-data"><div><small>Frequenza</small><strong>{r.intervalMonths === 1 ? 'Mensile' : r.intervalMonths === 3 ? 'Trimestrale' : r.intervalMonths === 6 ? 'Semestrale' : r.intervalMonths === 12 ? 'Annuale' : `Ogni ${r.intervalMonths} mesi`}</strong></div><div><small>Prossima</small><strong>{countdownLabel(r.nextDueDate)}</strong></div></div>
            <div className="card-actions"><button className="secondary-button" onClick={() => void actions.updateRecurrence(r.id,{active:!r.active})}>{r.active ? <><PauseCircle size={14}/> Pausa</> : <><PlayCircle size={14}/> Riattiva</>}</button><button className="icon-button tiny" onClick={() => setEditor({kind:'recurrence',record:r})}><Pencil size={13}/></button></div>
          </article>)}
        </div>
      </section>

      <section className="section-block economy-panel">
        <div className="section-heading responsive-heading"><div><p className="eyebrow">Cassa</p><h2>Movimenti</h2></div><button className="secondary-button" onClick={() => setEditor({kind:'ledger',record:null})}><Plus size={14}/> Movimento</button></div>
        <div className="ledger-summary">
          <div><small>Entrate incassate</small><strong>{money(ledgerEntries.filter(x => x.direction === 'income' && x.status === 'Incassato').reduce((s,x) => s+x.amount,0))}</strong></div>
          <div><small>Da incassare</small><strong>{money(ledgerEntries.filter(x => x.direction === 'income' && x.status !== 'Incassato').reduce((s,x) => s+x.amount,0))}</strong></div>
          <div><small>Uscite</small><strong>{money(ledgerEntries.filter(x => x.direction === 'expense').reduce((s,x) => s+x.amount,0))}</strong></div>
        </div>
        <div className="ledger-list">
          {movements.map(m => <button type="button" className="ledger-row ledger-row-edit" key={m.id} onClick={() => setEditor({kind:'ledger',record:m})}>
            <span className={`ledger-sign ${m.direction}`}>{m.direction === 'income' ? '+' : '−'}</span>
            <div><strong>{m.description || m.category}</strong><small>{client(m.clientId)} · {m.category}{m.notes ? ' · ' + m.notes : ''}</small></div>
            <time>{m.entryDate ? formatShortDate(m.entryDate) : 'Data da confermare'}</time>
            <b>{m.direction === 'income' ? '+' : '−'}{money(m.amount)}</b>
            <span className="status-chip">{m.status}</span>
          </button>)}
        </div>
      </section>

      <section className="section-block economy-panel">
        <div className="section-heading responsive-heading"><div><p className="eyebrow">Costi e rinnovi</p><h2>Scadenze</h2></div><button className="secondary-button" onClick={() => setEditor({kind:'deadline',record:null})}><Clock3 size={14}/> Aggiungi</button></div>
        <div className="deadline-grid">
          {sortedDeadlines.map(d => <button type="button" className={`deadline-card deadline-card-edit ${d.dueDate < today ? 'overdue' : ''}`} key={d.id} onClick={() => setEditor({kind:'deadline',record:d})}>
            <div><p>{client(d.clientId)}</p><h3>{d.service}</h3><span>{d.provider}</span></div>
            <div><small>Scadenza</small><strong>{formatShortDate(d.dueDate)}</strong><span>{countdownLabel(d.dueDate)}</span></div>
            <div><small>Costo</small><strong>{d.cost == null ? '—' : money(d.cost)}</strong><span>{d.status}</span></div>
            {d.notes && <p className="deadline-note">{d.notes}</p>}
          </button>)}
        </div>
      </section>
    </div>}

    {editor && <RecordEditorModal kind={editor.kind} record={editor.record} data={data} actions={actions} onClose={() => setEditor(null)}/>}
  </div>
}

function EconomyKpi({
  icon:Icon,
  label,
  value,
  note,
  tone,
}: {
  icon: typeof CircleDollarSign
  label: string
  value: string
  note: string
  tone: 'positive' | 'brand' | 'warning' | 'neutral'
}) {
  return <article className={`economy-kpi economy-kpi-${tone}`}>
    <span className="economy-kpi-icon"><Icon size={20} strokeWidth={1.9}/></span>
    <div><span>{label}</span><strong>{value}</strong><small>{note}</small></div>
  </article>
}
