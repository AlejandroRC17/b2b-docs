import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const DOCS = [
  { key: 'solicitud', label: 'Solicitud de empleo', desc: '3 referencias laborales', icon: '📋', sides: 1 },
  { key: 'ine', label: 'INE', desc: 'Frente y reverso', icon: '🪪', sides: 2 },
  { key: 'curp', label: 'CURP', desc: 'Revisión de antecedentes', icon: '📄', sides: 1 },
  { key: 'fiscal', label: 'Constancia fiscal', desc: 'Seguro social e Infonavit si aplica', icon: '💼', sides: 1 },
  { key: 'domicilio', label: 'Comprobante de domicilio', desc: 'No mayor a 3 meses', icon: '🏠', sides: 1 },
  { key: 'licencia', label: 'Licencia vigente', desc: 'Frente y reverso', icon: '🚗', sides: 2 },
  { key: 'toxico', label: 'Examen toxicológico', desc: 'Resultado del examen', icon: '🧪', sides: 1 },
]

export default function Upload() {
  const [params] = useSearchParams()
  const phone = params.get('phone') || ''
  const [candidato, setCandidato] = useState(null)
  const [done, setDone] = useState({})
  const [uploading, setUploading] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { if (phone) fetchCandidato(); else setLoading(false) }, [phone])

  async function fetchCandidato() {
    const { data, error } = await supabase.from('candidatos').select('*').eq('telefono', phone).single()
    if (error || !data) { setError('Link inválido. Usa el link que te envió el reclutador.'); setLoading(false); return }
    setCandidato(data)
    const { data: docData } = await supabase.from('documentos').select('*').eq('candidato_id', data.id)
    const map = {}; docData?.forEach(d => { map[d.tipo] = d.url }); setDone(map)
    setLoading(false)
  }

  async function handleUpload(docKey, file) {
    if (!file || !candidato) return
    setUploading(p => ({ ...p, [docKey]: true }))
    const ext = file.name.split('.').pop()
    const path = `${candidato.id}/${docKey}.${ext}`
    const { error: upErr } = await supabase.storage.from('docs').upload(path, file, { upsert: true })
    if (upErr) { alert('Error: ' + upErr.message); setUploading(p => ({ ...p, [docKey]: false })); return }
    const { data: urlData } = supabase.storage.from('docs').getPublicUrl(path)
    await supabase.from('documentos').upsert({ candidato_id: candidato.id, tipo: docKey, url: urlData.publicUrl }, { onConflict: 'candidato_id,tipo' })
    const newDone = { ...done, [docKey]: urlData.publicUrl }
    setDone(newDone)
    setUploading(p => ({ ...p, [docKey]: false }))
    const allUploaded = DOCS.every(d => {
      if (d.sides === 2) return newDone[d.key + '_frente'] && newDone[d.key + '_reverso']
      return newDone[d.key]
    })
    await supabase.from('candidatos').update({ form_status: allUploaded ? 'completado' : 'parcial' }).eq('id', candidato.id)
  }

  const totalDone = DOCS.reduce((acc, d) => {
    if (d.sides === 2) return acc + (done[d.key + '_frente'] ? 0.5 : 0) + (done[d.key + '_reverso'] ? 0.5 : 0)
    return acc + (done[d.key] ? 1 : 0)
  }, 0)
  const totalItems = DOCS.length
  const allDone = totalDone === totalItems
  const pct = Math.round((totalDone / totalItems) * 100)

  if (loading) return <div style={{ ...s.center, minHeight: '100vh', background: '#070b14' }}><div style={s.spinner} /></div>

  if (!phone || error) return (
    <div style={{ ...s.center, minHeight: '100vh', background: '#070b14' }}>
      <div style={s.errorBox}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🔗</div>
        <p style={{ color: '#e2e8f0', fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 500 }}>{error || 'Link inválido'}</p>
        <p style={{ color: '#475569', fontSize: 13, marginTop: 8, fontFamily: "'Outfit', sans-serif" }}>Usa el link enviado por tu reclutador</p>
      </div>
    </div>
  )

  return (
    <div style={s.root}>
      <div style={s.gridBg} />
      <div style={s.wrap}>
        <header style={s.header}>
          <div style={s.logo}>B2B <span style={{ color: '#3b82f6' }}>Latam</span></div>
          <div style={s.greeting}>Hola, {candidato?.nombre?.split(' ')[0]} 👋</div>
        </header>

        <div style={s.progressCard}>
          <div style={s.progressTop}>
            <div>
              <div style={s.progressTitle}>Tus documentos</div>
              <div style={s.progressSub}>Sube todos para completar tu registro</div>
            </div>
            <div style={s.progressNum}>
              <span style={{ color: allDone ? '#4ade80' : '#60a5fa', fontSize: 28, fontWeight: 700 }}>{Math.round(totalDone)}</span>
              <span style={{ color: '#334155', fontSize: 18 }}>/{totalItems}</span>
            </div>
          </div>
          <div style={s.barWrap}>
            <div style={{ ...s.barFill, width: `${pct}%`, background: allDone ? '#4ade80' : '#3b82f6' }} />
          </div>
          {allDone && <div style={s.successMsg}>🎉 ¡Todos tus documentos fueron recibidos! Te contactaremos pronto.</div>}
        </div>

        <div style={s.docsList}>
          {DOCS.map(doc => {
            if (doc.sides === 2) {
              const keyF = doc.key + '_frente'
              const keyR = doc.key + '_reverso'
              const doneF = !!done[keyF]
              const doneR = !!done[keyR]
              const bothDone = doneF && doneR
              return (
                <div key={doc.key} style={{ ...s.docCard, ...(bothDone ? s.docCardDone : {}) }}>
                  <div style={s.docLeft}>
                    <span style={{ fontSize: 20 }}>{doc.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ ...s.docLabel, color: bothDone ? '#e2e8f0' : '#94a3b8' }}>{doc.label}</div>
                      <div style={s.docDesc}>{doc.desc}</div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        {[{ key: keyF, label: 'Frente' }, { key: keyR, label: 'Reverso' }].map(side => (
                          <div key={side.key}>
                            {done[side.key] ? (
                              <span style={s.checkBadgeSm}>✓ {side.label}</span>
                            ) : (
                              <label style={s.uploadBtnSm}>
                                {uploading[side.key] ? <span style={s.spinnerSm} /> : `↑ ${side.label}`}
                                <input type="file" accept="image/*,.pdf" style={{ display: 'none' }}
                                  onChange={e => handleUpload(side.key, e.target.files[0])} disabled={uploading[side.key]} />
                              </label>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )
            }

            const isDone = !!done[doc.key]
            return (
              <div key={doc.key} style={{ ...s.docCard, ...(isDone ? s.docCardDone : {}) }}>
                <div style={s.docLeft}>
                  <span style={{ fontSize: 20 }}>{doc.icon}</span>
                  <div>
                    <div style={{ ...s.docLabel, color: isDone ? '#e2e8f0' : '#94a3b8' }}>{doc.label}</div>
                    <div style={s.docDesc}>{doc.desc}</div>
                  </div>
                </div>
                <div>
                  {isDone ? (
                    <span style={s.checkBadge}>✓ Listo</span>
                  ) : (
                    <label style={s.uploadBtn}>
                      {uploading[doc.key] ? <span style={s.spinnerSm} /> : '↑ Subir'}
                      <input type="file" accept="image/*,.pdf" style={{ display: 'none' }}
                        onChange={e => handleUpload(doc.key, e.target.files[0])} disabled={uploading[doc.key]} />
                    </label>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <div style={s.footer}>{candidato?.telefono} · B2B Latam</div>
      </div>
    </div>
  )
}

const s = {
  root: { minHeight: '100vh', background: '#070b14', position: 'relative' },
  gridBg: { position: 'fixed', inset: 0, zIndex: 0, backgroundImage: `linear-gradient(rgba(30,58,138,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(30,58,138,0.05) 1px, transparent 1px)`, backgroundSize: '40px 40px', pointerEvents: 'none' },
  wrap: { position: 'relative', zIndex: 1, maxWidth: 520, margin: '0 auto', padding: '32px 20px 60px' },
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
  errorBox: { textAlign: 'center', padding: '40px 32px', background: 'rgba(10,16,30,0.8)', borderRadius: 16, border: '1px solid rgba(30,58,138,0.2)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, paddingBottom: 24, borderBottom: '1px solid rgba(30,58,138,0.2)' },
  logo: { fontFamily: "'Outfit', sans-serif", fontSize: 20, fontWeight: 700, color: '#f1f5f9' },
  greeting: { color: '#64748b', fontSize: 13, fontFamily: "'Outfit', sans-serif" },
  progressCard: { background: 'rgba(10,16,30,0.7)', borderRadius: 14, border: '1px solid rgba(30,58,138,0.2)', padding: '20px', marginBottom: 20, backdropFilter: 'blur(20px)' },
  progressTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  progressTitle: { color: '#e2e8f0', fontSize: 15, fontWeight: 600, fontFamily: "'Outfit', sans-serif" },
  progressSub: { color: '#475569', fontSize: 12, marginTop: 3, fontFamily: "'Outfit', sans-serif" },
  progressNum: { fontFamily: "'Outfit', sans-serif", lineHeight: 1 },
  barWrap: { height: 4, background: 'rgba(30,58,138,0.2)', borderRadius: 99, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 99, transition: 'width 0.5s ease' },
  successMsg: { marginTop: 12, padding: '10px 14px', background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: 8, color: '#4ade80', fontSize: 13, fontFamily: "'Outfit', sans-serif" },
  docsList: { display: 'flex', flexDirection: 'column', gap: 8 },
  docCard: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 16px', background: 'rgba(10,16,30,0.7)', border: '1px solid rgba(30,58,138,0.12)', borderRadius: 12, backdropFilter: 'blur(10px)' },
  docCardDone: { borderColor: 'rgba(74,222,128,0.15)', background: 'rgba(74,222,128,0.03)' },
  docLeft: { display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1, minWidth: 0 },
  docLabel: { fontSize: 13, fontWeight: 500, fontFamily: "'Outfit', sans-serif" },
  docDesc: { color: '#334155', fontSize: 11, marginTop: 2, fontFamily: "'Outfit', sans-serif" },
  checkBadge: { color: '#4ade80', fontSize: 12, fontWeight: 500, background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.15)', padding: '4px 10px', borderRadius: 20, fontFamily: "'Outfit', sans-serif", whiteSpace: 'nowrap' },
  checkBadgeSm: { color: '#4ade80', fontSize: 11, fontWeight: 500, background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.15)', padding: '3px 8px', borderRadius: 20, fontFamily: "'Outfit', sans-serif", display: 'inline-block' },
  uploadBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', minWidth: 72, background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)', color: '#60a5fa', padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500, fontFamily: "'Outfit', sans-serif" },
  uploadBtnSm: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)', color: '#60a5fa', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500, fontFamily: "'Outfit', sans-serif" },
  spinner: { width: 28, height: 28, borderRadius: '50%', border: '2px solid rgba(59,130,246,0.2)', borderTopColor: '#3b82f6', animation: 'spin 0.8s linear infinite' },
  spinnerSm: { width: 10, height: 10, borderRadius: '50%', border: '2px solid rgba(96,165,250,0.3)', borderTopColor: '#60a5fa', animation: 'spin 0.8s linear infinite', display: 'inline-block' },
  footer: { textAlign: 'center', color: '#1e293b', fontSize: 11, marginTop: 36, fontFamily: "'Outfit', sans-serif" },
}

const style = document.createElement('style')
style.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
  @keyframes spin { to { transform: rotate(360deg) } }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #070b14; }
`
document.head.appendChild(style)
