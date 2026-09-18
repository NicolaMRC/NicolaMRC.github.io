import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import DayMeals from '../components/DayMeals'
import TagChips from '../components/TagChips'
import RatingStelle from '../components/RatingStelle'
import { IconaCondividi } from '../components/Icons'
import { giornoDi, menuDi, useApp } from '../store/appStore'
import { isGithubConfigured } from '../store/localConfig'
import { toIsoDate } from '../lib/utils'
import { isoWeekStart, parseIsoDate, weekDates } from '../lib/date'
import { generaSettimana, menuUtilizzabili } from '../lib/random'
import { testoGiorno } from '../lib/giorno'
import { stileMenu } from '../lib/colori'

export default function Home() {
  const navigate = useNavigate()
  const data = useApp((s) => s.data)
  const config = useApp((s) => s.config)
  const setDayMenu = useApp((s) => s.setDayMenu)
  const impostaRating = useApp((s) => s.impostaRating)
  const toggleDaySkipped = useApp((s) => s.toggleDaySkipped)
  const [messaggio, setMessaggio] = useState<string | null>(null)

  const oggi = toIsoDate(new Date())
  const menu = menuDi(data, oggi)
  const giorno = giornoDi(data, oggi)
  const backupAttivo = isGithubConfigured(config)
  const utilizzabili = menuUtilizzabili(data?.menus ?? [])

  const dataEstesa = parseIsoDate(oggi).toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  /** Stessa logica della settimana: stelle, stagione e limiti settimanali. */
  function menuCasuale() {
    if (!data || utilizzabili.length === 0) return
    const settimana = weekDates(isoWeekStart())
    const altriGiorni = settimana
      .filter((iso) => iso !== oggi)
      .map((iso) => giornoDi(data, iso)?.menuId)
      .filter((id): id is string => Boolean(id))

    const esito = generaSettimana(
      [oggi],
      utilizzabili,
      altriGiorni,
      data.settings.frequencyRules,
      data.settings.seasonal,
    )
    const scelto = esito.assegnazioni[oggi]
    if (scelto) setDayMenu(oggi, scelto)
  }

  async function condividi() {
    if (!data || !menu) return
    const testo = testoGiorno(data, oggi, menu)
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

  return (
    <>
      {menu && !giorno?.skipped && menu.color && (
        <div className="gradiente-oggi" style={stileMenu(menu)} aria-hidden="true" />
      )}
      <Header
        titolo="Oggi"
        sottotitolo={dataEstesa}
        mostraSync
        trasparente={Boolean(menu && !giorno?.skipped && menu.color)}
      />
      <main className="contenuto">
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

        {menu && !giorno?.skipped ? (
          <>
            <div
              className="scheda"
              style={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 }}
            >
              <h1 className="titolo-eroe">{menu.name}</h1>

              {menu.notes?.trim() && (
                <p className="sottotitolo" style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>
                  {menu.notes.trim()}
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
                  onClick={() => navigate(`/scegli/${oggi}`)}
                >
                  Cambia menu
                </button>
                <button
                  type="button"
                  className="bottone"
                  style={{ flex: '0 0 auto', padding: '0 16px' }}
                  aria-label="Condividi il menu di oggi"
                  title="Condividi il menu di oggi"
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
            </div>

            <div style={{ marginTop: 14 }}>
              <DayMeals date={oggi} menu={menu} />
            </div>
          </>
        ) : (
          <div className="vuoto">
            <h3>{giorno?.skipped ? 'Oggi è un giorno escluso' : 'Nessun menu per oggi'}</h3>
            <p>
              {giorno?.skipped
                ? 'Lo avevi messo da parte nella pianificazione della settimana.'
                : utilizzabili.length === 0
                  ? 'Crea il tuo primo menu e potrai assegnarlo alle giornate.'
                  : 'Scegli tu cosa mangiare, oppure lascia decidere all’app.'}
            </p>

            {giorno?.skipped ? (
              <button
                type="button"
                className="bottone"
                onClick={() => toggleDaySkipped(oggi)}
              >
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
                  onClick={() => navigate(`/scegli/${oggi}`)}
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
      </main>
    </>
  )
}
