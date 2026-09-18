import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import Modal from '../components/Modal'
import { IconaCestino } from '../components/Icons'
import { useApp } from '../store/appStore'
import { byName, nowIso, uid } from '../lib/utils'
import type { EquivalenceGroup } from '../types'

export default function Equivalences() {
  const data = useApp((s) => s.data)
  const upsertGruppo = useApp((s) => s.upsertEquivalenceGroup)
  const deleteGruppo = useApp((s) => s.deleteEquivalenceGroup)
  const [daEliminare, setDaEliminare] = useState<EquivalenceGroup | null>(null)

  const alimenti = useMemo(() => [...(data?.foods ?? [])].sort(byName), [data])
  const gruppi = data?.equivalenceGroups ?? []

  function aggiorna(gruppo: EquivalenceGroup, patch: Partial<EquivalenceGroup>) {
    upsertGruppo({ ...gruppo, ...patch, updatedAt: nowIso() })
  }

  function nuovoGruppo() {
    const stamp = nowIso()
    upsertGruppo({
      id: uid('eq-'),
      name: 'Nuovo scambio',
      members: [],
      createdAt: stamp,
      updatedAt: stamp,
    })
  }

  return (
    <>
      <Header titolo="Equivalenze" indietro="/impostazioni" />
      <main className="contenuto">
        <div className="avviso ok" style={{ marginBottom: 16 }}>
          Sono gli scambi ammessi dal tuo piano: «80 g di pasta valgono 100 g di riso». Servono
          all'app per proporti varianti che sostituiscono un alimento con un altro, senza
          inventarsi nulla.
        </div>

        {alimenti.length === 0 && (
          <div className="avviso attenzione" style={{ marginBottom: 16 }}>
            Prima servono degli alimenti in archivio: uno scambio mette in relazione alimenti che
            esistono già.
            <div style={{ marginTop: 12 }}>
              <Link className="bottone secondario" to="/alimenti/nuovo">
                Aggiungi un alimento
              </Link>
            </div>
          </div>
        )}

        {gruppi.length === 0 && alimenti.length > 0 && (
          <div className="vuoto">
            <h3>Nessuno scambio</h3>
            <p>
              Crea un gruppo per ogni riga di equivalenze del tuo piano: tutti gli alimenti dentro
              un gruppo sono intercambiabili nelle quantità che indichi.
            </p>
            <button type="button" className="bottone" onClick={nuovoGruppo}>
              Crea il primo scambio
            </button>
          </div>
        )}

        <div className="pila">
          {gruppi.map((gruppo) => (
            <div key={gruppo.id} className="scheda">
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
                <input
                  type="text"
                  value={gruppo.name}
                  placeholder="Fonti di carboidrati"
                  onChange={(e) => aggiorna(gruppo, { name: e.target.value })}
                />
                <button
                  type="button"
                  className="bottone-icona"
                  aria-label="Elimina scambio"
                  style={{ flex: '0 0 auto' }}
                  onClick={() => setDaEliminare(gruppo)}
                >
                  <IconaCestino />
                </button>
              </div>

              {gruppo.members.map((membro) => {
                const alimento = data?.foods.find((f) => f.id === membro.foodId)
                return (
                  <div key={membro.id} style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      style={{ maxWidth: 92 }}
                      placeholder="80"
                      value={membro.amount || ''}
                      onChange={(e) =>
                        aggiorna(gruppo, {
                          members: gruppo.members.map((m) =>
                            m.id === membro.id ? { ...m, amount: Number(e.target.value) } : m,
                          ),
                        })
                      }
                    />
                    <span
                      className="sottotitolo"
                      style={{ alignSelf: 'center', flex: '0 0 auto', minWidth: 20 }}
                    >
                      {alimento?.unit ?? 'g'}
                    </span>
                    <select
                      value={membro.foodId}
                      onChange={(e) =>
                        aggiorna(gruppo, {
                          members: gruppo.members.map((m) =>
                            m.id === membro.id ? { ...m, foodId: e.target.value } : m,
                          ),
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
                      aria-label="Rimuovi alimento dallo scambio"
                      style={{ flex: '0 0 auto' }}
                      onClick={() =>
                        aggiorna(gruppo, {
                          members: gruppo.members.filter((m) => m.id !== membro.id),
                        })
                      }
                    >
                      <IconaCestino />
                    </button>
                  </div>
                )
              })}

              {gruppo.members.length < 2 && (
                <p className="sottotitolo" style={{ marginBottom: 10 }}>
                  Servono almeno due alimenti perché lo scambio abbia senso.
                </p>
              )}

              <button
                type="button"
                className="bottone secondario pieno"
                disabled={alimenti.length === 0}
                onClick={() =>
                  aggiorna(gruppo, {
                    members: [
                      ...gruppo.members,
                      { id: uid('mem-'), foodId: alimenti[0].id, amount: 0 },
                    ],
                  })
                }
              >
                Aggiungi alimento allo scambio
              </button>
            </div>
          ))}
        </div>

        {gruppi.length > 0 && (
          <button
            type="button"
            className="bottone secondario pieno"
            style={{ marginTop: 14 }}
            onClick={nuovoGruppo}
          >
            Nuovo scambio
          </button>
        )}
      </main>

      {daEliminare && (
        <Modal
          titolo={`Eliminare «${daEliminare.name}»?`}
          descrizione="Le varianti che si appoggiavano a questo scambio non verranno più proposte. Le varianti già applicate ai giorni restano dove sono."
          onChiudi={() => setDaEliminare(null)}
          azioni={
            <>
              <button
                type="button"
                className="bottone secondario"
                onClick={() => setDaEliminare(null)}
              >
                Annulla
              </button>
              <button
                type="button"
                className="bottone pericolo"
                onClick={() => {
                  deleteGruppo(daEliminare.id)
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
