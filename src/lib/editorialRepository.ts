import * as tus from 'tus-js-client'
import { supabase, supabaseProjectId, supabasePublishableKey } from './supabase'
import type { EditorialAsset, EditorialData, EditorialItem, EditorialItemInput, EditorialStep } from '../types/editorial'
import type { TeamMember } from '../types/studio'
import { editorialWorkflow, memberIdByName } from './editorialConfig'

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

const fromItem = (r:any): EditorialItem => ({
  id:r.id,
  workspaceId:r.workspace_id,
  account:r.account,
  platform:r.platform,
  contentType:r.content_type ?? '',
  title:r.title,
  description:r.description ?? '',
  hook:r.hook ?? '',
  script:r.script ?? '',
  caption:r.caption ?? '',
  hashtags:r.hashtags ?? '',
  cta:r.cta ?? '',
  objective:r.objective ?? '',
  status:r.status,
  assigneeId:r.assignee_id ?? null,
  supportMemberIds:r.support_member_ids ?? [],
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

export async function createEditorialItem(input: EditorialItemInput, members: TeamMember[]) {
  const db=client()
  const {user,workspaceId}=await currentContext()
  const {data,error}=await db.from('editorial_items').insert({
    workspace_id:workspaceId,
    owner_id:user.id,
    account:input.account,
    platform:input.platform,
    content_type:input.contentType,
    title:input.title,
    description:input.description ?? '',
    hook:input.hook ?? '',
    script:input.script ?? '',
    caption:input.caption ?? '',
    hashtags:input.hashtags ?? '',
    cta:input.cta ?? '',
    objective:input.objective ?? '',
    status:input.status ?? 'idea',
    assignee_id:input.assigneeId ?? null,
    support_member_ids:input.supportMemberIds ?? [],
    publish_date:input.publishDate || null,
    publish_time:input.publishTime || null,
    sort_order:input.sortOrder ?? Date.now(),
  }).select('*').single()
  if(error) throw error

  const item=fromItem(data)
  const templates=editorialWorkflow(item.platform,item.contentType)
  if(templates.length){
    const {error:stepsError}=await db.from('editorial_steps').insert(templates.map((step,index)=>({
      workspace_id:workspaceId,
      editorial_item_id:item.id,
      label:step.label,
      owner_member_id:memberIdByName(members,step.ownerName),
      done:false,
      sort_order:index,
    })))
    if(stepsError) throw stepsError
  }
  return item
}

export async function updateEditorialItem(id:string,input:Partial<EditorialItem>) {
  const db=client()
  const payload:any={}
  if(input.account !== undefined) payload.account=input.account
  if(input.platform !== undefined) payload.platform=input.platform
  if(input.contentType !== undefined) payload.content_type=input.contentType
  if(input.title !== undefined) payload.title=input.title
  if(input.description !== undefined) payload.description=input.description
  if(input.hook !== undefined) payload.hook=input.hook
  if(input.script !== undefined) payload.script=input.script
  if(input.caption !== undefined) payload.caption=input.caption
  if(input.hashtags !== undefined) payload.hashtags=input.hashtags
  if(input.cta !== undefined) payload.cta=input.cta
  if(input.objective !== undefined) payload.objective=input.objective
  if(input.status !== undefined) payload.status=input.status
  if(input.assigneeId !== undefined) payload.assignee_id=input.assigneeId || null
  if(input.supportMemberIds !== undefined) payload.support_member_ids=input.supportMemberIds
  if(input.publishDate !== undefined) payload.publish_date=input.publishDate || null
  if(input.publishTime !== undefined) payload.publish_time=input.publishTime || null
  if(input.sortOrder !== undefined) payload.sort_order=input.sortOrder

  const {data,error}=await db.from('editorial_items').update(payload).eq('id',id).select('*').single()
  if(error) throw error
  return fromItem(data)
}

export async function setEditorialStepDone(id:string,done:boolean) {
  const {data,error}=await client().from('editorial_steps').update({done}).eq('id',id).select('*').single()
  if(error) throw error
  return fromStep(data)
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
    asset_role:assetRole || 'asset',
    uploaded_by:user.id,
  }).select('*').single()
  if(error) {
    await db.storage.from(BUCKET).remove([objectName])
    throw error
  }
  return fromAsset(data)
}

export async function deleteEditorialAsset(asset:EditorialAsset) {
  const db=client()
  const removed=await db.storage.from(BUCKET).remove([asset.storagePath])
  if(removed.error) throw removed.error
  const {error}=await db.from('editorial_assets').delete().eq('id',asset.id)
  if(error) throw error
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
