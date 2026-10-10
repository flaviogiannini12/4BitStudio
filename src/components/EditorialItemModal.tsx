import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Archive, Check, Copy, Download, File, FileImage, FileVideo, Paperclip, Trash2, Upload, X } from 'lucide-react'
import {
  editorialAccountLabel,
  editorialPlatformLabel,
  isAutomaticEditorialStep,
  statusLabelForItem,
} from '../lib/editorialConfig'
import { memberToneClass } from '../lib/memberTone'
import type { useEditorial } from '../hooks/useEditorial'
import type {
  EditorialAccount,
  EditorialAsset,
  EditorialData,
  EditorialItem,
  EditorialMediaKind,
  EditorialPlatform,
} from '../types/editorial'
import type { TeamMember } from '../types/studio'

type Actions = ReturnType<typeof useEditorial>['actions']
type QueuedFile = { id:string; file:File }
type EditorialDraft = {
  accounts: EditorialAccount[]
  platforms: EditorialPlatform[]
  mediaKind: EditorialMediaKind
  title: string
  description: string
  publishDate: string
  publishTime: string
}

const PLATFORM_ORDER: EditorialPlatform[] = ['facebook','tiktok','youtube','whatsapp']
const EDITORIAL_DRAFT_KEY = '4bit-editorial-draft-v1'
let editorialDraftFiles: QueuedFile[] = []

function readEditorialDraft(): EditorialDraft | null {
  try {
    const raw=window.localStorage.getItem(EDITORIAL_DRAFT_KEY)
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
      publishDate:typeof parsed.publishDate==='string' && parsed.publishDate ? parsed.publishDate : todayISO(),
      publishTime:typeof parsed.publishTime==='string' && parsed.publishTime ? parsed.publishTime : '18:00',
    }
  } catch {
    return null
  }
}

function writeEditorialDraft(draft: EditorialDraft) {
  try {
    window.localStorage.setItem(EDITORIAL_DRAFT_KEY,JSON.stringify(draft))
  } catch {
    // La bozza resta comunque nello stato React della sessione corrente.
  }
}

function clearEditorialDraft() {
  try { window.localStorage.removeItem(EDITORIAL_DRAFT_KEY) } catch {}
  editorialDraftFiles=[]
}

function todayISO() {
  const now=new Date()
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
}

function bytes(value:number) {
  if(value < 1024) return `${value} B`
  if(value < 1024*1024) return `${(value/1024).toFixed(1)} KB`
  if(value < 1024*1024*1024) return `${(value/1024/1024).toFixed(1)} MB`
  return `${(value/1024/1024/1024).toFixed(2)} GB`
}

function assetIcon(asset:Pick<EditorialAsset,'mimeType'>) {
  if(asset.mimeType.startsWith('image/')) return FileImage
  if(asset.mimeType.startsWith('video/')) return FileVideo
  return File
}

function statusClass(status:string) {
  if(status==='published') return 'published'
  if(status==='ready') return 'ready'
  if(status==='review') return 'review'
  return 'produce'
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
    publishDate:item?.publishDate ?? initialDate ?? todayISO(),
    publishTime:item?.publishTime ?? '18:00',
  }),[item,initialDate])

  const [draft,setDraft]=useState(initial)
  const [queued,setQueued]=useState<QueuedFile[]>([])
  const [saving,setSaving]=useState(false)
  const [uploadProgress,setUploadProgress]=useState<{name:string;value:number}|null>(null)
  const [localError,setLocalError]=useState<string|null>(null)
  const [descriptionCopied,setDescriptionCopied]=useState(false)
  const [draftSaved,setDraftSaved]=useState(false)
  const formRef=useRef<HTMLFormElement>(null)

  const steps=useMemo(()=>item ? data.steps.filter(step=>step.editorialItemId===item.id).sort((a,b)=>a.sortOrder-b.sortOrder) : [],[data.steps,item])
  const assets=useMemo(()=>item ? data.assets.filter(asset=>asset.editorialItemId===item.id) : [],[data.assets,item])

  useEffect(()=>{
    if(!open) return
    if(item) {
      setDraft(initial)
      setQueued([])
    } else {
      const saved=readEditorialDraft()
      setDraft(saved ?? initial)
      setQueued(editorialDraftFiles)
      setDraftSaved(Boolean(saved))
    }
    setUploadProgress(null)
    setLocalError(null)
    setDescriptionCopied(false)
  },[open,initial,item])

  useEffect(()=>{
    if(!open || item) return
    writeEditorialDraft(draft)
    setDraftSaved(true)
  },[draft,item,open])

  useEffect(()=>{
    if(!open || item) return
    editorialDraftFiles=queued
  },[item,open,queued])

  useEffect(()=>{
    if(!open) return
    const handler=(event:KeyboardEvent)=>{
      if(event.key==='Escape' && !saving) onClose()
      if(event.key==='Enter' && (event.metaKey || event.ctrlKey)){
        event.preventDefault()
        formRef.current?.requestSubmit()
      }
    }
    document.addEventListener('keydown',handler)
    return ()=>document.removeEventListener('keydown',handler)
  },[open,onClose,saving])

  if(!open) return null

  const hasYoutube=draft.platforms.includes('youtube')
  const hasWhatsapp=draft.platforms.includes('whatsapp')
  const canUseWhatsapp=draft.accounts.length===1 && draft.accounts[0]==='casaro'
  const mediaLocked: EditorialMediaKind | null = hasYoutube ? 'video' : hasWhatsapp ? 'photo' : null
  const currentStatus=item?.status ?? 'to_produce'
  const accept=draft.mediaKind==='video' ? 'video/*' : 'image/*'

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
    if(active) {
      if(draft.platforms.length===1) return
      const next=draft.platforms.filter(value=>value!==platform)
      const nextKind=next.includes('youtube') ? 'video' : next.includes('whatsapp') ? 'photo' : draft.mediaKind
      setDraft({...draft,platforms:next,mediaKind:nextKind})
      return
    }

    let next=[...draft.platforms,platform]
    let nextKind=draft.mediaKind

    if(platform==='youtube') {
      next=next.filter(value=>value!=='whatsapp')
      nextKind='video'
    }
    if(platform==='whatsapp') {
      next=next.filter(value=>value!=='youtube')
      nextKind='photo'
    }

    setDraft({...draft,platforms:next,mediaKind:nextKind})
  }

  function setMediaKind(mediaKind:EditorialMediaKind) {
    if(mediaLocked) return
    setDraft({...draft,mediaKind})
  }

  function addFiles(files:FileList|null) {
    if(!files?.length) return
    const selected=Array.from(files)
    const invalid=selected.find(file=>draft.mediaKind==='video' ? !file.type.startsWith('video/') : !file.type.startsWith('image/'))
    if(invalid){
      setLocalError(draft.mediaKind==='video' ? 'Per questo contenuto puoi allegare un file video.' : 'Per questo contenuto puoi allegare un’immagine.')
      return
    }
    setLocalError(null)
    setQueued(current=>[...current,...selected.map(file=>({id:crypto.randomUUID(),file}))])
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

  async function submit(event:FormEvent) {
    event.preventDefault()
    if(!draft.title.trim() || !draft.platforms.length || !draft.accounts.length) return
    setSaving(true)
    setLocalError(null)
    try{
      const sharedPayload={
        platforms:draft.platforms,
        mediaKind:draft.mediaKind,
        title:draft.title.trim(),
        description:draft.description.trim(),
        publishDate:draft.publishDate || todayISO(),
        publishTime:draft.publishTime || '18:00',
      }

      const savedItems = item
        ? [await actions.updateItem(item.id,{...sharedPayload,account:draft.accounts[0]})]
        : await Promise.all(draft.accounts.map((account,index)=>
            actions.createItem({...sharedPayload,account,sortOrder:Date.now()+index})
          ))

      for(const saved of savedItems){
        for(const queuedFile of queued){
          setUploadProgress({name:queuedFile.file.name,value:0})
          await actions.uploadAsset(saved.id,queuedFile.file,'contenuto',value=>setUploadProgress({name:queuedFile.file.name,value}))
        }
      }
      setUploadProgress(null)
      if(!item) {
        clearEditorialDraft()
        setDraftSaved(false)
      }
      onClose()
    }catch(err){
      setLocalError(err instanceof Error ? err.message : 'Salvataggio non riuscito')
    }finally{
      setSaving(false)
    }
  }

  async function removeItem() {
    if(!item || !window.confirm(`Eliminare definitivamente "${item.title}" e tutti i relativi allegati?`)) return
    setSaving(true)
    try{
      await actions.deleteItem(item.id)
      onClose()
    }finally{
      setSaving(false)
    }
  }

  return <div className="task-editor-backdrop editorial-modal-backdrop">
    <button className="task-editor-scrim" onClick={()=>!saving && onClose()} aria-label="Chiudi"/>
    <form ref={formRef} onSubmit={submit} className="task-editor-panel editorial-editor-panel-v5">
      <div className="task-editor-head editorial-editor-head-v5">
        <div>
          <p className="eyebrow">{item ? 'Modifica contenuto' : 'Nuovo contenuto'}</p>
          <h2>{item ? item.title : 'Contenuto social'}</h2>
          {!item && draftSaved && <span className="editorial-draft-saved"><Check size={11}/> Bozza salvata automaticamente</span>}
        </div>
        <button type="button" className="icon-button" onClick={onClose} disabled={saving}><X size={18}/></button>
      </div>

      <div className="task-editor-body editorial-form-v5">
        <div className="editorial-choice-block">
          <span className="editorial-choice-label">Profilo{item ? '' : ' · puoi selezionarne più di uno'}</span>
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

        <div className="editorial-auto-state">
          <span>Stato automatico</span>
          <b className={`editorial-status-chip ${statusClass(currentStatus)}`}>{statusLabelForItem(currentStatus,draft.platforms)}</b>
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

        <section className="editorial-upload-zone-v5">
          <div className="editorial-upload-zone-head">
            <div><strong>Contenuto</strong><span>{draft.mediaKind==='video'?'Video originale':'Foto / grafica originale'} · nessuna compressione</span></div>
            <label className="editorial-upload-button"><Upload size={14}/> Allega<input type="file" accept={accept} multiple onChange={e=>{addFiles(e.target.files);e.currentTarget.value=''}}/></label>
          </div>

          <div className="editorial-assets-list">
            {assets.map(asset=>{
              const Icon=assetIcon(asset)
              return <div className="editorial-asset-row" key={asset.id}>
                <span className="editorial-asset-icon"><Icon size={17}/></span>
                <button type="button" className="editorial-asset-name" onClick={()=>void actions.openAsset(asset)}><strong>{asset.fileName}</strong><small>{bytes(asset.sizeBytes)}</small></button>
                <button type="button" className="icon-button" title="Scarica originale" onClick={()=>void actions.downloadAsset(asset)}><Download size={14}/></button>
                <button type="button" className="icon-button danger-mini" title="Elimina" onClick={()=>window.confirm('Eliminare questo allegato?') && void actions.deleteAsset(asset)}><Trash2 size={14}/></button>
              </div>
            })}

            {queued.map(file=><div className="editorial-asset-row queued editorial-asset-row-v2" key={file.id}>
              <span className="editorial-asset-icon"><Paperclip size={17}/></span>
              <div className="editorial-asset-name"><strong>{file.file.name}</strong><small>{bytes(file.file.size)} · pronto per upload</small></div>
              <button type="button" className="icon-button" onClick={()=>setQueued(current=>current.filter(entry=>entry.id!==file.id))}><X size={14}/></button>
            </div>)}

            {!assets.length && !queued.length && <label className="editorial-assets-empty editorial-assets-drop editorial-assets-drop-v5">
              <Paperclip size={18}/>
              <span>{draft.mediaKind==='video'?'Seleziona il video':'Seleziona la foto o grafica'}</span>
              <input type="file" accept={accept} multiple onChange={e=>{addFiles(e.target.files);e.currentTarget.value=''}}/>
            </label>}
          </div>

          {uploadProgress && <div className="editorial-upload-progress">
            <div><span>{uploadProgress.name}</span><strong>{uploadProgress.value}%</strong></div>
            <span><i style={{width:`${uploadProgress.value}%`}}/></span>
          </div>}
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
              const automatic=isAutomaticEditorialStep(step.label)
              const willPublish = !step.done
                && ['Pubblicazione social','WhatsApp · Invio'].includes(step.label)
                && steps.every(other=>other.id===step.id || other.done)
              return <button
                type="button"
                key={step.id}
                disabled={automatic}
                className={`editorial-check-row ${memberToneClass(name)} ${step.done?'done':'pending'} ${automatic?'automatic':''}`}
                onClick={()=>{
                  if(automatic) return
                  if(willPublish) onCelebrate()
                  void actions.setStepDone(step.id,!step.done)
                }}
              >
                <span className="editorial-step-check">{step.done && <Check size={12}/>}</span>
                <span className="editorial-check-copy"><strong>{step.label}</strong><small>{name}</small></span>
                <span className="editorial-check-state">{step.done?'Fatto':automatic?'Automatico':'Da fare'}</span>
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
          <button type="button" className="secondary-button" onClick={onClose} disabled={saving}>Annulla</button>
          <button className="primary-button" disabled={saving || !draft.title.trim() || !draft.platforms.length}>{saving ? uploadProgress ? `Upload ${uploadProgress.value}%` : 'Salvataggio…' : item ? 'Salva' : 'Aggiungi'}</button>
        </div>
      </div>
    </form>
  </div>
}
