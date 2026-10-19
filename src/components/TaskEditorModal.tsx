import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { CalendarDays, ChevronDown, Trash2, UserRound, X } from 'lucide-react'
import { clientChipStyle } from '../lib/clientTone'
import { memberToneClass } from '../lib/memberTone'
import type { StudioData, Task } from '../types/studio'
import type { useStudio } from '../hooks/useStudio'

type Actions = ReturnType<typeof useStudio>['actions']

export function TaskEditorModal({
  open,
  task,
  initialDate,
  initialClientId,
  data,
  actions,
  onCelebrate,
  onClose,
}: {
  open: boolean
  task: Task | null
  initialDate: string | null
  initialClientId?: string | null
  data: StudioData
  actions: Actions
  onCelebrate?: () => void
  onClose: () => void
}) {
  const defaultFlavioId = useMemo(
    () => data.members.find(member => member.active && member.name.trim().toLowerCase() === 'flavio')?.id ?? '',
    [data.members],
  )

  const orderedClients = useMemo(
    () => [...data.clients]
      .filter(client => client.status !== 'archived' && client.status !== 'lead')
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [data.clients],
  )

  const initial = useMemo(() => ({
    title: task?.title ?? '',
    description: task?.description ?? '',
    clientId: task?.clientId ?? initialClientId ?? '',
    clientIds: task ? (task.clientId ? [task.clientId] : []) : (initialClientId ? [initialClientId] : []),
    assigneeId: task ? (task.assigneeId ?? '') : defaultFlavioId,
    dueDate: task?.dueDate ?? initialDate ?? '',
    status: task?.status ?? 'todo',
  }), [task, initialDate, initialClientId, defaultFlavioId])

  const [draft, setDraft] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [showAllClients,setShowAllClients] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const activeMembers = useMemo(
    () => data.members.filter(member=>member.active),
    [data.members],
  )

  const clientChoices = useMemo(() => {
    const internal={id:'__internal',name:'4Bit Studio / Interno',internal:true as const}
    const selected = orderedClients.filter(client=>draft.clientIds.includes(client.id))
    const remaining = orderedClients.filter(client=>!draft.clientIds.includes(client.id))
    return draft.clientIds.length
      ? [...selected,internal,...remaining]
      : [internal,...orderedClients]
  }, [orderedClients,draft.clientIds])

  const visibleClientChoices = showAllClients ? clientChoices : clientChoices.slice(0,3)
  const hiddenClientCount = Math.max(0,clientChoices.length-visibleClientChoices.length)

  const taskClientStyle = (client:{id:string;name:string;internal?:boolean}) => {
    if(client.internal) return undefined
    const name=client.name.trim().toLowerCase()
    if(name.includes('casaro')) return {
      '--client-chip-bg':'rgba(255,214,50,.22)',
      '--client-chip-ink':'#6B5400',
      '--client-chip-accent':'#FFD632',
      '--task-client-selected-ink':'#050505',
    } as CSSProperties
    if(name.includes('autoscuola susa')) return {
      '--client-chip-bg':'rgba(11,111,159,.12)',
      '--client-chip-ink':'#07577E',
      '--client-chip-accent':'#0B6F9F',
      '--task-client-selected-ink':'#fff',
    } as CSSProperties
    return clientChipStyle(client.id,data.clients)
  }

  useEffect(() => {
    if (!open) return
    setDraft(initial)
    setShowAllClients(false)
  }, [open, initial])

  useEffect(() => {
    if (!open) return
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        formRef.current?.requestSubmit()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!draft.title.trim()) return
    setSaving(true)
    try {
      const payload = {
        title: draft.title.trim(),
        description: draft.description.trim(),
        clientId: draft.clientId || null,
        assigneeId: draft.assigneeId || null,
        dueDate: draft.dueDate || null,
        status: draft.status as Task['status'],
      }
      if (task) {
        if (task.status !== 'done' && payload.status === 'done') onCelebrate?.()
        await actions.updateTask(task.id, payload)
      } else {
        const targets = draft.clientIds.length ? draft.clientIds : [null]
        const baseSortOrder = Date.now()
        for (const [index,clientId] of targets.entries()) {
          await actions.createTask({ ...payload, clientId, sortOrder: baseSortOrder + index })
        }
      }
      onClose()
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!task || !window.confirm(`Eliminare la task "${task.title}"?`)) return
    setSaving(true)
    try {
      await actions.deleteTask(task.id)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return <div className="task-editor-backdrop">
    <button className="task-editor-scrim" onClick={onClose} aria-label="Chiudi"/>
    <form ref={formRef} onSubmit={submit} className="task-editor-panel">
      <div className="task-editor-head">
        <div>
          <p className="eyebrow">{task ? 'Modifica attività' : 'Nuova attività'}</p>
          <h2>{task ? 'Dettagli task' : 'Aggiungi al planner'}</h2>
        </div>
        <button type="button" className="icon-button" onClick={onClose}><X size={18}/></button>
      </div>

      <div className="task-editor-body">
        <textarea
          autoFocus
          rows={2}
          className="field task-editor-title"
          placeholder="Cosa bisogna fare?"
          value={draft.title}
          onChange={e => setDraft({...draft,title:e.target.value})}
        />

        <textarea
          rows={4}
          className="field"
          placeholder="Note e dettagli (facoltativi)"
          value={draft.description}
          onChange={e => setDraft({...draft,description:e.target.value})}
        />

        <div className="task-editor-grid">
          <label className="setting-field task-editor-setting">
            <span className="task-setting-icon"><CalendarDays size={16}/></span>
            <div>
              <span className="setting-label">Data</span>
              <input type="date" value={draft.dueDate} onChange={e => setDraft({...draft,dueDate:e.target.value})}/>
            </div>
          </label>

          <div className="task-team-picker">
            <div className="task-team-picker-label"><UserRound size={16}/><span>Assegnata a</span></div>
            <div className="task-team-chips" role="group" aria-label="Assegna la task">
              <button
                type="button"
                className={`task-team-chip task-team-unassigned ${!draft.assigneeId ? 'selected' : ''}`}
                aria-pressed={!draft.assigneeId}
                onClick={()=>setDraft({...draft,assigneeId:''})}
              >
                <span className="task-team-avatar">—</span>
                <span>Non assegnata</span>
              </button>
              {activeMembers.map(member=>{
                const selected=draft.assigneeId===member.id
                return <button
                  type="button"
                  key={member.id}
                  className={`task-team-chip ${memberToneClass(member.name)} ${selected ? 'selected' : ''}`}
                  aria-pressed={selected}
                  onClick={()=>setDraft({...draft,assigneeId:member.id})}
                >
                  <span className="task-team-avatar">{member.name.slice(0,1).toUpperCase()}</span>
                  <span>{member.name}</span>
                </button>
              })}
            </div>
          </div>
        </div>

        <div className="task-editor-grid">
          {task ? <label className="form-field">
            <span>Lavoro / cliente</span>
            <select className="field" value={draft.clientId} onChange={e => setDraft({...draft,clientId:e.target.value})}>
              <option value="">4Bit Studio / Interno</option>
              {orderedClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label> : <div className="form-field task-client-multi-field">
            <span>Lavori / clienti</span>
            <div className="task-editor-client-picker">
              <div className="task-editor-client-chips" role="group" aria-label="Seleziona uno o più lavori">
                {visibleClientChoices.map(client=>{
                  const internal='internal' in client && client.internal
                  const selected=internal ? draft.clientIds.length===0 : draft.clientIds.includes(client.id)
                  return <button
                    type="button"
                    style={taskClientStyle(client)}
                    className={`task-editor-client-chip ${internal ? 'task-editor-client-internal' : ''} ${selected ? 'selected' : ''}`}
                    key={client.id}
                    aria-pressed={selected}
                    onClick={()=>{
                      if(internal) return setDraft({...draft,clientIds:[]})
                      setDraft({
                        ...draft,
                        clientIds:selected
                          ? draft.clientIds.filter(id=>id!==client.id)
                          : [...draft.clientIds,client.id],
                      })
                    }}
                  ><span className="task-editor-client-dot"/>{client.name}</button>
                })}
              </div>
              {clientChoices.length>3 && <button
                type="button"
                className="task-client-more"
                onClick={()=>setShowAllClients(value=>!value)}
                aria-expanded={showAllClients}
              >
                <span>{showAllClients ? 'Mostra meno' : `+${hiddenClientCount} altre`}</span>
                <ChevronDown size={14}/>
              </button>}
            </div>
            <small>{draft.clientIds.length > 1 ? `${draft.clientIds.length} attività selezionate · verrà creata una task per ciascuna` : draft.clientIds.length === 1 ? '1 attività selezionata' : 'Task interna 4Bit Studio'}</small>
          </div>}

          <label className="form-field">
            <span>Stato</span>
            <select className="field" value={draft.status} onChange={e => setDraft({...draft,status:e.target.value as Task['status']})}>
              <option value="todo">Da fare</option>
              <option value="doing">In corso</option>
              <option value="done">Completata</option>
            </select>
          </label>
        </div>
      </div>

      <div className="task-editor-actions">
        {task ? <button type="button" className="danger-button" disabled={saving} onClick={() => void remove()}><Trash2 size={15}/> Elimina</button> : <span/>}
        <div>
          <button type="button" className="secondary-button" onClick={onClose}>Annulla</button>
          <button className="primary-button" disabled={saving || !draft.title.trim()}>{saving ? 'Salvataggio…' : task ? 'Salva modifiche' : 'Aggiungi'}</button>
        </div>
      </div>
    </form>
  </div>
}
