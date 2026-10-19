import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Archive, Check, Copy, ExternalLink, Link2, Trash2, X } from 'lucide-react'
import {
  editorialAccountLabel,
  editorialPlatformLabel,
  isAutomaticEditorialStep,
} from '../lib/editorialConfig'
import { memberToneClass } from '../lib/memberTone'
import type { useEditorial } from '../hooks/useEditorial'
import type {
  EditorialAccount,
  EditorialData,
  EditorialItem,
  EditorialMediaKind,
  EditorialPlatform,
} from '../types/editorial'
import type { TeamMember } from '../types/studio'

type Actions = ReturnType<typeof useEditorial>['actions']
type EditorialDraft = {
  accounts: EditorialAccount[]
  platforms: EditorialPlatform[]
  mediaKind: EditorialMediaKind
  title: string
  description: string
  inspirationUrl: string
  definitiveUrl: string
  publishDate: string
  publishTime: string
}

const PLATFORM_ORDER: EditorialPlatform[] = ['facebook','instagram','facebook_only','tiktok','youtube','whatsapp']
const META_PLATFORMS: EditorialPlatform[] = ['facebook','instagram','facebook_only']
const EDITORIAL_DRAFT_KEY = '4bit-editorial-draft-v1'
const EDITORIAL_EDIT_DRAFT_PREFIX = '4bit-editorial-edit-draft-v1:'

function readEditorialDraft(key=EDITORIAL_DRAFT_KEY): EditorialDraft | null {
  try {
    const raw=window.localStorage.getItem(key)
    if(!raw) return null
    const parsed=JSON.parse(raw) as Partial<EditorialDraft>
    const accounts=(parsed.accounts ?? []).filter((value): value is EditorialAccount => value==='casaro' || value==='autoscuola_susa')
    const platforms=(parsed.platforms ?? []).filter((value): value is EditorialPlatform => PLATFORM_ORDER.includes(value as EditorialPlatform))
    if(!accounts.length) return null
    return {
      accounts,
      platforms:platforms.length ? platforms : ['facebook'],
      mediaKind:parsed.mediaKind==='video' ? 'video' : 'photo',
      title:typeof parsed.title==='string' ? parsed.title : '',
      description:typeof parsed.description==='string' ? parsed.description : '',
      inspirationUrl:typeof parsed.inspirationUrl==='string' ? parsed.inspirationUrl : '',
      definitiveUrl:typeof parsed.definitiveUrl==='string' ? parsed.definitiveUrl : '',
      publishDate:typeof parsed.publishDate==='string' && parsed.publishDate ? parsed.publishDate : todayISO(),
      publishTime:typeof parsed.publishTime==='string' && parsed.publishTime ? parsed.publishTime : '18:00',
    }
  } catch {
    return null
  }
}

function writeEditorialDraft(draft: EditorialDraft,key=EDITORIAL_DRAFT_KEY) {
  try {
    window.localStorage.setItem(key,JSON.stringify(draft))
  } catch {
    // La bozza resta comunque nello stato React della sessione corrente.
  }
}

function clearEditorialDraft(key=EDITORIAL_DRAFT_KEY) {
  try { window.localStorage.removeItem(key) } catch {}
}

function todayISO() {
  const now=new Date()
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
}


function externalHref(value:string) {
  const raw=value.trim()
  if(!raw) return ''
  try {
    const candidate=/^https?:\/\//i.test(raw) ? raw : `https://${raw}`
    const url=new URL(candidate)
    return ['http:','https:'].includes(url.protocol) ? url.toString() : ''
  } catch {
    return ''
  }
}

export function EditorialItemModal({
  open,
  item,
  initialDate,
  data,
  members,
  actions,
  onCelebrate,
  onClose,
}: {
  open:boolean
  item:EditorialItem | null
  initialDate:string | null
  data:EditorialData
  members:TeamMember[]
  actions:Actions
  onCelebrate:()=>void
  onClose:()=>void
}) {
  const initial=useMemo(()=>({
    accounts:[item?.account ?? 'casaro'] as EditorialAccount[],
    platforms:item?.platforms?.length ? item.platforms : ['facebook'] as EditorialPlatform[],
    mediaKind:item?.mediaKind ?? 'photo' as EditorialMediaKind,
    title:item?.title ?? '',
    description:item?.description ?? '',
    inspirationUrl:item?.inspirationUrl ?? '',
    definitiveUrl:item?.definitiveUrl ?? '',
    publishDate:item?.publishDate ?? initialDate ?? todayISO(),
    publishTime:item?.publishTime ?? '18:00',
  }),[item,initialDate])

  const [draft,setDraft]=useState(initial)
  const [saving,setSaving]=useState(false)
  const [localError,setLocalError]=useState<string|null>(null)
  const [descriptionCopied,setDescriptionCopied]=useState(false)
  const formRef=useRef<HTMLFormElement>(null)
  const lastSavedSnapshot=useRef('')
  const autosaveTimer=useRef<number|null>(null)
  const autosaveQueue=useRef<Promise<void>>(Promise.resolve())
  const storageKey=item ? `${EDITORIAL_EDIT_DRAFT_PREFIX}${item.id}` : EDITORIAL_DRAFT_KEY

  const steps=useMemo(()=>item ? data.steps.filter(step=>step.editorialItemId===item.id).sort((a,b)=>a.sortOrder-b.sortOrder) : [],[data.steps,item])

  useEffect(()=>{
    if(!open) return
    const saved=readEditorialDraft(storageKey)
    const next=saved ?? initial
    setDraft(next)
    lastSavedSnapshot.current=JSON.stringify(initial)
    setLocalError(null)
    setDescriptionCopied(false)
  },[open,item?.id,storageKey])

  useEffect(()=>{
    if(!open) return
    writeEditorialDraft(draft,storageKey)
  },[draft,open,storageKey])

  useEffect(()=>{
    if(!open || !item) return
    const snapshot=JSON.stringify(draft)
    if(snapshot===lastSavedSnapshot.current) return
    if(!draft.title.trim() || !draft.platforms.length || !draft.accounts.length) return

    if(autosaveTimer.current!==null) window.clearTimeout(autosaveTimer.current)
    autosaveTimer.current=window.setTimeout(()=>{
      const payload={
        platforms:draft.platforms,
        mediaKind:draft.mediaKind,
        title:draft.title.trim(),
        description:draft.description.trim(),
        inspirationUrl:draft.inspirationUrl.trim(),
        definitiveUrl:draft.definitiveUrl.trim(),
        publishDate:draft.publishDate || todayISO(),
        publishTime:draft.publishTime || '18:00',
        account:draft.accounts[0],
      }

      autosaveQueue.current=autosaveQueue.current
        .catch(()=>{})
        .then(async()=>{
          await actions.updateItem(item.id,payload)
          lastSavedSnapshot.current=snapshot
          setLocalError(null)
        })
        .catch(err=>{
          setLocalError(err instanceof Error ? err.message : 'Salvataggio automatico non riuscito')
        })
    },650)

    return ()=>{
      if(autosaveTimer.current!==null){
        window.clearTimeout(autosaveTimer.current)
        autosaveTimer.current=null
      }
    }
  },[actions,draft,item?.id,open])

  useEffect(()=>{
    if(!open) return
    const handler=(event:KeyboardEvent)=>{
      if(event.key==='Escape' && !saving) void closeEditor()
      if(!item && event.key==='Enter' && (event.metaKey || event.ctrlKey)){
        event.preventDefault()
        formRef.current?.requestSubmit()
      }
    }
    document.addEventListener('keydown',handler)
    return ()=>document.removeEventListener('keydown',handler)
  },[draft,item?.id,open,saving])

  if(!open) return null

  const hasYoutube=draft.platforms.includes('youtube')
  const hasWhatsapp=draft.platforms.includes('whatsapp')
  const canUseWhatsapp=draft.accounts.length===1 && draft.accounts[0]==='casaro'
  const mediaLocked: EditorialMediaKind | null = hasYoutube ? 'video' : hasWhatsapp ? 'photo' : null
  const currentStatus=item?.status ?? 'to_produce'
  const inspirationHref=externalHref(draft.inspirationUrl)
  const definitiveHref=externalHref(draft.definitiveUrl)

  function toggleAccount(account:EditorialAccount) {
    if(item) {
      let platforms=draft.platforms
      if(account==='autoscuola_susa' && platforms.includes('whatsapp')) {
        platforms=platforms.filter(value=>value!=='whatsapp')
        if(!platforms.length) platforms=['facebook']
      }
      setDraft({...draft,accounts:[account],platforms})
      return
    }

    const active=draft.accounts.includes(account)
    let accounts=active
      ? draft.accounts.filter(value=>value!==account)
      : [...draft.accounts,account]

    if(!accounts.length) return

    let platforms=draft.platforms
    if((accounts.includes('autoscuola_susa') || accounts.length>1) && platforms.includes('whatsapp')) {
      platforms=platforms.filter(value=>value!=='whatsapp')
      if(!platforms.length) platforms=['facebook']
    }

    setDraft({...draft,accounts,platforms})
  }

  function togglePlatform(platform:EditorialPlatform) {
    if(platform==='whatsapp' && !canUseWhatsapp) return

    const active=draft.platforms.includes(platform)

    if(platform==='whatsapp') {
      if(active) return
      setDraft({...draft,platforms:['whatsapp'],mediaKind:'photo'})
      return
    }

    if(active) {
      if(draft.platforms.length===1) return
      const next=draft.platforms.filter(value=>value!==platform)
      const nextKind=next.includes('youtube') ? 'video' : draft.mediaKind
      setDraft({...draft,platforms:next,mediaKind:nextKind})
      return
    }

    let next=draft.platforms.filter(value=>value!=='whatsapp')

    if(META_PLATFORMS.includes(platform)) {
      next=next.filter(value=>!META_PLATFORMS.includes(value))
    }

    next=[...next,platform]
    const nextKind=platform==='youtube' ? 'video' : draft.mediaKind
    setDraft({...draft,platforms:next,mediaKind:nextKind})
  }

  function setMediaKind(mediaKind:EditorialMediaKind) {
    if(mediaLocked) return
    setDraft({...draft,mediaKind})
  }

  async function copyDescription() {
    const value=draft.description.trim()
    if(!value) return

    try{
      if(navigator.clipboard?.writeText){
        await navigator.clipboard.writeText(value)
      }else{
        const textarea=document.createElement('textarea')
        textarea.value=value
        textarea.style.position='fixed'
        textarea.style.opacity='0'
        document.body.appendChild(textarea)
        textarea.focus()
        textarea.select()
        document.execCommand('copy')
        textarea.remove()
      }
      setDescriptionCopied(true)
      window.setTimeout(()=>setDescriptionCopied(false),1600)
    }catch{
      setLocalError('Impossibile copiare la descrizione.')
    }
  }

  async function saveExistingNow() {
    if(!item || !draft.title.trim() || !draft.platforms.length || !draft.accounts.length) return
    if(autosaveTimer.current!==null){
      window.clearTimeout(autosaveTimer.current)
      autosaveTimer.current=null
    }

    const snapshot=JSON.stringify(draft)
    if(snapshot===lastSavedSnapshot.current) return

    const payload={
      platforms:draft.platforms,
      mediaKind:draft.mediaKind,
      title:draft.title.trim(),
      description:draft.description.trim(),
      inspirationUrl:draft.inspirationUrl.trim(),
      definitiveUrl:draft.definitiveUrl.trim(),
      publishDate:draft.publishDate || todayISO(),
      publishTime:draft.publishTime || '18:00',
      account:draft.accounts[0],
    }

    const task=autosaveQueue.current
      .catch(()=>{})
      .then(async()=>{
        await actions.updateItem(item.id,payload)
        lastSavedSnapshot.current=snapshot
        setLocalError(null)
      })

    autosaveQueue.current=task.catch(err=>{
      setLocalError(err instanceof Error ? err.message : 'Salvataggio automatico non riuscito')
    })
    await autosaveQueue.current
  }

  async function closeEditor() {
    if(item){
      await saveExistingNow()
      if(lastSavedSnapshot.current===JSON.stringify(draft)) clearEditorialDraft(storageKey)
    }
    onClose()
  }

  async function submit(event:FormEvent) {
    event.preventDefault()
    if(!draft.title.trim() || !draft.platforms.length || !draft.accounts.length) return

    if(item){
      await saveExistingNow()
      return
    }

    setSaving(true)
    setLocalError(null)
    try{
      const sharedPayload={
        platforms:draft.platforms,
        mediaKind:draft.mediaKind,
        title:draft.title.trim(),
        description:draft.description.trim(),
        inspirationUrl:draft.inspirationUrl.trim(),
        definitiveUrl:draft.definitiveUrl.trim(),
        publishDate:draft.publishDate || todayISO(),
        publishTime:draft.publishTime || '18:00',
      }

      await Promise.all(draft.accounts.map((account,index)=>
        actions.createItem({...sharedPayload,account,sortOrder:Date.now()+index})
      ))

      clearEditorialDraft()
      onClose()
    }catch(err){
      setLocalError(err instanceof Error ? err.message : 'Creazione non riuscita')
    }finally{
      setSaving(false)
    }
  }

  async function removeItem() {
    if(!item || !window.confirm(`Eliminare definitivamente "${item.title}"?`)) return
    setSaving(true)
    try{
      await actions.deleteItem(item.id)
      onClose()
    }finally{
      setSaving(false)
    }
  }

  return <div className="task-editor-backdrop editorial-modal-backdrop">
    <button className="task-editor-scrim" onClick={()=>!saving && void closeEditor()} aria-label="Chiudi"/>
    <form ref={formRef} onSubmit={submit} className="task-editor-panel editorial-editor-panel-v5">
      <div className="task-editor-head editorial-editor-head-v5">
        <div>
          <p className="eyebrow">{item ? 'Modifica contenuto' : 'Nuovo contenuto'}</p>
          <h2>{item ? item.title : 'Contenuto social'}</h2>
        </div>
        <button type="button" className="icon-button" onClick={()=>void closeEditor()} disabled={saving}><X size={18}/></button>
      </div>

      <div className="task-editor-body editorial-form-v5">
        <div className="editorial-choice-block">
          <span className="editorial-choice-label">Profilo</span>
          <div className="editorial-choice-chips account-choice-chips">
            {(Object.entries(editorialAccountLabel) as [EditorialAccount,string][]).map(([value,label])=><button
              type="button"
              key={value}
              className={`editorial-choice-chip account-chip account-${value} ${draft.accounts.includes(value)?'active':''}`}
              onClick={()=>toggleAccount(value)}
            >{label}</button>)}
          </div>
        </div>

        <textarea
          autoFocus
          rows={2}
          className="field task-editor-title editorial-title-field-v5"
          placeholder="Titolo del contenuto"
          value={draft.title}
          onChange={e=>setDraft({...draft,title:e.target.value})}
        />

        <div className="editorial-choice-block">
          <span className="editorial-choice-label">Canali</span>
          <div className="editorial-choice-chips platform-choice-chips">
            {PLATFORM_ORDER.filter(platform=>platform!=='whatsapp' || canUseWhatsapp).map(platform=><button
              type="button"
              key={platform}
              className={`editorial-choice-chip platform-choice platform-${platform} ${draft.platforms.includes(platform)?'active':''}`}
              onClick={()=>togglePlatform(platform)}
            >{editorialPlatformLabel[platform]}</button>)}
          </div>
        </div>

        <div className="editorial-choice-block editorial-media-choice">
          <span className="editorial-choice-label">Tipo contenuto</span>
          <div className="editorial-choice-chips media-choice-chips">
            <button type="button" disabled={mediaLocked==='video'} className={`editorial-choice-chip media-choice photo ${draft.mediaKind==='photo'?'active':''}`} onClick={()=>setMediaKind('photo')}>Foto</button>
            <button type="button" disabled={mediaLocked==='photo'} className={`editorial-choice-chip media-choice video ${draft.mediaKind==='video'?'active':''}`} onClick={()=>setMediaKind('video')}>Video</button>
          </div>
          {hasYoutube && <small>YouTube richiede un contenuto video.</small>}
          {hasWhatsapp && <small>WhatsApp usa foto/visual: i video sono esclusi.</small>}
        </div>

        <div className="task-editor-grid editorial-date-grid-v5">
          <label className="form-field"><span>Data pubblicazione</span><input className="field" type="date" min={todayISO()} value={draft.publishDate} onChange={e=>setDraft({...draft,publishDate:e.target.value})}/></label>
          <label className="form-field"><span>Ora</span><input className="field" type="time" value={draft.publishTime} onChange={e=>setDraft({...draft,publishTime:e.target.value})}/></label>
        </div>

        <label className="form-field editorial-description-field-v5">
          <span className="editorial-description-label">
            <span>Descrizione contenuto</span>
            <button
              type="button"
              className={`editorial-copy-description ${descriptionCopied?'copied':''}`}
              disabled={!draft.description.trim()}
              onClick={event=>{
                event.preventDefault()
                event.stopPropagation()
                void copyDescription()
              }}
            >
              {descriptionCopied ? <Check size={13}/> : <Copy size={13}/>}
              {descriptionCopied ? 'Copiato' : 'Copia'}
            </button>
          </span>
          <textarea className="field" rows={4} value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})} placeholder="Descrivi il contenuto e le indicazioni utili al team."/>
        </label>

        <section className="editorial-drive-links">
          <div className="editorial-drive-link-card inspiration">
            <div className="editorial-inspiration-head">
              <div><strong>Contenuto ispirazionale</strong><small>Link Drive del riferimento da usare come ispirazione.</small></div>
            </div>
            <div className="editorial-inspiration-link-row">
              <span className="editorial-inspiration-link-icon"><Link2 size={16}/></span>
              <input
                className="field"
                type="text"
                inputMode="url"
                placeholder="Incolla il link Google Drive"
                value={draft.inspirationUrl}
                onChange={e=>setDraft({...draft,inspirationUrl:e.target.value})}
              />
              {inspirationHref && <a className="editorial-inspiration-open" href={inspirationHref} target="_blank" rel="noreferrer"><ExternalLink size={14}/> Apri</a>}
            </div>
          </div>

          <div className="editorial-drive-link-card definitive">
            <div className="editorial-inspiration-head">
              <div><strong>Contenuto definitivo</strong><small>Link Drive del file finale pronto per pubblicazione o invio.</small></div>
            </div>
            <div className="editorial-inspiration-link-row">
              <span className="editorial-inspiration-link-icon"><Link2 size={16}/></span>
              <input
                className="field"
                type="text"
                inputMode="url"
                placeholder="Incolla il link Google Drive definitivo"
                value={draft.definitiveUrl}
                onChange={e=>setDraft({...draft,definitiveUrl:e.target.value})}
              />
              {definitiveHref && <a className="editorial-inspiration-open" href={definitiveHref} target="_blank" rel="noreferrer"><ExternalLink size={14}/> Apri</a>}
            </div>
          </div>
        </section>

        {item && steps.length>0 && <section className="editorial-checklist-v5">
          <div className="editorial-checklist-title">
            <strong>Checklist lavorazione</strong>
            <span>Le fasi automatiche si chiudono da sole.</span>
          </div>
          <div className="editorial-checklist-list">
            {steps.map(step=>{
              const owner=members.find(member=>member.id===step.ownerMemberId)
              const name=owner?.name ?? 'Team'
              const normalizedLabel=step.label.trim().toLowerCase()
              const manualPhotoEditing=normalizedLabel.includes('photo editing')
              const automatic=!manualPhotoEditing && isAutomaticEditorialStep(step.label)
              const willPublish = !step.done
                && ['Pubblicazione social','WhatsApp · Invio'].includes(step.label)
                && steps.every(other=>other.id===step.id || other.done)
              return <button
                type="button"
                key={step.id}
                disabled={automatic}
                className={`editorial-check-row ${memberToneClass(name)} ${step.done?'done':'pending'} ${automatic?'automatic':''} ${manualPhotoEditing?'manual-photo-editing':''}`}
                onClick={()=>{
                  if(automatic) return
                  if(willPublish) onCelebrate()
                  void actions.setStepDone(step.id,!step.done)
                }}
              >
                <span className="editorial-step-check">{step.done && <Check size={12}/>}</span>
                <span className="editorial-check-copy"><strong>{step.label}</strong><small>{name}</small></span>
                <span className="editorial-check-state">{step.done?'Fatto':manualPhotoEditing?'Da fare':automatic?'Automatico':'Da fare'}</span>
              </button>
            })}
          </div>
        </section>}

        {currentStatus==='published' && <div className="editorial-archive-notice"><Archive size={16}/><span>Contenuto pubblicato: è già nello storico.</span></div>}
        {localError && <div className="editorial-error">{localError}</div>}
      </div>

      <div className="task-editor-actions editorial-editor-actions-v5">
        {item ? <button type="button" className="danger-button" disabled={saving} onClick={()=>void removeItem()}><Trash2 size={15}/> Elimina</button> : <span/>}
        <div>
          <button type="button" className="secondary-button" onClick={()=>void closeEditor()} disabled={saving}>Chiudi</button>
          {!item && <button className="primary-button" disabled={saving || !draft.title.trim() || !draft.platforms.length}>{saving ? 'Creazione…' : 'Aggiungi'}</button>}
        </div>
      </div>
    </form>
  </div>
}
