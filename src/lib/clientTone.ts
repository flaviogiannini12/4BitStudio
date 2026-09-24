import type { CSSProperties } from 'react'
import type { Client } from '../types/studio'

export function clientChipStyle(clientId: string, clients: Client[]): CSSProperties {
  const ids = [...clients].map(client => client.id).sort((a,b) => a.localeCompare(b))
  const index = Math.max(0, ids.indexOf(clientId))
  const hue = (index * 137.508 + 14) % 360
  return {
    '--client-chip-bg': `hsl(${hue} 88% 93%)`,
    '--client-chip-ink': `hsl(${hue} 64% 29%)`,
    '--client-chip-accent': `hsl(${hue} 76% 48%)`,
  } as CSSProperties
}
