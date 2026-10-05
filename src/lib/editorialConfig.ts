import type { EditorialAccount, EditorialMediaKind, EditorialPlatform, EditorialStatus } from '../types/editorial'
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
  idea: 'Da produrre',
  to_produce: 'Da produrre',
  in_progress: 'Da produrre',
  review: 'Copy da fare',
  ready: 'Pronto',
  scheduled: 'Pronto da pubblicare',
  published: 'Pubblicato',
  archived: 'Archiviato',
}

export const editorialStatusOrder: EditorialStatus[] = ['to_produce','review','ready','published','archived']

export type EditorialStepTemplate = {
  label:string
  ownerName:string
  done:boolean
  automatic?:boolean
}

function pushUnique(target: EditorialStepTemplate[], step: EditorialStepTemplate) {
  if (!target.some(existing => existing.label === step.label && existing.ownerName === step.ownerName)) target.push(step)
}

export function editorialWorkflow(
  platforms: EditorialPlatform[],
  mediaKind: EditorialMediaKind,
): EditorialStepTemplate[] {
  const steps: EditorialStepTemplate[] = [
    { label:'Ideazione / Script', ownerName:'Flavio', done:true, automatic:true },
  ]

  const socialPlatforms=platforms.some(platform=>['facebook','tiktok','youtube'].includes(platform))
  const hasWhatsapp=platforms.includes('whatsapp')

  if (socialPlatforms) {
    if (mediaKind === 'video') {
      pushUnique(steps,{ label:'Video editing', ownerName:'Francesco', done:false, automatic:true })
    } else {
      pushUnique(steps,{ label:'Photo editing / Grafiche', ownerName:'Edoardo', done:false, automatic:true })
    }
  }

  if (hasWhatsapp) {
    pushUnique(steps,{ label:'Preparazione contenuto WhatsApp', ownerName:'Francesco', done:false, automatic:true })
  }

  pushUnique(steps,{ label:'Description / Copy', ownerName:'Francesco', done:false })

  if (socialPlatforms) {
    pushUnique(steps,{ label:'Pubblicazione social', ownerName:'Edoardo', done:false })
  }

  if (hasWhatsapp) {
    pushUnique(steps,{ label:'Invio WhatsApp', ownerName:'Francesco', done:false })
  }

  return steps
}

export function isAutomaticEditorialStep(label:string) {
  return [
    'Ideazione / Script',
    'Video editing',
    'Photo editing / Grafiche',
    'Preparazione contenuto WhatsApp',
  ].includes(label)
}

export function memberIdByName(members: TeamMember[], name: string) {
  return members.find(member => member.name.trim().toLowerCase() === name.trim().toLowerCase())?.id ?? null
}

export function legacyPlatform(platforms: EditorialPlatform[]) {
  const first = platforms[0] ?? 'facebook'
  if (first === 'facebook') return 'fb_ig'
  return first
}

export function statusLabelForItem(status:EditorialStatus,platforms:EditorialPlatform[]) {
  if (status === 'ready' && platforms.length === 1 && platforms[0] === 'whatsapp') return 'Pronto da inviare'
  if (status === 'ready') return 'Pronto da pubblicare'
  return editorialStatusLabel[status]
}
