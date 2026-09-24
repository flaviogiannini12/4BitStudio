import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { CalendarDays, Trash2, UserRound, X } from 'lucide-react'
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
  onClose,
}: {
  open: boolean
  task: Task | null
  initialDate: string | null
  initialClientId?: string | null
  data: StudioData
  actions: Actions
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
    assigneeId: task ? (task.assigneeId ?? '') : defaultFlavioId,
    dueDate: task?.dueDate ?? initialDate ?? '',
    status: task?.status ?? 'todo',
  }), [task, initialDate, initialClientId, defaultFlavioId])

  const [draft, setDraft] = useState(initial)
  const [saving, setSaving] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (!open) return
    setDraft(initial)
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
      if (task) await actions.updateTask(task.id, payload)
      else await actions.createTask({ ...payload, sortOrder: Date.now() })
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

          <label className="setting-field task-editor-setting">
            <span className="task-setting-icon"><UserRound size={16}/></span>
            <div>
              <span className="setting-label">Assegnata a</span>
              <select value={draft.assigneeId} onChange={e => setDraft({...draft,assigneeId:e.target.value})}>
                <option value="">Non assegnata</option>
                {data.members.filter(m => m.active).map(m => <option value={m.id} key={m.id}>{m.name}</option>)}
              </select>
            </div>
          </label>
        </div>

        <div className="task-editor-grid">
          <label className="form-field">
            <span>Lavoro / cliente</span>
            <select className="field" value={draft.clientId} onChange={e => setDraft({...draft,clientId:e.target.value})}>
              <option value="">4Bit Studio / Interno</option>
              {orderedClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>

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
