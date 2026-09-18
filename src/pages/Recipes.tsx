import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import TagChips from '../components/TagChips'
import { IconaFreccia, IconaPiu } from '../components/Icons'
import { useApp } from '../store/appStore'
import { byName, normalize } from '../lib/utils'
import { MEAL_LABELS, type Recipe } from '../types'

function riassunto(recipe: Recipe): string {
  const parti: string[] = []
  const n = recipe.ingredients.length
  parti.push(`${n} ${n === 1 ? 'ingrediente' : 'ingredienti'}`)
  if (recipe.minutes) parti.push(`${recipe.minutes} min`)
  if (recipe.servings > 1) parti.push(`${recipe.servings} porzioni`)
  if (recipe.suitableFor.length > 0) {
    parti.push(recipe.suitableFor.map((m) => MEAL_LABELS[m].toLowerCase()).join(', '))
  }
  return parti.join(' · ')
}

export default function Recipes() {
  const navigate = useNavigate()
  const data = useApp((s) => s.data)
  const [ricerca, setRicerca] = useState('')

  const ricette = useMemo(() => {
    const tutte = [...(data?.recipes ?? [])].sort(byName)
    const termine = normalize(ricerca)
    if (!termine) return tutte
    return tutte.filter((r) => normalize(r.name).includes(termine))
  }, [data, ricerca])

  const totale = data?.recipes.length ?? 0

  return (
    <>
      <Header
        titolo="Ricette"
        sottotitolo={totale ? `${totale} in archivio` : undefined}
        indietro="/impostazioni"
        azione={
          <button
            type="button"
            className="bottone-icona"
            aria-label="Nuova ricetta"
            onClick={() => navigate('/ricette/nuova')}
          >
            <IconaPiu />
          </button>
        }
      />
      <main className="contenuto">
        {totale > 4 && (
          <div className="cerca">
            <input
              type="text"
              inputMode="search"
              placeholder="Cerca una ricetta"
              value={ricerca}
              onChange={(e) => setRicerca(e.target.value)}
            />
          </div>
        )}

        {totale === 0 && (
          <div className="vuoto">
            <h3>Nessuna ricetta</h3>
            <p>
              Le ricette sono il modo per cucinare diversamente quello che il piano prevede. Quando
              ne hai qualcuna, l'app ti dirà quali stanno dentro le grammature di ogni pasto.
            </p>
            <Link className="bottone" to="/ricette/nuova">
              Crea la prima ricetta
            </Link>
          </div>
        )}

        {totale > 0 && ricette.length === 0 && (
          <div className="vuoto">
            <h3>Nessun risultato</h3>
            <p>Nessuna ricetta corrisponde a «{ricerca}».</p>
          </div>
        )}

        {ricette.length > 0 && (
          <div className="elenco">
            {ricette.map((r) => (
              <button
                key={r.id}
                type="button"
                className="voce"
                onClick={() => navigate(`/ricette/${r.id}`)}
              >
                <div className="voce-testo">
                  <div className="voce-titolo">{r.name}</div>
                  <div className="voce-nota">{riassunto(r)}</div>
                  {r.tags.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <TagChips tags={r.tags} />
                    </div>
                  )}
                </div>
                <span className="freccia">
                  <IconaFreccia />
                </span>
              </button>
            ))}
          </div>
        )}
      </main>
    </>
  )
}
