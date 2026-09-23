import { useCallback, useEffect, useMemo, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { addMonths, todayISO } from '../lib/date'
import { demoData } from '../lib/demo'
import { cloudEnabled, supabase } from '../lib/supabase'
import { cloudRepo, hasWorkspaceMembership, joinWorkspace, loadStudioData } from '../lib/studioRepository'
import type {
  Client, ClientInput, Payment, PaymentInput, Project, ProjectInput, Recurrence, RecurrenceInput,
  StudioData, Task, TaskInput, TeamMember, TeamMemberInput,
} from '../types/studio'

const STORAGE_KEY = '4bit-studio-v1'
const cloneDemo = () => JSON.parse(JSON.stringify(demoData)) as StudioData
const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`

function readLocal(): StudioData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) as StudioData : cloneDemo()
  } catch {
    return cloneDemo()
  }
}

export function useStudio(user: User | null, ready: boolean) {
  const [data, setData] = useState<StudioData>(() => cloudEnabled ? { clients: [], members: [], projects: [], tasks: [], recurrences: [], payments: [] } : readLocal())
  const [loading, setLoading] = useState(cloudEnabled)
  const [error, setError] = useState<string | null>(null)
  const [needsWorkspace, setNeedsWorkspace] = useState(false)

  const saveLocal = useCallback((recipe: (current: StudioData) => StudioData) => {
    setData(current => {
      const next = recipe(current)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const reload = useCallback(async () => {
    if (!cloudEnabled) {
      setData(readLocal())
      return
    }
    if (!user) return
    setLoading(true)
    try {
      const member = await hasWorkspaceMembership()
      if (!member) {
        setNeedsWorkspace(true)
        setData({ clients: [], members: [], projects: [], tasks: [], recurrences: [], payments: [] })
        setError(null)
        return
      }
      setNeedsWorkspace(false)
      let loaded = await loadStudioData(user)
      if (loaded.members.length === 0) {
        for (const name of ['Edoardo', 'Flavio', 'Francesco', 'Matteo']) {
          await cloudRepo.createMember(user, { name, role: 'Team' })
        }
        loaded = await loadStudioData(user)
      }
      setData(loaded)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossibile caricare i dati')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (!ready) return
    void reload()
  }, [ready, reload])

  useEffect(() => {
    if (!cloudEnabled || !supabase || !user) return
    const client = supabase
    const channel = client.channel(`studio-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => void reload())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members' }, () => void reload())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => void reload())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => void reload())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => void reload())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recurrences' }, () => void reload())
      .subscribe()
    return () => { void client.removeChannel(channel) }
  }, [reload, user])

  async function joinStudio(code: string) {
    if (!cloudEnabled || !user) return
    setLoading(true)
    try {
      await joinWorkspace(code)
      setNeedsWorkspace(false)
      setError(null)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Codice studio non valido')
      throw err
    } finally {
      setLoading(false)
    }
  }

  async function protect(action: () => Promise<void>) {
    try {
      setError(null)
      await action()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operazione non riuscita')
      throw err
    }
  }

  const actions = useMemo(() => ({
    async createClient(input: ClientInput) {
      if (cloudEnabled && user) return protect(async () => { await cloudRepo.createClient(user, input); await reload() })
      const value: Client = { id: id('client'), name: input.name, status: input.status ?? 'active', website: input.website ?? '', contactName: input.contactName ?? '', email: input.email ?? '', phone: input.phone ?? '', logoUrl: input.logoUrl ?? '', services: input.services ?? [], notes: input.notes ?? '', createdAt: new Date().toISOString() }
      saveLocal(current => ({ ...current, clients: [...current.clients, value] }))
    },
    async updateClient(clientId: string, input: Partial<Client>) {
      if (cloudEnabled && user) return protect(async () => { await cloudRepo.updateClient(clientId, input); await reload() })
      saveLocal(current => ({ ...current, clients: current.clients.map(x => x.id === clientId ? { ...x, ...input } : x) }))
    },
    async deleteClient(clientId: string) {
      if (cloudEnabled && user) return protect(async () => { await cloudRepo.deleteClient(clientId); await reload() })
      saveLocal(current => ({ ...current, clients: current.clients.filter(x => x.id !== clientId), projects: current.projects.filter(x => x.clientId !== clientId), tasks: current.tasks.filter(x => x.clientId !== clientId), payments: current.payments.filter(x => x.clientId !== clientId), recurrences: current.recurrences.filter(x => x.clientId !== clientId) }))
    },
    async createMember(input: TeamMemberInput) {
      if (cloudEnabled && user) return protect(async () => { await cloudRepo.createMember(user, input); await reload() })
      const value: TeamMember = { id: id('member'), name: input.name, role: input.role ?? 'Team', active: true, createdAt: new Date().toISOString() }
      saveLocal(current => ({ ...current, members: [...current.members, value] }))
    },
    async updateMember(memberId: string, input: Partial<TeamMember>) {
      if (cloudEnabled && user) return protect(async () => { await cloudRepo.updateMember(memberId, input); await reload() })
      saveLocal(current => ({ ...current, members: current.members.map(x => x.id === memberId ? { ...x, ...input } : x) }))
    },
    async createProject(input: ProjectInput) {
      if (cloudEnabled && user) return protect(async () => { await cloudRepo.createProject(user, input); await reload() })
      const value: Project = { id: id('project'), clientId: input.clientId, name: input.name, status: input.status ?? 'planning', deadline: input.deadline || null, description: input.description ?? '', createdAt: new Date().toISOString() }
      saveLocal(current => ({ ...current, projects: [...current.projects, value] }))
    },
    async updateProject(projectId: string, input: Partial<Project>) {
      if (cloudEnabled && user) return protect(async () => { await cloudRepo.updateProject(projectId, input); await reload() })
      saveLocal(current => ({ ...current, projects: current.projects.map(x => x.id === projectId ? { ...x, ...input } : x) }))
    },
    async deleteProject(projectId: string) {
      if (cloudEnabled && user) return protect(async () => { await cloudRepo.deleteProject(projectId); await reload() })
      saveLocal(current => ({ ...current, projects: current.projects.filter(x => x.id !== projectId) }))
    },
    async createTask(input: TaskInput) {
      if (cloudEnabled && user) return protect(async () => { await cloudRepo.createTask(user, input); await reload() })
      const value: Task = { id: id('task'), title: input.title, clientId: input.clientId ?? null, projectId: input.projectId ?? null, assigneeId: input.assigneeId ?? null, dueDate: input.dueDate ?? null, status: input.status ?? 'todo', description: input.description ?? '', checklist: input.checklist ?? [], createdAt: new Date().toISOString(), completedAt: null }
      saveLocal(current => ({ ...current, tasks: [...current.tasks, value] }))
    },
    async updateTask(taskId: string, input: Partial<Task>) {
      if (cloudEnabled && user) return protect(async () => { await cloudRepo.updateTask(taskId, input); await reload() })
      saveLocal(current => ({ ...current, tasks: current.tasks.map(x => x.id === taskId ? { ...x, ...input } : x) }))
    },
    async setTaskStatus(taskId: string, status: Task['status']) {
      const completedAt = status === 'done' ? new Date().toISOString() : null
      if (cloudEnabled && user) return protect(async () => { await cloudRepo.updateTask(taskId, { status, completedAt }); await reload() })
      saveLocal(current => ({ ...current, tasks: current.tasks.map(x => x.id === taskId ? { ...x, status, completedAt } : x) }))
    },
    async deleteTask(taskId: string) {
      if (cloudEnabled && user) return protect(async () => { await cloudRepo.deleteTask(taskId); await reload() })
      saveLocal(current => ({ ...current, tasks: current.tasks.filter(x => x.id !== taskId) }))
    },
    async createPayment(input: PaymentInput) {
      if (cloudEnabled && user) return protect(async () => { await cloudRepo.createPayment(user, input); await reload() })
      const value: Payment = { id: id('payment'), clientId: input.clientId, projectId: input.projectId ?? null, recurrenceId: input.recurrenceId ?? null, label: input.label, amount: input.amount, dueDate: input.dueDate, status: 'pending', paidAt: null, reminderCount: 0, lastReminderAt: null, notes: input.notes ?? '', createdAt: new Date().toISOString() }
      saveLocal(current => ({ ...current, payments: [...current.payments, value] }))
    },
    async updatePayment(paymentId: string, input: Partial<Payment>) {
      if (cloudEnabled && user) return protect(async () => { await cloudRepo.updatePayment(paymentId, input); await reload() })
      saveLocal(current => ({ ...current, payments: current.payments.map(x => x.id === paymentId ? { ...x, ...input } : x) }))
    },
    async markPaymentPaid(paymentId: string) {
      const payment = data.payments.find(x => x.id === paymentId)
      if (!payment) return
      const recurrence = payment.recurrenceId ? data.recurrences.find(x => x.id === payment.recurrenceId) : null
      const paidAt = new Date().toISOString()
      if (cloudEnabled && user) return protect(async () => {
        await cloudRepo.updatePayment(paymentId, { status: 'paid', paidAt })
        if (recurrence?.active) {
          const nextDue = addMonths(payment.dueDate, recurrence.intervalMonths, recurrence.dueDay)
          const exists = data.payments.some(x => x.recurrenceId === recurrence.id && x.status === 'pending' && x.id !== paymentId)
          if (!exists) await cloudRepo.createPayment(user, { clientId: recurrence.clientId, recurrenceId: recurrence.id, label: recurrence.label, amount: recurrence.amount, dueDate: nextDue, notes: recurrence.notes })
          await cloudRepo.updateRecurrence(recurrence.id, { nextDueDate: nextDue })
        }
        await reload()
      })
      saveLocal(current => {
        let payments = current.payments.map(x => x.id === paymentId ? { ...x, status: 'paid' as const, paidAt } : x)
        let recurrences = current.recurrences
        if (recurrence?.active) {
          const nextDue = addMonths(payment.dueDate, recurrence.intervalMonths, recurrence.dueDay)
          if (!payments.some(x => x.recurrenceId === recurrence.id && x.status === 'pending')) {
            payments = [...payments, { id: id('payment'), clientId: recurrence.clientId, projectId: null, recurrenceId: recurrence.id, label: recurrence.label, amount: recurrence.amount, dueDate: nextDue, status: 'pending', paidAt: null, reminderCount: 0, lastReminderAt: null, notes: recurrence.notes, createdAt: new Date().toISOString() }]
          }
          recurrences = recurrences.map(x => x.id === recurrence.id ? { ...x, nextDueDate: nextDue } : x)
        }
        return { ...current, payments, recurrences }
      })
    },
    async recordReminder(paymentId: string) {
      const payment = data.payments.find(x => x.id === paymentId)
      if (!payment) return
      const next = { reminderCount: payment.reminderCount + 1, lastReminderAt: new Date().toISOString() }
      if (cloudEnabled && user) return protect(async () => { await cloudRepo.updatePayment(paymentId, next); await reload() })
      saveLocal(current => ({ ...current, payments: current.payments.map(x => x.id === paymentId ? { ...x, ...next } : x) }))
    },
    async deletePayment(paymentId: string) {
      if (cloudEnabled && user) return protect(async () => { await cloudRepo.deletePayment(paymentId); await reload() })
      saveLocal(current => ({ ...current, payments: current.payments.filter(x => x.id !== paymentId) }))
    },
    async createRecurrence(input: RecurrenceInput) {
      if (cloudEnabled && user) return protect(async () => {
        const recurrence = await cloudRepo.createRecurrence(user, input)
        await cloudRepo.createPayment(user, { clientId: input.clientId, recurrenceId: recurrence.id, label: input.label, amount: input.amount, dueDate: input.nextDueDate, notes: input.notes })
        await reload()
      })
      const value: Recurrence = { id: id('recurrence'), clientId: input.clientId, label: input.label, amount: input.amount, intervalMonths: input.intervalMonths, dueDay: input.dueDay ?? null, nextDueDate: input.nextDueDate, active: true, notes: input.notes ?? '', createdAt: new Date().toISOString() }
      const payment: Payment = { id: id('payment'), clientId: input.clientId, projectId: null, recurrenceId: value.id, label: value.label, amount: value.amount, dueDate: value.nextDueDate, status: 'pending', paidAt: null, reminderCount: 0, lastReminderAt: null, notes: value.notes, createdAt: new Date().toISOString() }
      saveLocal(current => ({ ...current, recurrences: [...current.recurrences, value], payments: [...current.payments, payment] }))
    },
    async updateRecurrence(recurrenceId: string, input: Partial<Recurrence>) {
      if (cloudEnabled && user) return protect(async () => { await cloudRepo.updateRecurrence(recurrenceId, input); await reload() })
      saveLocal(current => ({ ...current, recurrences: current.recurrences.map(x => x.id === recurrenceId ? { ...x, ...input } : x) }))
    },
    async deleteRecurrence(recurrenceId: string) {
      if (cloudEnabled && user) return protect(async () => { await cloudRepo.deleteRecurrence(recurrenceId); await reload() })
      saveLocal(current => ({ ...current, recurrences: current.recurrences.filter(x => x.id !== recurrenceId) }))
    },
    resetLocalDemo() {
      if (cloudEnabled) return
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cloneDemo()))
      setData(cloneDemo())
    },
  }), [data.payments, data.recurrences, reload, saveLocal, user])

  return { data, loading, error, needsWorkspace, joinStudio, reload, actions, today: todayISO() }
}
