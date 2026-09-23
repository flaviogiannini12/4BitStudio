import { useEffect, useState, type FormEvent } from 'react'
import { Copy, Eye, EyeOff, KeyRound, Pencil, Plus, Trash2 } from 'lucide-react'
import { cloudEnabled, supabase } from '../lib/supabase'

interface AccessRow {
  id: string
  client_id: string | null
  category: string
  service: string
  scope_label: string
  username: string
  password: string
  notes: string
  created_at: string
}

export function ClientAccessSection({ clientId }: { clientId: string }) {
  const [rows, setRows] = useState<AccessRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<AccessRow | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [visible, setVisible] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)

  async function load() {
    if (!supabase) {
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error } = await supabase.rpc('list_access_credentials', { p_client_id: clientId, p_internal_only: false })
    if (error) setError(error.message)
    else setRows((data ?? []).filter((x: AccessRow) => x.client_id === clientId))
    setLoading(false)
  }

  useEffect(() => { void load() }, [clientId])

  function openNew() {
    setEditing(null)
    setFormOpen(true)
    setError(null)
  }

  function openEdit(row: AccessRow) {
    setEditing(row)
    setFormOpen(true)
    setError(null)
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!supabase) return
    const fd = new FormData(e.currentTarget)
    const { error } = await supabase.rpc('upsert_access_credential', {
      p_id: editing?.id ?? null,
      p_client_id: clientId,
      p_category: String(fd.get('category') ?? ''),
      p_service: String(fd.get('service') ?? ''),
      p_scope_label: editing?.scope_label ?? '',
      p_username: String(fd.get('username') ?? ''),
      p_password: String(fd.get('password') ?? ''),
      p_notes: String(fd.get('notes') ?? ''),
    })
    if (error) {
      setError(error.message)
      return
    }
    setFormOpen(false)
    setEditing(null)
    await load()
  }

  async function remove(id: string) {
    if (!supabase || !window.confirm('Eliminare questo accesso?')) return
    const { error } = await supabase.rpc('delete_access_credential', { p_id: id })
    if (error) setError(error.message)
    else await load()
  }

  async function copy(value: string) {
    if (value) await navigator.clipboard.writeText(value)
  }

  return <section className="section-block compact-block client-access-block">
    <div className="section-heading">
      <div><p className="eyebrow">Riservato</p><h2>Account e password</h2></div>
      {cloudEnabled && <button className="secondary-button" onClick={openNew}><Plus size={14}/> Nuovo accesso</button>}
    </div>

    {!cloudEnabled && <div className="access-cloud-note">Gli accessi con password sono disponibili quando il gestionale è collegato a Supabase: non vengono salvati in chiaro nel browser.</div>}

    {formOpen && cloudEnabled && <form key={editing?.id ?? 'new'} className="access-form" onSubmit={submit}>
      <div className="access-form-title">{editing ? 'Modifica accesso' : 'Nuovo accesso'}</div>
      <div className="field-grid two">
        <label className="form-field"><span>Servizio</span><input className="field" name="service" defaultValue={editing?.service ?? ''} placeholder="Aruba, Gmail, Instagram…" required/></label>
        <label className="form-field"><span>Categoria</span><input className="field" name="category" defaultValue={editing?.category ?? ''} placeholder="Hosting, Email, Social…"/></label>
      </div>
      <div className="field-grid two">
        <label className="form-field"><span>Account / username</span><input className="field" name="username" defaultValue={editing?.username ?? ''} autoComplete="off"/></label>
        <label className="form-field"><span>Password</span><input className="field" name="password" type="password" autoComplete="new-password" placeholder={editing?.password ? 'Lascia vuoto per non cambiarla' : ''}/></label>
      </div>
      <label className="form-field"><span>Note</span><input className="field" name="notes" defaultValue={editing?.notes ?? ''}/></label>
      <div className="access-form-actions"><button type="button" className="secondary-button" onClick={() => { setFormOpen(false); setEditing(null) }}>Annulla</button><button className="primary-button">{editing ? 'Salva modifiche' : 'Salva accesso'}</button></div>
    </form>}

    {error && <div className="alert error">{error}</div>}
    {loading ? <div className="empty-inline">Caricamento accessi…</div> :
      <div className="access-list">
        {rows.map(row => <article key={row.id} className="access-row">
          <div className="access-icon"><KeyRound size={15}/></div>
          <div className="access-main"><strong>{row.service || 'Accesso'}</strong><small>{row.category}{row.notes ? ' · ' + row.notes : ''}</small></div>
          <div className="access-value"><span>Account</span><b>{row.username || '—'}</b><button onClick={() => void copy(row.username)}><Copy size={12}/></button></div>
          <div className="access-value"><span>Password</span><b>{row.password ? (visible[row.id] ? row.password : '••••••••••') : 'Da inserire'}</b>{row.password && <><button onClick={() => setVisible(v => ({...v,[row.id]:!v[row.id]}))}>{visible[row.id] ? <EyeOff size={12}/> : <Eye size={12}/>}</button><button onClick={() => void copy(row.password)}><Copy size={12}/></button></>}</div>
          <div className="access-row-actions"><button className="icon-button tiny" onClick={() => openEdit(row)}><Pencil size={13}/></button><button className="icon-button tiny" onClick={() => void remove(row.id)}><Trash2 size={13}/></button></div>
        </article>)}
        {cloudEnabled && !rows.length && <div className="empty-inline">Nessun accesso registrato.</div>}
      </div>}
  </section>
}
