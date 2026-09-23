import { useMemo, useState } from 'react'
import { Check, ChevronRight, Trash2 } from 'lucide-react'
import { formatShortDate } from '../lib/date'
import { taskStatusLabel } from '../lib/labels'
import type { StudioData, Task, TaskStatus } from '../types/studio'
import type { useStudio } from '../hooks/useStudio'

type Actions = ReturnType<typeof useStudio>['actions']

export function TasksPage({ data, actions, onNew }: { data: StudioData; actions: Actions; onNew: () => void }) {
  const [filter, setFilter] = useState<'open' | TaskStatus | 'all'>('open')
  const tasks = useMemo(() => data.tasks.filter(t => filter === 'all' ? true : filter === 'open' ? t.status !== 'done' : t.status === filter).sort((a,b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999')), [data.tasks, filter])
  const client = (id: string | null) => data.clients.find(c => c.id === id)?.name ?? '4Bit Studio'
  const member = (id: string | null) => data.members.find(m => m.id === id)?.name ?? 'Non assegnata'

  async function advance(task: Task) {
    const next: TaskStatus = task.status === 'todo' ? 'doing' : task.status === 'doing' ? 'done' : 'todo'
    await actions.setTaskStatus(task.id, next)
  }

  return <section className="section-block page-section">
    <div className="section-heading responsive-heading"><div><p className="eyebrow">Senza priorità, solo lavoro reale</p><h2>Task</h2></div><button className="primary-button" onClick={onNew}>Nuova task</button></div>
    <div className="segmented">{(['open','todo','doing','done','all'] as const).map(x => <button key={x} onClick={() => setFilter(x)} className={filter === x ? 'active' : ''}>{x === 'open' ? 'Aperte' : x === 'all' ? 'Tutte' : taskStatusLabel[x]}</button>)}</div>
    <div className="task-table">
      {tasks.map(task => <article className="task-row" key={task.id}>
        <button className={`task-check-button ${task.status}`} onClick={() => void advance(task)} title="Avanza stato">{task.status === 'done' ? <Check size={15}/> : <span/>}</button>
        <div className="task-row-main"><h3>{task.title}</h3><p>{client(task.clientId)} · {member(task.assigneeId)}</p>{task.description && <small>{task.description}</small>}</div>
        <span className={`status-chip task-${task.status}`}>{taskStatusLabel[task.status]}</span>
        <time>{formatShortDate(task.dueDate)}</time>
        <button className="icon-button tiny" onClick={() => void actions.deleteTask(task.id)}><Trash2 size={14}/></button>
        <ChevronRight size={14} className="row-chevron"/>
      </article>)}
      {tasks.length === 0 && <div className="empty-page-mini">Nessuna task in questa vista.</div>}
    </div>
  </section>
}
