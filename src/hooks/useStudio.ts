import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { addMonths, todayISO } from '../lib/date'
import { demoData } from '../lib/demo'
import { cloudEnabled, supabase } from '../lib/supabase'
import { claimInitialWorkspace, cloudRepo, hasWorkspaceMembership, joinWorkspace, loadStudioData } from '../lib/studioRepository'
import type {
  Client, ClientInput, Compensation, CompensationInput, Deadline, DeadlineInput, LedgerEntry, LedgerEntryInput, MaintenancePeriod, MaintenancePeriodInput,
  Payment, PaymentInput, Project, ProjectInput, Recurrence, RecurrenceInput,
  StudioData, Task, TaskInput, TeamMember, TeamMemberInput,
} from '../types/studio'

const STORAGE_KEY = '4bit-studio-v1'
const EXCEL_MIGRATION_KEY = '4bit-studio-excel-seed-2026-09'
const cloneDemo = () => JSON.parse(JSON.stringify(demoData)) as StudioData
const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`

function normalizeStudioData(value?: Partial<StudioData> | null): StudioData {
  const seed = cloneDemo()
  const source = value ?? {}
  const clients = (source.clients ?? []).map(client => ({
    ...client,
    yearAcquired: client.yearAcquired ?? null,
    analyticsEnabled: client.analyticsEnabled ?? false,
    leadSector: client.leadSector ?? '',
    leadSource: client.leadSource ?? '',
    leadStage: client.leadStage ?? '',
    nextAction: client.nextAction ?? '',
    lastContact: client.lastContact ?? null,
    sortOrder: client.sortOrder ?? 0,
  })) as StudioData['clients']
  return {
    clients,
    members: source.members ?? [],
    projects: source.projects ?? [],
    tasks: (source.tasks ?? []).map(task => ({ ...task, sortOrder: task.sortOrder ?? 0 })),
    recurrences: source.recurrences ?? [],
    payments: source.payments ?? [],
    ledgerEntries: source.ledgerEntries ?? [],
    compensations: source.compensations ?? [],
    deadlines: source.deadlines ?? [],
    maintenancePeriods: source.maintenancePeriods ?? [],
  }
}

function readLocal(): StudioData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const seed = cloneDemo()
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed))
      localStorage.setItem(EXCEL_MIGRATION_KEY, '1')
      return seed
    }

    const parsed = normalizeStudioData(JSON.parse(raw))
    const alreadyMigrated = localStorage.getItem(EXCEL_MIGRATION_KEY) === '1'
    if (!alreadyMigrated) {
      const isLegacyDemo = parsed.clients.some(c => ['Studio Alpha','Cliente Beta','Cliente Gamma','Cliente Delta','Cliente Epsilon'].includes(c.name))
      if (isLegacyDemo || parsed.clients.length === 0) {
        const seed = cloneDemo()
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seed))
        localStorage.setItem(EXCEL_MIGRATION_KEY, '1')
        return seed
      }

      const seed = cloneDemo()
      const clientNames = new Set(parsed.clients.map(c => c.name))
      const taskTitles = new Set(parsed.tasks.map(t => t.title))
      const merged: StudioData = {
        ...parsed,
        clients: [...parsed.clients, ...seed.clients.filter(c => !clientNames.has(c.name))],
        tasks: [...parsed.tasks, ...seed.tasks.filter(t => !taskTitles.has(t.title))],
        ledgerEntries: parsed.ledgerEntries.length ? parsed.ledgerEntries : seed.ledgerEntries,
        compensations: parsed.compensations.length ? parsed.compensations : seed.compensations,
        deadlines: parsed.deadlines.length ? parsed.deadlines : seed.deadlines,
        maintenancePeriods: parsed.maintenancePeriods.length ? parsed.maintenancePeriods : seed.maintenancePeriods,
        payments: parsed.payments.length ? parsed.payments : seed.payments,
        recurrences: parsed.recurrences.length ? parsed.recurrences : seed.recurrences,
        members: parsed.members.length ? parsed.members : seed.members,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
      localStorage.setItem(EXCEL_MIGRATION_KEY, '1')
      return merged
    }

    return parsed
  } catch {
    return cloneDemo()
  }
}

export function useStudio(user: User | null, ready: boolean) {
  const [data, setData] = useState<StudioData>(() => cloudEnabled ? { clients: [], members: [], projects: [], tasks: [], recurrences: [], payments: [], ledgerEntries: [], compensations: [], deadlines: [], maintenancePeriods: [] } : readLocal())
  const [loading, setLoading] = useState(cloudEnabled)
  const [error, setError] = useState<string | null>(null)
  const [needsWorkspace, setNeedsWorkspace] = useState(false)
  const realtimeReloadTimer = useRef<number | null>(null)

  const saveLocal = useCallback((recipe: (current: StudioData) => StudioData) => {
    setData(current => {
      const next = recipe(current)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const reload = useCallback(async (silent = false) => {
    if (!cloudEnabled) {
      setData(readLocal())
      return
    }
    if (!user) return
    if (!silent) setLoading(true)
    try {
      let member = await hasWorkspaceMembership()
      if (!member) {
        const claimedWorkspace = await claimInitialWorkspace()
        member = Boolean(claimedWorkspace) || await hasWorkspaceMembership()
      }
      if (!member) {
        setNeedsWorkspace(true)
        setData({ clients: [], members: [], projects: [], tasks: [], recurrences: [], payments: [], ledgerEntries: [], compensations: [], deadlines: [], maintenancePeriods: [] })
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
      if (!silent) setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (!ready) return
    void reload()
  }, [ready, reload])

  const scheduleRealtimeReload = useCallback(() => {
    if (realtimeReloadTimer.current !== null) window.clearTimeout(realtimeReloadTimer.current)
    realtimeReloadTimer.current = window.setTimeout(() => {
      realtimeReloadTimer.current = null
      void reload(true)
    }, 120)
  }, [reload])

  useEffect(() => {
    if (!cloudEnabled || !supabase || !user) return
    const client = supabase
    const refresh = () => scheduleRealtimeReload()
    const refreshAccesses = () => {
      window.dispatchEvent(new Event('4bit:access-refresh'))
      scheduleRealtimeReload()
    }

    const channel = client.channel(`studio-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recurrences' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ledger_entries' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'compensations' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deadlines' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_periods' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'access_credentials' }, refreshAccesses)
      .subscribe(status => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') scheduleRealtimeReload()
      })

    return () => {
      if (realtimeReloadTimer.current !== null) {
        window.clearTimeout(realtimeReloadTimer.current)
        realtimeReloadTimer.current = null
      }
      void client.removeChannel(channel)
    }
  }, [scheduleRealtimeReload, user])

  useEffect(() => {
    if (!cloudEnabled || !user) return

    const refresh = () => scheduleRealtimeReload()
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refresh()
    }

    window.addEventListener('focus', refresh)
    window.addEventListener('online', refresh)
    window.addEventListener('pageshow', refresh)
    document.addEventListener('visibilitychange', onVisibility)

    const safetyRefresh = window.setInterval(() => {
      if (document.visibilityState === 'visible') refresh()
    }, 45000)

    return () => {
      window.removeEventListener('focus', refresh)
      window.removeEventListener('online', refresh)
      window.removeEventListener('pageshow', refresh)
      document.removeEventListener('visibilitychange', onVisibility)
      window.clearInterval(safetyRefresh)
    }
  }, [scheduleRealtimeReload, user])

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
      const value: Client = { id: id('client'), name: input.name, status: input.status ?? 'active', website: input.website ?? '', contactName: input.contactName ?? '', email: input.email ?? '', phone: input.phone ?? '', logoUrl: input.logoUrl ?? '', services: input.services ?? [], notes: input.notes ?? '', yearAcquired: input.yearAcquired ?? null, analyticsEnabled: input.analyticsEnabled ?? false, leadSector: input.leadSector ?? '', leadSource: input.leadSource ?? '', leadStage: input.leadStage ?? '', nextAction: input.nextAction ?? '', lastContact: input.lastContact ?? null, sortOrder: input.sortOrder ?? Date.now(), createdAt: new Date().toISOString() }
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
      const value: Task = { id: id('task'), title: input.title, clientId: input.clientId ?? null, projectId: input.projectId ?? null, assigneeId: input.assigneeId ?? null, dueDate: input.dueDate ?? null, status: input.status ?? 'todo', description: input.description ?? '', checklist: input.checklist ?? [], createdAt: new Date().toISOString(), completedAt: null, sortOrder: input.sortOrder ?? Date.now() }
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

    async createLedger(input: LedgerEntryInput) {
      if (cloudEnabled && user) return protect(async () => { await cloudRepo.createLedger(input); await reload() })
      const value: LedgerEntry = { id:id('ledger'), entryDate:input.entryDate ?? null, direction:input.direction, clientId:input.clientId ?? null, description:input.description, amount:input.amount, status:input.status ?? '', category:input.category ?? '', notes:input.notes ?? '' }
      saveLocal(current => ({ ...current, ledgerEntries:[...current.ledgerEntries,value] }))
    },
    async updateLedger(entryId: string, input: Partial<LedgerEntry>) {
      if (cloudEnabled && user) return protect(async () => { await cloudRepo.updateLedger(entryId,input); await reload() })
      saveLocal(current => ({ ...current, ledgerEntries:current.ledgerEntries.map(x => x.id === entryId ? {...x,...input} : x) }))
    },
    async deleteLedger(entryId: string) {
      if (cloudEnabled && user) return protect(async () => { await cloudRepo.deleteLedger(entryId); await reload() })
      saveLocal(current => ({ ...current, ledgerEntries:current.ledgerEntries.filter(x => x.id !== entryId) }))
    },

    async createCompensation(input: CompensationInput) {
      if (cloudEnabled && user) return protect(async () => { await cloudRepo.createCompensation(input); await reload() })
      const value: Compensation = { id:id('comp'), entryDate:input.entryDate ?? null, memberId:input.memberId ?? null, memberName:input.memberName, clientId:input.clientId ?? null, description:input.description, amount:input.amount, status:input.status ?? '', notes:input.notes ?? '' }
      saveLocal(current => ({ ...current, compensations:[...current.compensations,value] }))
    },
    async updateCompensation(compId: string, input: Partial<Compensation>) {
      if (cloudEnabled && user) return protect(async () => { await cloudRepo.updateCompensation(compId,input); await reload() })
      saveLocal(current => ({ ...current, compensations:current.compensations.map(x => x.id === compId ? {...x,...input} : x) }))
    },
    async deleteCompensation(compId: string) {
      if (cloudEnabled && user) return protect(async () => { await cloudRepo.deleteCompensation(compId); await reload() })
      saveLocal(current => ({ ...current, compensations:current.compensations.filter(x => x.id !== compId) }))
    },

    async createDeadline(input: DeadlineInput) {
      if (cloudEnabled && user) return protect(async () => { await cloudRepo.createDeadline(input); await reload() })
      const value: Deadline = { id:id('deadline'), clientId:input.clientId ?? null, service:input.service, provider:input.provider ?? '', dueDate:input.dueDate, cost:input.cost ?? null, status:input.status ?? '', notes:input.notes ?? '' }
      saveLocal(current => ({ ...current, deadlines:[...current.deadlines,value] }))
    },
    async updateDeadline(deadlineId: string, input: Partial<Deadline>) {
      if (cloudEnabled && user) return protect(async () => { await cloudRepo.updateDeadline(deadlineId,input); await reload() })
      saveLocal(current => ({ ...current, deadlines:current.deadlines.map(x => x.id === deadlineId ? {...x,...input} : x) }))
    },
    async deleteDeadline(deadlineId: string) {
      if (cloudEnabled && user) return protect(async () => { await cloudRepo.deleteDeadline(deadlineId); await reload() })
      saveLocal(current => ({ ...current, deadlines:current.deadlines.filter(x => x.id !== deadlineId) }))
    },

    async createMaintenance(input: MaintenancePeriodInput) {
      if (cloudEnabled && user) return protect(async () => { await cloudRepo.createMaintenance(input); await reload() })
      const value: MaintenancePeriod = { id:id('maintenance'), clientId:input.clientId ?? null, service:input.service, periodicity:input.periodicity ?? '', amount:input.amount, periodFrom:input.periodFrom, periodTo:input.periodTo, status:input.status ?? '', notes:input.notes ?? '' }
      saveLocal(current => ({ ...current, maintenancePeriods:[...current.maintenancePeriods,value] }))
    },
    async updateMaintenance(maintenanceId: string, input: Partial<MaintenancePeriod>) {
      if (cloudEnabled && user) return protect(async () => { await cloudRepo.updateMaintenance(maintenanceId,input); await reload() })
      saveLocal(current => ({ ...current, maintenancePeriods:current.maintenancePeriods.map(x => x.id === maintenanceId ? {...x,...input} : x) }))
    },
    async deleteMaintenance(maintenanceId: string) {
      if (cloudEnabled && user) return protect(async () => { await cloudRepo.deleteMaintenance(maintenanceId); await reload() })
      saveLocal(current => ({ ...current, maintenancePeriods:current.maintenancePeriods.filter(x => x.id !== maintenanceId) }))
    },

    async reorderClients(ids: string[]) {
      const base = Date.now()
      if (cloudEnabled && user) return protect(async () => {
        await Promise.all(ids.map((clientId,index) => cloudRepo.updateClient(clientId,{sortOrder:base+index})))
        await reload()
      })
      saveLocal(current => ({ ...current, clients:current.clients.map(client => {
        const index = ids.indexOf(client.id)
        return index >= 0 ? {...client,sortOrder:base+index} : client
      }) }))
    },

    async reorderTasks(ids: string[], dueDate?: string | null) {
      const base = Date.now()
      if (cloudEnabled && user) return protect(async () => {
        await Promise.all(ids.map((taskId,index) => cloudRepo.updateTask(taskId,{sortOrder:base+index, ...(dueDate !== undefined ? {dueDate} : {})})))
        await reload()
      })
      saveLocal(current => ({ ...current, tasks:current.tasks.map(task => {
        const index = ids.indexOf(task.id)
        return index >= 0 ? {...task,sortOrder:base+index, ...(dueDate !== undefined ? {dueDate} : {})} : task
      }) }))
    },

    resetLocalDemo() {
      if (cloudEnabled) return
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cloneDemo()))
      setData(cloneDemo())
    },
  }), [data.payments, data.recurrences, reload, saveLocal, user])

  return { data, loading, error, needsWorkspace, joinStudio, reload, actions, today: todayISO() }
}
