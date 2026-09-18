import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import DayMeals from '../components/DayMeals'
import TagChips from '../components/TagChips'
import RatingStelle from '../components/RatingStelle'
import { IconaCondividi, IconaSettimana } from '../components/Icons'
import { giornoDi, menuDi, useApp } from '../store/appStore'
import { isGithubConfigured } from '../store/localConfig'
import { toIsoDate } from '../lib/utils'
import {
  addDays,
  descriviGiorno,
  isOggi,
  isoWeekStart,
  parseIsoDate,
  startOfWeek,
  weekDates,
} from '../lib/date'
import { generaSettimana, menuUtilizzabili } from '../lib/random'
import { notaMenu } from '../lib/menu'
import { testoGiorno } from '../lib/giorno'
import { coloreDi, stileMenu } from '../lib/colori'
import { useBarraStato } from '../lib/barraStato'

/** Spostamento orizzontale minimo perché un tocco valga come scorrimento. */
const SOGLIA_SCORRIMENTO = 55

const maiuscola = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export default function Home() {
  const navigate = useNavigate()
  const data = useApp((s) => s.data)
  const config = useApp((s) => s.config)
  const setDayMenu = useApp((s) => s.setDayMenu)
  const impostaRating = useApp((s) => s.impostaRating)
  const toggleDaySkipped = useApp((s) => s.toggleDaySkipped)

  const [giornoIso, setGiornoIso] = useState(() => toIsoDate(new Date()))
  const [messaggio, setMessaggio] = useState<string | null>(null)
  const tocco = useRef<{ x: number; y: number } | null>(null)

  const menu = menuDi(data, giornoIso)
  const giorno = giornoDi(data, giornoIso)
  const backupAttivo = isGithubConfigured(config)
  const utilizzabili = menuUtilizzabili(data?.menus ?? [])
  const suOggi = isOggi(giornoIso)

  const dataEstesa = parseIsoDate(giornoIso).toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  const etichetta = descriviGiorno(giornoIso)

  function vaiA(iso: string) {
    setGiornoIso(iso)
    setMessaggio(null)
  }

  function spostaGiorno(passi: number) {
    vaiA(toIsoDate(addDays(parseIsoDate(giornoIso), passi)))
  }

  /**
   * Lo scorrimento orizzontale cambia giorno, ma solo quando è chiaramente
   * orizzontale: altrimenti ruberebbe lo scorrimento verticale della pagina.
   */
  function fineTocco(e: React.TouchEvent) {
    const inizio = tocco.current
    tocco.current = null
    if (!inizio || e.changedTouches.length !== 1) return
    const dx = e.changedTouches[0].clientX - inizio.x
    const dy = e.changedTouches[0].clientY - inizio.y
    if (Math.abs(dx) < SOGLIA_SCORRIMENTO || Math.abs(dx) < Math.abs(dy) * 1.5) return
    spostaGiorno(dx < 0 ? 1 : -1)
  }

  /** Stessa logica della settimana: stelle, stagione e limiti settimanali. */
  function menuCasuale() {
    if (!data || utilizzabili.length === 0) return
    const settimana = weekDates(isoWeekStart(startOfWeek(parseIsoDate(giornoIso))))
    const altriGiorni = settimana
      .filter((iso) => iso !== giornoIso)
      .map((iso) => giornoDi(data, iso)?.menuId)
      .filter((id): id is string => Boolean(id))

    const esito = generaSettimana(
      [giornoIso],
      utilizzabili,
      altriGiorni,
      data.settings.frequencyRules,
      data.settings.seasonal,
    )
    const scelto = esito.assegnazioni[giornoIso]
    if (scelto) setDayMenu(giornoIso, scelto)
  }

  async function condividi() {
    if (!data || !menu) return
    const testo = testoGiorno(data, giornoIso, menu)
    try {
      if (navigator.share) {
        await navigator.share({ title: menu.name, text: testo })
        return
      }
      await navigator.clipboard.writeText(testo)
      setMessaggio('Menu copiato negli appunti.')
    } catch {
      setMessaggio(null)
    }
  }

  const nota = menu ? notaMenu(menu) : null
  const conMenu = Boolean(menu && !giorno?.skipped)
  useBarraStato(conMenu ? coloreDi(menu?.color)?.rgb : undefined)

  return (
    <>
      {conMenu && menu?.color && (
        // La chiave rifà l'elemento invece di cambiargli una variabile: è un
        // livello fisso, e Safari sa tenerne in giro uno dipinto com'era.
        <div key={menu.color} className="gradiente-oggi" style={stileMenu(menu)} aria-hidden="true" />
      )}
      <Header
        titolo={maiuscola(etichetta)}
        mostraSync
        trasparente={Boolean(conMenu && menu?.color)}
        azione={
          <button
            type="button"
            className="bottone secondario"
            style={{ height: 36, padding: '0 12px', fontSize: 13, gap: 6 }}
            onClick={() => navigate('/settimana')}
          >
            <IconaSettimana />
            Settimana
          </button>
        }
      />
      <main
        className="contenuto"
        onTouchStart={(e) => {
          if (e.touches.length === 1) {
            tocco.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
          }
        }}
        onTouchEnd={fineTocco}
      >
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button
            type="button"
            className="bottone secondario"
            style={{ flex: '0 0 auto' }}
            aria-label="Giorno precedente"
            onClick={() => spostaGiorno(-1)}
          >
            ←
          </button>
          <button
            type="button"
            className="bottone secondario"
            style={{ flex: 1 }}
            disabled={suOggi}
            onClick={() => vaiA(toIsoDate(new Date()))}
          >
            {suOggi ? dataEstesa : 'Torna a oggi'}
          </button>
          <button
            type="button"
            className="bottone secondario"
            style={{ flex: '0 0 auto' }}
            aria-label="Giorno successivo"
            onClick={() => spostaGiorno(1)}
          >
            →
          </button>
        </div>

        {!backupAttivo && (
          <div className="avviso attenzione" style={{ marginBottom: 16 }}>
            <strong>Backup non ancora attivo.</strong> I dati vivono solo su questo dispositivo.
            <div style={{ marginTop: 12 }}>
              <Link className="bottone secondario" to="/impostazioni/backup">
                Attiva il backup
              </Link>
            </div>
          </div>
        )}

        {conMenu && menu ? (
          <>
            <h1 className="titolo-eroe">{menu.name}</h1>

            {nota && (
              <p
                className={`sottotitolo ${nota.invito ? 'nota-mancante' : ''}`}
                style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}
              >
                {nota.testo}
              </p>
            )}

            <div style={{ marginTop: 12, marginLeft: -3 }}>
              <RatingStelle
                valore={menu.rating ?? 0}
                onCambia={(valore) => impostaRating(menu.id, valore)}
              />
            </div>

            {menu.tags.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <TagChips tags={menu.tags} />
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button
                type="button"
                className="bottone secondario"
                style={{ flex: 1 }}
                onClick={() => navigate(`/scegli/${giornoIso}`)}
              >
                Cambia menu
              </button>
              <button
                type="button"
                className="bottone"
                style={{ flex: '0 0 auto', padding: '0 16px' }}
                aria-label={`Condividi il menu di ${etichetta}`}
                title={`Condividi il menu di ${etichetta}`}
                onClick={() => void condividi()}
              >
                <IconaCondividi />
              </button>
            </div>

            {messaggio && (
              <div className="avviso ok" style={{ marginTop: 12 }}>
                {messaggio}
              </div>
            )}

            <div style={{ marginTop: 14 }}>
              <DayMeals date={giornoIso} menu={menu} />
            </div>
          </>
        ) : (
          <div className="vuoto">
            <h3>
              {giorno?.skipped
                ? `${maiuscola(etichetta)}: giornata esclusa`
                : `Nessun menu per ${etichetta}`}
            </h3>
            <p>
              {giorno?.skipped
                ? 'La avevi messa da parte nella pianificazione della settimana.'
                : utilizzabili.length === 0
                  ? 'Crea il tuo primo menu e potrai assegnarlo alle giornate.'
                  : 'Scegli tu cosa mangiare, oppure lascia decidere all’app.'}
            </p>

            {giorno?.skipped ? (
              <button type="button" className="bottone" onClick={() => toggleDaySkipped(giornoIso)}>
                Reintegra la giornata
              </button>
            ) : utilizzabili.length === 0 ? (
              <Link className="bottone" to="/menu/nuovo">
                Crea un menu
              </Link>
            ) : (
              <div className="pila" style={{ textAlign: 'left' }}>
                <button
                  type="button"
                  className="bottone pieno"
                  onClick={() => navigate(`/scegli/${giornoIso}`)}
                >
                  Cosa vuoi mangiare?
                </button>
                <button type="button" className="bottone secondario pieno" onClick={menuCasuale}>
                  🎲 Menu casuale
                </button>
              </div>
            )}
          </div>
        )}

        <p className="sottotitolo" style={{ marginTop: 22, textAlign: 'center', fontSize: 13 }}>
          Scorri con il dito a destra o a sinistra per cambiare giorno.
        </p>
      </main>
    </>
  )
}
