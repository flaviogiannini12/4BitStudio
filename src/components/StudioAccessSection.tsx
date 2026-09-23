import { useEffect, useState, type FormEvent } from 'react'
import { Copy, Eye, EyeOff, KeyRound, Plus, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface AccessRow {
  id: string
  category: string
  service: string
  scope_label: string
  username: string
  password: string
  notes: string
}

export function StudioAccessSection() {
  const [rows, setRows] = useState<AccessRow[]>([])
  const [adding, setAdding] = useState(false)
  const [visible, setVisible] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)

  async function load() {
    if (!supabase) return
    const { data, error } = await supabase.rpc('list_access_credentials', { p_client_id: null, p_internal_only: true })
    if (error) setError(error.message)
    else setRows(data ?? [])
  }

  useEffect(() => { void load() }, [])

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!supabase) return
    const fd = new FormData(e.currentTarget)
    const { error } = await supabase.rpc('upsert_access_credential', {
      p_id: null,
      p_client_id: null,
      p_category: 'Interno',
      p_service: String(fd.get('service') ?? ''),
      p_scope_label: '4Bit Studio',
      p_username: String(fd.get('username') ?? ''),
      p_password: String(fd.get('password') ?? ''),
      p_notes: String(fd.get('notes') ?? ''),
    })
    if (error) return setError(error.message)
    setAdding(false)
    e.currentTarget.reset()
    await load()
  }

  async function remove(id: string) {
    if (!supabase || !window.confirm('Eliminare questo accesso interno?')) return
    const { error } = await supabase.rpc('delete_access_credential', { p_id: id })
    if (error) setError(error.message)
    else await load()
  }

  return <section className="section-block compact-block studio-access-block">
    <div className="section-heading">
      <div><p className="eyebrow">Riservato</p><h2>Accessi 4Bit Studio</h2></div>
      <button className="secondary-button" onClick={() => setAdding(v => !v)}><Plus size={14}/> Nuovo accesso</button>
    </div>

    {adding && <form className="access-form" onSubmit={submit}>
      <div className="field-grid two">
        <label className="form-field"><span>Servizio</span><input className="field" name="service" required/></label>
        <label className="form-field"><span>Account / username</span><input className="field" name="username" autoComplete="off"/></label>
      </div>
      <div className="field-grid two">
        <label className="form-field"><span>Password</span><input className="field" name="password" type="password" autoComplete="new-password"/></label>
        <label className="form-field"><span>Note</span><input className="field" name="notes"/></label>
      </div>
      <div className="access-form-actions"><button type="button" className="secondary-button" onClick={() => setAdding(false)}>Annulla</button><button className="primary-button">Salva accesso</button></div>
    </form>}

    {error && <div className="alert error">{error}</div>}
    <div className="access-list">
      {rows.map(row => <article className="access-row" key={row.id}>
        <div className="access-icon"><KeyRound size={15}/></div>
        <div className="access-main"><strong>{row.service}</strong><small>{row.scope_label}{row.notes ? ' · ' + row.notes : ''}</small></div>
        <div className="access-value"><span>Account</span><b>{row.username || '—'}</b><button onClick={() => void navigator.clipboard.writeText(row.username)}><Copy size={12}/></button></div>
        <div className="access-value"><span>Password</span><b>{row.password ? (visible[row.id] ? row.password : '••••••••••') : 'Da inserire'}</b>{row.password && <><button onClick={() => setVisible(v => ({...v,[row.id]:!v[row.id]}))}>{visible[row.id] ? <EyeOff size={12}/> : <Eye size={12}/>}</button><button onClick={() => void navigator.clipboard.writeText(row.password)}><Copy size={12}/></button></>}</div>
        <button className="icon-button tiny" onClick={() => void remove(row.id)}><Trash2 size={13}/></button>
      </article>)}
    </div>
  </section>
}
