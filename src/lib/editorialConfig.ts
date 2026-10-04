import type { EditorialAccount, EditorialPlatform, EditorialStatus } from '../types/editorial'
import type { TeamMember } from '../types/studio'

export const editorialAccountLabel: Record<EditorialAccount,string> = {
  casaro: 'Account Casaro',
  autoscuola_susa: 'Account Autoscuola Susa',
}

export const editorialPlatformLabel: Record<EditorialPlatform,string> = {
  fb_ig: 'Facebook + Instagram',
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

export const contentTypesByPlatform: Record<EditorialPlatform,string[]> = {
  fb_ig: ['Reel','Post statico','Carousel','Stories'],
  tiktok: ['TikTok video','Photo mode'],
  youtube: ['Video orizzontale','Short'],
  whatsapp: ['Messaggio promo','Offerta','Aggiornamento'],
}

export type EditorialStepTemplate = { label:string; ownerName:string }

export function editorialWorkflow(platform: EditorialPlatform, contentType: string): EditorialStepTemplate[] {
  if (platform === 'whatsapp') {
    return [
      { label:'Piano editoriale WhatsApp', ownerName:'Flavio' },
      { label:'Ricerca contenuti visual', ownerName:'Francesco' },
      { label:'Editing e preparazione messaggio', ownerName:'Francesco' },
      { label:'Invio programmato', ownerName:'Francesco' },
      { label:'Gestione risposte', ownerName:'Francesco' },
    ]
  }

  const video = platform === 'tiktok' || platform === 'youtube' || /reel|video|short/i.test(contentType)
  return [
    { label:'Idea e script', ownerName:'Flavio' },
    { label: video ? 'Video editing' : 'Photo editing / grafica', ownerName: video ? 'Francesco' : 'Edoardo' },
    { label:'Description / Copy', ownerName:'Francesco' },
    { label:'Pubblicazione', ownerName:'Edoardo' },
    { label:'Community Management', ownerName:'Edoardo' },
  ]
}

export function memberIdByName(members: TeamMember[], name: string) {
  return members.find(member => member.name.trim().toLowerCase() === name.trim().toLowerCase())?.id ?? null
}

export function platformAllowedForAccount(account: EditorialAccount, platform: EditorialPlatform) {
  return account === 'casaro' || platform !== 'whatsapp'
}

export const editorialObjectives = ['Awareness','Community','Promozione','Lead','Traffico','Retention']
