import { useState, type FormEvent } from 'react'
import { ArrowRight, KeyRound, LoaderCircle } from 'lucide-react'

export function WorkspaceJoin({ onJoin }: { onJoin: (code: string) => Promise<void> }) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await onJoin(code.trim().toUpperCase())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Codice studio non valido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-wrap">
      <div className="workspace-join-card">
        <div className="workspace-key"><KeyRound size={22}/></div>
        <p className="eyebrow">4Bit Studio</p>
        <h1>Entra nel workspace.</h1>
        <p className="workspace-copy">Inserisci il codice interno una sola volta. Il tuo account verrà collegato allo spazio condiviso dello studio.</p>
        <form onSubmit={submit} className="form-stack">
          <label className="form-field">
            <span>Codice studio</span>
            <input className="field workspace-code" value={code} onChange={e => setCode(e.target.value)} placeholder="4BIT-XXXX-XXXX" autoComplete="off" required/>
          </label>
          {error && <div className="alert error">{error}</div>}
          <button className="primary-button full" disabled={loading}>{loading ? <LoaderCircle className="spin" size={18}/> : <>Entra <ArrowRight size={17}/></>}</button>
        </form>
      </div>
    </main>
  )
}
