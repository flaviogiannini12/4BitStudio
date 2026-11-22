import { useEffect, useState } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { AppNav, type AppPage } from './components/AppNav'
import { CompletionConfetti } from './components/CompletionConfetti'
import { PremiumLoader } from './components/PremiumLoader'
import { AuthScreen } from './components/AuthScreen'
import { PageHeader } from './components/PageHeader'
import { QuickCreateModal } from './components/QuickCreateModal'
import { WorkspaceJoin } from './components/WorkspaceJoin'
import { useAuth } from './hooks/useAuth'
import { useStudio } from './hooks/useStudio'
import { useEditorial } from './hooks/useEditorial'
import { ClientsPage } from './pages/ClientsPage'
import { EditorialPage } from './pages/EditorialPage'
import { PaymentsPage } from './pages/PaymentsPage'
import { TasksPage } from './pages/TasksPage'
import { TeamPage } from './pages/TeamPage'

const pages: AppPage[] = ['clients','tasks','editorial','payments','team']
type CreateKind = 'client' | 'task' | 'payment' | 'recurrence' | 'member'

function readPage(): AppPage {
  const value = window.location.hash.replace('#','')
  if (value === 'home') return 'clients'
  if (value === 'stats') return 'team'
  return pages.includes(value as AppPage) ? value as AppPage : 'clients'
}

const titles: Record<AppPage, { title: string; eyebrow: string }> = {
  clients: { title: 'Ogni cliente, nel suo posto.', eyebrow: '' },
  tasks: { title: 'Cosa c’è da fare.', eyebrow: '' },
  editorial: { title: '', eyebrow: '' },
  payments: { title: 'Economia dello studio.', eyebrow: '' },
  team: { title: 'Team', eyebrow: '' },
}

export default function App() {
  const auth = useAuth()
  const studio = useStudio(auth.user, !auth.cloudEnabled || Boolean(auth.user))
  const editorial = useEditorial(auth.user, studio.data.members)
  const [page, setPage] = useState<AppPage>(readPage)
  const [createKind, setCreateKind] = useState<CreateKind | null>(null)
  const [taskCreateSignal,setTaskCreateSignal] = useState(0)
  const [selectedClient, setSelectedClient] = useState<string | null>(null)
  const [confettiBurst, setConfettiBurst] = useState(0)
  const [bootReady, setBootReady] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setBootReady(true), 2200)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    const onHash = () => setPage(readPage())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  function navigate(next: AppPage) {
    setPage(next)
    if (next !== 'clients') setSelectedClient(null)
    history.replaceState(null, '', `#${next}`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function celebrateCompletion() {
    setConfettiBurst(current => current + 1)
    if (window.matchMedia('(max-width: 767px), (pointer: coarse)').matches && typeof navigator.vibrate === 'function') {
      navigator.vibrate(15)
    }
  }

  if (!bootReady || auth.loading) return <PremiumLoader/>
  if (auth.cloudEnabled && !auth.user) return <AuthScreen/>
  if (auth.cloudEnabled && studio.needsWorkspace) return <WorkspaceJoin onJoin={studio.joinStudio}/>

  const current = titles[page]

  return <>
    <CompletionConfetti burst={confettiBurst}/>
    <AppNav page={page} onChange={navigate}/>
    <main className={`app-shell page-${page}`}>
      {page !== 'editorial' && <PageHeader title={current.title} eyebrow={current.eyebrow} onAdd={() => page === 'tasks' ? setTaskCreateSignal(value=>value+1) : setCreateKind('task')} user={auth.user} showLogout={page === 'team'}/>} 
      {studio.error && <div className="global-error"><AlertCircle size={15}/><span>{studio.error}</span><button onClick={() => void studio.reload()}><RefreshCw size={14}/></button></div>}
      {page === 'editorial' && editorial.error && <div className="global-error"><AlertCircle size={15}/><span>{editorial.error}</span><button onClick={() => void editorial.reload()}><RefreshCw size={14}/></button></div>}
      {studio.loading ? <PremiumLoader/> : <>
        {page === 'clients' && <ClientsPage data={studio.data} actions={studio.actions} selectedId={selectedClient} onSelect={setSelectedClient} onNew={() => setCreateKind('client')}/>} 
        {page === 'tasks' && <TasksPage data={studio.data} actions={studio.actions} createSignal={taskCreateSignal} onCelebrate={celebrateCompletion}/>} 
        {page === 'editorial' && (editorial.loading ? <PremiumLoader/> : <EditorialPage data={editorial.data} members={studio.data.members} clients={studio.data.clients} actions={editorial.actions} onCelebrate={celebrateCompletion}/>)} 
        {page === 'payments' && <PaymentsPage data={studio.data} actions={studio.actions}/>} 
        {page === 'team' && <TeamPage data={studio.data} actions={studio.actions} onNew={() => setCreateKind('member')}/>} 
      </>}
    </main>
    {page !== 'editorial' && page !== 'payments' && page !== 'tasks' && <button className="desktop-floating-add" title="Nuova attività" aria-label="Nuova attività" onClick={() => setCreateKind('task')}>+ Nuova attività</button>}
    {createKind && <QuickCreateModal data={studio.data} actions={studio.actions} initialKind={createKind} onClose={() => setCreateKind(null)}/>} 
  </>
}
