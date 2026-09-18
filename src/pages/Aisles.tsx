import { useMemo, useState } from 'react'
import Header from '../components/Header'
import Modal from '../components/Modal'
import { IconaCestino } from '../components/Icons'
import { useApp } from '../store/appStore'
import { uid } from '../lib/utils'
import type { Aisle } from '../types'

export default function Aisles() {
  const data = useApp((s) => s.data)
  const mutate = useApp((s) => s.mutate)
  const upsertAisle = useApp((s) => s.upsertAisle)
  const deleteAisle = useApp((s) => s.deleteAisle)
  const [daEliminare, setDaEliminare] = useState<Aisle | null>(null)

  const reparti = useMemo(
    () => [...(data?.aisles ?? [])].sort((a, b) => a.order - b.order),
    [data],
  )

  function sposta(index: number, direzione: -1 | 1) {
    const destinazione = index + direzione
    if (destinazione < 0 || destinazione >= reparti.length) return
    mutate((draft) => {
      const ordinati = [...draft.aisles].sort((a, b) => a.order - b.order)
      const [rimosso] = ordinati.splice(index, 1)
      ordinati.splice(destinazione, 0, rimosso)
      // Si riscrivono tutti gli ordini per evitare valori duplicati nel tempo.
      draft.aisles = ordinati.map((a, i) => ({ ...a, order: (i + 1) * 10 }))
    })
  }

  function quantiAlimenti(aisleId: string): number {
    return data?.foods.filter((f) => f.aisleId === aisleId).length ?? 0
  }

  return (
    <>
      <Header titolo="Reparti" indietro="/impostazioni" />
      <main className="contenuto">
        <div className="avviso ok" style={{ marginBottom: 14 }}>
          L'ordine dei reparti è l'ordine in cui comparirà la lista della spesa: mettili come
          attraversi davvero il supermercato.
        </div>

        <div className="pila">
          {reparti.map((reparto, index) => (
            <div key={reparto.id} className="scheda" style={{ padding: 12 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="text"
                  value={reparto.name}
                  onChange={(e) => upsertAisle({ ...reparto, name: e.target.value })}
                />
                <button
                  type="button"
                  className="bottone-icona"
                  aria-label="Sposta su"
                  disabled={index === 0}
                  style={{ flex: '0 0 auto', opacity: index === 0 ? 0.35 : 1 }}
                  onClick={() => sposta(index, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="bottone-icona"
                  aria-label="Sposta giù"
                  disabled={index === reparti.length - 1}
                  style={{ flex: '0 0 auto', opacity: index === reparti.length - 1 ? 0.35 : 1 }}
                  onClick={() => sposta(index, 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="bottone-icona"
                  aria-label="Elimina reparto"
                  disabled={reparti.length <= 1}
                  style={{ flex: '0 0 auto', opacity: reparti.length <= 1 ? 0.35 : 1 }}
                  onClick={() => setDaEliminare(reparto)}
                >
                  <IconaCestino />
                </button>
              </div>
              <p className="sottotitolo" style={{ marginTop: 8 }}>
                {quantiAlimenti(reparto.id) === 1
                  ? '1 alimento'
                  : `${quantiAlimenti(reparto.id)} alimenti`}
              </p>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="bottone secondario pieno"
          style={{ marginTop: 14 }}
          onClick={() =>
            upsertAisle({
              id: uid('aisle-'),
              name: 'Nuovo reparto',
              order: (reparti.at(-1)?.order ?? 0) + 10,
            })
          }
        >
          Aggiungi reparto
        </button>
      </main>

      {daEliminare && (
        <Modal
          titolo={`Eliminare «${daEliminare.name}»?`}
          descrizione={
            quantiAlimenti(daEliminare.id) > 0
              ? `I ${quantiAlimenti(daEliminare.id)} alimenti di questo reparto verranno spostati nel primo reparto disponibile, non verranno persi.`
              : 'Il reparto non contiene alimenti.'
          }
          onChiudi={() => setDaEliminare(null)}
          azioni={
            <>
              <button type="button" className="bottone secondario" onClick={() => setDaEliminare(null)}>
                Annulla
              </button>
              <button
                type="button"
                className="bottone pericolo"
                onClick={() => {
                  deleteAisle(daEliminare.id)
                  setDaEliminare(null)
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
