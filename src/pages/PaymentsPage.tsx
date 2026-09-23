import { useState } from 'react'
import { CalendarClock, CheckCircle2, PauseCircle, Pencil, PlayCircle, Plus, Repeat2 } from 'lucide-react'
import { countdownLabel, countdownTone, formatShortDate, money } from '../lib/date'
import type { StudioData } from '../types/studio'
import type { useStudio } from '../hooks/useStudio'
import { RecordEditorModal } from '../components/RecordEditorModal'

type Actions = ReturnType<typeof useStudio>['actions']
type Tab = 'payments' | 'recurrences' | 'movements' | 'deadlines'

export function PaymentsPage({ data, actions, onNewPayment, onNewRecurrence, onReminder }: { data: StudioData; actions: Actions; onNewPayment: () => void; onNewRecurrence: () => void; onReminder: (id: string) => void }) {
  const [tab, setTab] = useState<Tab>('payments')
  const [showPaid, setShowPaid] = useState(false)
  const [editor, setEditor] = useState<{kind:'payment'|'recurrence'|'ledger'|'deadline'; record:any} | null>(null)
  const clients = data.clients ?? []
  const allPayments = data.payments ?? []
  const recurrences = data.recurrences ?? []
  const ledgerEntries = data.ledgerEntries ?? []
  const allDeadlines = data.deadlines ?? []
  const client = (id: string | null) => clients.find(c => c.id === id)?.name ?? '4Bit Studio'
  const payments = allPayments.filter(p => showPaid || p.status === 'pending').sort((a,b) => a.status === b.status ? (a.dueDate ?? '').localeCompare(b.dueDate ?? '') : a.status === 'pending' ? -1 : 1)
  const movements = [...ledgerEntries].sort((a,b) => (b.entryDate ?? '').localeCompare(a.entryDate ?? ''))
  const deadlines = [...allDeadlines].sort((a,b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))

  return <section className="section-block page-section">
    <div className="section-heading responsive-heading">
      <div><p className="eyebrow">Scadenze, canoni e rinnovi</p><h2>Pagamenti</h2></div>
      <div className="inline-actions">
        {tab === 'payments' && <button className="primary-button" onClick={() => setEditor({kind:'payment',record:null})}><Plus size={15}/> Nuovo pagamento</button>}
        {tab === 'recurrences' && <button className="primary-button" onClick={() => setEditor({kind:'recurrence',record:null})}><Repeat2 size={15}/> Nuova ricorrenza</button>}
        {tab === 'movements' && <button className="primary-button" onClick={() => setEditor({kind:'ledger',record:null})}><Plus size={15}/> Nuovo movimento</button>}
        {tab === 'deadlines' && <button className="primary-button" onClick={() => setEditor({kind:'deadline',record:null})}><Plus size={15}/> Nuova scadenza</button>}
      </div>
    </div>

    <div className="segmented payment-tabs">
      <button className={tab === 'payments' ? 'active' : ''} onClick={() => setTab('payments')}>Pagamenti</button>
      <button className={tab === 'recurrences' ? 'active' : ''} onClick={() => setTab('recurrences')}>Ricorrenze</button>
      <button className={tab === 'movements' ? 'active' : ''} onClick={() => setTab('movements')}>Movimenti</button>
      <button className={tab === 'deadlines' ? 'active' : ''} onClick={() => setTab('deadlines')}>Scadenze</button>
    </div>

    {tab === 'payments' && <>
      <div className="list-toolbar"><p><strong>{allPayments.filter(p => p.status === 'pending').length}</strong> pagamenti aperti</p><label className="switch-label"><input type="checkbox" checked={showPaid} onChange={e => setShowPaid(e.target.checked)}/><span/>Mostra pagati</label></div>
      <div className="payment-list full-list">
        {payments.map(p => <article className={`payment-row tone-${p.status === 'paid' ? 'paid' : countdownTone(p.dueDate)}`} key={p.id}>
          <div className="countdown-box"><small>{p.status === 'paid' ? 'stato' : 'scadenza'}</small><strong>{p.status === 'paid' ? 'pagato' : countdownLabel(p.dueDate)}</strong></div>
          <div className="payment-main"><h3>{client(p.clientId)}</h3><p>{p.label}</p><small>{p.recurrenceId ? 'Ricorrente' : 'Una tantum'}{p.reminderCount ? ` · ${p.reminderCount} solleciti` : ''}</small></div>
          <div className="payment-date"><small>Data</small><strong>{formatShortDate(p.dueDate)}</strong></div>
          <div className="payment-amount">{money(p.amount)}</div>
          <div className="row-actions">
            {p.status === 'pending' ? <><button className="secondary-button" onClick={() => onReminder(p.id)}>Sollecita</button><button className="primary-button compact" onClick={() => void actions.markPaymentPaid(p.id)}>Segna pagato</button></> : <span className="paid-badge"><CheckCircle2 size={14}/> Incassato</span>}
            <button className="icon-button tiny" title="Modifica" onClick={() => setEditor({kind:'payment',record:p})}><Pencil size={13}/></button>
          </div>
        </article>)}
      </div>
    </>}

    {tab === 'recurrences' && <div className="recurrence-grid">
      {recurrences.map(r => <article className={`recurrence-card ${r.active ? '' : 'inactive'}`} key={r.id}>
        <div className="recurrence-icon"><CalendarClock size={20}/></div>
        <div className="recurrence-head"><div><p>{client(r.clientId)}</p><h3>{r.label}</h3></div><strong>{money(r.amount)}</strong></div>
        <div className="recurrence-data"><div><small>Frequenza</small><strong>{r.intervalMonths === 1 ? 'Mensile' : r.intervalMonths === 3 ? 'Trimestrale' : r.intervalMonths === 6 ? 'Semestrale' : r.intervalMonths === 12 ? 'Annuale' : `Ogni ${r.intervalMonths} mesi`}</strong></div><div><small>Prossima</small><strong>{countdownLabel(r.nextDueDate)}</strong></div></div>
        <div className="card-actions"><button className="secondary-button" onClick={() => void actions.updateRecurrence(r.id, { active: !r.active })}>{r.active ? <><PauseCircle size={14}/> Pausa</> : <><PlayCircle size={14}/> Riattiva</>}</button><button className="icon-button tiny" onClick={() => setEditor({kind:'recurrence',record:r})}><Pencil size={13}/></button></div>
      </article>)}
    </div>}

    {tab === 'movements' && <div className="ledger-wrap">
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
    </div>}

    {tab === 'deadlines' && <div className="deadline-grid">
      {deadlines.map(d => <button type="button" className={`deadline-card deadline-card-edit ${d.dueDate < new Date().toISOString().slice(0,10) ? 'overdue' : ''}`} key={d.id} onClick={() => setEditor({kind:'deadline',record:d})}>
        <div><p>{client(d.clientId)}</p><h3>{d.service}</h3><span>{d.provider}</span></div>
        <div><small>Scadenza</small><strong>{formatShortDate(d.dueDate)}</strong><span>{countdownLabel(d.dueDate)}</span></div>
        <div><small>Costo</small><strong>{d.cost == null ? '—' : money(d.cost)}</strong><span>{d.status}</span></div>
        {d.notes && <p className="deadline-note">{d.notes}</p>}
      </button>)}
    </div>}

    {editor && <RecordEditorModal kind={editor.kind} record={editor.record} data={data} actions={actions} onClose={() => setEditor(null)}/>}
  </section>
}
