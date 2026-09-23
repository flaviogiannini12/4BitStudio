import { CheckSquare2, PauseCircle, PlayCircle } from 'lucide-react'
import { money } from '../lib/date'
import { StudioAccessSection } from '../components/StudioAccessSection'
import type { StudioData } from '../types/studio'
import type { useStudio } from '../hooks/useStudio'

type Actions = ReturnType<typeof useStudio>['actions']

export function TeamPage({ data, actions, onNew }: { data: StudioData; actions: Actions; onNew: () => void }) {
  const compensationByMember = data.members.map(member => ({
    member,
    total: data.compensations.filter(c => c.memberId === member.id || c.memberName === member.name).reduce((sum,c) => sum + c.amount, 0),
    paid: data.compensations.filter(c => (c.memberId === member.id || c.memberName === member.name) && c.status.toLowerCase() === 'pagato').reduce((sum,c) => sum + c.amount, 0),
  }))

  return <div className="team-page-stack">
    <section className="section-block page-section">
      <div className="section-heading responsive-heading"><div><p className="eyebrow">Persone, non hardcoded</p><h2>Team</h2></div><button className="primary-button" onClick={onNew}>Aggiungi persona</button></div>
      <div className="team-grid">
        {data.members.map(member => {
          const open = data.tasks.filter(t => t.assigneeId === member.id && t.status !== 'done')
          const doing = open.filter(t => t.status === 'doing').length
          return <article className={`team-card ${member.active ? '' : 'inactive'}`} key={member.id}>
            <div className="team-avatar">{member.name.slice(0,2).toUpperCase()}</div>
            <div className="team-card-head"><div><h3>{member.name}</h3><p>{member.role}</p></div><span className={`member-state ${member.active ? 'active' : ''}`}>{member.active ? 'Attivo' : 'Non attivo'}</span></div>
            <div className="team-numbers"><div><strong>{open.length}</strong><span>Task aperte</span></div><div><strong>{doing}</strong><span>In corso</span></div></div>
            <div className="member-task-preview">{open.slice(0,3).map(t => <div key={t.id}><CheckSquare2 size={13}/><span>{t.title}</span></div>)}{open.length === 0 && <small>Nessuna task aperta</small>}</div>
            <button className="secondary-button full" onClick={() => void actions.updateMember(member.id, { active: !member.active })}>{member.active ? <><PauseCircle size={15}/> Disattiva</> : <><PlayCircle size={15}/> Riattiva</>}</button>
          </article>
        })}
      </div>
    </section>

    <section className="section-block compact-block">
      <div className="section-heading"><div><p className="eyebrow">Dall'Excel</p><h2>Compensi team</h2></div><strong className="stats-total">{money(data.compensations.reduce((s,c) => s+c.amount,0))}</strong></div>
      <div className="compensation-grid">
        {compensationByMember.map(({member,total,paid}) => <div className="compensation-card" key={member.id}>
          <div className="team-avatar small">{member.name.slice(0,2).toUpperCase()}</div>
          <div><strong>{member.name}</strong><span>Totale {money(total)}</span><small>Pagato {money(paid)}</small></div>
        </div>)}
      </div>
      <div className="compensation-history">
        {data.compensations.map(c => <div key={c.id}><div><strong>{c.memberName}</strong><small>{data.clients.find(x => x.id === c.clientId)?.name ?? '4Bit Studio'} · {c.description}</small></div><b>{money(c.amount)}</b><span>{c.status}</span></div>)}
      </div>
    </section>

    <StudioAccessSection/>
  </div>
}
