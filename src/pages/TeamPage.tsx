import { CheckSquare2, ChevronDown, Pencil, Plus } from 'lucide-react'
import { money } from '../lib/date'
import { memberToneClass } from '../lib/memberTone'
import { StudioAccessSection } from '../components/StudioAccessSection'
import { RecordEditorModal } from '../components/RecordEditorModal'
import { useState } from 'react'
import type { StudioData } from '../types/studio'
import type { useStudio } from '../hooks/useStudio'

type Actions = ReturnType<typeof useStudio>['actions']

export function TeamPage({ data, actions, onNew: _onNew }: { data: StudioData; actions: Actions; onNew: () => void }) {
  const [editor, setEditor] = useState<{kind:'member'|'compensation'; record:any} | null>(null)
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(() => new Set())

  function toggleMember(memberId:string) {
    setExpandedMembers(current => {
      const next=new Set(current)
      if(next.has(memberId)) next.delete(memberId)
      else next.add(memberId)
      return next
    })
  }
  const sortedCompensations = [...data.compensations].sort((a,b) => {
    const aDate = a.entryDate ?? a.paidAt?.slice(0,10) ?? ''
    const bDate = b.entryDate ?? b.paidAt?.slice(0,10) ?? ''
    return bDate.localeCompare(aDate)
  })
  const compensationClientNames = (compensation: StudioData['compensations'][number]) => {
    const ids=compensation.clientIds?.length
      ? compensation.clientIds
      : compensation.clientId
        ? [compensation.clientId]
        : []
    if(!ids.length) return '4Bit Studio'
    const names=ids.map(id=>data.clients.find(client=>client.id===id)?.name).filter(Boolean)
    return names.length ? names.join(' + ') : '4Bit Studio'
  }
  const compensationByMember = data.members.map(member => ({
    member,
    total: data.compensations.filter(c => c.memberId === member.id || c.memberName === member.name).reduce((sum,c) => sum + c.amount, 0),
    paid: data.compensations.filter(c => (c.memberId === member.id || c.memberName === member.name) && c.status.toLowerCase() === 'pagato').reduce((sum,c) => sum + c.amount, 0),
  }))

  return <div className="team-page-stack">
    <section className="section-block page-section">
      <div className="section-heading responsive-heading"><div><p className="eyebrow">Persone, non hardcoded</p><h2>Team</h2></div><button className="primary-button" onClick={() => setEditor({kind:'member',record:null})}><Plus size={15}/> Aggiungi persona</button></div>
      <div className="team-grid">
        {data.members.map(member => {
          const open = data.tasks.filter(t => t.assigneeId === member.id && t.status !== 'done')
          const completed = data.tasks.filter(t => t.assigneeId === member.id && t.status === 'done')
          const expanded=expandedMembers.has(member.id)
          return <article className={`team-card team-card-collapsible ${memberToneClass(member.name)} ${member.active ? '' : 'inactive'} ${expanded ? 'is-expanded' : ''}`} key={member.id}>
            <div className="team-card-summary">
              <div className={`team-avatar ${memberToneClass(member.name)}`}>{member.name.slice(0,2).toUpperCase()}</div>
              <div className="team-card-name"><h3>{member.name}</h3></div>
              <button
                type="button"
                className="team-card-toggle"
                onClick={() => toggleMember(member.id)}
                aria-expanded={expanded}
                aria-label={expanded ? `Chiudi scheda di ${member.name}` : `Apri scheda di ${member.name}`}
              ><ChevronDown size={17}/></button>
            </div>
            <div className="team-numbers team-numbers-summary">
              <div><strong>{open.length}</strong><span>Task aperte</span></div>
              <div><strong>{completed.length}</strong><span>Task completate</span></div>
            </div>
            {expanded && <div className="team-card-details">
              <div className="team-card-head team-card-detail-head"><div><p>{member.role}</p></div><span className={`member-state ${member.active ? 'active' : ''}`}>{member.active ? 'Attivo' : 'Non attivo'}</span></div>
              <div className="member-task-preview">{open.slice(0,3).map(t => <div key={t.id}><CheckSquare2 size={13}/><span>{t.title}</span></div>)}{open.length === 0 && <small>Nessuna task aperta</small>}</div>
              <button className="secondary-button full" onClick={() => setEditor({kind:'member',record:member})}><Pencil size={15}/> Modifica persona</button>
            </div>}
          </article>
        })}
      </div>
    </section>

    <section className="section-block compact-block">
      <div className="section-heading"><div><p className="eyebrow">Dall'Excel</p><h2>Compensi team</h2></div><div className="inline-actions"><strong className="stats-total">{money(data.compensations.reduce((s,c) => s+c.amount,0))}</strong><button className="secondary-button" onClick={() => setEditor({kind:'compensation',record:null})}><Plus size={14}/> Aggiungi</button></div></div>
      <div className="compensation-grid">
        {compensationByMember.map(({member,total,paid}) => <div className={`compensation-card ${memberToneClass(member.name)}`} key={member.id}>
          <div className={`team-avatar small ${memberToneClass(member.name)}`}>{member.name.slice(0,2).toUpperCase()}</div>
          <div><strong>{member.name}</strong><span>Totale {money(total)}</span><small>Pagato {money(paid)}</small></div>
        </div>)}
      </div>
      <div className="compensation-history">
        {sortedCompensations.map(c => <button type="button" className="compensation-history-row" key={c.id} onClick={() => setEditor({kind:'compensation',record:c})}><div><strong>{c.memberName}</strong><small>{compensationClientNames(c)} · {c.compensationType === 'salary_recurring' ? 'Stipendio ricorrente' : 'Compenso'}{c.description ? ' · ' + c.description : ''}</small></div><b>{money(c.amount)}</b><span>{c.status}</span></button>)}
      </div>
    </section>

    <StudioAccessSection/>
    {editor && <RecordEditorModal kind={editor.kind} record={editor.record} data={data} actions={actions} onClose={() => setEditor(null)}/>}
  </div>
}
