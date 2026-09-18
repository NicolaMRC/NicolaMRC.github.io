import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import Modal from './components/Modal'
import { useApp } from './store/appStore'
import { resolveConflict } from './sync/syncEngine'
import { formatWhen } from './lib/utils'
import { ridipingiBarraStato } from './lib/barraStato'
import Home from './pages/Home'
import Week from './pages/Week'
import ChooseMenu from './pages/ChooseMenu'
import DayDetail from './pages/DayDetail'
import Menus from './pages/Menus'
import Shopping from './pages/Shopping'
import MenuEditor from './pages/MenuEditor'
import MenuDetail from './pages/MenuDetail'
import Foods from './pages/Foods'
import FoodEditor from './pages/FoodEditor'
import Settings from './pages/Settings'
import Backup from './pages/Backup'
import Aisles from './pages/Aisles'
import Recipes from './pages/Recipes'
import RecipeEditor from './pages/RecipeEditor'
import Equivalences from './pages/Equivalences'
import Rules from './pages/Rules'
import Profile from './pages/Profile'
import ProfileEdit from './pages/ProfileEdit'
import MeasurementEditor from './pages/MeasurementEditor'

/**
 * Avviso di divergenza: compare solo quando sia il dispositivo sia il cloud
 * hanno modifiche successive all'ultimo allineamento. Nessuna delle due copie
 * viene toccata finché l'utente non sceglie.
 */
function ConflictBanner() {
  const conflict = useApp((s) => s.sync.conflict)
  if (!conflict) return null

  return (
    <Modal
      titolo="Due versioni diverse dei tuoi dati"
      descrizione="Questo dispositivo e il cloud sono stati modificati entrambi dopo l'ultimo allineamento. Scegli quale versione tenere: l'altra resta comunque recuperabile dalla cronologia."
      azioni={
        <>
          <button type="button" className="bottone secondario" onClick={() => void resolveConflict('cloud')}>
            Tieni quella del cloud
          </button>
          <button type="button" className="bottone" onClick={() => void resolveConflict('locale')}>
            Tieni questa
          </button>
        </>
      }
    >
      <div className="pila">
        <div className="scheda">
          <strong>Su questo dispositivo</strong>
          <div className="sottotitolo">Ultima modifica {formatWhen(conflict.localUpdatedAt)}</div>
        </div>
        <div className="scheda">
          <strong>Nel cloud</strong>
          <div className="sottotitolo">Ultima modifica {formatWhen(conflict.remoteUpdatedAt)}</div>
        </div>
      </div>
    </Modal>
  )
}

/** Avviso permanente quando l'archivio del browser non è utilizzabile. */
function StorageBanner() {
  const storageError = useApp((s) => s.storageError)
  if (!storageError) return null
  return <div className="barra-errore">{storageError}</div>
}

/**
 * Applica la preferenza di aspetto all'elemento radice. 'auto' rimuove
 * l'attributo e lascia decidere al sistema, come prima della scelta.
 */
function useTema() {
  const tema = useApp((s) => s.data?.settings.theme ?? 'auto')
  useEffect(() => {
    const radice = document.documentElement
    if (tema === 'auto') delete radice.dataset.theme
    else radice.dataset.theme = tema === 'scuro' ? 'dark' : 'light'

    // La barra di stato di iOS segue i colori del tema appena applicato,
    // tenendosi però la tinta del menu se la schermata aperta ne ha una.
    ridipingiBarraStato()
  }, [tema])
}

export default function App() {
  const ready = useApp((s) => s.ready)
  const init = useApp((s) => s.init)
  useTema()

  useEffect(() => {
    void init()
  }, [init])

  if (!ready) {
    return (
      <div className="app">
        <div className="contenuto">
          <div className="vuoto">
            <p>Apertura dei dati…</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/settimana" element={<Week />} />
        <Route path="/scegli/:date" element={<ChooseMenu />} />
        <Route path="/giorno/:date" element={<DayDetail />} />
        <Route path="/spesa" element={<Shopping />} />
        <Route path="/menu" element={<Menus />} />
        <Route path="/menu/nuovo" element={<MenuEditor />} />
        <Route path="/menu/:id" element={<MenuDetail />} />
        <Route path="/menu/:id/modifica" element={<MenuEditor />} />
        <Route path="/alimenti" element={<Foods />} />
        <Route path="/alimenti/nuovo" element={<FoodEditor />} />
        <Route path="/alimenti/:id" element={<FoodEditor />} />
        <Route path="/scheda" element={<Profile />} />
        <Route path="/scheda/profilo" element={<ProfileEdit />} />
        <Route path="/scheda/rilevazione/:id" element={<MeasurementEditor />} />
        <Route path="/ricette" element={<Recipes />} />
        <Route path="/ricette/nuova" element={<RecipeEditor />} />
        <Route path="/ricette/:id" element={<RecipeEditor />} />
        <Route path="/impostazioni" element={<Settings />} />
        <Route path="/impostazioni/equivalenze" element={<Equivalences />} />
        <Route path="/impostazioni/regole" element={<Rules />} />
        <Route path="/impostazioni/backup" element={<Backup />} />
        <Route path="/impostazioni/reparti" element={<Aisles />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <StorageBanner />
      <BottomNav />
      <ConflictBanner />
    </div>
  )
}
