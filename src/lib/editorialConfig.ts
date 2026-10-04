import type { EditorialAccount, EditorialPlatform, EditorialStatus } from '../types/editorial'
import type { TeamMember } from '../types/studio'

export const editorialAccountLabel: Record<EditorialAccount,string> = {
  casaro: 'Casaro',
  autoscuola_susa: 'Autoscuola Susa',
}

export const editorialPlatformLabel: Record<EditorialPlatform,string> = {
  facebook: 'Facebook',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  whatsapp: 'WhatsApp',
}

export const editorialStatusLabel: Record<EditorialStatus,string> = {
  idea: 'Idea',
  to_produce: 'Da produrre',
  in_progress: 'In lavorazione',
  review: 'In revisione',
  ready: 'Pronto',
  scheduled: 'Programmato',
  published: 'Pubblicato',
  archived: 'Archiviato',
}

export const editorialStatusOrder: EditorialStatus[] = ['idea','to_produce','in_progress','review','ready','scheduled','published','archived']

export type EditorialStepTemplate = { label:string; ownerName:string }

function pushUnique(target: EditorialStepTemplate[], step: EditorialStepTemplate) {
  if (!target.some(existing => existing.label === step.label && existing.ownerName === step.ownerName)) target.push(step)
}

export function editorialWorkflow(platforms: EditorialPlatform[], account: EditorialAccount): EditorialStepTemplate[] {
  const steps: EditorialStepTemplate[] = []

  pushUnique(steps,{ label:'Description / Copy', ownerName:'Francesco' })
  pushUnique(steps,{ label:'Video editing', ownerName:'Francesco' })
  pushUnique(steps,{ label:'Photo editing / Grafiche', ownerName:'Edoardo' })
  pushUnique(steps,{ label:'Pubblicazione', ownerName:'Edoardo' })
  pushUnique(steps,{ label:'Community Management', ownerName:'Edoardo' })

  if (platforms.includes('whatsapp') && account === 'casaro') {
    pushUnique(steps,{ label:'Piano editoriale WhatsApp', ownerName:'Edoardo' })
    pushUnique(steps,{ label:'Ricerca contenuti visual WhatsApp', ownerName:'Francesco' })
    pushUnique(steps,{ label:'Editing e preparazione messaggio WhatsApp', ownerName:'Francesco' })
    pushUnique(steps,{ label:'Invio programmato WhatsApp', ownerName:'Francesco' })
    pushUnique(steps,{ label:'Gestione risposte WhatsApp', ownerName:'Francesco' })
  }

  return steps
}

export function memberIdByName(members: TeamMember[], name: string) {
  return members.find(member => member.name.trim().toLowerCase() === name.trim().toLowerCase())?.id ?? null
}

export function legacyPlatform(platforms: EditorialPlatform[]) {
  const first = platforms[0] ?? 'facebook'
  if (first === 'facebook') return 'fb_ig'
  return first
}

export function currentWorkerNames(params:{
  item:{description:string}
  assetsCount:number
  steps:{done:boolean;ownerMemberId:string|null}[]
  members:TeamMember[]
}) {
  const names = new Set<string>()
  const flavio = params.members.find(member => member.name.trim().toLowerCase() === 'flavio')
  if (!params.item.description.trim() || params.assetsCount === 0) {
    if (flavio) names.add(flavio.name)
  }
  for (const step of params.steps) {
    if (step.done || !step.ownerMemberId) continue
    const member = params.members.find(candidate => candidate.id === step.ownerMemberId)
    if (member) names.add(member.name)
  }
  return [...names]
}
