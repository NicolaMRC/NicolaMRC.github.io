import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import Modal from '../components/Modal'
import {
  IconaCalendario,
  IconaCestino,
  IconaCondividi,
  IconaPiu,
  IconaRicalcola,
} from '../components/Icons'
import { listaCorrente, useApp } from '../store/appStore'
import {
  descriviDettaglio,
  descriviIntervallo,
  descriviVoce,
  nomeVoce,
  raggruppaPerReparto,
  testoLista,
} from '../lib/shopping'
import { addDays, isoWeekStart, parseIsoDate, weekDates } from '../lib/date'
import { toIsoDate } from '../lib/utils'
import { UNIT_LABELS, type Unit } from '../types'

function IconaSpunta() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12.5 4.5 4.5L19 7" />
    </svg>
  )
}

export default function Shopping() {
  const data = useApp((s) => s.data)
  const generaLista = useApp((s) => s.generaLista)
  const toggleVoceSpesa = useApp((s) => s.toggleVoceSpesa)
  const aggiungiVoceManuale = useApp((s) => s.aggiungiVoceManuale)
  const rimuoviVoceSpesa = useApp((s) => s.rimuoviVoceSpesa)
  const eliminaLista = useApp((s) => s.eliminaLista)

  const impostaPersone = useApp((s) => s.impostaPersone)

  const lista = listaCorrente(data)
  const persone = lista?.people ?? 1
  const [sceltaPeriodo, setSceltaPeriodo] = useState(false)
  const [aggiuntaVoce, setAggiuntaVoce] = useState(false)
  const [confermaEliminazione, setConfermaEliminazione] = useState(false)
  const [messaggio, setMessaggio] = useState<string | null>(null)

  const gruppi = useMemo(
    () => (data && lista ? raggruppaPerReparto(data, lista.items) : []),
    [data, lista],
  )

  const totale = lista?.items.length ?? 0
  const presi = lista?.items.filter((v) => v.checked).length ?? 0

  async function condividi() {
    if (!data || !lista) return
    const testo = testoLista(data, lista)
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Lista della spesa', text: testo })
        return
      }
      await navigator.clipboard.writeText(testo)
      setMessaggio('Lista copiata negli appunti.')
    } catch {
      // Condivisione annullata dall'utente, oppure appunti non disponibili.
      setMessaggio(null)
    }
  }

  return (
    <>
      <Header
        titolo="Spesa"
        sottotitolo={lista ? descriviIntervallo(lista.fromDate, lista.toDate) : undefined}
        mostraSync
      />
      <main className="contenuto">
        {!lista ? (
          <div className="vuoto">
            <h3>Nessuna lista</h3>
            <p>
              Scegli un periodo e l'app somma gli ingredienti di tutti i menu assegnati, divisi per
              reparto.
            </p>
            <button type="button" className="bottone" onClick={() => setSceltaPeriodo(true)}>
              Crea la lista della spesa
            </button>
          </div>
        ) : (
          <>
            <div className="scheda" style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <strong>
                  {presi} di {totale} {totale === 1 ? 'voce presa' : 'voci prese'}
                </strong>
                {totale > 0 && (
                  <span className="sottotitolo">{Math.round((presi / totale) * 100)}%</span>
                )}
              </div>
              <div className="barra-avanzamento">
                <div style={{ width: totale ? `${(presi / totale) * 100}%` : '0%' }} />
              </div>

              <div className="contatore-persone">
                <div style={{ minWidth: 0 }}>
                  <strong>{persone === 1 ? 'Per una persona' : `Per ${persone} persone`}</strong>
                  <div className="sottotitolo" style={{ fontSize: 13 }}>
                    I pasti restano quelli, perché una cena per due resta una cena: cambiano i
                    grammi e le confezioni.
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <button
                    type="button"
                    className="bottone-icona"
                    aria-label="Una persona in meno"
                    disabled={persone <= 1}
                    style={persone <= 1 ? { opacity: 0.35 } : undefined}
                    onClick={() => impostaPersone(lista.id, persone - 1)}
                  >
                    −
                  </button>
                  <span className="valore">{persone}</span>
                  <button
                    type="button"
                    className="bottone-icona"
                    aria-label="Una persona in più"
                    disabled={persone >= 20}
                    style={persone >= 20 ? { opacity: 0.35 } : undefined}
                    onClick={() => impostaPersone(lista.id, persone + 1)}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="barra-azioni">
              <button
                type="button"
                className="azione principale"
                aria-label="Condividi la lista"
                title="Condividi la lista"
                onClick={() => void condividi()}
              >
                <IconaCondividi />
              </button>
              <button
                type="button"
                className="azione"
                aria-label="Aggiungi una voce"
                title="Aggiungi una voce"
                onClick={() => setAggiuntaVoce(true)}
              >
                <IconaPiu />
              </button>
              <button
                type="button"
                className="azione"
                aria-label="Ricalcola dai menu"
                title="Ricalcola dai menu"
                onClick={() => generaLista(lista.fromDate, lista.toDate)}
              >
                <IconaRicalcola />
              </button>
              <button
                type="button"
                className="azione"
                aria-label="Cambia periodo"
                title="Cambia periodo"
                onClick={() => setSceltaPeriodo(true)}
              >
                <IconaCalendario />
              </button>
              <button
                type="button"
                className="azione pericolo"
                aria-label="Elimina la lista"
                title="Elimina la lista"
                onClick={() => setConfermaEliminazione(true)}
              >
                <IconaCestino />
              </button>
            </div>

            {totale === 0 && (
              <div className="avviso attenzione" style={{ margin: '16px 0' }}>
                <strong>La lista è vuota.</strong> In questo periodo non ci sono giorni con un menu
                assegnato, oppure tutti gli alimenti sono marcati come già presenti in dispensa.
                <div style={{ marginTop: 12 }}>
                  <Link className="bottone secondario" to="/settimana">
                    Vai alla settimana
                  </Link>
                </div>
              </div>
            )}

            {gruppi.map((gruppo) => (
              <div key={gruppo.id} className="sezione" style={{ marginTop: 16 }}>
                <div className="sezione-titolo">{gruppo.nome}</div>
                <div className="elenco">
                  {gruppo.voci.map((voce) => {
                    const alimento = voce.foodId
                      ? data?.foods.find((f) => f.id === voce.foodId)
                      : undefined
                    const quanto = descriviVoce(voce, alimento)
                    const dettaglio = descriviDettaglio(voce, alimento)
                    return (
                      <div
                        key={voce.id}
                        className={`voce-spesa ${voce.checked ? 'presa' : ''}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleVoceSpesa(lista.id, voce.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            toggleVoceSpesa(lista.id, voce.id)
                          }
                        }}
                      >
                        <span className="spunta">
                          <IconaSpunta />
                        </span>
                        <span className="spesa-testo">
                          <span className="spesa-nome">
                            {data ? nomeVoce(data, voce) : ''}
                          </span>
                          {dettaglio && (
                            <span className="spesa-nota" style={{ display: 'block' }}>
                              {dettaglio}
                            </span>
                          )}
                        </span>
                        {quanto && <span className="spesa-quantita">{quanto}</span>}
                        {voce.manual && (
                          <button
                            type="button"
                            className="bottone-icona"
                            aria-label="Rimuovi voce"
                            style={{ width: 32, height: 32, flex: '0 0 auto' }}
                            onClick={(e) => {
                              e.stopPropagation()
                              rimuoviVoceSpesa(lista.id, voce.id)
                            }}
                          >
                            <IconaCestino />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            {messaggio && (
              <div className="avviso ok" style={{ marginTop: 14 }}>
                {messaggio}
              </div>
            )}

            <p className="sottotitolo" style={{ marginTop: 16, textAlign: 'center' }}>
              In ordine: condividi, aggiungi una voce, ricalcola dai menu, cambia periodo, elimina.
              Il ricalcolo rifà la lista dopo che hai cambiato la settimana, conservando le spunte
              e le voci aggiunte a mano.
            </p>
          </>
        )}
      </main>

      {sceltaPeriodo && (
        <SceltaPeriodo
          onChiudi={() => setSceltaPeriodo(false)}
          onConferma={(da, a) => {
            generaLista(da, a)
            setSceltaPeriodo(false)
            setMessaggio(null)
          }}
        />
      )}

      {confermaEliminazione && lista && (
        <Modal
          titolo="Eliminare la lista?"
          descrizione="Perderai le spunte fatte e le voci aggiunte a mano. I menu della settimana non vengono toccati: puoi sempre rigenerarla."
          onChiudi={() => setConfermaEliminazione(false)}
          azioni={
            <>
              <button
                type="button"
                className="bottone secondario"
                onClick={() => setConfermaEliminazione(false)}
              >
                Annulla
              </button>
              <button
                type="button"
                className="bottone pericolo"
                onClick={() => {
                  eliminaLista(lista.id)
                  setConfermaEliminazione(false)
                }}
              >
                Elimina
              </button>
            </>
          }
        />
      )}

      {aggiuntaVoce && lista && (
        <AggiuntaVoce
          onChiudi={() => setAggiuntaVoce(false)}
          onAggiungi={(nome, quantita, unit) => {
            aggiungiVoceManuale(lista.id, nome, quantita, unit)
            setAggiuntaVoce(false)
          }}
        />
      )}
    </>
  )
}

function SceltaPeriodo({
  onChiudi,
  onConferma,
}: {
  onChiudi: () => void
  onConferma: (da: string, a: string) => void
}) {
  const settimanaCorrente = weekDates(isoWeekStart())
  const settimanaProssima = weekDates(toIsoDate(addDays(parseIsoDate(isoWeekStart()), 7)))
  const oggi = toIsoDate(new Date())

  const [da, setDa] = useState(settimanaCorrente[0])
  const [a, setA] = useState(settimanaCorrente[6])

  const intervalloValido = parseIsoDate(da) <= parseIsoDate(a)

  return (
    <Modal
      titolo="Periodo della spesa"
      descrizione="I giorni esclusi e quelli senza menu vengono saltati."
      onChiudi={onChiudi}
      azioni={
        <>
          <button type="button" className="bottone secondario" onClick={onChiudi}>
            Annulla
          </button>
          <button
            type="button"
            className="bottone"
            disabled={!intervalloValido}
            onClick={() => onConferma(da, a)}
          >
            Genera
          </button>
        </>
      }
    >
      <div className="gruppo-chip" style={{ marginBottom: 16 }}>
        <button
          type="button"
          className={`chip ${da === settimanaCorrente[0] && a === settimanaCorrente[6] ? 'attivo' : ''}`}
          onClick={() => {
            setDa(settimanaCorrente[0])
            setA(settimanaCorrente[6])
          }}
        >
          Questa settimana
        </button>
        <button
          type="button"
          className={`chip ${da === settimanaProssima[0] && a === settimanaProssima[6] ? 'attivo' : ''}`}
          onClick={() => {
            setDa(settimanaProssima[0])
            setA(settimanaProssima[6])
          }}
        >
          Prossima settimana
        </button>
        <button
          type="button"
          className={`chip ${da === oggi && a === oggi ? 'attivo' : ''}`}
          onClick={() => {
            setDa(oggi)
            setA(oggi)
          }}
        >
          Solo oggi
        </button>
      </div>

      <div className="riga">
        <label className="campo">
          <span>Dal</span>
          <input type="date" value={da} onChange={(e) => setDa(e.target.value)} />
        </label>
        <label className="campo">
          <span>Al</span>
          <input type="date" value={a} onChange={(e) => setA(e.target.value)} />
        </label>
      </div>

      {!intervalloValido && (
        <div className="avviso errore">La data finale viene prima di quella iniziale.</div>
      )}
    </Modal>
  )
}

function AggiuntaVoce({
  onChiudi,
  onAggiungi,
}: {
  onChiudi: () => void
  onAggiungi: (nome: string, quantita: number, unit: Unit) => void
}) {
  const [nome, setNome] = useState('')
  const [quantita, setQuantita] = useState('')
  const [unit, setUnit] = useState<Unit>('pz')

  return (
    <Modal
      titolo="Aggiungi una voce"
      descrizione="Per quello che non viene dai menu: detersivo, pane, quello che ti viene in mente al supermercato."
      onChiudi={onChiudi}
      azioni={
        <>
          <button type="button" className="bottone secondario" onClick={onChiudi}>
            Annulla
          </button>
          <button
            type="button"
            className="bottone"
            disabled={!nome.trim()}
            onClick={() => onAggiungi(nome, Number(quantita) || 0, unit)}
          >
            Aggiungi
          </button>
        </>
      }
    >
      <label className="campo">
        <span>Cosa</span>
        <input
          type="text"
          value={nome}
          autoFocus
          placeholder="Detersivo piatti"
          onChange={(e) => setNome(e.target.value)}
        />
      </label>
      <div className="riga">
        <label className="campo">
          <span>Quantità (facoltativa)</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            value={quantita}
            placeholder="1"
            onChange={(e) => setQuantita(e.target.value)}
          />
        </label>
        <label className="campo">
          <span>Unità</span>
          <select value={unit} onChange={(e) => setUnit(e.target.value as Unit)}>
            {Object.entries(UNIT_LABELS).map(([valore, etichetta]) => (
              <option key={valore} value={valore}>
                {etichetta}
              </option>
            ))}
          </select>
        </label>
      </div>
    </Modal>
  )
}
