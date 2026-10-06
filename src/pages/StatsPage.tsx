import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Flame,
  Gauge,
  Repeat2,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  UsersRound,
  Zap,
} from 'lucide-react'
import { countdownLabel, money, todayISO } from '../lib/date'
import { memberToneClass } from '../lib/memberTone'
import type { StudioData, Task } from '../types/studio'

const MONTHS = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic']
const WEEKDAYS = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab']

function pct(value: number) {
  return Math.round(value) + '%'
}

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

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function addDays(value: string, days: number) {
  const date = new Date(value + 'T12:00:00')
  date.setDate(date.getDate() + days)
  return dateKey(date)
}

function diffDays(from: string, to: string) {
  const a = parseDate(from)
  const b = parseDate(to)
  if (!a || !b) return 0
  return Math.max(0, (b.getTime() - a.getTime()) / 86400000)
}

function monthLabel(date: Date) {
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

function trendCopy(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 'nuovo ritmo' : 'nessun dato'
  const delta = Math.round((current - previous) / previous * 100)
  return `${delta >= 0 ? '+' : ''}${delta}% vs mese scorso`
}

export function StatsPage({ data }: { data: StudioData }) {
  const today = todayISO()
  const now = new Date()
  const currentMonth = monthKey(now)
  const previousDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const previousMonth = monthKey(previousDate)

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
  const annualRecurring = data.recurrences.filter(r => r.active).reduce((sum,r) => sum + r.amount * (12 / r.intervalMonths), 0)
  const leads = data.clients.filter(c => c.status === 'lead')

  const completedThisMonth = doneTasks.filter(task => task.completedAt?.startsWith(currentMonth))
  const completedPreviousMonth = doneTasks.filter(task => task.completedAt?.startsWith(previousMonth))
  const createdThisMonth = data.tasks.filter(task => task.createdAt.startsWith(currentMonth))
  const createdPreviousMonth = data.tasks.filter(task => task.createdAt.startsWith(previousMonth))

  const avgCloseDays = completedThisMonth.length
    ? completedThisMonth.reduce((sum,task) => sum + diffDays(task.createdAt, task.completedAt ?? task.createdAt),0) / completedThisMonth.length
    : 0

  const onTimeCompleted = doneTasks.filter(task => task.completedAt && task.dueDate)
  const onTimeCount = onTimeCompleted.filter(task => (task.completedAt ?? '').slice(0,10) <= (task.dueDate ?? '')).length
  const onTimeRate = onTimeCompleted.length ? onTimeCount / onTimeCompleted.length * 100 : 0

  const monthDays = daysInMonth(now.getFullYear(), now.getMonth())
  let cumulativeCompleted = 0
  let cumulativeCreated = 0
  const monthSeries = Array.from({length:monthDays},(_,index)=>{
    const day=index+1
    const key=`${currentMonth}-${String(day).padStart(2,'0')}`
    const completed=completedThisMonth.filter(task=>task.completedAt?.slice(0,10)===key).length
    const created=createdThisMonth.filter(task=>task.createdAt.slice(0,10)===key).length
    cumulativeCompleted += completed
    cumulativeCreated += created
    return {day,completed,created,cumulativeCompleted,cumulativeCreated,isFuture:day>now.getDate()}
  })

  const maxDaily=Math.max(1,...monthSeries.map(row=>Math.max(row.completed,row.created)))
  const maxCumulative=Math.max(1,...monthSeries.map(row=>Math.max(row.cumulativeCompleted,row.cumulativeCreated)))
  const chartWidth=1000
  const chartHeight=360
  const chartLeft=44
  const chartRight=24
  const chartTop=26
  const chartBottom=48
  const plotW=chartWidth-chartLeft-chartRight
  const plotH=chartHeight-chartTop-chartBottom
  const x=(day:number)=>chartLeft+(day-1)/Math.max(1,monthDays-1)*plotW
  const yCum=(value:number)=>chartTop+plotH-(value/maxCumulative)*plotH
  const linePath=(key:'cumulativeCompleted'|'cumulativeCreated')=>monthSeries
    .filter(row=>!row.isFuture)
    .map((row,index)=>`${index===0?'M':'L'} ${x(row.day).toFixed(1)} ${yCum(row[key]).toFixed(1)}`)
    .join(' ')

  const completedLine=linePath('cumulativeCompleted')
  const createdLine=linePath('cumulativeCreated')

  const weekdayCounts=Array.from({length:7},(_,weekday)=>({
    label:WEEKDAYS[weekday],
    value:doneTasks.filter(task=>{
      const date=parseDate(task.completedAt)
      return date?.getDay()===weekday
    }).length,
  }))
  const maxWeekday=Math.max(1,...weekdayCounts.map(x=>x.value))
  const bestWeekday=[...weekdayCounts].sort((a,b)=>b.value-a.value)[0]

  const teamOutput=data.members.filter(member=>member.active).map(member=>({
    label:member.name,
    completed:completedThisMonth.filter(task=>task.assigneeId===member.id).length,
    open:openTasks.filter(task=>task.assigneeId===member.id).length,
    tone:memberToneClass(member.name),
  })).sort((a,b)=>b.completed-a.completed || b.open-a.open)
  const maxTeam=Math.max(1,...teamOutput.map(x=>Math.max(x.completed,x.open)))

  const clientActivity=activeClients.map(client=>({
    label:client.name,
    completed:completedThisMonth.filter(task=>task.clientId===client.id).length,
    open:openTasks.filter(task=>task.clientId===client.id).length,
  })).filter(row=>row.completed+row.open>0).sort((a,b)=>(b.completed+b.open)-(a.completed+a.open)).slice(0,8)
  const busiestClient=clientActivity[0]

  const next14=Array.from({length:14},(_,index)=>{
    const date=addDays(today,index)
    return {
      date,
      label:index===0?'Oggi':String(parseDate(date)?.getDate() ?? ''),
      value:openTasks.filter(task=>task.dueDate===date).length,
    }
  })
  const maxPressure=Math.max(1,...next14.map(x=>x.value))

  const serviceMap=new Map<string,number>()
  activeClients.forEach(client=>client.services.forEach(service=>serviceMap.set(service,(serviceMap.get(service)??0)+1)))
  const serviceRows=[...serviceMap.entries()].map(([label,value])=>({label,value})).sort((a,b)=>b.value-a.value).slice(0,7)
  const maxService=Math.max(1,...serviceRows.map(x=>x.value))

  const taskByState=[
    {label:'Da fare',value:data.tasks.filter(t=>t.status==='todo').length},
    {label:'In corso',value:data.tasks.filter(t=>t.status==='doing').length},
    {label:'Completate',value:doneTasks.length},
  ]
  const totalTaskState=Math.max(1,taskByState.reduce((sum,row)=>sum+row.value,0))
  const doneAngle=doneTasks.length/totalTaskState*360
  const doingAngle=(doneTasks.length+data.tasks.filter(t=>t.status==='doing').length)/totalTaskState*360

  const paidThisMonth=paid.filter(payment=>payment.paidAt?.startsWith(currentMonth)).reduce((sum,p)=>sum+p.amount,0)
  const ledgerIncomeThisMonth=data.ledgerEntries.filter(entry=>entry.direction==='income' && entry.entryDate?.startsWith(currentMonth)).reduce((sum,x)=>sum+x.amount,0)
  const ledgerExpenseThisMonth=data.ledgerEntries.filter(entry=>entry.direction==='expense' && entry.entryDate?.startsWith(currentMonth)).reduce((sum,x)=>sum+x.amount,0)

  const topCompletedDay=monthSeries.filter(row=>!row.isFuture).sort((a,b)=>b.completed-a.completed)[0]
  const activeWorkDays=new Set(completedThisMonth.map(task=>task.completedAt?.slice(0,10)).filter(Boolean)).size
  const closePerActiveDay=activeWorkDays ? completedThisMonth.length/activeWorkDays : 0

  const nextDeadlines=openTasks.filter(t=>t.dueDate).sort((a,b)=>(a.dueDate??'').localeCompare(b.dueDate??'')).slice(0,6)

  return <div className="stats-page stats-page-v2">
    <section className="stats-month-hero section-block">
      <div className="stats-month-head">
        <div>
          <p className="eyebrow">Andamento del mese</p>
          <h2>{monthLabel(now)}</h2>
          <p>Attività create e completate giorno per giorno. Il grafico cresce con il lavoro reale del team.</p>
        </div>
        <div className="stats-month-kpis">
          <div><span>Completate</span><strong>{completedThisMonth.length}</strong><small>{trendCopy(completedThisMonth.length,completedPreviousMonth.length)}</small></div>
          <div><span>Create</span><strong>{createdThisMonth.length}</strong><small>{trendCopy(createdThisMonth.length,createdPreviousMonth.length)}</small></div>
        </div>
      </div>

      <div className="stats-mega-chart-wrap">
        <svg className="stats-mega-chart" viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="Andamento attività del mese">
          <defs>
            <linearGradient id="statsAreaOrange" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(242,86,35,.22)"/>
              <stop offset="100%" stopColor="rgba(242,86,35,0)"/>
            </linearGradient>
            <linearGradient id="statsAreaDark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(5,5,5,.12)"/>
              <stop offset="100%" stopColor="rgba(5,5,5,0)"/>
            </linearGradient>
          </defs>

          {[0,.25,.5,.75,1].map((ratio,index)=><line
            key={index}
            x1={chartLeft}
            x2={chartWidth-chartRight}
            y1={chartTop+plotH*ratio}
            y2={chartTop+plotH*ratio}
            className="stats-chart-gridline"
          />)}

          {monthSeries.map(row=>{
            const barW=Math.max(5,plotW/monthDays*.36)
            const barH=row.isFuture ? 0 : row.completed/maxDaily*(plotH*.28)
            return <rect
              key={row.day}
              className="stats-chart-bar"
              x={x(row.day)-barW/2}
              y={chartTop+plotH-barH}
              width={barW}
              height={barH}
              rx={barW/2}
              style={{animationDelay:`${row.day*18}ms`}}
            />
          })}

          {completedLine && <path d={completedLine} className="stats-chart-line completed" pathLength="1"/>}
          {createdLine && <path d={createdLine} className="stats-chart-line created" pathLength="1"/>}

          {monthSeries.filter(row=>!row.isFuture && row.day===now.getDate()).map(row=><g key="today">
            <circle cx={x(row.day)} cy={yCum(row.cumulativeCompleted)} r="7" className="stats-chart-today-ring"/>
            <circle cx={x(row.day)} cy={yCum(row.cumulativeCompleted)} r="3.5" className="stats-chart-today-dot"/>
          </g>)}

          {monthSeries.filter(row=>[1,5,10,15,20,25,monthDays].includes(row.day)).map(row=><text
            key={row.day}
            x={x(row.day)}
            y={chartHeight-16}
            textAnchor="middle"
            className="stats-chart-axis-label"
          >{row.day}</text>)}
        </svg>

        <div className="stats-chart-legend">
          <span><i className="completed"/>Completate cumulative</span>
          <span><i className="created"/>Create cumulative</span>
          <span><i className="daily"/>Completate al giorno</span>
        </div>
      </div>
    </section>

    <section className="stats-insight-strip">
      <Insight icon={Zap} label="Velocità media" value={avgCloseDays ? avgCloseDays.toFixed(1)+' gg' : '—'} sub="dalla creazione alla chiusura"/>
      <Insight icon={Target} label="Puntualità" value={pct(onTimeRate)} sub="task chiuse entro scadenza"/>
      <Insight icon={Flame} label="Giorno più produttivo" value={topCompletedDay?.completed ? String(topCompletedDay.day)+' '+MONTHS[now.getMonth()] : '—'} sub={topCompletedDay?.completed ? topCompletedDay.completed+' task chiuse' : 'nessuna chiusura'}/>
      <Insight icon={Trophy} label="Giorno della settimana" value={bestWeekday?.value ? bestWeekday.label : '—'} sub={bestWeekday?.value ? bestWeekday.value+' chiusure storiche' : 'nessun dato'}/>
      <Insight icon={Gauge} label="Ritmo attivo" value={closePerActiveDay ? closePerActiveDay.toFixed(1) : '0'} sub="task chiuse / giorno operativo"/>
      <Insight icon={Sparkles} label="Cliente più attivo" value={busiestClient?.label ?? '—'} sub={busiestClient ? (busiestClient.completed+busiestClient.open)+' task coinvolte' : 'nessun dato'}/>
    </section>

    <div className="stats-dashboard-grid">
      <section className="section-block stats-card-large stats-team-card">
        <div className="section-heading">
          <div><p className="eyebrow">Performance</p><h2>Output del team</h2></div>
          <span className="stats-side-note">mese corrente</span>
        </div>
        <div className="stats-team-bars">
          {teamOutput.map(row=><div key={row.label} className={`stats-team-row ${row.tone}`}>
            <div className="stats-team-row-head"><strong>{row.label}</strong><span>{row.completed} chiuse · {row.open} aperte</span></div>
            <div className="stats-team-track">
              <span className="done" style={{width:`${Math.max(3,row.completed/maxTeam*100)}%`}}/>
              <span className="open" style={{width:`${Math.max(3,row.open/maxTeam*100)}%`}}/>
            </div>
          </div>)}
          {!teamOutput.length && <div className="empty-inline">Nessun dato team.</div>}
        </div>
      </section>

      <section className="section-block stats-card-large">
        <div className="section-heading">
          <div><p className="eyebrow">Pressione</p><h2>Prossimi 14 giorni</h2></div>
          <span className="stats-side-note">{dueSoonTasks.length} entro 7 giorni</span>
        </div>
        <div className="stats-pressure-chart">
          {next14.map((row,index)=><div key={row.date} className="stats-pressure-column">
            <div className="stats-pressure-bar-wrap">
              <span className={row.value>=3?'hot':''} style={{height:`${row.value ? Math.max(10,row.value/maxPressure*100) : 4}%`,animationDelay:`${index*35}ms`}}/>
            </div>
            <b>{row.value || ''}</b>
            <small>{row.label}</small>
          </div>)}
        </div>
      </section>

      <section className="section-block stats-card-large">
        <div className="section-heading">
          <div><p className="eyebrow">Comportamento</p><h2>Quando chiudiamo di più</h2></div>
          <Activity size={18} className="heading-icon"/>
        </div>
        <div className="stats-weekdays">
          {weekdayCounts.map((row,index)=><div key={row.label}>
            <div><span style={{height:`${Math.max(5,row.value/maxWeekday*100)}%`,animationDelay:`${index*50}ms`}}/></div>
            <strong>{row.value}</strong>
            <small>{row.label}</small>
          </div>)}
        </div>
      </section>

      <section className="section-block stats-card-large">
        <div className="section-heading">
          <div><p className="eyebrow">Task</p><h2>Stato complessivo</h2></div>
          <span className="stats-side-note">{data.tasks.length} totali</span>
        </div>
        <div className="stats-donut-layout">
          <div className="stats-donut" style={{background:`conic-gradient(#238A58 0deg ${doneAngle}deg,#F25623 ${doneAngle}deg ${doingAngle}deg,rgba(5,5,5,.08) ${doingAngle}deg 360deg)`}}>
            <div><strong>{pct(data.tasks.length ? doneTasks.length/data.tasks.length*100 : 0)}</strong><span>completate</span></div>
          </div>
          <div className="stats-donut-legend">
            {taskByState.map(row=><div key={row.label}><i className={row.label==='Completate'?'green':row.label==='In corso'?'orange':'gray'}/><span>{row.label}</span><strong>{row.value}</strong></div>)}
          </div>
        </div>
      </section>
    </div>

    <div className="stats-dashboard-grid stats-dashboard-grid-wide">
      <section className="section-block stats-card-large">
        <div className="section-heading">
          <div><p className="eyebrow">Clienti</p><h2>Attività per cliente</h2></div>
          <span className="stats-side-note">Top 8</span>
        </div>
        <div className="stats-client-ranking">
          {clientActivity.map((row,index)=>{
            const total=row.completed+row.open
            const max=Math.max(1,...clientActivity.map(x=>x.completed+x.open))
            return <div key={row.label}>
              <b>{String(index+1).padStart(2,'0')}</b>
              <div><strong>{row.label}</strong><small>{row.completed} chiuse · {row.open} aperte</small></div>
              <span><i style={{width:`${Math.max(5,total/max*100)}%`}}/></span>
              <em>{total}</em>
            </div>
          })}
          {!clientActivity.length && <div className="empty-inline">Nessuna attività cliente.</div>}
        </div>
      </section>

      <section className="section-block stats-card-large">
        <div className="section-heading">
          <div><p className="eyebrow">Mix</p><h2>Servizi più presenti</h2></div>
          <span className="stats-side-note">{serviceRows.length} categorie</span>
        </div>
        <div className="stats-service-cloud">
          {serviceRows.map((row,index)=><div key={row.label} style={{'--service-size':String(.78+row.value/maxService*.72),'--delay':`${index*45}ms`} as React.CSSProperties}>
            <strong>{row.value}</strong><span>{row.label}</span>
          </div>)}
          {!serviceRows.length && <div className="empty-inline">Nessun servizio registrato.</div>}
        </div>
      </section>
    </div>

    <div className="stats-dashboard-grid">
      <section className="section-block stats-card-large stats-money-card">
        <div className="section-heading">
          <div><p className="eyebrow">Economia</p><h2>Movimento del mese</h2></div>
          <CircleDollarSign size={18} className="heading-icon"/>
        </div>
        <div className="stats-money-grid">
          <MoneyMetric icon={ArrowUpRight} label="Pagamenti incassati" value={money(paidThisMonth)} positive/>
          <MoneyMetric icon={TrendingUp} label="Entrate ledger" value={money(ledgerIncomeThisMonth)} positive/>
          <MoneyMetric icon={ArrowDownRight} label="Uscite ledger" value={money(ledgerExpenseThisMonth)}/>
          <MoneyMetric icon={Clock3} label="Da incassare" value={money(pendingTotal)} sub={pending.length+' aperti'}/>
        </div>
      </section>

      <section className="section-block stats-card-large">
        <div className="section-heading">
          <div><p className="eyebrow">Scadenze</p><h2>Prossime task</h2></div>
          <CalendarClock size={18} className="heading-icon"/>
        </div>
        <div className="stats-deadline-list">
          {nextDeadlines.map(task=>{
            const client=data.clients.find(c=>c.id===task.clientId)
            return <div key={task.id}>
              <span className={task.dueDate && task.dueDate<today?'deadline-dot late':'deadline-dot'}/>
              <div><strong>{task.title}</strong><small>{client?.name ?? '4Bit Studio'}</small></div>
              <b>{task.dueDate ? countdownLabel(task.dueDate) : '—'}</b>
            </div>
          })}
          {!nextDeadlines.length && <div className="empty-inline">Nessuna scadenza aperta.</div>}
        </div>
      </section>
    </div>

    <section className="stats-metric-footer">
      <Metric icon={UsersRound} label="Clienti attivi" value={String(activeClients.length)} sub={leads.length+' lead'}/>
      <Metric icon={Clock3} label="Task aperte" value={String(openTasks.length)} sub={overdueTasks.length+' scadute'}/>
      <Metric icon={AlertTriangle} label="Scaduto da incassare" value={money(overdueTotal)} sub={overduePayments.length+' pagamenti'}/>
      <Metric icon={Repeat2} label="Ricorrente annualizzato" value={money(annualRecurring)} sub={data.recurrences.filter(r=>r.active).length+' ricorrenze'}/>
    </section>
  </div>
}

function Insight({icon:Icon,label,value,sub}:{icon:typeof Zap;label:string;value:string;sub:string}) {
  return <article className="stats-insight-card">
    <span className="stats-insight-icon"><Icon size={15}/></span>
    <small>{label}</small>
    <strong>{value}</strong>
    <p>{sub}</p>
  </article>
}

function Metric({ icon: Icon, label, value, sub }: { icon: typeof UsersRound; label: string; value: string; sub: string }) {
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
