import { NavLink } from 'react-router-dom'
import {
  IconaImpostazioni,
  IconaMenu,
  IconaOggi,
  IconaSettimana,
  IconaSpesa,
} from './Icons'

const voci = [
  { to: '/', label: 'Oggi', Icona: IconaOggi, end: true },
  { to: '/settimana', label: 'Settimana', Icona: IconaSettimana, end: false },
  { to: '/spesa', label: 'Spesa', Icona: IconaSpesa, end: false },
  { to: '/menu', label: 'Menu', Icona: IconaMenu, end: false },
  { to: '/impostazioni', label: 'Altro', Icona: IconaImpostazioni, end: false },
]

export default function BottomNav() {
  return (
    <nav className="nav">
      {voci.map(({ to, label, Icona, end }) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'attivo' : '')}>
          <Icona />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
