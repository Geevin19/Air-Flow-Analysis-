import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import Navbar from '../components/Navbar'
import { simulationAPI, type SimulationResult } from '../services/api'

const S = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@700;800&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{--bg:#eef2f7;--surf:#ffffff;--surf2:#f5f8fc;--border:#dde3ec;--a1:#3b6fd4;--a2:#5b9bd5;--text:#1a2333;--muted:#6b7a90;--label:#44546a;--success:#2e9e6b;--danger:#d95f5f;}
  body{background:var(--bg);color:var(--text);font-family:'Inter',sans-serif;min-height:100vh;}
  .db-bg{position:fixed;inset:0;z-index:0;pointer-events:none;}
  .db-bg::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 55% 40% at 5% 10%,rgba(59,111,212,.07) 0%,transparent 50%),radial-gradient(ellipse 45% 35% at 95% 90%,rgba(91,155,213,.05) 0%,transparent 50%);}
  .db-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(59,111,212,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(59,111,212,.035) 1px,transparent 1px);background-size:36px 36px;}
  .db-wrap{position:relative;z-index:1;min-height:100vh;}
  .db-main{max-width:1280px;margin:0 auto;padding:2.5rem clamp(1rem,4vw,3rem);}
  .db-header{display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:1.5rem;margin-bottom:2.2rem;}
  .db-greeting{font-family:'Plus Jakarta Sans',sans-serif;font-size:clamp(1.5rem,3vw,2rem);font-weight:800;letter-spacing:-.02em;color:var(--text);}
  .db-greeting span{color:var(--a1);}
  .db-sub{font-size:.88rem;color:var(--muted);margin-top:.35rem;}
  .btn-new{display:inline-flex;align-items:center;gap:.45rem;padding:.72rem 1.4rem;background:linear-gradient(135deg,var(--a1),var(--a2));border:none;border-radius:9px;color:#fff;font-size:.88rem;font-weight:600;font-family:'Inter',sans-serif;cursor:pointer;text-decoration:none;transition:transform .18s,box-shadow .18s;box-shadow:0 3px 10px rgba(59,111,212,.25);white-space:nowrap;}
  .btn-new:hover{transform:translateY(-1px);box-shadow:0 5px 16px rgba(59,111,212,.32);}
  .stats-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(195px,1fr));gap:1.1rem;margin-bottom:2.2rem;}
  .stat-card{background:var(--surf);border:1px solid var(--border);border-radius:13px;padding:1.3rem;position:relative;overflow:hidden;transition:border-color .18s,transform .18s;box-shadow:0 1px 4px rgba(59,111,212,.04);}
  .stat-card:hover{border-color:rgba(59,111,212,.25);transform:translateY(-2px);}
  .stat-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:var(--sg,linear-gradient(90deg,var(--a1),var(--a2)));}
  .sc-icon{width:38px;height:38px;border-radius:9px;background:var(--si,rgba(59,111,212,.08));display:flex;align-items:center;justify-content:center;font-size:1.1rem;margin-bottom:.9rem;}
  .sc-val{font-family:'Plus Jakarta Sans',sans-serif;font-size:1.75rem;font-weight:800;color:var(--a1);}
  .sc-label{font-size:.75rem;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;margin-top:.15rem;}
  .toolbar{display:flex;gap:.65rem;flex-wrap:wrap;margin-bottom:1.6rem;align-items:center;}
  .search-wrap{position:relative;flex:1;min-width:200px;}
  .search-wrap svg{position:absolute;left:11px;top:50%;transform:translateY(-50%);color:var(--muted);pointer-events:none;}
  .search-inp{width:100%;padding:.62rem .62rem .62rem 2.4rem;background:var(--surf);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:.86rem;font-family:'Inter',sans-serif;outline:none;transition:border-color .18s;}
  .search-inp::placeholder{color:#b8c4d4;}
  .search-inp:focus{border-color:var(--a1);}
  .filter-btn{padding:.62rem .95rem;background:var(--surf);border:1px solid var(--border);border-radius:8px;color:var(--label);font-size:.83rem;font-family:'Inter',sans-serif;cursor:pointer;transition:border-color .18s,color .18s;white-space:nowrap;}
  .filter-btn:hover,.filter-btn.active{border-color:var(--a1);color:var(--a1);background:rgba(59,111,212,.04);}
  .sim-grid{display:grid;gap:.9rem;}
  .sim-card{background:var(--surf);border:1px solid var(--border);border-radius:13px;padding:1.3rem 1.5rem;display:grid;grid-template-columns:1fr auto;gap:1rem;align-items:center;transition:border-color .18s,transform .18s;text-decoration:none;color:inherit;box-shadow:0 1px 4px rgba(59,111,212,.04);}
  .sim-card:hover{border-color:rgba(59,111,212,.3);transform:translateX(3px);}
  .sim-name{font-size:.96rem;font-weight:700;color:var(--text);margin-bottom:.4rem;}
  .sim-tags{display:flex;gap:.6rem;flex-wrap:wrap;margin-bottom:.4rem;}
  .tag{font-size:.72rem;padding:.18rem .55rem;border-radius:5px;font-weight:600;letter-spacing:.02em;}
  .tag-v{background:rgba(59,111,212,.08);color:var(--a1);border:1px solid rgba(59,111,212,.15);}
  .tag-completed{background:rgba(46,158,107,.08);color:var(--success);border:1px solid rgba(46,158,107,.18);}
  .tag-running{background:rgba(59,111,212,.08);color:var(--a1);border:1px solid rgba(59,111,212,.18);animation:pulse 1.8s ease-in-out infinite;}
  .tag-pending{background:rgba(232,148,58,.08);color:#e8943a;border:1px solid rgba(232,148,58,.18);}
  .tag-failed{background:rgba(217,95,95,.08);color:var(--danger);border:1px solid rgba(217,95,95,.18);}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.55}}
  .sim-desc{font-size:.8rem;color:var(--muted);}
  .sim-kpis{display:flex;gap:1.2rem;flex-wrap:wrap;margin-top:.5rem;}
  .kpi-item{display:flex;flex-direction:column;gap:.08rem;}
  .kpi-val{font-size:.86rem;font-weight:700;color:var(--text);}
  .kpi-lbl{font-size:.68rem;color:var(--muted);text-transform:uppercase;letter-spacing:.03em;}
  .sim-right{display:flex;align-items:center;gap:.65rem;}
  .sim-date{font-size:.75rem;color:var(--muted);text-align:right;white-space:nowrap;}
  .del-btn{width:30px;height:30px;border-radius:7px;background:rgba(217,95,95,.07);border:1px solid rgba(217,95,95,.18);color:var(--danger);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .18s;flex-shrink:0;}
  .del-btn:hover{background:rgba(217,95,95,.15);}
  .empty{text-align:center;padding:4.5rem 2rem;background:var(--surf);border:1px solid var(--border);border-radius:14px;}
  .empty-icon{font-size:2.8rem;margin-bottom:.9rem;}
  .empty-title{font-family:'Plus Jakarta Sans',sans-serif;font-size:1.3rem;font-weight:800;color:var(--text);margin-bottom:.45rem;}
  .empty-sub{font-size:.87rem;color:var(--muted);margin-bottom:1.4rem;}
  .skeleton{background:linear-gradient(90deg,var(--surf) 25%,var(--surf2) 50%,var(--surf) 75%);background-size:200% 100%;animation:shimmer 1.4s infinite;border-radius:13px;height:90px;}
  @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
  @media(max-width:700px){.sim-card{grid-template-columns:1fr}.sim-right{justify-content:flex-start}.stats-grid{grid-template-columns:repeat(2,1fr)}}
  @media(max-width:420px){.stats-grid{grid-template-columns:1fr}}
`

const VI: Record<string,string> = {car:'🚗',truck:'🚛',motorcycle:'🏍️',aircraft:'✈️',drone:'🛸',custom:'🔧',default:'🌊'}

export default function Dashboard() {
  const navigate = useNavigate()
  const [sims,    setSims]    = useState<SimulationResult[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [filter,  setFilter]  = useState('all')

  const userStr = localStorage.getItem('user')
  const user    = userStr ? JSON.parse(userStr) : {first_name:'User'}

  useEffect(()=>{ fetch() },[])

  const fetch = async () => {
    try { const r = await simulationAPI.list(); setSims(r.data) }
    catch { toast.error('Failed to load simulations') }
    finally { setLoading(false) }
  }

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.preventDefault(); e.stopPropagation()
    if (!confirm('Delete this simulation?')) return
    try { await simulationAPI.delete(id); setSims(s=>s.filter(x=>x.id!==id)); toast.success('Deleted') }
    catch { toast.error('Failed to delete') }
  }

  const filtered = sims.filter(s=>{
    const ms = s.name.toLowerCase().includes(search.toLowerCase())||s.vehicle_type.toLowerCase().includes(search.toLowerCase())
    return ms && (filter==='all'||s.status===filter)
  })

  const completed = sims.filter(s=>s.status==='completed')
  const avgDrag   = completed.length ? completed.reduce((a,s)=>a+(s.drag_force||0),0)/completed.length : null
  const avgEff    = completed.length ? completed.reduce((a,s)=>a+(s.efficiency_score||0),0)/completed.length : null

  const statCards = [
    {icon:'🌊',label:'Total Simulations', val:sims.length.toString(),      sg:'linear-gradient(90deg,#3b6fd4,#5b9bd5)', si:'rgba(59,111,212,.08)'},
    {icon:'✅',label:'Completed',          val:completed.length.toString(), sg:'linear-gradient(90deg,#2e9e6b,#5b9bd5)', si:'rgba(46,158,107,.08)'},
    {icon:'💨',label:'Avg Drag (N)',        val:avgDrag!=null?avgDrag.toFixed(1):'—', sg:'linear-gradient(90deg,#5b7fd4,#3b6fd4)', si:'rgba(59,111,212,.08)'},
    {icon:'⚡',label:'Avg Efficiency',      val:avgEff!=null?avgEff.toFixed(1)+'%':'—', sg:'linear-gradient(90deg,#e8943a,#ffd32a)', si:'rgba(232,148,58,.08)'},
  ]

  const fmt = (d:string) => new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})

  return (
    <>
      <style>{S}</style>
      <div className="db-bg"><div className="db-grid"/></div>
      <div className="db-wrap">
        <Navbar variant="app"/>
        <main className="db-main">
          <div className="db-header">
            <div>
              <h1 className="db-greeting">Good day, <span>{user.first_name}</span> 👋</h1>
              <p className="db-sub">Here's an overview of your aerodynamics simulations</p>
            </div>
            <Link to="/simulation/new" className="btn-new">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New Simulation
            </Link>
          </div>

          <div className="stats-grid">
            {statCards.map(s=>(
              <div className="stat-card" key={s.label} style={{'--sg':s.sg,'--si':s.si} as React.CSSProperties}>
                <div className="sc-icon">{s.icon}</div>
                <div className="sc-val">{s.val}</div>
                <div className="sc-label">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="toolbar">
            <div className="search-wrap">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input className="search-inp" type="text" placeholder="Search simulations…" value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
            {['all','completed','running','pending','failed'].map(f=>(
              <button key={f} className={`filter-btn${filter===f?' active':''}`} onClick={()=>setFilter(f)}>
                {f.charAt(0).toUpperCase()+f.slice(1)}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="sim-grid">{[1,2,3].map(i=><div key={i} className="skeleton"/>)}</div>
          ) : filtered.length===0 ? (
            <div className="empty">
              <div className="empty-icon">🌊</div>
              <div className="empty-title">{search||filter!=='all'?'No results found':'No simulations yet'}</div>
              <div className="empty-sub">{search||filter!=='all'?'Try a different search or filter':'Run your first aerodynamics simulation to get started'}</div>
              {!search&&filter==='all'&&<Link to="/simulation/new" className="btn-new" style={{display:'inline-flex',margin:'0 auto'}}>Create Simulation</Link>}
            </div>
          ) : (
            <div className="sim-grid">
              {filtered.map(sim=>(
                <Link to={`/simulation/${sim.id}`} className="sim-card" key={sim.id}>
                  <div>
                    <div className="sim-name">{VI[sim.vehicle_type]||VI.default} {sim.name}</div>
                    <div className="sim-tags">
                      <span className="tag tag-v">{sim.vehicle_type}</span>
                      <span className={`tag tag-${sim.status}`}>{sim.status}</span>
                    </div>
                    {sim.description&&<div className="sim-desc">{sim.description}</div>}
                    {sim.status==='completed'&&(
                      <div className="sim-kpis">
                        {[['Drag',sim.drag_force?.toFixed(1)+' N'],['Lift',sim.lift_force?.toFixed(1)+' N'],['Velocity',sim.velocity+' m/s'],['Efficiency',sim.efficiency_score?.toFixed(1)+'%']].map(([l,v])=>(
                          <div className="kpi-item" key={l}><span className="kpi-val">{v}</span><span className="kpi-lbl">{l}</span></div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="sim-right">
                    <div className="sim-date">{fmt(sim.created_at)}</div>
                    <button className="del-btn" title="Delete" onClick={e=>handleDelete(e,sim.id)}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                    </button>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  )
}