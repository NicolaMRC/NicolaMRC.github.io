import { useState } from 'react'
import Header from '../components/Header'
import Modal from '../components/Modal'
import { IconaCestino } from '../components/Icons'
import { useApp } from '../store/appStore'
import { uid } from '../lib/utils'
import { CATALOGO_TAG, definizioneTag } from '../lib/tags'
import { stagioneCorrente } from '../lib/date'
import type { FrequencyRule, SeasonalPreference } from '../types'

const INTENSITA: { valore: SeasonalPreference['strength']; etichetta: string; nota: string }[] = [
  { valore: 'leggera', etichetta: 'Leggera', nota: 'una spinta appena percettibile' },
  { valore: 'media', etichetta: 'Media', nota: 'la stagione si nota, il gradimento comanda ancora' },
  { valore: 'forte', etichetta: 'Forte', nota: 'la stagione domina la scelta' },
]

export default function Rules() {
  const data = useApp((s) => s.data)
  const upsertRegola = useApp((s) => s.upsertRegola)
  const eliminaRegola = useApp((s) => s.eliminaRegola)
  const impostaStagionalita = useApp((s) => s.impostaStagionalita)
  const [nuovaRegola, setNuovaRegola] = useState(false)

  const regole = data?.settings.frequencyRules ?? []
  const stagionale: SeasonalPreference = data?.settings.seasonal ?? {
    enabled: false,
    season: 'auto',
    strength: 'media',
  }
  const stagioneAttiva =
    stagionale.season === 'auto' ? stagioneCorrente() : stagionale.season

  const tagUsati = new Set(regole.map((r) => r.tag))

  function aggiornaStagionale(patch: Partial<SeasonalPreference>) {
    impostaStagionalita({ ...stagionale, ...patch })
  }

  return (
    <>
      <Header titolo="Regole della generazione" indietro="/impostazioni" />
      <main className="contenuto">
        <div className="avviso ok" style={{ marginBottom: 18 }}>
          Queste regole valgono per il pulsante <strong>Genera la settimana</strong>. Assegnare un
          menu a mano resta sempre libero: al massimo il contatore te lo segnala.
        </div>

        <div className="sezione-titolo">Limiti settimanali</div>
        <div className="scheda">
          <p className="sottotitolo" style={{ marginBottom: 14 }}>
            Quante volte al massimo un tag può comparire in una settimana. La generazione li
            rispetta, e sfora solo se non ha alternative — dicendotelo.
          </p>

          {regole.length === 0 && (
            <p className="sottotitolo" style={{ marginBottom: 14 }}>
              Nessun limite impostato: la generazione pesca liberamente.
            </p>
          )}

          <div className="pila">
            {regole.map((regola) => {
              const tag = definizioneTag(regola.tag)
              return (
                <div key={regola.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ flex: 1, minWidth: 0, display: 'flex', gap: 7 }}>
                    <span className="chip-emoji">{tag.emoji}</span>
                    <span
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {tag.label}
                    </span>
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <button
                      type="button"
                      className="bottone-icona"
                      aria-label={`Diminuisci il limite per ${tag.label}`}
                      disabled={regola.timesPerWeek <= 1}
                      style={regola.timesPerWeek <= 1 ? { opacity: 0.35 } : undefined}
                      onClick={() =>
                        upsertRegola({ ...regola, timesPerWeek: regola.timesPerWeek - 1 })
                      }
                    >
                      −
                    </button>
                    <span className="valore" style={{ minWidth: 22, textAlign: 'center' }}>
                      {regola.timesPerWeek}
                    </span>
                    <button
                      type="button"
                      className="bottone-icona"
                      aria-label={`Aumenta il limite per ${tag.label}`}
                      disabled={regola.timesPerWeek >= 7}
                      style={regola.timesPerWeek >= 7 ? { opacity: 0.35 } : undefined}
                      onClick={() =>
                        upsertRegola({ ...regola, timesPerWeek: regola.timesPerWeek + 1 })
                      }
                    >
                      +
                    </button>
                    <button
                      type="button"
                      className="bottone-icona"
                      aria-label={`Elimina il limite per ${tag.label}`}
                      onClick={() => eliminaRegola(regola.id)}
                    >
                      <IconaCestino />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <button
            type="button"
            className="bottone secondario pieno"
            style={{ marginTop: regole.length ? 14 : 0 }}
            onClick={() => setNuovaRegola(true)}
          >
            Aggiungi un limite
          </button>
        </div>

        <div className="sezione">
          <div className="sezione-titolo">Preferenza stagionale</div>
          <div className="scheda">
            <div className="interruttore">
              <div className="interruttore-testo">
                <strong>Favorisci i piatti di stagione</strong>
                <span>
                  I menu con il tag della stagione in corso escono più spesso. Gli altri diventano
                  più rari, ma non vengono mai esclusi.
                </span>
              </div>
              <input
                type="checkbox"
                checked={stagionale.enabled}
                onChange={(e) => aggiornaStagionale({ enabled: e.target.checked })}
              />
            </div>

            {stagionale.enabled && (
              <>
                <div className="sezione-titolo" style={{ marginTop: 16, paddingLeft: 0 }}>
                  Stagione
                </div>
                <div className="gruppo-chip">
                  {(
                    [
                      { valore: 'auto', etichetta: 'Automatica', emoji: '🗓️' },
                      { valore: 'estate', etichetta: 'Estate', emoji: '☀️' },
                      { valore: 'inverno', etichetta: 'Inverno', emoji: '❄️' },
                    ] as const
                  ).map((opzione) => (
                    <button
                      key={opzione.valore}
                      type="button"
                      className={`chip ${stagionale.season === opzione.valore ? 'attivo' : ''}`}
                      aria-pressed={stagionale.season === opzione.valore}
                      onClick={() => aggiornaStagionale({ season: opzione.valore })}
                    >
                      <span className="chip-emoji">{opzione.emoji}</span>
                      {opzione.etichetta}
                    </button>
                  ))}
                </div>
                <p className="sottotitolo" style={{ marginTop: 8 }}>
                  {stagionale.season === 'auto'
                    ? `Da aprile a settembre vale l'estate, negli altri mesi l'inverno. In questo momento: ${stagioneAttiva}.`
                    : `Impostata a mano su ${stagionale.season}.`}
                </p>

                <div className="sezione-titolo" style={{ marginTop: 16, paddingLeft: 0 }}>
                  Intensità
                </div>
                <div className="gruppo-chip">
                  {INTENSITA.map((opzione) => (
                    <button
                      key={opzione.valore}
                      type="button"
                      className={`chip ${stagionale.strength === opzione.valore ? 'attivo' : ''}`}
                      aria-pressed={stagionale.strength === opzione.valore}
                      onClick={() => aggiornaStagionale({ strength: opzione.valore })}
                    >
                      {opzione.etichetta}
                    </button>
                  ))}
                </div>
                <p className="sottotitolo" style={{ marginTop: 8 }}>
                  {INTENSITA.find((i) => i.valore === stagionale.strength)?.nota}
                </p>

                <div className="avviso attenzione" style={{ marginTop: 16 }}>
                  I menu <strong>senza</strong> tag di stagione valgono tutto l'anno: la loro
                  probabilità non cambia mai, qualunque impostazione tu scelga.
                </div>
              </>
            )}
          </div>
        </div>

        <div className="sezione">
          <div className="sezione-titolo">Come pesca la generazione</div>
          <div className="scheda">
            <p className="sottotitolo">
              Prima scarta i menu che sfonderebbero un limite settimanale, poi evita di ripetere lo
              stesso menu, infine pesca dando più probabilità alle stelle alte: 50% alla fascia 4–5
              stelle, 30% a 3, 15% a 2, 5% a 1. Un menu senza voto conta come 3 stelle. La
              preferenza stagionale, se attiva, modula questi pesi.
            </p>
          </div>
        </div>
      </main>

      {nuovaRegola && (
        <SceltaTag
          esclusi={tagUsati}
          onChiudi={() => setNuovaRegola(false)}
          onScegli={(tagId) => {
            const tag = definizioneTag(tagId)
            const regola: FrequencyRule = {
              id: uid('reg-'),
              label: tag.label,
              tag: tagId,
              timesPerWeek: 2,
            }
            upsertRegola(regola)
            setNuovaRegola(false)
          }}
        />
      )}
    </>
  )
}

function SceltaTag({
  esclusi,
  onChiudi,
  onScegli,
}: {
  esclusi: Set<string>
  onChiudi: () => void
  onScegli: (tagId: string) => void
}) {
  return (
    <Modal
      titolo="Su quale tag"
      descrizione="Il limite conta i giorni della settimana in cui compare un menu con questo tag."
      onChiudi={onChiudi}
      azioni={
        <button type="button" className="bottone secondario" onClick={onChiudi}>
          Annulla
        </button>
      }
    >
      {CATALOGO_TAG.map((gruppo) => {
        const disponibili = gruppo.tags.filter((t) => !esclusi.has(t.id))
        if (disponibili.length === 0) return null
        return (
          <div key={gruppo.titolo} style={{ marginBottom: 16 }}>
            <div className="sezione-titolo" style={{ paddingLeft: 0 }}>
              {gruppo.titolo}
            </div>
            <div className="gruppo-chip">
              {disponibili.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  className="chip"
                  onClick={() => onScegli(tag.id)}
                >
                  <span className="chip-emoji">{tag.emoji}</span>
                  {tag.label}
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </Modal>
  )
}
