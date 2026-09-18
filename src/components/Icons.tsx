/** Icone in linea: nessuna dipendenza esterna, colore ereditato dal testo. */

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export function IconaOggi() {
  return (
    <svg viewBox="0 0 24 24" {...base} aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  )
}

export function IconaAlimenti() {
  return (
    <svg viewBox="0 0 24 24" {...base} aria-hidden="true">
      <path d="M4 8h16l-1.3 11a2 2 0 0 1-2 1.8H7.3a2 2 0 0 1-2-1.8Z" />
      <path d="M9 8a3 3 0 0 1 6 0" />
    </svg>
  )
}

export function IconaImpostazioni() {
  return (
    <svg viewBox="0 0 24 24" {...base} aria-hidden="true">
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 14a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V20a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H4a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H10a1.6 1.6 0 0 0 1-1.5V4a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V10a1.6 1.6 0 0 0 1.5 1H20a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z" />
    </svg>
  )
}

export function IconaFreccia() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...base} aria-hidden="true">
      <path d="m9 6 6 6-6 6" />
    </svg>
  )
}

export function IconaIndietro() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" {...base} aria-hidden="true">
      <path d="m15 6-6 6 6 6" />
    </svg>
  )
}

export function IconaPiu() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" {...base} aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function IconaCestino() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...base} aria-hidden="true">
      <path d="M4 7h16M10 11v6M14 11v6M5 7l1 13a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-13M9 7V4h6v3" />
    </svg>
  )
}

export function IconaSettimana() {
  return (
    <svg viewBox="0 0 24 24" {...base} aria-hidden="true">
      <rect x="3" y="4" width="18" height="17" rx="3" />
      <path d="M3 9h18M9 4v3M15 4v3M8 13h2M14 13h2M8 17h2M14 17h2" />
    </svg>
  )
}

export function IconaMenu() {
  return (
    <svg viewBox="0 0 24 24" {...base} aria-hidden="true">
      <path d="M5 4h14v16a1 1 0 0 1-1.5.9L12 18l-5.5 2.9A1 1 0 0 1 5 20Z" />
      <path d="M9 9h6M9 13h4" />
    </svg>
  )
}

export function IconaSpesa() {
  return (
    <svg viewBox="0 0 24 24" {...base} aria-hidden="true">
      <path d="M3 4h2l2.4 10.4a2 2 0 0 0 2 1.6h7.4a2 2 0 0 0 2-1.5L21 8H6" />
      <circle cx="10" cy="20" r="1.2" />
      <circle cx="17" cy="20" r="1.2" />
    </svg>
  )
}

export function IconaCondividi() {
  return (
    <svg viewBox="0 0 24 24" width="21" height="21" {...base} aria-hidden="true">
      <path d="M12 15V3.5M8.5 7 12 3.5 15.5 7" />
      <path d="M7 11H5.5A1.5 1.5 0 0 0 4 12.5v7A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5v-7A1.5 1.5 0 0 0 18.5 11H17" />
    </svg>
  )
}

export function IconaRicalcola() {
  return (
    <svg viewBox="0 0 24 24" width="21" height="21" {...base} aria-hidden="true">
      <path d="M20.5 12a8.5 8.5 0 1 1-2.6-6.1" />
      <path d="M20.5 3.5V9H15" />
    </svg>
  )
}

export function IconaCalendario() {
  return (
    <svg viewBox="0 0 24 24" width="21" height="21" {...base} aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  )
}
