import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import Modal from '../components/Modal'
import GraficoPeso from '../components/GraficoPeso'
import { IconaFreccia } from '../components/Icons'
import { useApp } from '../store/appStore'
import {
  calcolaBmi,
  formatDelta,
  ordinateDesc,
  ultimaCompleta,
  ultimaRilevazione,
  variazionePeso,
} from '../lib/misure'
import { descriviGiorno, parseIsoDate } from '../lib/date'
import { formatNumber, nowIso, toIsoDate, uid } from '../lib/utils'
import type { Measurement } from '../types'

export default function Profile() {
  const navigate = useNavigate()
  const data = useApp((s) => s.data)
  const upsertRilevazione = useApp((s) => s.upsertRilevazione)
  const [aggiornamentoRapido, setAggiornamentoRapido] = useState(false)

  const misure = data?.measurements ?? []
  const profilo = data?.profile
  const ultima = ultimaRilevazione(misure)
  const completa = ultimaCompleta(misure)
  const bmi = calcolaBmi(ultima?.weightKg, profilo?.heightCm)
  const variazione = variazionePeso(misure)

  return (
    <>
      <Header titolo="Scheda" indietro="/impostazioni" mostraSync />
      <main className="contenuto">
        <button
          type="button"
          className="voce"
          style={{ borderBottom: 'none' }}
          onClick={() => navigate('/scheda/profilo')}
        >
          <div className="voce-testo">
            <div className="voce-titolo">
              {profilo?.name?.trim() || 'I tuoi dati'}
            </div>
            <div className="voce-nota">
              {profilo?.heightCm ? `${formatNumber(profilo.heightCm)} cm` : 'altezza non indicata'}
              {profilo?.targetWeightKg
                ? ` · obiettivo ${formatNumber(profilo.targetWeightKg)} kg`
                : ''}
            </div>
          </div>
          <span className="freccia">
            <IconaFreccia />
          </span>
        </button>

        {misure.length === 0 ? (
          <div className="vuoto">
            <h3>Nessuna rilevazione</h3>
            <p>
              Comincia con una rilevazione completa: peso, massa grassa e magra, circonferenze. Poi
              ti basterà l'aggiornamento settimanale del solo peso.
            </p>
            <button
              type="button"
              className="bottone"
              onClick={() => navigate('/scheda/rilevazione/nuova')}
            >
              Prima rilevazione completa
            </button>
          </div>
        ) : (
          <>
            <div className="scheda" style={{ marginTop: 14 }}>
              <div className="sezione-titolo" style={{ paddingLeft: 0 }}>
                Ultima rilevazione · {descriviGiorno(ultima?.date ?? '')}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                <strong style={{ fontSize: 30, lineHeight: 1.1 }}>
                  {ultima?.weightKg ? `${formatNumber(ultima.weightKg)} kg` : '—'}
                </strong>
                {variazione && (
                  <span
                    className="sottotitolo"
                    style={{
                      color:
                        variazione.delta === 0
                          ? undefined
                          : variazione.delta > 0
                            ? 'var(--ambra)'
                            : 'var(--accento)',
                    }}
                  >
                    {formatDelta(variazione.delta)} dal {descriviGiorno(variazione.da)}
                  </span>
                )}
              </div>
              {bmi && (
                <p className="sottotitolo" style={{ marginTop: 6 }}>
                  Indice di massa corporea {formatNumber(Math.round(bmi * 10) / 10)}
                </p>
              )}

              <div style={{ marginTop: 14 }}>
                <GraficoPeso misure={misure} obiettivo={profilo?.targetWeightKg} />
              </div>
              <p className="sottotitolo" style={{ marginTop: 6, fontSize: 12 }}>
                I punti pieni sono le rilevazioni complete.
                {profilo?.targetWeightKg ? ' La linea tratteggiata è il tuo obiettivo.' : ''}
              </p>
            </div>

            {completa && (
              <div className="scheda" style={{ marginTop: 12 }}>
                <div className="sezione-titolo" style={{ paddingLeft: 0 }}>
                  Ultima completa · {descriviGiorno(completa.date)}
                </div>
                <Composizione misura={completa} />
              </div>
            )}
          </>
        )}

        <div className="sezione pila">
          <button
            type="button"
            className="bottone pieno"
            onClick={() => setAggiornamentoRapido(true)}
          >
            Aggiornamento settimanale
          </button>
          <button
            type="button"
            className="bottone secondario pieno"
            onClick={() => navigate('/scheda/rilevazione/nuova')}
          >
            Nuova rilevazione completa
          </button>
        </div>

        {misure.length > 0 && (
          <div className="sezione">
            <div className="sezione-titolo">Storico</div>
            <div className="elenco">
              {ordinateDesc(misure).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className="voce"
                  onClick={() => navigate(`/scheda/rilevazione/${m.id}`)}
                >
                  <div className="voce-testo">
                    <div className="voce-titolo">
                      {parseIsoDate(m.date).toLocaleDateString('it-IT', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </div>
                    <div className="voce-nota">
                      {m.weightKg ? `${formatNumber(m.weightKg)} kg` : 'peso non indicato'}
                      {m.notes?.trim() ? ` · ${m.notes.trim()}` : ''}
                    </div>
                  </div>
                  {m.type === 'completa' && <span className="etichetta dispensa">completa</span>}
                  <span className="freccia">
                    <IconaFreccia />
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {aggiornamentoRapido && (
        <AggiornamentoRapido
          onChiudi={() => setAggiornamentoRapido(false)}
          onSalva={(peso, note, date) => {
            upsertRilevazione({
              id: uid('mis-'),
              date,
              type: 'rapida',
              weightKg: peso,
              notes: note || undefined,
              createdAt: nowIso(),
            })
            setAggiornamentoRapido(false)
          }}
        />
      )}
    </>
  )
}

function Composizione({ misura }: { misura: Measurement }) {
  const righe: { etichetta: string; valore: string }[] = []
  if (misura.fatMassKg || misura.fatMassPct) {
    righe.push({
      etichetta: 'Massa grassa',
      valore: [
        misura.fatMassKg ? `${formatNumber(misura.fatMassKg)} kg` : null,
        misura.fatMassPct ? `${formatNumber(misura.fatMassPct)} %` : null,
      ]
        .filter(Boolean)
        .join(' · '),
    })
  }
  if (misura.leanMassKg || misura.leanMassPct) {
    righe.push({
      etichetta: 'Massa magra',
      valore: [
        misura.leanMassKg ? `${formatNumber(misura.leanMassKg)} kg` : null,
        misura.leanMassPct ? `${formatNumber(misura.leanMassPct)} %` : null,
      ]
        .filter(Boolean)
        .join(' · '),
    })
  }
  const c = misura.circumferences ?? {}
  const circonferenze: [string, number | undefined][] = [
    ['Vita', c.vita],
    ['Fianchi', c.fianchi],
    ['Torace', c.torace],
    ['Braccio', c.braccio],
    ['Coscia', c.coscia],
  ]
  for (const [etichetta, valore] of circonferenze) {
    if (valore) righe.push({ etichetta, valore: `${formatNumber(valore)} cm` })
  }

  if (righe.length === 0) {
    return <p className="sottotitolo">Nessun dato di composizione registrato.</p>
  }

  return (
    <>
      {righe.map((riga) => (
        <div
          key={riga.etichetta}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            padding: '6px 0',
            borderBottom: '1px solid var(--bordo)',
          }}
        >
          <span className="sottotitolo">{riga.etichetta}</span>
          <strong style={{ fontWeight: 550 }}>{riga.valore}</strong>
        </div>
      ))}
    </>
  )
}

function AggiornamentoRapido({
  onChiudi,
  onSalva,
}: {
  onChiudi: () => void
  onSalva: (peso: number | undefined, note: string, date: string) => void
}) {
  const [peso, setPeso] = useState('')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(toIsoDate(new Date()))

  return (
    <Modal
      titolo="Aggiornamento settimanale"
      descrizione="Due campi, dieci secondi. Le misurazioni complete restano quelle dell'ultimo controllo."
      onChiudi={onChiudi}
      azioni={
        <>
          <button type="button" className="bottone secondario" onClick={onChiudi}>
            Annulla
          </button>
          <button
            type="button"
            className="bottone"
            disabled={!peso}
            onClick={() => onSalva(Number(peso) || undefined, note, date)}
          >
            Registra
          </button>
        </>
      }
    >
      <div className="riga">
        <label className="campo">
          <span>Peso (kg)</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step="0.1"
            autoFocus
            placeholder="72,5"
            value={peso}
            onChange={(e) => setPeso(e.target.value)}
          />
        </label>
        <label className="campo">
          <span>Data</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>
      <label className="campo">
        <span>Note</span>
        <textarea
          value={note}
          placeholder="Come ti senti, eventi particolari…"
          style={{ minHeight: 70 }}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
    </Modal>
  )
}
