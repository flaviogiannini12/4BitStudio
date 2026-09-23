import { useEffect, useState } from 'react'
import { AlertCircle, LoaderCircle, RefreshCw } from 'lucide-react'
import { AppNav, type AppPage } from './components/AppNav'
import { AuthScreen } from './components/AuthScreen'
import { PageHeader } from './components/PageHeader'
import { PaymentReminderModal } from './components/PaymentReminderModal'
import { QuickCreateModal } from './components/QuickCreateModal'
import { WorkspaceJoin } from './components/WorkspaceJoin'
import { useAuth } from './hooks/useAuth'
import { useStudio } from './hooks/useStudio'
import { ClientsPage } from './pages/ClientsPage'
import { HomePage } from './pages/HomePage'
import { PaymentsPage } from './pages/PaymentsPage'
import { StatsPage } from './pages/StatsPage'
import { TasksPage } from './pages/TasksPage'
import { TeamPage } from './pages/TeamPage'

const pages: AppPage[] = ['home','clients','tasks','payments','team','stats']
type CreateKind = 'client' | 'task' | 'payment' | 'recurrence' | 'member'

function readPage(): AppPage {
  const value = window.location.hash.replace('#','') as AppPage
  return pages.includes(value) ? value : 'home'
}

const titles: Record<AppPage, { title: string; eyebrow: string }> = {
  home: { title: 'Tutto sotto controllo.', eyebrow: 'La situazione dello studio, adesso' },
  clients: { title: 'Ogni cliente, nel suo posto.', eyebrow: 'Clienti' },
  tasks: { title: 'Cosa c’è da fare.', eyebrow: 'Operatività' },
  payments: { title: 'Nessuna scadenza si perde.', eyebrow: 'Pagamenti e ricorrenze' },
  team: { title: 'Chi sta facendo cosa.', eyebrow: 'Team' },
  stats: { title: 'Numeri dello studio.', eyebrow: 'Statistiche' },
}

export default function App() {
  const auth = useAuth()
  const studio = useStudio(auth.user, !auth.cloudEnabled || Boolean(auth.user))
  const [page, setPage] = useState<AppPage>(readPage)
  const [createKind, setCreateKind] = useState<CreateKind | null>(null)
  const [selectedClient, setSelectedClient] = useState<string | null>(null)
  const [reminderId, setReminderId] = useState<string | null>(null)

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

  function openClient(id: string) {
    setSelectedClient(id)
    setPage('clients')
    history.replaceState(null, '', '#clients')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (auth.loading) return <div className="center-loader"><LoaderCircle className="spin"/></div>
  if (auth.cloudEnabled && !auth.user) return <AuthScreen/>
  if (auth.cloudEnabled && studio.needsWorkspace) return <WorkspaceJoin onJoin={studio.joinStudio}/>

  const reminder = studio.data.payments.find(p => p.id === reminderId) ?? null
  const reminderClient = reminder ? studio.data.clients.find(c => c.id === reminder.clientId) : undefined
  const current = titles[page]

  return <>
    <AppNav page={page} onChange={navigate}/>
    <main className="app-shell">
      <PageHeader title={current.title} eyebrow={current.eyebrow} onAdd={() => setCreateKind('task')} user={auth.user}/>
      {studio.error && <div className="global-error"><AlertCircle size={15}/><span>{studio.error}</span><button onClick={() => void studio.reload()}><RefreshCw size={14}/></button></div>}
      {studio.loading ? <LoadingSkeleton/> : <>
        {page === 'home' && <HomePage data={studio.data} onClient={openClient} onPayments={() => navigate('payments')} onTasks={() => navigate('tasks')} onReminder={setReminderId} onPaid={id => void studio.actions.markPaymentPaid(id)}/>} 
        {page === 'clients' && <ClientsPage data={studio.data} actions={studio.actions} selectedId={selectedClient} onSelect={setSelectedClient} onNew={() => setCreateKind('client')}/>} 
        {page === 'tasks' && <TasksPage data={studio.data} actions={studio.actions} onNew={() => setCreateKind('task')}/>} 
        {page === 'payments' && <PaymentsPage data={studio.data} actions={studio.actions} onNewPayment={() => setCreateKind('payment')} onNewRecurrence={() => setCreateKind('recurrence')} onReminder={setReminderId}/>} 
        {page === 'team' && <TeamPage data={studio.data} actions={studio.actions} onNew={() => setCreateKind('member')}/>} 
        {page === 'stats' && <StatsPage data={studio.data}/>} 
      </>}
    </main>
    <button className="desktop-floating-add" onClick={() => setCreateKind('task')}>+ Nuovo</button>
    {createKind && <QuickCreateModal data={studio.data} actions={studio.actions} initialKind={createKind} onClose={() => setCreateKind(null)}/>} 
    {reminder && <PaymentReminderModal payment={reminder} client={reminderClient} onRecord={() => studio.actions.recordReminder(reminder.id)} onClose={() => setReminderId(null)}/>} 
  </>
}

function LoadingSkeleton() {
  return <div className="loading-stack"><div/><div/><div/></div>
}
