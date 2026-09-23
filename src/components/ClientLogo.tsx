export function ClientLogo({ logoUrl, name, size = 'md' }: { logoUrl?: string; name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name.trim().split(/\s+/).slice(0,2).map(part => part[0]?.toUpperCase()).join('') || '4B'
  return (
    <div className={`client-logo client-logo-${size}`} aria-label={`Logo ${name}`}>
      {logoUrl ? <img src={logoUrl} alt="" /> : <span>{initials}</span>}
    </div>
  )
}
