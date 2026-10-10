import { useEffect, useMemo, useState, type DragEvent, type PointerEvent } from 'react'
import { Archive, CalendarDays, ChevronDown, GripVertical, Paperclip, Plus } from 'lucide-react'
import { EditorialItemModal } from '../components/EditorialItemModal'
import {
  editorialAccountLabel,
  editorialPlatformLabel,
  editorialStatusLabel,
  statusLabelForItem,
} from '../lib/editorialConfig'
import { memberToneClass } from '../lib/memberTone'
import type { useEditorial } from '../hooks/useEditorial'
import type { EditorialAccount, EditorialData, EditorialItem, EditorialPlatform, EditorialStatus } from '../types/editorial'
import type { TeamMember } from '../types/studio'

type Actions=ReturnType<typeof useEditorial>['actions']
type View='calendar'|'archive'

const PLATFORM_ORDER: EditorialPlatform[]=['facebook','instagram','facebook_only','tiktok','youtube','whatsapp']
const STATUS_FILTERS: EditorialStatus[]=['to_produce','review','ready']

function dateKey(date:Date){
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}

function calendarDaysFromToday(todayKey:string,extraMonths:number){
  const [year,month,day]=todayKey.split('-').map(Number)
  const days:Date[]=[]
  const lastCurrent=new Date(year,month,0).getDate()

  for(let value=day;value<=lastCurrent;value++) days.push(new Date(year,month-1,value))

  for(let offset=1;offset<=extraMonths;offset++){
    const first=new Date(year,month-1+offset,1)
    const last=new Date(first.getFullYear(),first.getMonth()+1,0).getDate()
    for(let value=1;value<=last;value++) days.push(new Date(first.getFullYear(),first.getMonth(),value))
  }

  return days
}

function nextMonthLabel(todayKey:string,extraMonths:number){
  const [year,month]=todayKey.split('-').map(Number)
  const date=new Date(year,month-1+extraMonths+1,1)
  return date.toLocaleDateString('it-IT',{month:'long',year:'numeric'})
}

function shouldBeInArchive(item:EditorialItem,today:string){
  if(item.status==='archived') return true
  if(item.status!=='published') return false
  if(!item.publishDate) return true
  return item.publishDate<today
}

function statusTone(status:EditorialStatus){
  if(status==='published') return 'published'
  if(status==='ready') return 'ready'
  if(status==='review') return 'review'
  return 'produce'
}

const BRAND_PATHS = {
  instagram:'M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077',
  facebook:'M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z',
  tiktok:'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z',
  youtube:'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
  whatsapp:'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z',
} as const

function BrandIcon({brand}:{brand:keyof typeof BRAND_PATHS}) {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={BRAND_PATHS[brand]}/></svg>
}

function PlatformPreviewIcon({platform}:{platform:EditorialPlatform}) {
  if(platform==='facebook') return <span className="editorial-platform-logo platform-meta" title="Instagram + Facebook" aria-label="Instagram + Facebook">
    <span className="brand-instagram"><BrandIcon brand="instagram"/></span>
    <span className="brand-facebook"><BrandIcon brand="facebook"/></span>
  </span>
  if(platform==='instagram') return <span className="editorial-platform-logo platform-instagram" title="Solo Instagram" aria-label="Solo Instagram">
    <span className="brand-instagram"><BrandIcon brand="instagram"/></span>
  </span>
  if(platform==='facebook_only') return <span className="editorial-platform-logo platform-facebook-only" title="Solo Facebook" aria-label="Solo Facebook">
    <span className="brand-facebook"><BrandIcon brand="facebook"/></span>
  </span>
  return <span className={`editorial-platform-logo platform-${platform}`} title={editorialPlatformLabel[platform]} aria-label={editorialPlatformLabel[platform]}>
    <span className={`brand-${platform}`}><BrandIcon brand={platform}/></span>
  </span>
}

export function EditorialPage({
  data,
  members,
  actions,
  onCelebrate,
}:{
  data:EditorialData
  members:TeamMember[]
  actions:Actions
  onCelebrate:()=>void
}) {
  const [view,setView]=useState<View>('calendar')
  const [account,setAccount]=useState<'all'|EditorialAccount>('all')
  const [platform,setPlatform]=useState<'all'|EditorialPlatform>('all')
  const [status,setStatus]=useState<'all'|EditorialStatus>('all')
  const [search,setSearch]=useState('')
  const [editorOpen,setEditorOpen]=useState(false)
  const [editing,setEditing]=useState<EditorialItem|null>(null)
  const [newDate,setNewDate]=useState<string|null>(null)
  const [dragOverDate,setDragOverDate]=useState<string|null>(null)
  const [extraMonths,setExtraMonths]=useState(0)

  const [today,setToday]=useState(()=>dateKey(new Date()))
  const days=useMemo(()=>calendarDaysFromToday(today,extraMonths),[today,extraMonths])
  const nextMonth=useMemo(()=>nextMonthLabel(today,extraMonths),[today,extraMonths])

  useEffect(()=>{
    let timer:number | null=null
    const scheduleNextDay=()=>{
      const now=new Date()
      const next=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1,0,0,1,0)
      timer=window.setTimeout(()=>{
        setToday(dateKey(new Date()))
        scheduleNextDay()
      },Math.max(1000,next.getTime()-Date.now()))
    }
    scheduleNextDay()
    return ()=>{ if(timer!==null) window.clearTimeout(timer) }
  },[])

  const filtered=useMemo(()=>data.items.filter(item=>{
    const isArchive=shouldBeInArchive(item,today)
    if(view==='archive' ? !isArchive : isArchive) return false
    if(account!=='all' && item.account!==account) return false
    if(platform!=='all' && !item.platforms.includes(platform)) return false
    if(status!=='all' && item.status!==status) return false
    if(search.trim()){
      const q=search.trim().toLowerCase()
      const hay=[item.title,item.description,editorialAccountLabel[item.account],...item.platforms.map(value=>editorialPlatformLabel[value])].join(' ').toLowerCase()
      if(!hay.includes(q)) return false
    }
    return true
  }),[data.items,view,account,platform,status,search,today])

  const byDate=useMemo(()=>{
    const map=new Map<string,EditorialItem[]>()
    for(const item of filtered){
      if(!item.publishDate || item.publishDate<today) continue
      const group=map.get(item.publishDate) ?? []
      group.push(item)
      map.set(item.publishDate,group)
    }
    for(const [key,items] of map){
      map.set(key,[...items].sort((a,b)=>(a.publishTime ?? '18:00').localeCompare(b.publishTime ?? '18:00') || a.sortOrder-b.sortOrder))
    }
    return map
  },[filtered,today])

  const archiveItems=useMemo(()=>[...filtered].sort((a,b)=>(b.publishedAt ?? b.archivedAt ?? b.updatedAt).localeCompare(a.publishedAt ?? a.archivedAt ?? a.updatedAt)),[filtered])
  const visibleCount=view==='calendar'
    ? filtered.filter(item=>item.publishDate && item.publishDate>=today).length
    : archiveItems.length

  function openCreate(date:string|null){
    setEditing(null)
    setNewDate(date ?? today)
    setEditorOpen(true)
  }

  function openEdit(item:EditorialItem){
    setEditing(item)
    setNewDate(item.publishDate)
    setEditorOpen(true)
  }

  async function moveEditorialItem(itemId:string,publishDate:string){
    setDragOverDate(null)
    const item=data.items.find(candidate=>candidate.id===itemId)
    if(!item || item.publishDate===publishDate) return
    await actions.updateItem(itemId,{publishDate,sortOrder:Date.now()})
  }

  function changeView(next:View){
    setView(next)
    setStatus('all')
    setSearch('')
  }

  function changeAccount(next:'all'|EditorialAccount){
    setAccount(next)
    if(next==='autoscuola_susa' && platform==='whatsapp') setPlatform('all')
  }

  return <>
    <section className="todo-planner-page editorial-task-page">
      <div className="todo-planner-head editorial-planner-head">
        <div><h2>Editoriale</h2></div>
        <button className="primary-button todo-new-task" onClick={()=>openCreate(today)}><Plus size={16}/> Nuovo contenuto</button>
      </div>

      <div className="todo-toolbar editorial-task-toolbar">
        <div className="task-filter-with-count editorial-account-filter-wrap">
          <div className="segmented task-filter editorial-account-switch">
            <button onClick={()=>changeAccount('all')} className={account==='all'?'active':''}>Tutti</button>
            <button onClick={()=>changeAccount('casaro')} className={account==='casaro'?'active':''}>Casaro</button>
            <button onClick={()=>changeAccount('autoscuola_susa')} className={account==='autoscuola_susa'?'active':''}>Autoscuola Susa</button>
          </div>
          <span className="task-filter-counter"><strong>{visibleCount}</strong> contenuti</span>
        </div>

        <label className="todo-filter-select">
          <span>Canale</span>
          <select value={platform} onChange={e=>setPlatform(e.target.value as 'all'|EditorialPlatform)}>
            <option value="all">Tutti i canali</option>
            {PLATFORM_ORDER.filter(value=>value!=='whatsapp' || account!=='autoscuola_susa').map(value=><option key={value} value={value}>{editorialPlatformLabel[value]}</option>)}
          </select>
        </label>

        {view==='calendar' && <label className="todo-filter-select">
          <span>Stato</span>
          <select value={status} onChange={e=>setStatus(e.target.value as 'all'|EditorialStatus)}>
            <option value="all">Tutti gli stati</option>
            {STATUS_FILTERS.map(value=><option key={value} value={value}>{editorialStatusLabel[value]}</option>)}
          </select>
        </label>}

        <button
          className={`editorial-view-toggle ${view==='archive'?'active':''}`}
          onClick={()=>changeView(view==='archive'?'calendar':'archive')}
        >
          {view==='archive'?<CalendarDays size={14}/>:<Archive size={14}/>}
          <span>{view==='archive'?'Calendario':'Archivio'}</span>
        </button>

        {view==='archive' && <label className="todo-filter-select editorial-archive-search">
          <span>Cerca</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Titolo o descrizione"/>
        </label>}
      </div>

      {view==='calendar' ? <div className="todo-calendar-panel editorial-calendar-tasklike">
        {days.map(date=>{
          const key=dateKey(date)
          const items=byDate.get(key) ?? []
          const isToday=key===today
          return <section
            key={key}
            data-editorial-day={key}
            className={`todo-day-row editorial-day-tasklike ${isToday?'is-today':''} ${items.length?'':'is-empty'} ${dragOverDate===key?'is-drag-over':''}`}
            onDragOver={event=>{
              if(event.dataTransfer.types.includes('text/4bit-editorial')){
                event.preventDefault()
                event.dataTransfer.dropEffect='move'
                setDragOverDate(key)
              }
            }}
            onDragLeave={event=>{
              if(!event.currentTarget.contains(event.relatedTarget as Node)) setDragOverDate(null)
            }}
            onDrop={event=>{
              event.preventDefault()
              const itemId=event.dataTransfer.getData('text/4bit-editorial')
              if(itemId) void moveEditorialItem(itemId,key)
            }}
          >
            <div className="todo-day-date">
              <div className={`todo-day-number ${isToday?'today':''}`}>{date.getDate()}</div>
              <p>{date.toLocaleDateString('it-IT',{month:'short'}).replace('.','')}</p>
              <span>{date.toLocaleDateString('it-IT',{weekday:'long'})}</span>
              {isToday && <b>Oggi</b>}
            </div>

            <div className="todo-day-body">
              <div className="todo-task-stack">
                {items.map(item=><EditorialCard
                  key={item.id}
                  item={item}
                  data={data}
                  members={members}
                  onClick={()=>openEdit(item)}
                  onDragStart={event=>{
                    event.dataTransfer.setData('text/4bit-editorial',item.id)
                    event.dataTransfer.effectAllowed='move'
                  }}
                  onDragEnd={()=>setDragOverDate(null)}
                  onMove={moveEditorialItem}
                  onDragHover={setDragOverDate}
                />)}
              </div>
              <button className="todo-add-row" onClick={()=>openCreate(key)}><Plus size={15}/><span>{items.length?'Aggiungi contenuto':'Nuovo contenuto'}</span></button>
            </div>
          </section>
        })}
        <div className="editorial-load-more-wrap">
          <button
            type="button"
            className="editorial-load-more-month"
            onClick={()=>setExtraMonths(current=>current+1)}
          >
            <ChevronDown size={16}/>
            <span>Mostra {nextMonth}</span>
          </button>
        </div>
      </div> : <section className="todo-completed-panel editorial-archive-tasklike">
        <div className="todo-completed-head">
          <h3>Archivio</h3>
          <span>{archiveItems.length}</span>
        </div>
        <div className="todo-completed-list">
          {archiveItems.map(item=><EditorialArchiveRow key={item.id} item={item} data={data} onClick={()=>openEdit(item)}/>)}
          {!archiveItems.length && <div className="empty-page-mini">Nessun contenuto pubblicato con questi filtri.</div>}
        </div>
      </section>}
    </section>

    <EditorialItemModal
      open={editorOpen}
      item={editing}
      initialDate={newDate}
      data={data}
      members={members}
      actions={actions}
      onCelebrate={onCelebrate}
      onClose={()=>setEditorOpen(false)}
    />
  </>
}

function EditorialCard({
  item,
  data,
  members,
  onClick,
  onDragStart,
  onDragEnd,
  onMove,
  onDragHover,
}:{
  item:EditorialItem
  data:EditorialData
  members:TeamMember[]
  onClick:()=>void
  onDragStart:(event:DragEvent<HTMLSpanElement>)=>void
  onDragEnd:()=>void
  onMove:(itemId:string,publishDate:string)=>Promise<void>
  onDragHover:(publishDate:string|null)=>void
}) {
  const steps=data.steps.filter(step=>step.editorialItemId===item.id).sort((a,b)=>a.sortOrder-b.sortOrder)
  const assets=data.assets.filter(asset=>asset.editorialItemId===item.id)
  const pendingPeople=[...new Set(
    steps
      .filter(step=>!step.done)
      .map(step=>members.find(member=>member.id===step.ownerMemberId)?.name)
      .filter((name): name is string=>Boolean(name))
  )]

  return <article className={`todo-task-card editorial-todo-card account-${item.account} ${item.status==='published'?'is-published':''}`}>
    <span
      className="editorial-drag-handle"
      draggable
      title="Trascina per cambiare giorno"
      aria-label="Trascina per cambiare giorno"
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onPointerDown={(event:PointerEvent<HTMLSpanElement>)=>{
        if(event.pointerType==='mouse') return
        event.currentTarget.setPointerCapture(event.pointerId)
        document.body.classList.add('editorial-touch-dragging')
      }}
      onPointerMove={(event:PointerEvent<HTMLSpanElement>)=>{
        if(event.pointerType==='mouse' || !event.currentTarget.hasPointerCapture(event.pointerId)) return
        const target=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-editorial-day]') as HTMLElement | null
        onDragHover(target?.dataset.editorialDay ?? null)
      }}
      onPointerUp={(event:PointerEvent<HTMLSpanElement>)=>{
        if(event.pointerType==='mouse') return
        const target=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-editorial-day]') as HTMLElement | null
        const date=target?.dataset.editorialDay
        if(date) void onMove(item.id,date)
        onDragHover(null)
        document.body.classList.remove('editorial-touch-dragging')
        if(event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
      }}
      onPointerCancel={(event:PointerEvent<HTMLSpanElement>)=>{
        onDragHover(null)
        document.body.classList.remove('editorial-touch-dragging')
        if(event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
      }}
    ><GripVertical size={14}/></span>
    <button className="todo-task-content editorial-todo-content" onClick={onClick}>
      <div className="todo-task-topline">
        <h3>{item.title}</h3>
        <span className={`editorial-account-chip account-${item.account}`}>{editorialAccountLabel[item.account]}</span>
      </div>

      <div className="todo-task-meta editorial-todo-meta">
        {item.platforms.map(value=><PlatformPreviewIcon key={value} platform={value}/>)}
        <span className={`editorial-status-chip ${statusTone(item.status)}`}>{statusLabelForItem(item.status,item.platforms)}</span>
        <span className={`editorial-media-chip ${item.mediaKind}`}>{item.mediaKind==='video'?'Video':'Foto'}</span>
        <span className="editorial-inline-meta"><Paperclip size={11}/>{assets.length}</span>
      </div>


      {pendingPeople.length>0 && <div className="editorial-team-progress">
        {pendingPeople.map(name=><span key={name} className={`editorial-team-progress-chip ${memberToneClass(name)} pending`}>
          <i>•</i>{name}
        </span>)}
      </div>}
    </button>
  </article>
}

function EditorialArchiveRow({item,data,onClick}:{item:EditorialItem;data:EditorialData;onClick:()=>void}) {
  const assets=data.assets.filter(asset=>asset.editorialItemId===item.id)
  return <article className={`todo-task-card completed-task-card editorial-todo-card editorial-archive-card account-${item.account} is-published`}>
    <button className="todo-task-content editorial-todo-content" onClick={onClick}>
      <div className="todo-task-topline">
        <h3>{item.title}</h3>
        <span className={`editorial-account-chip account-${item.account}`}>{editorialAccountLabel[item.account]}</span>
      </div>
      <div className="todo-task-meta editorial-todo-meta">
        {item.platforms.map(value=><PlatformPreviewIcon key={value} platform={value}/>)}
        <span className="editorial-status-chip published">Pubblicato</span>
        <span className={`editorial-media-chip ${item.mediaKind}`}>{item.mediaKind==='video'?'Video':'Foto'}</span>
        <span className="editorial-inline-meta"><Paperclip size={11}/>{assets.length}</span>
      </div>
    </button>
  </article>
}
