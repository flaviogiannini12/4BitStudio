import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Archive, Check, Download, File, FileImage, FileVideo, Paperclip, Trash2, Upload, X } from 'lucide-react'
import {
  editorialAccountLabel,
  editorialPlatformLabel,
  editorialStatusLabel,
} from '../lib/editorialConfig'
import { memberToneClass } from '../lib/memberTone'
import type { useEditorial } from '../hooks/useEditorial'
import type { EditorialAccount, EditorialAsset, EditorialData, EditorialItem, EditorialPlatform, EditorialStatus } from '../types/editorial'
import type { TeamMember } from '../types/studio'

type Actions = ReturnType<typeof useEditorial>['actions']
type QueuedFile = { id:string; file:File }

const PLATFORM_ORDER: EditorialPlatform[] = ['facebook','tiktok','youtube','whatsapp']
const ACTIVE_STATUS_ORDER: EditorialStatus[] = ['to_produce','ready']

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

export function EditorialItemModal({
  open,
  item,
  initialDate,
  data,
  members,
  actions,
  onClose,
}: {
  open:boolean
  item:EditorialItem | null
  initialDate:string | null
  data:EditorialData
  members:TeamMember[]
  actions:Actions
  onClose:()=>void
}) {
  const initial=useMemo(()=>({
    account:item?.account ?? 'casaro' as EditorialAccount,
    platforms:item?.platforms?.length ? item.platforms : ['facebook'] as EditorialPlatform[],
    title:item?.title ?? '',
    description:item?.description ?? '',
    status:item?.status ?? 'to_produce' as EditorialStatus,
    publishDate:item?.publishDate ?? initialDate ?? todayISO(),
    publishTime:item?.publishTime ?? '18:00',
  }),[item,initialDate])

  const [draft,setDraft]=useState(initial)
  const [queued,setQueued]=useState<QueuedFile[]>([])
  const [saving,setSaving]=useState(false)
  const [uploadProgress,setUploadProgress]=useState<{name:string;value:number}|null>(null)
  const [localError,setLocalError]=useState<string|null>(null)
  const formRef=useRef<HTMLFormElement>(null)

  const steps=useMemo(()=>item ? data.steps.filter(step=>step.editorialItemId===item.id).sort((a,b)=>a.sortOrder-b.sortOrder) : [],[data.steps,item])
  const assets=useMemo(()=>item ? data.assets.filter(asset=>asset.editorialItemId===item.id) : [],[data.assets,item])

  useEffect(()=>{
    if(!open) return
    setDraft(initial)
    setQueued([])
    setUploadProgress(null)
    setLocalError(null)
  },[open,initial])

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

  function togglePlatform(platform:EditorialPlatform) {
    const active=draft.platforms.includes(platform)
    if(active && draft.platforms.length===1) return
    setDraft({...draft,platforms:active ? draft.platforms.filter(value=>value!==platform) : [...draft.platforms,platform]})
  }

  function addFiles(files:FileList|null) {
    if(!files?.length) return
    setQueued(current=>[...current,...Array.from(files).map(file=>({id:crypto.randomUUID(),file}))])
  }

  async function submit(event:FormEvent) {
    event.preventDefault()
    if(!draft.title.trim() || !draft.platforms.length) return
    setSaving(true)
    setLocalError(null)
    try{
      const payload={
        account:draft.account,
        platforms:draft.platforms,
        title:draft.title.trim(),
        description:draft.description.trim(),
        status:draft.status,
        publishDate:draft.publishDate || todayISO(),
        publishTime:draft.publishTime || '18:00',
      }

      const saved=item
        ? await actions.updateItem(item.id,payload)
        : await actions.createItem({...payload,sortOrder:Date.now()})

      for(const queuedFile of queued){
        setUploadProgress({name:queuedFile.file.name,value:0})
        await actions.uploadAsset(saved.id,queuedFile.file,'contenuto',value=>setUploadProgress({name:queuedFile.file.name,value}))
      }
      setUploadProgress(null)
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
    <form ref={formRef} onSubmit={submit} className="task-editor-panel editorial-editor-panel-v3">
      <div className="task-editor-head editorial-editor-head-v3">
        <div>
          <p className="eyebrow">{item ? 'Modifica contenuto' : 'Nuovo contenuto'}</p>
          <h2>{item ? item.title : 'Contenuto social'}</h2>
        </div>
        <button type="button" className="icon-button" onClick={onClose} disabled={saving}><X size={18}/></button>
      </div>

      <div className="task-editor-body editorial-form-v3">
        <div className="editorial-choice-block">
          <span className="editorial-choice-label">Profilo</span>
          <div className="editorial-choice-chips account-choice-chips">
            {(Object.entries(editorialAccountLabel) as [EditorialAccount,string][]).map(([value,label])=><button
              type="button"
              key={value}
              className={`editorial-choice-chip account-chip account-${value} ${draft.account===value?'active':''}`}
              onClick={()=>setDraft({...draft,account:value})}
            >{label}</button>)}
          </div>
        </div>

        <textarea
          autoFocus
          rows={2}
          className="field task-editor-title editorial-title-field-v3"
          placeholder="Titolo del contenuto"
          value={draft.title}
          onChange={e=>setDraft({...draft,title:e.target.value})}
        />

        <div className="editorial-choice-block">
          <span className="editorial-choice-label">Canali</span>
          <div className="editorial-choice-chips platform-choice-chips">
            {PLATFORM_ORDER.map(platform=><button
              type="button"
              key={platform}
              className={`editorial-choice-chip platform-choice platform-${platform} ${draft.platforms.includes(platform)?'active':''}`}
              onClick={()=>togglePlatform(platform)}
            >{editorialPlatformLabel[platform]}</button>)}
          </div>
        </div>

        <div className="editorial-choice-block">
          <span className="editorial-choice-label">Stato</span>
          <div className="editorial-choice-chips status-choice-chips">
            {ACTIVE_STATUS_ORDER.map(status=><button
              type="button"
              key={status}
              className={`editorial-choice-chip status-choice status-${status} ${draft.status===status?'active':''}`}
              onClick={()=>setDraft({...draft,status})}
            >{editorialStatusLabel[status]}</button>)}
          </div>
        </div>

        <div className="task-editor-grid editorial-date-grid-v3">
          <label className="form-field"><span>Data pubblicazione</span><input className="field" type="date" min={todayISO()} value={draft.publishDate} onChange={e=>setDraft({...draft,publishDate:e.target.value})}/></label>
          <label className="form-field"><span>Ora</span><input className="field" type="time" value={draft.publishTime} onChange={e=>setDraft({...draft,publishTime:e.target.value})}/></label>
        </div>

        <label className="form-field editorial-description-field-v3">
          <span>Descrizione contenuto</span>
          <textarea className="field" rows={4} value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})} placeholder="Descrivi cosa deve essere realizzato e le indicazioni utili al team."/>
        </label>

        <section className="editorial-upload-zone-v3">
          <div className="editorial-upload-zone-head">
            <div><strong>Contenuto</strong><span>Foto, grafica o video originale · nessuna compressione</span></div>
            <label className="editorial-upload-button"><Upload size={14}/> Allega<input type="file" multiple onChange={e=>{addFiles(e.target.files);e.currentTarget.value=''}}/></label>
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

            {!assets.length && !queued.length && <label className="editorial-assets-empty editorial-assets-drop editorial-assets-drop-v3">
              <Paperclip size={18}/>
              <span>Seleziona il contenuto da allegare</span>
              <input type="file" multiple onChange={e=>{addFiles(e.target.files);e.currentTarget.value=''}}/>
            </label>}
          </div>

          {uploadProgress && <div className="editorial-upload-progress">
            <div><span>{uploadProgress.name}</span><strong>{uploadProgress.value}%</strong></div>
            <span><i style={{width:`${uploadProgress.value}%`}}/></span>
          </div>}
        </section>

        {item && steps.length>0 && <section className="editorial-team-section-v4">
          <div className="editorial-team-section-title">Team</div>
          <div className="editorial-team-checks">
            {steps.map(step=>{
              const owner=members.find(member=>member.id===step.ownerMemberId)
              const name=owner?.name ?? step.label
              return <button type="button" key={step.id} className={`editorial-team-check ${memberToneClass(name)} ${step.done?'done':'pending'}`} onClick={()=>void actions.setStepDone(step.id,!step.done)}>
                <span className="editorial-step-check">{step.done && <Check size={12}/>}</span>
                <span><strong>{name}</strong><small>{step.done?'Completato':'Da fare'}</small></span>
              </button>
            })}
          </div>
        </section>}

        {draft.status==='published' && <div className="editorial-archive-notice"><Archive size={16}/><span>Quando salvi come <strong>Pubblicato</strong>, il contenuto passa automaticamente nell’Archivio.</span></div>}
        {localError && <div className="editorial-error">{localError}</div>}
      </div>

      <div className="task-editor-actions editorial-editor-actions-v3">
        {item ? <button type="button" className="danger-button" disabled={saving} onClick={()=>void removeItem()}><Trash2 size={15}/> Elimina</button> : <span/>}
        <div>
          <button type="button" className="secondary-button" onClick={onClose} disabled={saving}>Annulla</button>
          <button className="primary-button" disabled={saving || !draft.title.trim() || !draft.platforms.length}>{saving ? uploadProgress ? `Upload ${uploadProgress.value}%` : 'Salvataggio…' : item ? 'Salva' : 'Aggiungi'}</button>
        </div>
      </div>
    </form>
  </div>
}
