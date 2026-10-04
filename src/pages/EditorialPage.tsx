import { useMemo, useState } from 'react'
import { Archive, CalendarDays, Clock3, Paperclip, Plus, Search } from 'lucide-react'
import { EditorialItemModal } from '../components/EditorialItemModal'
import {
  currentWorkerNames,
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

const PLATFORM_ORDER: EditorialPlatform[]=['facebook','tiktok','youtube','whatsapp']
const STATUS_FILTERS: EditorialStatus[]=['idea','to_produce','in_progress','review','ready','scheduled']

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
  if(status==='scheduled') return 'scheduled'
  if(status==='ready') return 'ready'
  if(status==='review') return 'review'
  if(status==='in_progress') return 'progress'
  if(status==='to_produce') return 'produce'
  return 'idea'
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
  const archiveCount=data.items.filter(item=>item.status==='published'||item.status==='archived'||Boolean(item.archivedAt)).length

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

  return <section className="editorial-page editorial-page-v2">
    <div className="editorial-toolbar editorial-toolbar-v2">
      <div className="editorial-toolbar-main">
        <div className="segmented editorial-view-switch editorial-view-switch-v2">
          <button className={view==='calendar'?'active':''} onClick={()=>{setView('calendar');setStatus('all')}}><CalendarDays size={13}/> Calendario</button>
          <button className={view==='archive'?'active':''} onClick={()=>{setView('archive');setStatus('all')}}><Archive size={13}/> Archivio <span>{archiveCount}</span></button>
        </div>

        <div className="editorial-chip-group editorial-account-filters">
          <button className={account==='all'?'active neutral':''} onClick={()=>setAccount('all')}>Tutti</button>
          {(Object.entries(editorialAccountLabel) as [EditorialAccount,string][]).map(([value,label])=><button
            key={value}
            className={`account-filter account-${value} ${account===value?'active':''}`}
            onClick={()=>setAccount(value)}
          >{label}</button>)}
        </div>

        <button className="primary-button editorial-new-button editorial-new-button-v2" onClick={()=>openCreate(today)}><Plus size={15}/><span>Nuovo contenuto</span></button>
      </div>

      <div className="editorial-toolbar-secondary">
        <div className="editorial-chip-group editorial-platform-filters">
          <button className={platform==='all'?'active neutral':''} onClick={()=>setPlatform('all')}>Tutti i canali</button>
          {PLATFORM_ORDER.map(value=><button
            key={value}
            className={`platform-filter ${platformTone(value)} ${platform===value?'active':''}`}
            onClick={()=>setPlatform(value)}
          >{editorialPlatformLabel[value]}</button>)}
        </div>

        <div className="editorial-chip-group editorial-status-filters">
          <button className={status==='all'?'active neutral':''} onClick={()=>setStatus('all')}>Tutti gli stati</button>
          {(view==='archive' ? ['published','archived'] as EditorialStatus[] : STATUS_FILTERS).map(value=><button
            key={value}
            className={`status-filter ${statusTone(value)} ${status===value?'active':''}`}
            onClick={()=>setStatus(value)}
          >{editorialStatusLabel[value]}</button>)}
        </div>

        {view==='archive' && <label className="editorial-search editorial-search-v2"><Search size={14}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cerca archivio"/></label>}
      </div>
    </div>

    {view==='calendar' ? <div className="editorial-calendar editorial-calendar-v2">
      {days.map(date=>{
        const key=dateKey(date)
        const items=byDate.get(key) ?? []
        const isToday=key===today
        return <section className={`editorial-day editorial-day-v2 ${isToday?'today':''}`} key={key}>
          <div className="editorial-day-date editorial-day-date-v2">
            <strong>{date.getDate()}</strong>
            <span>{date.toLocaleDateString('it-IT',{month:'short'}).replace('.','')}</span>
            <small>{date.toLocaleDateString('it-IT',{weekday:'long'})}</small>
            {isToday && <b>Oggi</b>}
          </div>

          <div className="editorial-day-content editorial-day-content-v2">
            <button className="editorial-day-add editorial-day-add-v2" onClick={()=>openCreate(key)}><Plus size={13}/> Nuovo contenuto</button>
            {items.length
              ? <div className="editorial-day-items editorial-day-items-v2">{items.map(item=><EditorialCard key={item.id} item={item} data={data} members={members} onClick={()=>openEdit(item)}/>)}</div>
              : <span className="editorial-day-empty">Nessun contenuto</span>}
          </div>
        </section>
      })}
    </div> : <section className="editorial-archive editorial-archive-v2">
      <div className="editorial-archive-list">
        {archiveItems.map(item=><EditorialArchiveRow key={item.id} item={item} data={data} members={members} onClick={()=>openEdit(item)}/>)}
        {!archiveItems.length && <div className="editorial-empty-state"><Archive size={22}/><strong>Archivio vuoto</strong><span>I contenuti pubblicati compariranno qui automaticamente.</span></div>}
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
  const steps=data.steps.filter(step=>step.editorialItemId===item.id)
  const assets=data.assets.filter(asset=>asset.editorialItemId===item.id)
  const workers=currentWorkerNames({item,assetsCount:assets.length,steps,members})

  return <button className={`editorial-card editorial-card-v2 account-${item.account}`} onClick={onClick}>
    <div className="editorial-card-top editorial-card-top-v2">
      <span className={`editorial-account-chip account-${item.account}`}>{editorialAccountLabel[item.account]}</span>
      <span className={`editorial-status-chip ${statusTone(item.status)}`}>{editorialStatusLabel[item.status]}</span>
    </div>

    <h3>{item.title}</h3>

    <div className="editorial-platform-list">
      {item.platforms.map(value=><span key={value} className={`editorial-platform-chip ${platformTone(value)}`}>{editorialPlatformLabel[value]}</span>)}
    </div>

    <div className="editorial-card-meta editorial-card-meta-v2">
      <span><Clock3 size={12}/>{item.publishTime || '18:00'}</span>
      <span><Paperclip size={12}/>{assets.length}</span>
      {!item.description.trim() && <span className="editorial-missing">Descrizione mancante</span>}
      {!assets.length && <span className="editorial-missing">Contenuto mancante</span>}
    </div>

    {workers.length>0 && <div className="editorial-workers">
      <small>Da lavorare</small>
      <div>{workers.map(name=><span key={name} className={`editorial-worker-chip ${memberToneClass(name)}`}>{name}</span>)}</div>
    </div>}
  </button>
}

function EditorialArchiveRow({item,data,members,onClick}:{item:EditorialItem;data:EditorialData;members:TeamMember[];onClick:()=>void}) {
  const assets=data.assets.filter(asset=>asset.editorialItemId===item.id)
  const published=item.publishedAt ? new Date(item.publishedAt) : item.publishDate ? new Date(item.publishDate+'T12:00:00') : null
  return <button className={`editorial-archive-row editorial-archive-row-v2 account-${item.account}`} onClick={onClick}>
    <div className="editorial-archive-date"><strong>{published ? published.getDate() : '—'}</strong><span>{published ? published.toLocaleDateString('it-IT',{month:'short'}).replace('.','') : ''}</span><small>{published ? published.getFullYear() : ''}</small></div>
    <div className="editorial-archive-main">
      <div className="editorial-archive-chips">
        <span className={`editorial-account-chip account-${item.account}`}>{editorialAccountLabel[item.account]}</span>
        {item.platforms.map(value=><span key={value} className={`editorial-platform-chip ${platformTone(value)}`}>{editorialPlatformLabel[value]}</span>)}
      </div>
      <h3>{item.title}</h3>
      <small>{item.description || 'Nessuna descrizione'}</small>
    </div>
    <div className="editorial-archive-assets"><Paperclip size={14}/><strong>{assets.length}</strong><span>file</span></div>
    <span className="editorial-status-chip published">Pubblicato</span>
  </button>
}
