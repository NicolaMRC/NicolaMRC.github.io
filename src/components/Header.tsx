import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconaIndietro } from './Icons'
import SyncBadge from './SyncBadge'

interface Props {
  titolo: string
  sottotitolo?: string
  indietro?: string
  azione?: ReactNode
  /** Il distintivo di salvataggio si mostra solo nelle schermate principali. */
  mostraSync?: boolean
  /** Lascia passare la sfumatura del menu che sta dietro l'intestazione. */
  trasparente?: boolean
}

export default function Header({
  titolo,
  sottotitolo,
  indietro,
  azione,
  mostraSync,
  trasparente,
}: Props) {
  const navigate = useNavigate()
  return (
    <header className={`intestazione ${trasparente ? 'trasparente' : ''}`}>
      <div className="intestazione-interna">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          {indietro && (
            <button
              type="button"
              className="bottone-icona"
              aria-label="Indietro"
              onClick={() => navigate(indietro)}
            >
              <IconaIndietro />
            </button>
          )}
          <div style={{ minWidth: 0 }}>
            <h1>{titolo}</h1>
            {sottotitolo && <div className="sottotitolo">{sottotitolo}</div>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {mostraSync && <SyncBadge />}
          {azione}
        </div>
      </div>
    </header>
  )
}
