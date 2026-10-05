import { useMemo, useState } from 'react'
import { Archive, CalendarDays, Clock3, Paperclip, Plus } from 'lucide-react'
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

const PLATFORM_ORDER: EditorialPlatform[]=['facebook','tiktok','youtube','whatsapp']
const STATUS_FILTERS: EditorialStatus[]=['to_produce','review','ready']

function dateKey(date:Date){
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}

function currentMonthDaysFromToday(){
  const now=new Date()
  const last=new Date(now.getFullYear(),now.getMonth()+1,0).getDate()
  return Array.from({length:last-now.getDate()+1},(_,index)=>new Date(now.getFullYear(),now.getMonth(),now.getDate()+index))
}

function statusTone(status:EditorialStatus){
  if(status==='published') return 'published'
  if(status==='ready') return 'ready'
  if(status==='review') return 'review'
  return 'produce'
}

function platformTone(platform:EditorialPlatform){
  return `platform-${platform}`
}

export function EditorialPage({
  data,
  members,
  actions,
}:{
  data:EditorialData
  members:TeamMember[]
  actions:Actions
}) {
  const [view,setView]=useState<View>('calendar')
  const [account,setAccount]=useState<'all'|EditorialAccount>('all')
  const [platform,setPlatform]=useState<'all'|EditorialPlatform>('all')
  const [status,setStatus]=useState<'all'|EditorialStatus>('all')
  const [search,setSearch]=useState('')
  const [editorOpen,setEditorOpen]=useState(false)
  const [editing,setEditing]=useState<EditorialItem|null>(null)
  const [newDate,setNewDate]=useState<string|null>(null)

  const days=useMemo(()=>currentMonthDaysFromToday(),[])
  const today=dateKey(new Date())

  const filtered=useMemo(()=>data.items.filter(item=>{
    const isArchive=item.status==='published' || item.status==='archived' || Boolean(item.archivedAt)
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
  }),[data.items,view,account,platform,status,search])

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
          return <section key={key} className={`todo-day-row editorial-day-tasklike ${isToday?'is-today':''} ${items.length?'':'is-empty'}`}>
            <div className="todo-day-date">
              <div className={`todo-day-number ${isToday?'today':''}`}>{date.getDate()}</div>
              <p>{date.toLocaleDateString('it-IT',{month:'short'}).replace('.','')}</p>
              <span>{date.toLocaleDateString('it-IT',{weekday:'long'})}</span>
              {isToday && <b>Oggi</b>}
            </div>

            <div className="todo-day-body">
              <div className="todo-task-stack">
                {items.map(item=><EditorialCard key={item.id} item={item} data={data} members={members} onClick={()=>openEdit(item)}/>)}
              </div>
              <button className="todo-add-row" onClick={()=>openCreate(key)}><Plus size={15}/><span>{items.length?'Aggiungi contenuto':'Nuovo contenuto'}</span></button>
            </div>
          </section>
        })}
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
      onClose={()=>setEditorOpen(false)}
    />
  </>
}

function EditorialCard({item,data,members,onClick}:{item:EditorialItem;data:EditorialData;members:TeamMember[];onClick:()=>void}) {
  const steps=data.steps.filter(step=>step.editorialItemId===item.id).sort((a,b)=>a.sortOrder-b.sortOrder)
  const assets=data.assets.filter(asset=>asset.editorialItemId===item.id)

  return <article className={`todo-task-card editorial-todo-card account-${item.account}`}>
    <button className="todo-task-content editorial-todo-content" onClick={onClick}>
      <div className="todo-task-topline">
        <h3>{item.title}</h3>
        <span className={`editorial-account-chip account-${item.account}`}>{editorialAccountLabel[item.account]}</span>
      </div>

      <div className="todo-task-meta editorial-todo-meta">
        {item.platforms.map(value=><span key={value} className={`editorial-platform-chip ${platformTone(value)}`}>{editorialPlatformLabel[value]}</span>)}
        <span className={`editorial-status-chip ${statusTone(item.status)}`}>{statusLabelForItem(item.status,item.platforms)}</span>
        <span className={`editorial-media-chip ${item.mediaKind}`}>{item.mediaKind==='video'?'Video':'Foto'}</span>
        <span className="editorial-inline-meta"><Clock3 size={11}/>{item.publishTime || '18:00'}</span>
        <span className="editorial-inline-meta"><Paperclip size={11}/>{assets.length}</span>
      </div>

      {item.description && <p className="editorial-card-description">{item.description}</p>}

      {steps.length>0 && <div className="editorial-team-progress">
        {steps.map(step=>{
          const owner=members.find(member=>member.id===step.ownerMemberId)
          const name=owner?.name ?? step.label
          return <span key={step.id} className={`editorial-team-progress-chip ${memberToneClass(name)} ${step.done?'done':'pending'}`}>
            <i>{step.done?'✓':'•'}</i>{name}
          </span>
        })}
      </div>}
    </button>
  </article>
}

function EditorialArchiveRow({item,data,onClick}:{item:EditorialItem;data:EditorialData;onClick:()=>void}) {
  const assets=data.assets.filter(asset=>asset.editorialItemId===item.id)
  return <article className={`todo-task-card completed-task-card editorial-todo-card editorial-archive-card account-${item.account}`}>
    <button className="todo-task-content editorial-todo-content" onClick={onClick}>
      <div className="todo-task-topline">
        <h3>{item.title}</h3>
        <span className={`editorial-account-chip account-${item.account}`}>{editorialAccountLabel[item.account]}</span>
      </div>
      <div className="todo-task-meta editorial-todo-meta">
        {item.platforms.map(value=><span key={value} className={`editorial-platform-chip ${platformTone(value)}`}>{editorialPlatformLabel[value]}</span>)}
        <span className="editorial-status-chip published">Pubblicato</span>
        <span className={`editorial-media-chip ${item.mediaKind}`}>{item.mediaKind==='video'?'Video':'Foto'}</span>
        <span className="editorial-inline-meta"><Paperclip size={11}/>{assets.length}</span>
      </div>
      {item.description && <p className="editorial-card-description">{item.description}</p>}
    </button>
  </article>
}
