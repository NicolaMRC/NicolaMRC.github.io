import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import Header from '../components/Header'
import Modal from '../components/Modal'
import { IconaCestino } from '../components/Icons'
import { useApp } from '../store/appStore'
import { CIRCONFERENZE, aPercentuale, daPercentuale } from '../lib/misure'
import { nowIso, toIsoDate, uid } from '../lib/utils'
import type { Circumferences, Measurement } from '../types'

function rilevazioneVuota(): Measurement {
  return {
    id: uid('mis-'),
    date: toIsoDate(new Date()),
    type: 'completa',
    circumferences: {},
    createdAt: nowIso(),
  }
}

/** Numero dal campo, oppure undefined quando il campo è vuoto. */
function numero(valore: string): number | undefined {
  if (valore.trim() === '') return undefined
  const n = Number(valore)
  return Number.isFinite(n) ? n : undefined
}

export default function MeasurementEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const data = useApp((s) => s.data)
  const upsertRilevazione = useApp((s) => s.upsertRilevazione)
  const eliminaRilevazione = useApp((s) => s.eliminaRilevazione)

  const esistente = id && id !== 'nuova' ? data?.measurements.find((m) => m.id === id) : undefined
  const [form, setForm] = useState<Measurement>(() => esistente ?? rilevazioneVuota())
  const [confermaEliminazione, setConfermaEliminazione] = useState(false)

  if (id && id !== 'nuova' && !esistente) return <Navigate to="/scheda" replace />

  const completa = form.type === 'completa'

  function aggiorna(patch: Partial<Measurement>) {
    setForm((precedente) => ({ ...precedente, ...patch }))
  }

  function aggiornaCirconferenza(chiave: keyof Circumferences, valore: string) {
    setForm((precedente) => ({
      ...precedente,
      circumferences: { ...precedente.circumferences, [chiave]: numero(valore) },
    }))
  }

  /**
   * Percentuale e chilogrammi si tengono allineati quando il peso è noto:
   * la bilancia dà l'una o gli altri a seconda del modello, e ricalcolare a
   * mano ogni volta sarebbe un invito a sbagliare.
   */
  function aggiornaComposizione(
    campo: 'fat' | 'lean',
    tipo: 'kg' | 'pct',
    valore: string,
  ) {
    const n = numero(valore)
    const peso = form.weightKg
    setForm((precedente) => {
      const patch: Partial<Measurement> = {}
      if (campo === 'fat') {
        if (tipo === 'kg') {
          patch.fatMassKg = n
          if (n !== undefined && peso) patch.fatMassPct = Math.round(aPercentuale(n, peso) * 10) / 10
        } else {
          patch.fatMassPct = n
          if (n !== undefined && peso) patch.fatMassKg = Math.round(daPercentuale(n, peso) * 10) / 10
        }
      } else if (tipo === 'kg') {
        patch.leanMassKg = n
        if (n !== undefined && peso) patch.leanMassPct = Math.round(aPercentuale(n, peso) * 10) / 10
      } else {
        patch.leanMassPct = n
        if (n !== undefined && peso) patch.leanMassKg = Math.round(daPercentuale(n, peso) * 10) / 10
      }
      return { ...precedente, ...patch }
    })
  }

  function salva() {
    upsertRilevazione({ ...form, notes: form.notes?.trim() || undefined })
    navigate('/scheda')
  }

  return (
    <>
      <Header
        titolo={esistente ? 'Modifica rilevazione' : 'Nuova rilevazione'}
        sottotitolo={completa ? 'Completa' : 'Aggiornamento settimanale'}
        indietro="/scheda"
        azione={
          esistente ? (
            <button
              type="button"
              className="bottone-icona"
              aria-label="Elimina rilevazione"
              onClick={() => setConfermaEliminazione(true)}
            >
              <IconaCestino />
            </button>
          ) : undefined
        }
      />
      <main className="contenuto">
        <div className="scheda">
          <div className="riga">
            <label className="campo" style={{ marginBottom: 0 }}>
              <span>Peso (kg)</span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.1"
                placeholder="72,5"
                value={form.weightKg ?? ''}
                onChange={(e) => aggiorna({ weightKg: numero(e.target.value) })}
              />
            </label>
            <label className="campo" style={{ marginBottom: 0 }}>
              <span>Data</span>
              <input
                type="date"
                value={form.date}
                onChange={(e) => aggiorna({ date: e.target.value })}
              />
            </label>
          </div>
        </div>

        {completa ? (
          <>
            <div className="sezione">
              <div className="sezione-titolo">Composizione corporea</div>
              <div className="scheda">
                <p className="sottotitolo" style={{ marginBottom: 14 }}>
                  Inserisci quello che ti dà la bilancia: percentuale o chilogrammi. L'altro valore
                  viene calcolato da solo se il peso è indicato.
                </p>

                <div className="sezione-titolo" style={{ paddingLeft: 0 }}>
                  Massa grassa
                </div>
                <div className="riga" style={{ marginBottom: 16 }}>
                  <label className="campo" style={{ marginBottom: 0 }}>
                    <span>Chilogrammi</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.1"
                      value={form.fatMassKg ?? ''}
                      onChange={(e) => aggiornaComposizione('fat', 'kg', e.target.value)}
                    />
                  </label>
                  <label className="campo" style={{ marginBottom: 0 }}>
                    <span>Percentuale</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={100}
                      step="0.1"
                      value={form.fatMassPct ?? ''}
                      onChange={(e) => aggiornaComposizione('fat', 'pct', e.target.value)}
                    />
                  </label>
                </div>

                <div className="sezione-titolo" style={{ paddingLeft: 0 }}>
                  Massa magra
                </div>
                <div className="riga">
                  <label className="campo" style={{ marginBottom: 0 }}>
                    <span>Chilogrammi</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.1"
                      value={form.leanMassKg ?? ''}
                      onChange={(e) => aggiornaComposizione('lean', 'kg', e.target.value)}
                    />
                  </label>
                  <label className="campo" style={{ marginBottom: 0 }}>
                    <span>Percentuale</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={100}
                      step="0.1"
                      value={form.leanMassPct ?? ''}
                      onChange={(e) => aggiornaComposizione('lean', 'pct', e.target.value)}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="sezione">
              <div className="sezione-titolo">Circonferenze (cm)</div>
              <div className="scheda">
                {CIRCONFERENZE.map(({ chiave, etichetta }) => (
                  <label className="campo" key={chiave}>
                    <span>{etichetta}</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.5"
                      value={form.circumferences?.[chiave] ?? ''}
                      onChange={(e) => aggiornaCirconferenza(chiave, e.target.value)}
                    />
                  </label>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="sezione">
            <div className="scheda">
              <p className="sottotitolo" style={{ marginBottom: 14 }}>
                Questo è un aggiornamento settimanale: registra solo il peso. Se hai appena fatto un
                controllo, puoi trasformarlo in una rilevazione completa.
              </p>
              <button
                type="button"
                className="bottone secondario pieno"
                onClick={() => aggiorna({ type: 'completa' })}
              >
                Aggiungi le misurazioni complete
              </button>
            </div>
          </div>
        )}

        <div className="sezione">
          <label className="campo">
            <span>Note</span>
            <textarea
              value={form.notes ?? ''}
              placeholder="Come ti senti, eventi particolari…"
              onChange={(e) => aggiorna({ notes: e.target.value })}
            />
          </label>
        </div>

        <button type="button" className="bottone pieno" onClick={salva}>
          {esistente ? 'Salva modifiche' : 'Registra'}
        </button>
      </main>

      {confermaEliminazione && esistente && (
        <Modal
          titolo="Eliminare questa rilevazione?"
          descrizione="Sparirà dallo storico e dal grafico del peso."
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
                  eliminaRilevazione(esistente.id)
                  navigate('/scheda')
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
