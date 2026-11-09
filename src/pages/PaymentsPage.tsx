import { useMemo, useState } from 'react'
import {
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Landmark,
  PauseCircle,
  Pencil,
  PlayCircle,
  Plus,
  Repeat2,
  WalletCards,
} from 'lucide-react'
import { countdownLabel, countdownTone, formatShortDate, money, todayISO } from '../lib/date'
import type { StudioData } from '../types/studio'
import type { useStudio } from '../hooks/useStudio'
import { RecordEditorModal } from '../components/RecordEditorModal'
import { memberToneClass } from '../lib/memberTone'
import { SalaryTrend } from '../components/SalaryTrend'

type Actions = ReturnType<typeof useStudio>['actions']
type Tab = 'income' | 'compensations' | 'recurrences' | 'movements' | 'debts'
type EditorKind = 'payment' | 'recurrence' | 'ledger' | 'deadline' | 'compensation' | 'debt'

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`
}

function statusIsPaid(status: string) {
  const value = status.trim().toLowerCase()
  return value === 'pagato' || value === 'paid' || value === 'saldato' || value === 'restituito'
}

const roundMoney = (value:number) => Math.round(value * 100) / 100
const invoiceContribution = (amount:number) => roundMoney(amount * .04)
const invoiceGross = (amount:number, invoiced?:boolean) => invoiced ? roundMoney(amount + invoiceContribution(amount) + 2) : amount
const invoiceNet = (amount:number, invoiced?:boolean) => invoiced ? roundMoney(invoiceGross(amount,true) * .40) : amount

export function PaymentsPage({
  data,
  actions,
}: {
  data: StudioData
  actions: Actions
}) {
  const [tab,setTab] = useState<Tab>('income')
  const [editor,setEditor] = useState<{kind:EditorKind;record:any} | null>(null)
  const [expandedCompensationMember,setExpandedCompensationMember] = useState<string | null>(null)

  const today = todayISO()
  const currentMonth = monthKey(new Date())
  const clients = data.clients ?? []
  const payments = data.payments ?? []
  const recurrences = data.recurrences ?? []
  const ledgerEntries = data.ledgerEntries ?? []
  const compensations = data.compensations ?? []
  const debts = data.debts ?? []
  const client = (id: string | null) => clients.find(c => c.id === id)?.name ?? '4Bit Studio'
  const compensationClients = (compensation: StudioData['compensations'][number]) => {
    const ids=compensation.clientIds?.length
      ? compensation.clientIds
      : compensation.clientId
        ? [compensation.clientId]
        : []
    if(!ids.length) return '4Bit Studio'
    const names=ids.map(id=>clients.find(c=>c.id===id)?.name).filter(Boolean)
    return names.length ? names.join(' + ') : '4Bit Studio'
  }

  const pendingPayments = payments.filter(p => p.status === 'pending')
  const paidPayments = payments.filter(p => p.status === 'paid')
  const overduePayments = pendingPayments.filter(p => p.dueDate < today)
  const pendingTotal = pendingPayments.reduce((sum,p) => sum+invoiceGross(p.amount,p.invoiced),0)
  const pendingNet = pendingPayments.reduce((sum,p) => sum+invoiceNet(p.amount,p.invoiced),0)
  const overdueTotal = overduePayments.reduce((sum,p) => sum+invoiceGross(p.amount,p.invoiced),0)
  const paidThisMonthRows = paidPayments.filter(p => p.paidAt?.startsWith(currentMonth))
  const paidThisMonth = paidThisMonthRows.reduce((sum,p) => sum+invoiceGross(p.amount,p.invoiced),0)
  const paidThisMonthNet = paidThisMonthRows.reduce((sum,p) => sum+invoiceNet(p.amount,p.invoiced),0)
  const openDebts = debts.filter(d => d.status === 'open')
  const openDebtsTotal = openDebts.reduce((sum,d) => sum+d.amount,0)

  const visiblePayments = [...payments]
    .sort((a,b) => {
      if(a.status !== b.status) return a.status === 'pending' ? -1 : 1
      const aDate=a.status === 'paid' ? (a.paidAt?.slice(0,10) ?? a.dueDate) : a.dueDate
      const bDate=b.status === 'paid' ? (b.paidAt?.slice(0,10) ?? b.dueDate) : b.dueDate
      return a.status === 'paid' ? bDate.localeCompare(aDate) : aDate.localeCompare(bDate)
    })
  const visibleDebts = [...debts]
    .sort((a,b) => {
      if (a.status !== b.status) return a.status === 'open' ? -1 : 1
      const aDate=a.status === 'paid' ? (a.paidAt?.slice(0,10) ?? a.dueDate ?? '') : (a.dueDate ?? '9999-12-31')
      const bDate=b.status === 'paid' ? (b.paidAt?.slice(0,10) ?? b.dueDate ?? '') : (b.dueDate ?? '9999-12-31')
      return a.status === 'paid' ? bDate.localeCompare(aDate) : aDate.localeCompare(bDate)
    })
  const movements = [...ledgerEntries].sort((a,b) => (b.entryDate ?? '').localeCompare(a.entryDate ?? ''))
  const sortedCompensations = compensations.filter(c => statusIsPaid(c.status)).sort((a,b) => {
    const aDate = a.entryDate ?? a.paidAt?.slice(0,10) ?? ''
    const bDate = b.entryDate ?? b.paidAt?.slice(0,10) ?? ''
    return bDate.localeCompare(aDate)
  })
  const compensationGroups = useMemo(() => {
    const groups=new Map<string,{key:string;memberId:string|null;memberName:string;rows:typeof sortedCompensations}>()
    for(const compensation of sortedCompensations){
      const key=compensation.memberId || `name:${compensation.memberName || 'Collaboratore'}`
      const existing=groups.get(key)
      if(existing) existing.rows.push(compensation)
      else groups.set(key,{
        key,
        memberId:compensation.memberId,
        memberName:compensation.memberName || 'Collaboratore',
        rows:[compensation],
      })
    }
    return [...groups.values()].sort((a,b)=>a.memberName.localeCompare(b.memberName,'it'))
  },[sortedCompensations])

  return <div className="economy-page">
    <div className="economy-tabs" role="tablist" aria-label="Sezioni economia">
      <button className={tab === 'income' ? 'active' : ''} onClick={() => setTab('income')}><CircleDollarSign size={14}/><span>Incassi</span></button>
      <button className={tab === 'compensations' ? 'active' : ''} onClick={() => setTab('compensations')}><WalletCards size={14}/><span>Stipendi</span></button>
      <button className={tab === 'recurrences' ? 'active' : ''} onClick={() => setTab('recurrences')}><Repeat2 size={14}/><span>Ricorrenze</span></button>
      <button className={tab === 'movements' ? 'active' : ''} onClick={() => setTab('movements')}><CircleDollarSign size={14}/><span>Movimenti</span></button>
      <button className={tab === 'debts' ? 'active' : ''} onClick={() => setTab('debts')}><Landmark size={14}/><span>Debiti</span></button>
    </div>

    {tab === 'income' && <section className="section-block economy-panel">
      <div className="section-heading responsive-heading">
        <div className="economy-heading-copy"><span className="economy-heading-icon positive"><CircleDollarSign size={17}/></span><div><p className="eyebrow">Entrate</p><h2>Incassi</h2></div></div>
        <button className="primary-button" onClick={() => setEditor({kind:'payment',record:null})}><Plus size={15}/> Nuovo incasso</button>
      </div>
      <div className="economy-mini-summary">
        <div><span>Da incassare · lordo</span><strong>{money(pendingTotal)}</strong><small>Netto previsto {money(pendingNet)}</small></div>
        <div className={overdueTotal ? 'danger' : ''}><span>Scaduto · lordo</span><strong>{money(overdueTotal)}</strong></div>
        <div><span>Incassato mese · lordo</span><strong>{money(paidThisMonth)}</strong><small>Netto {money(paidThisMonthNet)}</small></div>
      </div>
      <div className="list-toolbar"><p><strong>{pendingPayments.length}</strong> incassi aperti · <strong>{paidPayments.length}</strong> incassati</p></div>
      <div className="payment-list full-list">
        {visiblePayments.map(p => <article className={`payment-row tone-${p.status === 'paid' ? 'paid' : countdownTone(p.dueDate)}`} key={p.id}>
          <div className="countdown-box"><small>{p.status === 'paid' ? 'stato' : 'scadenza'}</small><strong>{p.status === 'paid' ? 'incassato' : countdownLabel(p.dueDate)}</strong></div>
          <div className="payment-main">
            <h3>{client(p.clientId)}</h3>
            <p>{p.label}</p>
            <div className="payment-meta-line"><small>{p.recurrenceId ? 'Ricorrente' : 'Una tantum'}{p.reminderCount ? ` · ${p.reminderCount} solleciti` : ''}</small>{p.invoiced && <span className="invoice-chip">✓ Fatturato</span>}</div>
            {p.invoiced && <div className="invoice-row-breakdown"><span>Base {money(p.amount)}</span><span>4% +{money(invoiceContribution(p.amount))}</span><span>Bollo +{money(2)}</span></div>}
          </div>
          <div className="payment-date"><small>Data</small><strong>{formatShortDate(p.dueDate)}</strong></div>
          {p.invoiced
            ? <div className="payment-amount payment-amount-invoiced"><small>Lordo</small><strong>{money(invoiceGross(p.amount,true))}</strong><span>Netto {money(invoiceNet(p.amount,true))}</span></div>
            : <div className="payment-amount">{money(p.amount)}</div>}
          <div className="row-actions">
            {p.status === 'pending'
              ? <button className="primary-button compact" onClick={() => void actions.markPaymentPaid(p.id)}>Segna incassato</button>
              : <span className="paid-badge payment-paid-card"><CheckCircle2 size={14}/> Incassato</span>}
            <button className="icon-button tiny" title="Modifica" onClick={() => setEditor({kind:'payment',record:p})}><Pencil size={13}/></button>
          </div>
        </article>)}
        {!visiblePayments.length && <div className="empty-inline">Nessun incasso da mostrare.</div>}
      </div>
    </section>}

    {tab === 'compensations' && <section className="section-block economy-panel">
      <div className="section-heading responsive-heading">
        <div className="economy-heading-copy"><span className="economy-heading-icon"><WalletCards size={17}/></span><div><h2>Stipendi</h2></div></div>
        <button className="primary-button" onClick={() => setEditor({kind:'compensation',record:null})}><Plus size={15}/> Nuovo stipendio</button>
      </div>

      <SalaryTrend compensations={sortedCompensations} members={data.members ?? []}/>

      <div className="salary-history-heading">
        <div><h3>Pagato storico</h3><span>Riepilogo delle somme effettivamente pagate, per persona</span></div>
        <strong>{money(sortedCompensations.reduce((sum,item)=>sum+item.amount,0))}</strong>
      </div>
      <div className="compensation-team-groups salary-history-groups">
        {compensationGroups.map(group => {
          const expanded=expandedCompensationMember===group.key
          const total=group.rows.reduce((sum,row)=>sum+row.amount,0)
          return <section className={`compensation-team-group ${expanded ? 'is-open' : ''}`} key={group.key}>
            <button
              type="button"
              className="compensation-team-group-toggle salary-history-toggle"
              onClick={()=>setExpandedCompensationMember(current=>current===group.key ? null : group.key)}
              aria-expanded={expanded}
            >
              <span className={`compensation-team-group-avatar ${memberToneClass(group.memberName)}`}>{group.memberName.slice(0,2).toUpperCase()}</span>
              <span className="compensation-team-group-name">
                <strong>{group.memberName}</strong>
                <small>{group.rows.length} {group.rows.length === 1 ? 'voce pagata' : 'voci pagate'}</small>
              </span>
              <span className="compensation-team-group-stat"><small>Pagato storico</small><strong>{money(total)}</strong></span>
              <span className="compensation-team-group-chevron"><ChevronDown size={17}/></span>
            </button>
            {expanded && <div className="compensation-team-transactions">
              {group.rows.map(compensation => <article className="economy-record-row compensation-transaction is-done" key={compensation.id}>
                <span className="economy-record-icon"><WalletCards size={17}/></span>
                <div className="economy-record-main">
                  <strong>{compensation.compensationType === 'salary_recurring' ? 'Stipendio ricorrente' : 'Stipendio'}{compensation.description ? ' · ' + compensation.description : ''}</strong>
                  <span>{compensationClients(compensation)}</span>
                  <small>{compensation.paidAt ? formatShortDate(compensation.paidAt.slice(0,10)) : compensation.entryDate ? formatShortDate(compensation.entryDate) : 'Data non indicata'}</small>
                </div>
                <b>{money(compensation.amount)}</b>
                <span className="economy-status done">Pagato</span>
                <div className="economy-record-actions">
                  <button className="icon-button tiny" title="Modifica" onClick={() => setEditor({kind:'compensation',record:compensation})}><Pencil size={13}/></button>
                </div>
              </article>)}
            </div>}
          </section>
        })}
        {!compensationGroups.length && <div className="empty-inline">Nessuno stipendio pagato ancora registrato.</div>}
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
      <div className="economy-record-list">
        {visibleDebts.map(d => {
          const paid = d.status === 'paid'
          const overdue = !paid && Boolean(d.dueDate && d.dueDate < today)
          return <article className={`economy-record-row debt ${paid ? 'is-done' : ''} ${overdue ? 'is-overdue' : ''}`} key={d.id}>
            <span className="economy-record-icon"><Landmark size={17}/></span>
            <div className="economy-record-main"><strong>{d.creditor}</strong><span>{d.description || 'Debito / rimborso'}</span><small>{d.dueDate ? `Entro ${formatShortDate(d.dueDate)}` : 'Nessuna scadenza'}{d.notes ? ' · ' + d.notes : ''}</small></div>
            <b>{money(d.amount)}</b>
            <span className={`economy-status ${paid ? 'done economy-status-green-card' : overdue ? 'danger' : 'open'}`}>{paid ? 'Restituito' : overdue ? 'Scaduto' : 'Da restituire'}</span>
            <div className="economy-record-actions">
              {!paid && <button className="primary-button compact" onClick={() => void actions.updateDebt(d.id,{status:'paid',paidAt:new Date().toISOString()})}>Segna restituito</button>}
              <button className="icon-button tiny" title="Modifica" onClick={() => setEditor({kind:'debt',record:d})}><Pencil size={13}/></button>
            </div>
          </article>
        })}
        {!visibleDebts.length && <div className="economy-empty-state"><Landmark size={22}/><strong>Nessun debito registrato</strong><span>Quando avrai una somma da restituire, comparirà qui.</span></div>}
      </div>
    </section>}

    {tab === 'recurrences' && <section className="section-block economy-panel">
        <div className="section-heading responsive-heading"><div><p className="eyebrow">Entrate ricorrenti</p><h2>Ricorrenze</h2></div><button className="secondary-button" onClick={() => setEditor({kind:'recurrence',record:null})}><Repeat2 size={14}/> Aggiungi</button></div>
        <div className="recurrence-grid">
          {recurrences.map(r => <article className={`recurrence-card ${r.active ? '' : 'inactive'}`} key={r.id}>
            <div className="recurrence-icon"><CalendarClock size={20}/></div>
            <div className="recurrence-head"><div><p>{client(r.clientId)}</p><h3>{r.label}</h3>{r.invoiced && <span className="invoice-chip">✓ Fatturato</span>}</div><div className="recurrence-head-amount"><small>{r.invoiced ? 'Lordo fattura' : 'Importo'}</small><strong>{money(invoiceGross(r.amount,r.invoiced))}</strong>{r.invoiced && <span>Netto {money(invoiceNet(r.amount,true))}</span>}</div></div>
            {r.invoiced && <div className="recurrence-tax-line"><span>Base {money(r.amount)}</span><span>4% +{money(invoiceContribution(r.amount))}</span><span>Bollo +{money(2)}</span></div>}
            <div className="recurrence-data"><div><small>Frequenza</small><strong>{r.intervalMonths === 1 ? 'Mensile' : r.intervalMonths === 3 ? 'Trimestrale' : r.intervalMonths === 6 ? 'Semestrale' : r.intervalMonths === 12 ? 'Annuale' : `Ogni ${r.intervalMonths} mesi`}</strong></div><div><small>Prossima</small><strong>{countdownLabel(r.nextDueDate)}</strong></div></div>
            <div className="card-actions"><button className="secondary-button" onClick={() => void actions.updateRecurrence(r.id,{active:!r.active})}>{r.active ? <><PauseCircle size={14}/> Pausa</> : <><PlayCircle size={14}/> Riattiva</>}</button><button className="icon-button tiny" onClick={() => setEditor({kind:'recurrence',record:r})}><Pencil size={13}/></button></div>
          </article>)}
        </div>
      </section>}

    {tab === 'movements' && <section className="section-block economy-panel">
        <div className="section-heading responsive-heading"><div><p className="eyebrow">Cassa</p><h2>Movimenti</h2></div><button className="secondary-button" onClick={() => setEditor({kind:'ledger',record:null})}><Plus size={14}/> Movimento</button></div>
        <div className="ledger-summary ledger-summary-single">
          <div><small>Entrate incassate</small><strong>{money(ledgerEntries.filter(x => x.direction === 'income' && x.status === 'Incassato').reduce((s,x) => s+x.amount,0))}</strong></div>
        </div>
        <div className="ledger-list">
          {movements.map(m => {
            const linkedPayment=m.paymentId ? payments.find(p=>p.id===m.paymentId) : null
            const linkedCompensation=m.compensationId ? compensations.find(c=>c.id===m.compensationId) : null
            const linkedDebt=m.debtId ? debts.find(d=>d.id===m.debtId) : null
            const linkedSource=Boolean(linkedPayment || linkedCompensation || linkedDebt)
            const sourceLabel=linkedPayment ? 'Da incasso' : linkedCompensation ? 'Da compenso' : linkedDebt ? 'Da debito' : m.status
            const sourceNote=linkedPayment ? 'Incasso collegato' : linkedCompensation ? 'Compenso collegato' : linkedDebt ? 'Debito collegato' : m.category
            return <button
              type="button"
              className={`ledger-row ledger-row-edit ${linkedSource ? 'linked-payment' : ''}`}
              key={m.id}
              onClick={() => {
                if(linkedPayment) return setEditor({kind:'payment',record:linkedPayment})
                if(linkedCompensation) return setEditor({kind:'compensation',record:linkedCompensation})
                if(linkedDebt) return setEditor({kind:'debt',record:linkedDebt})
                setEditor({kind:'ledger',record:m})
              }}
            >
              <span className={`ledger-sign ${m.direction}`}>{m.direction === 'income' ? '+' : '−'}</span>
              <div>
                <strong>{m.description || m.category}</strong>
                <small>{client(m.clientId)}{sourceNote ? ' · ' + sourceNote : ''}{m.notes ? ' · ' + m.notes : ''}</small>
              </div>
              <time>{m.entryDate ? formatShortDate(m.entryDate) : 'Data da confermare'}</time>
              <b>{m.direction === 'income' ? '+' : '−'}{money(m.amount)}</b>
              <span className={`status-chip ${linkedSource ? 'linked' : ''}`}>{sourceLabel}</span>
            </button>
          })}
        </div>
      </section>}

    {editor && <RecordEditorModal kind={editor.kind} record={editor.record} data={data} actions={actions} onClose={() => setEditor(null)}/>}
  </div>
}
