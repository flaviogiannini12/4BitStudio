import { useMemo, useState } from 'react'
import type { Compensation, TeamMember } from '../types/studio'
import { money } from '../lib/date'
import './SalaryTrend.css'

const MONTHS = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']
const COLORS = ['#e75c32', '#7955cd', '#179d76', '#3284df', '#c48a23', '#cf5b9a', '#53717c', '#8a6d4b']
const LEFT = 78
const TOP = 20
const WIDTH = 964
const HEIGHT = 320
const PLOT_W = WIDTH - LEFT - 25
const PLOT_H = HEIGHT - TOP - 58

function dateMonth(row: Compensation): string | null {
  const date = (row.paidAt || row.entryDate || '').slice(0, 7)
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(date) ? date : null
}

function buildSmoothLine(points: { x: number; y: number }[]): string {
  if (!points.length) return ''
  let path = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1]
    const next = points[i]
    const midX = (prev.x + next.x) / 2
    path += ` C ${midX} ${prev.y}, ${midX} ${next.y}, ${next.x} ${next.y}`
  }
  return path
}

export function SalaryTrend({ compensations, members }: { compensations: Compensation[]; members: TeamMember[] }) {
  const currentYear = new Date().getFullYear()
  const years = useMemo(() => {
    const found = new Set<number>([currentYear])
    compensations.forEach(row => {
      const key = dateMonth(row)
      if (key) found.add(Number(key.slice(0, 4)))
    })
    return [...found].sort((a, b) => b - a)
  }, [compensations, currentYear])
  const [chosenYear, setChosenYear] = useState(currentYear)
  const year = years.includes(chosenYear) ? chosenYear : years[0]

  const people = useMemo(() => {
    const map = new Map<string, { key: string; name: string }>()
    for (const row of compensations) {
      const key = row.memberId || `name:${row.memberName || 'Collaboratore'}`
      if (!map.has(key)) {
        map.set(key, {
          key,
          name: members.find(m => m.id === row.memberId)?.name || row.memberName || 'Collaboratore',
        })
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'it'))
  }, [compensations, members])

  const series = people.map((person, index) => {
    const values = Array(12).fill(0) as number[]
    compensations.forEach(row => {
      const key = row.memberId || `name:${row.memberName || 'Collaboratore'}`
      const date = dateMonth(row)
      if (key === person.key && date?.startsWith(`${year}-`)) {
        values[Number(date.slice(5, 7)) - 1] += row.amount
      }
    })
    return { ...person, values, color: COLORS[index % COLORS.length] }
  })

  const totalMonths = Array.from({ length: 12 }, (_, index) =>
    series.reduce((sum, person) => sum + person.values[index], 0)
  )
  const annualTotal = totalMonths.reduce((sum, amount) => sum + amount, 0)
  const maxValue = Math.max(0, ...series.flatMap(s => s.values))
  const scaleMax = maxValue > 0 ? Math.ceil(maxValue * 1.12 / 100) * 100 : 100

  const xAt = (i: number) => LEFT + (PLOT_W * i) / 11
  const yAt = (value: number) => TOP + PLOT_H * (1 - value / scaleMax)

  return <section className="salary-trend" aria-label="Andamento annuale degli stipendi pagati">
    <div className="salary-trend-heading">
      <div>
        <h3>Andamento annuale degli stipendi</h3>
        <p>Importi pagati, suddivisi per collaboratore e per mese</p>
      </div>
      <label className="salary-year-picker">
        <span>Anno</span>
        <select value={year} onChange={event => setChosenYear(Number(event.target.value))}>
          {years.map(item => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
    </div>

    <div className="salary-year-table-wrap">
      <table className="salary-year-table" aria-label={`Totale stipendi per mese del ${year}`}>
        <thead><tr>{MONTHS.map(month => <th scope="col" key={month}>{month}</th>)}</tr></thead>
        <tbody><tr>{totalMonths.map((amount, index) => <td key={MONTHS[index]}>{money(amount)}</td>)}</tr></tbody>
      </table>
    </div>

    {annualTotal > 0 ? <>
      <div className="salary-chart-scroll">
        <svg className="salary-chart-svg" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`Grafico degli stipendi pagati nel ${year}, una linea per ogni collaboratore`}>
          {Array.from({ length: 5 }, (_, i) => {
            const amount = (scaleMax * i) / 4
            const y = yAt(amount)
            return <g key={i}>
              <line x1={LEFT} x2={WIDTH - 25} y1={y} y2={y} stroke="#e8e6e4" strokeDasharray="5 5" />
              <text x={LEFT - 12} y={y + 4} textAnchor="end" fontSize="12" fill="#85817f">{money(amount)}</text>
            </g>
          })}
          {MONTHS.map((month, index) => <text key={month} x={xAt(index)} y={HEIGHT - 20} textAnchor="middle" fontSize="13" fill="#85817f">{month}</text>)}
          {series.map(person => {
            const points = person.values.map((value, index) => ({ x: xAt(index), y: yAt(value) }))
            return <g key={person.key}>
              <path d={buildSmoothLine(points)} fill="none" stroke={person.color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
              {points.map((point, index) => <circle key={MONTHS[index]} cx={point.x} cy={point.y} r="4" fill={person.color} stroke="#fff" strokeWidth="1.5">
                <title>{person.name} · {MONTHS[index]}: {money(person.values[index])}</title>
              </circle>)}
            </g>
          })}
        </svg>
      </div>
      <div className="salary-chart-legend">
        {series.map(person => <span key={person.key}><i style={{ backgroundColor: person.color }}/>{person.name}</span>)}
      </div>
    </> : <div className="salary-trend-empty">Nessuno stipendio pagato registrato per il {year}.</div>}
    <div className="salary-trend-footer"><span>Totale pagato nel {year}</span><strong>{money(annualTotal)}</strong></div>
  </section>
}
