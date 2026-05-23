// src/components/Badge.jsx
const CSS_CLASS = {
  'Eingegangen':          's-Eingegangen',
  'Erstgespräch':         's-Erstgespräch',
  'Technisches Gespräch': 's-Technisches-Gespräch',
  'Ausgewählt':           's-Ausgewählt',
  'Abgelehnt':            's-Abgelehnt',
}
export default function Badge({ status }) {
  return (
    <span className={`badge ${CSS_CLASS[status] ?? ''}`}>
      <span className="badge-dot" />
      {status}
    </span>
  )
}
