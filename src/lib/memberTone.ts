export function memberTone(name?: string) {
  const value = (name ?? '').trim().toLowerCase()
  if (value === 'flavio') return 'flavio'
  if (value === 'edoardo') return 'edoardo'
  if (value === 'francesco') return 'francesco'
  if (value === 'matteo') return 'matteo'
  let hash = 0
  for (const char of value) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0
  return ['tone-0','tone-1','tone-2','tone-3'][Math.abs(hash) % 4]
}
export function memberToneClass(name?: string) {
  return `member-${memberTone(name)}`
}
