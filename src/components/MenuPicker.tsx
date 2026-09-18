import { useMemo, useState } from 'react'
import Modal from './Modal'
import TagChips from './TagChips'
import { giornoDi, useApp } from '../store/appStore'
import { giornoBreve } from '../lib/date'
import { byName, normalize } from '../lib/utils'
import { riassuntoMenu } from '../lib/menu'
import { stileMenu } from '../lib/colori'
import { definizioneTag, ordinaTag } from '../lib/tags'
import type { DayMenu } from '../types'

interface Props {
  date: string
  onChiudi: () => void
  onScegli: (menuId: string | null) => void
}

function corrisponde(menu: DayMenu, termine: string, filtri: string[]): boolean {
  if (filtri.some((tag) => !menu.tags.includes(tag))) return false
  if (!termine) return true
  return (
    normalize(menu.name).includes(termine) ||
    menu.tags.some((tag) => normalize(definizioneTag(tag).label).includes(termine))
  )
}

/** Scelta del menu da assegnare a un giorno, con ricerca, filtri e stato del giorno. */
export default function MenuPicker({ date, onChiudi, onScegli }: Props) {
  const data = useApp((s) => s.data)
  const toggleDaySkipped = useApp((s) => s.toggleDaySkipped)
  const toggleDayLocked = useApp((s) => s.toggleDayLocked)
  const giorno = giornoDi(data, date)
  const [ricerca, setRicerca] = useState('')
  const [filtri, setFiltri] = useState<string[]>([])

  const tutti = useMemo(() => [...(data?.menus ?? [])].sort(byName), [data])

  /** Solo i tag effettivamente usati: filtrare per un tag inesistente è inutile. */
  const tagDisponibili = useMemo(
    () => ordinaTag([...new Set(tutti.flatMap((m) => m.tags))]),
    [tutti],
  )

  const termine = normalize(ricerca)
  const menu = useMemo(
    () => tutti.filter((m) => corrisponde(m, termine, filtri)),
    [tutti, termine, filtri],
  )

  /**
   * Un tag che non lascerebbe alcun risultato viene disattivato: con il
   * filtro a incrocio è facilissimo finire in un vicolo cieco, e mostrarlo
   * prima evita di doverci sbattere contro.
   */
  function risultatiCon(tag: string): number {
    return tutti.filter((m) => corrisponde(m, termine, [...filtri, tag])).length
  }

  function alternaFiltro(tag: string) {
    setFiltri((precedenti) =>
      precedenti.includes(tag) ? precedenti.filter((t) => t !== tag) : [...precedenti, tag],
    )
  }

  return (
    <Modal
      titolo={giornoBreve(date)}
      descrizione="Scegli il menu da assegnare a questo giorno."
      onChiudi={onChiudi}
      azioni={
        <>
          <button type="button" className="bottone secondario" onClick={onChiudi}>
            Chiudi
          </button>
          {giorno?.menuId && (
            <button type="button" className="bottone pericolo" onClick={() => onScegli(null)}>
              Svuota il giorno
            </button>
          )}
        </>
      }
    >
      {tutti.length > 4 && (
        <div className="cerca">
          <input
            type="text"
            inputMode="search"
            placeholder="Cerca per nome o tag"
            value={ricerca}
            onChange={(e) => setRicerca(e.target.value)}
          />
        </div>
      )}

      {tagDisponibili.length > 1 && (
        <div style={{ marginBottom: 14 }}>
          <div className="gruppo-chip">
            {tagDisponibili.map((tag) => {
              const attivo = filtri.includes(tag)
              const vuoto = !attivo && risultatiCon(tag) === 0
              const definizione = definizioneTag(tag)
              return (
                <button
                  key={tag}
                  type="button"
                  className={`chip ${attivo ? 'attivo' : ''}`}
                  aria-pressed={attivo}
                  disabled={vuoto}
                  style={vuoto ? { opacity: 0.35, cursor: 'default' } : undefined}
                  onClick={() => alternaFiltro(tag)}
                >
                  <span className="chip-emoji">{definizione.emoji}</span>
                  {definizione.label}
                </button>
              )
            })}
          </div>
          {filtri.length > 0 && (
            <button
              type="button"
              className="bottone secondario pieno"
              style={{ marginTop: 10, minHeight: 38 }}
              onClick={() => setFiltri([])}
            >
              Togli i filtri
            </button>
          )}
        </div>
      )}

      {menu.length === 0 ? (
        <p className="sottotitolo">
          {tutti.length === 0
            ? 'Nessun menu disponibile.'
            : 'Nessun menu corrisponde ai filtri scelti.'}
        </p>
      ) : (
        <div className="elenco">
          {menu.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`voce ${m.color ? 'bagliore-menu' : ''}`}
              style={stileMenu(m)}
              onClick={() => onScegli(m.id)}
            >
              <div className="voce-testo">
                <div
                  className="voce-titolo"
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <span
                    style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {m.name}
                  </span>
                  <TagChips tags={m.tags} soloEmoji />
                </div>
                <div className="voce-nota">{riassuntoMenu(m)}</div>
              </div>
              {giorno?.menuId === m.id && <span className="etichetta dispensa">assegnato</span>}
            </button>
          ))}
        </div>
      )}

      <div className="interruttore" style={{ marginTop: 14 }}>
        <div className="interruttore-testo">
          <strong>Blocca questo giorno</strong>
          <span>La generazione automatica non lo cambierà.</span>
        </div>
        <input
          type="checkbox"
          checked={giorno?.locked ?? false}
          onChange={() => toggleDayLocked(date)}
        />
      </div>

      <div className="interruttore">
        <div className="interruttore-testo">
          <strong>Escludi questo giorno</strong>
          <span>Non entrerà nella lista della spesa né nella generazione automatica.</span>
        </div>
        <input
          type="checkbox"
          checked={giorno?.skipped ?? false}
          onChange={() => toggleDaySkipped(date)}
        />
      </div>
    </Modal>
  )
}
