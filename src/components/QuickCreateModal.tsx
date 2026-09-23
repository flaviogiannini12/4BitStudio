import { useMemo, useState, type FormEvent, type InputHTMLAttributes } from 'react'
import { CalendarClock, CheckSquare2, CircleDollarSign, ImagePlus, UserPlus, UsersRound } from 'lucide-react'
import { Modal } from './Modal'
import type { ClientStatus, StudioData } from '../types/studio'
import type { useStudio } from '../hooks/useStudio'
import { todayISO } from '../lib/date'
import { imageFileToDataUrl } from '../lib/image'

type Actions = ReturnType<typeof useStudio>['actions']
type Kind = 'client' | 'task' | 'payment' | 'recurrence' | 'member'

const kinds = [
  { id: 'client' as const, label: 'Cliente', icon: UsersRound },
  { id: 'task' as const, label: 'Task', icon: CheckSquare2 },
  { id: 'payment' as const, label: 'Pagamento', icon: CircleDollarSign },
  { id: 'recurrence' as const, label: 'Ricorrenza', icon: CalendarClock },
  { id: 'member' as const, label: 'Team', icon: UserPlus },
]

export function QuickCreateModal({ data, actions, onClose, initialKind = 'task' }: { data: StudioData; actions: Actions; onClose: () => void; initialKind?: Kind }) {
  const [kind, setKind] = useState<Kind>(initialKind)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [logoUrl, setLogoUrl] = useState('')
  const activeClients = useMemo(() => data.clients.filter(c => c.status !== 'archived'), [data.clients])

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const val = (name: string) => String(fd.get(name) ?? '').trim()
    const nullable = (name: string) => val(name) || null
    setSaving(true)
    setError(null)

    try {
      if (kind === 'client') {
        if (!logoUrl) throw new Error('Inserisci il logo del cliente.')
        await actions.createClient({
          name: val('name'),
          status: (val('status') || 'active') as ClientStatus,
          website: val('website'),
          contactName: val('contactName'),
          email: val('email'),
          phone: val('phone'),
          logoUrl,
          services: val('services').split(',').map(x => x.trim()).filter(Boolean),
          notes: val('notes'),
          yearAcquired: val('yearAcquired') ? Number(val('yearAcquired')) : null,
          analyticsEnabled: fd.get('analyticsEnabled') === 'on',
        })
      } else if (kind === 'member') {
        await actions.createMember({ name: val('name'), role: val('role') || 'Team' })
      } else if (kind === 'task') {
        await actions.createTask({
          title: val('title'),
          clientId: nullable('clientId'),
          assigneeId: nullable('assigneeId'),
          dueDate: nullable('dueDate'),
          status: 'todo',
          description: val('description'),
        })
      } else if (kind === 'payment') {
        await actions.createPayment({
          clientId: val('clientId'),
          label: val('label'),
          amount: Number(val('amount')),
          dueDate: val('dueDate'),
          notes: val('notes'),
        })
      } else {
        await actions.createRecurrence({
          clientId: val('clientId'),
          label: val('label'),
          amount: Number(val('amount')),
          intervalMonths: Number(val('intervalMonths')),
          nextDueDate: val('nextDueDate'),
          dueDay: null,
          notes: val('notes'),
        })
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Salvataggio non riuscito')
    } finally {
      setSaving(false)
    }
  }

  async function chooseLogo(file?: File) {
    if (!file) return
    try {
      setError(null)
      setLogoUrl(await imageFileToDataUrl(file))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Logo non valido')
    }
  }

  return (
    <Modal title="Crea nuovo" onClose={onClose} wide>
      <div className="kind-grid kind-grid-five">
        {kinds.map(item => {
          const Icon = item.icon
          return <button type="button" key={item.id} className={`kind-choice ${kind === item.id ? 'selected' : ''}`} onClick={() => setKind(item.id)}><Icon size={17}/>{item.label}</button>
        })}
      </div>

      <form className="modal-form" onSubmit={submit}>
        {kind === 'client' && <>
          <label className="logo-upload-field">
            <input type="file" accept="image/*" onChange={e => void chooseLogo(e.target.files?.[0])}/>
            <div className="logo-upload-preview">{logoUrl ? <img src={logoUrl} alt="Anteprima logo cliente"/> : <ImagePlus size={22}/>}</div>
            <div><strong>{logoUrl ? 'Logo inserito' : 'Inserisci logo cliente'}</strong><span>PNG, JPG o WebP · verrà ottimizzato automaticamente</span></div>
          </label>
          <div className="field-grid two"><Field label="Nome cliente" name="name" required/><Field label="Dominio / sito" name="website" placeholder="es. cliente.it"/></div>
          <div className="field-grid two">
            <Field label="Anno acquisizione" name="yearAcquired" type="number" min="2000" max="2100"/>
            <Select name="status" label="Stato" options={[["active","Attivo"],["in_progress","In corso"],["paused","In pausa"]]}/>
          </div>
          <div className="field-grid two"><Field label="Referente" name="contactName"/><Field label="Email" name="email" type="email"/></div>
          <div className="field-grid two"><Field label="Telefono" name="phone"/><Field label="Servizi" name="services" placeholder="Figma, Sito web, Hosting"/></div>
          <label className="checkbox-field"><input type="checkbox" name="analyticsEnabled"/><span>Monitoraggio Analytics attivo</span></label>
          <TextArea label="Note" name="notes"/>
        </>}

        {kind === 'member' && <div className="field-grid two"><Field label="Nome" name="name" required/><Field label="Ruolo" name="role" placeholder="Team"/></div>}

        {kind === 'task' && <>
          <Field label="Task" name="title" required/>
          <div className="field-grid two"><SelectClient data={activeClients} allowEmpty/><Select name="assigneeId" label="Assegnata a" options={data.members.filter(x => x.active).map(x => [x.id, x.name])} allowEmpty/></div>
          <Field label="Scadenza" name="dueDate" type="date"/>
          <TextArea label="Descrizione" name="description"/>
        </>}

        {kind === 'payment' && <>
          <SelectClient data={activeClients}/>
          <div className="field-grid two"><Field label="Voce" name="label" required/><Field label="Importo €" name="amount" type="number" step="0.01" required/></div>
          <Field label="Scadenza" name="dueDate" type="date" required defaultValue={todayISO()}/>
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

function TextArea({ label, name }: { label: string; name: string }) {
  return <label className="form-field"><span>{label}</span><textarea className="field" name={name} rows={3}/></label>
}

function SelectClient({ data, allowEmpty = false }: { data: StudioData['clients']; allowEmpty?: boolean }) {
  return <Select name="clientId" label="Cliente" options={data.map(x => [x.id, x.name])} allowEmpty={allowEmpty}/>
}

function Select({ label, name, options, allowEmpty = false }: { label: string; name: string; options: string[][]; allowEmpty?: boolean }) {
  return <label className="form-field"><span>{label}</span><select className="field" name={name} defaultValue="">{allowEmpty && <option value="">Nessuno</option>}{!allowEmpty && <option value="" disabled>Seleziona…</option>}{options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>
}
