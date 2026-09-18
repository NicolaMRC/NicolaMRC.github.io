import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/appStore'
import { formatWhen } from '../lib/utils'
import type { SyncStatus } from '../sync/syncEngine'

/**
 * Indicatore sempre visibile dello stato del backup: l'utente non deve mai
 * chiedersi se i suoi dati sono al sicuro.
 */

function descrizione(status: SyncStatus, lastSyncedAt: string | null): { testo: string; pallino: string } {
  switch (status) {
    case 'allineato':
      return { testo: `Salvato ${formatWhen(lastSyncedAt)}`, pallino: 'ok' }
    case 'in-corso':
      return { testo: 'Salvataggio…', pallino: 'corso' }
    case 'in-attesa':
      return { testo: 'Da salvare', pallino: 'attesa' }
    case 'offline':
      return { testo: 'Offline', pallino: 'attesa' }
    case 'errore':
      return { testo: 'Backup non riuscito', pallino: 'errore' }
    case 'conflitto':
      return { testo: 'Da verificare', pallino: 'errore' }
    default:
      return { testo: 'Backup non attivo', pallino: '' }
  }
}

export default function SyncBadge() {
  const navigate = useNavigate()
  const sync = useApp((s) => s.sync)
  const { testo, pallino } = descrizione(sync.status, sync.lastSyncedAt)

  return (
    <button
      type="button"
      className="badge-sync"
      onClick={() => navigate('/impostazioni/backup')}
      title={sync.message ?? testo}
    >
      <span className={`pallino ${pallino}`} />
      {testo}
    </button>
  )
}
