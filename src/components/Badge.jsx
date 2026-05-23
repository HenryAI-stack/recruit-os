// src/components/Badge.jsx
import { useT } from '../lib/i18n.jsx'

const CSS_CLASS = {
  'Eingegangen':          's-Eingegangen',
  'Erstgespräch':         's-Erstgespräch',
  'Technisches Gespräch': 's-Technisches-Gespräch',
  'Ausgewählt':           's-Ausgewählt',
  'Abgelehnt':            's-Abgelehnt',
}

export default function Badge({ status }) {
  const { STATUS_DISPLAY } = useT()
  const label = STATUS_DISPLAY?.[status] ?? status
  return (
    <span className={`badge ${CSS_CLASS[status] ?? ''}`}>
      <span className="badge-dot" />
      {label}
    </span>
  )
}
