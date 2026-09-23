import type { User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type {
  Client, ClientInput, Compensation, Deadline, LedgerEntry, MaintenancePeriod,
  Payment, PaymentInput, Project, ProjectInput, Recurrence, RecurrenceInput,
  StudioData, Task, TaskInput, TeamMember, TeamMemberInput,
} from '../types/studio'

function requireCloud() {
  if (!supabase) throw new Error('Supabase non configurato')
  return supabase
}

export async function hasWorkspaceMembership() {
  const { data, error } = await requireCloud()
    .from('workspace_members')
    .select('workspace_id')
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return Boolean(data?.workspace_id)
}

export async function joinWorkspace(inviteCode: string) {
  const { error } = await requireCloud().rpc('join_4bit_workspace', { invite_code: inviteCode })
  if (error) throw error
}

const fromClient = (r: any): Client => ({
  id: r.id, name: r.name, status: r.status, website: r.website ?? '', contactName: r.contact_name ?? '',
  email: r.email ?? '', phone: r.phone ?? '', logoUrl: r.logo_url ?? '', services: r.services ?? [], notes: r.notes ?? '',
  yearAcquired: r.year_acquired ?? null, analyticsEnabled: Boolean(r.analytics_enabled), leadSector: r.lead_sector ?? '',
  leadSource: r.lead_source ?? '', leadStage: r.lead_stage ?? '', nextAction: r.next_action ?? '', lastContact: r.last_contact ?? null,
  createdAt: r.created_at,
})
const fromMember = (r: any): TeamMember => ({ id: r.id, name: r.name, role: r.role ?? '', active: r.active, createdAt: r.created_at })
const fromProject = (r: any): Project => ({ id: r.id, clientId: r.client_id, name: r.name, status: r.status, deadline: r.deadline, description: r.description ?? '', createdAt: r.created_at })
const fromTask = (r: any): Task => ({ id: r.id, title: r.title, clientId: r.client_id, projectId: r.project_id, assigneeId: r.assignee_id, dueDate: r.due_date, status: r.status, description: r.description ?? '', checklist: r.checklist ?? [], createdAt: r.created_at, completedAt: r.completed_at })
const fromRecurrence = (r: any): Recurrence => ({ id: r.id, clientId: r.client_id, label: r.label, amount: Number(r.amount), intervalMonths: r.interval_months, dueDay: r.due_day, nextDueDate: r.next_due_date, active: r.active, notes: r.notes ?? '', createdAt: r.created_at })
const fromPayment = (r: any): Payment => ({ id: r.id, clientId: r.client_id, projectId: r.project_id, recurrenceId: r.recurrence_id, label: r.label, amount: Number(r.amount), dueDate: r.due_date, status: r.status, paidAt: r.paid_at, reminderCount: r.reminder_count ?? 0, lastReminderAt: r.last_reminder_at, notes: r.notes ?? '', createdAt: r.created_at })
const fromLedger = (r: any): LedgerEntry => ({ id:r.id, entryDate:r.entry_date, direction:r.direction, clientId:r.client_id, description:r.description ?? '', amount:Number(r.amount), status:r.status ?? '', category:r.category ?? '', notes:r.notes ?? '' })
const fromComp = (r: any): Compensation => ({ id:r.id, entryDate:r.entry_date, memberId:r.member_id, memberName:r.member_name ?? '', clientId:r.client_id, description:r.description ?? '', amount:Number(r.amount), status:r.status ?? '', notes:r.notes ?? '' })
const fromDeadline = (r: any): Deadline => ({ id:r.id, clientId:r.client_id, service:r.service ?? '', provider:r.provider ?? '', dueDate:r.due_date, cost:r.cost == null ? null : Number(r.cost), status:r.status ?? '', notes:r.notes ?? '' })
const fromMaintenance = (r: any): MaintenancePeriod => ({ id:r.id, clientId:r.client_id, service:r.service ?? '', periodicity:r.periodicity ?? '', amount:Number(r.amount), periodFrom:r.period_from, periodTo:r.period_to, status:r.status ?? '', notes:r.notes ?? '' })

async function rows(table: string) {
  const { data, error } = await requireCloud().from(table).select('*').order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function loadStudioData(_user: User): Promise<StudioData> {
  const [clients, members, projects, tasks, recurrences, payments, ledger, compensations, deadlines, maintenance] = await Promise.all([
    rows('clients'), rows('team_members'), rows('projects'), rows('tasks'), rows('recurrences'), rows('payments'),
    rows('ledger_entries'), rows('compensations'), rows('deadlines'), rows('maintenance_periods'),
  ])
  return {
    clients: clients.map(fromClient), members: members.map(fromMember), projects: projects.map(fromProject),
    tasks: tasks.map(fromTask), recurrences: recurrences.map(fromRecurrence), payments: payments.map(fromPayment), ledgerEntries: ledger.map(fromLedger), compensations: compensations.map(fromComp), deadlines: deadlines.map(fromDeadline), maintenancePeriods: maintenance.map(fromMaintenance),
  }
}

async function insert(table: string, payload: Record<string, unknown>) {
  const { data, error } = await requireCloud().from(table).insert(payload).select('*').single()
  if (error) throw error
  return data
}

async function update(table: string, id: string, payload: Record<string, unknown>) {
  const { data, error } = await requireCloud().from(table).update(payload).eq('id', id).select('*').single()
  if (error) throw error
  return data
}

async function remove(table: string, id: string) {
  const { error } = await requireCloud().from(table).delete().eq('id', id)
  if (error) throw error
}

export const cloudRepo = {
  async createClient(user: User, input: ClientInput) {
    return fromClient(await insert('clients', { owner_id: user.id, name: input.name, status: input.status ?? 'active', website: input.website ?? '', contact_name: input.contactName ?? '', email: input.email ?? '', phone: input.phone ?? '', logo_url: input.logoUrl ?? '', services: input.services ?? [], notes: input.notes ?? '', year_acquired: input.yearAcquired ?? null, analytics_enabled: input.analyticsEnabled ?? false, lead_sector: input.leadSector ?? '', lead_source: input.leadSource ?? '', lead_stage: input.leadStage ?? '', next_action: input.nextAction ?? '', last_contact: input.lastContact ?? null }))
  },
  async updateClient(id: string, input: Partial<Client>) {
    const payload: any = {}
    if (input.name !== undefined) payload.name = input.name
    if (input.status !== undefined) payload.status = input.status
    if (input.website !== undefined) payload.website = input.website
    if (input.contactName !== undefined) payload.contact_name = input.contactName
    if (input.email !== undefined) payload.email = input.email
    if (input.phone !== undefined) payload.phone = input.phone
    if (input.logoUrl !== undefined) payload.logo_url = input.logoUrl
    if (input.services !== undefined) payload.services = input.services
    if (input.notes !== undefined) payload.notes = input.notes
    if (input.yearAcquired !== undefined) payload.year_acquired = input.yearAcquired
    if (input.analyticsEnabled !== undefined) payload.analytics_enabled = input.analyticsEnabled
    if (input.leadSector !== undefined) payload.lead_sector = input.leadSector
    if (input.leadSource !== undefined) payload.lead_source = input.leadSource
    if (input.leadStage !== undefined) payload.lead_stage = input.leadStage
    if (input.nextAction !== undefined) payload.next_action = input.nextAction
    if (input.lastContact !== undefined) payload.last_contact = input.lastContact
    return fromClient(await update('clients', id, payload))
  },
  deleteClient: (id: string) => remove('clients', id),
  async createMember(user: User, input: TeamMemberInput) { return fromMember(await insert('team_members', { owner_id: user.id, name: input.name, role: input.role ?? 'Team', active: true })) },
  async updateMember(id: string, input: Partial<TeamMember>) { return fromMember(await update('team_members', id, { ...(input.name !== undefined ? { name: input.name } : {}), ...(input.role !== undefined ? { role: input.role } : {}), ...(input.active !== undefined ? { active: input.active } : {}) })) },
  async createProject(user: User, input: ProjectInput) { return fromProject(await insert('projects', { owner_id: user.id, client_id: input.clientId, name: input.name, status: input.status ?? 'planning', deadline: input.deadline || null, description: input.description ?? '' })) },
  async updateProject(id: string, input: Partial<Project>) { return fromProject(await update('projects', id, { ...(input.clientId !== undefined ? { client_id: input.clientId } : {}), ...(input.name !== undefined ? { name: input.name } : {}), ...(input.status !== undefined ? { status: input.status } : {}), ...(input.deadline !== undefined ? { deadline: input.deadline || null } : {}), ...(input.description !== undefined ? { description: input.description } : {}) })) },
  deleteProject: (id: string) => remove('projects', id),
  async createTask(user: User, input: TaskInput) { return fromTask(await insert('tasks', { owner_id: user.id, title: input.title, client_id: input.clientId || null, project_id: input.projectId || null, assignee_id: input.assigneeId || null, due_date: input.dueDate || null, status: input.status ?? 'todo', description: input.description ?? '', checklist: input.checklist ?? [] })) },
  async updateTask(id: string, input: Partial<Task>) { return fromTask(await update('tasks', id, { ...(input.title !== undefined ? { title: input.title } : {}), ...(input.clientId !== undefined ? { client_id: input.clientId || null } : {}), ...(input.projectId !== undefined ? { project_id: input.projectId || null } : {}), ...(input.assigneeId !== undefined ? { assignee_id: input.assigneeId || null } : {}), ...(input.dueDate !== undefined ? { due_date: input.dueDate || null } : {}), ...(input.status !== undefined ? { status: input.status } : {}), ...(input.description !== undefined ? { description: input.description } : {}), ...(input.checklist !== undefined ? { checklist: input.checklist } : {}), ...(input.completedAt !== undefined ? { completed_at: input.completedAt } : {}) })) },
  deleteTask: (id: string) => remove('tasks', id),
  async createPayment(user: User, input: PaymentInput) { return fromPayment(await insert('payments', { owner_id: user.id, client_id: input.clientId, project_id: input.projectId || null, recurrence_id: input.recurrenceId || null, label: input.label, amount: input.amount, due_date: input.dueDate, status: 'pending', notes: input.notes ?? '' })) },
  async updatePayment(id: string, input: Partial<Payment>) { return fromPayment(await update('payments', id, { ...(input.clientId !== undefined ? { client_id: input.clientId } : {}), ...(input.projectId !== undefined ? { project_id: input.projectId || null } : {}), ...(input.recurrenceId !== undefined ? { recurrence_id: input.recurrenceId || null } : {}), ...(input.label !== undefined ? { label: input.label } : {}), ...(input.amount !== undefined ? { amount: input.amount } : {}), ...(input.dueDate !== undefined ? { due_date: input.dueDate } : {}), ...(input.status !== undefined ? { status: input.status } : {}), ...(input.paidAt !== undefined ? { paid_at: input.paidAt } : {}), ...(input.reminderCount !== undefined ? { reminder_count: input.reminderCount } : {}), ...(input.lastReminderAt !== undefined ? { last_reminder_at: input.lastReminderAt } : {}), ...(input.notes !== undefined ? { notes: input.notes } : {}) })) },
  deletePayment: (id: string) => remove('payments', id),
  async createRecurrence(user: User, input: RecurrenceInput) { return fromRecurrence(await insert('recurrences', { owner_id: user.id, client_id: input.clientId, label: input.label, amount: input.amount, interval_months: input.intervalMonths, due_day: input.dueDay ?? null, next_due_date: input.nextDueDate, active: true, notes: input.notes ?? '' })) },
  async updateRecurrence(id: string, input: Partial<Recurrence>) { return fromRecurrence(await update('recurrences', id, { ...(input.clientId !== undefined ? { client_id: input.clientId } : {}), ...(input.label !== undefined ? { label: input.label } : {}), ...(input.amount !== undefined ? { amount: input.amount } : {}), ...(input.intervalMonths !== undefined ? { interval_months: input.intervalMonths } : {}), ...(input.dueDay !== undefined ? { due_day: input.dueDay } : {}), ...(input.nextDueDate !== undefined ? { next_due_date: input.nextDueDate } : {}), ...(input.active !== undefined ? { active: input.active } : {}), ...(input.notes !== undefined ? { notes: input.notes } : {}) })) },
  deleteRecurrence: (id: string) => remove('recurrences', id),
}
