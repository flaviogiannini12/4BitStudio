import type { StudioData } from '../types/studio'

const now = new Date()
const iso = (offset: number) => {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const demoData: StudioData = {
  clients: [
    { id: 'c-oxymoro', name: 'Studio Alpha', status: 'active', website: 'studioalpha.it', contactName: '', email: '', phone: '', logoUrl: '', services: ['Sito', 'Hosting', 'Mantenimento'], notes: 'Manutenzione trimestrale attiva.', yearAcquired: null, analyticsEnabled: false, leadSector: '', leadSource: '', leadStage: '', nextAction: '', lastContact: null, createdAt: iso(-500) },
    { id: 'c-trattoria', name: 'Cliente Beta', status: 'active', website: '', contactName: '', email: '', phone: '', logoUrl: '', services: ['Sito', 'Hosting'], notes: '', yearAcquired: null, analyticsEnabled: false, leadSector: '', leadSource: '', leadStage: '', nextAction: '', lastContact: null, createdAt: iso(-420) },
    { id: 'c-maurizio', name: 'Cliente Gamma', status: 'active', website: 'clientegamma.it', contactName: '', email: '', phone: '', logoUrl: '', services: ['Figma', 'Sito', 'Hosting'], notes: '', yearAcquired: null, analyticsEnabled: false, leadSector: '', leadSource: '', leadStage: '', nextAction: '', lastContact: null, createdAt: iso(-400) },
    { id: 'c-uar', name: 'Cliente Delta', status: 'active', website: '', contactName: '', email: '', phone: '', logoUrl: '', services: ['Sito', 'Hosting'], notes: '', yearAcquired: null, analyticsEnabled: false, leadSector: '', leadSource: '', leadStage: '', nextAction: '', lastContact: null, createdAt: iso(-180) },
    { id: 'c-astra', name: 'Cliente Epsilon', status: 'in_progress', website: '', contactName: '', email: '', phone: '', logoUrl: '', services: ['Sito'], notes: '', yearAcquired: null, analyticsEnabled: false, leadSector: '', leadSource: '', leadStage: '', nextAction: '', lastContact: null, createdAt: iso(-80) },
  ],
  members: [
    { id: 'm-edoardo', name: 'Edoardo', role: 'Team', active: true, createdAt: iso(-365) },
    { id: 'm-flavio', name: 'Flavio', role: 'Team', active: true, createdAt: iso(-365) },
    { id: 'm-francesco', name: 'Francesco', role: 'Team', active: true, createdAt: iso(-365) },
    { id: 'm-matteo', name: 'Matteo', role: 'Team', active: true, createdAt: iso(-365) },
  ],
  projects: [
    { id: 'p-oxy-site', clientId: 'c-oxymoro', name: 'Sito web', status: 'review', deadline: iso(7), description: '', createdAt: iso(-300) },
    { id: 'p-trattoria', clientId: 'c-trattoria', name: 'Sito web', status: 'in_progress', deadline: iso(18), description: '', createdAt: iso(-120) },
    { id: 'p-uar', clientId: 'c-uar', name: 'Sito web', status: 'in_progress', deadline: iso(12), description: '', createdAt: iso(-100) },
    { id: 'p-astra', clientId: 'c-astra', name: 'Nuovo sito', status: 'in_progress', deadline: iso(24), description: '', createdAt: iso(-50) },
  ],
  tasks: [
    { id: 't1', title: 'Sistemare home mobile', clientId: 'c-oxymoro', projectId: 'p-oxy-site', assigneeId: 'm-flavio', dueDate: iso(2), status: 'doing', description: '', checklist: [], createdAt: iso(-10), completedAt: null },
    { id: 't2', title: 'Rivedere cards servizi', clientId: 'c-oxymoro', projectId: 'p-oxy-site', assigneeId: 'm-edoardo', dueDate: iso(4), status: 'todo', description: '', checklist: [], createdAt: iso(-8), completedAt: null },
    { id: 't3', title: 'Responsive video', clientId: 'c-oxymoro', projectId: 'p-oxy-site', assigneeId: 'm-francesco', dueDate: iso(6), status: 'todo', description: '', checklist: [], createdAt: iso(-8), completedAt: null },
    { id: 't4', title: 'Pagina Chi siamo', clientId: 'c-trattoria', projectId: 'p-trattoria', assigneeId: 'm-matteo', dueDate: iso(5), status: 'doing', description: '', checklist: [], createdAt: iso(-15), completedAt: null },
    { id: 't5', title: 'Richiedere dati mancanti', clientId: 'c-uar', projectId: 'p-uar', assigneeId: 'm-flavio', dueDate: iso(1), status: 'todo', description: '', checklist: [], createdAt: iso(-4), completedAt: null },
    { id: 't6', title: 'Impostare wireframe homepage', clientId: 'c-astra', projectId: 'p-astra', assigneeId: 'm-edoardo', dueDate: iso(3), status: 'doing', description: '', checklist: [], createdAt: iso(-3), completedAt: null },
    { id: 't7', title: 'Preparare contenuti landing', clientId: 'c-astra', projectId: 'p-astra', assigneeId: 'm-francesco', dueDate: iso(10), status: 'todo', description: '', checklist: [], createdAt: iso(-2), completedAt: null },
  ],
  recurrences: [
    { id: 'r-oxy', clientId: 'c-oxymoro', label: 'Mantenimento sito', amount: 75, intervalMonths: 3, dueDay: null, nextDueDate: iso(8), active: true, notes: 'Trimestrale', yearAcquired: null, analyticsEnabled: false, leadSector: '', leadSource: '', leadStage: '', nextAction: '', lastContact: null, createdAt: iso(-300) },
    { id: 'r-demo-monthly', clientId: 'c-trattoria', label: 'Servizio mensile', amount: 250, intervalMonths: 1, dueDay: null, nextDueDate: iso(3), active: true, notes: '', yearAcquired: null, analyticsEnabled: false, leadSector: '', leadSource: '', leadStage: '', nextAction: '', lastContact: null, createdAt: iso(-90) },
  ],
  ledgerEntries: [],
  compensations: [],
  deadlines: [],
  maintenancePeriods: [],
  payments: [
    { id: 'pay-uar', clientId: 'c-uar', projectId: 'p-uar', recurrenceId: null, label: 'Saldo sito web', amount: 500, dueDate: iso(-2), status: 'pending', paidAt: null, reminderCount: 0, lastReminderAt: null, notes: 'Da sollecitare', yearAcquired: null, analyticsEnabled: false, leadSector: '', leadSource: '', leadStage: '', nextAction: '', lastContact: null, createdAt: iso(-20) },
    { id: 'pay-oxy', clientId: 'c-oxymoro', projectId: null, recurrenceId: 'r-oxy', label: 'Mantenimento sito', amount: 75, dueDate: iso(8), status: 'pending', paidAt: null, reminderCount: 0, lastReminderAt: null, notes: '', yearAcquired: null, analyticsEnabled: false, leadSector: '', leadSource: '', leadStage: '', nextAction: '', lastContact: null, createdAt: iso(-10) },
    { id: 'pay-monthly', clientId: 'c-trattoria', projectId: null, recurrenceId: 'r-demo-monthly', label: 'Servizio mensile', amount: 250, dueDate: iso(3), status: 'pending', paidAt: null, reminderCount: 0, lastReminderAt: null, notes: '', yearAcquired: null, analyticsEnabled: false, leadSector: '', leadSource: '', leadStage: '', nextAction: '', lastContact: null, createdAt: iso(-8) },
  ],
}
