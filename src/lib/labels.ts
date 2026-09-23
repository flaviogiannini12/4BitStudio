import type { ClientStatus, ProjectStatus, TaskStatus } from '../types/studio'

export const clientStatusLabel: Record<ClientStatus, string> = { active: 'Attivo', in_progress: 'In lavorazione', paused: 'In pausa', archived: 'Archivio', lead: 'Lead' }
export const projectStatusLabel: Record<ProjectStatus, string> = { planning: 'Da iniziare', in_progress: 'In lavorazione', review: 'In revisione', done: 'Completato' }
export const taskStatusLabel: Record<TaskStatus, string> = { todo: 'Da fare', doing: 'In corso', done: 'Completata' }
