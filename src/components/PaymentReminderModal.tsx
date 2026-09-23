import { useMemo, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Modal } from './Modal'
import { money } from '../lib/date'
import type { Client, Payment } from '../types/studio'

export function PaymentReminderModal({ payment, client, onRecord, onClose }: { payment: Payment; client?: Client; onRecord: () => Promise<void>; onClose: () => void }) {
  const defaultText = useMemo(() => `Ciao${client?.contactName ? ` ${client.contactName}` : ''}, ti ricordiamo il pagamento di ${money(payment.amount)} relativo a ${payment.label}. La scadenza prevista è il ${new Intl.DateTimeFormat('it-IT').format(new Date(`${payment.dueDate}T12:00:00`))}. Grazie!`, [client, payment])
  const [text, setText] = useState(defaultText)
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }
  async function record() {
    setSaving(true)
    await onRecord()
    setSaving(false)
    onClose()
  }

  return <Modal title="Sollecito pagamento" onClose={onClose}>
    <div className="reminder-summary"><strong>{client?.name ?? 'Cliente'}</strong><span>{payment.label} · {money(payment.amount)}</span></div>
    <label className="form-field"><span>Messaggio</span><textarea className="field reminder-text" rows={7} value={text} onChange={e => setText(e.target.value)}/></label>
    <div className="reminder-note">Solleciti già registrati: <strong>{payment.reminderCount}</strong>{payment.lastReminderAt ? ` · ultimo ${new Intl.DateTimeFormat('it-IT').format(new Date(payment.lastReminderAt))}` : ''}</div>
    <div className="modal-actions split"><button className="secondary-button" onClick={() => void copy()}>{copied ? <Check size={15}/> : <Copy size={15}/>} {copied ? 'Copiato' : 'Copia messaggio'}</button><button className="primary-button" disabled={saving} onClick={() => void record()}>{saving ? 'Salvo…' : 'Segna sollecito inviato'}</button></div>
  </Modal>
}
