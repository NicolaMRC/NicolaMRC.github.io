interface Props {
  valore: number
  onCambia: (valore: number) => void
  /** Dimensione ridotta per gli elenchi fitti. */
  piccolo?: boolean
}

function Stella({ piena, size }: { piena: boolean; size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path
        d="M12 3.2l2.6 5.3 5.8.85-4.2 4.1 1 5.75L12 16.5l-5.2 2.7 1-5.75-4.2-4.1 5.8-.85z"
        fill={piena ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * Gradimento a stelle, modificabile con un tocco diretto.
 *
 * Toccare la stella già attiva azzera il voto: senza, un menu valutato per
 * sbaglio resterebbe valutato per sempre.
 */
export default function RatingStelle({ valore, onCambia, piccolo }: Props) {
  const size = piccolo ? 17 : 21
  return (
    <span className="stelle" role="group" aria-label={`Gradimento: ${valore || 'non valutato'}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`stella ${n <= valore ? 'piena' : ''}`}
          aria-label={`${n} ${n === 1 ? 'stella' : 'stelle'}`}
          aria-pressed={n <= valore}
          onClick={(e) => {
            e.stopPropagation()
            onCambia(valore === n ? 0 : n)
          }}
        >
          <Stella piena={n <= valore} size={size} />
        </button>
      ))}
    </span>
  )
}
