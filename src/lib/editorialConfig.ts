import type { EditorialAccount, EditorialPlatform, EditorialStatus } from '../types/editorial'
import type { TeamMember } from '../types/studio'

export const editorialAccountLabel: Record<EditorialAccount,string> = {
  casaro: 'Casaro',
  autoscuola_susa: 'Autoscuola Susa',
}

export const editorialPlatformLabel: Record<EditorialPlatform,string> = {
  facebook: 'Instagram + Facebook',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  whatsapp: 'WhatsApp',
}

export const editorialStatusLabel: Record<EditorialStatus,string> = {
  idea: 'Idea',
  to_produce: 'Da produrre',
  in_progress: 'In lavorazione',
  review: 'In revisione',
  ready: 'Pronto per Edoardo',
  scheduled: 'Programmato',
  published: 'Pubblicato',
  archived: 'Archiviato',
}

export const editorialStatusOrder: EditorialStatus[] = ['to_produce','ready','published','archived']

export type EditorialStepTemplate = { label:string; ownerName:string; done:boolean }

export function editorialWorkflow(): EditorialStepTemplate[] {
  return [
    { label:'Flavio', ownerName:'Flavio', done:true },
    { label:'Francesco', ownerName:'Francesco', done:false },
    { label:'Edoardo', ownerName:'Edoardo', done:false },
  ]
}

export function memberIdByName(members: TeamMember[], name: string) {
  return members.find(member => member.name.trim().toLowerCase() === name.trim().toLowerCase())?.id ?? null
}

export function legacyPlatform(platforms: EditorialPlatform[]) {
  const first = platforms[0] ?? 'facebook'
  if (first === 'facebook') return 'fb_ig'
  return first
}
