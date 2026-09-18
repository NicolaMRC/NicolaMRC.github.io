import type { Measurement } from '../types'
import { parseIsoDate } from '../lib/date'
import { formatNumber } from '../lib/utils'
import { puntiPeso } from '../lib/misure'

interface Props {
  misure: Measurement[]
  obiettivo?: number
}

const L = 36 // spazio a sinistra per le etichette
const R = 10
const T = 12
const B = 22
const W = 320
const H = 140

/**
 * Andamento del peso nel tempo.
 *
 * Le rilevazioni complete sono evidenziate con un punto più grande: servono a
 * capire a colpo d'occhio cosa è successo fra un controllo e l'altro.
 */
export default function GraficoPeso({ misure, obiettivo }: Props) {
  const punti = puntiPeso(misure)
  if (punti.length === 0) return null

  const pesi = punti.map((m) => m.weightKg as number)
  const valori = obiettivo ? [...pesi, obiettivo] : pesi
  let min = Math.min(...valori)
  let max = Math.max(...valori)
  // Con un solo valore, o valori identici, serve comunque un intervallo.
  if (max - min < 1) {
    min -= 1
    max += 1
  }
  const margine = (max - min) * 0.12
  min -= margine
  max += margine

  const primo = parseIsoDate(punti[0].date).getTime()
  const ultimo = parseIsoDate(punti[punti.length - 1].date).getTime()
  const durata = Math.max(1, ultimo - primo)

  const x = (iso: string) =>
    L + ((parseIsoDate(iso).getTime() - primo) / durata) * (W - L - R)
  const y = (peso: number) => T + (1 - (peso - min) / (max - min)) * (H - T - B)

  const linea = punti.map((m) => `${x(m.date)},${y(m.weightKg as number)}`).join(' ')
  const etichettaData = (iso: string) =>
    parseIsoDate(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
      role="img"
      aria-label={`Andamento del peso da ${formatNumber(Math.min(...pesi))} a ${formatNumber(
        Math.max(...pesi),
      )} chilogrammi`}
    >
      {/* griglia orizzontale */}
      {[max, (max + min) / 2, min].map((valore) => (
        <g key={valore}>
          <line
            x1={L}
            x2={W - R}
            y1={y(valore)}
            y2={y(valore)}
            stroke="var(--bordo)"
            strokeWidth="1"
          />
          <text
            x={L - 6}
            y={y(valore) + 3.5}
            textAnchor="end"
            fontSize="9"
            fill="var(--testo-tenue)"
          >
            {formatNumber(Math.round(valore * 10) / 10)}
          </text>
        </g>
      ))}

      {obiettivo && obiettivo >= min && obiettivo <= max && (
        <line
          x1={L}
          x2={W - R}
          y1={y(obiettivo)}
          y2={y(obiettivo)}
          stroke="var(--accento)"
          strokeWidth="1.2"
          strokeDasharray="4 3"
        />
      )}

      {punti.length > 1 && (
        <polyline
          points={linea}
          fill="none"
          stroke="var(--accento)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}

      {punti.map((m) => (
        <circle
          key={m.id}
          cx={x(m.date)}
          cy={y(m.weightKg as number)}
          r={m.type === 'completa' ? 4.5 : 2.8}
          fill={m.type === 'completa' ? 'var(--accento)' : 'var(--sfondo)'}
          stroke="var(--accento)"
          strokeWidth="1.8"
        />
      ))}

      <text x={L} y={H - 6} fontSize="9" fill="var(--testo-tenue)">
        {etichettaData(punti[0].date)}
      </text>
      {punti.length > 1 && (
        <text x={W - R} y={H - 6} fontSize="9" textAnchor="end" fill="var(--testo-tenue)">
          {etichettaData(punti[punti.length - 1].date)}
        </text>
      )}
    </svg>
  )
}
