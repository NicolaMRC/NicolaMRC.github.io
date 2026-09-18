import type { ReactNode } from 'react'

interface Props {
  titolo: string
  descrizione?: string
  children?: ReactNode
  azioni: ReactNode
  onChiudi?: () => void
}

/** Foglio modale ancorato in basso, come da convenzione su iPhone. */
export default function Modal({ titolo, descrizione, children, azioni, onChiudi }: Props) {
  return (
    <div
      className="velo"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onChiudi?.()
      }}
    >
      <div className="modale">
        <h2>{titolo}</h2>
        {descrizione && <p className="sottotitolo" style={{ marginBottom: 16 }}>{descrizione}</p>}
        {children}
        <div className="modale-azioni">{azioni}</div>
      </div>
    </div>
  )
}
