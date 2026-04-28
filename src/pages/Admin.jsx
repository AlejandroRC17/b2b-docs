import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const DOCS = [
  { key: 'solicitud', label: 'Solicitud', icon: '📋' },
  { key: 'ine', label: 'INE', icon: '🪪' },
  { key: 'curp', label: 'CURP', icon: '📄' },
  { key: 'fiscal', label: 'Fiscal', icon: '💼' },
  { key: 'domicilio', label: 'Domicilio', icon: '🏠' },
  { key: 'licencia', label: 'Licencia', icon: '🚗' },
]

const STATUS_COLOR = {
  completado: '#22c55e',
  parcial: '#f59e0b',
  pendiente: '#ef4444',
}

export default function Admin() {
  const [candidatos, setCandidatos] = useState([])
  const [docs, setDocs] = useState({})
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState('todos')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const { data: cands } = await supabase
      .from('candidatos')
      .select('*')
      .order('created_at', { ascending: false })

    const { data: allDocs } = await supabase
      .from('documentos')
      .select('*')

    const docsMap = {}
    allDocs?.forEach(d => {
      if (!docsMap[d.candidato_id]) docsMap[d.candidato_id] = {}
      docsMap[d.candidato_id][d.tipo] = d.url
    })

    setCandidatos(cands || [])
    setDocs(docsMap)
    setLoading(false)
  }

  const filtered = filter === 'todos'
    ? candidatos
    : candidatos.filter(c => c.form_status === filter || c.etapa === filter)

  const stats = {
    total: candidatos.length,
    completado: candidatos.filter(c => c.form_status === 'completado').length,
    parcial: candidatos.filter(c => c.form_status === 'parcial').length,
    pendiente: candidatos.filter(c => !c.form_status || c.form_status === 'pendiente').length,
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={styles.logo}>B2B<span style={{ color: 'var(--accent)' }}>.</span>Admin</div>
          <p style={styles.sub}>Panel de documentos de candidatos</p>
        </div>
        <button style={styles.refreshBtn} onClick={fetchAll}>↻ Actualizar</button>
      </div>

      {/* Stats */}
      <div style={styles.statsRow}>
        {[
          { label: 'Total', value: stats.total, color: '#6366f1' },
          { label: 'Completos', value: stats.completado, color: '#22c55e' },
          { label: 'Parciales', value: stats.parcial, color: '#f59e0b' },
          { label: 'Pendientes', value: stats.pendiente, color: '#ef4444' },
        ].map(s => (
          <div key={s.label} style={{ ...styles.statCard, borderColor: s.color + '44' }}>
            <div style={{ ...styles.statNum, color: s.color }}>{s.value}</div>
            <div style={styles.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={styles.filters}>
        {['todos', 'completado', 'parcial', 'pendiente'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{ ...styles.filterBtn, ...(filter === f ? styles.filterActive : {}) }}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--muted)' }}>Cargando...</div>
      ) : (
        <div style={styles.table}>
          <div style={styles.tableHeader}>
            <span>Candidato</span>
            <span>Ciudad</span>
            <span style={{ textAlign: 'center' }}>Docs</span>
            <span style={{ textAlign: 'center' }}>Estado</span>
            <span></span>
          </div>
          {filtered.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
              Sin candidatos en esta categoría
            </div>
          )}
          {filtered.map(c => {
            const candDocs = docs[c.id] || {}
            const uploaded = DOCS.filter(d => candDocs[d.key]).length
            const status = c.form_status || 'pendiente'
            return (
              <div
                key={c.id}
                style={styles.tableRow}
                onClick={() => setSelected(selected?.id === c.id ? null : c)}
              >
                <div>
                  <div style={styles.name}>{c.nombre || 'Sin nombre'}</div>
                  <div style={styles.phone}>{c.telefono}</div>
                </div>
                <div style={{ color: 'var(--muted)', fontSize: 13 }}>{c.ciudad || '—'}</div>
                <div style={{ textAlign: 'center' }}>
                  <div style={styles.docsProgress}>
                    {DOCS.map(d => (
                      <div
                        key={d.key}
                        title={d.label}
                        style={{
                          ...styles.docDot,
                          background: candDocs[d.key] ? '#22c55e' : 'var(--border)',
                        }}
                      />
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                    {uploaded}/{DOCS.length}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span style={{
                    ...styles.badge,
                    background: (STATUS_COLOR[status] || '#6b6b80') + '18',
                    color: STATUS_COLOR[status] || '#6b6b80',
                  }}>
                    {status}
                  </span>
                </div>
                <div style={{ color: 'var(--muted)', fontSize: 18 }}>
                  {selected?.id === c.id ? '▲' : '▼'}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Detail panel */}
      {selected && (
        <div style={styles.detail}>
          <div style={styles.detailHeader}>
            <div>
              <div style={styles.name}>{selected.nombre}</div>
              <div style={styles.phone}>{selected.telefono} · {selected.ciudad}</div>
            </div>
            <a
              href={`/upload?phone=${selected.telefono}`}
              target="_blank"
              rel="noreferrer"
              style={styles.linkBtn}
            >
              Ver form candidato ↗
            </a>
          </div>
          <div style={styles.docGrid}>
            {DOCS.map(doc => {
              const url = docs[selected.id]?.[doc.key]
              return (
                <div key={doc.key} style={{ ...styles.docItem, ...(url ? styles.docItemDone : {}) }}>
                  <span style={{ fontSize: 20 }}>{doc.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{doc.label}</div>
                    {url ? (
                      <a href={url} target="_blank" rel="noreferrer" style={styles.docLink}>
                        Ver archivo ↗
                      </a>
                    ) : (
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>Pendiente</div>
                    )}
                  </div>
                  <div style={{
                    fontSize: 18,
                    color: url ? 'var(--green)' : 'var(--border)',
                  }}>
                    {url ? '✓' : '○'}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  page: {
    maxWidth: 900, margin: '0 auto',
    padding: '28px 20px 60px',
  },
  header: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 28,
    paddingBottom: 24, borderBottom: '1px solid var(--border)',
  },
  logo: {
    fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800,
    background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
  },
  sub: { color: 'var(--muted)', fontSize: 13, marginTop: 4 },
  refreshBtn: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    color: 'var(--text)', padding: '8px 16px', borderRadius: 8,
    fontSize: 13, fontWeight: 500,
  },
  statsRow: {
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 12, marginBottom: 20,
  },
  statCard: {
    background: 'var(--surface)', border: '1px solid',
    borderRadius: 12, padding: '16px',
    textAlign: 'center',
  },
  statNum: { fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800 },
  statLabel: { color: 'var(--muted)', fontSize: 12, marginTop: 4 },
  filters: { display: 'flex', gap: 8, marginBottom: 16 },
  filterBtn: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    color: 'var(--muted)', padding: '6px 14px', borderRadius: 8,
    fontSize: 13,
  },
  filterActive: {
    background: 'var(--accent)', borderColor: 'var(--accent)',
    color: '#fff',
  },
  table: {
    background: 'var(--surface)', borderRadius: 14,
    border: '1px solid var(--border)', overflow: 'hidden',
  },
  tableHeader: {
    display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 40px',
    padding: '10px 20px',
    borderBottom: '1px solid var(--border)',
    color: 'var(--muted)', fontSize: 12, fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  tableRow: {
    display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 40px',
    padding: '14px 20px', alignItems: 'center',
    borderBottom: '1px solid var(--border)',
    cursor: 'pointer', transition: 'background 0.15s',
  },
  name: { fontWeight: 600, fontSize: 14 },
  phone: { color: 'var(--muted)', fontSize: 12, marginTop: 2 },
  docsProgress: { display: 'flex', gap: 3, justifyContent: 'center' },
  docDot: { width: 8, height: 8, borderRadius: '50%', transition: 'background 0.2s' },
  badge: {
    display: 'inline-block', padding: '3px 10px',
    borderRadius: 99, fontSize: 12, fontWeight: 500,
  },
  detail: {
    marginTop: 16, background: 'var(--surface)',
    borderRadius: 14, border: '1px solid var(--border)',
    padding: 20,
  },
  detailHeader: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
    paddingBottom: 16, borderBottom: '1px solid var(--border)',
  },
  linkBtn: {
    color: 'var(--accent)', fontSize: 13, fontWeight: 500,
    textDecoration: 'none',
    background: 'var(--accent)18', padding: '6px 12px',
    borderRadius: 8,
  },
  docGrid: { display: 'flex', flexDirection: 'column', gap: 8 },
  docItem: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 14px', borderRadius: 10,
    border: '1px solid var(--border)', background: 'var(--surface2)',
  },
  docItemDone: {
    borderColor: '#22c55e44', background: '#22c55e08',
  },
  docLink: {
    color: 'var(--accent)', fontSize: 12,
    textDecoration: 'none', fontWeight: 500,
  },
}
