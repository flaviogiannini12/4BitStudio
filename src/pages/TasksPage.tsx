import { useMemo, useState } from 'react'
import { Check, MoreHorizontal, Plus, Trash2 } from 'lucide-react'
import { formatShortDate, todayISO } from '../lib/date'
import { taskStatusLabel } from '../lib/labels'
import { ClientLogo } from '../components/ClientLogo'
import type { StudioData, Task, TaskStatus } from '../types/studio'
import type { useStudio } from '../hooks/useStudio'

type Actions = ReturnType<typeof useStudio>['actions']
type Filter = 'open' | 'done'

export function TasksPage({ data, actions, onNew }: { data: StudioData; actions: Actions; onNew: () => void }) {
  const [filter, setFilter] = useState<Filter>('open')
  const today = todayISO()

  const tasks = useMemo(() => data.tasks
    .filter(t => filter === 'open' ? t.status !== 'done' : t.status === 'done')
    .sort((a,b) => (a.dueDate ?? '9999-99-99').localeCompare(b.dueDate ?? '9999-99-99')),
  [data.tasks, filter])

  const groups = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const task of tasks) {
      const key = task.dueDate ?? 'undated'
      map.set(key, [...(map.get(key) ?? []), task])
    }
    return [...map.entries()]
  }, [tasks])

  const client = (id: string | null) => data.clients.find(c => c.id === id)
  const member = (id: string | null) => data.members.find(m => m.id === id)

  async function toggleComplete(task: Task) {
    await actions.setTaskStatus(task.id, task.status === 'done' ? 'todo' : 'done')
  }

  async function setStatus(task: Task, status: TaskStatus) {
    await actions.setTaskStatus(task.id, status)
  }

  return <section className="task-page-wrap">
    <div className="task-page-toolbar">
      <div>
        <p className="eyebrow">Operatività</p>
        <h2>Task</h2>
      </div>
      <button className="primary-button" onClick={onNew}><Plus size={15}/> Nuova task</button>
    </div>

    <div className="segmented task-filter task-filter-two">
      <button onClick={() => setFilter('open')} className={filter === 'open' ? 'active' : ''}>Aperte</button>
      <button onClick={() => setFilter('done')} className={filter === 'done' ? 'active' : ''}>Completate</button>
    </div>

    <div className="task-calendar-panel">
      {groups.map(([date, items]) => {
        const overdue = date !== 'undated' && date < today && items.some(t => t.status !== 'done')
        const isToday = date === today
        return <section className={`task-day-row ${isToday ? 'task-day-today' : ''} ${overdue ? 'task-day-overdue' : ''}`} key={date}>
          <div className="task-day-date">
            {date === 'undated'
              ? <><strong>—</strong><span>Senza data</span></>
              : <><strong>{new Date(`${date}T12:00:00`).getDate()}</strong><span>{new Intl.DateTimeFormat('it-IT',{weekday:'short',month:'short'}).format(new Date(`${date}T12:00:00`))}</span>{isToday && <b>Oggi</b>}{overdue && <b className="overdue-pill">Scadute</b>}</>}
          </div>

          <div className="task-day-items">
            {items.map(task => {
              const c = client(task.clientId)
              const m = member(task.assigneeId)
              return <article className={`flat-task-card ${task.status === 'done' ? 'is-done' : ''}`} key={task.id}>
                <button className="flat-task-check" onClick={() => void toggleComplete(task)} aria-label={task.status === 'done' ? 'Riapri task' : 'Completa task'}>
                  {task.status === 'done' ? <Check size={14}/> : <span/>}
                </button>

                <div className="flat-task-main">
                  <h3>{task.title}</h3>
                  <div className="flat-task-meta">
                    {c && <span className="task-client-chip"><ClientLogo logoUrl={c.logoUrl} name={c.name} size="sm"/>{c.name}</span>}
                    {m && <span>{m.name}</span>}
                    {task.dueDate && <span>{formatShortDate(task.dueDate)}</span>}
                  </div>
                  {task.description && <p>{task.description}</p>}
                </div>

                <div className="flat-task-actions">
                  {task.status !== 'done' && <button className={`task-mini-state ${task.status}`} onClick={() => void setStatus(task, task.status === 'doing' ? 'todo' : 'doing')}>{taskStatusLabel[task.status]}</button>}
                  <button className="task-more-button" title="Elimina task" onClick={() => {
                    if (window.confirm(`Eliminare la task "${task.title}"?`)) void actions.deleteTask(task.id)
                  }}><Trash2 size={14}/></button>
                  <MoreHorizontal size={15} className="task-drag-faux"/>
                </div>
              </article>
            })}
          </div>
        </section>
      })}

      {tasks.length === 0 && <div className="empty-page-mini">Nessuna task in questa vista.</div>}
    </div>
  </section>
}
