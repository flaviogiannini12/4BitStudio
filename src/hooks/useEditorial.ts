import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import {
  createEditorialItem,
  deleteEditorialAsset,
  deleteEditorialItem,
  downloadEditorialAsset,
  loadEditorialData,
  openEditorialAsset,
  setEditorialStepDone,
  rebuildEditorialSteps,
  updateEditorialItem,
  uploadEditorialAsset,
} from '../lib/editorialRepository'
import type { EditorialAsset, EditorialData, EditorialItem, EditorialItemInput } from '../types/editorial'
import type { TeamMember } from '../types/studio'

const emptyData: EditorialData = { items:[], steps:[], assets:[] }

export function useEditorial(user: User | null, members: TeamMember[]) {
  const [data,setData]=useState<EditorialData>(emptyData)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState<string | null>(null)
  const reloadTimer=useRef<number | null>(null)

  const reload=useCallback(async (silent=false)=>{
    if(!user) return
    if(!silent) setLoading(true)
    try{
      setData(await loadEditorialData())
      setError(null)
    }catch(err){
      setError(err instanceof Error ? err.message : 'Errore Piano Editoriale')
    }finally{
      if(!silent) setLoading(false)
    }
  },[user])

  const scheduleReload=useCallback(()=>{
    if(reloadTimer.current!==null) window.clearTimeout(reloadTimer.current)
    reloadTimer.current=window.setTimeout(()=>{
      reloadTimer.current=null
      void reload(true)
    },120)
  },[reload])

  useEffect(()=>{
    if(!user || !supabase) return
    void reload()

    const channel=supabase.channel(`editorial-${user.id}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'editorial_items'},scheduleReload)
      .on('postgres_changes',{event:'*',schema:'public',table:'editorial_steps'},scheduleReload)
      .on('postgres_changes',{event:'*',schema:'public',table:'editorial_assets'},scheduleReload)
      .subscribe(status=>{
        if(status==='CHANNEL_ERROR' || status==='TIMED_OUT') scheduleReload()
      })

    const onVisibility=()=>{ if(document.visibilityState==='visible') scheduleReload() }
    const refresh=()=>scheduleReload()
    window.addEventListener('focus',refresh)
    window.addEventListener('online',refresh)
    window.addEventListener('pageshow',refresh)
    document.addEventListener('visibilitychange',onVisibility)

    return ()=>{
      if(reloadTimer.current!==null) window.clearTimeout(reloadTimer.current)
      window.removeEventListener('focus',refresh)
      window.removeEventListener('online',refresh)
      window.removeEventListener('pageshow',refresh)
      document.removeEventListener('visibilitychange',onVisibility)
      void supabase.removeChannel(channel)
    }
  },[reload,scheduleReload,user])

  async function protect<T>(action:()=>Promise<T>) {
    try{
      setError(null)
      return await action()
    }catch(err){
      setError(err instanceof Error ? err.message : 'Operazione editoriale non riuscita')
      throw err
    }
  }

  const actions=useMemo(()=>({
    async createItem(input:EditorialItemInput) {
      return protect(async()=>{
        const item=await createEditorialItem(input,members)
        await reload(true)
        return item
      })
    },
    async updateItem(id:string,input:Partial<EditorialItem>) {
      return protect(async()=>{
        const previous=data.items.find(item=>item.id===id)
        const item=await updateEditorialItem(id,input)
        const workflowChanged = previous && (
          previous.account !== item.account ||
          previous.mediaKind !== item.mediaKind ||
          previous.platforms.join('|') !== item.platforms.join('|')
        )
        if(workflowChanged) await rebuildEditorialSteps(item,members)
        await reload(true)
        return item
      })
    },
    async deleteItem(id:string) {
      return protect(async()=>{
        await deleteEditorialItem(id)
        await reload(true)
      })
    },
    async setStepDone(id:string,done:boolean) {
      return protect(async()=>{
        await setEditorialStepDone(id,done)
        await reload(true)
      })
    },
    async uploadAsset(itemId:string,file:File,role:string,onProgress?:(value:number)=>void) {
      return protect(async()=>{
        const asset=await uploadEditorialAsset(itemId,file,role,onProgress)
        await reload(true)
        return asset
      })
    },
    async deleteAsset(asset:EditorialAsset) {
      return protect(async()=>{
        await deleteEditorialAsset(asset)
        await reload(true)
      })
    },
    openAsset:(asset:EditorialAsset)=>protect(()=>openEditorialAsset(asset)),
    downloadAsset:(asset:EditorialAsset)=>protect(()=>downloadEditorialAsset(asset)),
    reload,
  }),[data.items,members,reload])

  return {data,loading,error,actions,reload}
}
