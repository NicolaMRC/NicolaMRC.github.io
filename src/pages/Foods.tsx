import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import { IconaFreccia, IconaPiu } from '../components/Icons'
import { useApp } from '../store/appStore'
import { byName, formatNumber, normalize } from '../lib/utils'
import type { Food } from '../types'

function descrizioneAlimento(food: Food): string {
  const parti: string[] = []
  if (food.purchaseSize && food.purchaseLabel) parti.push(food.purchaseLabel)
  else if (food.purchaseSize) parti.push(`formato ${formatNumber(food.purchaseSize)} ${food.unit}`)
  if (food.measures.length) {
    parti.push(
      food.measures
        .map((m) => `1 ${m.label} = ${formatNumber(m.amount)} ${food.unit}`)
        .join(' · '),
    )
  }
  if (!parti.length) parti.push(`quantità in ${food.unit}`)
  return parti.join(' · ')
}

export default function Foods() {
  const navigate = useNavigate()
  const data = useApp((s) => s.data)
  const [ricerca, setRicerca] = useState('')

  const gruppi = useMemo(() => {
    if (!data) return []
    const termine = normalize(ricerca)
    const visibili = termine
      ? data.foods.filter((f) => normalize(f.name).includes(termine))
      : data.foods
    const perReparto = [...data.aisles]
      .sort((a, b) => a.order - b.order)
      .map((aisle) => ({
        aisle,
        foods: visibili.filter((f) => f.aisleId === aisle.id).sort(byName),
      }))
      .filter((g) => g.foods.length > 0)

    // Un alimento il cui reparto è stato rimosso non deve sparire dall'elenco.
    const idsNoti = new Set(data.aisles.map((a) => a.id))
    const orfani = visibili.filter((f) => !idsNoti.has(f.aisleId)).sort(byName)
    if (orfani.length) {
      perReparto.push({ aisle: { id: 'orfani', name: 'Senza reparto', order: 999 }, foods: orfani })
    }
    return perReparto
  }, [data, ricerca])

  const totale = data?.foods.length ?? 0

  return (
    <>
      <Header
        titolo="Alimenti"
        sottotitolo={totale ? `${totale} in archivio` : undefined}
        mostraSync
        azione={
          <button
            type="button"
            className="bottone-icona"
            aria-label="Nuovo alimento"
            onClick={() => navigate('/alimenti/nuovo')}
          >
            <IconaPiu />
          </button>
        }
      />
      <main className="contenuto">
        {totale > 0 && (
          <div className="cerca">
            <input
              type="text"
              inputMode="search"
              placeholder="Cerca un alimento"
              value={ricerca}
              onChange={(e) => setRicerca(e.target.value)}
            />
          </div>
        )}

        {totale === 0 && (
          <div className="vuoto">
            <h3>Nessun alimento ancora</h3>
            <p>
              Comincia dagli alimenti che compaiono più spesso nel tuo piano: pasta, pane, pollo,
              olio. Bastano nome e reparto, il resto lo aggiungi quando serve.
            </p>
            <Link className="bottone" to="/alimenti/nuovo">
              Aggiungi il primo alimento
            </Link>
          </div>
        )}

        {totale > 0 && gruppi.length === 0 && (
          <div className="vuoto">
            <h3>Nessun risultato</h3>
            <p>Nessun alimento corrisponde a «{ricerca}».</p>
          </div>
        )}

        {gruppi.map(({ aisle, foods }) => (
          <div key={aisle.id} className="sezione">
            <div className="sezione-titolo">{aisle.name}</div>
            <div className="elenco">
              {foods.map((food) => (
                <button
                  key={food.id}
                  type="button"
                  className="voce"
                  onClick={() => navigate(`/alimenti/${food.id}`)}
                >
                  <div className="voce-testo">
                    <div className="voce-titolo">
                      {food.name}{' '}
                      {food.alwaysInPantry && <span className="etichetta dispensa">in dispensa</span>}
                    </div>
                    <div className="voce-nota">{descrizioneAlimento(food)}</div>
                  </div>
                  <span className="freccia">
                    <IconaFreccia />
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </main>
    </>
  )
}
