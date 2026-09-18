import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import { IconaFreccia, IconaPiu } from '../components/Icons'
import TagChips from '../components/TagChips'
import RatingStelle from '../components/RatingStelle'
import { useApp } from '../store/appStore'
import { byName, normalize } from '../lib/utils'
import { riassuntoMenu } from '../lib/menu'
import { stileMenu } from '../lib/colori'

export default function Menus() {
  const navigate = useNavigate()
  const data = useApp((s) => s.data)
  const impostaRating = useApp((s) => s.impostaRating)
  const [ricerca, setRicerca] = useState('')

  const menu = useMemo(() => {
    const tutti = [...(data?.menus ?? [])].sort(byName)
    const termine = normalize(ricerca)
    if (!termine) return tutti
    return tutti.filter(
      (m) =>
        normalize(m.name).includes(termine) ||
        m.tags.some((t) => normalize(t).includes(termine)),
    )
  }, [data, ricerca])

  const totale = data?.menus.length ?? 0

  return (
    <>
      <Header
        titolo="Menu"
        sottotitolo={totale ? `${totale} ${totale === 1 ? 'menu' : 'menu'} in archivio` : undefined}
        mostraSync
        azione={
          <button
            type="button"
            className="bottone-icona"
            aria-label="Nuovo menu"
            onClick={() => navigate('/menu/nuovo')}
          >
            <IconaPiu />
          </button>
        }
      />
      <main className="contenuto">
        {totale > 2 && (
          <div className="cerca">
            <input
              type="text"
              inputMode="search"
              placeholder="Cerca per nome o tag"
              value={ricerca}
              onChange={(e) => setRicerca(e.target.value)}
            />
          </div>
        )}

        {totale === 0 && (
          <div className="vuoto">
            <h3>Nessun menu ancora</h3>
            <p>
              Un menu è una giornata completa del tuo piano. Inseriscili una volta sola: poi li
              assegni ai giorni della settimana quante volte vuoi.
            </p>
            <Link className="bottone" to="/menu/nuovo">
              Crea il primo menu
            </Link>
          </div>
        )}

        {totale > 0 && menu.length === 0 && (
          <div className="vuoto">
            <h3>Nessun risultato</h3>
            <p>Nessun menu corrisponde a «{ricerca}».</p>
          </div>
        )}

        {menu.length > 0 && (
          <div className="elenco">
            {menu.map((m) => (
              <div
                key={m.id}
                className={`voce ${m.color ? 'bagliore-menu' : ''}`}
                style={{ cursor: 'default', ...stileMenu(m) }}
              >
                <div className="voce-testo">
                  <div
                    role="button"
                    tabIndex={0}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/menu/${m.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        navigate(`/menu/${m.id}`)
                      }
                    }}
                  >
                    <div className="voce-titolo">{m.name || 'Senza nome'}</div>
                    <div className="voce-nota">{riassuntoMenu(m)}</div>
                  </div>
                  <div style={{ marginTop: 6, marginLeft: -3 }}>
                    <RatingStelle
                      valore={m.rating ?? 0}
                      onCambia={(valore) => impostaRating(m.id, valore)}
                    />
                  </div>
                  {m.tags.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <TagChips tags={m.tags} />
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className="bottone-icona"
                  style={{ border: 'none', flex: '0 0 auto' }}
                  aria-label={`Apri ${m.name || 'menu'}`}
                  onClick={() => navigate(`/menu/${m.id}`)}
                >
                  <span className="freccia">
                    <IconaFreccia />
                  </span>
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  )
}
