import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import MenuPicker from '../components/MenuPicker'
import Modal from '../components/Modal'
import TagChips from '../components/TagChips'
import RatingStelle from '../components/RatingStelle'
import { IconaFreccia } from '../components/Icons'
import { giornoDi, useApp } from '../store/appStore'
import {
  addDays,
  giornoBreve,
  intervalloSettimana,
  isOggi,
  isoWeekStart,
  parseIsoDate,
  weekDates,
} from '../lib/date'
import { toIsoDate } from '../lib/utils'
import {
  conteggiaTag,
  contestoStagionale,
  generaSettimana,
  menuUtilizzabili,
} from '../lib/random'
import { definizioneTag } from '../lib/tags'
import { notaMenu } from '../lib/menu'
import { stileMenu } from '../lib/colori'
import type { DayMenu } from '../types'

export default function Week() {
  const navigate = useNavigate()
  const data = useApp((s) => s.data)
  const setDayMenu = useApp((s) => s.setDayMenu)
  const assegnaMenuMultipli = useApp((s) => s.assegnaMenuMultipli)
  const impostaRating = useApp((s) => s.impostaRating)
  const [inizio, setInizio] = useState(() => isoWeekStart())
  const [daAssegnare, setDaAssegnare] = useState<string | null>(null)
  const [chiedeConferma, setChiedeConferma] = useState(false)
  const [avviso, setAvviso] = useState<string | null>(null)

  const date = useMemo(() => weekDates(inizio), [inizio])
  const settimanaCorrente = inizio === isoWeekStart()
  const utilizzabili = useMemo(() => menuUtilizzabili(data?.menus ?? []), [data])
  const regole = data?.settings.frequencyRules ?? []
  const contesto = contestoStagionale(data?.settings.seasonal)

  const menuDelGiorno = (iso: string): DayMenu | undefined => {
    const giorno = giornoDi(data, iso)
    if (!giorno?.menuId || giorno.skipped) return undefined
    return data?.menus.find((m) => m.id === giorno.menuId)
  }

  /** Giorni che la generazione può toccare: né esclusi né bloccati. */
  const disponibili = date.filter((iso) => {
    const giorno = giornoDi(data, iso)
    return !giorno?.skipped && !giorno?.locked
  })
  const vuoti = disponibili.filter((iso) => !giornoDi(data, iso)?.menuId)
  const assegnati = date.filter((iso) => giornoDi(data, iso)?.menuId).length

  // Contatori delle regole sulla settimana visualizzata.
  const conteggi = useMemo(() => {
    const assegnatiOra = date
      .map((iso) => menuDelGiorno(iso))
      .filter((m): m is DayMenu => Boolean(m))
    return conteggiaTag(assegnatiOra)
  }, [data, date])

  function spostaSettimana(settimane: number) {
    setInizio(toIsoDate(addDays(parseIsoDate(inizio), settimane * 7)))
    setAvviso(null)
  }

  function genera(modalita: 'vuoti' | 'tutti') {
    const obiettivo = modalita === 'vuoti' ? vuoti : disponibili
    // I menu dei giorni che restano invariati contano per i limiti settimanali.
    const giaAssegnati = date
      .filter((iso) => !obiettivo.includes(iso))
      .map((iso) => giornoDi(data, iso)?.menuId)
      .filter((id): id is string => Boolean(id))

    const esito = generaSettimana(
      obiettivo,
      utilizzabili,
      giaAssegnati,
      regole,
      data?.settings.seasonal,
    )
    if (Object.keys(esito.assegnazioni).length > 0) assegnaMenuMultipli(esito.assegnazioni)
    setChiedeConferma(false)
    setAvviso(
      esito.regoleForzate.length > 0
        ? `Non c'erano abbastanza menu per rispettare il limite su ${esito.regoleForzate.join(
            ' e ',
          )}: la settimana è completa ma il contatore è sopra il massimo.`
        : null,
    )
  }

  function avviaGenerazione() {
    if (utilizzabili.length === 0) return
    if (disponibili.length === vuoti.length) genera('vuoti')
    else setChiedeConferma(true)
  }

  return (
    <>
      <Header titolo="Settimana" sottotitolo={intervalloSettimana(inizio)} indietro="/" />
      <main className="contenuto">
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button
            type="button"
            className="bottone secondario"
            style={{ flex: '0 0 auto' }}
            aria-label="Settimana precedente"
            onClick={() => spostaSettimana(-1)}
          >
            ←
          </button>
          <button
            type="button"
            className="bottone secondario"
            style={{ flex: 1 }}
            disabled={settimanaCorrente}
            onClick={() => {
              setInizio(isoWeekStart())
              setAvviso(null)
            }}
          >
            {settimanaCorrente ? 'Settimana corrente' : 'Torna a questa settimana'}
          </button>
          <button
            type="button"
            className="bottone secondario"
            style={{ flex: '0 0 auto' }}
            aria-label="Settimana successiva"
            onClick={() => spostaSettimana(1)}
          >
            →
          </button>
        </div>

        {utilizzabili.length === 0 ? (
          <div className="avviso attenzione" style={{ marginBottom: 16 }}>
            <strong>Non hai ancora menu da assegnare.</strong> Creane almeno uno, con qualche pasto
            compilato, e potrai distribuirlo sui giorni della settimana.
            <div style={{ marginTop: 12 }}>
              <Link className="bottone secondario" to="/menu/nuovo">
                Crea un menu
              </Link>
            </div>
          </div>
        ) : (
          <>
            <button
              type="button"
              className="bottone pieno"
              disabled={disponibili.length === 0}
              onClick={avviaGenerazione}
            >
              🎲 Genera la settimana
            </button>
            <p className="sottotitolo" style={{ margin: '10px 2px 12px' }}>
              {disponibili.length === 0
                ? 'Tutti i giorni sono bloccati o esclusi: non c’è nulla da generare.'
                : `Pesca fra i tuoi ${utilizzabili.length} menu dando più probabilità a quelli con più stelle${
                    contesto ? ` e ai piatti da ${contesto.stagione}` : ''
                  }. ${assegnati > 0 ? `${assegnati} su 7 già assegnati.` : 'Puoi sempre cambiare un giorno a mano.'}`}
            </p>
          </>
        )}

        {regole.length > 0 && assegnati > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            {regole.map((regola) => {
              const quante = conteggi.get(regola.tag) ?? 0
              const sforata = quante > regola.timesPerWeek
              return (
                <span
                  key={regola.id}
                  className={`contatore-regola ${sforata ? 'sforata' : ''}`}
                  title={`Massimo ${regola.timesPerWeek} volte a settimana`}
                >
                  <span>{definizioneTag(regola.tag).emoji}</span>
                  {regola.label} {quante}/{regola.timesPerWeek}
                </span>
              )
            })}
          </div>
        )}

        {avviso && (
          <div className="avviso attenzione" style={{ marginBottom: 14 }}>
            {avviso}
          </div>
        )}

        <div className="pila">
          {date.map((iso) => {
            const giorno = giornoDi(data, iso)
            const menu = giorno?.menuId
              ? data?.menus.find((m) => m.id === giorno.menuId)
              : undefined
            const oggi = isOggi(iso)
            return (
              <div
                key={iso}
                className={`scheda ${menu?.color && !giorno?.skipped ? 'bagliore-menu' : ''}`}
                style={{
                  padding: '12px 14px',
                  borderColor: oggi ? 'var(--accento)' : undefined,
                  opacity: giorno?.skipped ? 0.55 : 1,
                  ...stileMenu(menu),
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    role="button"
                    tabIndex={0}
                    style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                    onClick={() => setDaAssegnare(iso)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setDaAssegnare(iso)
                      }
                    }}
                  >
                    <div
                      className="voce-titolo"
                      style={{ color: oggi ? 'var(--accento)' : undefined }}
                    >
                      {giornoBreve(iso)}
                      {oggi && ' · oggi'}
                      {giorno?.locked && ' 🔒'}
                    </div>
                    <div
                      className="voce-nota"
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <span
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {giorno?.skipped
                          ? 'Giorno escluso'
                          : menu
                            ? menu.name
                            : 'Tocca per assegnare un menu'}
                      </span>
                      {menu && !giorno?.skipped && <TagChips tags={menu.tags} soloEmoji />}
                    </div>
                  </div>

                  {menu && !giorno?.skipped && (
                    <button
                      type="button"
                      className="bottone-icona"
                      style={{ flex: '0 0 auto', border: 'none' }}
                      aria-label={`Apri il dettaglio di ${giornoBreve(iso)}`}
                      onClick={() => navigate(`/giorno/${iso}`)}
                    >
                      <span className="freccia">
                        <IconaFreccia />
                      </span>
                    </button>
                  )}
                </div>

                {menu && !giorno?.skipped && (
                  <>
                    <div
                      className={`voce-nota ${notaMenu(menu).invito ? 'nota-mancante' : ''}`}
                      style={{ marginTop: 4, whiteSpace: 'normal' }}
                    >
                      {notaMenu(menu).testo}
                    </div>
                    <div style={{ marginTop: 6, marginLeft: -3 }}>
                      <RatingStelle
                        valore={menu.rating ?? 0}
                        piccolo
                        onCambia={(valore) => impostaRating(menu.id, valore)}
                      />
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </main>

      {chiedeConferma && (
        <Modal
          titolo="Generare la settimana"
          descrizione="Alcuni giorni hanno già un menu assegnato. Decidi tu cosa farne: i giorni bloccati e quelli esclusi restano intatti in ogni caso."
          onChiudi={() => setChiedeConferma(false)}
          azioni={
            <button
              type="button"
              className="bottone secondario"
              onClick={() => setChiedeConferma(false)}
            >
              Annulla
            </button>
          }
        >
          <div className="pila">
            <button
              type="button"
              className="bottone pieno"
              disabled={vuoti.length === 0}
              onClick={() => genera('vuoti')}
            >
              {vuoti.length === 0
                ? 'Nessun giorno vuoto da completare'
                : `Completa i ${vuoti.length} giorni vuoti`}
            </button>
            <button type="button" className="bottone pericolo pieno" onClick={() => genera('tutti')}>
              Rigenera tutti i {disponibili.length} giorni
            </button>
          </div>
        </Modal>
      )}

      {daAssegnare && (
        <MenuPicker
          date={daAssegnare}
          onChiudi={() => setDaAssegnare(null)}
          onScegli={(menuId) => {
            setDayMenu(daAssegnare, menuId)
            setDaAssegnare(null)
          }}
        />
      )}
    </>
  )
}
