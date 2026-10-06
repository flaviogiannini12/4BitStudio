import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
  CircleDollarSign,
  Clock3,
  Gauge,
  Landmark,
  Repeat2,
  TrendingUp,
  UsersRound,
  WalletCards,
} from 'lucide-react'
import { countdownLabel, money, todayISO } from '../lib/date'
import type { StudioData } from '../types/studio'

const MONTHS = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic']

function parseDate(value: string | null | undefined) {
  if (!value) return null
  const date = new Date(value.length === 10 ? value + 'T12:00:00' : value)
  return Number.isNaN(date.getTime()) ? null : date
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`
}

function addDays(value: string, days: number) {
  const date = new Date(value + 'T12:00:00')
  date.setDate(date.getDate() + days)
  return dateKey(date)
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function pct(value: number) {
  return Math.round(value) + '%'
}

export function StatsPage({ data }: { data: StudioData }) {
  const today = todayISO()
  const now = new Date()
  const year = now.getFullYear()
  const currentMonth = monthKey(now)
  const yearPrefix = String(year)

  const activeClients = data.clients.filter(client => client.status !== 'archived' && client.status !== 'lead')
  const pending = data.payments.filter(payment => payment.status === 'pending')
  const paid = data.payments.filter(payment => payment.status === 'paid')
  const overduePayments = pending.filter(payment => payment.dueDate < today)
  const activeRecurrences = data.recurrences.filter(recurrence => recurrence.active)

  const pendingTotal = pending.reduce((sum,payment) => sum + payment.amount, 0)
  const overdueTotal = overduePayments.reduce((sum,payment) => sum + payment.amount, 0)
  const annualRecurring = activeRecurrences.reduce((sum,recurrence) => sum + recurrence.amount * (12 / Math.max(1,recurrence.intervalMonths)), 0)
  const monthlyRecurringEquivalent = annualRecurring / 12
  const avgAnnualizedRecurrence = activeRecurrences.length ? annualRecurring / activeRecurrences.length : 0

  const paidThisMonth = paid
    .filter(payment => payment.paidAt?.startsWith(currentMonth))
    .reduce((sum,payment) => sum + payment.amount, 0)

  const paidThisYear = paid
    .filter(payment => payment.paidAt?.startsWith(yearPrefix))
    .reduce((sum,payment) => sum + payment.amount, 0)

  const next30Total = pending
    .filter(payment => payment.dueDate >= today && payment.dueDate <= addDays(today,30))
    .reduce((sum,payment) => sum + payment.amount, 0)

  const ledgerIncomeMonth = data.ledgerEntries
    .filter(entry => entry.direction === 'income' && entry.entryDate?.startsWith(currentMonth))
    .reduce((sum,entry) => sum + entry.amount,0)

  const ledgerExpenseMonth = data.ledgerEntries
    .filter(entry => entry.direction === 'expense' && entry.entryDate?.startsWith(currentMonth))
    .reduce((sum,entry) => sum + entry.amount,0)

  const ledgerIncomeYear = data.ledgerEntries
    .filter(entry => entry.direction === 'income' && entry.entryDate?.startsWith(yearPrefix))
    .reduce((sum,entry) => sum + entry.amount,0)

  const ledgerExpenseYear = data.ledgerEntries
    .filter(entry => entry.direction === 'expense' && entry.entryDate?.startsWith(yearPrefix))
    .reduce((sum,entry) => sum + entry.amount,0)

  const monthCashflow = ledgerIncomeMonth - ledgerExpenseMonth
  const yearCashflow = ledgerIncomeYear - ledgerExpenseYear

  const annualizedByClient = activeClients.map(client => ({
    label:client.name,
    value:activeRecurrences
      .filter(recurrence => recurrence.clientId === client.id)
      .reduce((sum,recurrence) => sum + recurrence.amount * (12 / Math.max(1,recurrence.intervalMonths)),0),
  })).filter(row=>row.value>0).sort((a,b)=>b.value-a.value)

  const topAnnualized = annualizedByClient[0]
  const concentration = annualRecurring && topAnnualized ? topAnnualized.value / annualRecurring * 100 : 0
  const maxAnnualizedClient = Math.max(1,...annualizedByClient.map(row=>row.value))

  const openByClient = activeClients.map(client => ({
    label:client.name,
    value:pending.filter(payment=>payment.clientId===client.id).reduce((sum,payment)=>sum+payment.amount,0),
    overdue:overduePayments.filter(payment=>payment.clientId===client.id).reduce((sum,payment)=>sum+payment.amount,0),
  })).filter(row=>row.value>0).sort((a,b)=>b.value-a.value).slice(0,8)
  const maxOpenClient = Math.max(1,...openByClient.map(row=>row.value))

  const monthDays = daysInMonth(year,now.getMonth())
  let cumulativePaid = 0
  let cumulativeExpense = 0
  const monthSeries = Array.from({length:monthDays},(_,index)=>{
    const day=index+1
    const key=`${currentMonth}-${String(day).padStart(2,'0')}`
    const paidDay=paid
      .filter(payment=>payment.paidAt?.slice(0,10)===key)
      .reduce((sum,payment)=>sum+payment.amount,0)
    const expenseDay=data.ledgerEntries
      .filter(entry=>entry.direction==='expense' && entry.entryDate===key)
      .reduce((sum,entry)=>sum+entry.amount,0)
    cumulativePaid += paidDay
    cumulativeExpense += expenseDay
    return {day,paidDay,expenseDay,cumulativePaid,cumulativeExpense,isFuture:day>now.getDate()}
  })

  const chartWidth=1000
  const chartHeight=360
  const chartLeft=50
  const chartRight=24
  const chartTop=24
  const chartBottom=48
  const plotW=chartWidth-chartLeft-chartRight
  const plotH=chartHeight-chartTop-chartBottom
  const maxMonthValue=Math.max(1,...monthSeries.map(row=>Math.max(row.cumulativePaid,row.cumulativeExpense)))
  const maxDailyPaid=Math.max(1,...monthSeries.map(row=>row.paidDay))
  const x=(day:number)=>chartLeft+(day-1)/Math.max(1,monthDays-1)*plotW
  const y=(value:number)=>chartTop+plotH-(value/maxMonthValue)*plotH
  const linePath=(key:'cumulativePaid'|'cumulativeExpense')=>monthSeries
    .filter(row=>!row.isFuture)
    .map((row,index)=>`${index===0?'M':'L'} ${x(row.day).toFixed(1)} ${y(row[key]).toFixed(1)}`)
    .join(' ')

  const paidLine=linePath('cumulativePaid')
  const expenseLine=linePath('cumulativeExpense')

  const yearMonths=Array.from({length:12},(_,index)=>{
    const key=`${year}-${String(index+1).padStart(2,'0')}`
    const paidValue=paid.filter(payment=>payment.paidAt?.startsWith(key)).reduce((sum,payment)=>sum+payment.amount,0)
    const expenseValue=data.ledgerEntries.filter(entry=>entry.direction==='expense' && entry.entryDate?.startsWith(key)).reduce((sum,entry)=>sum+entry.amount,0)
    return {label:MONTHS[index],paid:paidValue,expense:expenseValue,isFuture:index>now.getMonth()}
  })
  const maxYearMonth=Math.max(1,...yearMonths.map(row=>Math.max(row.paid,row.expense)))

  const overdueAgeBuckets=[
    {label:'0–7 giorni',value:overduePayments.filter(payment=>{
      const due=parseDate(payment.dueDate)
      return due ? (new Date(today+'T12:00:00').getTime()-due.getTime())/86400000 <= 7 : false
    }).reduce((sum,payment)=>sum+payment.amount,0)},
    {label:'8–30 giorni',value:overduePayments.filter(payment=>{
      const due=parseDate(payment.dueDate)
      if(!due) return false
      const age=(new Date(today+'T12:00:00').getTime()-due.getTime())/86400000
      return age>7 && age<=30
    }).reduce((sum,payment)=>sum+payment.amount,0)},
    {label:'Oltre 30 giorni',value:overduePayments.filter(payment=>{
      const due=parseDate(payment.dueDate)
      return due ? (new Date(today+'T12:00:00').getTime()-due.getTime())/86400000 > 30 : false
    }).reduce((sum,payment)=>sum+payment.amount,0)},
  ]
  const maxAging=Math.max(1,...overdueAgeBuckets.map(row=>row.value))

  const openTasks=data.tasks.filter(task=>task.status!=='done')
  const doneTasks=data.tasks.filter(task=>task.status==='done')
  const overdueTasks=openTasks.filter(task=>task.dueDate && task.dueDate<today)
  const dueSoonTasks=openTasks.filter(task=>task.dueDate && task.dueDate>=today && task.dueDate<=addDays(today,7))
  const completionRate=data.tasks.length ? doneTasks.length/data.tasks.length*100 : 0
  const nextDeadlines=openTasks.filter(task=>task.dueDate).sort((a,b)=>(a.dueDate??'').localeCompare(b.dueDate??'')).slice(0,5)

  return <div className="stats-page stats-page-v2 stats-money-first">
    <section className="stats-month-hero section-block stats-finance-hero">
      <div className="stats-month-head">
        <div>
          <p className="eyebrow">Andamento economico del mese</p>
          <h2>{MONTHS[now.getMonth()]} {year}</h2>
          <p>Incassi registrati nei pagamenti e uscite operative del ledger, giorno per giorno.</p>
        </div>
        <div className="stats-month-kpis">
          <div><span>Incassato mese</span><strong>{money(paidThisMonth)}</strong><small>pagamenti segnati come incassati</small></div>
          <div><span>Cashflow ledger</span><strong className={monthCashflow>=0?'money-positive':'money-negative'}>{money(monthCashflow)}</strong><small>{money(ledgerIncomeMonth)} entrate · {money(ledgerExpenseMonth)} uscite</small></div>
        </div>
      </div>

      <div className="stats-mega-chart-wrap">
        <svg className="stats-mega-chart" viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="Andamento economico del mese">
          {[0,.25,.5,.75,1].map((ratio,index)=><line
            key={index}
            x1={chartLeft}
            x2={chartWidth-chartRight}
            y1={chartTop+plotH*ratio}
            y2={chartTop+plotH*ratio}
            className="stats-chart-gridline"
          />)}

          {monthSeries.map(row=>{
            const barW=Math.max(5,plotW/monthDays*.34)
            const barH=row.isFuture ? 0 : row.paidDay/maxDailyPaid*(plotH*.28)
            return <rect
              key={row.day}
              className="stats-chart-bar stats-money-daily-bar"
              x={x(row.day)-barW/2}
              y={chartTop+plotH-barH}
              width={barW}
              height={barH}
              rx={barW/2}
              style={{animationDelay:`${row.day*18}ms`}}
            />
          })}

          {paidLine && <path d={paidLine} className="stats-chart-line completed" pathLength="1"/>}
          {expenseLine && <path d={expenseLine} className="stats-chart-line created expense-line" pathLength="1"/>}

          {monthSeries.filter(row=>[1,5,10,15,20,25,monthDays].includes(row.day)).map(row=><text
            key={row.day}
            x={x(row.day)}
            y={chartHeight-16}
            textAnchor="middle"
            className="stats-chart-axis-label"
          >{row.day}</text>)}
        </svg>

        <div className="stats-chart-legend">
          <span><i className="completed"/>Incassato cumulativo</span>
          <span><i className="created"/>Uscite cumulative ledger</span>
          <span><i className="daily"/>Incassi giornalieri</span>
        </div>
      </div>
    </section>

    <section className="stats-insight-strip stats-money-insights">
      <Insight icon={Repeat2} label="Ricorrente annualizzato" value={money(annualRecurring)} sub={activeRecurrences.length+' ricorrenze attive'}/>
      <Insight icon={Gauge} label="Mensile equivalente" value={money(monthlyRecurringEquivalent)} sub="ARR ricorrente ÷ 12"/>
      <Insight icon={WalletCards} label="Incassato anno" value={money(paidThisYear)} sub="pagamenti segnati come incassati"/>
      <Insight icon={Clock3} label="Da incassare" value={money(pendingTotal)} sub={pending.length+' pagamenti aperti'}/>
      <Insight icon={AlertTriangle} label="Scaduto" value={money(overdueTotal)} sub={overduePayments.length+' pagamenti scaduti'}/>
      <Insight icon={CalendarClock} label="In scadenza 30 gg" value={money(next30Total)} sub="pagamenti futuri già registrati"/>
    </section>

    <div className="stats-dashboard-grid stats-dashboard-grid-wide">
      <section className="section-block stats-card-large stats-arr-card">
        <div className="section-heading">
          <div><p className="eyebrow">Ricorrente</p><h2>Annualizzato per cliente</h2></div>
          <strong className="stats-total">{money(annualRecurring)}</strong>
        </div>
        <div className="stats-money-ranking">
          {annualizedByClient.map((row,index)=><div key={row.label}>
            <b>{String(index+1).padStart(2,'0')}</b>
            <div><strong>{row.label}</strong><small>{money(row.value/12)} / mese equivalente</small></div>
            <span><i style={{width:`${Math.max(5,row.value/maxAnnualizedClient*100)}%`}}/></span>
            <em>{money(row.value)}</em>
          </div>)}
          {!annualizedByClient.length && <div className="empty-inline">Nessuna ricorrenza attiva registrata.</div>}
        </div>
      </section>

      <section className="section-block stats-card-large stats-annualized-summary">
        <div className="section-heading">
          <div><p className="eyebrow">Run rate</p><h2>Struttura annualizzata</h2></div>
          <Landmark size={18} className="heading-icon"/>
        </div>
        <div className="stats-summary-grid">
          <div><span>ARR ricorrente</span><strong>{money(annualRecurring)}</strong></div>
          <div><span>Mensile equivalente</span><strong>{money(monthlyRecurringEquivalent)}</strong></div>
          <div><span>Media per ricorrenza</span><strong>{money(avgAnnualizedRecurrence)}</strong></div>
          <div><span>Top cliente sul ricorrente</span><strong>{pct(concentration)}</strong><small>{topAnnualized?.label ?? '—'}</small></div>
        </div>
      </section>
    </div>

    <section className="section-block stats-card-large stats-year-money-card">
      <div className="section-heading">
        <div><p className="eyebrow">Anno in corso</p><h2>Incassi e uscite mese per mese</h2></div>
        <span className="stats-side-note">{year}</span>
      </div>
      <div className="stats-year-money-chart">
        {yearMonths.map((row,index)=><div key={row.label} className={`stats-year-money-col ${row.isFuture?'future':''}`}>
          <div className="stats-year-money-bars">
            <span className="income" style={{height:`${row.paid ? Math.max(8,row.paid/maxYearMonth*100) : 3}%`,animationDelay:`${index*35}ms`}}/>
            <span className="expense" style={{height:`${row.expense ? Math.max(8,row.expense/maxYearMonth*100) : 3}%`,animationDelay:`${index*35+70}ms`}}/>
          </div>
          <small>{row.label}</small>
        </div>)}
      </div>
      <div className="stats-chart-legend">
        <span><i className="completed"/>Pagamenti incassati</span>
        <span><i className="created"/>Uscite ledger</span>
      </div>
    </section>

    <div className="stats-dashboard-grid">
      <section className="section-block stats-card-large">
        <div className="section-heading">
          <div><p className="eyebrow">Crediti</p><h2>Da incassare per cliente</h2></div>
          <strong className="stats-total">{money(pendingTotal)}</strong>
        </div>
        <div className="stats-open-money-list">
          {openByClient.map(row=><div key={row.label}>
            <div className="stats-bar-head"><strong>{row.label}</strong><span>{money(row.value)}{row.overdue ? ' · '+money(row.overdue)+' scaduti' : ''}</span></div>
            <div className="stats-track"><span style={{width:`${Math.max(4,row.value/maxOpenClient*100)}%`}}/></div>
          </div>)}
          {!openByClient.length && <div className="empty-inline">Nessun importo aperto.</div>}
        </div>
      </section>

      <section className="section-block stats-card-large">
        <div className="section-heading">
          <div><p className="eyebrow">Aging crediti</p><h2>Da quanto è scaduto</h2></div>
          <AlertTriangle size={18} className="heading-icon"/>
        </div>
        <div className="stats-aging-list">
          {overdueAgeBuckets.map(row=><div key={row.label}>
            <div><strong>{row.label}</strong><span>{money(row.value)}</span></div>
            <span><i style={{width:`${row.value ? Math.max(5,row.value/maxAging*100) : 0}%`}}/></span>
          </div>)}
        </div>
      </section>
    </div>

    <div className="stats-dashboard-grid">
      <section className="section-block stats-card-large stats-money-card">
        <div className="section-heading">
          <div><p className="eyebrow">Ledger</p><h2>Quadro finanziario</h2></div>
          <CircleDollarSign size={18} className="heading-icon"/>
        </div>
        <div className="stats-money-grid">
          <MoneyMetric icon={ArrowUpRight} label="Entrate mese" value={money(ledgerIncomeMonth)} positive/>
          <MoneyMetric icon={ArrowDownRight} label="Uscite mese" value={money(ledgerExpenseMonth)}/>
          <MoneyMetric icon={TrendingUp} label="Cashflow mese" value={money(monthCashflow)} positive={monthCashflow>=0}/>
          <MoneyMetric icon={Landmark} label="Cashflow anno" value={money(yearCashflow)} positive={yearCashflow>=0} sub={money(ledgerIncomeYear)+' entrate · '+money(ledgerExpenseYear)+' uscite'}/>
        </div>
      </section>

      <section className="section-block stats-card-large stats-task-compact">
        <div className="section-heading">
          <div><p className="eyebrow">Operatività</p><h2>Task, in breve</h2></div>
          <span className="stats-side-note">solo essenziale</span>
        </div>
        <div className="stats-summary-grid">
          <div><span>Aperte</span><strong>{openTasks.length}</strong></div>
          <div><span>Scadute</span><strong>{overdueTasks.length}</strong></div>
          <div><span>Entro 7 giorni</span><strong>{dueSoonTasks.length}</strong></div>
          <div><span>Completate</span><strong>{pct(completionRate)}</strong></div>
        </div>
      </section>
    </div>

    <section className="section-block stats-card-large">
      <div className="section-heading">
        <div><p className="eyebrow">Scadenze operative</p><h2>Prossime task</h2></div>
        <CalendarClock size={18} className="heading-icon"/>
      </div>
      <div className="stats-deadline-list">
        {nextDeadlines.map(task=>{
          const client=data.clients.find(client=>client.id===task.clientId)
          return <div key={task.id}>
            <span className={task.dueDate && task.dueDate<today?'deadline-dot late':'deadline-dot'}/>
            <div><strong>{task.title}</strong><small>{client?.name ?? '4Bit Studio'}</small></div>
            <b>{task.dueDate ? countdownLabel(task.dueDate) : '—'}</b>
          </div>
        })}
        {!nextDeadlines.length && <div className="empty-inline">Nessuna scadenza aperta.</div>}
      </div>
    </section>

    <section className="stats-metric-footer">
      <Metric icon={UsersRound} label="Clienti attivi" value={String(activeClients.length)} sub={activeRecurrences.length+' ricorrenze attive'}/>
      <Metric icon={Repeat2} label="ARR ricorrente" value={money(annualRecurring)} sub={money(monthlyRecurringEquivalent)+' / mese equivalente'}/>
      <Metric icon={WalletCards} label="Incassato anno" value={money(paidThisYear)} sub="pagamenti registrati"/>
      <Metric icon={Clock3} label="Portafoglio aperto" value={money(pendingTotal)} sub={money(overdueTotal)+' già scaduti'}/>
    </section>
  </div>
}

function Insight({icon:Icon,label,value,sub}:{icon:typeof Repeat2;label:string;value:string;sub:string}) {
  return <article className="stats-insight-card">
    <span className="stats-insight-icon"><Icon size={15}/></span>
    <small>{label}</small>
    <strong>{value}</strong>
    <p>{sub}</p>
  </article>
}

function Metric({icon:Icon,label,value,sub}:{icon:typeof UsersRound;label:string;value:string;sub:string}) {
  return <article className="stat-metric">
    <div className="stat-metric-icon"><Icon size={17}/></div>
    <span>{label}</span>
    <strong>{value}</strong>
    <small>{sub}</small>
  </article>
}

function MoneyMetric({icon:Icon,label,value,sub,positive}:{icon:typeof ArrowUpRight;label:string;value:string;sub?:string;positive?:boolean}) {
  return <div className={`stats-money-metric ${positive?'positive':''}`}>
    <span><Icon size={14}/></span>
    <small>{label}</small>
    <strong>{value}</strong>
    {sub && <p>{sub}</p>}
  </div>
}
