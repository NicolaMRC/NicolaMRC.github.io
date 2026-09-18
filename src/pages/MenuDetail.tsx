import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import Header from '../components/Header'
import MenuMeals from '../components/MenuMeals'
import TagChips from '../components/TagChips'
import RatingStelle from '../components/RatingStelle'
import { IconaCondividi, IconaDuplica, IconaMatita } from '../components/Icons'
import { useApp } from '../store/appStore'
import { notaMenu } from '../lib/menu'
import { testoMenu } from '../lib/giorno'
import { coloreDi, stileMenu } from '../lib/colori'
import { useBarraStato } from '../lib/barraStato'

/**
 * La scheda di un menu in archivio: stessa impaginazione della giornata, ma
 * senza le azioni che hanno senso solo su un giorno preciso.
 */
export default function MenuDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const data = useApp((s) => s.data)
  const impostaRating = useApp((s) => s.impostaRating)
  const duplicateMenu = useApp((s) => s.duplicateMenu)
  const [messaggio, setMessaggio] = useState<string | null>(null)

  const menu = data?.menus.find((m) => m.id === id)
  useBarraStato(coloreDi(menu?.color)?.rgb)

  if (!menu) return <Navigate to="/menu" replace />

  const nota = notaMenu(menu)

  async function condividi() {
    if (!data || !menu) return
    const testo = testoMenu(data, menu)
    try {
      if (navigator.share) {
        await navigator.share({ title: menu.name, text: testo })
        return
      }
      await navigator.clipboard.writeText(testo)
      setMessaggio('Menu copiato negli appunti.')
    } catch {
      setMessaggio(null)
    }
  }

  return (
    <>
      {menu.color && (
        <div key={menu.color} className="gradiente-oggi" style={stileMenu(menu)} aria-hidden="true" />
      )}
      <Header titolo="Menu" indietro="/menu" trasparente={Boolean(menu.color)} />
      <main className="contenuto">
        <h1 className="titolo-eroe">{menu.name}</h1>

        <p
          className={`sottotitolo ${nota.invito ? 'nota-mancante' : ''}`}
          style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}
        >
          {nota.testo}
        </p>

        <div style={{ marginTop: 12, marginLeft: -3 }}>
          <RatingStelle
            valore={menu.rating ?? 0}
            onCambia={(valore) => impostaRating(menu.id, valore)}
          />
        </div>

        {menu.tags.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <TagChips tags={menu.tags} />
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button
            type="button"
            className="bottone"
            style={{ flex: 1 }}
            onClick={() => navigate(`/menu/${menu.id}/modifica`)}
          >
            <IconaMatita />
            Modifica
          </button>
          <button
            type="button"
            className="bottone secondario"
            style={{ flex: '0 0 auto', padding: '0 16px' }}
            aria-label="Condividi il menu"
            title="Condividi il menu"
            onClick={() => void condividi()}
          >
            <IconaCondividi />
          </button>
          <button
            type="button"
            className="bottone secondario"
            style={{ flex: '0 0 auto', padding: '0 16px' }}
            aria-label="Duplica il menu"
            title="Duplica il menu"
            onClick={() => {
              duplicateMenu(menu.id)
              setMessaggio('Copia creata: la trovi nell’elenco dei menu.')
            }}
          >
            <IconaDuplica />
          </button>
        </div>

        {messaggio && (
          <div className="avviso ok" style={{ marginTop: 12 }}>
            {messaggio}
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          <MenuMeals menu={menu} />
        </div>

        <p className="sottotitolo" style={{ marginTop: 14, textAlign: 'center' }}>
          Le alternative sono mostrate tutte: quale fare lo scegli nel giorno a cui assegni il menu.
        </p>
      </main>
    </>
  )
}
