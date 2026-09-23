import type { ReactNode } from 'react'
import { X } from 'lucide-react'

export function Modal({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <section className={`modal-card ${wide ? 'modal-card-wide' : ''}`}>
        <div className="modal-head">
          <div>
            <p className="eyebrow">4Bit Studio</p>
            <h2>{title}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Chiudi"><X size={18}/></button>
        </div>
        {children}
      </section>
    </div>
  )
}
