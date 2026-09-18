import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Modal from './Modal'
import TagChips from './TagChips'
import { useApp } from '../store/appStore'
import { descriviSostituzione, trovaVarianti, type Variante } from '../lib/varianti'
import { formatQuantita } from '../lib/shopping'
import { formatNumber } from '../lib/utils'
import { MEAL_LABELS, type MealKey, type MenuItem } from '../types'

interface Props {
  date: string
  meal: MealKey
  items: MenuItem[]
  onChiudi: () => void
}

/**
 * Varianti proponibili per un pasto, divise fra quelle che rispettano
 * esattamente il piano e quelle che ci arrivano con uno scambio dichiarato.
 */
export default function VariantiModal({ date, meal, items, onChiudi }: Props) {
  const data = useApp((s) => s.data)
  const applicaVariante = useApp((s) => s.applicaVariante)
  const giorno = useApp((s) => s.data?.weeks.flatMap((w) => w.days).find((d) => d.date === date))
  const [aperta, setAperta] = useState<string | null>(null)

  const varianti = useMemo(
    () => (data ? trovaVarianti(data, items, meal) : []),
    [data, items, meal],
  )

  const esatte = varianti.filter((v) => v.tipo === 'esatta')
  const conScambio = varianti.filter((v) => v.tipo === 'sostituzione')
  const applicata = giorno?.appliedVariants?.[meal]
  const ricette = data?.recipes.length ?? 0

  return (
    <Modal
      titolo={`Varianti per ${MEAL_LABELS[meal].toLowerCase()}`}
      descrizione="Ricette che stanno dentro quello che il piano prevede per questo pasto."
      onChiudi={onChiudi}
      azioni={
        <button type="button" className="bottone secondario" onClick={onChiudi}>
          Chiudi
        </button>
      }
    >
      {applicata && (
        <div className="avviso ok" style={{ marginBottom: 14 }}>
          <strong>Variante applicata:</strong>{' '}
          {data?.recipes.find((r) => r.id === applicata)?.name ?? 'ricetta rimossa'}
          <div style={{ marginTop: 10 }}>
            <button
              type="button"
              className="bottone secondario"
              onClick={() => {
                applicaVariante(date, meal, null)
                onChiudi()
              }}
            >
              Torna al piano originale
            </button>
          </div>
        </div>
      )}

      {ricette === 0 && (
        <div className="vuoto" style={{ padding: '20px 0' }}>
          <h3>Nessuna ricetta in archivio</h3>
          <p>Le varianti nascono dalle tue ricette: creane qualcuna e torna qui.</p>
          <Link className="bottone" to="/ricette/nuova">
            Crea una ricetta
          </Link>
        </div>
      )}

      {ricette > 0 && varianti.length === 0 && (
        <div className="vuoto" style={{ padding: '20px 0' }}>
          <h3>Nessuna variante compatibile</h3>
          <p>
            Nessuna delle tue {ricette} ricette rientra nelle grammature di questo pasto. Puoi
            aggiungere degli scambi fra alimenti per allargare le possibilità.
          </p>
          <Link className="bottone secondario" to="/impostazioni/equivalenze">
            Vai alle equivalenze
          </Link>
        </div>
      )}

      {esatte.length > 0 && (
        <>
          <div className="sezione-titolo">Stessi ingredienti</div>
          <div className="pila" style={{ marginBottom: 16 }}>
            {esatte.map((variante) => (
              <SchedaVariante
                key={variante.recipe.id}
                variante={variante}
                aperta={aperta === variante.recipe.id}
                applicata={applicata === variante.recipe.id}
                onApri={() =>
                  setAperta(aperta === variante.recipe.id ? null : variante.recipe.id)
                }
                onApplica={() => {
                  applicaVariante(date, meal, variante.recipe.id)
                  onChiudi()
                }}
              />
            ))}
          </div>
        </>
      )}

      {conScambio.length > 0 && (
        <>
          <div className="sezione-titolo">Con uno scambio</div>
          <div className="pila">
            {conScambio.map((variante) => (
              <SchedaVariante
                key={variante.recipe.id}
                variante={variante}
                aperta={aperta === variante.recipe.id}
                applicata={applicata === variante.recipe.id}
                onApri={() =>
                  setAperta(aperta === variante.recipe.id ? null : variante.recipe.id)
                }
                onApplica={() => {
                  applicaVariante(date, meal, variante.recipe.id)
                  onChiudi()
                }}
              />
            ))}
          </div>
        </>
      )}
    </Modal>
  )
}

function SchedaVariante({
  variante,
  aperta,
  applicata,
  onApri,
  onApplica,
}: {
  variante: Variante
  aperta: boolean
  applicata: boolean
  onApri: () => void
  onApplica: () => void
}) {
  const data = useApp((s) => s.data)
  const { recipe } = variante
  const porzioni = Math.max(1, recipe.servings || 1)

  return (
    <div className="scheda" style={{ padding: 14 }}>
      <button
        type="button"
        onClick={onApri}
        style={{
          display: 'flex',
          width: '100%',
          gap: 12,
          alignItems: 'center',
          background: 'none',
          border: 'none',
          padding: 0,
          color: 'inherit',
          textAlign: 'left',
          cursor: 'pointer',
        }}
      >
        <span style={{ flex: 1, minWidth: 0 }}>
          <strong style={{ display: 'block' }}>{recipe.name}</strong>
          <span className="sottotitolo" style={{ fontSize: 13 }}>
            {recipe.minutes ? `${recipe.minutes} min · ` : ''}
            {recipe.ingredients.length} ingredienti
          </span>
        </span>
        {applicata && <span className="etichetta dispensa">in uso</span>}
        <span className="freccia">{aperta ? '▲' : '▼'}</span>
      </button>

      {variante.sostituzioni.length > 0 && data && (
        <div className="avviso attenzione" style={{ marginTop: 10, padding: '9px 11px' }}>
          {variante.sostituzioni.map((s) => descriviSostituzione(data, s)).join(' · ')}
        </div>
      )}

      {recipe.tags.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <TagChips tags={recipe.tags} />
        </div>
      )}

      {aperta && data && (
        <>
          <div className="sezione-titolo" style={{ marginTop: 14, paddingLeft: 0 }}>
            Ingredienti{porzioni > 1 ? ` (per ${porzioni} porzioni)` : ''}
          </div>
          {recipe.ingredients.map((ingrediente) => {
            const alimento = data.foods.find((f) => f.id === ingrediente.foodId)
            const misura = alimento?.measures.find((m) => m.id === ingrediente.measureId)
            return (
              <div
                key={ingrediente.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '5px 0',
                }}
              >
                <span>{alimento?.name ?? 'Alimento rimosso'}</span>
                <strong style={{ fontWeight: 550 }}>
                  {misura
                    ? `${formatNumber(ingrediente.quantity)} ${misura.label}`
                    : formatQuantita(ingrediente.quantity, alimento?.unit ?? 'g')}
                </strong>
              </div>
            )
          })}

          {recipe.steps.trim() && (
            <>
              <div className="sezione-titolo" style={{ marginTop: 14, paddingLeft: 0 }}>
                Procedimento
              </div>
              <p style={{ whiteSpace: 'pre-wrap', fontSize: 15 }}>{recipe.steps}</p>
            </>
          )}

          <button
            type="button"
            className="bottone pieno"
            style={{ marginTop: 14 }}
            disabled={applicata}
            onClick={onApplica}
          >
            {applicata ? 'Già applicata a questo giorno' : 'Applica a questo giorno'}
          </button>
          <p className="sottotitolo" style={{ marginTop: 8, textAlign: 'center' }}>
            Applicandola, la lista della spesa userà gli ingredienti di questa ricetta.
          </p>
        </>
      )}
    </div>
  )
}
