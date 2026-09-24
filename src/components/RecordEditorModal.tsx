import { useMemo, useState, type FormEvent, type InputHTMLAttributes } from 'react'
import { ImagePlus, Trash2, X } from 'lucide-react'
import { Modal } from './Modal'
import type {
  Client, Compensation, Deadline, LedgerEntry, MaintenancePeriod, Payment, Recurrence, StudioData, TeamMember,
} from '../types/studio'
import type { useStudio } from '../hooks/useStudio'
import { imageFileToDataUrl } from '../lib/image'

type Actions = ReturnType<typeof useStudio>['actions']
type Kind = 'client' | 'payment' | 'recurrence' | 'ledger' | 'deadline' | 'compensation' | 'maintenance' | 'member'
type RecordType = Client | Payment | Recurrence | LedgerEntry | Deadline | Compensation | MaintenancePeriod | TeamMember | null

export function RecordEditorModal({
  kind,
  record,
  data,
  actions,
  onClose,
  presetClientId,
}: {
  kind: Kind
  record: RecordType
  data: StudioData
  actions: Actions
  onClose: () => void
  presetClientId?: string | null
}) {
  const [saving,setSaving] = useState(false)
  const [error,setError] = useState<string | null>(null)
  const [logoUrl,setLogoUrl] = useState(() => kind === 'client' ? ((record as Client | null)?.logoUrl ?? '') : '')
  const title = useMemo(() => ({
    client: record ? 'Modifica cliente' : 'Nuovo cliente',
    payment: record ? 'Modifica pagamento' : 'Nuovo pagamento',
    recurrence: record ? 'Modifica ricorrenza' : 'Nuova ricorrenza',
    ledger: record ? 'Modifica movimento' : 'Nuovo movimento',
    deadline: record ? 'Modifica scadenza' : 'Nuova scadenza',
    compensation: record ? 'Modifica compenso' : 'Nuovo compenso',
    maintenance: record ? 'Modifica manutenzione' : 'Nuova manutenzione',
    member: record ? 'Modifica persona' : 'Nuova persona',
  })[kind], [kind,record])

  const v = (name: string) => {
    const anyRecord = record as any
    if (!record) {
      if (name === 'clientId') return presetClientId ?? ''
      return ''
    }
    const value = anyRecord[name]
    if (Array.isArray(value)) return value.join(', ')
    if (value == null) return ''
    return String(value)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fd = new FormData(event.currentTarget)
    const s = (name:string) => String(fd.get(name) ?? '').trim()
    const n = (name:string) => Number(s(name) || 0)
    const nullable = (name:string) => s(name) || null
    setSaving(true); setError(null)
    try {
      if (kind === 'client') {
        const payload = {
          name:s('name'),
          status:s('status') as Client['status'],
          website:s('website'),
          contactName:s('contactName'),
          email:s('email'),
          phone:s('phone'),
          services:s('services').split(',').map(x=>x.trim()).filter(Boolean),
          notes:s('notes'),
          yearAcquired:s('yearAcquired') ? n('yearAcquired') : null,
          analyticsEnabled:(record as Client | null)?.analyticsEnabled ?? false,
          leadSector:(record as Client | null)?.leadSector ?? '',
          leadSource:(record as Client | null)?.leadSource ?? '',
          leadStage:(record as Client | null)?.leadStage ?? '',
          nextAction:(record as Client | null)?.nextAction ?? '',
          lastContact:nullable('lastContact'),
          logoUrl,
        }
        if (record) await actions.updateClient(record.id,payload)
        else await actions.createClient(payload)
      }

      if (kind === 'payment') {
        const payload = { clientId:s('clientId'), label:s('label'), amount:n('amount'), dueDate:s('dueDate'), notes:s('notes') }
        if (record) {
          await actions.updatePayment(record.id,{...payload,status:s('status') as Payment['status'],paidAt:s('status') === 'paid' ? ((record as Payment).paidAt ?? new Date().toISOString()) : null})
        } else await actions.createPayment(payload)
      }

      if (kind === 'recurrence') {
        const payload = { clientId:s('clientId'), label:s('label'), amount:n('amount'), intervalMonths:n('intervalMonths'), nextDueDate:s('nextDueDate'), dueDay:null, notes:s('notes') }
        if (record) await actions.updateRecurrence(record.id,{...payload,active:fd.get('active') === 'on'})
        else await actions.createRecurrence(payload)
      }

      if (kind === 'ledger') {
        const payload = { entryDate:nullable('entryDate'), direction:s('direction') as LedgerEntry['direction'], clientId:nullable('clientId'), description:s('description'), amount:n('amount'), status:s('status'), category:s('category'), notes:s('notes') }
        if (record) await actions.updateLedger(record.id,payload)
        else await actions.createLedger(payload)
      }

      if (kind === 'deadline') {
        const payload = { clientId:nullable('clientId'), service:s('service'), provider:s('provider'), dueDate:s('dueDate'), cost:s('cost') ? n('cost') : null, status:s('status'), notes:s('notes') }
        if (record) await actions.updateDeadline(record.id,payload)
        else await actions.createDeadline(payload)
      }

      if (kind === 'compensation') {
        const memberId = nullable('memberId')
        const memberName = data.members.find(m => m.id === memberId)?.name ?? s('memberName')
        const payload = { entryDate:nullable('entryDate'), memberId, memberName, clientId:nullable('clientId'), description:s('description'), amount:n('amount'), status:s('status'), notes:s('notes') }
        if (record) await actions.updateCompensation(record.id,payload)
        else await actions.createCompensation(payload)
      }

      if (kind === 'maintenance') {
        const payload = { clientId:nullable('clientId'), service:s('service'), periodicity:s('periodicity'), amount:n('amount'), periodFrom:s('periodFrom'), periodTo:s('periodTo'), status:s('status'), notes:s('notes') }
        if (record) await actions.updateMaintenance(record.id,payload)
        else await actions.createMaintenance(payload)
      }

      if (kind === 'member') {
        const payload = { name:s('name'), role:s('role') || 'Team' }
        if (record) await actions.updateMember(record.id,{...payload,active:fd.get('active') === 'on'})
        else await actions.createMember(payload)
      }

      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Salvataggio non riuscito')
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!record || !window.confirm('Eliminare definitivamente questo dato?')) return
    setSaving(true)
    try {
      if (kind === 'client') await actions.deleteClient(record.id)
      if (kind === 'payment') await actions.deletePayment(record.id)
      if (kind === 'recurrence') await actions.deleteRecurrence(record.id)
      if (kind === 'ledger') await actions.deleteLedger(record.id)
      if (kind === 'deadline') await actions.deleteDeadline(record.id)
      if (kind === 'compensation') await actions.deleteCompensation(record.id)
      if (kind === 'maintenance') await actions.deleteMaintenance(record.id)
      if (kind === 'member') await actions.updateMember(record.id,{active:false})
      onClose()
    } finally { setSaving(false) }
  }

  return <Modal title={title} onClose={onClose} wide>
    <form className="modal-form editable-record-form" onSubmit={submit}>
      {kind === 'client' && <>
        <label className="logo-upload-field">
          <input type="file" accept="image/*" onChange={async e => {
            const file = e.target.files?.[0]
            if (!file) return
            try {
              setError(null)
              setLogoUrl(await imageFileToDataUrl(file))
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Logo non valido')
            }
          }}/>
          <div className="logo-upload-preview">{logoUrl ? <img src={logoUrl} alt="Anteprima logo cliente"/> : <ImagePlus size={22}/>}</div>
          <div><strong>{logoUrl ? 'Logo cliente' : 'Logo cliente (facoltativo)'}</strong><span>{logoUrl ? 'Puoi sostituirlo oppure rimuoverlo' : 'PNG, JPG o WebP'}</span></div>
          {logoUrl && <button type="button" className="logo-remove-button" title="Rimuovi logo" onClick={event => { event.preventDefault(); event.stopPropagation(); setLogoUrl('') }}><X size={14}/></button>}
        </label>
        <div className="field-grid two"><Field name="name" label="Nome" defaultValue={v('name')} required/><Select name="status" label="Stato" defaultValue={v('status') || 'active'} options={[['active','Attivo'],['in_progress','In lavorazione'],['paused','In pausa'],['lead','Lead'],['archived','Archivio']]}/></div>
        <div className="field-grid two"><Field name="website" label="Dominio / sito" defaultValue={v('website')}/><Field name="yearAcquired" label="Anno acquisizione" type="number" defaultValue={v('yearAcquired')}/></div>
        <div className="field-grid two"><Field name="contactName" label="Referente" defaultValue={v('contactName')}/><Field name="email" label="Email" type="email" defaultValue={v('email')}/></div>
        <div className="field-grid two"><Field name="phone" label="Telefono" defaultValue={v('phone')}/><Field name="lastContact" label="Ultimo contatto" type="date" defaultValue={v('lastContact')}/></div>
        <Field name="services" label="Servizi" defaultValue={v('services')} placeholder="Figma, Sito web, Hosting"/>
        <TextArea name="notes" label="Note" defaultValue={v('notes')}/>
      </>}

      {kind === 'payment' && <>
        <ClientSelect data={data} defaultValue={v('clientId') || presetClientId || ''}/>
        <div className="field-grid two"><Field name="label" label="Voce" defaultValue={v('label')} required/><Field name="amount" label="Importo €" type="number" step="0.01" defaultValue={v('amount')} required/></div>
        <div className="field-grid two"><Field name="dueDate" label="Scadenza" type="date" defaultValue={v('dueDate')} required/><Select name="status" label="Stato" defaultValue={v('status') || 'pending'} options={[['pending','Da incassare'],['paid','Pagato']]}/></div>
        <TextArea name="notes" label="Note" defaultValue={v('notes')}/>
      </>}

      {kind === 'recurrence' && <>
        <ClientSelect data={data} defaultValue={v('clientId') || presetClientId || ''}/>
        <div className="field-grid two"><Field name="label" label="Voce" defaultValue={v('label')} required/><Field name="amount" label="Importo €" type="number" step="0.01" defaultValue={v('amount')} required/></div>
        <div className="field-grid two"><Select name="intervalMonths" label="Frequenza" defaultValue={v('intervalMonths') || '3'} options={[['1','Mensile'],['2','Ogni 2 mesi'],['3','Trimestrale'],['6','Semestrale'],['12','Annuale']]}/><Field name="nextDueDate" label="Prossima scadenza" type="date" defaultValue={v('nextDueDate')} required/></div>
        <label className="checkbox-field"><input type="checkbox" name="active" defaultChecked={record ? Boolean((record as Recurrence).active) : true}/><span>Ricorrenza attiva</span></label>
        <TextArea name="notes" label="Note" defaultValue={v('notes')}/>
      </>}

      {kind === 'ledger' && <>
        <div className="field-grid two"><Field name="entryDate" label="Data" type="date" defaultValue={v('entryDate')}/><Select name="direction" label="Tipo" defaultValue={v('direction') || 'income'} options={[['income','Entrata'],['expense','Uscita']]}/></div>
        <ClientSelect data={data} defaultValue={v('clientId') || presetClientId || ''} allowEmpty/>
        <Field name="description" label="Descrizione" defaultValue={v('description')} required/>
        <div className="field-grid two"><Field name="amount" label="Importo €" type="number" step="0.01" defaultValue={v('amount')} required/><Field name="status" label="Stato" defaultValue={v('status')} placeholder="Incassato, Da incassare, Pagato…"/></div>
        <Field name="category" label="Categoria" defaultValue={v('category')}/>
        <TextArea name="notes" label="Note" defaultValue={v('notes')}/>
      </>}

      {kind === 'deadline' && <>
        <ClientSelect data={data} defaultValue={v('clientId') || presetClientId || ''} allowEmpty/>
        <div className="field-grid two"><Field name="service" label="Servizio" defaultValue={v('service')} required/><Field name="provider" label="Provider" defaultValue={v('provider')}/></div>
        <div className="field-grid two"><Field name="dueDate" label="Scadenza" type="date" defaultValue={v('dueDate')} required/><Field name="cost" label="Costo €" type="number" step="0.01" defaultValue={v('cost')}/></div>
        <Field name="status" label="Stato" defaultValue={v('status')}/>
        <TextArea name="notes" label="Note" defaultValue={v('notes')}/>
      </>}

      {kind === 'compensation' && <>
        <div className="field-grid two"><MemberSelect data={data} defaultValue={v('memberId')}/><ClientSelect data={data} defaultValue={v('clientId') || presetClientId || ''} allowEmpty/></div>
        <Field name="memberName" label="Nome collaboratore (fallback)" defaultValue={v('memberName')}/>
        <Field name="description" label="Descrizione" defaultValue={v('description')} required/>
        <div className="field-grid two"><Field name="amount" label="Importo €" type="number" step="0.01" defaultValue={v('amount')} required/><Field name="entryDate" label="Data" type="date" defaultValue={v('entryDate')}/></div>
        <Field name="status" label="Stato" defaultValue={v('status')}/>
        <TextArea name="notes" label="Note" defaultValue={v('notes')}/>
      </>}

      {kind === 'maintenance' && <>
        <ClientSelect data={data} defaultValue={v('clientId') || presetClientId || ''} allowEmpty/>
        <div className="field-grid two"><Field name="service" label="Servizio" defaultValue={v('service')} required/><Field name="periodicity" label="Periodicità" defaultValue={v('periodicity')}/></div>
        <div className="field-grid two"><Field name="periodFrom" label="Da" type="date" defaultValue={v('periodFrom')} required/><Field name="periodTo" label="A" type="date" defaultValue={v('periodTo')} required/></div>
        <div className="field-grid two"><Field name="amount" label="Importo €" type="number" step="0.01" defaultValue={v('amount')} required/><Field name="status" label="Stato" defaultValue={v('status')}/></div>
        <TextArea name="notes" label="Note" defaultValue={v('notes')}/>
      </>}

      {kind === 'member' && <>
        <div className="field-grid two"><Field name="name" label="Nome" defaultValue={v('name')} required/><Field name="role" label="Ruolo" defaultValue={v('role')}/></div>
        <label className="checkbox-field"><input type="checkbox" name="active" defaultChecked={record ? Boolean((record as TeamMember).active) : true}/><span>Persona attiva</span></label>
      </>}

      {error && <div className="alert error">{error}</div>}
      <div className="modal-actions split">
        {record ? <button type="button" className="danger-button" disabled={saving} onClick={() => void remove()}><Trash2 size={14}/> Elimina</button> : <span/>}
        <div className="editor-save-group"><button type="button" className="secondary-button" onClick={onClose}>Annulla</button><button className="primary-button" disabled={saving}>{saving ? 'Salvataggio…' : 'Salva'}</button></div>
      </div>
    </form>
  </Modal>
}

function Field(props: InputHTMLAttributes<HTMLInputElement> & {name:string;label:string}) {
  const {label,...rest}=props
  return <label className="form-field"><span>{label}</span><input className="field" {...rest}/></label>
}
function TextArea({name,label,defaultValue}:{name:string;label:string;defaultValue?:string}) {
  return <label className="form-field"><span>{label}</span><textarea className="field" rows={3} name={name} defaultValue={defaultValue}/></label>
}
function Select({name,label,defaultValue,options}:{name:string;label:string;defaultValue:string;options:string[][]}) {
  return <label className="form-field"><span>{label}</span><select className="field" name={name} defaultValue={defaultValue}>{options.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
}
function ClientSelect({data,defaultValue,allowEmpty=false}:{data:StudioData;defaultValue:string;allowEmpty?:boolean}) {
  const clients = [...data.clients]
    .filter(c => c.status !== 'archived' && c.status !== 'lead')
    .sort((a,b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  return <label className="form-field"><span>Cliente / lavoro</span><select className="field" name="clientId" defaultValue={defaultValue}>{allowEmpty && <option value="">4Bit Studio / Nessun cliente</option>}{!allowEmpty && <option value="" disabled>Seleziona…</option>}{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
}
function MemberSelect({data,defaultValue}:{data:StudioData;defaultValue:string}) {
  return <label className="form-field"><span>Collaboratore</span><select className="field" name="memberId" defaultValue={defaultValue}><option value="">Nessuno</option>{data.members.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
}
