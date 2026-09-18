import { useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import Header from '../components/Header'
import Modal from '../components/Modal'
import QuickFoodModal from '../components/QuickFoodModal'
import { IconaCestino } from '../components/Icons'
import { newFood, useApp } from '../store/appStore'
import { byName, nowIso, uid } from '../lib/utils'
import { descriviQuantita, trovaAlimento } from '../lib/menu'
import { CATALOGO_TAG } from '../lib/tags'
import {
  MEAL_KEYS,
  MEAL_LABELS,
  type HouseholdMeasure,
  type MealKey,
  type Recipe,
  type Unit,
} from '../types'

const NUOVO_ALIMENTO = '__nuovo__'

function ricettaVuota(): Recipe {
  const stamp = nowIso()
  return {
    id: uid('ric-'),
    name: '',
    ingredients: [],
    steps: '',
    servings: 1,
    tags: [],
    suitableFor: [],
    createdAt: stamp,
    updatedAt: stamp,
  }
}

export default function RecipeEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const data = useApp((s) => s.data)
  const upsertRecipe = useApp((s) => s.upsertRecipe)
  const deleteRecipe = useApp((s) => s.deleteRecipe)
  const upsertFood = useApp((s) => s.upsertFood)

  const esistente = id ? data?.recipes.find((r) => r.id === id) : undefined
  const [form, setForm] = useState<Recipe>(() => esistente ?? ricettaVuota())
  const [confermaEliminazione, setConfermaEliminazione] = useState(false)
  const [creazioneAlimento, setCreazioneAlimento] = useState(false)

  const alimenti = useMemo(() => [...(data?.foods ?? [])].sort(byName), [data])
  const reparti = useMemo(
    () => [...(data?.aisles ?? [])].sort((a, b) => a.order - b.order),
    [data],
  )

  if (id && !esistente) return <Navigate to="/ricette" replace />

  function aggiungiIngrediente(foodId: string) {
    if (foodId === NUOVO_ALIMENTO) {
      setCreazioneAlimento(true)
      return
    }
    setForm((precedente) => ({
      ...precedente,
      ingredients: [...precedente.ingredients, { id: uid('ing-'), foodId, quantity: 0 }],
    }))
  }

  function creaAlimentoEInserisci(
    nome: string,
    aisleId: string,
    unit: Unit,
    misure: HouseholdMeasure[],
  ) {
    const alimento = {
      ...newFood(aisleId),
      name: nome.trim(),
      unit,
      measures: misure.filter((m) => m.label.trim() && m.amount > 0),
    }
    upsertFood(alimento)
    setForm((precedente) => ({
      ...precedente,
      ingredients: [
        ...precedente.ingredients,
        { id: uid('ing-'), foodId: alimento.id, quantity: 0 },
      ],
    }))
    setCreazioneAlimento(false)
  }

  function aggiornaIngrediente(
    ingId: string,
    patch: Partial<{ foodId: string; quantity: number; measureId?: string }>,
  ) {
    setForm((precedente) => ({
      ...precedente,
      ingredients: precedente.ingredients.map((i) => (i.id === ingId ? { ...i, ...patch } : i)),
    }))
  }

  function alternaPasto(meal: MealKey) {
    setForm((precedente) => ({
      ...precedente,
      suitableFor: precedente.suitableFor.includes(meal)
        ? precedente.suitableFor.filter((m) => m !== meal)
        : [...precedente.suitableFor, meal],
    }))
  }

  function salva() {
    if (!form.name.trim()) return
    upsertRecipe({
      ...form,
      name: form.name.trim(),
      ingredients: form.ingredients.filter((i) => i.quantity > 0),
      servings: Math.max(1, Math.round(form.servings || 1)),
      updatedAt: nowIso(),
    })
    navigate('/ricette')
  }

  const nomeValido = form.name.trim().length > 0

  return (
    <>
      <Header
        titolo={esistente ? 'Modifica ricetta' : 'Nuova ricetta'}
        indietro="/ricette"
        azione={
          esistente ? (
            <button
              type="button"
              className="bottone-icona"
              aria-label="Elimina ricetta"
              onClick={() => setConfermaEliminazione(true)}
            >
              <IconaCestino />
            </button>
          ) : undefined
        }
      />
      <main className="contenuto">
        <div className="scheda">
          <label className="campo">
            <span>Nome</span>
            <input
              type="text"
              value={form.name}
              autoFocus={!esistente}
              placeholder="Pasta al tonno piccante"
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <div className="riga">
            <label className="campo" style={{ marginBottom: 0 }}>
              <span>Porzioni</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={form.servings || ''}
                onChange={(e) => setForm({ ...form, servings: Number(e.target.value) })}
              />
            </label>
            <label className="campo" style={{ marginBottom: 0 }}>
              <span>Minuti</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="20"
                value={form.minutes ?? ''}
                onChange={(e) =>
                  setForm({ ...form, minutes: e.target.value ? Number(e.target.value) : undefined })
                }
              />
            </label>
          </div>
          <p className="sottotitolo" style={{ marginTop: 10 }}>
            Le porzioni servono al confronto con il piano: gli ingredienti vengono divisi per
            questo numero prima di essere paragonati al pasto.
          </p>
        </div>

        <div className="sezione">
          <div className="sezione-titolo">Per quali pasti</div>
          <div className="scheda">
            <p className="sottotitolo" style={{ marginBottom: 12 }}>
              Lasciandoli tutti spenti la ricetta viene proposta per qualsiasi pasto.
            </p>
            <div className="gruppo-chip">
              {MEAL_KEYS.map((meal) => {
                const attivo = form.suitableFor.includes(meal)
                return (
                  <button
                    key={meal}
                    type="button"
                    className={`chip ${attivo ? 'attivo' : ''}`}
                    aria-pressed={attivo}
                    onClick={() => alternaPasto(meal)}
                  >
                    {MEAL_LABELS[meal]}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="sezione">
          <div className="sezione-titolo">Ingredienti</div>
          <div className="scheda">
            <p className="sottotitolo" style={{ marginBottom: 14 }}>
              Indica le quantità per {form.servings > 1 ? `tutte e ${form.servings} le porzioni` : 'una porzione'}.
            </p>

            {form.ingredients.map((ingrediente) => {
              const alimento = trovaAlimento(data, ingrediente.foodId)
              return (
                <div key={ingrediente.id} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select
                      value={ingrediente.foodId}
                      onChange={(e) =>
                        aggiornaIngrediente(ingrediente.id, {
                          foodId: e.target.value,
                          measureId: undefined,
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
                      aria-label="Rimuovi ingrediente"
                      style={{ flex: '0 0 auto' }}
                      onClick={() =>
                        setForm({
                          ...form,
                          ingredients: form.ingredients.filter((i) => i.id !== ingrediente.id),
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
                      placeholder="80"
                      value={ingrediente.quantity || ''}
                      onChange={(e) =>
                        aggiornaIngrediente(ingrediente.id, { quantity: Number(e.target.value) })
                      }
                    />
                    <select
                      value={ingrediente.measureId ?? ''}
                      onChange={(e) =>
                        aggiornaIngrediente(ingrediente.id, {
                          measureId: e.target.value || undefined,
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
                  {ingrediente.quantity > 0 && alimento && (
                    <p className="sottotitolo" style={{ marginTop: 6 }}>
                      {descriviQuantita(ingrediente, alimento)}
                    </p>
                  )}
                </div>
              )
            })}

            <select
              value=""
              onChange={(e) => {
                if (e.target.value) aggiungiIngrediente(e.target.value)
                e.target.value = ''
              }}
            >
              <option value="">+ Aggiungi ingrediente…</option>
              <option value={NUOVO_ALIMENTO}>➕ Crea un alimento nuovo</option>
              {alimenti.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="sezione">
          <div className="sezione-titolo">Procedimento</div>
          <div className="scheda">
            <textarea
              value={form.steps}
              placeholder="Scrivi i passaggi come preferisci…"
              style={{ minHeight: 140 }}
              onChange={(e) => setForm({ ...form, steps: e.target.value })}
            />
          </div>
        </div>

        <div className="sezione">
          <div className="sezione-titolo">Tag</div>
          <div className="scheda">
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

        <button
          type="button"
          className="bottone pieno"
          style={{ marginTop: 24 }}
          disabled={!nomeValido}
          onClick={salva}
        >
          {esistente ? 'Salva modifiche' : 'Crea ricetta'}
        </button>
        <p className="sottotitolo" style={{ marginTop: 10, textAlign: 'center' }}>
          Gli ingredienti lasciati senza quantità non verranno salvati.
        </p>
      </main>

      {creazioneAlimento && (
        <QuickFoodModal
          reparti={reparti}
          onAnnulla={() => setCreazioneAlimento(false)}
          onCrea={creaAlimentoEInserisci}
        />
      )}

      {confermaEliminazione && esistente && (
        <Modal
          titolo={`Eliminare «${esistente.name}»?`}
          descrizione="La ricetta sparirà dall'archivio e verrà tolta dai giorni in cui l'avevi applicata come variante. I menu del piano non vengono toccati."
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
                  deleteRecipe(esistente.id)
                  navigate('/ricette')
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
