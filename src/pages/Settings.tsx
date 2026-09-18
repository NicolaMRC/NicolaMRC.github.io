import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import { IconaFreccia } from '../components/Icons'
import { useApp } from '../store/appStore'
import { isGithubConfigured } from '../store/localConfig'
import { isStoragePersisted, requestPersistentStorage, storageEstimate } from '../store/db'
import { formatWhen } from '../lib/utils'

function formatoByte(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export default function Settings() {
  const navigate = useNavigate()
  const data = useApp((s) => s.data)
  const config = useApp((s) => s.config)
  const impostaTema = useApp((s) => s.impostaTema)
  const exportToFile = useApp((s) => s.exportToFile)
  const importFromFile = useApp((s) => s.importFromFile)

  const inputFile = useRef<HTMLInputElement>(null)
  const [persistente, setPersistente] = useState<boolean | null>(null)
  const [spazio, setSpazio] = useState<string | null>(null)
  const [esitoImport, setEsitoImport] = useState<string | null>(null)

  useEffect(() => {
    void isStoragePersisted().then(setPersistente)
    void storageEstimate().then((est) => {
      if (est) setSpazio(formatoByte(est.usage))
    })
  }, [])

  async function chiediPersistenza() {
    const ok = await requestPersistentStorage()
    setPersistente(ok)
  }

  async function importa(file: File) {
    setEsitoImport(null)
    try {
      await importFromFile(file)
      setEsitoImport('Dati importati correttamente.')
    } catch {
      setEsitoImport('File non valido: non sembra un backup di questa app.')
    }
  }

  const backupAttivo = isGithubConfigured(config)

  return (
    <>
      <Header titolo="Impostazioni" mostraSync />
      <main className="contenuto">
        <div className="sezione-titolo">Aspetto</div>
        <div className="scheda" style={{ marginBottom: 24 }}>
          <div className="gruppo-chip">
            {(
              [
                { valore: 'auto', etichetta: 'Automatico' },
                { valore: 'chiaro', etichetta: 'Chiaro' },
                { valore: 'scuro', etichetta: 'Scuro' },
              ] as const
            ).map((opzione) => {
              const attivo = (data?.settings.theme ?? 'auto') === opzione.valore
              return (
                <button
                  key={opzione.valore}
                  type="button"
                  className={`chip ${attivo ? 'attivo' : ''}`}
                  aria-pressed={attivo}
                  onClick={() => impostaTema(opzione.valore)}
                >
                  {opzione.etichetta}
                </button>
              )
            })}
          </div>
          <p className="sottotitolo" style={{ marginTop: 10 }}>
            «Automatico» segue l'impostazione del telefono.
          </p>
        </div>

        <div className="sezione-titolo">Persona</div>
        <div className="elenco" style={{ marginBottom: 24 }}>
          <button type="button" className="voce" onClick={() => navigate('/scheda')}>
            <div className="voce-testo">
              <div className="voce-titolo">Scheda personale</div>
              <div className="voce-nota">
                {data?.measurements.length
                  ? `${data.measurements.length} rilevazioni · peso, composizione, circonferenze`
                  : 'Peso, composizione corporea e circonferenze'}
              </div>
            </div>
            <span className="freccia">
              <IconaFreccia />
            </span>
          </button>
        </div>

        <div className="sezione-titolo">Archivi</div>
        <div className="elenco">
          <button type="button" className="voce" onClick={() => navigate('/alimenti')}>
            <div className="voce-testo">
              <div className="voce-titolo">Alimenti</div>
              <div className="voce-nota">
                {data?.foods.length ?? 0} in archivio · base per i menu e per la spesa
              </div>
            </div>
            <span className="freccia">
              <IconaFreccia />
            </span>
          </button>
          <button type="button" className="voce" onClick={() => navigate('/ricette')}>
            <div className="voce-testo">
              <div className="voce-titolo">Ricette</div>
              <div className="voce-nota">
                {data?.recipes.length ?? 0} in archivio · da cui nascono le varianti dei pasti
              </div>
            </div>
            <span className="freccia">
              <IconaFreccia />
            </span>
          </button>
          <button
            type="button"
            className="voce"
            onClick={() => navigate('/impostazioni/equivalenze')}
          >
            <div className="voce-testo">
              <div className="voce-titolo">Equivalenze</div>
              <div className="voce-nota">
                {data?.equivalenceGroups.length ?? 0} scambi · «80 g di pasta valgono 100 g di riso»
              </div>
            </div>
            <span className="freccia">
              <IconaFreccia />
            </span>
          </button>
          <button type="button" className="voce" onClick={() => navigate('/impostazioni/regole')}>
            <div className="voce-testo">
              <div className="voce-titolo">Regole della generazione</div>
              <div className="voce-nota">
                {data?.settings.frequencyRules.length ?? 0} limiti settimanali
                {data?.settings.seasonal?.enabled ? ' · preferenza stagionale attiva' : ''}
              </div>
            </div>
            <span className="freccia">
              <IconaFreccia />
            </span>
          </button>
          <button type="button" className="voce" onClick={() => navigate('/impostazioni/reparti')}>
            <div className="voce-testo">
              <div className="voce-titolo">Reparti del supermercato</div>
              <div className="voce-nota">
                {data?.aisles.length ?? 0} reparti · determinano l'ordine della lista della spesa
              </div>
            </div>
            <span className="freccia">
              <IconaFreccia />
            </span>
          </button>
        </div>

        <div className="sezione-titolo" style={{ marginTop: 24 }}>
          Dati
        </div>
        <div className="elenco">
          <button type="button" className="voce" onClick={() => navigate('/impostazioni/backup')}>
            <div className="voce-testo">
              <div className="voce-titolo">Backup su GitHub</div>
              <div className="voce-nota">
                {backupAttivo
                  ? `Attivo · ultimo salvataggio ${formatWhen(config.lastSyncedAt)}`
                  : 'Non attivo: i dati sono solo su questo dispositivo'}
              </div>
            </div>
            <span className="freccia">
              <IconaFreccia />
            </span>
          </button>
        </div>

        <div className="sezione">
          <div className="sezione-titolo">Copia manuale</div>
          <div className="scheda">
            <p className="sottotitolo" style={{ marginBottom: 14 }}>
              Un file leggibile anche senza l'app, che puoi salvare dove vuoi. Indipendente dal
              backup automatico: è la tua copia, sotto il tuo controllo.
            </p>
            <div className="pila">
              <button type="button" className="bottone secondario pieno" onClick={exportToFile}>
                Esporta i dati in un file
              </button>
              <button
                type="button"
                className="bottone secondario pieno"
                onClick={() => inputFile.current?.click()}
              >
                Importa da un file
              </button>
            </div>
            <input
              ref={inputFile}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void importa(file)
                e.target.value = ''
              }}
            />
            {esitoImport && (
              <div
                className={`avviso ${esitoImport.startsWith('Dati') ? 'ok' : 'errore'}`}
                style={{ marginTop: 14 }}
              >
                {esitoImport}
              </div>
            )}
            <p className="sottotitolo" style={{ marginTop: 14 }}>
              Ultima copia manuale: {formatWhen(data?.settings.lastManualExport)}
            </p>
          </div>
        </div>

        <div className="sezione">
          <div className="sezione-titolo">Spazio sul dispositivo</div>
          <div className="scheda">
            <div className="interruttore">
              <div className="interruttore-testo">
                <strong>Archiviazione persistente</strong>
                <span>
                  {persistente
                    ? 'Attiva: il sistema non cancellerà i dati per liberare spazio.'
                    : 'Non attiva: in caso di spazio esaurito il sistema potrebbe cancellare i dati.'}
                </span>
              </div>
              {!persistente && (
                <button
                  type="button"
                  className="bottone secondario"
                  style={{ flex: '0 0 auto', minHeight: 38 }}
                  onClick={() => void chiediPersistenza()}
                >
                  Attiva
                </button>
              )}
            </div>
            {spazio && (
              <p className="sottotitolo" style={{ marginTop: 12 }}>
                I tuoi dati occupano {spazio}.
              </p>
            )}
            {persistente === false && (
              <div className="avviso attenzione" style={{ marginTop: 12 }}>
                Su iPhone la richiesta viene accolta più facilmente quando l'app è stata aggiunta
                alla schermata Home. Se il pulsante non funziona, installala e riprova.
              </div>
            )}
          </div>
        </div>

        <div className="sezione">
          <div className="sezione-titolo">Questo dispositivo</div>
          <div className="scheda">
            <p className="sottotitolo">
              Nome: {config.deviceName} · Identificativo <span className="mono">{config.deviceId}</span>
            </p>
            <p className="sottotitolo" style={{ marginTop: 6 }}>
              Compare nei messaggi di salvataggio per distinguere le modifiche fatte da dispositivi
              diversi.
            </p>
            <p className="sottotitolo" style={{ marginTop: 10 }}>
              Versione installata: <span className="mono">{__VERSIONE__}</span>. L’app si aggiorna
              da sola: se questa data è vecchia, chiudila del tutto e riaprila.
            </p>
          </div>
        </div>
      </main>
    </>
  )
}
