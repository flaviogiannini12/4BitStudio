import { useState } from 'react'
import { Archive, ArrowDown, ArrowLeft, ArrowUp, Camera, GripVertical, MoreHorizontal, Pencil, Plus, RotateCcw, Trash2, X } from 'lucide-react'
import { countdownLabel, formatShortDate, money } from '../lib/date'
import { clientStatusLabel, taskStatusLabel } from '../lib/labels'
import { imageFileToDataUrl } from '../lib/image'
import { ClientLogo } from '../components/ClientLogo'
import { RecordEditorModal } from '../components/RecordEditorModal'
import { TaskEditorModal } from '../components/TaskEditorModal'
import type { Client, ClientStatus, StudioData } from '../types/studio'
import type { useStudio } from '../hooks/useStudio'

type Actions = ReturnType<typeof useStudio>['actions']

export function ClientsPage({ data, actions, selectedId, onSelect, onNew: _onNew }: { data: StudioData; actions: Actions; selectedId: string | null; onSelect: (id: string | null) => void; onNew: () => void }) {
  const [tab, setTab] = useState<'active' | 'lead' | 'archive'>('active')
  const [creating, setCreating] = useState(false)
  const selected = data.clients.find(c => c.id === selectedId) ?? null

  if (selected) {
    return <ClientDetail client={selected} data={data} actions={actions} onBack={() => onSelect(null)} />
  }

  const activeCount = data.clients.filter(client => client.status !== 'archived' && client.status !== 'lead').length
  const leadCount = data.clients.filter(client => client.status === 'lead').length
  const archiveCount = data.clients.filter(client => client.status === 'archived').length

  const list = data.clients
    .filter(c => tab === 'archive' ? c.status === 'archived' : tab === 'lead' ? c.status === 'lead' : c.status !== 'archived' && c.status !== 'lead')
    .sort((a,b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))

  async function reorderClient(draggedId: string, targetId: string, position: 'before' | 'after') {
    if (draggedId === targetId) return
    const ordered = list.filter(client => client.id !== draggedId)
    const targetIndex = ordered.findIndex(client => client.id === targetId)
    if (targetIndex < 0) return
    const dragged = list.find(client => client.id === draggedId)
    if (!dragged) return
    ordered.splice(position === 'after' ? targetIndex + 1 : targetIndex, 0, dragged)
    await actions.reorderClients(ordered.map(client => client.id))
  }

  async function moveClient(clientId: string, direction: -1 | 1) {
    const index = list.findIndex(client => client.id === clientId)
    const nextIndex = index + direction
    if (index < 0 || nextIndex < 0 || nextIndex >= list.length) return
    const ordered = [...list]
    const [moved] = ordered.splice(index, 1)
    ordered.splice(nextIndex, 0, moved)
    await actions.reorderClients(ordered.map(client => client.id))
  }

  return <section className="section-block page-section">
    <div className="section-heading responsive-heading">
      <div><p className="eyebrow">Un cliente, un solo fascicolo</p><h2>Clienti</h2></div>
      <button className="primary-button" onClick={() => setCreating(true)}><Plus size={15}/> Nuovo cliente</button>
    </div>

    <div className="segmented client-tabs">
      <button className={tab === 'active' ? 'active' : ''} onClick={() => setTab('active')}>Attivi <span className="filter-count">{activeCount}</span></button>
      <button className={tab === 'lead' ? 'active' : ''} onClick={() => setTab('lead')}>Lead <span className="filter-count">{leadCount}</span></button>
      <button className={tab === 'archive' ? 'active' : ''} onClick={() => setTab('archive')}>Archivio <span className="filter-count">{archiveCount}</span></button>
    </div>

    <div className="clients-list">
      {list.map(c => {
        const open = data.tasks.filter(t => t.clientId === c.id && t.status !== 'done')
        const payment = data.payments.filter(p => p.clientId === c.id && p.status === 'pending').sort((a,b) => a.dueDate.localeCompare(b.dueDate))[0]
        return <div
          className="client-list-row client-list-row-sortable"
          key={c.id}
          draggable
          onDragStart={event => {
            event.dataTransfer.setData('text/4bit-client-list', c.id)
            event.dataTransfer.effectAllowed = 'move'
          }}
          onDragOver={event => {
            if (event.dataTransfer.types.includes('text/4bit-client-list')) event.preventDefault()
          }}
          onDrop={event => {
            event.preventDefault()
            const draggedId = event.dataTransfer.getData('text/4bit-client-list')
            if (!draggedId) return
            const rect = event.currentTarget.getBoundingClientRect()
            void reorderClient(draggedId, c.id, event.clientY > rect.top + rect.height / 2 ? 'after' : 'before')
          }}
        >
          <div className="client-reorder-handle" title="Trascina per riordinare"><GripVertical size={15}/></div>
          <button className="client-row-open" onClick={() => onSelect(c.id)}>
          <ClientLogo logoUrl={c.logoUrl} name={c.name}/>
          <div className="client-list-main">
            <div><h3>{c.name}</h3><span className={`status-chip client-${c.status}`}>{clientStatusLabel[c.status]}</span></div>
            <p>{c.status === 'lead'
              ? [c.leadSector,c.leadSource,c.nextAction].filter(Boolean).join(' · ') || 'Lead da lavorare'
              : [c.yearAcquired ? String(c.yearAcquired) : '', c.website, c.services.length ? c.services.join(' · ') : ''].filter(Boolean).join(' · ') || 'Nessun dato inserito'}</p>
          </div>
          <div className="client-list-stat"><strong>{open.length}</strong><span>task aperte</span></div>
          <div className="client-next-payment"><small>{c.status === 'lead' ? 'Stato lead' : 'Prossimo pagamento'}</small><strong>{c.status === 'lead' ? (c.leadStage || 'Da lavorare') : payment ? countdownLabel(payment.dueDate) : '—'}</strong></div>
          <MoreHorizontal size={17}/>
          </button>
          <div className="client-mobile-order">
            <button type="button" aria-label="Sposta su" disabled={list[0]?.id === c.id} onClick={() => void moveClient(c.id,-1)}><ArrowUp size={13}/></button>
            <button type="button" aria-label="Sposta giù" disabled={list[list.length-1]?.id === c.id} onClick={() => void moveClient(c.id,1)}><ArrowDown size={13}/></button>
          </div>
        </div>
      })}
      {list.length === 0 && <div className="empty-page-mini">{tab === 'archive' ? 'Archivio vuoto.' : tab === 'lead' ? 'Nessun lead.' : 'Nessun cliente attivo.'}</div>}
    </div>
    {creating && <RecordEditorModal kind="client" record={null} data={data} actions={actions} onClose={() => setCreating(false)}/>}
  </section>
}

function ClientDetail({ client, data, actions, onBack }: { client: Client; data: StudioData; actions: Actions; onBack: () => void }) {
  const [changingLogo, setChangingLogo] = useState(false)
  const [taskEditorOpen, setTaskEditorOpen] = useState(false)
  const [editor, setEditor] = useState<{kind:'client'|'payment'|'ledger'|'deadline'|'maintenance'; record:any} | null>(null)
  const tasks = (data.tasks ?? []).filter(t => t.clientId === client.id && t.status !== 'done')
  const payments = (data.payments ?? []).filter(p => p.clientId === client.id).sort((a,b) => (b.dueDate ?? '').localeCompare(a.dueDate ?? ''))
  const recurrences = (data.recurrences ?? []).filter(r => r.clientId === client.id)
  const nextDue = tasks.filter(t => t.dueDate).sort((a,b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))[0]
  const deadlines = (data.deadlines ?? []).filter(d => d.clientId === client.id).sort((a,b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
  const maintenance = (data.maintenancePeriods ?? []).filter(m => m.clientId === client.id).sort((a,b) => (b.periodTo ?? '').localeCompare(a.periodTo ?? ''))
  const movements = (data.ledgerEntries ?? []).filter(m => m.clientId === client.id).sort((a,b) => (b.entryDate ?? '').localeCompare(a.entryDate ?? ''))
  const compensations = (data.compensations ?? []).filter(x => x.clientId === client.id)
  const received = movements.filter(x => x.direction === 'income' && x.status === 'Incassato').reduce((sum,x) => sum + x.amount, 0)
  const receivable = movements.filter(x => x.direction === 'income' && x.status !== 'Incassato').reduce((sum,x) => sum + x.amount, 0)
  const costs = movements.filter(x => x.direction === 'expense').reduce((sum,x) => sum + x.amount, 0)
  const teamFees = compensations.reduce((sum,x) => sum + x.amount, 0)

  async function setStatus(status: ClientStatus) {
    await actions.updateClient(client.id, { status })
  }

  async function changeLogo(file?: File) {
    if (!file) return
    setChangingLogo(true)
    try {
      const logoUrl = await imageFileToDataUrl(file)
      await actions.updateClient(client.id, { logoUrl })
    } finally {
      setChangingLogo(false)
    }
  }

  async function removeLogo() {
    if (!client.logoUrl) return
    await actions.updateClient(client.id, { logoUrl: '' })
  }

  async function destroyClient() {
    const ok = window.confirm(`Eliminare definitivamente "${client.name}"? Verranno eliminati anche task, pagamenti e ricorrenze collegati. Questa azione non può essere annullata.`)
    if (!ok) return
    await actions.deleteClient(client.id)
    onBack()
  }

  return <div className="client-detail-wrap">
    <button className="back-button" onClick={onBack}><ArrowLeft size={15}/> Tutti i clienti</button>

    <section className="client-detail-hero section-block">
      <div className="client-detail-title">
        <div className="client-logo-wrap">
          <ClientLogo logoUrl={client.logoUrl} name={client.name} size="lg"/>
          <label className="client-logo-change" title={client.logoUrl ? 'Cambia logo' : 'Aggiungi logo'}>
            <input type="file" accept="image/*" onChange={e => void changeLogo(e.target.files?.[0])}/>
            <Camera size={13}/>
          </label>
          {client.logoUrl && <button type="button" className="client-logo-remove" title="Rimuovi logo" onClick={() => void removeLogo()}><X size={12}/></button>}
        </div>
        <div>
          <div className="client-title-status"><span className={`status-dot status-${client.status}`}/>{clientStatusLabel[client.status]}</div>
          <h2>{client.name}</h2>
          <p>{client.status === 'lead' ? [client.leadSector, client.leadSource, client.nextAction].filter(Boolean).join(' · ') || 'Lead da lavorare' : client.services.join(' · ') || 'Nessun servizio inserito'}{changingLogo ? ' · aggiornamento logo…' : ''}</p>
        </div>
      </div>

      <div className="client-detail-actions">
        <button className="primary-button" onClick={() => setEditor({kind:'client',record:client})}><Pencil size={14}/> Modifica dati</button>
        {client.status !== 'archived'
          ? <button className="secondary-button" onClick={() => void setStatus('archived')}><Archive size={14}/> Archivia</button>
          : <button className="secondary-button" onClick={() => void setStatus('active')}><RotateCcw size={14}/> Riattiva</button>}
        <button className="danger-button" onClick={() => void destroyClient()}><Trash2 size={14}/> Elimina definitivamente</button>
      </div>

      <div className="client-quick-grid">
        <div><small>Task aperte</small><strong>{tasks.length}</strong></div>
        <div><small>Prossima deadline</small><strong>{nextDue ? formatShortDate(nextDue.dueDate) : '—'}</strong></div>
        <div><small>Pagamenti aperti</small><strong>{payments.filter(p => p.status === 'pending').length}</strong></div>
        <div><small>{client.status === 'lead' ? 'Stato lead' : 'Ricorrenze attive'}</small><strong>{client.status === 'lead' ? (client.leadStage || '—') : recurrences.filter(r => r.active).length}</strong></div>
      </div>
    </section>

    <section className="section-block compact-block client-masterdata">
      <div className="section-heading"><div><p className="eyebrow">Dati Excel</p><h2>Scheda cliente</h2></div></div>
      <div className="client-master-grid">
        <div><small>Anno acquisizione</small><strong>{client.yearAcquired ?? '—'}</strong></div>
        <div><small>Stato</small><strong>{clientStatusLabel[client.status]}</strong></div>
        <div><small>Dominio</small><strong>{client.website || '—'}</strong></div>
        <div><small>Contatto</small><strong>{client.contactName || client.email || client.phone || '—'}</strong></div>
        <div className="master-wide"><small>Servizi</small><strong>{client.services.length ? client.services.join(' · ') : '—'}</strong></div>
        <div className="master-wide"><small>Note</small><strong>{client.notes || '—'}</strong></div>
      </div>
    </section>

    {client.status !== 'lead' && <section className="section-block compact-block client-financial-block">
      <div className="section-heading"><div><p className="eyebrow">Redditività</p><h2>Situazione economica</h2></div></div>
      <div className="client-financial-grid">
        <div><small>Incassato</small><strong>{money(received)}</strong></div>
        <div><small>Da incassare</small><strong>{money(receivable)}</strong></div>
        <div><small>Costi</small><strong>{money(costs)}</strong></div>
        <div><small>Compensi team</small><strong>{money(teamFees)}</strong></div>
      </div>
      {movements.length > 0 && <div className="client-movement-list">
        {movements.map(m => <button type="button" className="client-movement-edit" key={m.id} onClick={() => setEditor({kind:'ledger',record:m})}>
          <span className={`ledger-sign ${m.direction}`}>{m.direction === 'income' ? '+' : '−'}</span>
          <div><strong>{m.description || m.category}</strong><small>{m.category}{m.notes ? ' · ' + m.notes : ''}</small></div>
          <span>{m.entryDate ? formatShortDate(m.entryDate) : 'Data da confermare'}</span>
          <b>{m.direction === 'income' ? '+' : '−'}{money(m.amount)}</b>
          <em>{m.status}</em>
        </button>)}
      </div>}
    </section>}

    <section className="section-block compact-block client-tasks-block">
      <div className="section-heading"><div><p className="eyebrow">Adesso</p><h2>Task aperte</h2></div><button className="secondary-button" onClick={() => setTaskEditorOpen(true)}><Plus size={14}/> Nuova task</button></div>
      <div className="simple-list">
        {tasks.map(t => <div className="simple-task" key={t.id}>
          <span className={`task-state-mini ${t.status}`}/>
          <div><strong>{t.title}</strong><small>{taskStatusLabel[t.status]}</small></div>
          <span>{formatShortDate(t.dueDate)}</span>
        </div>)}
        {!tasks.length && <div className="empty-inline">Nessuna task aperta.</div>}
      </div>
    </section>

    <section className="section-block compact-block">
      <div className="section-heading"><div><p className="eyebrow">Storico e prossime scadenze</p><h2>Pagamenti</h2></div><button className="secondary-button" onClick={() => setEditor({kind:'payment',record:null})}><Plus size={14}/> Aggiungi</button></div>
      <div className="client-payments">
        {payments.slice(0,8).map(p => <button type="button" className="client-payment-edit" key={p.id} onClick={() => setEditor({kind:'payment',record:p})}>
          <span className={`payment-dot ${p.status}`}/>
          <div><strong>{p.label}</strong><small>{formatShortDate(p.dueDate)}{p.recurrenceId ? ' · ricorrente' : ''}</small></div>
          <b>{money(p.amount)}</b>
          <span className={`status-chip ${p.status === 'paid' ? 'payment-paid' : 'payment-pending'}`}>{p.status === 'paid' ? 'Pagato' : countdownLabel(p.dueDate)}</span>
        </button>)}
        {!payments.length && <div className="empty-inline">Nessun pagamento.</div>}
      </div>
    </section>

    {(deadlines.length > 0 || maintenance.length > 0) && <div className="client-detail-grid lower">
      <section className="section-block compact-block">
        <div className="section-heading"><div><p className="eyebrow">Hosting e servizi</p><h2>Scadenze</h2></div><button className="secondary-button" onClick={() => setEditor({kind:'deadline',record:null})}><Plus size={14}/> Aggiungi</button></div>
        <div className="simple-list">
          {deadlines.map(d => <button type="button" className="simple-task editable-simple-row" key={d.id} onClick={() => setEditor({kind:'deadline',record:d})}><span className={`status-dot ${d.status === 'SCADUTO' ? 'status-paused' : 'status-active'}`}/><div><strong>{d.service}</strong><small>{d.provider}{d.notes ? ' · ' + d.notes : ''}</small></div><span>{formatShortDate(d.dueDate)}</span></button>)}
          {!deadlines.length && <div className="empty-inline">Nessuna scadenza.</div>}
        </div>
      </section>
      <section className="section-block compact-block">
        <div className="section-heading"><div><p className="eyebrow">Storico</p><h2>Manutenzioni</h2></div><button className="secondary-button" onClick={() => setEditor({kind:'maintenance',record:null})}><Plus size={14}/> Aggiungi</button></div>
        <div className="simple-list">
          {maintenance.map(m => <button type="button" className="simple-task editable-simple-row" key={m.id} onClick={() => setEditor({kind:'maintenance',record:m})}><span className={`status-dot ${m.status === 'Pagato' ? 'status-active' : 'status-in_progress'}`}/><div><strong>{m.service}</strong><small>{m.periodicity} · {m.status}{m.notes ? ' · ' + m.notes : ''}</small></div><span>{money(m.amount)}</span></button>)}
          {!maintenance.length && <div className="empty-inline">Nessuna manutenzione.</div>}
        </div>
      </section>
    </div>}

    <TaskEditorModal
      open={taskEditorOpen}
      task={null}
      initialDate={null}
      initialClientId={client.id}
      data={data}
      actions={actions}
      onClose={() => setTaskEditorOpen(false)}
    />

    {editor && <RecordEditorModal
      kind={editor.kind}
      record={editor.record}
      data={data}
      actions={actions}
      presetClientId={client.id}
      onClose={() => setEditor(null)}
    />}
  </div>
}
