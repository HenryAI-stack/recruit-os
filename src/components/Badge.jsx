// src/components/Badge.jsx
const CONFIG = {
  'Eingegangen':          { bg: '#E6F1FB', color: '#0C447C', dot: '#378ADD' },
  'Erstgespräch':         { bg: '#FAEEDA', color: '#633806', dot: '#BA7517' },
  'Technisches Gespräch': { bg: '#EEEDFE', color: '#26215C', dot: '#7F77DD' },
  'Ausgewählt':           { bg: '#EAF3DE', color: '#173404', dot: '#639922' },
  'Abgelehnt':            { bg: '#FCEBEB', color: '#501313', dot: '#E24B4A' },
}

export default function Badge({ status }) {
  const cfg = CONFIG[status] ?? { bg: '#f0f0f0', color: '#666', dot: '#999' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 9px', borderRadius: 100,
      background: cfg.bg, color: cfg.color,
      fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, display: 'inline-block' }} />
      {status}
    </span>
  )
}
