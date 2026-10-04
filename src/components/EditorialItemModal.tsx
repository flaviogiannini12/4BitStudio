import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Archive, Check, Download, File, FileImage, FileVideo, Paperclip, Trash2, Upload, X } from 'lucide-react'
import {
  contentTypesByPlatform,
  editorialAccountLabel,
  editorialObjectives,
  editorialPlatformLabel,
  editorialStatusLabel,
  editorialStatusOrder,
  platformAllowedForAccount,
} from '../lib/editorialConfig'
import type { useEditorial } from '../hooks/useEditorial'
import type { EditorialAccount, EditorialAsset, EditorialData, EditorialItem, EditorialPlatform, EditorialStatus } from '../types/editorial'
import type { TeamMember } from '../types/studio'

type Actions = ReturnType<typeof useEditorial>['actions']

type QueuedFile = { id:string; file:File; role:string }

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

function inferRole(file:File) {
  if(file.type.startsWith('video/')) return 'video'
  if(file.type.startsWith('image/')) return 'grafica'
  if(/pdf|word|document|text/i.test(file.type)) return 'documento'
  return 'asset'
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
  const flavioId=useMemo(()=>members.find(m=>m.active && m.name.trim().toLowerCase()==='flavio')?.id ?? '',[members])
  const defaultSupport=useMemo(()=>members.filter(m=>['francesco','edoardo'].includes(m.name.trim().toLowerCase())).map(m=>m.id),[members])

  const initial=useMemo(()=>({
    account:item?.account ?? 'casaro' as EditorialAccount,
    platform:item?.platform ?? 'fb_ig' as EditorialPlatform,
    contentType:item?.contentType ?? 'Reel',
    title:item?.title ?? '',
    description:item?.description ?? '',
    hook:item?.hook ?? '',
    script:item?.script ?? '',
    caption:item?.caption ?? '',
    hashtags:item?.hashtags ?? '',
    cta:item?.cta ?? '',
    objective:item?.objective ?? '',
    status:item?.status ?? 'idea' as EditorialStatus,
    assigneeId:item?.assigneeId ?? flavioId,
    supportMemberIds:item?.supportMemberIds ?? defaultSupport,
    publishDate:item?.publishDate ?? initialDate ?? '',
    publishTime:item?.publishTime ?? '',
  }),[item,initialDate,flavioId,defaultSupport])

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

  function setAccount(account:EditorialAccount) {
    const platform=platformAllowedForAccount(account,draft.platform) ? draft.platform : 'fb_ig'
    const contentTypes=contentTypesByPlatform[platform]
    setDraft({...draft,account,platform,contentType:contentTypes.includes(draft.contentType) ? draft.contentType : contentTypes[0]})
  }

  function setPlatform(platform:EditorialPlatform) {
    if(!platformAllowedForAccount(draft.account,platform)) return
    const types=contentTypesByPlatform[platform]
    setDraft({...draft,platform,contentType:types.includes(draft.contentType) ? draft.contentType : types[0]})
  }

  function addFiles(files:FileList | null) {
    if(!files?.length) return
    setQueued(current=>[
      ...current,
      ...Array.from(files).map(file=>({id:crypto.randomUUID(),file,role:inferRole(file)})),
    ])
  }

  async function submit(event:FormEvent) {
    event.preventDefault()
    if(!draft.title.trim()) return
    setSaving(true)
    setLocalError(null)
    try{
      const payload={
        account:draft.account,
        platform:draft.platform,
        contentType:draft.contentType,
        title:draft.title.trim(),
        description:draft.description.trim(),
        hook:draft.hook.trim(),
        script:draft.script.trim(),
        caption:draft.caption.trim(),
        hashtags:draft.hashtags.trim(),
        cta:draft.cta.trim(),
        objective:draft.objective,
        status:draft.status,
        assigneeId:draft.assigneeId || null,
        supportMemberIds:draft.supportMemberIds,
        publishDate:draft.publishDate || null,
        publishTime:draft.publishTime || null,
      }

      const saved=item
        ? await actions.updateItem(item.id,payload)
        : await actions.createItem({...payload,sortOrder:Date.now()})

      for(const queuedFile of queued){
        setUploadProgress({name:queuedFile.file.name,value:0})
        await actions.uploadAsset(saved.id,queuedFile.file,queuedFile.role,value=>setUploadProgress({name:queuedFile.file.name,value}))
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
    if(!item || !window.confirm(`Eliminare definitivamente "${item.title}" e tutti i relativi asset?`)) return
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
    <form ref={formRef} onSubmit={submit} className="task-editor-panel editorial-editor-panel">
      <div className="task-editor-head editorial-editor-head">
        <div>
          <span className="editorial-modal-kicker">{item ? 'Contenuto editoriale' : 'Nuovo contenuto'}</span>
          <h2>{item ? item.title : 'Aggiungi al piano editoriale'}</h2>
        </div>
        <button type="button" className="icon-button" onClick={onClose} disabled={saving}><X size={18}/></button>
      </div>

      <div className="editorial-editor-scroll">
        <section className="editorial-form-section editorial-form-primary">
          <textarea
            autoFocus
            rows={2}
            className="field editorial-title-field"
            placeholder="Titolo / idea del contenuto"
            value={draft.title}
            onChange={e=>setDraft({...draft,title:e.target.value})}
          />

          <div className="editorial-form-grid four">
            <label className="form-field"><span>Account</span><select className="field" value={draft.account} onChange={e=>setAccount(e.target.value as EditorialAccount)}>
              {Object.entries(editorialAccountLabel).map(([value,label])=><option value={value} key={value}>{label}</option>)}
            </select></label>

            <label className="form-field"><span>Piattaforma</span><select className="field" value={draft.platform} onChange={e=>setPlatform(e.target.value as EditorialPlatform)}>
              {(Object.entries(editorialPlatformLabel) as [EditorialPlatform,string][]).filter(([platform])=>platformAllowedForAccount(draft.account,platform)).map(([value,label])=><option value={value} key={value}>{label}</option>)}
            </select></label>

            <label className="form-field"><span>Formato</span><select className="field" value={draft.contentType} onChange={e=>setDraft({...draft,contentType:e.target.value})}>
              {contentTypesByPlatform[draft.platform].map(type=><option value={type} key={type}>{type}</option>)}
            </select></label>

            <label className="form-field"><span>Stato</span><select className="field" value={draft.status} onChange={e=>setDraft({...draft,status:e.target.value as EditorialStatus})}>
              {editorialStatusOrder.map(status=><option value={status} key={status}>{editorialStatusLabel[status]}</option>)}
            </select></label>
          </div>

          <div className="editorial-form-grid four">
            <label className="form-field"><span>Data pubblicazione</span><input className="field" type="date" value={draft.publishDate} onChange={e=>setDraft({...draft,publishDate:e.target.value})}/></label>
            <label className="form-field"><span>Ora</span><input className="field" type="time" value={draft.publishTime} onChange={e=>setDraft({...draft,publishTime:e.target.value})}/></label>
            <label className="form-field"><span>Responsabile</span><select className="field" value={draft.assigneeId} onChange={e=>setDraft({...draft,assigneeId:e.target.value})}>
              <option value="">Non assegnato</option>
              {members.filter(m=>m.active).map(member=><option value={member.id} key={member.id}>{member.name}</option>)}
            </select></label>
            <label className="form-field"><span>Obiettivo</span><select className="field" value={draft.objective} onChange={e=>setDraft({...draft,objective:e.target.value})}>
              <option value="">Nessuno</option>
              {editorialObjectives.map(value=><option value={value} key={value}>{value}</option>)}
            </select></label>
          </div>

          <div className="editorial-support-field">
            <span>Supporto</span>
            <div>
              {members.filter(m=>m.active).map(member=>{
                const active=draft.supportMemberIds.includes(member.id)
                return <button type="button" key={member.id} className={active ? 'active' : ''} onClick={()=>setDraft({...draft,supportMemberIds:active ? draft.supportMemberIds.filter(id=>id!==member.id) : [...draft.supportMemberIds,member.id]})}>{member.name}</button>
              })}
            </div>
          </div>
        </section>

        <section className="editorial-form-section">
          <div className="editorial-section-title"><h3>Contenuto</h3><span>Strategia, script e copy</span></div>
          <div className="editorial-form-grid two">
            <label className="form-field"><span>Hook</span><textarea className="field" rows={3} value={draft.hook} onChange={e=>setDraft({...draft,hook:e.target.value})} placeholder="Apertura / gancio del contenuto"/></label>
            <label className="form-field"><span>CTA</span><textarea className="field" rows={3} value={draft.cta} onChange={e=>setDraft({...draft,cta:e.target.value})} placeholder="Call to action"/></label>
          </div>
          <label className="form-field"><span>Script / struttura</span><textarea className="field" rows={5} value={draft.script} onChange={e=>setDraft({...draft,script:e.target.value})} placeholder="Script, scaletta, scene, indicazioni di produzione…"/></label>
          <label className="form-field"><span>Caption / copy</span><textarea className="field" rows={5} value={draft.caption} onChange={e=>setDraft({...draft,caption:e.target.value})} placeholder="Testo della pubblicazione"/></label>
          <div className="editorial-form-grid two">
            <label className="form-field"><span>Hashtag</span><textarea className="field" rows={3} value={draft.hashtags} onChange={e=>setDraft({...draft,hashtags:e.target.value})}/></label>
            <label className="form-field"><span>Note operative</span><textarea className="field" rows={3} value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})}/></label>
          </div>
        </section>

        {item && <section className="editorial-form-section">
          <div className="editorial-section-title"><h3>Workflow</h3><span>Divisione mansioni 4Bit</span></div>
          <div className="editorial-workflow-list">
            {steps.map(step=>{
              const owner=members.find(member=>member.id===step.ownerMemberId)
              return <button type="button" key={step.id} className={step.done ? 'done' : ''} onClick={()=>void actions.setStepDone(step.id,!step.done)}>
                <span className="editorial-step-check">{step.done && <Check size={12}/>}</span>
                <span><strong>{step.label}</strong><small>{owner?.name ?? 'Team'}</small></span>
              </button>
            })}
          </div>
        </section>}

        <section className="editorial-form-section">
          <div className="editorial-section-title">
            <div><h3>Asset</h3><span>File originali · nessuna compressione</span></div>
            <label className="editorial-upload-button"><Upload size={14}/> Carica<input type="file" multiple onChange={e=>{addFiles(e.target.files); e.currentTarget.value=''}}/></label>
          </div>

          <div className="editorial-assets-list">
            {assets.map(asset=>{
              const Icon=assetIcon(asset)
              return <div className="editorial-asset-row" key={asset.id}>
                <span className="editorial-asset-icon"><Icon size={17}/></span>
                <button type="button" className="editorial-asset-name" onClick={()=>void actions.openAsset(asset)}><strong>{asset.fileName}</strong><small>{bytes(asset.sizeBytes)} · {asset.assetRole}</small></button>
                <button type="button" className="icon-button" title="Scarica originale" onClick={()=>void actions.downloadAsset(asset)}><Download size={14}/></button>
                <button type="button" className="icon-button danger-mini" title="Elimina asset" onClick={()=>window.confirm('Eliminare questo asset?') && void actions.deleteAsset(asset)}><Trash2 size={14}/></button>
              </div>
            })}

            {queued.map(file=><div className="editorial-asset-row queued" key={file.id}>
              <span className="editorial-asset-icon"><Paperclip size={17}/></span>
              <div className="editorial-asset-name"><strong>{file.file.name}</strong><small>{bytes(file.file.size)} · pronto per upload</small></div>
              <select value={file.role} onChange={e=>setQueued(current=>current.map(entry=>entry.id===file.id ? {...entry,role:e.target.value} : entry))}>
                <option value="grafica">Grafica</option><option value="video">Video</option><option value="cover">Cover</option><option value="sorgente">Sorgente</option><option value="documento">Documento</option><option value="asset">Altro</option>
              </select>
              <button type="button" className="icon-button" onClick={()=>setQueued(current=>current.filter(entry=>entry.id!==file.id))}><X size={14}/></button>
            </div>)}

            {!assets.length && !queued.length && <div className="editorial-assets-empty"><Paperclip size={18}/><span>Allega grafica, video, cover o file di produzione.</span></div>}
          </div>

          {uploadProgress && <div className="editorial-upload-progress">
            <div><span>{uploadProgress.name}</span><strong>{uploadProgress.value}%</strong></div>
            <span><i style={{width:`${uploadProgress.value}%`}}/></span>
          </div>}
        </section>

        {draft.status==='published' && <div className="editorial-archive-notice"><Archive size={16}/><span>Salvando come <strong>Pubblicato</strong> il contenuto passerà automaticamente nello storico.</span></div>}
        {localError && <div className="editorial-error">{localError}</div>}
      </div>

      <div className="task-editor-actions editorial-editor-actions">
        {item ? <button type="button" className="danger-button" disabled={saving} onClick={()=>void removeItem()}><Trash2 size={15}/> Elimina</button> : <span/>}
        <div>
          <button type="button" className="secondary-button" onClick={onClose} disabled={saving}>Annulla</button>
          <button className="primary-button" disabled={saving || !draft.title.trim()}>{saving ? uploadProgress ? `Upload ${uploadProgress.value}%` : 'Salvataggio…' : item ? 'Salva modifiche' : 'Aggiungi contenuto'}</button>
        </div>
      </div>
    </form>
  </div>
}
