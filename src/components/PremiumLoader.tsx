export function PremiumLoader() {
  return <div className="fourbit-logo-loader-screen" role="status" aria-live="polite" aria-label="Caricamento 4Bit Studio">
    <div className="fourbit-logo-loader-shell">
      <div className="fourbit-logo-loader-glow"/>
      <div className="fourbit-logo-loader-reveal">
        <img src="/4bit-logo-hd.svg" alt="4Bit Studio" className="fourbit-logo-loader-image"/>
      </div>
    </div>
  </div>
}
