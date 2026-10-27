import { useEffect, useMemo, useRef, useState, type DragEvent, type PointerEvent } from 'react'
import { Archive, CalendarDays, ChevronDown, GripVertical, Plus } from 'lucide-react'
import { EditorialItemModal } from '../components/EditorialItemModal'
import { EditorialAccountLogo, PlatformPreviewIcon } from '../components/EditorialBrandIcons'
import {
  editorialAccountLabel,
  editorialPlatformLabel,
  editorialStatusLabel,
  statusLabelForItem,
} from '../lib/editorialConfig'
import { memberToneClass } from '../lib/memberTone'
import type { useEditorial } from '../hooks/useEditorial'
import type { EditorialAccount, EditorialData, EditorialItem, EditorialPlatform, EditorialStatus } from '../types/editorial'
import type { Client, TeamMember } from '../types/studio'

type Actions=ReturnType<typeof useEditorial>['actions']
type View='calendar'|'archive'

const PLATFORM_ORDER: EditorialPlatform[]=['facebook','instagram','facebook_only','tiktok','youtube','whatsapp']
const STATUS_FILTERS: EditorialStatus[]=['to_produce','review','ready']
const EDITORIAL_EDITOR_SESSION_KEY='4bit-editorial-editor-session-v1'

type EditorialEditorSession = {
  mode:'create'|'edit'
  itemId?:string
  date:string|null
}

function readEditorialEditorSession():EditorialEditorSession|null {
  try {
    const raw=sessionStorage.getItem(EDITORIAL_EDITOR_SESSION_KEY)
    if(!raw) return null
    const parsed=JSON.parse(raw) as Partial<EditorialEditorSession>
    if(parsed.mode!=='create' && parsed.mode!=='edit') return null
    return {
      mode:parsed.mode,
      itemId:typeof parsed.itemId==='string' ? parsed.itemId : undefined,
      date:typeof parsed.date==='string' ? parsed.date : null,
    }
  } catch {
    return null
  }
}

function writeEditorialEditorSession(session:EditorialEditorSession) {
  try { sessionStorage.setItem(EDITORIAL_EDITOR_SESSION_KEY,JSON.stringify(session)) } catch {}
}

function clearEditorialEditorSession() {
  try { sessionStorage.removeItem(EDITORIAL_EDITOR_SESSION_KEY) } catch {}
}

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

export function EditorialPage({
  data,
  members,
  clients,
  actions,
  onCelebrate,
}:{
  data:EditorialData
  members:TeamMember[]
  clients:Client[]
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
  const [extraMonths,setExtraMonths]=useState(()=>{
    const now=new Date()
    const last=new Date(now.getFullYear(),now.getMonth()+1,0).getDate()
    return now.getDate()>=last-7 ? 1 : 0
  })
  const editorRestoreAttempted=useRef(false)

  const [today,setToday]=useState(()=>dateKey(new Date()))
  const days=useMemo(()=>calendarDaysFromToday(today,extraMonths),[today,extraMonths])
  const nextMonth=useMemo(()=>nextMonthLabel(today,extraMonths),[today,extraMonths])

  useEffect(()=>{
    const [year,month,day]=today.split('-').map(Number)
    const last=new Date(year,month,0).getDate()
    if(day>=last-7) setExtraMonths(current=>Math.max(1,current))
  },[today])

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

  useEffect(()=>{
    if(editorRestoreAttempted.current || editorOpen) return
    const session=readEditorialEditorSession()
    if(!session){
      editorRestoreAttempted.current=true
      return
    }

    if(session.mode==='create'){
      setEditing(null)
      setNewDate(session.date ?? today)
      setEditorOpen(true)
      editorRestoreAttempted.current=true
      return
    }

    if(session.itemId){
      const found=data.items.find(item=>item.id===session.itemId)
      if(found){
        setEditing(found)
        setNewDate(found.publishDate ?? session.date)
        setEditorOpen(true)
        editorRestoreAttempted.current=true
      }else if(data.items.length){
        clearEditorialEditorSession()
        editorRestoreAttempted.current=true
      }
    }
  },[data.items,editorOpen,today])

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

  const overdueItems=useMemo(()=>[...filtered]
    .filter(item=>item.publishDate && item.publishDate<today && item.status!=='published' && item.status!=='archived')
    .sort((a,b)=>(a.publishDate ?? '').localeCompare(b.publishDate ?? '') || (a.publishTime ?? '18:00').localeCompare(b.publishTime ?? '18:00') || a.sortOrder-b.sortOrder)
  ,[filtered,today])

  const archiveItems=useMemo(()=>[...filtered].sort((a,b)=>(b.publishedAt ?? b.archivedAt ?? b.updatedAt).localeCompare(a.publishedAt ?? a.archivedAt ?? a.updatedAt)),[filtered])
  const visibleCount=view==='calendar'
    ? filtered.filter(item=>item.publishDate && (item.publishDate>=today || (item.publishDate<today && item.status!=='published' && item.status!=='archived'))).length
    : archiveItems.length

  function openCreate(date:string|null){
    const targetDate=date ?? today
    setEditing(null)
    setNewDate(targetDate)
    setEditorOpen(true)
    writeEditorialEditorSession({mode:'create',date:targetDate})
  }

  function openEdit(item:EditorialItem){
    setEditing(item)
    setNewDate(item.publishDate)
    setEditorOpen(true)
    writeEditorialEditorSession({mode:'edit',itemId:item.id,date:item.publishDate})
  }

  function closeEditor(){
    clearEditorialEditorSession()
    setEditorOpen(false)
    setEditing(null)
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
        <div><h2>Prossimi contenuti online</h2></div>
        <button className="primary-button todo-new-task icon-only-add" title="Nuovo contenuto" aria-label="Nuovo contenuto" onClick={()=>openCreate(today)}><Plus size={16}/></button>
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
        {overdueItems.length>0 && <section className="editorial-overdue-panel">
          <div className="editorial-overdue-head">
            <div>
              <span className="editorial-overdue-dot"/>
              <h3>Scaduti</h3>
            </div>
            <span>{overdueItems.length}</span>
          </div>
          <div className="editorial-day-content-groups editorial-brand-columns editorial-overdue-columns">
            {(['casaro','autoscuola_susa'] as EditorialAccount[]).map(accountKey=>{
              const accountItems=overdueItems.filter(item=>item.account===accountKey)
              return <div className={`editorial-brand-column account-${accountKey}`} key={accountKey}>
                <div className="editorial-brand-column-head">
                  <EditorialAccountLogo account={accountKey} clients={clients}/>
                </div>
                <div className="editorial-brand-column-list">
                  {accountItems.map(item=><EditorialCard
                    key={item.id}
                    item={item}
                    data={data}
                    members={members}
                    clients={clients}
                    overdue
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
              </div>
            })}
          </div>
        </section>}
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
              <div className="editorial-day-content-groups editorial-brand-columns">
                {(['casaro','autoscuola_susa'] as EditorialAccount[]).map(accountKey=>{
                  const accountItems=items.filter(item=>item.account===accountKey)
                  return <div className={`editorial-brand-column account-${accountKey}`} key={accountKey}>
                    <div className="editorial-brand-column-head">
                      <EditorialAccountLogo account={accountKey} clients={clients}/>
                    </div>
                    <div className="editorial-brand-column-list">
                      {accountItems.map(item=><EditorialCard
                        key={item.id}
                        item={item}
                        data={data}
                        members={members}
                        clients={clients}
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
                  </div>
                })}
              </div>
              <button className="todo-add-row icon-only-add" title="Aggiungi contenuto" aria-label="Aggiungi contenuto" onClick={()=>openCreate(key)}><Plus size={15}/></button>
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
          {archiveItems.map(item=><EditorialArchiveRow key={item.id} item={item} clients={clients} onClick={()=>openEdit(item)}/>)}
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
      clients={clients}
      actions={actions}
      onCelebrate={onCelebrate}
      onClose={closeEditor}
    />
  </>
}

function EditorialCard({
  item,
  data,
  members,
  clients,
  overdue=false,
  onClick,
  onDragStart,
  onDragEnd,
  onMove,
  onDragHover,
}:{
  item:EditorialItem
  data:EditorialData
  members:TeamMember[]
  clients:Client[]
  overdue?:boolean
  onClick:()=>void
  onDragStart:(event:DragEvent<HTMLSpanElement>)=>void
  onDragEnd:()=>void
  onMove:(itemId:string,publishDate:string)=>Promise<void>
  onDragHover:(publishDate:string|null)=>void
}) {
  const steps=data.steps.filter(step=>step.editorialItemId===item.id).sort((a,b)=>a.sortOrder-b.sortOrder)
  const pendingPeople=[...new Set(
    steps
      .filter(step=>!step.done)
      .map(step=>members.find(member=>member.id===step.ownerMemberId)?.name)
      .filter((name): name is string=>Boolean(name))
  )]

  return <article className={`todo-task-card editorial-todo-card account-${item.account} ${item.status==='published'?'is-published':''} ${overdue?'is-overdue':''}`}>
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
      <div className="todo-task-topline editorial-card-topline">
        <h3>{item.title}</h3>
        <EditorialAccountLogo account={item.account} clients={clients}/>
      </div>

      <div className="todo-task-meta editorial-todo-meta">
        {item.platforms.map(value=><PlatformPreviewIcon key={value} platform={value}/>)}
        {overdue
          ? <span className="editorial-status-chip overdue">Scaduto{item.publishDate ? ` · ${new Date(`${item.publishDate}T12:00:00`).toLocaleDateString('it-IT',{day:'numeric',month:'short'}).replace('.','')}` : ''}</span>
          : <span className={`editorial-status-chip ${statusTone(item.status)}`}>{statusLabelForItem(item.status,item.platforms)}</span>}
      </div>


      {pendingPeople.length>0 && <div className="editorial-team-progress">
        {pendingPeople.map(name=><span key={name} className={`editorial-team-progress-chip ${memberToneClass(name)} pending`}>
          <i>{name.slice(0,1).toUpperCase()}</i><b>{name}</b>
        </span>)}
      </div>}
    </button>
  </article>
}

function EditorialArchiveRow({item,clients,onClick}:{item:EditorialItem;clients:Client[];onClick:()=>void}) {
  return <article className={`todo-task-card completed-task-card editorial-todo-card editorial-archive-card account-${item.account} is-published`}>
    <button className="todo-task-content editorial-todo-content" onClick={onClick}>
      <div className="todo-task-topline editorial-card-topline">
        <h3>{item.title}</h3>
        <EditorialAccountLogo account={item.account} clients={clients}/>
      </div>
      <div className="todo-task-meta editorial-todo-meta">
        {item.platforms.map(value=><PlatformPreviewIcon key={value} platform={value}/>)}
        <span className="editorial-status-chip published">Pubblicato</span>
      </div>
    </button>
  </article>
}
