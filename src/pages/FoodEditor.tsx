import { useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import Header from '../components/Header'
import Modal from '../components/Modal'
import { IconaCestino } from '../components/Icons'
import { newFood, useApp } from '../store/appStore'
import { nowIso, uid } from '../lib/utils'
import { UNIT_LABELS, type Food, type HouseholdMeasure, type Unit } from '../types'

export default function FoodEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const data = useApp((s) => s.data)
  const upsertFood = useApp((s) => s.upsertFood)
  const deleteFood = useApp((s) => s.deleteFood)

  const esistente = id ? data?.foods.find((f) => f.id === id) : undefined
  const repartoPredefinito = data?.aisles[0]?.id ?? ''

  const [form, setForm] = useState<Food>(() => esistente ?? newFood(repartoPredefinito))
  const [confermaEliminazione, setConfermaEliminazione] = useState(false)

  const nomeValido = form.name.trim().length > 0
  const reparti = useMemo(
    () => [...(data?.aisles ?? [])].sort((a, b) => a.order - b.order),
    [data],
  )

  if (id && !esistente) return <Navigate to="/alimenti" replace />

  function aggiorna(patch: Partial<Food>) {
    setForm((precedente) => ({ ...precedente, ...patch }))
  }

  function aggiornaMisura(misuraId: string, patch: Partial<HouseholdMeasure>) {
    setForm((precedente) => ({
      ...precedente,
      measures: precedente.measures.map((m) => (m.id === misuraId ? { ...m, ...patch } : m)),
    }))
  }

  function salva() {
    if (!nomeValido) return
    const pulito: Food = {
      ...form,
      name: form.name.trim(),
      // Le misure senza nome o senza equivalenza non servono a nulla.
      measures: form.measures.filter((m) => m.label.trim() && m.amount > 0),
      updatedAt: nowIso(),
    }
    upsertFood(pulito)
    navigate('/alimenti')
  }

  return (
    <>
      <Header
        titolo={esistente ? 'Modifica alimento' : 'Nuovo alimento'}
        indietro="/alimenti"
        azione={
          esistente ? (
            <button
              type="button"
              className="bottone-icona"
              aria-label="Elimina alimento"
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
              placeholder="Pasta di semola"
              onChange={(e) => aggiorna({ name: e.target.value })}
            />
          </label>

          <div className="riga">
            <label className="campo">
              <span>Reparto</span>
              <select value={form.aisleId} onChange={(e) => aggiorna({ aisleId: e.target.value })}>
                {reparti.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="campo">
              <span>Unità</span>
              <select
                value={form.unit}
                onChange={(e) => aggiorna({ unit: e.target.value as Unit })}
              >
                {Object.entries(UNIT_LABELS).map(([valore, etichetta]) => (
                  <option key={valore} value={valore}>
                    {etichetta}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="sezione">
          <div className="sezione-titolo">Misure casalinghe</div>
          <div className="scheda">
            <p className="sottotitolo" style={{ marginBottom: 14 }}>
              Servono a scrivere «1 cucchiaio» nei menu e ottenere comunque i grammi giusti nella
              lista della spesa.
            </p>
            {form.measures.map((misura) => (
              <div key={misura.id} className="riga" style={{ marginBottom: 12 }}>
                <label className="campo" style={{ marginBottom: 0 }}>
                  <span>Nome</span>
                  <input
                    type="text"
                    value={misura.label}
                    placeholder="cucchiaio"
                    onChange={(e) => aggiornaMisura(misura.id, { label: e.target.value })}
                  />
                </label>
                <label className="campo" style={{ marginBottom: 0, maxWidth: 120 }}>
                  <span>= quanti {form.unit}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    value={misura.amount || ''}
                    onChange={(e) => aggiornaMisura(misura.id, { amount: Number(e.target.value) })}
                  />
                </label>
                <button
                  type="button"
                  className="bottone-icona"
                  aria-label="Rimuovi misura"
                  style={{ flex: '0 0 auto', marginBottom: 1 }}
                  onClick={() =>
                    aggiorna({ measures: form.measures.filter((m) => m.id !== misura.id) })
                  }
                >
                  <IconaCestino />
                </button>
              </div>
            ))}
            <button
              type="button"
              className="bottone secondario pieno"
              onClick={() =>
                aggiorna({
                  measures: [...form.measures, { id: uid('mis-'), label: '', amount: 0 }],
                })
              }
            >
              Aggiungi misura
            </button>
          </div>
        </div>

        <div className="sezione">
          <div className="sezione-titolo">Acquisto</div>
          <div className="scheda">
            <div className="riga">
              <label className="campo">
                <span>Formato di vendita ({form.unit})</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  placeholder="500"
                  value={form.purchaseSize ?? ''}
                  onChange={(e) =>
                    aggiorna({
                      purchaseSize: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                />
              </label>
              <label className="campo">
                <span>Come si chiama</span>
                <input
                  type="text"
                  placeholder="pacco da 500 g"
                  value={form.purchaseLabel ?? ''}
                  onChange={(e) => aggiorna({ purchaseLabel: e.target.value || undefined })}
                />
              </label>
            </div>
            <div className="interruttore">
              <div className="interruttore-testo">
                <strong>Arrotonda al formato</strong>
                <span>Nella lista della spesa chiedi confezioni intere invece dei grammi esatti.</span>
              </div>
              <input
                type="checkbox"
                checked={form.roundToPurchase}
                onChange={(e) => aggiorna({ roundToPurchase: e.target.checked })}
              />
            </div>
            <div className="interruttore">
              <div className="interruttore-testo">
                <strong>Ce l'ho già</strong>
                <span>Sempre in dispensa: non comparirà mai nella lista della spesa.</span>
              </div>
              <input
                type="checkbox"
                checked={form.alwaysInPantry}
                onChange={(e) => aggiorna({ alwaysInPantry: e.target.checked })}
              />
            </div>
          </div>
        </div>

        <div className="sezione">
          <label className="campo">
            <span>Note</span>
            <textarea
              value={form.notes ?? ''}
              placeholder="Marca preferita, dove si trova, alternative…"
              onChange={(e) => aggiorna({ notes: e.target.value || undefined })}
            />
          </label>
        </div>

        <button type="button" className="bottone pieno" disabled={!nomeValido} onClick={salva}>
          {esistente ? 'Salva modifiche' : 'Aggiungi alimento'}
        </button>
      </main>

      {confermaEliminazione && esistente && (
        <Modal
          titolo={`Eliminare «${esistente.name}»?`}
          descrizione="L'alimento sparirà dall'archivio. I menu che lo utilizzano lo segnaleranno come mancante."
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
                  deleteFood(esistente.id)
                  navigate('/alimenti')
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
