import { useMemo, useState, type FormEvent, type InputHTMLAttributes } from 'react'
import { BriefcaseBusiness, CalendarClock, CheckSquare2, CircleDollarSign, UserPlus, UsersRound } from 'lucide-react'
import { Modal } from './Modal'
import type { StudioData } from '../types/studio'
import type { useStudio } from '../hooks/useStudio'
import { todayISO } from '../lib/date'

type Actions = ReturnType<typeof useStudio>['actions']
type Kind = 'client' | 'project' | 'task' | 'payment' | 'recurrence' | 'member'

const kinds = [
  { id: 'client' as const, label: 'Cliente', icon: UsersRound },
  { id: 'project' as const, label: 'Progetto', icon: BriefcaseBusiness },
  { id: 'task' as const, label: 'Task', icon: CheckSquare2 },
  { id: 'payment' as const, label: 'Pagamento', icon: CircleDollarSign },
  { id: 'recurrence' as const, label: 'Ricorrenza', icon: CalendarClock },
  { id: 'member' as const, label: 'Team', icon: UserPlus },
]

export function QuickCreateModal({ data, actions, onClose, initialKind = 'task' }: { data: StudioData; actions: Actions; onClose: () => void; initialKind?: Kind }) {
  const [kind, setKind] = useState<Kind>(initialKind)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const activeClients = useMemo(() => data.clients.filter(c => c.status !== 'archived'), [data.clients])

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const val = (name: string) => String(fd.get(name) ?? '').trim()
    const nullable = (name: string) => val(name) || null
    setSaving(true); setError(null)
    try {
      if (kind === 'client') {
        await actions.createClient({ name: val('name'), website: val('website'), contactName: val('contactName'), email: val('email'), services: val('services').split(',').map(x => x.trim()).filter(Boolean), notes: val('notes') })
      } else if (kind === 'member') {
        await actions.createMember({ name: val('name'), role: val('role') || 'Team' })
      } else if (kind === 'project') {
        await actions.createProject({ clientId: val('clientId'), name: val('name'), deadline: nullable('deadline'), status: 'planning', description: val('description') })
      } else if (kind === 'task') {
        await actions.createTask({ title: val('title'), clientId: nullable('clientId'), projectId: nullable('projectId'), assigneeId: nullable('assigneeId'), dueDate: nullable('dueDate'), status: 'todo', description: val('description') })
      } else if (kind === 'payment') {
        await actions.createPayment({ clientId: val('clientId'), projectId: nullable('projectId'), label: val('label'), amount: Number(val('amount')), dueDate: val('dueDate'), notes: val('notes') })
      } else {
        await actions.createRecurrence({ clientId: val('clientId'), label: val('label'), amount: Number(val('amount')), intervalMonths: Number(val('intervalMonths')), nextDueDate: val('nextDueDate'), dueDay: null, notes: val('notes') })
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Salvataggio non riuscito')
    } finally { setSaving(false) }
  }

  return (
    <Modal title="Crea nuovo" onClose={onClose} wide>
      <div className="kind-grid">
        {kinds.map(item => {
          const Icon = item.icon
          return <button key={item.id} className={`kind-choice ${kind === item.id ? 'selected' : ''}`} onClick={() => setKind(item.id)}><Icon size={17}/>{item.label}</button>
        })}
      </div>
      <form className="modal-form" onSubmit={submit}>
        {kind === 'client' && <>
          <div className="field-grid two"><Field label="Nome cliente" name="name" required/><Field label="Sito" name="website" placeholder="es. cliente.it"/></div>
          <div className="field-grid two"><Field label="Referente" name="contactName"/><Field label="Email" name="email" type="email"/></div>
          <Field label="Servizi" name="services" placeholder="Sito, Hosting, Mantenimento" hint="Separali con una virgola"/>
          <TextArea label="Note" name="notes"/>
        </>}
        {kind === 'member' && <div className="field-grid two"><Field label="Nome" name="name" required/><Field label="Ruolo" name="role" placeholder="Team"/></div>}
        {kind === 'project' && <>
          <SelectClient data={activeClients}/><div className="field-grid two"><Field label="Nome progetto" name="name" required/><Field label="Deadline" name="deadline" type="date"/></div><TextArea label="Descrizione" name="description"/>
        </>}
        {kind === 'task' && <>
          <Field label="Task" name="title" required/>
          <div className="field-grid two"><SelectClient data={activeClients} allowEmpty/><Select name="projectId" label="Progetto" options={data.projects.map(x => [x.id, x.name])} allowEmpty/></div>
          <div className="field-grid two"><Select name="assigneeId" label="Assegnata a" options={data.members.filter(x => x.active).map(x => [x.id, x.name])} allowEmpty/><Field label="Scadenza" name="dueDate" type="date"/></div>
          <TextArea label="Descrizione" name="description"/>
        </>}
        {kind === 'payment' && <>
          <SelectClient data={activeClients}/>
          <div className="field-grid two"><Field label="Voce" name="label" required/><Field label="Importo €" name="amount" type="number" step="0.01" required/></div>
          <div className="field-grid two"><Field label="Scadenza" name="dueDate" type="date" required defaultValue={todayISO()}/><Select name="projectId" label="Progetto" options={data.projects.map(x => [x.id, x.name])} allowEmpty/></div>
          <TextArea label="Note" name="notes"/>
        </>}
        {kind === 'recurrence' && <>
          <SelectClient data={activeClients}/>
          <div className="field-grid two"><Field label="Voce ricorrente" name="label" required/><Field label="Importo €" name="amount" type="number" step="0.01" required/></div>
          <div className="field-grid two"><Select name="intervalMonths" label="Frequenza" options={[["1","Mensile"],["2","Ogni 2 mesi"],["3","Trimestrale"],["6","Semestrale"],["12","Annuale"]]}/><Field label="Prima / prossima scadenza" name="nextDueDate" type="date" required defaultValue={todayISO()}/></div>
          <TextArea label="Note" name="notes"/>
        </>}
        {error && <div className="alert error">{error}</div>}
        <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Annulla</button><button className="primary-button" disabled={saving}>{saving ? 'Salvataggio…' : 'Salva'}</button></div>
      </form>
    </Modal>
  )
}

function Field({ label, name, hint, ...props }: { label: string; name: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return <label className="form-field"><span>{label}</span><input className="field" name={name} {...props}/>{hint && <small>{hint}</small>}</label>
}
function TextArea({ label, name }: { label: string; name: string }) { return <label className="form-field"><span>{label}</span><textarea className="field" name={name} rows={3}/></label> }
function SelectClient({ data, allowEmpty = false }: { data: StudioData['clients']; allowEmpty?: boolean }) { return <Select name="clientId" label="Cliente" options={data.map(x => [x.id, x.name])} allowEmpty={allowEmpty}/> }
function Select({ label, name, options, allowEmpty = false }: { label: string; name: string; options: string[][]; allowEmpty?: boolean }) {
  return <label className="form-field"><span>{label}</span><select className="field" name={name} defaultValue="">{allowEmpty && <option value="">Nessuno</option>}{!allowEmpty && <option value="" disabled>Seleziona…</option>}{options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>
}
