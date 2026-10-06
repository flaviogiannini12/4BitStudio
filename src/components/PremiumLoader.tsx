export function PremiumLoader({ label = '4Bit Studio' }: { label?: string }) {
  return <div className="premium-loader-screen" role="status" aria-label="Caricamento">
    <div className="premium-loader-aura"/>
    <div className="premium-loader-mark">
      <span className="premium-loader-ring"/>
      <span className="premium-loader-ring premium-loader-ring-two"/>
      <img src="/favicon.png" alt="" />
    </div>
    <div className="premium-loader-copy">
      <strong>{label}</strong>
      <span>loading workspace</span>
    </div>
  </div>
}
