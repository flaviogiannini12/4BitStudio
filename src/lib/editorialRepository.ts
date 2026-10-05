import * as tus from 'tus-js-client'
import { supabase, supabaseProjectId, supabasePublishableKey } from './supabase'
import type {
  EditorialAsset,
  EditorialData,
  EditorialItem,
  EditorialItemInput,
  EditorialMediaKind,
  EditorialPlatform,
  EditorialStep,
} from '../types/editorial'
import type { TeamMember } from '../types/studio'
import {
  editorialWorkflow,
  isAutomaticEditorialStep,
  legacyPlatform,
  memberIdByName,
} from './editorialConfig'

const BUCKET = 'editorial-assets'

function client() {
  if (!supabase) throw new Error('Supabase non configurato')
  return supabase
}

async function currentContext() {
  const db = client()
  const [{ data: userData, error: userError }, { data: membership, error: membershipError }] = await Promise.all([
    db.auth.getUser(),
    db.from('workspace_members').select('workspace_id').limit(1).single(),
  ])
  if (userError) throw userError
  if (membershipError) throw membershipError
  if (!userData.user) throw new Error('Accesso richiesto')
  if (!membership?.workspace_id) throw new Error('Workspace 4Bit non collegato')
  return { user: userData.user, workspaceId: membership.workspace_id as string }
}

function platformsFromRow(row:any): EditorialPlatform[] {
  if (Array.isArray(row.platforms) && row.platforms.length) return row.platforms as EditorialPlatform[]
  if (row.platform === 'tiktok') return ['tiktok']
  if (row.platform === 'youtube') return ['youtube']
  if (row.platform === 'whatsapp') return ['whatsapp']
  return ['facebook']
}

function mediaKindFromRow(row:any): EditorialMediaKind {
  return row.media_kind === 'video' ? 'video' : 'photo'
}

const fromItem = (r:any): EditorialItem => ({
  id:r.id,
  workspaceId:r.workspace_id,
  account:r.account,
  platforms:platformsFromRow(r),
  mediaKind:mediaKindFromRow(r),
  title:r.title,
  description:r.description ?? '',
  status:r.status,
  publishDate:r.publish_date ?? null,
  publishTime:r.publish_time ? String(r.publish_time).slice(0,5) : null,
  publishedAt:r.published_at ?? null,
  archivedAt:r.archived_at ?? null,
  sortOrder:Number(r.sort_order ?? 0),
  createdAt:r.created_at,
  updatedAt:r.updated_at,
})

const fromStep = (r:any): EditorialStep => ({
  id:r.id,
  workspaceId:r.workspace_id,
  editorialItemId:r.editorial_item_id,
  label:r.label,
  ownerMemberId:r.owner_member_id ?? null,
  done:Boolean(r.done),
  sortOrder:Number(r.sort_order ?? 0),
  createdAt:r.created_at,
})

const fromAsset = (r:any): EditorialAsset => ({
  id:r.id,
  workspaceId:r.workspace_id,
  editorialItemId:r.editorial_item_id,
  fileName:r.file_name,
  storagePath:r.storage_path,
  mimeType:r.mime_type ?? 'application/octet-stream',
  sizeBytes:Number(r.size_bytes ?? 0),
  assetRole:r.asset_role ?? 'asset',
  uploadedBy:r.uploaded_by,
  createdAt:r.created_at,
})

export async function loadEditorialData(): Promise<EditorialData> {
  const db=client()
  const [items,steps,assets]=await Promise.all([
    db.from('editorial_items').select('*').order('publish_date',{ascending:true}).order('sort_order',{ascending:true}),
    db.from('editorial_steps').select('*').order('sort_order',{ascending:true}),
    db.from('editorial_assets').select('*').order('created_at',{ascending:true}),
  ])
  if(items.error) throw items.error
  if(steps.error) throw steps.error
  if(assets.error) throw assets.error
  return {
    items:(items.data ?? []).map(fromItem),
    steps:(steps.data ?? []).map(fromStep),
    assets:(assets.data ?? []).map(fromAsset),
  }
}

async function insertWorkflow(item: EditorialItem, members: TeamMember[], previous?: Map<string,boolean>) {
  const db=client()
  const {workspaceId}=await currentContext()
  const templates=editorialWorkflow(item.platforms,item.mediaKind)
  if(!templates.length) return

  const {error}=await db.from('editorial_steps').insert(templates.map((step,index)=>({
    workspace_id:workspaceId,
    editorial_item_id:item.id,
    label:step.label,
    owner_member_id:memberIdByName(members,step.ownerName),
    done:step.done || previous?.get(step.label) === true,
    sort_order:index,
  })))
  if(error) throw error
}

async function syncEditorialAutomation(itemId:string) {
  const db=client()
  const [
    {data:itemRow,error:itemError},
    {data:assetRows,error:assetError},
    {data:stepRows,error:stepError},
  ]=await Promise.all([
    db.from('editorial_items').select('id,platforms,platform,media_kind,status').eq('id',itemId).single(),
    db.from('editorial_assets').select('id').eq('editorial_item_id',itemId),
    db.from('editorial_steps').select('id,label,done').eq('editorial_item_id',itemId).order('sort_order',{ascending:true}),
  ])

  if(itemError) throw itemError
  if(assetError) throw assetError
  if(stepError) throw stepError

  const hasAsset=(assetRows ?? []).length>0
  const steps=(stepRows ?? []).map(row=>({
    id:String(row.id),
    label:String(row.label),
    done:Boolean(row.done),
  }))

  for(const step of steps) {
    let desired: boolean | null = null
    if(['Ideazione / Script social','WhatsApp · Ideazione'].includes(step.label)) desired=true
    if(['Video editing social','Photo editing / Grafiche social','WhatsApp · Preparazione contenuto'].includes(step.label)) desired=hasAsset
    if(desired !== null && desired !== step.done) {
      const {error}=await db.from('editorial_steps').update({done:desired}).eq('id',step.id)
      if(error) throw error
      step.done=desired
    }
  }

  const copySteps=steps.filter(step=>['Description / Copy social','WhatsApp · Copy'].includes(step.label))
  const editingSteps=steps.filter(step=>['Video editing social','Photo editing / Grafiche social','WhatsApp · Preparazione contenuto'].includes(step.label))
  const publicationSteps=steps.filter(step=>['Pubblicazione social','WhatsApp · Invio'].includes(step.label))

  const editingDone=editingSteps.length===0 || editingSteps.every(step=>step.done)
  const copyDone=copySteps.length===0 || copySteps.every(step=>step.done)
  const publicationDone=publicationSteps.length>0 && publicationSteps.every(step=>step.done)

  const nextStatus = publicationDone
    ? 'published'
    : !editingDone
      ? 'to_produce'
      : !copyDone
        ? 'review'
        : 'ready'

  if(itemRow.status !== nextStatus) {
    const {error}=await db.from('editorial_items').update({status:nextStatus}).eq('id',itemId)
    if(error) throw error
  }
}

export async function createEditorialItem(input: EditorialItemInput, members: TeamMember[]) {
  const db=client()
  const {user,workspaceId}=await currentContext()
  const platforms: EditorialPlatform[] = input.platforms.length ? input.platforms : ['facebook']
  if (input.account === 'autoscuola_susa' && platforms.includes('whatsapp')) {
    throw new Error('WhatsApp è disponibile solo per l’account Casaro.')
  }
  const mediaKind: EditorialMediaKind = input.mediaKind === 'video' ? 'video' : 'photo'

  const {data,error}=await db.from('editorial_items').insert({
    workspace_id:workspaceId,
    owner_id:user.id,
    account:input.account,
    platform:legacyPlatform(platforms),
    platforms,
    media_kind:mediaKind,
    content_type:mediaKind === 'video' ? 'Video' : 'Foto',
    title:input.title,
    description:input.description ?? '',
    hook:'',
    script:'',
    caption:'',
    hashtags:'',
    cta:'',
    objective:'',
    status:'to_produce',
    assignee_id:null,
    support_member_ids:[],
    publish_date:input.publishDate || new Date().toISOString().slice(0,10),
    publish_time:input.publishTime || '18:00',
    sort_order:input.sortOrder ?? Date.now(),
  }).select('*').single()
  if(error) throw error

  const item=fromItem(data)
  await insertWorkflow(item,members)
  await syncEditorialAutomation(item.id)
  return item
}

export async function updateEditorialItem(id:string,input:Partial<EditorialItem>) {
  const db=client()
  const payload:any={}
  if(input.account !== undefined) payload.account=input.account
  if(input.platforms !== undefined) {
    const platforms: EditorialPlatform[] = input.platforms.length ? input.platforms : ['facebook']
    if (input.account === 'autoscuola_susa' && platforms.includes('whatsapp')) {
      throw new Error('WhatsApp è disponibile solo per l’account Casaro.')
    }
    payload.platforms=platforms
    payload.platform=legacyPlatform(platforms)
  }
  if(input.mediaKind !== undefined) {
    payload.media_kind=input.mediaKind
    payload.content_type=input.mediaKind === 'video' ? 'Video' : 'Foto'
  }
  if(input.title !== undefined) payload.title=input.title
  if(input.description !== undefined) payload.description=input.description
  if(input.publishDate !== undefined) payload.publish_date=input.publishDate || null
  if(input.publishTime !== undefined) payload.publish_time=input.publishTime || '18:00'
  if(input.sortOrder !== undefined) payload.sort_order=input.sortOrder

  const {data,error}=await db.from('editorial_items').update(payload).eq('id',id).select('*').single()
  if(error) throw error
  return fromItem(data)
}

export async function setEditorialStepDone(id:string,done:boolean) {
  const db=client()
  const {data,error}=await db.from('editorial_steps').select('id,label,editorial_item_id').eq('id',id).single()
  if(error) throw error
  if(isAutomaticEditorialStep(String(data.label))) {
    await syncEditorialAutomation(String(data.editorial_item_id))
    const {data:fresh,error:freshError}=await db.from('editorial_steps').select('*').eq('id',id).single()
    if(freshError) throw freshError
    return fromStep(fresh)
  }

  const {data:updated,error:updateError}=await db.from('editorial_steps').update({done}).eq('id',id).select('*').single()
  if(updateError) throw updateError
  await syncEditorialAutomation(String(data.editorial_item_id))
  return fromStep(updated)
}

export async function deleteEditorialItem(id:string) {
  const db=client()
  const {data:assets,error:assetError}=await db.from('editorial_assets').select('storage_path').eq('editorial_item_id',id)
  if(assetError) throw assetError
  const paths=(assets ?? []).map(row=>row.storage_path).filter(Boolean)
  if(paths.length){
    const removed=await db.storage.from(BUCKET).remove(paths)
    if(removed.error) throw removed.error
  }
  const {error}=await db.from('editorial_items').delete().eq('id',id)
  if(error) throw error
}

function cleanName(name:string) {
  return name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'') || 'asset'
}

export async function uploadEditorialAsset(
  itemId:string,
  file:File,
  assetRole:string,
  onProgress?:(percentage:number)=>void,
) {
  const db=client()
  const {user,workspaceId}=await currentContext()
  const {data:{session}}=await db.auth.getSession()
  if(!session?.access_token) throw new Error('Sessione scaduta')

  const objectName=`${workspaceId}/${itemId}/${crypto.randomUUID()}-${cleanName(file.name)}`
  const endpoint=`https://${supabaseProjectId}.storage.supabase.co/storage/v1/upload/resumable`

  await new Promise<void>((resolve,reject)=>{
    const upload=new tus.Upload(file,{
      endpoint,
      retryDelays:[0,3000,5000,10000,20000],
      headers:{
        authorization:`Bearer ${session.access_token}`,
        apikey:supabasePublishableKey,
      },
      uploadDataDuringCreation:true,
      removeFingerprintOnSuccess:true,
      chunkSize:6*1024*1024,
      metadata:{
        bucketName:BUCKET,
        objectName,
        contentType:file.type || 'application/octet-stream',
        cacheControl:'3600',
      },
      onError:error=>reject(error),
      onProgress:(uploaded,total)=>onProgress?.(total ? Math.round((uploaded/total)*100) : 0),
      onSuccess:()=>resolve(),
    })
    upload.findPreviousUploads().then(previous=>{
      if(previous.length) upload.resumeFromPreviousUpload(previous[0])
      upload.start()
    }).catch(reject)
  })

  const {data,error}=await db.from('editorial_assets').insert({
    workspace_id:workspaceId,
    editorial_item_id:itemId,
    file_name:file.name,
    storage_path:objectName,
    mime_type:file.type || 'application/octet-stream',
    size_bytes:file.size,
    asset_role:assetRole || 'contenuto',
    uploaded_by:user.id,
  }).select('*').single()
  if(error) {
    await db.storage.from(BUCKET).remove([objectName])
    throw error
  }

  await syncEditorialAutomation(itemId)
  return fromAsset(data)
}

export async function deleteEditorialAsset(asset:EditorialAsset) {
  const db=client()
  const removed=await db.storage.from(BUCKET).remove([asset.storagePath])
  if(removed.error) throw removed.error
  const {error}=await db.from('editorial_assets').delete().eq('id',asset.id)
  if(error) throw error
  await syncEditorialAutomation(asset.editorialItemId)
}

export async function openEditorialAsset(asset:EditorialAsset) {
  const {data,error}=await client().storage.from(BUCKET).createSignedUrl(asset.storagePath,3600)
  if(error) throw error
  if(!data?.signedUrl) throw new Error('Impossibile aprire il file')
  window.open(data.signedUrl,'_blank','noopener,noreferrer')
}

export async function downloadEditorialAsset(asset:EditorialAsset) {
  const {data,error}=await client().storage.from(BUCKET).createSignedUrl(asset.storagePath,300,{download:asset.fileName})
  if(error) throw error
  if(!data?.signedUrl) throw new Error('Impossibile scaricare il file')
  window.open(data.signedUrl,'_blank','noopener,noreferrer')
}

export async function rebuildEditorialSteps(item:EditorialItem,members:TeamMember[]) {
  const db=client()
  const {data:existing,error:existingError}=await db.from('editorial_steps').select('label,done').eq('editorial_item_id',item.id)
  if(existingError) throw existingError
  const previous=new Map((existing ?? []).map(row=>[String(row.label),Boolean(row.done)]))

  const {error:deleteError}=await db.from('editorial_steps').delete().eq('editorial_item_id',item.id)
  if(deleteError) throw deleteError

  await insertWorkflow(item,members,previous)
  await syncEditorialAutomation(item.id)
}
