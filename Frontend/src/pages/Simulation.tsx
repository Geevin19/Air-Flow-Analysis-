import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import Navbar from '../components/Navbar'
import { FlowVelocityChart, PressureDistributionChart, DynamicPressureChart, VelocityProfileChart } from '../components/SimulationChart'
import { simulationAPI, type SimulationResult, type SimulationPayload } from '../services/api'

const S = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@700;800&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{--bg:#eef2f7;--surf:#ffffff;--surf2:#f5f8fc;--border:#dde3ec;--border2:#c5cfdf;--a1:#3b6fd4;--a2:#5b9bd5;--text:#1a2333;--muted:#6b7a90;--label:#44546a;--success:#2e9e6b;--danger:#d95f5f;}
  body{background:var(--bg);color:var(--text);font-family:'Inter',sans-serif;min-height:100vh;}
  .sp-bg{position:fixed;inset:0;z-index:0;pointer-events:none;}
  .sp-bg::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 50% 40% at 0% 0%,rgba(59,111,212,.07) 0%,transparent 50%);}
  .sp-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(59,111,212,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(59,111,212,.035) 1px,transparent 1px);background-size:36px 36px;}
  .sp-wrap{position:relative;z-index:1;min-height:100vh;}
  .sp-main{max-width:1280px;margin:0 auto;padding:2.5rem clamp(1rem,4vw,3rem);}
  .breadcrumb{display:flex;align-items:center;gap:.45rem;font-size:.81rem;color:var(--muted);margin-bottom:1.8rem;}
  .breadcrumb a{color:var(--muted);text-decoration:none;transition:color .18s;}
  .breadcrumb a:hover{color:var(--a1);}
  .breadcrumb span{color:var(--text);}
  .sp-title{font-family:'Plus Jakarta Sans',sans-serif;font-size:clamp(1.5rem,3vw,2rem);font-weight:800;letter-spacing:-.02em;color:var(--text);margin-bottom:.35rem;}
  .sp-title .ac{color:var(--a1);}
  .sp-sub{font-size:.87rem;color:var(--muted);margin-bottom:2rem;}
  .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:1.75rem;align-items:start;}
  .fc{background:var(--surf);border:1px solid var(--border);border-radius:14px;padding:1.75rem;position:relative;overflow:hidden;box-shadow:0 1px 4px rgba(59,111,212,.04);margin-bottom:1.25rem;}
  .fc::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,var(--a1),var(--a2));}
  .fc-title{font-size:.92rem;font-weight:700;color:var(--text);margin-bottom:1.3rem;display:flex;align-items:center;gap:.5rem;}
  .fc-icon{width:26px;height:26px;background:rgba(59,111,212,.08);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:.85rem;}
  .two-col{display:grid;grid-template-columns:1fr 1fr;gap:.85rem;}
  .fg{margin-bottom:1rem;}
  .lbl{display:block;font-size:.78rem;font-weight:600;color:var(--label);margin-bottom:.38rem;letter-spacing:.02em;}
  .inp-bare{width:100%;padding:.68rem .75rem;background:var(--surf2);border:1.5px solid var(--border);border-radius:8px;color:var(--text);font-size:.87rem;font-family:'Inter',sans-serif;outline:none;transition:border-color .18s;}
  .inp-bare:focus{border-color:var(--a1);}
  select.inp-bare{cursor:pointer;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7a90' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 11px center;}
  textarea.inp-bare{resize:vertical;min-height:65px;}
  .vt-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:.55rem;margin-bottom:1rem;}
  .vt{cursor:pointer;padding:.58rem .35rem;border:1px solid var(--border);border-radius:8px;text-align:center;font-size:.8rem;transition:all .18s;background:var(--surf2);}
  .vt:hover{border-color:rgba(59,111,212,.35);background:rgba(59,111,212,.04);}
  .vt.sel{border-color:var(--a1);background:rgba(59,111,212,.07);color:var(--a1);font-weight:700;}
  .vt-icon{font-size:1.2rem;display:block;margin-bottom:.18rem;}
  .range-wrap{position:relative;margin-top:.3rem;}
  .range-val{position:absolute;right:0;top:-20px;font-size:.72rem;color:var(--a1);font-weight:600;}
  .range-inp{-webkit-appearance:none;appearance:none;width:100%;height:4px;background:var(--border);border-radius:4px;outline:none;cursor:pointer;}
  .range-inp::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;background:linear-gradient(135deg,var(--a1),var(--a2));border-radius:50%;cursor:pointer;}
  .btn-run{width:100%;padding:.85rem;background:linear-gradient(135deg,var(--a1),var(--a2));border:none;border-radius:9px;color:#fff;font-size:.92rem;font-weight:600;font-family:'Inter',sans-serif;cursor:pointer;letter-spacing:.02em;transition:transform .15s,box-shadow .18s;box-shadow:0 3px 12px rgba(59,111,212,.28);margin-top:.5rem;display:flex;align-items:center;justify-content:center;gap:.5rem;}
  .btn-run:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 5px 18px rgba(59,111,212,.32);}
  .btn-run:disabled{opacity:.58;cursor:not-allowed;}
  .results-section{margin-top:2.2rem;}
  .res-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.4rem;flex-wrap:wrap;gap:1rem;}
  .res-title{font-family:'Plus Jakarta Sans',sans-serif;font-size:1.3rem;font-weight:800;color:var(--text);}
  .status-badge{display:inline-flex;align-items:center;gap:.38rem;padding:.3rem .85rem;border-radius:100px;font-size:.78rem;font-weight:600;}
  .sb-completed{background:rgba(46,158,107,.08);color:var(--success);border:1px solid rgba(46,158,107,.2);}
  .sb-running{background:rgba(59,111,212,.08);color:var(--a1);border:1px solid rgba(59,111,212,.2);animation:pulse 1.5s ease-in-out infinite;}
  .sb-failed{background:rgba(217,95,95,.08);color:var(--danger);border:1px solid rgba(217,95,95,.2);}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
  .info-panel{background:var(--surf);border:1px solid var(--border);border-radius:13px;padding:1.3rem;margin-bottom:1.4rem;box-shadow:0 1px 4px rgba(59,111,212,.04);}
  .info-label{font-size:.72rem;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:.85rem;}
  .info-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:.65rem;}
  .info-item{display:flex;flex-direction:column;gap:.12rem;}
  .info-key{font-size:.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:.03em;}
  .info-val{font-size:.88rem;font-weight:600;color:var(--text);}
  .kpi-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(175px,1fr));gap:1rem;margin-bottom:1.75rem;}
  .kpi{background:var(--surf);border:1px solid var(--border);border-radius:12px;padding:1.1rem;position:relative;overflow:hidden;box-shadow:0 1px 4px rgba(59,111,212,.04);}
  .kpi::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:var(--kg,linear-gradient(90deg,var(--a1),var(--a2)));}
  .kpi-val{font-family:'Plus Jakarta Sans',sans-serif;font-size:1.5rem;font-weight:800;color:var(--a1);}
  .kpi-label{font-size:.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;margin-top:.18rem;}
  .charts-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(400px,1fr));gap:1.3rem;}
  .loading-state{text-align:center;padding:4rem 2rem;}
  .spinner{width:44px;height:44px;border:3px solid var(--border);border-top-color:var(--a1);border-radius:50%;animation:spin .75s linear infinite;margin:0 auto 1.3rem;}
  @keyframes spin{to{transform:rotate(360deg)}}
  @media(max-width:860px){.form-grid{grid-template-columns:1fr}.charts-grid{grid-template-columns:1fr}.two-col{grid-template-columns:1fr}}
  @media(max-width:480px){.vt-grid{grid-template-columns:repeat(2,1fr)}.kpi-grid{grid-template-columns:repeat(2,1fr)}}
`

const VEHICLES = [
  {id:'car',label:'Car',icon:'🚗'},{id:'truck',label:'Truck',icon:'🚛'},
  {id:'motorcycle',label:'Moto',icon:'🏍️'},{id:'aircraft',label:'Aircraft',icon:'✈️'},
  {id:'drone',label:'Drone',icon:'🛸'},{id:'custom',label:'Custom',icon:'🔧'},
]

const DEFAULT: SimulationPayload = {
  name:'',description:'',vehicle_type:'car',
  velocity:30,air_density:1.225,frontal_area:2.2,
  drag_coefficient:0.30,lift_coefficient:-0.1,angle_of_attack:0,
}

export default function Simulation() {
  const {id}     = useParams()
  const navigate = useNavigate()
  const isNew    = !id || id==='new'

  const [form,       setForm]       = useState<SimulationPayload>(DEFAULT)
  const [result,     setResult]     = useState<SimulationResult|null>(null)
  const [loading,    setLoading]    = useState(!isNew)
  const [submitting, setSubmitting] = useState(false)

  useEffect(()=>{
    if (!isNew && id) {
      simulationAPI.get(Number(id))
        .then(r=>{ setResult(r.data); setForm(r.data as any) })
        .catch(()=>{ toast.error('Simulation not found'); navigate('/dashboard') })
        .finally(()=>setLoading(false))
    }
  },[id])

  const set = (k: keyof SimulationPayload) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) => {
    const v = e.target.type==='number'||e.target.type==='range' ? Number(e.target.value) : e.target.value
    setForm(f=>({...f,[k]:v}))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name){toast.error('Please enter a simulation name');return}
    setSubmitting(true)
    try {
      const r = await simulationAPI.create(form)
      toast.success('Simulation complete!')
      setResult(r.data)
      navigate(`/simulation/${r.data.id}`,{replace:true})
    } catch(err:any){
      toast.error(err.response?.data?.detail||'Simulation failed')
    } finally { setSubmitting(false) }
  }

  const kpis = result ? [
    {label:'Drag Force',       val:`${result.drag_force?.toFixed(2)} N`,       kg:'linear-gradient(90deg,#3b6fd4,#5b9bd5)'},
    {label:'Lift Force',       val:`${result.lift_force?.toFixed(2)} N`,       kg:'linear-gradient(90deg,#5b7fd4,#5b9bd5)'},
    {label:'Dynamic Pressure', val:`${result.dynamic_pressure?.toFixed(1)} Pa`,kg:'linear-gradient(90deg,#2e9e6b,#5b9bd5)'},
    {label:'Power Required',   val:`${result.power_required?.toFixed(1)} W`,   kg:'linear-gradient(90deg,#e8943a,#ffd32a)'},
    {label:'Reynolds Number',  val:result.reynolds_number?.toExponential(2),   kg:'linear-gradient(90deg,#3b6fd4,#5b7fd4)'},
    {label:'Efficiency Score', val:`${result.efficiency_score?.toFixed(1)}%`,  kg:'linear-gradient(90deg,#2e9e6b,#3b6fd4)'},
  ] : []

  if (loading) return (
    <>
      <style>{S}</style>
      <div className="sp-wrap"><Navbar variant="app"/>
        <div className="loading-state"><div className="spinner"/><p style={{color:'var(--muted)'}}>Loading simulation…</p></div>
      </div>
    </>
  )

  return (
    <>
      <style>{S}</style>
      <div className="sp-bg"><div className="sp-grid"/></div>
      <div className="sp-wrap">
        <Navbar variant="app"/>
        <main className="sp-main">
          <div className="breadcrumb">
            <Link to="/dashboard">Dashboard</Link>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            <span>{isNew?'New Simulation':result?.name||'Simulation'}</span>
          </div>

          <h1 className="sp-title">{isNew?<>Run a <span className="ac">New Simulation</span></>:<><span className="ac">{result?.name}</span></>}</h1>
          <p className="sp-sub">{isNew?'Configure aerodynamic parameters and run a CFD simulation':`Vehicle: ${result?.vehicle_type} · ${new Date(result?.created_at||'').toLocaleDateString()}`}</p>

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div>
                <div className="fc">
                  <div className="fc-title"><div className="fc-icon">📋</div> Simulation Info</div>
                  <div className="fg">
                    <label className="lbl">Simulation Name *</label>
                    <input className="inp-bare" type="text" placeholder="e.g. Sports Car Baseline" value={form.name} onChange={set('name')}/>
                  </div>
                  <div className="fg">
                    <label className="lbl">Description <span style={{fontWeight:400,color:'var(--muted)'}}>— optional</span></label>
                    <textarea className="inp-bare" placeholder="Notes about this configuration…" value={form.description||''} onChange={set('description')}/>
                  </div>
                  <div className="fg" style={{marginBottom:0}}>
                    <label className="lbl">Vehicle Type</label>
                    <div className="vt-grid">
                      {VEHICLES.map(v=>(
                        <div key={v.id} className={`vt${form.vehicle_type===v.id?' sel':''}`} onClick={()=>setForm(f=>({...f,vehicle_type:v.id}))}>
                          <span className="vt-icon">{v.icon}</span>{v.label}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="fc">
                  <div className="fc-title"><div className="fc-icon">💨</div> Flow Parameters</div>
                  <div className="two-col">
                    <div className="fg">
                      <label className="lbl">Velocity (m/s)</label>
                      <div className="range-wrap">
                        <span className="range-val">{form.velocity} m/s</span>
                        <input className="range-inp" type="range" min="1" max="340" step="1" value={form.velocity} onChange={set('velocity')}/>
                      </div>
                    </div>
                    <div className="fg">
                      <label className="lbl">Angle of Attack (°)</label>
                      <div className="range-wrap">
                        <span className="range-val">{form.angle_of_attack}°</span>
                        <input className="range-inp" type="range" min="-20" max="20" step="0.5" value={form.angle_of_attack} onChange={set('angle_of_attack')}/>
                      </div>
                    </div>
                  </div>
                  <div className="fg">
                    <label className="lbl">Air Density (kg/m³)</label>
                    <input className="inp-bare" type="number" step="0.001" value={form.air_density} onChange={set('air_density')}/>
                  </div>
                </div>
              </div>

              <div>
                <div className="fc">
                  <div className="fc-title"><div className="fc-icon">📐</div> Geometry</div>
                  <div className="fg">
                    <label className="lbl">Frontal Area (m²)</label>
                    <input className="inp-bare" type="number" step="0.01" value={form.frontal_area} onChange={set('frontal_area')}/>
                  </div>
                </div>

                <div className="fc">
                  <div className="fc-title"><div className="fc-icon">⚡</div> Aerodynamic Coefficients</div>
                  <div className="fg">
                    <label className="lbl">Drag Coefficient (Cd)</label>
                    <div className="range-wrap">
                      <span className="range-val">{form.drag_coefficient.toFixed(2)}</span>
                      <input className="range-inp" type="range" min="0.01" max="2.0" step="0.01" value={form.drag_coefficient} onChange={set('drag_coefficient')}/>
                    </div>
                  </div>
                  <div className="fg" style={{marginBottom:0}}>
                    <label className="lbl">Lift Coefficient (Cl)</label>
                    <div className="range-wrap">
                      <span className="range-val">{form.lift_coefficient.toFixed(2)}</span>
                      <input className="range-inp" type="range" min="-2.0" max="2.0" step="0.01" value={form.lift_coefficient} onChange={set('lift_coefficient')}/>
                    </div>
                  </div>
                </div>

                {isNew&&(
                  <button className="btn-run" type="submit" disabled={submitting}>
                    {submitting
                      ? <><div style={{width:16,height:16,border:'2px solid rgba(255,255,255,.3)',borderTopColor:'white',borderRadius:'50%',animation:'spin .7s linear infinite'}}/> Running…</>
                      : <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg> Run Simulation</>
                    }
                  </button>
                )}
              </div>
            </div>
          </form>

          {result&&result.status==='completed'&&(
            <div className="results-section">
              <div className="res-header">
                <h2 className="res-title">Simulation Results</h2>
                <span className="status-badge sb-completed">✓ Completed</span>
              </div>

              <div className="info-panel">
                <div className="info-label">Input Parameters</div>
                <div className="info-grid">
                  {[['Vehicle',result.vehicle_type],['Velocity',`${result.velocity} m/s`],['Air Density',`${result.air_density} kg/m³`],
                    ['Frontal Area',`${result.frontal_area} m²`],['Cd',result.drag_coefficient],['Cl',result.lift_coefficient],
                    ['Angle of Attack',`${result.angle_of_attack}°`]].map(([k,v])=>(
                    <div className="info-item" key={String(k)}>
                      <span className="info-key">{k}</span>
                      <span className="info-val">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="kpi-grid">
                {kpis.map(k=>(
                  <div className="kpi" key={k.label} style={{'--kg':k.kg} as React.CSSProperties}>
                    <div className="kpi-val">{k.val}</div>
                    <div className="kpi-label">{k.label}</div>
                  </div>
                ))}
              </div>

              {result.flow_data?.length>0&&(
                <div className="charts-grid">
                  <FlowVelocityChart data={result.flow_data}/>
                  <DynamicPressureChart data={result.flow_data}/>
                  {result.pressure_distribution?.length>0&&<PressureDistributionChart data={result.pressure_distribution}/>}
                  <VelocityProfileChart data={result.flow_data}/>
                </div>
              )}
            </div>
          )}

          {result&&result.status==='running'&&(
            <div className="loading-state">
              <div className="spinner"/>
              <p style={{color:'var(--label)',fontWeight:600}}>Simulation running…</p>
              <p style={{color:'var(--muted)',fontSize:'.84rem',marginTop:'.45rem'}}>This usually takes a few seconds</p>
            </div>
          )}
        </main>
      </div>
    </>
  )
}