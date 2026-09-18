import { useState } from 'react'
import Modal from './Modal'
import { IconaCestino } from './Icons'
import { uid } from '../lib/utils'
import { UNIT_LABELS, type HouseholdMeasure, type Unit } from '../types'

interface Props {
  reparti: { id: string; name: string }[]
  onAnnulla: () => void
  onCrea: (nome: string, aisleId: string, unit: Unit, misure: HouseholdMeasure[]) => void
}

/**
 * Creazione di un alimento senza uscire da quello che si sta facendo.
 *
 * Mentre si compila un menu o una ricetta capita di continuo di incontrare un
 * alimento non ancora in archivio, e perdere il lavoro fatto per andarlo a
 * creare altrove sarebbe inaccettabile.
 */
export default function QuickFoodModal({ reparti, onAnnulla, onCrea }: Props) {
  const [nome, setNome] = useState('')
  const [aisleId, setAisleId] = useState(reparti[0]?.id ?? '')
  const [unit, setUnit] = useState<Unit>('g')
  const [misure, setMisure] = useState<HouseholdMeasure[]>([])

  function aggiornaMisura(id: string, patch: Partial<HouseholdMeasure>) {
    setMisure((precedenti) => precedenti.map((m) => (m.id === id ? { ...m, ...patch } : m)))
  }

  return (
    <Modal
      titolo="Nuovo alimento"
      descrizione="Il minimo indispensabile per usarlo subito. Formato di vendita e note li aggiungi quando vuoi dall'archivio."
      onChiudi={onAnnulla}
      azioni={
        <>
          <button type="button" className="bottone secondario" onClick={onAnnulla}>
            Annulla
          </button>
          <button
            type="button"
            className="bottone"
            disabled={!nome.trim()}
            onClick={() => onCrea(nome, aisleId, unit, misure)}
          >
            Crea e inserisci
          </button>
        </>
      }
    >
      <label className="campo">
        <span>Nome</span>
        <input
          type="text"
          value={nome}
          autoFocus
          placeholder="Petto di pollo"
          onChange={(e) => setNome(e.target.value)}
        />
      </label>
      <div className="riga">
        <label className="campo">
          <span>Reparto</span>
          <select value={aisleId} onChange={(e) => setAisleId(e.target.value)}>
            {reparti.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <label className="campo">
          <span>Unità</span>
          <select value={unit} onChange={(e) => setUnit(e.target.value as Unit)}>
            {Object.entries(UNIT_LABELS).map(([valore, etichetta]) => (
              <option key={valore} value={valore}>
                {etichetta}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="sezione-titolo">Misure casalinghe</div>
      {misure.length === 0 && (
        <p className="sottotitolo" style={{ marginBottom: 10 }}>
          Aggiungile se ti serve scrivere «1 cucchiaio» o «2 fette» invece dei grammi.
        </p>
      )}
      {misure.map((misura) => (
        <div key={misura.id} className="riga" style={{ marginBottom: 10 }}>
          <label className="campo" style={{ marginBottom: 0 }}>
            <span>Nome</span>
            <input
              type="text"
              value={misura.label}
              placeholder="cucchiaio"
              onChange={(e) => aggiornaMisura(misura.id, { label: e.target.value })}
            />
          </label>
          <label className="campo" style={{ marginBottom: 0, maxWidth: 110 }}>
            <span>= quanti {unit}</span>
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
            onClick={() => setMisure(misure.filter((m) => m.id !== misura.id))}
          >
            <IconaCestino />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="bottone secondario pieno"
        onClick={() => setMisure([...misure, { id: uid('mis-'), label: '', amount: 0 }])}
      >
        Aggiungi misura
      </button>
    </Modal>
  )
}
