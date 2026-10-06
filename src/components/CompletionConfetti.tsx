import type { CSSProperties } from 'react'

const COLORS = ['#021F94', '#704DE5', '#D8FF3E', '#E85D68', '#050505', '#F5F2F3']
const PIECES = Array.from({ length: 36 }, (_, index) => ({
  delay: `${(index % 9) * 16}ms`,
  xMobile: `${82 + ((index * 37) % 155)}px`,
  xDesktop: `${190 + ((index * 53) % 360)}px`,
  yMobile: `${-180 + ((index * 61) % 360)}px`,
  yDesktop: `${-320 + ((index * 79) % 640)}px`,
  rotate: `${180 + ((index * 83) % 620)}deg`,
  color: COLORS[index % COLORS.length],
  width: `${5 + (index % 4)}px`,
  height: `${8 + ((index * 3) % 9)}px`,
}))

type ConfettiStyle = CSSProperties & {
  '--confetti-delay': string
  '--confetti-x-mobile': string
  '--confetti-x-desktop': string
  '--confetti-y-mobile': string
  '--confetti-y-desktop': string
  '--confetti-rotate': string
}

function Side({ side }: { side: 'left' | 'right' }) {
  return (
    <div className={`completion-confetti-side completion-confetti-${side}`}>
      {PIECES.map((piece, index) => (
        <i
          key={index}
          className="completion-confetti-piece"
          style={{
            '--confetti-delay': piece.delay,
            '--confetti-x-mobile': piece.xMobile,
            '--confetti-x-desktop': piece.xDesktop,
            '--confetti-y-mobile': piece.yMobile,
            '--confetti-y-desktop': piece.yDesktop,
            '--confetti-rotate': piece.rotate,
            width: piece.width,
            height: piece.height,
            background: piece.color,
          } as ConfettiStyle}
        />
      ))}
    </div>
  )
}

export function CompletionConfetti({ burst }: { burst: number }) {
  if (!burst) return null
  return (
    <div key={burst} className="completion-confetti" aria-hidden="true">
      <Side side="left"/>
      <Side side="right"/>
    </div>
  )
}
