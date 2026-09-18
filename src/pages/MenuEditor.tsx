import { useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import Header from '../components/Header'
import Modal from '../components/Modal'
import QuickFoodModal from '../components/QuickFoodModal'
import { IconaCestino } from '../components/Icons'
import { newFood, useApp } from '../store/appStore'
import { byName, nowIso } from '../lib/utils'
import { CATALOGO_TAG } from '../lib/tags'
import { COLORI_MENU, coloreSuggerito } from '../lib/colori'
import {
  descriviQuantita,
  normalizzaMenu,
  nuovaOpzione,
  nuovoElemento,
  nuovoMenu,
  trovaAlimento,
} from '../lib/menu'
import {
  MEAL_LABELS,
  type DayMenu,
  type HouseholdMeasure,
  type MealKey,
  type Unit,
} from '../types'

/** Valore speciale della tendina che apre la creazione rapida di un alimento. */
const NUOVO_ALIMENTO = '__nuovo__'

export default function MenuEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const data = useApp((s) => s.data)
  const upsertMenu = useApp((s) => s.upsertMenu)
  const deleteMenu = useApp((s) => s.deleteMenu)
  const upsertFood = useApp((s) => s.upsertFood)

  const esistente = id ? data?.menus.find((m) => m.id === id) : undefined
  const [form, setForm] = useState<DayMenu>(() =>
    // Un menu nuovo riceve subito un colore: se non lo cambi, uno ce l'ha già.
    esistente ? normalizzaMenu(esistente) : nuovoMenu('', coloreSuggerito(data?.menus ?? [])),
  )
  const [confermaEliminazione, setConfermaEliminazione] = useState(false)
  /** Dove inserire l'alimento che si sta creando al volo. */
  const [creazioneAlimento, setCreazioneAlimento] = useState<
    { meal: MealKey; optionId: string } | null
  >(null)

  const alimenti = useMemo(() => [...(data?.foods ?? [])].sort(byName), [data])
  const reparti = useMemo(
    () => [...(data?.aisles ?? [])].sort((a, b) => a.order - b.order),
    [data],
  )

  if (id && !esistente) return <Navigate to="/menu" replace />

  function aggiornaForm(modifica: (draft: DayMenu) => void) {
    setForm((precedente) => {
      const draft = structuredClone(precedente)
      modifica(draft)
      return draft
    })
  }

  function conOpzione(
    draft: DayMenu,
    meal: MealKey,
    optionId: string,
    azione: (opzione: DayMenu['meals'][number]['options'][number]) => void,
  ) {
    const pasto = draft.meals.find((m) => m.key === meal)
    const opzione = pasto?.options.find((o) => o.id === optionId)
    if (opzione) azione(opzione)
  }

  function aggiungiElemento(meal: MealKey, optionId: string, foodId: string) {
    if (foodId === NUOVO_ALIMENTO) {
      setCreazioneAlimento({ meal, optionId })
      return
    }
    aggiornaForm((draft) => {
      conOpzione(draft, meal, optionId, (o) => o.items.push(nuovoElemento(foodId)))
    })
  }

  function creaAlimentoEInserisci(
    nome: string,
    aisleId: string,
    unit: Unit,
    misure: HouseholdMeasure[],
  ) {
    if (!creazioneAlimento) return
    const alimento = {
      ...newFood(aisleId),
      name: nome.trim(),
      unit,
      measures: misure.filter((m) => m.label.trim() && m.amount > 0),
    }
    upsertFood(alimento)
    aggiornaForm((draft) => {
      conOpzione(draft, creazioneAlimento.meal, creazioneAlimento.optionId, (o) =>
        o.items.push(nuovoElemento(alimento.id)),
      )
    })
    setCreazioneAlimento(null)
  }

  function salva() {
    if (!form.name.trim()) return
    const pulito: DayMenu = {
      ...form,
      name: form.name.trim(),
      notes: form.notes?.trim() || undefined,
      meals: form.meals.map((pasto) => ({
        key: pasto.key,
        // Gli elementi senza quantita' non servono e romperebbero la spesa.
        options: pasto.options
          .map((o) => ({ ...o, items: o.items.filter((i) => i.quantity > 0) }))
          .filter((o, indice) => o.items.length > 0 || indice === 0),
      })),
      updatedAt: nowIso(),
    }
    upsertMenu(pulito)
    navigate(esistente ? `/menu/${esistente.id}` : '/menu')
  }

  const nomeValido = form.name.trim().length > 0

  return (
    <>
      <Header
        titolo={esistente ? 'Modifica menu' : 'Nuovo menu'}
        indietro={esistente ? `/menu/${esistente.id}` : '/menu'}
        azione={
          esistente ? (
            <button
              type="button"
              className="bottone-icona"
              aria-label="Elimina menu"
              onClick={() => setConfermaEliminazione(true)}
            >
              <IconaCestino />
            </button>
          ) : undefined
        }
      />
      <main className="contenuto">
        <div className="scheda">
          <label className="campo" style={{ marginBottom: 0 }}>
            <span>Nome del menu</span>
            <input
              type="text"
              value={form.name}
              autoFocus={!esistente}
              placeholder="Giorno A, Lunedì tipo, Menu pesce…"
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label className="campo" style={{ marginBottom: 0 }}>
            <span>Note</span>
            <textarea
              value={form.notes ?? ''}
              placeholder="Come cucinarlo, cosa ricordarsi, accorgimenti…"
              style={{ minHeight: 72 }}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </label>
        </div>

        <div className="sezione">
          <div className="sezione-titolo">Colore</div>
          <div className="scheda">
            <p className="sottotitolo" style={{ marginBottom: 14 }}>
              Tinge la schermata di oggi e fa riconoscere il menu negli elenchi. Ne è già stato
              scelto uno: cambialo se preferisci.
            </p>
            <div className="palette">
              {COLORI_MENU.map((colore) => {
                const attivo = form.color === colore.id
                return (
                  <button
                    key={colore.id}
                    type="button"
                    className={`pastiglia ${attivo ? 'attiva' : ''}`}
                    aria-label={colore.nome}
                    aria-pressed={attivo}
                    title={colore.nome}
                    style={{ background: `rgb(${colore.rgb})` }}
                    onClick={() => setForm({ ...form, color: colore.id })}
                  />
                )
              })}
            </div>
          </div>
        </div>

        <div className="sezione">
          <div className="sezione-titolo">Tag</div>
          <div className="scheda">
            <p className="sottotitolo" style={{ marginBottom: 18 }}>
              Servono a riconoscere il menu a colpo d'occhio nell'elenco e, dalla prossima tappa, a
              contare le frequenze settimanali. Toccane quanti ne servono.
            </p>
            {CATALOGO_TAG.map((gruppo, indice) => (
              <div
                key={gruppo.titolo}
                style={{ marginBottom: indice === CATALOGO_TAG.length - 1 ? 0 : 18 }}
              >
                <div className="sezione-titolo" style={{ paddingLeft: 0 }}>
                  {gruppo.titolo}
                </div>
                <div className="gruppo-chip">
                  {gruppo.tags.map((tag) => {
                    const attivo = form.tags.includes(tag.id)
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        className={`chip ${attivo ? 'attivo' : ''}`}
                        aria-pressed={attivo}
                        onClick={() =>
                          setForm({
                            ...form,
                            tags: attivo
                              ? form.tags.filter((t) => t !== tag.id)
                              : [...form.tags, tag.id],
                          })
                        }
                      >
                        <span className="chip-emoji">{tag.emoji}</span>
                        {tag.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {form.meals.map((pasto) => (
          <div key={pasto.key} className="sezione">
            <div className="sezione-titolo">{MEAL_LABELS[pasto.key]}</div>
            {pasto.options.map((opzione, indice) => (
              <div key={opzione.id} className="scheda" style={{ marginTop: indice ? 10 : 0 }}>
                {pasto.options.length > 1 && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 12,
                    }}
                  >
                    <input
                      type="text"
                      value={opzione.name ?? ''}
                      placeholder={`Alternativa ${indice + 1}`}
                      onChange={(e) =>
                        aggiornaForm((draft) => {
                          conOpzione(draft, pasto.key, opzione.id, (o) => {
                            o.name = e.target.value || undefined
                          })
                        })
                      }
                    />
                    <button
                      type="button"
                      className="bottone-icona"
                      aria-label="Rimuovi alternativa"
                      style={{ flex: '0 0 auto' }}
                      onClick={() =>
                        aggiornaForm((draft) => {
                          const p = draft.meals.find((m) => m.key === pasto.key)
                          if (p) p.options = p.options.filter((o) => o.id !== opzione.id)
                        })
                      }
                    >
                      <IconaCestino />
                    </button>
                  </div>
                )}

                {opzione.items.map((item) => {
                  const alimento = trovaAlimento(data, item.foodId)
                  return (
                    <div key={item.id} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <select
                          value={item.foodId}
                          onChange={(e) =>
                            aggiornaForm((draft) => {
                              conOpzione(draft, pasto.key, opzione.id, (o) => {
                                const riga = o.items.find((i) => i.id === item.id)
                                if (riga) {
                                  riga.foodId = e.target.value
                                  riga.measureId = undefined
                                }
                              })
                            })
                          }
                        >
                          {alimenti.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="bottone-icona"
                          aria-label="Rimuovi alimento"
                          style={{ flex: '0 0 auto' }}
                          onClick={() =>
                            aggiornaForm((draft) => {
                              conOpzione(draft, pasto.key, opzione.id, (o) => {
                                o.items = o.items.filter((i) => i.id !== item.id)
                              })
                            })
                          }
                        >
                          <IconaCestino />
                        </button>
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          style={{ maxWidth: 110 }}
                          value={item.quantity || ''}
                          placeholder="80"
                          onChange={(e) =>
                            aggiornaForm((draft) => {
                              conOpzione(draft, pasto.key, opzione.id, (o) => {
                                const riga = o.items.find((i) => i.id === item.id)
                                if (riga) riga.quantity = Number(e.target.value)
                              })
                            })
                          }
                        />
                        <select
                          value={item.measureId ?? ''}
                          onChange={(e) =>
                            aggiornaForm((draft) => {
                              conOpzione(draft, pasto.key, opzione.id, (o) => {
                                const riga = o.items.find((i) => i.id === item.id)
                                if (riga) riga.measureId = e.target.value || undefined
                              })
                            })
                          }
                        >
                          <option value="">{alimento?.unit ?? 'g'}</option>
                          {alimento?.measures.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      {item.quantity > 0 && alimento && (
                        <p className="sottotitolo" style={{ marginTop: 6 }}>
                          {descriviQuantita(item, alimento)}
                        </p>
                      )}
                    </div>
                  )
                })}

                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) aggiungiElemento(pasto.key, opzione.id, e.target.value)
                    e.target.value = ''
                  }}
                >
                  <option value="">+ Aggiungi alimento…</option>
                  <option value={NUOVO_ALIMENTO}>➕ Crea un alimento nuovo</option>
                  {alimenti.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}

            <button
              type="button"
              className="bottone secondario pieno"
              style={{ marginTop: 10 }}
              onClick={() =>
                aggiornaForm((draft) => {
                  const p = draft.meals.find((m) => m.key === pasto.key)
                  if (p) p.options.push(nuovaOpzione())
                })
              }
            >
              Aggiungi alternativa a {MEAL_LABELS[pasto.key].toLowerCase()}
            </button>
          </div>
        ))}

        <div style={{ marginTop: 24 }}>
          <button type="button" className="bottone pieno" disabled={!nomeValido} onClick={salva}>
            {esistente ? 'Salva modifiche' : 'Crea menu'}
          </button>
          <p className="sottotitolo" style={{ marginTop: 10, textAlign: 'center' }}>
            Gli alimenti lasciati senza quantità non verranno salvati.
          </p>
        </div>
      </main>

      {creazioneAlimento && (
        <QuickFoodModal
          reparti={reparti}
          onAnnulla={() => setCreazioneAlimento(null)}
          onCrea={creaAlimentoEInserisci}
        />
      )}

      {confermaEliminazione && esistente && (
        <Modal
          titolo={`Eliminare «${esistente.name}»?`}
          descrizione="Il menu verrà rimosso anche dai giorni a cui era assegnato. I giorni resteranno vuoti, pronti per un altro menu."
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
                  deleteMenu(esistente.id)
                  navigate('/menu')
                }}
              >
                Elimina
              </button>
            </>
          }
        />
      )}
    </>
  )
}
