import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const DOCS = [
  { key: 'solicitud', label: 'Solicitud de empleo', desc: 'Formato firmado', icon: '📋', sides: 1 },
  { key: 'identificacion', label: 'Identificación oficial', desc: 'INE o pasaporte', icon: '🪪', sides: 1 },
  { key: 'licencia', label: 'Licencia de conducir vigente', desc: 'Ambos lados en un archivo', icon: '🚗', sides: 1 },
  { key: 'domicilio', label: 'Comprobante de domicilio', desc: 'No mayor a 3 meses', icon: '🏠', sides: 1 },
  { key: 'nss', label: 'Número de Seguro Social', desc: 'Hoja del IMSS', icon: '🏥', sides: 1 },
  { key: 'curp', label: 'CURP', desc: 'Revisión de antecedentes', icon: '📄', sides: 1 },
  { key: 'fiscal', label: 'Constancia de Situación Fiscal', desc: 'SAT actualizada', icon: '💼', sides: 1 },
  { key: 'infonavit', label: 'Hoja de retención de INFONAVIT', desc: 'Si aplica', icon: '🏗️', sides: 1 },
]

const REFS = [
  { key: 'ref1', label: 'Referencia laboral 1', placeholder: 'Nombre y número de teléfono' },
  { key: 'ref2', label: 'Referencia laboral 2', placeholder: 'Nombre y número de teléfono' },
  { key: 'ref3', label: 'Referencia personal', placeholder: 'Nombre y número de teléfono' },
]

export default function Upload() {
  const [params] = useSearchParams()
  const phone = params.get('phone') || ''
  const [candidato, setCandidato] = useState(null)
  const [done, setDone] = useState({})
  const [uploading, setUploading] = useState({})
  const [texts, setTexts] = useState({})
  const [savingRef, setSavingRef] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { if (phone) fetchCandidato(); else setLoading(false) }, [phone])

  async function fetchCandidato() {
    const { data, error } = await supabase.from('candidatos').select('*').eq('telefono', phone).single()
    if (error || !data) { setError('Link inválido. Usa el link que te envió el reclutador.'); setLoading(false); return }
    setCandidato(data)
    const { data: docData } = await supabase.from('documentos').select('*').eq('candidato_id', data.id)
    const map = {}
    const textMap = {}
    docData?.forEach(d => {
      if (REFS.find(r => r.key === d.tipo)) {
        textMap[d.tipo] = d.url
      } else {
        map[d.tipo] = d.url
      }
    })
    setDone(map)
    setTexts(textMap)
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
    await checkAndUpdateStatus(newDone, texts)
  }

  async function handleSaveRef(refKey) {
    const val = texts[refKey]?.trim()
    if (!val || !candidato) return
    setSavingRef(p => ({ ...p, [refKey]: true }))
    await supabase.from('documentos').upsert({ candidato_id: candidato.id, tipo: refKey, url: val }, { onConflict: 'candidato_id,tipo' })
    setSavingRef(p => ({ ...p, [refKey]: false }))
    await checkAndUpdateStatus(done, texts)
  }

  async function checkAndUpdateStatus(currentDone, currentTexts) {
    const allFilesUploaded = DOCS.every(d => currentDone[d.key])
    const allRefsFilled = REFS.every(r => currentTexts[r.key]?.trim())
    const allUploaded = allFilesUploaded && allRefsFilled
    const { error: updateErr } = await supabase
      .from('candidatos')
      .update({ form_status: allUploaded ? 'completado' : 'parcial' })
      .eq('id', candidato.id)
    if (updateErr) console.error('STATUS UPDATE FAILED:', updateErr)
  }

  const fileDone = DOCS.filter(d => done[d.key]).length
  const refDone = REFS.filter(r => texts[r.key]?.trim()).length
  const totalDone = fileDone + refDone
  const totalItems = DOCS.length + REFS.length
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
              <span style={{ color: allDone ? '#4ade80' : '#60a5fa', fontSize: 28, fontWeight: 700 }}>{totalDone}</span>
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

          <div style={{ ...s.docCard, flexDirection: 'column', alignItems: 'flex-start', gap: 16, marginTop: 4 }}>
            <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600, fontFamily: "'Outfit', sans-serif" }}>📋 Referencias</div>
            {REFS.map(ref => (
              <div key={ref.key} style={{ width: '100%' }}>
                <div style={{ ...s.docLabel, color: texts[ref.key]?.trim() ? '#e2e8f0' : '#94a3b8', marginBottom: 6 }}>{ref.label}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    placeholder={ref.placeholder}
                    value={texts[ref.key] || ''}
                    onChange={e => setTexts(p => ({ ...p, [ref.key]: e.target.value }))}
                    style={s.textInput}
                  />
                  <button
                    onClick={() => handleSaveRef(ref.key)}
                    disabled={!texts[ref.key]?.trim() || savingRef[ref.key]}
                    style={{ ...s.uploadBtn, minWidth: 80, cursor: texts[ref.key]?.trim() ? 'pointer' : 'not-allowed', opacity: texts[ref.key]?.trim() ? 1 : 0.4 }}
                  >
                    {savingRef[ref.key] ? <span style={s.spinnerSm} /> : '✓ Guardar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
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
  textInput: { flex: 1, background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(30,58,138,0.3)', borderRadius: 8, padding: '7px 12px', color: '#e2e8f0', fontSize: 12, fontFamily: "'Outfit', sans-serif", outline: 'none' },
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
