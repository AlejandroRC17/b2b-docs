import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const DOCS = [
  { key: 'solicitud', label: 'Solicitud de empleo', desc: '3 referencias laborales incluidas', icon: '📋' },
  { key: 'ine', label: 'INE', desc: 'Ambos lados escaneados', icon: '🪪' },
  { key: 'curp', label: 'CURP', desc: 'Para revisión de antecedentes penales', icon: '📄' },
  { key: 'fiscal', label: 'Constancia de situación fiscal', desc: 'Hoja de seguro social e Infonavit si aplica', icon: '💼' },
  { key: 'domicilio', label: 'Comprobante de domicilio', desc: 'No mayor a 3 meses', icon: '🏠' },
  { key: 'licencia', label: 'Licencia vigente', desc: 'Ambos lados escaneados', icon: '🚗' },
]

export default function Upload() {
  const [params] = useSearchParams()
  const phone = params.get('phone') || ''

  const [candidato, setCandidato] = useState(null)
  const [uploads, setUploads] = useState({})
  const [uploading, setUploading] = useState({})
  const [done, setDone] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!phone) { setLoading(false); return }
    fetchCandidato()
  }, [phone])

  async function fetchCandidato() {
    setLoading(true)
    const { data, error } = await supabase
      .from('candidatos')
      .select('*')
      .eq('telefono', phone)
      .single()

    if (error || !data) {
      setError('No encontramos tu registro. Verifica el link que te enviaron.')
    } else {
      setCandidato(data)
      await fetchDocs(data.id)
    }
    setLoading(false)
  }

  async function fetchDocs(candidatoId) {
    const { data } = await supabase
      .from('documentos')
      .select('*')
      .eq('candidato_id', candidatoId)

    const map = {}
    data?.forEach(d => { map[d.tipo] = d.url })
    setDone(map)
  }

  async function handleUpload(docKey, file) {
    if (!file || !candidato) return
    setUploading(p => ({ ...p, [docKey]: true }))

    const ext = file.name.split('.').pop()
    const path = `${candidato.id}/${docKey}.${ext}`

    const { error: upErr } = await supabase.storage
      .from('docs')
      .upload(path, file, { upsert: true })

    if (upErr) {
      alert('Error subiendo archivo: ' + upErr.message)
      setUploading(p => ({ ...p, [docKey]: false }))
      return
    }

    const { data: urlData } = supabase.storage.from('docs').getPublicUrl(path)

    await supabase.from('documentos').upsert({
      candidato_id: candidato.id,
      tipo: docKey,
      url: urlData.publicUrl,
    }, { onConflict: 'candidato_id,tipo' })

    setDone(p => ({ ...p, [docKey]: urlData.publicUrl }))
    setUploading(p => ({ ...p, [docKey]: false }))

    // Check if all docs uploaded
    const newDone = { ...done, [docKey]: urlData.publicUrl }
    if (DOCS.every(d => newDone[d.key])) {
      await supabase.from('candidatos')
        .update({ form_status: 'completado' })
        .eq('id', candidato.id)
    } else {
      await supabase.from('candidatos')
        .update({ form_status: 'parcial' })
        .eq('id', candidato.id)
    }
  }

  const totalDone = DOCS.filter(d => done[d.key]).length

  if (loading) return (
    <div style={styles.center}>
      <div style={styles.spinner} />
    </div>
  )

  if (!phone || error) return (
    <div style={styles.center}>
      <div style={styles.errorBox}>
        <span style={{ fontSize: 48 }}>🔗</span>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginTop: 16 }}>
          {error || 'Link inválido'}
        </p>
        <p style={{ color: 'var(--muted)', marginTop: 8, fontSize: 14 }}>
          Usa el link que te envió el reclutador por WhatsApp
        </p>
      </div>
    </div>
  )

  const allDone = totalDone === DOCS.length

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.logo}>B2B<span style={{ color: 'var(--accent)' }}>.</span></div>
        <div style={styles.headerText}>
          <p style={styles.greeting}>Hola {candidato?.nombre?.split(' ')[0]} 👋</p>
          <p style={styles.sub}>Sube tus documentos para completar tu registro</p>
        </div>
      </div>

      {/* Progress */}
      <div style={styles.progressWrap}>
        <div style={styles.progressRow}>
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>Progreso</span>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
            {totalDone}<span style={{ color: 'var(--muted)' }}>/{DOCS.length}</span>
          </span>
        </div>
        <div style={styles.progressBar}>
          <div style={{ ...styles.progressFill, width: `${(totalDone / DOCS.length) * 100}%` }} />
        </div>
      </div>

      {allDone && (
        <div style={styles.successBanner}>
          🎉 ¡Listo! Todos tus documentos fueron recibidos. Te contactaremos pronto.
        </div>
      )}

      {/* Docs list */}
      <div style={styles.list}>
        {DOCS.map(doc => {
          const isDone = !!done[doc.key]
          const isUploading = uploading[doc.key]
          return (
            <div key={doc.key} style={{ ...styles.docCard, ...(isDone ? styles.docDone : {}) }}>
              <div style={styles.docLeft}>
                <span style={styles.docIcon}>{doc.icon}</span>
                <div>
                  <p style={styles.docLabel}>{doc.label}</p>
                  <p style={styles.docDesc}>{doc.desc}</p>
                </div>
              </div>
              <div style={styles.docRight}>
                {isDone ? (
                  <div style={styles.checkBadge}>✓ Subido</div>
                ) : (
                  <label style={styles.uploadBtn}>
                    {isUploading ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ ...styles.spinner, width: 14, height: 14, borderWidth: 2 }} />
                        Subiendo...
                      </span>
                    ) : '↑ Subir'}
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      style={{ display: 'none' }}
                      onChange={e => handleUpload(doc.key, e.target.files[0])}
                      disabled={isUploading}
                    />
                  </label>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <p style={styles.footer}>
        📞 {candidato?.telefono} · B2B Latam Reclutamiento
      </p>
    </div>
  )
}

const styles = {
  page: {
    maxWidth: 520,
    margin: '0 auto',
    padding: '24px 16px 48px',
  },
  center: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: '100vh',
  },
  errorBox: {
    textAlign: 'center', padding: 40,
    background: 'var(--surface)', borderRadius: 16,
    border: '1px solid var(--border)',
  },
  header: {
    display: 'flex', alignItems: 'center', gap: 16,
    marginBottom: 28, paddingBottom: 24,
    borderBottom: '1px solid var(--border)',
  },
  logo: {
    fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800,
    background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
    flexShrink: 0,
  },
  headerText: { flex: 1 },
  greeting: { fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700 },
  sub: { color: 'var(--muted)', fontSize: 13, marginTop: 2 },
  progressWrap: {
    background: 'var(--surface)', borderRadius: 12,
    padding: '14px 16px', marginBottom: 24,
    border: '1px solid var(--border)',
  },
  progressRow: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10,
    fontFamily: 'var(--font-display)',
  },
  progressBar: {
    height: 6, background: 'var(--surface2)',
    borderRadius: 99, overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, var(--accent), var(--accent2))',
    borderRadius: 99, transition: 'width 0.4s ease',
  },
  successBanner: {
    background: '#22c55e18', border: '1px solid #22c55e44',
    color: 'var(--green)', borderRadius: 12,
    padding: '12px 16px', marginBottom: 20,
    fontSize: 14, fontWeight: 500,
  },
  list: { display: 'flex', flexDirection: 'column', gap: 10 },
  docCard: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 12, padding: '14px 16px',
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', gap: 12,
    transition: 'border-color 0.2s',
  },
  docDone: { borderColor: '#22c55e44', background: '#22c55e08' },
  docLeft: { display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
  docIcon: { fontSize: 22, flexShrink: 0 },
  docLabel: { fontWeight: 500, fontSize: 14 },
  docDesc: { color: 'var(--muted)', fontSize: 12, marginTop: 2 },
  docRight: { flexShrink: 0 },
  checkBadge: {
    color: 'var(--green)', fontSize: 13, fontWeight: 600,
    background: '#22c55e18', padding: '4px 10px', borderRadius: 99,
  },
  uploadBtn: {
    display: 'block', cursor: 'pointer',
    background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
    color: '#fff', border: 'none',
    padding: '6px 14px', borderRadius: 8,
    fontSize: 13, fontWeight: 600,
    fontFamily: 'var(--font-body)',
  },
  footer: {
    textAlign: 'center', color: 'var(--muted)',
    fontSize: 12, marginTop: 36,
  },
  spinner: {
    width: 32, height: 32,
    border: '3px solid var(--border)',
    borderTopColor: 'var(--accent)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
}

// Add spinner keyframes
const style = document.createElement('style')
style.textContent = '@keyframes spin { to { transform: rotate(360deg) } }'
document.head.appendChild(style)
