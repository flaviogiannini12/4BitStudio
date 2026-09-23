export type ClientStatus = 'active' | 'in_progress' | 'paused' | 'archived' | 'lead'
export type ProjectStatus = 'planning' | 'in_progress' | 'review' | 'done'
export type TaskStatus = 'todo' | 'doing' | 'done'
export type PaymentStatus = 'pending' | 'paid'

export interface Client {
  id: string
  name: string
  status: ClientStatus
  website: string
  contactName: string
  email: string
  phone: string
  logoUrl: string
  services: string[]
  notes: string
  yearAcquired: number | null
  analyticsEnabled: boolean
  leadSector: string
  leadSource: string
  leadStage: string
  nextAction: string
  lastContact: string | null
  createdAt: string
}

export interface TeamMember {
  id: string
  name: string
  role: string
  active: boolean
  createdAt: string
}

export interface Project {
  id: string
  clientId: string
  name: string
  status: ProjectStatus
  deadline: string | null
  description: string
  createdAt: string
}

export interface Task {
  id: string
  title: string
  clientId: string | null
  projectId: string | null
  assigneeId: string | null
  dueDate: string | null
  status: TaskStatus
  description: string
  checklist: { id: string; text: string; done: boolean }[]
  createdAt: string
  completedAt: string | null
}

export interface Recurrence {
  id: string
  clientId: string
  label: string
  amount: number
  intervalMonths: number
  dueDay: number | null
  nextDueDate: string
  active: boolean
  notes: string
  createdAt: string
}

export interface Payment {
  id: string
  clientId: string
  projectId: string | null
  recurrenceId: string | null
  label: string
  amount: number
  dueDate: string
  status: PaymentStatus
  paidAt: string | null
  reminderCount: number
  lastReminderAt: string | null
  notes: string
  createdAt: string
}

export interface LedgerEntry {
  id: string
  entryDate: string | null
  direction: 'income' | 'expense'
  clientId: string | null
  description: string
  amount: number
  status: string
  category: string
  notes: string
}

export interface Compensation {
  id: string
  entryDate: string | null
  memberId: string | null
  memberName: string
  clientId: string | null
  description: string
  amount: number
  status: string
  notes: string
}

export interface Deadline {
  id: string
  clientId: string | null
  service: string
  provider: string
  dueDate: string
  cost: number | null
  status: string
  notes: string
}

export interface MaintenancePeriod {
  id: string
  clientId: string | null
  service: string
  periodicity: string
  amount: number
  periodFrom: string
  periodTo: string
  status: string
  notes: string
}

export interface AccessCredential {
  id: string
  clientId: string | null
  category: string
  service: string
  scopeLabel: string
  username: string
  password: string
  notes: string
  createdAt: string
}

export interface StudioData {
  clients: Client[]
  members: TeamMember[]
  projects: Project[]
  tasks: Task[]
  recurrences: Recurrence[]
  payments: Payment[]
  ledgerEntries: LedgerEntry[]
  compensations: Compensation[]
  deadlines: Deadline[]
  maintenancePeriods: MaintenancePeriod[]
}

export interface ClientInput {
  name: string
  status?: ClientStatus
  website?: string
  contactName?: string
  email?: string
  phone?: string
  logoUrl?: string
  services?: string[]
  notes?: string
  yearAcquired?: number | null
  analyticsEnabled?: boolean
  leadSector?: string
  leadSource?: string
  leadStage?: string
  nextAction?: string
  lastContact?: string | null
}

export interface ProjectInput {
  clientId: string
  name: string
  status?: ProjectStatus
  deadline?: string | null
  description?: string
}

export interface TaskInput {
  title: string
  clientId?: string | null
  projectId?: string | null
  assigneeId?: string | null
  dueDate?: string | null
  status?: TaskStatus
  description?: string
  checklist?: { id: string; text: string; done: boolean }[]
}

export interface PaymentInput {
  clientId: string
  projectId?: string | null
  recurrenceId?: string | null
  label: string
  amount: number
  dueDate: string
  notes?: string
}

export interface RecurrenceInput {
  clientId: string
  label: string
  amount: number
  intervalMonths: number
  dueDay?: number | null
  nextDueDate: string
  notes?: string
}

export interface TeamMemberInput {
  name: string
  role?: string
}
