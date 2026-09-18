import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import { useApp } from '../store/appStore'
import type { Profile } from '../types'

function numero(valore: string): number | undefined {
  if (valore.trim() === '') return undefined
  const n = Number(valore)
  return Number.isFinite(n) ? n : undefined
}

export default function ProfileEdit() {
  const navigate = useNavigate()
  const profilo = useApp((s) => s.data?.profile)
  const aggiornaProfilo = useApp((s) => s.aggiornaProfilo)
  const [form, setForm] = useState<Profile>(() => profilo ?? {})

  function salva() {
    aggiornaProfilo({
      ...form,
      name: form.name?.trim() || undefined,
      notes: form.notes?.trim() || undefined,
    })
    navigate('/scheda')
  }

  return (
    <>
      <Header titolo="I tuoi dati" indietro="/scheda" />
      <main className="contenuto">
        <div className="scheda">
          <label className="campo">
            <span>Nome</span>
            <input
              type="text"
              value={form.name ?? ''}
              placeholder="Come vuoi essere chiamato"
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <div className="riga">
            <label className="campo">
              <span>Altezza (cm)</span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                placeholder="178"
                value={form.heightCm ?? ''}
                onChange={(e) => setForm({ ...form, heightCm: numero(e.target.value) })}
              />
            </label>
            <label className="campo">
              <span>Data di nascita</span>
              <input
                type="date"
                value={form.birthDate ?? ''}
                onChange={(e) => setForm({ ...form, birthDate: e.target.value || undefined })}
              />
            </label>
          </div>
          <label className="campo" style={{ marginBottom: 0 }}>
            <span>Peso obiettivo (kg)</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.1"
              placeholder="70"
              value={form.targetWeightKg ?? ''}
              onChange={(e) => setForm({ ...form, targetWeightKg: numero(e.target.value) })}
            />
          </label>
          <p className="sottotitolo" style={{ marginTop: 10 }}>
            L'altezza serve a calcolare l'indice di massa corporea; l'obiettivo compare come linea
            tratteggiata sul grafico del peso.
          </p>
        </div>

        <div className="sezione">
          <label className="campo">
            <span>Note</span>
            <textarea
              value={form.notes ?? ''}
              placeholder="Indicazioni del nutrizionista, intolleranze, promemoria…"
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </label>
        </div>

        <button type="button" className="bottone pieno" onClick={salva}>
          Salva
        </button>
      </main>
    </>
  )
}
