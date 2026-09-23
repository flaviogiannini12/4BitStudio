import { useState, type FormEvent } from 'react'
import { ArrowRight, Check, LoaderCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

export function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setLoading(true); setError(null); setMessage(null)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        if (!data.session) setMessage('Account creato. Controlla la mail per confermare l’indirizzo.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Accesso non riuscito')
    } finally { setLoading(false) }
  }

  return (
    <main className="auth-wrap">
      <div className="auth-shell">
        <section className="auth-brand">
          <div className="brand-word">4Bit Studio</div>
          <div>
            <p className="auth-kicker">Studio management, without the noise.</p>
            <h1>Clienti, task e scadenze. Tutto nel posto giusto.</h1>
            <div className="auth-points">
              <p><Check size={16}/> Stato clienti sempre visibile</p>
              <p><Check size={16}/> Pagamenti e rinnovi con countdown</p>
              <p><Check size={16}/> Team sincronizzato su ogni dispositivo</p>
            </div>
          </div>
          <small>4Bit Studio · Gestionale interno</small>
        </section>
        <section className="auth-form-wrap">
          <div className="auth-form">
            <div className="mobile-brand">4Bit Studio</div>
            <p className="muted-label">{mode === 'login' ? 'Bentornato' : 'Nuovo account'}</p>
            <h2>{mode === 'login' ? 'Accedi' : 'Crea lo spazio'}</h2>
            <p className="form-copy">Lo stesso gestionale su computer, telefono e tablet.</p>
            <form onSubmit={submit} className="form-stack">
              <label><span>Email</span><input className="field" type="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>
              <label><span>Password</span><input className="field" type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} /></label>
              {error && <div className="alert error">{error}</div>}
              {message && <div className="alert success">{message}</div>}
              <button className="primary-button full" disabled={loading}>{loading ? <LoaderCircle className="spin" size={18}/> : <>{mode === 'login' ? 'Accedi' : 'Registrati'} <ArrowRight size={17}/></>}</button>
            </form>
            <button className="auth-switch" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>{mode === 'login' ? 'Non hai un account? Registrati' : 'Hai già un account? Accedi'}</button>
          </div>
        </section>
      </div>
    </main>
  )
}
