import { useState } from 'react'
import { CalendarClock, CheckCircle2, PauseCircle, PlayCircle, Repeat2, Trash2 } from 'lucide-react'
import { countdownLabel, countdownTone, formatShortDate, money } from '../lib/date'
import type { StudioData } from '../types/studio'
import type { useStudio } from '../hooks/useStudio'

type Actions = ReturnType<typeof useStudio>['actions']

export function PaymentsPage({ data, actions, onNewPayment, onNewRecurrence, onReminder }: { data: StudioData; actions: Actions; onNewPayment: () => void; onNewRecurrence: () => void; onReminder: (id: string) => void }) {
  const [tab, setTab] = useState<'payments' | 'recurrences'>('payments')
  const [showPaid, setShowPaid] = useState(false)
  const client = (id: string) => data.clients.find(c => c.id === id)?.name ?? 'Cliente'
  const payments = data.payments.filter(p => showPaid || p.status === 'pending').sort((a,b) => a.status === b.status ? a.dueDate.localeCompare(b.dueDate) : a.status === 'pending' ? -1 : 1)

  return <section className="section-block page-section">
    <div className="section-heading responsive-heading"><div><p className="eyebrow">Scadenze, canoni e rinnovi</p><h2>Pagamenti</h2></div><div className="inline-actions"><button className="secondary-button" onClick={onNewRecurrence}><Repeat2 size={15}/> Nuova ricorrenza</button><button className="primary-button" onClick={onNewPayment}>Nuovo pagamento</button></div></div>
    <div className="segmented payment-tabs"><button className={tab === 'payments' ? 'active' : ''} onClick={() => setTab('payments')}>Pagamenti</button><button className={tab === 'recurrences' ? 'active' : ''} onClick={() => setTab('recurrences')}>Ricorrenze</button></div>

    {tab === 'payments' ? <>
      <div className="list-toolbar"><p><strong>{data.payments.filter(p => p.status === 'pending').length}</strong> pagamenti aperti</p><label className="switch-label"><input type="checkbox" checked={showPaid} onChange={e => setShowPaid(e.target.checked)}/><span/>Mostra pagati</label></div>
      <div className="payment-list full-list">
        {payments.map(p => <article className={`payment-row tone-${p.status === 'paid' ? 'paid' : countdownTone(p.dueDate)}`} key={p.id}>
          <div className="countdown-box"><small>{p.status === 'paid' ? 'stato' : 'scadenza'}</small><strong>{p.status === 'paid' ? 'pagato' : countdownLabel(p.dueDate)}</strong></div>
          <div className="payment-main"><h3>{client(p.clientId)}</h3><p>{p.label}</p><small>{p.recurrenceId ? 'Ricorrente' : 'Una tantum'}{p.reminderCount ? ` · ${p.reminderCount} solleciti` : ''}</small></div>
          <div className="payment-date"><small>Data</small><strong>{formatShortDate(p.dueDate)}</strong></div>
          <div className="payment-amount">{money(p.amount)}</div>
          <div className="row-actions">{p.status === 'pending' ? <><button className="secondary-button" onClick={() => onReminder(p.id)}>Sollecita</button><button className="primary-button compact" onClick={() => void actions.markPaymentPaid(p.id)}>Segna pagato</button></> : <span className="paid-badge"><CheckCircle2 size={14}/> Incassato</span>}<button className="icon-button tiny" onClick={() => void actions.deletePayment(p.id)}><Trash2 size={13}/></button></div>
        </article>)}
      </div>
    </> : <div className="recurrence-grid">
      {data.recurrences.map(r => <article className={`recurrence-card ${r.active ? '' : 'inactive'}`} key={r.id}>
        <div className="recurrence-icon"><CalendarClock size={20}/></div><div className="recurrence-head"><div><p>{client(r.clientId)}</p><h3>{r.label}</h3></div><strong>{money(r.amount)}</strong></div>
        <div className="recurrence-data"><div><small>Frequenza</small><strong>{r.intervalMonths === 1 ? 'Mensile' : r.intervalMonths === 3 ? 'Trimestrale' : r.intervalMonths === 6 ? 'Semestrale' : r.intervalMonths === 12 ? 'Annuale' : `Ogni ${r.intervalMonths} mesi`}</strong></div><div><small>Prossima</small><strong>{countdownLabel(r.nextDueDate)}</strong></div></div>
        <div className="card-actions"><button className="secondary-button" onClick={() => void actions.updateRecurrence(r.id, { active: !r.active })}>{r.active ? <><PauseCircle size={14}/> Pausa</> : <><PlayCircle size={14}/> Riattiva</>}</button><button className="icon-button tiny" onClick={() => void actions.deleteRecurrence(r.id)}><Trash2 size={13}/></button></div>
      </article>)}
    </div>}
  </section>
}
