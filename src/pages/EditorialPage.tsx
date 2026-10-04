import { useMemo, useState } from 'react'
import { Archive, CalendarDays, ChevronLeft, ChevronRight, Clock3, FileText, Paperclip, Plus, Search, UserRound } from 'lucide-react'
import { EditorialItemModal } from '../components/EditorialItemModal'
import {
  editorialAccountLabel,
  editorialPlatformLabel,
  editorialStatusLabel,
} from '../lib/editorialConfig'
import { memberToneClass } from '../lib/memberTone'
import type { useEditorial } from '../hooks/useEditorial'
import type { EditorialAccount, EditorialData, EditorialItem, EditorialPlatform, EditorialStatus } from '../types/editorial'
import type { TeamMember } from '../types/studio'

type Actions=ReturnType<typeof useEditorial>['actions']
type View='calendar'|'archive'

function dateKey(date:Date){
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}

function monthDays(cursor:Date){
  const year=cursor.getFullYear()
  const month=cursor.getMonth()
  const last=new Date(year,month+1,0).getDate()
  return Array.from({length:last},(_,index)=>new Date(year,month,index+1))
}

function statusTone(status:EditorialStatus){
  if(status==='published') return 'published'
  if(status==='scheduled') return 'scheduled'
  if(status==='ready') return 'ready'
  if(status==='review') return 'review'
  if(status==='in_progress') return 'progress'
  if(status==='to_produce') return 'produce'
  return 'idea'
}

function platformTone(platform:EditorialPlatform){
  return `platform-${platform.replace('_','-')}`
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
  const [cursor,setCursor]=useState(()=>new Date(new Date().getFullYear(),new Date().getMonth(),1))
  const [account,setAccount]=useState<'all'|EditorialAccount>('all')
  const [platform,setPlatform]=useState<'all'|EditorialPlatform>('all')
  const [member,setMember]=useState('all')
  const [status,setStatus]=useState<'all'|EditorialStatus>('all')
  const [search,setSearch]=useState('')
  const [editorOpen,setEditorOpen]=useState(false)
  const [editing,setEditing]=useState<EditorialItem|null>(null)
  const [newDate,setNewDate]=useState<string|null>(null)

  const days=useMemo(()=>monthDays(cursor),[cursor])
  const today=dateKey(new Date())

  const filtered=useMemo(()=>data.items.filter(item=>{
    const isArchive=item.status==='published' || item.status==='archived' || Boolean(item.archivedAt)
    if(view==='archive' ? !isArchive : isArchive) return false
    if(account!=='all' && item.account!==account) return false
    if(platform!=='all' && item.platform!==platform) return false
    if(member!=='all' && item.assigneeId!==member && !item.supportMemberIds.includes(member)) return false
    if(status!=='all' && item.status!==status) return false
    if(search.trim()){
      const q=search.trim().toLowerCase()
      const hay=[item.title,item.description,item.caption,item.script,item.hook,editorialAccountLabel[item.account],editorialPlatformLabel[item.platform]].join(' ').toLowerCase()
      if(!hay.includes(q)) return false
    }
    return true
  }),[data.items,view,account,platform,member,status,search])

  const byDate=useMemo(()=>{
    const map=new Map<string,EditorialItem[]>()
    for(const item of filtered){
      if(!item.publishDate) continue
      const group=map.get(item.publishDate) ?? []
      group.push(item)
      map.set(item.publishDate,group)
    }
    for(const [key,items] of map){
      map.set(key,[...items].sort((a,b)=>(a.publishTime ?? '99:99').localeCompare(b.publishTime ?? '99:99') || a.sortOrder-b.sortOrder))
    }
    return map
  },[filtered])

  const unscheduled=useMemo(()=>filtered.filter(item=>!item.publishDate),[filtered])
  const archiveItems=useMemo(()=>[...filtered].sort((a,b)=>(b.publishedAt ?? b.archivedAt ?? b.updatedAt).localeCompare(a.publishedAt ?? a.archivedAt ?? a.updatedAt)),[filtered])

  const activeMonthItems=useMemo(()=>filtered.filter(item=>item.publishDate?.startsWith(`${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2,'0')}`)),[filtered,cursor])
  const counts={
    total:activeMonthItems.length,
    ready:activeMonthItems.filter(item=>item.status==='ready').length,
    scheduled:activeMonthItems.filter(item=>item.status==='scheduled').length,
    working:activeMonthItems.filter(item=>['to_produce','in_progress','review'].includes(item.status)).length,
  }

  function openCreate(date:string|null){
    setEditing(null)
    setNewDate(date)
    setEditorOpen(true)
  }
  function openEdit(item:EditorialItem){
    setEditing(item)
    setNewDate(item.publishDate)
    setEditorOpen(true)
  }
  function shiftMonth(delta:number){
    setCursor(current=>new Date(current.getFullYear(),current.getMonth()+delta,1))
  }
  function resetMonth(){
    const now=new Date()
    setCursor(new Date(now.getFullYear(),now.getMonth(),1))
  }

  return <section className="editorial-page">
    <div className="editorial-page-head">
      <div>
        <h2>Piano Editoriale</h2>
        <p>Casaro + Autoscuola Susa · calendario operativo social</p>
      </div>
      <button className="primary-button editorial-new-button" onClick={()=>openCreate(today)}><Plus size={16}/> Nuovo contenuto</button>
    </div>

    <div className="editorial-toolbar">
      <div className="segmented editorial-view-switch">
        <button className={view==='calendar'?'active':''} onClick={()=>{setView('calendar');setStatus('all')}}><CalendarDays size={13}/> Calendario</button>
        <button className={view==='archive'?'active':''} onClick={()=>{setView('archive');setStatus('all')}}><Archive size={13}/> Archivio <span>{data.items.filter(item=>item.status==='published'||item.status==='archived'||Boolean(item.archivedAt)).length}</span></button>
      </div>

      <label className="editorial-filter">
        <span>Account</span>
        <select value={account} onChange={e=>setAccount(e.target.value as 'all'|EditorialAccount)}>
          <option value="all">Tutti</option>
          {(Object.entries(editorialAccountLabel) as [EditorialAccount,string][]).map(([value,label])=><option value={value} key={value}>{label}</option>)}
        </select>
      </label>

      <label className="editorial-filter">
        <span>Piattaforma</span>
        <select value={platform} onChange={e=>setPlatform(e.target.value as 'all'|EditorialPlatform)}>
          <option value="all">Tutte</option>
          {(Object.entries(editorialPlatformLabel) as [EditorialPlatform,string][]).map(([value,label])=><option value={value} key={value}>{label}</option>)}
        </select>
      </label>

      <label className="editorial-filter">
        <span>Persona</span>
        <select value={member} onChange={e=>setMember(e.target.value)}>
          <option value="all">Tutto il team</option>
          {members.filter(m=>m.active).map(m=><option value={m.id} key={m.id}>{m.name}</option>)}
        </select>
      </label>

      <label className="editorial-filter">
        <span>Stato</span>
        <select value={status} onChange={e=>setStatus(e.target.value as 'all'|EditorialStatus)}>
          <option value="all">Tutti</option>
          {Object.entries(editorialStatusLabel).filter(([value])=>view==='archive' ? ['published','archived'].includes(value) : !['published','archived'].includes(value)).map(([value,label])=><option value={value} key={value}>{label}</option>)}
        </select>
      </label>

      {view==='archive' && <label className="editorial-search"><Search size={14}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cerca nello storico…"/></label>}
    </div>

    {view==='calendar' ? <>
      <div className="editorial-month-bar">
        <div className="editorial-month-controls">
          <button className="icon-button" onClick={()=>shiftMonth(-1)}><ChevronLeft size={16}/></button>
          <button className="editorial-month-title" onClick={resetMonth}>{cursor.toLocaleDateString('it-IT',{month:'long',year:'numeric'})}</button>
          <button className="icon-button" onClick={()=>shiftMonth(1)}><ChevronRight size={16}/></button>
        </div>
        <div className="editorial-month-stats">
          <span><strong>{counts.total}</strong> contenuti</span>
          <span><strong>{counts.working}</strong> in lavorazione</span>
          <span><strong>{counts.ready}</strong> pronti</span>
          <span><strong>{counts.scheduled}</strong> programmati</span>
        </div>
      </div>

      {unscheduled.length>0 && <section className="editorial-unscheduled">
        <div className="editorial-subhead"><div><h3>Da pianificare</h3><span>{unscheduled.length}</span></div><small>Contenuti ancora senza data</small></div>
        <div className="editorial-card-row">{unscheduled.map(item=><EditorialCard key={item.id} item={item} data={data} members={members} onClick={()=>openEdit(item)}/>)}</div>
      </section>}

      <div className="editorial-calendar">
        {days.map(date=>{
          const key=dateKey(date)
          const items=byDate.get(key) ?? []
          const isToday=key===today
          return <section className={`editorial-day ${isToday?'today':''}`} key={key}>
            <div className="editorial-day-date">
              <strong>{date.getDate()}</strong>
              <span>{date.toLocaleDateString('it-IT',{month:'short'}).replace('.','')}</span>
              <small>{date.toLocaleDateString('it-IT',{weekday:'long'})}</small>
              {isToday && <b>Oggi</b>}
            </div>
            <div className="editorial-day-content">
              <button className="editorial-day-add" onClick={()=>openCreate(key)}><Plus size={13}/> Nuovo contenuto</button>
              {items.length ? <div className="editorial-day-items">{items.map(item=><EditorialCard key={item.id} item={item} data={data} members={members} onClick={()=>openEdit(item)}/>)}</div> : <span className="editorial-day-empty">Nessun contenuto previsto</span>}
            </div>
          </section>
        })}
      </div>
    </> : <section className="editorial-archive">
      <div className="editorial-archive-head">
        <div><h3>Archivio storico</h3><p>I contenuti passano qui automaticamente quando vengono segnati come pubblicati.</p></div>
        <span>{archiveItems.length} contenuti</span>
      </div>
      <div className="editorial-archive-list">
        {archiveItems.map(item=><EditorialArchiveRow key={item.id} item={item} data={data} members={members} onClick={()=>openEdit(item)}/>)}
        {!archiveItems.length && <div className="editorial-empty-state"><Archive size={22}/><strong>Archivio vuoto</strong><span>I primi contenuti pubblicati compariranno qui automaticamente.</span></div>}
      </div>
    </section>}

    <EditorialItemModal
      open={editorOpen}
      item={editing}
      initialDate={newDate}
      data={data}
      members={members}
      actions={actions}
      onClose={()=>setEditorOpen(false)}
    />
  </section>
}

function EditorialCard({item,data,members,onClick}:{item:EditorialItem;data:EditorialData;members:TeamMember[];onClick:()=>void}) {
  const owner=members.find(member=>member.id===item.assigneeId)
  const steps=data.steps.filter(step=>step.editorialItemId===item.id)
  const done=steps.filter(step=>step.done).length
  const assets=data.assets.filter(asset=>asset.editorialItemId===item.id)
  return <button className="editorial-card" onClick={onClick}>
    <div className="editorial-card-top">
      <span className={`editorial-account-chip account-${item.account}`}>{editorialAccountLabel[item.account].replace('Account ','')}</span>
      <span className={`editorial-platform-chip ${platformTone(item.platform)}`}>{editorialPlatformLabel[item.platform]}</span>
      <span className={`editorial-status-chip ${statusTone(item.status)}`}>{editorialStatusLabel[item.status]}</span>
    </div>
    <h3>{item.title}</h3>
    <div className="editorial-card-meta">
      <span><FileText size={12}/>{item.contentType}</span>
      {item.publishTime && <span><Clock3 size={12}/>{item.publishTime}</span>}
      <span><Paperclip size={12}/>{assets.length}</span>
    </div>
    <div className="editorial-card-bottom">
      {owner ? <span className={`editorial-owner ${memberToneClass(owner.name)}`}><UserRound size={11}/>{owner.name}</span> : <span className="editorial-owner unassigned">Non assegnato</span>}
      <span className="editorial-step-progress"><i style={{width:`${steps.length ? Math.round((done/steps.length)*100) : 0}%`}}/><b>{done}/{steps.length || 0}</b></span>
    </div>
  </button>
}

function EditorialArchiveRow({item,data,members,onClick}:{item:EditorialItem;data:EditorialData;members:TeamMember[];onClick:()=>void}) {
  const owner=members.find(member=>member.id===item.assigneeId)
  const assets=data.assets.filter(asset=>asset.editorialItemId===item.id)
  const published=item.publishedAt ? new Date(item.publishedAt) : item.publishDate ? new Date(item.publishDate+'T12:00:00') : null
  return <button className="editorial-archive-row" onClick={onClick}>
    <div className="editorial-archive-date"><strong>{published ? published.getDate() : '—'}</strong><span>{published ? published.toLocaleDateString('it-IT',{month:'short'}).replace('.','') : ''}</span><small>{published ? published.getFullYear() : ''}</small></div>
    <div className="editorial-archive-main">
      <div><span className={`editorial-account-chip account-${item.account}`}>{editorialAccountLabel[item.account].replace('Account ','')}</span><span className={`editorial-platform-chip ${platformTone(item.platform)}`}>{editorialPlatformLabel[item.platform]}</span></div>
      <h3>{item.title}</h3>
      <small>{item.contentType}{owner ? ` · ${owner.name}` : ''}</small>
    </div>
    <div className="editorial-archive-assets"><Paperclip size={14}/><strong>{assets.length}</strong><span>asset</span></div>
    <span className="editorial-status-chip published">Pubblicato</span>
  </button>
}
