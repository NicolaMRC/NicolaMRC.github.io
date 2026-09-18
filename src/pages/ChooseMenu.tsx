import { useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import Header from '../components/Header'
import TagChips from '../components/TagChips'
import RatingStelle from '../components/RatingStelle'
import { giornoDi, useApp } from '../store/appStore'
import { byName, normalize } from '../lib/utils'
import { notaMenu } from '../lib/menu'
import { stileMenu } from '../lib/colori'
import { descriviGiorno } from '../lib/date'
import { definizioneTag, ordinaTag } from '../lib/tags'
import {
  contestoStagionale,
  menuUtilizzabili,
  moltiplicatoreStagionale,
  ratingEffettivo,
} from '../lib/random'
import type { DayMenu } from '../types'

/** Quanti consigli mostrare prima dell'elenco completo. */
const QUANTI_CONSIGLI = 5

export default function ChooseMenu() {
  const { date } = useParams()
  const navigate = useNavigate()
  const data = useApp((s) => s.data)
  const setDayMenu = useApp((s) => s.setDayMenu)
  const impostaRating = useApp((s) => s.impostaRating)

  const [ricerca, setRicerca] = useState('')
  const [filtri, setFiltri] = useState<string[]>([])

  const contesto = contestoStagionale(data?.settings.seasonal)
  const tutti = useMemo(
    () => menuUtilizzabili(data?.menus ?? []).sort(byName),
    [data],
  )

  const tagDisponibili = useMemo(
    () => ordinaTag([...new Set(tutti.flatMap((m) => m.tags))]),
    [tutti],
  )

  const termine = normalize(ricerca)

  function corrisponde(menu: DayMenu, tagExtra?: string): boolean {
    const richiesti = tagExtra ? [...filtri, tagExtra] : filtri
    if (richiesti.some((tag) => !menu.tags.includes(tag))) return false
    if (!termine) return true
    return (
      normalize(menu.name).includes(termine) ||
      normalize(menu.notes ?? '').includes(termine) ||
      menu.tags.some((tag) => normalize(definizioneTag(tag).label).includes(termine))
    )
  }

  const risultati = tutti.filter((m) => corrisponde(m))
  const staCercando = termine.length > 0 || filtri.length > 0

  /**
   * Consigliati: gradimento e stagione, gli stessi criteri con cui pesca la
   * generazione automatica. Così il suggerimento non contraddice il caso.
   */
  const consigliati = useMemo(() => {
    if (staCercando) return []
    return [...tutti]
      .map((menu) => ({
        menu,
        punteggio: ratingEffettivo(menu) * moltiplicatoreStagionale(menu, contesto),
      }))
      .sort((a, b) => b.punteggio - a.punteggio)
      .slice(0, QUANTI_CONSIGLI)
      .map((v) => v.menu)
  }, [tutti, contesto, staCercando])

  const idConsigliati = new Set(consigliati.map((m) => m.id))
  // Quelli non già mostrati fra i consigliati: evita di elencarli due volte.
  const restanti = risultati.filter((m) => staCercando || !idConsigliati.has(m.id))

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return <Navigate to="/" replace />

  const assegnato = giornoDi(data, date)?.menuId

  function scegli(menuId: string) {
    setDayMenu(date as string, menuId)
    navigate(-1)
  }

  function motivo(menu: DayMenu): string | null {
    if (contesto) {
      const stagionale = moltiplicatoreStagionale(menu, contesto)
      if (stagionale > 1) return contesto.stagione === 'estate' ? '☀️ di stagione' : '❄️ di stagione'
    }
    if ((menu.rating ?? 0) >= 4) return '⭐ fra i preferiti'
    return null
  }

  function Riga({ menu, nota }: { menu: DayMenu; nota?: string | null }) {
    return (
      <div
        className={`voce ${menu.color ? 'tinta-menu' : ''}`}
        style={{ cursor: 'default', ...stileMenu(menu) }}
      >
        <div className="voce-testo">
          <div
            role="button"
            tabIndex={0}
            style={{ cursor: 'pointer' }}
            onClick={() => scegli(menu.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                scegli(menu.id)
              }
            }}
          >
            <div
              className="voce-titolo"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {menu.name}
              </span>
              {assegnato === menu.id && <span className="etichetta dispensa">assegnato</span>}
            </div>
            <div className={`voce-nota ${!nota && notaMenu(menu).invito ? 'nota-mancante' : ''}`}>
              {nota ?? notaMenu(menu).testo}
            </div>
          </div>
          <div style={{ marginTop: 6, marginLeft: -3 }}>
            <RatingStelle
              valore={menu.rating ?? 0}
              piccolo
              onCambia={(valore) => impostaRating(menu.id, valore)}
            />
          </div>
          {menu.tags.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <TagChips tags={menu.tags} />
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <Header
        titolo="Cosa vuoi mangiare?"
        sottotitolo={descriviGiorno(date)}
        indietro="/"
      />
      <main className="contenuto">
        <div className="cerca">
          <input
            type="text"
            inputMode="search"
            placeholder="Cerca per nome, nota o tag"
            value={ricerca}
            onChange={(e) => setRicerca(e.target.value)}
          />
        </div>

        {tagDisponibili.length > 1 && (
          <div style={{ marginBottom: 16 }}>
            <div className="gruppo-chip">
              {tagDisponibili.map((tag) => {
                const attivo = filtri.includes(tag)
                const vuoto = !attivo && tutti.filter((m) => corrisponde(m, tag)).length === 0
                const definizione = definizioneTag(tag)
                return (
                  <button
                    key={tag}
                    type="button"
                    className={`chip ${attivo ? 'attivo' : ''}`}
                    aria-pressed={attivo}
                    disabled={vuoto}
                    style={vuoto ? { opacity: 0.35, cursor: 'default' } : undefined}
                    onClick={() =>
                      setFiltri((precedenti) =>
                        precedenti.includes(tag)
                          ? precedenti.filter((t) => t !== tag)
                          : [...precedenti, tag],
                      )
                    }
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

        {tutti.length === 0 && (
          <div className="vuoto">
            <h3>Nessun menu disponibile</h3>
            <p>Servono menu con almeno un pasto compilato.</p>
          </div>
        )}

        {consigliati.length > 0 && (
          <div className="sezione" style={{ marginTop: 0 }}>
            <div className="sezione-titolo">
              Consigliati{contesto ? ` per l’${contesto.stagione}` : ''}
            </div>
            <div className="elenco">
              {consigliati.map((menu) => (
                <Riga key={menu.id} menu={menu} nota={motivo(menu)} />
              ))}
            </div>
          </div>
        )}

        {risultati.length === 0 && tutti.length > 0 && (
          <div className="vuoto">
            <h3>Nessun risultato</h3>
            <p>Nessun menu corrisponde alla ricerca.</p>
          </div>
        )}

        {restanti.length > 0 && (
          <div className="sezione">
            <div className="sezione-titolo">
              {staCercando
                ? `${restanti.length} ${restanti.length === 1 ? 'risultato' : 'risultati'}`
                : 'Gli altri menu'}
            </div>
            <div className="elenco">
              {restanti.map((menu) => (
                <Riga key={menu.id} menu={menu} />
              ))}
            </div>
          </div>
        )}
      </main>
    </>
  )
}
