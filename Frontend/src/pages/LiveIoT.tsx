import { useState, useEffect, useRef } from 'react'
import Navbar from '../components/Navbar'
import { iotAPI } from '../services/api'

const S = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@700;800&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{--bg:#eef2f7;--surf:#ffffff;--surf2:#f5f8fc;--border:#dde3ec;--a1:#3b6fd4;--a2:#5b9bd5;--text:#1a2333;--muted:#6b7a90;--success:#2e9e6b;--danger:#d95f5f;}
  body{background:var(--bg);color:var(--text);font-family:'Inter',sans-serif;min-height:100vh;}
  .iot-bg{position:fixed;inset:0;z-index:0;pointer-events:none;}
  .iot-bg::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 55% 40% at 5% 10%,rgba(59,111,212,.07) 0%,transparent 50%);}
  .iot-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(59,111,212,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(59,111,212,.035) 1px,transparent 1px);background-size:36px 36px;}
  .iot-wrap{position:relative;z-index:1;min-height:100vh;}
  .iot-main{max-width:1100px;margin:0 auto;padding:2.5rem clamp(1rem,4vw,3rem);}
  .iot-header{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;margin-bottom:2rem;}
  .iot-title{font-family:'Plus Jakarta Sans',sans-serif;font-size:clamp(1.5rem,3vw,2rem);font-weight:800;letter-spacing:-.02em;color:var(--text);}
  .iot-title span{color:var(--a1);}
  .live-badge{display:inline-flex;align-items:center;gap:.45rem;padding:.3rem .8rem;background:rgba(46,158,107,.1);border:1px solid rgba(46,158,107,.25);border-radius:100px;font-size:.75rem;font-weight:700;color:var(--success);}
  .live-dot{width:7px;height:7px;border-radius:50%;background:var(--success);animation:blink 1.5s ease-in-out infinite;}
  @keyframes blink{0%,100%{opacity:1}50%{opacity:.2}}
  .kpi-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:1rem;margin-bottom:1.8rem;}
  .kpi-card{background:var(--surf);border:1px solid var(--border);border-radius:13px;padding:1.3rem;box-shadow:0 1px 4px rgba(59,111,212,.04);position:relative;overflow:hidden;}
  .kpi-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,var(--a1),var(--a2));}
  .kpi-icon{font-size:1.4rem;margin-bottom:.6rem;}
  .kpi-val{font-family:'Plus Jakarta Sans',sans-serif;font-size:1.6rem;font-weight:800;color:var(--a1);}
  .kpi-lbl{font-size:.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-top:.15rem;}
  .card{background:var(--surf);border:1px solid var(--border);border-radius:14px;padding:1.6rem;box-shadow:0 1px 4px rgba(59,111,212,.04);}
  .card-title{font-size:.78rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:1.2rem;}
  .hist-table{width:100%;border-collapse:collapse;font-size:.84rem;}
  .hist-table th{text-align:left;padding:.55rem .75rem;font-size:.72rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid var(--border);}
  .hist-table td{padding:.6rem .75rem;border-bottom:1px solid var(--surf2);color:var(--text);}
  .hist-table tr:last-child td{border-bottom:none;}
  .hist-table tr:hover td{background:var(--surf2);}
  .empty{text-align:center;padding:3rem;color:var(--muted);font-size:.88rem;}
  .refresh-btn{padding:.45rem 1rem;background:var(--surf);border:1px solid var(--border);border-radius:8px;color:var(--label);font-size:.83rem;font-family:'Inter',sans-serif;cursor:pointer;transition:border-color .18s,color .18s;}
  .refresh-btn:hover{border-color:var(--a1);color:var(--a1);}
`

interface IoTReading { id?: number; velocity?: number; pressure?: number; temperature?: number; timestamp?: string }

export default function LiveIoT() {
  const [latest,  setLatest]  = useState<IoTReading | null>(null)
  const [history, setHistory] = useState<IoTReading[]>([])
  const [loading, setLoading] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchData = async () => {
    try {
      const [latRes, histRes] = await Promise.all([iotAPI.getLatest(), iotAPI.getHistory(20)])
      setLatest(latRes.data)
      setHistory(histRes.data)
    } catch { /* backend may not be running */ }
    finally { setLoading(false) }
  }

  useEffect(() => {
    fetchData()
    intervalRef.current = setInterval(fetchData, 5000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [])

  const fmt = (d?: string) => d ? new Date(d).toLocaleTimeString() : '—'

  return (
    <>
      <style>{S}</style>
      <div className="iot-bg"><div className="iot-grid"/></div>
      <div className="iot-wrap">
        <Navbar variant="app"/>
        <main className="iot-main">
          <div className="iot-header">
            <div>
              <h1 className="iot-title">Live <span>IoT Feed</span></h1>
              <p style={{fontSize:'.88rem',color:'var(--muted)',marginTop:'.3rem'}}>Real-time sensor data — refreshes every 5 seconds</p>
            </div>
            <div style={{display:'flex',gap:'.75rem',alignItems:'center'}}>
              <span className="live-badge"><span className="live-dot"/>LIVE</span>
              <button className="refresh-btn" onClick={fetchData}>↻ Refresh</button>
            </div>
          </div>

          <div className="kpi-grid">
            {[
              { icon: '💨', label: 'Velocity (m/s)',    val: latest?.velocity?.toFixed(2)    ?? '—' },
              { icon: '🔵', label: 'Pressure (Pa)',     val: latest?.pressure?.toFixed(2)    ?? '—' },
              { icon: '🌡️', label: 'Temperature (°C)',  val: latest?.temperature?.toFixed(1) ?? '—' },
              { icon: '🕐', label: 'Last Reading',      val: fmt(latest?.timestamp) },
            ].map(k => (
              <div className="kpi-card" key={k.label}>
                <div className="kpi-icon">{k.icon}</div>
                <div className="kpi-val">{k.val}</div>
                <div className="kpi-lbl">{k.label}</div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-title">Recent Readings</div>
            {loading ? (
              <div className="empty">Loading sensor data...</div>
            ) : history.length === 0 ? (
              <div className="empty">No IoT data available. Connect a sensor to start streaming.</div>
            ) : (
              <table className="hist-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Velocity (m/s)</th>
                    <th>Pressure (Pa)</th>
                    <th>Temperature (°C)</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((r, i) => (
                    <tr key={r.id ?? i}>
                      <td>{i + 1}</td>
                      <td>{r.velocity?.toFixed(2) ?? '—'}</td>
                      <td>{r.pressure?.toFixed(2) ?? '—'}</td>
                      <td>{r.temperature?.toFixed(1) ?? '—'}</td>
                      <td>{fmt(r.timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>
    </>
  )
}
