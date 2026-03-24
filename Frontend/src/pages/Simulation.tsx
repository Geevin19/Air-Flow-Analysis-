import { useState } from 'react'
import Navbar from '../components/Navbar'

const S = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@700;800&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{--bg:#eef2f7;--surf:#ffffff;--surf2:#f5f8fc;--border:#dde3ec;--a1:#3b6fd4;--a2:#5b9bd5;--text:#1a2333;--muted:#6b7a90;--label:#44546a;--success:#2e9e6b;--danger:#d95f5f;}
  body{background:var(--bg);color:var(--text);font-family:'Inter',sans-serif;min-height:100vh;}
  .sim-bg{position:fixed;inset:0;z-index:0;pointer-events:none;}
  .sim-bg::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 55% 40% at 5% 10%,rgba(59,111,212,.07) 0%,transparent 50%),radial-gradient(ellipse 45% 35% at 95% 90%,rgba(91,155,213,.05) 0%,transparent 50%);}
  .sim-grid-bg{position:absolute;inset:0;background-image:linear-gradient(rgba(59,111,212,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(59,111,212,.035) 1px,transparent 1px);background-size:36px 36px;}
  .sim-wrap{position:relative;z-index:1;min-height:100vh;}
  .sim-main{max-width:1100px;margin:0 auto;padding:2.5rem clamp(1rem,4vw,3rem);}
  .sim-header{margin-bottom:2rem;}
  .sim-title{font-family:'Plus Jakarta Sans',sans-serif;font-size:clamp(1.6rem,3vw,2.2rem);font-weight:800;letter-spacing:-.02em;color:var(--text);}
  .sim-title span{color:var(--a1);}
  .sim-sub{font-size:.88rem;color:var(--muted);margin-top:.35rem;}
  .sim-layout{display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;align-items:start;}
  @media(max-width:800px){.sim-layout{grid-template-columns:1fr}}
  .card{background:var(--surf);border:1px solid var(--border);border-radius:14px;padding:1.6rem;box-shadow:0 1px 4px rgba(59,111,212,.04);}
  .card-title{font-size:.78rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:1.2rem;}
  .fg{margin-bottom:1.1rem;}
  .fg label{display:block;font-size:.82rem;font-weight:600;color:var(--label);margin-bottom:.4rem;}
  .fg input,.fg select{width:100%;padding:.68rem .85rem;background:var(--surf2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:.9rem;font-family:'Inter',sans-serif;outline:none;transition:border-color .18s,box-shadow .18s;appearance:none;}
  .fg input:focus,.fg select:focus{border-color:var(--a1);box-shadow:0 0 0 3px rgba(59,111,212,.1);background:#fff;}
  .fg .hint{font-size:.74rem;color:var(--muted);margin-top:.3rem;}
  .select-wrap{position:relative;}
  .select-wrap::after{content:'▾';position:absolute;right:12px;top:50%;transform:translateY(-50%);color:var(--muted);pointer-events:none;font-size:.85rem;}
  .pipe-preview{margin-bottom:1.2rem;border-radius:10px;padding:1rem 1.2rem;border:1.5px solid var(--border);display:flex;align-items:center;gap:1rem;transition:all .3s;}
  .pipe-tube{height:28px;border-radius:6px;flex:1;transition:background .4s,box-shadow .4s;}
  .pipe-label{font-size:.8rem;font-weight:600;color:var(--label);white-space:nowrap;}
  .mat-plastic .pipe-tube{background:linear-gradient(90deg,#3b82f6,#60a5fa,#3b82f6);box-shadow:0 2px 10px rgba(59,130,246,.3);}
  .mat-plastic{border-color:rgba(59,130,246,.3);background:rgba(59,130,246,.04);}
  .mat-steel .pipe-tube{background:linear-gradient(90deg,#6b7280,#9ca3af,#6b7280);box-shadow:0 2px 10px rgba(107,114,128,.3);}
  .mat-steel{border-color:rgba(107,114,128,.3);background:rgba(107,114,128,.04);}
  .mat-glass .pipe-tube{background:linear-gradient(90deg,rgba(186,230,253,.6),rgba(224,242,254,.9),rgba(186,230,253,.6));box-shadow:0 2px 10px rgba(14,165,233,.2);border:1px solid rgba(14,165,233,.25);}
  .mat-glass{border-color:rgba(14,165,233,.25);background:rgba(14,165,233,.03);}
  .run-btn{width:100%;padding:.85rem;background:linear-gradient(135deg,var(--a1),var(--a2));border:none;border-radius:10px;color:#fff;font-size:.95rem;font-weight:700;font-family:'Inter',sans-serif;cursor:pointer;transition:transform .15s,box-shadow .2s;box-shadow:0 3px 12px rgba(59,111,212,.28);margin-top:.4rem;}
  .run-btn:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(59,111,212,.35);}
  .run-btn:active{transform:translateY(0);}
  .results-section{display:flex;flex-direction:column;gap:1.2rem;}
  .result-placeholder{text-align:center;padding:3rem 1.5rem;color:var(--muted);}
  .result-placeholder .icon{font-size:2.5rem;margin-bottom:.7rem;}
  .result-placeholder p{font-size:.88rem;}
  .res-mat-badge{display:inline-flex;align-items:center;gap:.5rem;padding:.45rem 1rem;border-radius:8px;font-size:.85rem;font-weight:700;margin-bottom:1.2rem;}
  .res-mat-plastic{background:rgba(59,130,246,.1);color:#2563eb;border:1px solid rgba(59,130,246,.2);}
  .res-mat-steel{background:rgba(107,114,128,.1);color:#374151;border:1px solid rgba(107,114,128,.2);}
  .res-mat-glass{background:rgba(14,165,233,.08);color:#0369a1;border:1px solid rgba(14,165,233,.2);}
  .kpi-grid{display:grid;grid-template-columns:1fr 1fr;gap:.85rem;margin-bottom:1.2rem;}
  .kpi-card{background:var(--surf2);border:1px solid var(--border);border-radius:11px;padding:1rem 1.1rem;}
  .kpi-val{font-family:'Plus Jakarta Sans',sans-serif;font-size:1.5rem;font-weight:800;color:var(--a1);}
  .kpi-lbl{font-size:.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-top:.15rem;}
  .kpi-sub{font-size:.75rem;color:var(--muted);margin-top:.2rem;}
  .flow-type-badge{display:inline-block;padding:.2rem .6rem;border-radius:5px;font-size:.72rem;font-weight:700;margin-top:.3rem;}
  .flow-laminar{background:rgba(46,158,107,.1);color:var(--success);}
  .flow-transitional{background:rgba(232,148,58,.1);color:#e8943a;}
  .flow-turbulent{background:rgba(217,95,95,.1);color:var(--danger);}
  .roughness-bar-wrap{margin-bottom:1.2rem;}
  .roughness-bar-wrap .rb-label{font-size:.78rem;font-weight:600;color:var(--label);margin-bottom:.5rem;}
  .roughness-bar{height:8px;border-radius:4px;background:var(--border);overflow:hidden;}
  .roughness-fill{height:100%;border-radius:4px;background:linear-gradient(90deg,var(--a1),var(--a2));transition:width .5s cubic-bezier(.22,1,.36,1);}
  .cmp-table{width:100%;border-collapse:collapse;font-size:.84rem;}
  .cmp-table th{text-align:left;padding:.55rem .75rem;font-size:.72rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid var(--border);}
  .cmp-table td{padding:.6rem .75rem;border-bottom:1px solid var(--surf2);color:var(--text);}
  .cmp-table tr:last-child td{border-bottom:none;}
  .cmp-table tr.active-row td{background:rgba(59,111,212,.05);font-weight:600;}
  .cmp-table tr.active-row td:first-child{color:var(--a1);}
  .dot{width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:6px;}
  .dot-plastic{background:#3b82f6;}
  .dot-steel{background:#6b7280;}
  .dot-glass{background:#0ea5e9;}
  .drop-low{color:var(--success);}
  .drop-med{color:#e8943a;}
  .drop-high{color:var(--danger);}
  @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  .fade-in{animation:fadeIn .35s cubic-bezier(.22,1,.36,1) both;}
`

const materialData = {
  plastic: { roughness: 0.0015, label: 'Plastic', color: 'plastic', dot: 'dot-plastic', emoji: '🔵' },
  steel:   { roughness: 0.045,  label: 'Steel',   color: 'steel',   dot: 'dot-steel',   emoji: '⚙️' },
  glass:   { roughness: 0.0005, label: 'Glass',   color: 'glass',   dot: 'dot-glass',   emoji: '🔷' },
}

type Material = keyof typeof materialData

function calcFrictionFactor(Re: number, roughness: number, diameter: number) {
  if (Re < 2300) return 64 / Re
  const relRough = roughness / diameter
  return 0.25 / Math.pow(Math.log10(relRough / 3.7 + 5.74 / Math.pow(Re, 0.9)), 2)
}

function runCalc(material: Material, radius: number, length: number, velocity: number) {
  const mat = materialData[material]
  const diameter = radius * 2
  const area = Math.PI * radius * radius
  const flowRate = area * velocity
  const density = 1.225
  const viscosity = 1.81e-5
  const Re = (density * velocity * diameter) / viscosity
  const f = calcFrictionFactor(Re, mat.roughness / 1000, diameter)
  const pressureDrop = f * (length / diameter) * 0.5 * density * velocity * velocity
  let flowType = Re > 4000 ? 'Turbulent' : Re > 2300 ? 'Transitional' : 'Laminar'
  return { flowRate, Re, pressureDrop, f, flowType }
}

function dropLabel(pd: number) {
  if (pd < 50)  return { text: 'Very Low', cls: 'drop-low' }
  if (pd < 200) return { text: 'Low',      cls: 'drop-low' }
  if (pd < 800) return { text: 'Medium',   cls: 'drop-med' }
  return              { text: 'High',      cls: 'drop-high' }
}

export default function Simulation() {
  const [material, setMaterial] = useState<Material>('plastic')
  const [radius,   setRadius]   = useState('0.05')
  const [length,   setLength]   = useState('10')
  const [velocity, setVelocity] = useState('5')
  const [result,   setResult]   = useState<ReturnType<typeof runCalc> | null>(null)
  const [cmpRows,  setCmpRows]  = useState<Array<{ mat: Material } & ReturnType<typeof runCalc>> | null>(null)

  const handleRun = () => {
    const r = parseFloat(radius), l = parseFloat(length), v = parseFloat(velocity)
    if (!r || !l || !v || r <= 0 || l <= 0 || v <= 0) return
    setResult(runCalc(material, r, l, v))
    setCmpRows((Object.keys(materialData) as Material[]).map(m => ({ mat: m, ...runCalc(m, r, l, v) })))
  }

  const mat = materialData[material]
  const maxRoughness = materialData.steel.roughness

  return (
    <>
      <style>{S}</style>
      <div className="sim-bg"><div className="sim-grid-bg"/></div>
      <div className="sim-wrap">
        <Navbar variant="app"/>
        <main className="sim-main">
          <div className="sim-header">
            <h1 className="sim-title">Pipe Flow <span>Simulation</span></h1>
            <p className="sim-sub">Select a pipe material and configure parameters to compute flow characteristics</p>
          </div>

          <div className="sim-layout">
            {/* Inputs */}
            <div style={{display:'flex',flexDirection:'column',gap:'1.2rem'}}>
              <div className="card">
                <div className="card-title">Pipe Configuration</div>

                <div className="fg">
                  <label htmlFor="material">Pipe Material</label>
                  <div className="select-wrap">
                    <select id="material" value={material} onChange={e => setMaterial(e.target.value as Material)}>
                      <option value="plastic">🔵 Plastic</option>
                      <option value="steel">⚙️ Steel</option>
                      <option value="glass">🔷 Glass</option>
                    </select>
                  </div>
                  <div className="hint">Surface roughness: {mat.roughness} mm</div>
                </div>

                <div className={`pipe-preview mat-${mat.color}`}>
                  <span className="pipe-label">{mat.emoji} {mat.label} Pipe</span>
                  <div className="pipe-tube"/>
                </div>

                <div className="fg">
                  <label htmlFor="radius">Pipe Radius (m)</label>
                  <input id="radius" type="number" min="0.001" step="0.001" value={radius} onChange={e => setRadius(e.target.value)} placeholder="e.g. 0.05"/>
                </div>
                <div className="fg">
                  <label htmlFor="length">Pipe Length (m)</label>
                  <input id="length" type="number" min="0.1" step="0.1" value={length} onChange={e => setLength(e.target.value)} placeholder="e.g. 10"/>
                </div>
                <div className="fg">
                  <label htmlFor="velocity">Flow Velocity (m/s)</label>
                  <input id="velocity" type="number" min="0.01" step="0.1" value={velocity} onChange={e => setVelocity(e.target.value)} placeholder="e.g. 5"/>
                </div>

                <button className="run-btn" onClick={handleRun}>▶ Run Simulation</button>
              </div>
            </div>

            {/* Results */}
            <div className="results-section">
              {!result ? (
                <div className="card">
                  <div className="result-placeholder">
                    <div className="icon">🌊</div>
                    <p>Configure parameters and run the simulation to see results</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="card fade-in">
                    <div className="card-title">Simulation Results</div>
                    <div className={`res-mat-badge res-mat-${material}`}>
                      {mat.emoji} Material: {mat.label}
                    </div>
                    <div className="kpi-grid">
                      <div className="kpi-card">
                        <div className="kpi-val">{result.flowRate.toFixed(4)}</div>
                        <div className="kpi-lbl">Flow Rate (m³/s)</div>
                      </div>
                      <div className="kpi-card">
                        <div className="kpi-val">{result.Re.toFixed(0)}</div>
                        <div className="kpi-lbl">Reynolds Number</div>
                        <span className={`flow-type-badge flow-${result.flowType.toLowerCase()}`}>{result.flowType}</span>
                      </div>
                      <div className="kpi-card">
                        <div className="kpi-val">{result.pressureDrop.toFixed(2)}</div>
                        <div className="kpi-lbl">Pressure Drop (Pa)</div>
                        <div className={`kpi-sub ${dropLabel(result.pressureDrop).cls}`}>{dropLabel(result.pressureDrop).text}</div>
                      </div>
                      <div className="kpi-card">
                        <div className="kpi-val">{result.f.toFixed(5)}</div>
                        <div className="kpi-lbl">Friction Factor</div>
                      </div>
                    </div>
                    <div className="roughness-bar-wrap">
                      <div className="rb-label">Surface Roughness — {mat.roughness} mm</div>
                      <div className="roughness-bar">
                        <div className="roughness-fill" style={{width:`${(mat.roughness/maxRoughness)*100}%`}}/>
                      </div>
                    </div>
                  </div>

                  {cmpRows && (
                    <div className="card fade-in">
                      <div className="card-title">Material Comparison</div>
                      <table className="cmp-table">
                        <thead>
                          <tr>
                            <th>Material</th>
                            <th>Roughness (mm)</th>
                            <th>Pressure Drop (Pa)</th>
                            <th>Friction Factor</th>
                            <th>Drop Level</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cmpRows.map(row => {
                            const dl = dropLabel(row.pressureDrop)
                            return (
                              <tr key={row.mat} className={row.mat === material ? 'active-row' : ''}>
                                <td><span className={`dot dot-${row.mat}`}/>{materialData[row.mat].label}{row.mat === material ? ' ✓' : ''}</td>
                                <td>{materialData[row.mat].roughness}</td>
                                <td>{row.pressureDrop.toFixed(2)}</td>
                                <td>{row.f.toFixed(5)}</td>
                                <td><span className={dl.cls}>{dl.text}</span></td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
