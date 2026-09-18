import { useApp } from '../store/appStore'
import { descriviQuantita } from '../lib/menu'
import { MEAL_LABELS, type DayMenu } from '../types'

/**
 * I pasti di un menu in archivio, in sola lettura.
 *
 * A differenza della schermata di un giorno, qui le alternative si mostrano
 * tutte: un menu non ha una scelta da ricordare, ce l'ha il giorno a cui
 * viene assegnato.
 */
export default function MenuMeals({ menu }: { menu: DayMenu }) {
  const data = useApp((s) => s.data)
  const pasti = menu.meals.filter((meal) => meal.options.some((o) => o.items.length > 0))

  if (pasti.length === 0) {
    return <div className="avviso attenzione">Questo menu non ha ancora pasti compilati.</div>
  }

  return (
    <div className="pila">
      {pasti.map((meal) => {
        const opzioni = meal.options.filter((o) => o.items.length > 0)
        return (
          <div key={meal.key} className="scheda">
            <div className="sezione-titolo" style={{ paddingLeft: 0 }}>
              {MEAL_LABELS[meal.key]}
            </div>

            {opzioni.map((opzione, indice) => (
              <div key={opzione.id} style={{ marginTop: indice ? 14 : 0 }}>
                {opzioni.length > 1 && (
                  <div className="etichetta" style={{ marginBottom: 8 }}>
                    {opzione.name || `Alternativa ${indice + 1}`}
                  </div>
                )}
                {opzione.items.map((item) => {
                  const alimento = data?.foods.find((f) => f.id === item.foodId)
                  return (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 12,
                        padding: '7px 0',
                        borderBottom: '1px solid var(--bordo)',
                      }}
                    >
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
                })}
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
