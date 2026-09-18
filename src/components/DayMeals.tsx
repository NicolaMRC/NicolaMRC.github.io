import { useState } from 'react'
import { giornoDi, useApp } from '../store/appStore'
import VariantiModal from './VariantiModal'
import { descriviQuantita, opzioneScelta, trovaAlimento } from '../lib/menu'
import { ingredientiPerPorzione, trovaVarianti } from '../lib/varianti'
import { formatQuantita } from '../lib/shopping'
import { MEAL_LABELS, type DayMenu, type MealKey } from '../types'

interface Props {
  date: string
  menu: DayMenu
}

/**
 * I pasti di un giorno, con la scelta fra le alternative e l'accesso alle
 * varianti. Quando un pasto ha una variante applicata si mostra quella: è
 * quello che cucinerai davvero, e la spesa la segue.
 */
export default function DayMeals({ date, menu }: Props) {
  const data = useApp((s) => s.data)
  const setDayOption = useApp((s) => s.setDayOption)
  const applicaVariante = useApp((s) => s.applicaVariante)
  const giorno = giornoDi(data, date)
  const [pastoVarianti, setPastoVarianti] = useState<MealKey | null>(null)

  const pastiVisibili = menu.meals.filter((meal) => meal.options.some((o) => o.items.length > 0))

  if (pastiVisibili.length === 0) {
    return <div className="avviso attenzione">Questo menu non ha ancora pasti compilati.</div>
  }

  const pastoAperto = pastoVarianti
    ? pastiVisibili.find((m) => m.key === pastoVarianti)
    : undefined
  const itemsAperti = pastoAperto
    ? (opzioneScelta(pastoAperto, giorno?.chosenOptions?.[pastoAperto.key])?.items ?? [])
    : []

  return (
    <>
      <div className="pila">
        {pastiVisibili.map((meal) => {
          const scelta = opzioneScelta(meal, giorno?.chosenOptions?.[meal.key])
          const alternative = meal.options.filter((o) => o.items.length > 0)
          const varianteId = giorno?.appliedVariants?.[meal.key]
          const ricetta = varianteId ? data?.recipes.find((r) => r.id === varianteId) : undefined
          const quante =
            data && scelta ? trovaVarianti(data, scelta.items, meal.key).length : 0

          return (
            <div key={meal.key} className="scheda">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  marginBottom: 10,
                }}
              >
                <div className="sezione-titolo" style={{ margin: 0, paddingLeft: 0 }}>
                  {MEAL_LABELS[meal.key]}
                </div>
                <button
                  type="button"
                  className="chip"
                  style={{ padding: '5px 11px', fontSize: 12 }}
                  onClick={() => setPastoVarianti(meal.key)}
                >
                  {quante > 0 ? `Varianti · ${quante}` : 'Varianti'}
                </button>
              </div>

              {alternative.length > 1 && !ricetta && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                  {alternative.map((opzione, indice) => {
                    const attiva = scelta?.id === opzione.id
                    return (
                      <button
                        key={opzione.id}
                        type="button"
                        className={`chip ${attiva ? 'attivo' : ''}`}
                        style={{ padding: '6px 12px', fontSize: 13 }}
                        onClick={() => setDayOption(date, meal.key, opzione.id)}
                      >
                        {opzione.name || `Alternativa ${indice + 1}`}
                      </button>
                    )
                  })}
                </div>
              )}

              {ricetta ? (
                <>
                  <div className="avviso ok" style={{ marginBottom: 12, padding: '9px 11px' }}>
                    Variante applicata: <strong>{ricetta.name}</strong>
                  </div>
                  {data &&
                    [...ingredientiPerPorzione(data, ricetta)].map(([foodId, quantita]) => {
                      const alimento = data.foods.find((f) => f.id === foodId)
                      return (
                        <div key={foodId} style={rigaStile}>
                          <span style={{ minWidth: 0 }}>{alimento?.name ?? 'Alimento rimosso'}</span>
                          <strong style={{ flexShrink: 0, fontWeight: 550 }}>
                            {formatQuantita(quantita, alimento?.unit ?? 'g')}
                          </strong>
                        </div>
                      )
                    })}
                  <button
                    type="button"
                    className="bottone secondario pieno"
                    style={{ marginTop: 12, minHeight: 38 }}
                    onClick={() => applicaVariante(date, meal.key, null)}
                  >
                    Torna al piano originale
                  </button>
                </>
              ) : (
                scelta?.items.map((item) => {
                  const alimento = trovaAlimento(data, item.foodId)
                  return (
                    <div key={item.id} style={rigaStile}>
                      <span style={{ minWidth: 0 }}>
                        {alimento?.name ?? (
                          <span style={{ color: 'var(--rosso)' }}>Alimento non più in archivio</span>
                        )}
                      </span>
                      <strong style={{ flexShrink: 0, fontWeight: 550 }}>
                        {descriviQuantita(item, alimento)}
                      </strong>
                    </div>
                  )
                })
              )}
            </div>
          )
        })}
      </div>

      {pastoVarianti && (
        <VariantiModal
          date={date}
          meal={pastoVarianti}
          items={itemsAperti}
          onChiudi={() => setPastoVarianti(null)}
        />
      )}
    </>
  )
}

const rigaStile = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 12,
  padding: '7px 0',
  borderBottom: '1px solid var(--bordo)',
} as const
