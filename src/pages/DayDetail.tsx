import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import Header from '../components/Header'
import MenuPicker from '../components/MenuPicker'
import DayMeals from '../components/DayMeals'
import { giornoDi, menuDi, useApp } from '../store/appStore'
import { descriviGiorno } from '../lib/date'

export default function DayDetail() {
  const { date } = useParams()
  const navigate = useNavigate()
  const data = useApp((s) => s.data)
  const setDayMenu = useApp((s) => s.setDayMenu)
  const toggleDaySkipped = useApp((s) => s.toggleDaySkipped)
  const [cambioMenu, setCambioMenu] = useState(false)

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return <Navigate to="/settimana" replace />

  const giorno = giornoDi(data, date)
  const menu = menuDi(data, date)

  return (
    <>
      <Header
        titolo={descriviGiorno(date)}
        sottotitolo={menu?.name}
        indietro="/settimana"
      />
      <main className="contenuto">
        {!menu ? (
          <div className="vuoto">
            <h3>Nessun menu assegnato</h3>
            <p>Scegli quale giornata del tuo piano seguire.</p>
            <button type="button" className="bottone" onClick={() => setCambioMenu(true)}>
              Assegna un menu
            </button>
          </div>
        ) : (
          <>
            {giorno?.skipped && (
              <div className="avviso attenzione" style={{ marginBottom: 14 }}>
                Giorno escluso: non entrerà nella lista della spesa.
              </div>
            )}

            <DayMeals date={date} menu={menu} />

            <div className="sezione pila">
              <button
                type="button"
                className="bottone secondario pieno"
                onClick={() => setCambioMenu(true)}
              >
                Cambia il menu del giorno
              </button>
              <button
                type="button"
                className="bottone secondario pieno"
                onClick={() => navigate(`/menu/${menu.id}`)}
              >
                Modifica «{menu.name}»
              </button>
              <button
                type="button"
                className="bottone secondario pieno"
                onClick={() => toggleDaySkipped(date)}
              >
                {giorno?.skipped ? 'Reintegra questo giorno' : 'Escludi questo giorno'}
              </button>
            </div>

            <p className="sottotitolo" style={{ marginTop: 14, textAlign: 'center' }}>
              Modificando il menu cambi tutti i giorni a cui è assegnato: è la stessa giornata del
              piano, richiamata più volte.
            </p>
          </>
        )}
      </main>

      {cambioMenu && (
        <MenuPicker
          date={date}
          onChiudi={() => setCambioMenu(false)}
          onScegli={(menuId) => {
            setDayMenu(date, menuId)
            setCambioMenu(false)
          }}
        />
      )}
    </>
  )
}
