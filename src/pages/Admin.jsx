import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const DOCS = [
  { key: 'solicitud', label: 'Solicitud', icon: '📋' },
  { key: 'ine_frente', label: 'INE Frente', icon: '🪪' },
  { key: 'ine_reverso', label: 'INE Reverso', icon: '🪪' },
  { key: 'curp', label: 'CURP', icon: '📄' },
  { key: 'fiscal', label: 'Fiscal', icon: '💼' },
  { key: 'domicilio', label: 'Domicilio', icon: '🏠' },
  { key: 'licencia_frente', label: 'Licencia Frente', icon: '🚗' },
  { key: 'licencia_reverso', label: 'Licencia Reverso', icon: '🚗' },
  { key: 'toxico', label: 'Toxicológico', icon: '🧪' },
]

const WEBHOOK_URL = 'https://b2blatam.app.n8n.cloud/webhook/3f449a7c-d11c-49b6-a67a-b363db0aa698'
const APP_URL = 'https://b2b-docs-chi.vercel.app'

export default function Admin() {
  const [candidatos, setCandidatos] = useState([])
  const [docs, setDocs] = useState({})
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState('todos')
  const [sending, setSending] = useState({})
  const [sent, setSent] = useState({})

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const { data: cands } = await supabase.from('candidatos').select('*').order('created_at', { ascending: false })
    const { data: allDocs } = await supabase.from('documentos').select('*')
    const docsMap = {}
    allDocs?.forEach(d => {
      if (!docsMap[d.candidato_id]) docsMap[d.candidato_id] = {}
      docsMap[d.candidato_id][d.tipo] = d.url
    })
    setCandidatos(cands || [])
    setDocs(docsMap)
    setLoading(false)
  }

  async function enviarFormulario(c) {
    setSending(p => ({ ...p, [c.id]: true }))
    try {
      await fetch(WEBHOOK_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telefono: c.telefono,
          nombre: c.nombre,
          candidato_id: c.id,
          form_url: `${APP_URL}/upload?phone=${c.telefono}`,
        }),
      })
      setSent(p => ({ ...p, [c.id]: true }))
      await supabase.from('candidatos').update({ form_status: 'pendiente' }).eq('id', c.id)
    } catch (e) {
      alert('Error al enviar: ' + e.message)
    }
    setSending(p => ({ ...p, [c.id]: false }))
  }

  const filtered = filter === 'todos' ? candidatos : candidatos.filter(c => c.form_status === filter)
  const stats = {
    total: candidatos.length,
    completado: candidatos.filter(c => c.form_status === 'completado').length,
    parcial: candidatos.filter(c => c.form_status === 'parcial').length,
    pendiente: candidatos.filter(c => !c.form_status || c.form_status === 'pendiente').length,
  }
  const statusConfig = {
    completado: { color: '#4ade80', bg: 'rgba(74,222,128,0.08)', label: 'Completo' },
    parcial:    { color: '#60a5fa', bg: 'rgba(96,165,250,0.08)', label: 'Parcial' },
    pendiente:  { color: '#94a3b8', bg: 'rgba(148,163,184,0.06)', label: 'Pendiente' },
  }

  return (
    <div style={s.root}>
      <div style={s.gridBg} />
      <div style={s.wrap}>
        <header style={s.header}>
          <div>
            <div style={s.logo}>B2B <span style={s.logoDot}>Latam</span></div>
            <p style={s.logoSub}>Panel de documentos</p>
          </div>
          <button style={s.refreshBtn} onClick={fetchAll}><span>↻</span> Actualizar</button>
        </header>

        <div style={s.statsGrid}>
          {[
            { label: 'Total', value: stats.total, accent: '#e2e8f0' },
            { label: 'Completos', value: stats.completado, accent: '#4ade80' },
            { label: 'Parciales', value: stats.parcial, accent: '#60a5fa' },
            { label: 'Pendientes', value: stats.pendiente, accent: '#94a3b8' },
          ].map(s2 => (
            <div key={s2.label} style={{ ...s.statCard, borderColor: s2.accent + '22' }}>
              <div style={{ ...s.statNum, color: s2.accent }}>{s2.value}</div>
              <div style={s.statLabel}>{s2.label}</div>
              <div style={{ ...s.statBar, background: s2.accent + '15' }}>
                <div style={{ ...s.statBarFill, width: `${stats.total ? (s2.value / stats.total) * 100 : 0}%`, background: s2.accent }} />
              </div>
            </div>
          ))}
        </div>

        <div style={s.filterRow}>
          {['todos', 'completado', 'parcial', 'pendiente'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ ...s.filterBtn, ...(filter === f ? s.filterActive : {}) }}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
          <span style={s.filterCount}>{filtered.length} candidatos</span>
        </div>

        <div style={s.table}>
          <div style={s.tableHead}>
            <span>Candidato</span><span>Ciudad</span>
            <span style={{ textAlign: 'center' }}>Docs</span>
            <span style={{ textAlign: 'center' }}>Estado</span>
            <span></span>
          </div>

          {loading && <div style={s.empty}><div style={s.pulse} /></div>}
          {!loading && filtered.length === 0 && <div style={s.empty}><span style={{ color: '#475569', fontSize: 13 }}>Sin candidatos</span></div>}

          {!loading && filtered.map(c => {
            const candDocs = docs[c.id] || {}
            const uploaded = DOCS.filter(d => candDocs[d.key]).length
            const status = c.form_status || 'pendiente'
            const sc = statusConfig[status] || statusConfig.pendiente
            const isOpen = selected?.id === c.id
            const isSending = sending[c.id]
            const wasSent = sent[c.id]

            return (
              <div key={c.id}>
                <div style={{ ...s.row, ...(isOpen ? s.rowOpen : {}) }} onClick={() => setSelected(isOpen ? null : c)}>
                  <div style={s.candidateCell}>
                    <div style={s.avatar}>{(c.nombre || 'C').charAt(0).toUpperCase()}</div>
                    <div>
                      <div style={s.name}>{c.nombre || 'Sin nombre'}</div>
                      <div style={s.phone}>{c.telefono}</div>
                    </div>
                  </div>
                  <div style={s.ciudad}>{c.ciudad || '—'}</div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={s.dotsLabel}>{uploaded}/{DOCS.length}</div>
                    <div style={{ ...s.progressMini }}>
                      <div style={{ ...s.progressMiniFill, width: `${(uploaded/DOCS.length)*100}%` }} />
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ ...s.badge, color: sc.color, background: sc.bg }}>{sc.label}</span>
                  </div>
                  <div style={s.chevron}>{isOpen ? '▲' : '▼'}</div>
                </div>

                {isOpen && (
                  <div style={s.detail}>
                    <div style={s.detailTop}>
                      <div>
                        <div style={s.name}>{c.nombre}</div>
                        <div style={s.phone}>{c.telefono} · {c.ciudad}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); enviarFormulario(c) }}
                          disabled={isSending || wasSent}
                          style={{ ...s.waBtn, ...(wasSent ? s.waBtnSent : {}) }}
                        >
                          {isSending ? '⏳ Enviando...' : wasSent ? '✓ Enviado' : '📲 Enviar formulario'}
                        </button>
                        <a href={`/upload?phone=${c.telefono}`} target="_blank" rel="noreferrer" style={s.viewLink}>Ver form ↗</a>
                      </div>
                    </div>
                    <div style={s.docsList}>
                      {DOCS.map(doc => {
                        const url = candDocs[doc.key]
                        return (
                          <div key={doc.key} style={{ ...s.docItem, ...(url ? s.docDone : {}) }}>
                            <span style={{ fontSize: 14 }}>{doc.icon}</span>
                            <span style={{ flex: 1, fontSize: 12, color: url ? '#e2e8f0' : '#64748b' }}>{doc.label}</span>
                            {url
                              ? <a href={url} target="_blank" rel="noreferrer" style={s.docLink}>Ver ↗</a>
                              : <span style={{ fontSize: 11, color: '#334155' }}>Pendiente</span>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const s = {
  root: { minHeight: '100vh', background: '#070b14', position: 'relative', overflow: 'hidden' },
  gridBg: { position: 'fixed', inset: 0, zIndex: 0, backgroundImage: `linear-gradient(rgba(30,58,138,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(30,58,138,0.06) 1px, transparent 1px)`, backgroundSize: '40px 40px', pointerEvents: 'none' },
  wrap: { position: 'relative', zIndex: 1, maxWidth: 960, margin: '0 auto', padding: '36px 24px 80px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36, paddingBottom: 28, borderBottom: '1px solid rgba(30,58,138,0.25)' },
  logo: { fontFamily: "'Outfit', sans-serif", fontSize: 22, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.5px' },
  logoDot: { color: '#3b82f6' },
  logoSub: { color: '#475569', fontSize: 12, marginTop: 4, fontFamily: "'Outfit', sans-serif", letterSpacing: '0.05em', textTransform: 'uppercase' },
  refreshBtn: { display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(30,58,138,0.15)', border: '1px solid rgba(59,130,246,0.2)', color: '#60a5fa', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontFamily: "'Outfit', sans-serif", cursor: 'pointer' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 },
  statCard: { background: 'rgba(15,23,42,0.8)', border: '1px solid', borderRadius: 12, padding: '20px 18px', backdropFilter: 'blur(10px)' },
  statNum: { fontFamily: "'Outfit', sans-serif", fontSize: 36, fontWeight: 700, lineHeight: 1, marginBottom: 6 },
  statLabel: { color: '#475569', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Outfit', sans-serif", marginBottom: 12 },
  statBar: { height: 3, borderRadius: 99, overflow: 'hidden' },
  statBarFill: { height: '100%', borderRadius: 99, transition: 'width 0.6s ease' },
  filterRow: { display: 'flex', gap: 6, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' },
  filterBtn: { background: 'transparent', border: '1px solid rgba(30,58,138,0.2)', color: '#475569', padding: '6px 14px', borderRadius: 6, fontSize: 12, fontFamily: "'Outfit', sans-serif", cursor: 'pointer', letterSpacing: '0.03em' },
  filterActive: { background: 'rgba(59,130,246,0.12)', borderColor: 'rgba(59,130,246,0.4)', color: '#93c5fd' },
  filterCount: { marginLeft: 'auto', color: '#334155', fontSize: 12, fontFamily: "'Outfit', sans-serif" },
  table: { background: 'rgba(10,16,30,0.7)', border: '1px solid rgba(30,58,138,0.2)', borderRadius: 14, overflow: 'hidden', backdropFilter: 'blur(20px)' },
  tableHead: { display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 1fr 36px', padding: '10px 20px', borderBottom: '1px solid rgba(30,58,138,0.15)', color: '#334155', fontSize: 11, fontFamily: "'Outfit', sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase' },
  row: { display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 1fr 36px', padding: '14px 20px', alignItems: 'center', borderBottom: '1px solid rgba(15,23,42,0.6)', cursor: 'pointer', transition: 'background 0.15s' },
  rowOpen: { background: 'rgba(30,58,138,0.06)', borderBottom: '1px solid rgba(30,58,138,0.15)' },
  candidateCell: { display: 'flex', alignItems: 'center', gap: 12 },
  avatar: { width: 34, height: 34, borderRadius: '50%', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.2)', color: '#60a5fa', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Outfit', sans-serif", flexShrink: 0 },
  name: { color: '#e2e8f0', fontSize: 13, fontWeight: 500, fontFamily: "'Outfit', sans-serif" },
  phone: { color: '#475569', fontSize: 11, marginTop: 2, fontFamily: "'Outfit', sans-serif" },
  ciudad: { color: '#64748b', fontSize: 12, fontFamily: "'Outfit', sans-serif" },
  progressMini: { height: 3, background: 'rgba(30,58,138,0.2)', borderRadius: 99, overflow: 'hidden', marginTop: 4, width: 60, margin: '4px auto 0' },
  progressMiniFill: { height: '100%', background: '#3b82f6', borderRadius: 99 },
  dotsLabel: { color: '#64748b', fontSize: 11, fontFamily: "'Outfit', sans-serif" },
  badge: { display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500, fontFamily: "'Outfit', sans-serif", letterSpacing: '0.03em' },
  chevron: { color: '#334155', fontSize: 10, textAlign: 'right' },
  empty: { padding: '48px', textAlign: 'center', display: 'flex', justifyContent: 'center' },
  pulse: { width: 24, height: 24, borderRadius: '50%', border: '2px solid rgba(59,130,246,0.3)', borderTopColor: '#3b82f6', animation: 'spin 0.8s linear infinite' },
  detail: { background: 'rgba(7,11,20,0.8)', borderTop: '1px solid rgba(30,58,138,0.15)', padding: '16px 20px', borderBottom: '1px solid rgba(30,58,138,0.1)' },
  detailTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid rgba(30,58,138,0.1)', gap: 12, flexWrap: 'wrap' },
  waBtn: { display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)', color: '#60a5fa', padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500, fontFamily: "'Outfit', sans-serif", cursor: 'pointer' },
  waBtnSent: { background: 'rgba(74,222,128,0.08)', borderColor: 'rgba(74,222,128,0.2)', color: '#4ade80', cursor: 'default' },
  viewLink: { color: '#60a5fa', fontSize: 12, textDecoration: 'none', fontFamily: "'Outfit', sans-serif", background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)', padding: '5px 12px', borderRadius: 6, whiteSpace: 'nowrap' },
  docsList: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 },
  docItem: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(30,58,138,0.1)', background: 'rgba(15,23,42,0.5)' },
  docDone: { borderColor: 'rgba(74,222,128,0.15)', background: 'rgba(74,222,128,0.04)' },
  docLink: { color: '#4ade80', fontSize: 11, textDecoration: 'none', fontFamily: "'Outfit', sans-serif", flexShrink: 0 },
}

const style = document.createElement('style')
style.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
  @keyframes spin { to { transform: rotate(360deg) } }
  * { box-sizing: border-box; margin: 0; padding: 0; }
`
document.head.appendChild(style)
