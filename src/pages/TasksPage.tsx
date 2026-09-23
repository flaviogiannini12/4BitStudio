import { useEffect, useMemo, useState } from 'react'
import { CalendarSearch, Check, GripVertical, Inbox, MoreHorizontal, MoveRight, Plus, UserRound } from 'lucide-react'
import { ClientLogo } from '../components/ClientLogo'
import { TaskEditorModal } from '../components/TaskEditorModal'
import { todayISO } from '../lib/date'
import type { StudioData, Task } from '../types/studio'
import type { useStudio } from '../hooks/useStudio'

type Actions = ReturnType<typeof useStudio>['actions']
type StatusFilter = 'open' | 'done'

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}

function rollingDays(start: Date, count: number) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate())
    date.setDate(date.getDate() + index)
    return date
  })
}

function sortTasks(tasks: Task[]) {
  return [...tasks].sort((a,b) => {
    const order = (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
    if (order !== 0) return order
    return a.createdAt.localeCompare(b.createdAt)
  })
}

export function TasksPage({ data, actions, onNew: _onNew }: { data: StudioData; actions: Actions; onNew: () => void }) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open')
  const [clientFilter, setClientFilter] = useState('all')
  const [memberFilter, setMemberFilter] = useState('all')
  const [onlyDaysWithTasks, setOnlyDaysWithTasks] = useState(() => localStorage.getItem('4bit.tasks.onlyDays') === '1')
  const [jumpDate, setJumpDate] = useState('')
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [newTaskDate, setNewTaskDate] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)

  useEffect(() => {
    localStorage.setItem('4bit.tasks.onlyDays', onlyDaysWithTasks ? '1' : '0')
  }, [onlyDaysWithTasks])

  const today = useMemo(() => new Date(), [])
  const todayKey = todayISO(today)
  const days = useMemo(() => rollingDays(today, 180), [today])

  const filtered = useMemo(() => {
    return data.tasks.filter(task => {
      if (statusFilter === 'open' && task.status === 'done') return false
      if (statusFilter === 'done' && task.status !== 'done') return false
      if (clientFilter === '__internal' && task.clientId) return false
      if (clientFilter !== 'all' && clientFilter !== '__internal' && task.clientId !== clientFilter) return false
      if (memberFilter === '__unassigned' && task.assigneeId) return false
      if (memberFilter !== 'all' && memberFilter !== '__unassigned' && task.assigneeId !== memberFilter) return false
      return true
    })
  }, [data.tasks, statusFilter, clientFilter, memberFilter])

  const overdue = useMemo(() => sortTasks(filtered.filter(task => task.dueDate && task.dueDate < todayKey)), [filtered, todayKey])
  const backlog = useMemo(() => sortTasks(filtered.filter(task => !task.dueDate)), [filtered])
  const byDate = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const task of filtered) {
      if (!task.dueDate || task.dueDate < todayKey) continue
      const group = map.get(task.dueDate) ?? []
      group.push(task)
      map.set(task.dueDate, group)
    }
    for (const [key, group] of map) map.set(key, sortTasks(group))
    return map
  }, [filtered, todayKey])

  const visibleDays = useMemo(() => {
    if (!onlyDaysWithTasks) return days
    return days.filter(date => (byDate.get(dateKey(date))?.length ?? 0) > 0)
  }, [days, byDate, onlyDaysWithTasks])

  const client = (id: string | null) => data.clients.find(c => c.id === id)
  const member = (id: string | null) => data.members.find(m => m.id === id)

  function openCreate(date: string | null) {
    setEditingTask(null)
    setNewTaskDate(date)
    setEditorOpen(true)
  }

  function openEdit(task: Task) {
    setEditingTask(task)
    setNewTaskDate(task.dueDate)
    setEditorOpen(true)
  }

  async function toggleComplete(task: Task) {
    await actions.setTaskStatus(task.id, task.status === 'done' ? 'todo' : 'done')
  }

  async function moveTask(taskId: string, dueDate: string | null) {
    const target = sortTasks(filtered.filter(task => task.id !== taskId && task.dueDate === dueDate))
    await actions.reorderTasks([...target.map(task => task.id), taskId], dueDate)
  }

  async function reorderTask(draggedId: string, targetId: string, dueDate: string | null, position: 'before' | 'after') {
    if (draggedId === targetId) return
    const group = sortTasks(data.tasks.filter(task => task.dueDate === dueDate && task.id !== draggedId))
    const dragged = data.tasks.find(task => task.id === draggedId)
    if (!dragged) return
    const targetIndex = group.findIndex(task => task.id === targetId)
    if (targetIndex < 0) return
    group.splice(position === 'after' ? targetIndex + 1 : targetIndex, 0, dragged)
    await actions.reorderTasks(group.map(task => task.id), dueDate)
  }

  function jumpToDate(date = jumpDate) {
    if (!date) return
    if (onlyDaysWithTasks && !(byDate.get(date)?.length ?? 0)) {
      setOnlyDaysWithTasks(false)
      window.setTimeout(() => jumpNode(date), 70)
      return
    }
    jumpNode(date)
  }

  function jumpNode(key: string) {
    const node = document.getElementById(`task-day-${key}`)
    if (!node) return
    node.scrollIntoView({ behavior:'smooth', block:'center' })
    node.classList.remove('day-row-found')
    requestAnimationFrame(() => node.classList.add('day-row-found'))
    window.setTimeout(() => node.classList.remove('day-row-found'), 1400)
  }

  const taskCard = (task: Task, dueDate: string | null) => {
    const c = client(task.clientId)
    const m = member(task.assigneeId)

    return <article
      key={task.id}
      draggable
      className={`todo-task-card ${task.status === 'done' ? 'is-done' : ''}`}
      onDragStart={event => {
        event.dataTransfer.setData('text/4bit-task', task.id)
        event.dataTransfer.effectAllowed = 'move'
      }}
      onDragOver={event => {
        if (event.dataTransfer.types.includes('text/4bit-task')) event.preventDefault()
      }}
      onDrop={event => {
        event.preventDefault()
        event.stopPropagation()
        const draggedId = event.dataTransfer.getData('text/4bit-task')
        if (!draggedId) return
        const rect = event.currentTarget.getBoundingClientRect()
        const position = event.clientY > rect.top + rect.height / 2 ? 'after' : 'before'
        void reorderTask(draggedId, task.id, dueDate, position)
      }}
    >
      <button className="todo-task-check" onClick={() => void toggleComplete(task)} aria-label={task.status === 'done' ? 'Riapri task' : 'Completa task'}>
        {task.status === 'done' ? <Check size={14}/> : <span/>}
      </button>

      <button className="todo-task-content" onClick={() => openEdit(task)}>
        <div className="todo-task-topline">
          <h3>{task.title}</h3>
          <span className={`todo-assignee ${m ? '' : 'unassigned'}`}>
            <span>{m ? m.name.slice(0,1).toUpperCase() : '?'}</span>
            {m?.name ?? 'Non assegnata'}
          </span>
        </div>
        <div className="todo-task-meta">
          {c
            ? <span className="task-client-chip"><ClientLogo logoUrl={c.logoUrl} name={c.name} size="sm"/>{c.name}</span>
            : <span className="task-internal-chip">4Bit Studio</span>}
          <span className={`task-status-inline ${task.status}`}>{task.status === 'doing' ? 'In corso' : task.status === 'done' ? 'Completata' : 'Da fare'}</span>
        </div>
        {task.description && <p>{task.description}</p>}
      </button>

      <div className="todo-task-side">
        <GripVertical className="todo-grip" size={15}/>
        <button className="task-more-button" onClick={() => openEdit(task)} aria-label="Modifica task"><MoreHorizontal size={16}/></button>
      </div>
    </article>
  }

  return <>
    <section className="todo-planner-page">
      <div className="todo-planner-head">
        <div>
          <p className="eyebrow">Planner operativo</p>
          <h2>Task</h2>
        </div>
        <button className="primary-button todo-new-task" onClick={() => openCreate(todayKey)}><Plus size={16}/> Nuova attività</button>
      </div>

      <div className="todo-toolbar">
        <div className="segmented task-filter task-filter-two">
          <button onClick={() => setStatusFilter('open')} className={statusFilter === 'open' ? 'active' : ''}>Aperte</button>
          <button onClick={() => setStatusFilter('done')} className={statusFilter === 'done' ? 'active' : ''}>Completate</button>
        </div>

        <label className="todo-filter-select">
          <span>Lavoro</span>
          <select value={clientFilter} onChange={e => setClientFilter(e.target.value)}>
            <option value="all">Tutti i lavori</option>
            <option value="__internal">4Bit Studio / Interno</option>
            {data.clients.filter(c => c.status !== 'archived' && c.status !== 'lead').map(c => <option value={c.id} key={c.id}>{c.name}</option>)}
          </select>
        </label>

        <label className="todo-filter-select">
          <span>Persona</span>
          <select value={memberFilter} onChange={e => setMemberFilter(e.target.value)}>
            <option value="all">Tutto il team</option>
            <option value="__unassigned">Non assegnate</option>
            {data.members.filter(m => m.active).map(m => <option value={m.id} key={m.id}>{m.name}</option>)}
          </select>
        </label>

        <label className="planner-toggle">
          <input type="checkbox" checked={onlyDaysWithTasks} onChange={e => setOnlyDaysWithTasks(e.target.checked)}/>
          <span className="planner-switch"><span/></span>
          <span>Solo giorni con attività</span>
        </label>

        <label className="date-jump">
          <CalendarSearch size={14}/>
          <input type="date" value={jumpDate} min={todayKey} onChange={e => {
            setJumpDate(e.target.value)
            if (e.target.value) window.setTimeout(() => jumpToDate(e.target.value), 30)
          }}/>
          <button type="button" onClick={() => jumpToDate()}><MoveRight size={14}/></button>
        </label>
      </div>

      <div className="todo-planner-grid">
        <main className="todo-calendar-main">
          {statusFilter === 'open' && overdue.length > 0 && <section className="todo-overdue-panel">
            <div className="todo-section-title"><div><p className="eyebrow">Da recuperare</p><h3>Scadute</h3></div><span>{overdue.length}</span></div>
            <div className="todo-task-stack">{overdue.map(task => taskCard(task, task.dueDate))}</div>
          </section>}

          <div className="todo-calendar-panel">
            {visibleDays.map(date => {
              const key = dateKey(date)
              const tasks = byDate.get(key) ?? []
              const isToday = key === todayKey
              return <section
                id={`task-day-${key}`}
                key={key}
                className={`todo-day-row ${isToday ? 'is-today' : ''} ${tasks.length ? '' : 'is-empty'}`}
                onDragOver={event => {
                  if (event.dataTransfer.types.includes('text/4bit-task')) event.preventDefault()
                }}
                onDrop={event => {
                  const draggedId = event.dataTransfer.getData('text/4bit-task')
                  if (draggedId) void moveTask(draggedId,key)
                }}
              >
                <div className="todo-day-date">
                  <div className={`todo-day-number ${isToday ? 'today' : ''}`}>{date.getDate()}</div>
                  <div>
                    <p>{new Intl.DateTimeFormat('it-IT',{month:'short'}).format(date)}</p>
                    <span>{new Intl.DateTimeFormat('it-IT',{weekday:'long'}).format(date)}</span>
                  </div>
                  {isToday && <b>Oggi</b>}
                </div>

                <div className="todo-day-body">
                  <div className="todo-task-stack">{tasks.map(task => taskCard(task,key))}</div>
                  <button className="todo-add-row" onClick={() => openCreate(key)}><Plus size={15}/><span>{tasks.length ? 'Aggiungi attività' : 'Nuova attività'}</span></button>
                </div>
              </section>
            })}

            {onlyDaysWithTasks && visibleDays.length === 0 && <div className="empty-page-mini">Nessuna attività pianificata con questi filtri.</div>}
          </div>
        </main>

        <aside
          className="todo-backlog"
          onDragOver={event => {
            if (event.dataTransfer.types.includes('text/4bit-task')) event.preventDefault()
          }}
          onDrop={event => {
            const id = event.dataTransfer.getData('text/4bit-task')
            if (id) void moveTask(id,null)
          }}
        >
          <div className="todo-backlog-head">
            <div><Inbox size={16}/><div><p>Senza data</p><span>Da pianificare</span></div></div>
            <b>{backlog.length}</b>
          </div>
          <div className="todo-backlog-list">{backlog.map(task => taskCard(task,null))}</div>
          <button className="todo-backlog-add" onClick={() => openCreate(null)}><Plus size={15}/> Nuova attività senza data</button>
        </aside>
      </div>
    </section>

    <TaskEditorModal
      open={editorOpen}
      task={editingTask}
      initialDate={newTaskDate}
      data={data}
      actions={actions}
      onClose={() => setEditorOpen(false)}
    />
  </>
}
