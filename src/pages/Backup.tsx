import { useState } from 'react'
import Header from '../components/Header'
import Modal from '../components/Modal'
import { useApp } from '../store/appStore'
import { isGithubConfigured, type GithubConfig } from '../store/localConfig'
import { GithubError, verifyAccess, type Version } from '../sync/github'
import { fetchVersions, flushNow, restoreVersion, syncNow } from '../sync/syncEngine'
import { formatWhen } from '../lib/utils'

const PREDEFINITI: GithubConfig = {
  owner: '',
  repo: '',
  path: 'dati/piano-alimentare.json',
  branch: 'main',
  token: '',
}

export default function Backup() {
  const config = useApp((s) => s.config)
  const sync = useApp((s) => s.sync)
  const saveGithubConfig = useApp((s) => s.saveGithubConfig)
  const disconnectGithub = useApp((s) => s.disconnectGithub)

  const attivo = isGithubConfigured(config)
  const [form, setForm] = useState<GithubConfig>(config.github ?? PREDEFINITI)
  const [verifica, setVerifica] = useState<{ stato: 'idle' | 'corso' | 'errore'; messaggio?: string }>(
    { stato: 'idle' },
  )
  const [modifica, setModifica] = useState(!attivo)
  const [versioni, setVersioni] = useState<Version[] | null>(null)
  const [caricamentoVersioni, setCaricamentoVersioni] = useState(false)
  const [daRipristinare, setDaRipristinare] = useState<Version | null>(null)
  const [ripristinoInCorso, setRipristinoInCorso] = useState(false)

  const completo = Boolean(form.owner && form.repo && form.path && form.branch && form.token)

  async function verificaEAttiva() {
    setVerifica({ stato: 'corso' })
    try {
      const esito = await verifyAccess(form)
      if (!esito.private) {
        setVerifica({
          stato: 'errore',
          messaggio:
            'Questo repository è pubblico: chiunque potrebbe leggere i tuoi dati. Usane uno privato.',
        })
        return
      }
      saveGithubConfig(form)
      setVerifica({ stato: 'idle' })
      setModifica(false)
    } catch (err) {
      setVerifica({
        stato: 'errore',
        messaggio: err instanceof GithubError ? err.message : 'Verifica non riuscita.',
      })
    }
  }

  async function caricaVersioni() {
    setCaricamentoVersioni(true)
    try {
      setVersioni(await fetchVersions())
    } catch {
      setVersioni([])
    } finally {
      setCaricamentoVersioni(false)
    }
  }

  async function ripristina(version: Version) {
    setRipristinoInCorso(true)
    try {
      await restoreVersion(version.sha)
      setDaRipristinare(null)
      setVersioni(null)
    } catch {
      setVerifica({ stato: 'errore', messaggio: 'Ripristino non riuscito.' })
    } finally {
      setRipristinoInCorso(false)
    }
  }

  return (
    <>
      <Header titolo="Backup" indietro="/impostazioni" />
      <main className="contenuto">
        {attivo && !modifica && (
          <>
            <div className={`avviso ${sync.status === 'errore' ? 'errore' : 'ok'}`}>
              {sync.status === 'errore' ? (
                <>
                  <strong>Ultimo salvataggio non riuscito.</strong> {sync.message}
                </>
              ) : (
                <>
                  <strong>Backup attivo.</strong> Ultimo salvataggio {formatWhen(config.lastSyncedAt)}.
                </>
              )}
            </div>

            <div className="scheda" style={{ marginTop: 12 }}>
              <p className="sottotitolo">Repository</p>
              <p className="mono" style={{ marginTop: 2 }}>
                {config.github?.owner}/{config.github?.repo}
              </p>
              <p className="sottotitolo" style={{ marginTop: 10 }}>
                File
              </p>
              <p className="mono" style={{ marginTop: 2 }}>
                {config.github?.path} · ramo {config.github?.branch}
              </p>
            </div>

            <div className="pila" style={{ marginTop: 12 }}>
              <button
                type="button"
                className="bottone pieno"
                disabled={sync.status === 'in-corso'}
                onClick={() => void flushNow()}
              >
                {sync.status === 'in-corso' ? 'Salvataggio in corso…' : 'Salva ora'}
              </button>
              <button type="button" className="bottone secondario pieno" onClick={() => void syncNow()}>
                Controlla il cloud
              </button>
            </div>

            <div className="sezione">
              <div className="sezione-titolo">Cronologia delle versioni</div>
              {!versioni && (
                <div className="scheda">
                  <p className="sottotitolo" style={{ marginBottom: 14 }}>
                    Ogni salvataggio è una versione recuperabile: se cancelli qualcosa per sbaglio,
                    torni indietro nel tempo.
                  </p>
                  <button
                    type="button"
                    className="bottone secondario pieno"
                    disabled={caricamentoVersioni}
                    onClick={() => void caricaVersioni()}
                  >
                    {caricamentoVersioni ? 'Lettura…' : 'Mostra le versioni salvate'}
                  </button>
                </div>
              )}
              {versioni && versioni.length === 0 && (
                <div className="scheda">
                  <p className="sottotitolo">Nessuna versione trovata nel repository.</p>
                </div>
              )}
              {versioni && versioni.length > 0 && (
                <div className="elenco">
                  {versioni.map((v) => (
                    <button
                      key={v.sha}
                      type="button"
                      className="voce"
                      onClick={() => setDaRipristinare(v)}
                    >
                      <div className="voce-testo">
                        <div className="voce-titolo">{formatWhen(v.date)}</div>
                        <div className="voce-nota">{v.message}</div>
                      </div>
                      <span className="etichetta">ripristina</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="sezione">
              <button
                type="button"
                className="bottone secondario pieno"
                onClick={() => setModifica(true)}
              >
                Modifica la configurazione
              </button>
              <button
                type="button"
                className="bottone pericolo pieno"
                style={{ marginTop: 10 }}
                onClick={disconnectGithub}
              >
                Disattiva il backup
              </button>
              <p className="sottotitolo" style={{ marginTop: 10 }}>
                Disattivare rimuove il token da questo dispositivo. I dati già salvati nel
                repository restano dove sono.
              </p>
            </div>
          </>
        )}

        {(!attivo || modifica) && (
          <>
            <div className="scheda">
              <h2 style={{ fontSize: 17, marginBottom: 10 }}>Come si prepara, una volta sola</h2>
              <ol className="sottotitolo" style={{ paddingLeft: 20, margin: 0, lineHeight: 1.7 }}>
                <li>
                  Su GitHub crea un repository <strong>privato</strong>, per esempio{' '}
                  <span className="mono">piano-dati</span>. Lascialo vuoto.
                </li>
                <li>
                  Vai in <em>Settings → Developer settings → Personal access tokens → Fine-grained
                  tokens</em> e genera un token.
                </li>
                <li>
                  Limitalo a <strong>quel solo repository</strong> e dagli il permesso{' '}
                  <em>Contents: Read and write</em>. Nient'altro.
                </li>
                <li>Copia il token e incollalo qui sotto: resta solo su questo dispositivo.</li>
              </ol>
            </div>

            <div className="scheda" style={{ marginTop: 12 }}>
              <label className="campo">
                <span>Nome utente GitHub</span>
                <input
                  type="text"
                  autoCapitalize="none"
                  autoCorrect="off"
                  placeholder="mario-rossi"
                  value={form.owner}
                  onChange={(e) => setForm({ ...form, owner: e.target.value.trim() })}
                />
              </label>
              <label className="campo">
                <span>Nome del repository</span>
                <input
                  type="text"
                  autoCapitalize="none"
                  autoCorrect="off"
                  placeholder="piano-dati"
                  value={form.repo}
                  onChange={(e) => setForm({ ...form, repo: e.target.value.trim() })}
                />
              </label>
              <div className="riga">
                <label className="campo">
                  <span>Percorso del file</span>
                  <input
                    type="text"
                    autoCapitalize="none"
                    autoCorrect="off"
                    value={form.path}
                    onChange={(e) => setForm({ ...form, path: e.target.value.trim() })}
                  />
                </label>
                <label className="campo" style={{ maxWidth: 130 }}>
                  <span>Ramo</span>
                  <input
                    type="text"
                    autoCapitalize="none"
                    autoCorrect="off"
                    value={form.branch}
                    onChange={(e) => setForm({ ...form, branch: e.target.value.trim() })}
                  />
                </label>
              </div>
              <label className="campo">
                <span>Token di accesso</span>
                <input
                  type="password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  placeholder="github_pat_…"
                  value={form.token}
                  onChange={(e) => setForm({ ...form, token: e.target.value.trim() })}
                />
              </label>

              {verifica.stato === 'errore' && (
                <div className="avviso errore" style={{ marginBottom: 14 }}>
                  {verifica.messaggio}
                </div>
              )}

              <button
                type="button"
                className="bottone pieno"
                disabled={!completo || verifica.stato === 'corso'}
                onClick={() => void verificaEAttiva()}
              >
                {verifica.stato === 'corso' ? 'Verifica in corso…' : 'Verifica e attiva'}
              </button>
              {attivo && (
                <button
                  type="button"
                  className="bottone secondario pieno"
                  style={{ marginTop: 10 }}
                  onClick={() => {
                    setForm(config.github ?? PREDEFINITI)
                    setVerifica({ stato: 'idle' })
                    setModifica(false)
                  }}
                >
                  Annulla
                </button>
              )}
            </div>

            <div className="avviso attenzione" style={{ marginTop: 12 }}>
              Il token resta memorizzato solo su questo dispositivo e non viene mai incluso nei dati
              caricati. Limitandolo a un unico repository privato, anche nel caso peggiore
              l'esposizione riguarda solo questi dati e nient'altro del tuo account.
            </div>
          </>
        )}
      </main>

      {daRipristinare && (
        <Modal
          titolo="Ripristinare questa versione?"
          descrizione={`I dati attuali verranno sostituiti con quelli salvati ${formatWhen(
            daRipristinare.date,
          )}. Anche la versione di adesso resterà nella cronologia, quindi il passo è reversibile.`}
          onChiudi={() => setDaRipristinare(null)}
          azioni={
            <>
              <button
                type="button"
                className="bottone secondario"
                disabled={ripristinoInCorso}
                onClick={() => setDaRipristinare(null)}
              >
                Annulla
              </button>
              <button
                type="button"
                className="bottone"
                disabled={ripristinoInCorso}
                onClick={() => void ripristina(daRipristinare)}
              >
                {ripristinoInCorso ? 'Ripristino…' : 'Ripristina'}
              </button>
            </>
          }
        />
      )}
    </>
  )
}
