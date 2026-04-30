import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

interface Worker { id: number; username: string; email: string; purpose?: string; created_at: string; }
interface LimitReq { id: number; worker_id: number; metric: string; value: number; status: string; created_at: string; }
interface AlertItem { id: number; user_id: number; metric: string; value: number; limit: number; level: string; created_at: string; }

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const [workers, setWorkers]           = useState<Worker[]>([]);
  const [pending, setPending]           = useState<LimitReq[]>([]);
  const [alerts, setAlerts]             = useState<AlertItem[]>([]);
  const [simulations, setSimulations]   = useState<any[]>([]);
  const [tab, setTab]                   = useState<'workers'|'iot'|'approvals'|'alerts'|'simulations'>('workers');
  const [loading, setLoading]           = useState(true);
  const [user, setUser]                 = useState<any>(null);
  const [showProfile, setShowProfile]   = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<Worker|null>(null);
  const [workerIot, setWorkerIot]       = useState<any>(null);
  const [workerIotLoading, setWorkerIotLoading] = useState(false);
  // Limits (manager sets these — synced to Arduino + worker pages)
  const [limits, setLimits]             = useState({ temp: '', hum: '', gas: '' });
  const [limitSaving, setLimitSaving]   = useState(false);
  const [limitMsg, setLimitMsg]         = useState('');
  // IoT state
  const [iotData, setIotData]           = useState<any>(null);
  const [iotLastTime, setIotLastTime]   = useState('');
  const [pipe1D, setPipe1D]             = useState(0.05);
  const [pipe2D, setPipe2D]             = useState(0.05);
  const iotPollRef = useRef<ReturnType<typeof setInterval>|null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [u, w, p, a, sims] = await Promise.all([
          api.get('/users/me'),
          api.get('/manager/workers'),
          api.get('/limits/pending'),
          api.get('/alerts'),
          api.get('/simulations'),
        ]);
        setUser(u.data);
        if (u.data.role !== 'manager') { navigate('/dashboard'); return; }
        setWorkers(w.data);
        setPending(p.data);
        setAlerts(a.data);
        setSimulations(sims.data);
        // Load current limits from backend
        const cfg = await api.get('/iot/config');
        setLimits({
          temp: cfg.data.temp_limit?.toString() || '',
          hum:  cfg.data.humidity_limit?.toString() || '',
          gas:  cfg.data.gas_limit?.toString() || '',
        });
      } catch { navigate('/login'); }
      finally { setLoading(false); }
    })();
  }, [navigate]);

  const review = async (id: number, action: 'approved'|'rejected') => {
    await api.post(`/limits/${id}/review?action=${action}`);
    setPending(p => p.filter(r => r.id !== id));
  };

  const removeWorker = async (workerId: number) => {
    if (!confirm('Remove this worker from your team?')) return;
    await api.delete(`/manager/workers/${workerId}`);
    setWorkers(w => w.filter(x => x.id !== workerId));
    if (selectedWorker?.id === workerId) setSelectedWorker(null);
  };

  const openWorker = async (worker: Worker) => {
    setSelectedWorker(worker);
    setWorkerIotLoading(true);
    try {
      const r = await api.get(`/manager/workers/${worker.id}/iot`);
      setWorkerIot(r.data);
    } catch { setWorkerIot(null); }
    finally { setWorkerIotLoading(false); }
  };

  const saveLimits = async () => {
    setLimitSaving(true); setLimitMsg('');
    try {
      await api.post('/iot/config', {
        temp_limit:     parseFloat(limits.temp) || 35,
        humidity_limit: parseFloat(limits.hum)  || 70,
        gas_limit:      parseInt(limits.gas)    || 500,
      });
      setLimitMsg('✓ Limits saved and sent to Arduino');
      setTimeout(() => setLimitMsg(''), 3000);
    } catch { setLimitMsg('Failed to save limits'); }
    finally { setLimitSaving(false); }
  };

  // Poll IoT data when on IoT tab
  useEffect(() => {
    if (tab === 'iot') {
      const poll = async () => {
        try {
          const r = await api.get('/manager/iot/live');
          if (r.data.latest && Object.keys(r.data.latest).length > 0) {
            setIotData(r.data.latest);
            setIotLastTime(new Date().toLocaleTimeString());
          }
        } catch { /* ignore */ }
      };
      poll();
      iotPollRef.current = setInterval(poll, 2000);
    } else {
      if (iotPollRef.current) clearInterval(iotPollRef.current);
    }
    return () => { if (iotPollRef.current) clearInterval(iotPollRef.current); };
  }, [tab]);

  const logout = () => { localStorage.removeItem('token'); navigate('/login'); };

  if (loading) return <div style={s.loading}><div style={s.spinner} /></div>;

  return (
    <div style={s.page}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');*{box-sizing:border-box;}@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <nav style={s.nav}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <img src="/logo.png" alt="" style={{ width:32, height:32, borderRadius:8, objectFit:'contain' }} />
          <span style={s.logo}>SmartTracker</span>
          <span style={s.badge}>Manager</span>
        </div>

        {/* Profile dropdown only — no code in nav bar */}

        <div style={{ display:'flex', alignItems:'center', gap:10, position:'relative' }} data-profile="true">
          <button onClick={() => setShowProfile(v => !v)}
            style={{ display:'flex', alignItems:'center', gap:8, background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:10, padding:'7px 14px', cursor:'pointer', fontFamily:'"Inter",sans-serif' }}>
            <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,#f59e0b,#d97706)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700 }}>
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <span style={{ fontSize:13, fontWeight:600, color:'#374151' }}>{user?.username}</span>
            <span style={{ fontSize:10, color:'#94a3b8' }}>{showProfile ? '▲' : '▼'}</span>
          </button>

          {showProfile && (
            <div style={{ position:'absolute', top:'calc(100% + 8px)', right:0, background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, boxShadow:'0 8px 32px rgba(0,0,0,.12)', minWidth:280, zIndex:100, overflow:'hidden' }}>
              <div style={{ background:'linear-gradient(135deg,#1e3a8a,#3b82f6)', padding:'18px 20px' }}>
                <div style={{ width:44, height:44, borderRadius:'50%', background:'rgba(255,255,255,.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontWeight:800, color:'#fff', marginBottom:10 }}>
                  {user?.username?.[0]?.toUpperCase()}
                </div>
                <div style={{ fontSize:15, fontWeight:700, color:'#fff' }}>{user?.username}</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,.7)', marginTop:2 }}>{user?.email}</div>
              </div>
              <div style={{ padding:'16px 20px', borderBottom:'1px solid #f1f5f9' }}>
                {user?.manager_code ? (
                  <>
                    <div style={{ fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:8 }}>Manager Code</div>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'#f0f7ff', border:'1px solid #bfdbfe', borderRadius:10, padding:'10px 14px' }}>
                      <span style={{ fontSize:17, fontWeight:800, color:'#1d4ed8', fontFamily:'monospace', letterSpacing:'0.05em' }}>{user.manager_code}</span>
                      <button onClick={() => navigator.clipboard.writeText(user.manager_code)}
                        style={{ fontSize:11, color:'#1d4ed8', background:'#dbeafe', border:'1px solid #bfdbfe', borderRadius:6, padding:'4px 10px', cursor:'pointer', fontFamily:'"Inter",sans-serif', fontWeight:700 }}>
                        Copy
                      </button>
                    </div>
                    <div style={{ fontSize:11, color:'#94a3b8', marginTop:6 }}>Share with workers when they register</div>
                  </>
                ) : (
                  <div style={{ fontSize:12, color:'#94a3b8' }}>Generating code…</div>
                )}
              </div>
              <div style={{ padding:'8px' }}>
                <button onClick={logout} style={{ width:'100%', padding:'9px 14px', background:'#fef2f2', color:'#dc2626', border:'1px solid #fecaca', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'"Inter",sans-serif', textAlign:'left' as const }}>
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      <main style={s.main}>
        <div style={s.header}>
          <h2 style={s.title}>Manager Dashboard</h2>
          <button style={s.workerBtn} onClick={() => navigate('/simulation')}>+ New Simulation</button>
        </div>

        {/* Stats */}
        <div style={s.statsRow}>
          {[
            { val: workers.length,                              label: 'Total Workers',    color: '#3b82f6' },
            { val: pending.length,                              label: 'Pending Approvals', color: '#f59e0b' },
            { val: alerts.filter(a => a.level==='critical').length, label: 'Critical Alerts', color: '#ef4444' },
          ].map(st => (
            <div key={st.label} style={s.statCard}>
              <div style={{ fontSize:32, fontWeight:800, color:st.color, fontFamily:'monospace' }}>{st.val}</div>
              <div style={{ fontSize:12, color:'#94a3b8', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', marginTop:6 }}>{st.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={s.tabs}>
          {(['workers','iot','simulations','approvals','alerts'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ ...s.tab, ...(tab===t ? s.tabActive : {}) }}>
              {t === 'workers'     ? `Workers (${workers.length})` :
               t === 'iot'         ? 'Live IoT' :
               t === 'simulations' ? `Simulations (${simulations.length})` :
               t === 'approvals'   ? `Approvals (${pending.length})` :
               `Alerts (${alerts.length})`}
            </button>
          ))}
        </div>

        {/* Workers tab */}
        {tab === 'workers' && (
          <div>
            {/* Limits panel — manager sets, syncs to Arduino + workers */}
            <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:16, padding:'20px 24px', marginBottom:20 }}>
              <div style={{ fontSize:15, fontWeight:700, color:'#0f172a', marginBottom:4 }}>Alert Limits</div>
              <div style={{ fontSize:12, color:'#64748b', marginBottom:16 }}>Set limits here — instantly sent to Arduino and visible on all worker pages</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr auto', gap:12, alignItems:'end' }}>
                {[
                  { label:'Temperature (°C)', key:'temp' as const, placeholder:'e.g. 35' },
                  { label:'Humidity (%)',      key:'hum'  as const, placeholder:'e.g. 70' },
                  { label:'Gas (ppm)',         key:'gas'  as const, placeholder:'e.g. 500' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ display:'block', fontSize:11, fontWeight:600, color:'#374151', marginBottom:6 }}>{f.label}</label>
                    <input type="number" placeholder={f.placeholder} value={limits[f.key]}
                      onChange={e => setLimits(l => ({ ...l, [f.key]: e.target.value }))}
                      style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:14, fontFamily:'monospace', fontWeight:600, outline:'none', color:'#0f172a' }} />
                  </div>
                ))}
                <button onClick={saveLimits} disabled={limitSaving}
                  style={{ padding:'9px 20px', background:'linear-gradient(135deg,#2563eb,#7c3aed)', color:'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'"Inter",sans-serif', whiteSpace:'nowrap' as const }}>
                  {limitSaving ? 'Saving…' : 'Save & Send'}
                </button>
              </div>
              {limitMsg && <p style={{ fontSize:12, color: limitMsg.startsWith('✓') ? '#16a34a' : '#dc2626', marginTop:10, fontWeight:600 }}>{limitMsg}</p>}
            </div>

            {/* Worker detail panel */}
            {selectedWorker && (
              <div style={{ background:'#f0f9ff', border:'1.5px solid #bfdbfe', borderRadius:16, padding:'20px 24px', marginBottom:20 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                  <div>
                    <div style={{ fontSize:15, fontWeight:700, color:'#1d4ed8' }}>{selectedWorker.username}</div>
                    <div style={{ fontSize:12, color:'#64748b' }}>{selectedWorker.email}</div>
                  </div>
                  <button onClick={() => setSelectedWorker(null)}
                    style={{ background:'none', border:'none', fontSize:18, cursor:'pointer', color:'#94a3b8' }}>✕</button>
                </div>
                {workerIotLoading ? (
                  <div style={{ fontSize:13, color:'#64748b' }}>Loading sensor data…</div>
                ) : workerIot?.data ? (
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
                    {[
                      { label:'Temperature', value: workerIot.data.temperature?.toFixed(1), unit:'°C', color:'#f97316' },
                      { label:'Humidity',    value: workerIot.data.humidity?.toFixed(1),    unit:'%',  color:'#6366f1' },
                      { label:'Gas',         value: workerIot.data.gas?.toFixed(0),         unit:'ppm',color:'#ef4444' },
                    ].map(m => (
                      <div key={m.label} style={{ background:'#fff', borderRadius:10, padding:'14px 16px', border:'1px solid #dbeafe' }}>
                        <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', marginBottom:4 }}>{m.label}</div>
                        <div style={{ fontSize:22, fontWeight:800, color:m.color, fontFamily:'monospace' }}>
                          {m.value ?? '—'} <span style={{ fontSize:12, color:'#94a3b8' }}>{m.unit}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize:13, color:'#64748b' }}>No live sensor data available for this worker yet.</div>
                )}
              </div>
            )}

            {/* Workers table */}
            <div style={s.card}>
              {workers.length === 0 ? (
                <div style={s.empty}>No workers registered under your account yet.</div>
              ) : (
                <table style={s.table}>
                  <thead>
                    <tr>{['Username','Email','Purpose','Joined','Actions'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {workers.map(w => (
                      <tr key={w.id} style={{ ...s.tr, background: selectedWorker?.id === w.id ? '#eff6ff' : 'transparent', cursor:'pointer' }}
                        onClick={() => openWorker(w)}>
                        <td style={s.td}><strong style={{ color:'#1d4ed8' }}>{w.username}</strong></td>
                        <td style={s.td}>{w.email}</td>
                        <td style={s.td}>{w.purpose || '—'}</td>
                        <td style={s.td}>{new Date(w.created_at).toLocaleDateString()}</td>
                        <td style={s.td} onClick={e => e.stopPropagation()}>
                          <button onClick={() => removeWorker(w.id)}
                            style={{ padding:'4px 12px', background:'#fef2f2', color:'#dc2626', border:'1px solid #fecaca', borderRadius:6, cursor:'pointer', fontSize:12, fontWeight:600, fontFamily:'"Inter",sans-serif' }}>
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* IoT tab — navigate to dedicated page */}
        {tab === 'iot' && (
          <div style={{ background:'#fff', borderRadius:16, padding:'48px 24px', textAlign:'center', border:'1px solid #e2e8f0' }}>
            <div style={{ fontSize:48, marginBottom:16 }}>📡</div>
            <h3 style={{ fontSize:18, fontWeight:700, color:'#0f172a', marginBottom:8 }}>Manager IoT Dashboard</h3>
            <p style={{ fontSize:14, color:'#64748b', marginBottom:24 }}>View live sensor data from workers, set limits, and analyse pipe physics.</p>
            <button onClick={() => navigate('/manager/iot')}
              style={{ padding:'12px 32px', background:'linear-gradient(135deg,#2563eb,#7c3aed)', color:'#fff', border:'none', borderRadius:12, fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:'"Inter",sans-serif', boxShadow:'0 4px 14px rgba(37,99,235,.3)' }}>
              Open IoT Dashboard →
            </button>
          </div>
        )}

        {/* Simulations tab */}
        {tab === 'simulations' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <span style={{ fontSize:14, color:'#64748b' }}>{simulations.length} simulations</span>
              <button style={s.workerBtn} onClick={() => navigate('/simulation')}>+ New Simulation</button>
            </div>
            {simulations.length === 0 ? (
              <div style={{ ...s.card }}>
                <div style={s.empty}>No simulations yet. Create your first simulation.</div>
              </div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:16 }}>
                {simulations.map((sim: any) => (
                  <div key={sim.id} style={{ background:'#fff', borderRadius:16, padding:'20px', border:'1px solid #e2e8f0', cursor:'pointer', boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}
                    onClick={() => navigate(`/simulation?id=${sim.id}`)}>
                    <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>Simulation</div>
                    <h4 style={{ fontSize:15, fontWeight:700, color:'#0f172a', margin:'0 0 6px' }}>{sim.name}</h4>
                    <p style={{ fontSize:12, color:'#94a3b8', margin:'0 0 14px' }}>{new Date(sim.created_at).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}</p>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:999, background: sim.results?'#dcfce7':'#fef9c3', color: sim.results?'#16a34a':'#a16207', border:`1px solid ${sim.results?'#bbf7d0':'#fde68a'}` }}>
                        {sim.results ? 'Completed' : 'Pending'}
                      </span>
                      <span style={{ fontSize:12, color:'#3b82f6', fontWeight:600 }}>View →</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Approvals tab */}
        {tab === 'approvals' && (
          <div style={s.card}>
            {pending.length === 0 ? (
              <div style={s.empty}>No pending limit requests.</div>
            ) : (
              <table style={s.table}>
                <thead><tr>{['Worker ID','Metric','Requested Value','Requested At','Actions'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {pending.map(r => (
                    <tr key={r.id} style={s.tr}>
                      <td style={s.td}>#{r.worker_id}</td>
                      <td style={s.td}><strong>{r.metric}</strong></td>
                      <td style={s.td}>{r.value}</td>
                      <td style={s.td}>{new Date(r.created_at).toLocaleString()}</td>
                      <td style={s.td}>
                        <div style={{ display:'flex', gap:8 }}>
                          <button onClick={() => review(r.id, 'approved')} style={s.approveBtn}>Approve</button>
                          <button onClick={() => review(r.id, 'rejected')} style={s.rejectBtn}>Reject</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Alerts tab */}
        {tab === 'alerts' && (
          <div style={s.card}>
            {alerts.length === 0 ? (
              <div style={s.empty}>No alerts recorded.</div>
            ) : (
              <table style={s.table}>
                <thead><tr>{['Worker','Metric','Value','Limit','Level','Time'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {alerts.map(a => (
                    <tr key={a.id} style={{ ...s.tr, background: a.level==='critical' ? '#fef2f2' : 'transparent' }}>
                      <td style={s.td}>#{a.user_id}</td>
                      <td style={s.td}>{a.metric}</td>
                      <td style={{ ...s.td, color: a.level==='critical' ? '#dc2626' : '#f59e0b', fontWeight:700 }}>{a.value.toFixed(4)}</td>
                      <td style={s.td}>{a.limit}</td>
                      <td style={s.td}>
                        <span style={{ padding:'2px 8px', borderRadius:999, fontSize:11, fontWeight:700,
                          background: a.level==='critical' ? '#fef2f2' : '#fef9c3',
                          color: a.level==='critical' ? '#dc2626' : '#a16207',
                          border: `1px solid ${a.level==='critical' ? '#fca5a5' : '#fde68a'}` }}>
                          {a.level}
                        </span>
                      </td>
                      <td style={s.td}>{new Date(a.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// ── Physics helpers (same as LiveIoT) ────────────────────────────────────────
function satP(Tk: number) { const T=Tk-273.15; return 610.78*Math.exp((17.27*T)/(T+237.3)); }
function calcPhysics(temp: number, hum: number, pipeD: number) {
  const K=0.04, T1=temp+273.15, T2=(temp-2)+273.15;
  const Pv=(hum/100)*satP(T1), rho=(((101325-Pv)/(287.05*T1))+(Pv/(461.5*T1)));
  const mu=1.716e-5*Math.pow(T1/273.15,1.5)*((273.15+110.4)/(T1+110.4));
  const v=Math.sqrt((2*K*(T1-T2))/rho), A=Math.PI*(pipeD/2)**2, Q=A*v;
  const Re=mu>0?(rho*v*pipeD)/mu:0;
  return { rho, v, Q, mdot:rho*Q, q:0.5*rho*v*v, Re, regime:Re<2300?'Laminar':Re<4000?'Transition':'Turbulent' };
}
function calcGasPipe(gas: number, pipeD: number) {
  const v=gas/1000, A=Math.PI*(pipeD/2)**2, Q=A*v, rho=1.2, Re=(rho*v*pipeD)/1.8e-5;
  return { v, Q, rho, Re, q:0.5*rho*v*v, regime:Re<2300?'Laminar':Re<4000?'Transition':'Turbulent' };
}

// ── Manager IoT View ──────────────────────────────────────────────────────────
function ManagerIoTView({ iotData, lastTime, limits, setLimits, alerted, setAlerted, pipe1D, setPipe1D, pipe2D, setPipe2D }: {
  iotData: any; lastTime: string;
  limits: Record<string,string>; setLimits: (v:Record<string,string>)=>void;
  alerted: Set<string>; setAlerted: (v:Set<string>)=>void;
  pipe1D: number; setPipe1D: (v:number)=>void;
  pipe2D: number; setPipe2D: (v:number)=>void;
}) {
  const [showLimits, setShowLimits] = useState(false);
  const [showPipes, setShowPipes]   = useState(false);

  const temp = iotData?.temperature ?? iotData?.temp;
  const hum  = iotData?.humidity;
  const gas  = iotData?.gas;

  const p1 = (temp != null && hum != null) ? calcPhysics(temp, hum, pipe1D) : null;
  const p2 = gas != null ? calcGasPipe(gas, pipe2D) : null;

  const setLimit = (key: string, val: string) => {
    const updated = { ...limits, [key]: val };
    setLimits(updated);
    // Manager sets limits directly
    const numVal = parseFloat(val);
    if (!isNaN(numVal)) {
      const body: Record<string,number> = {};
      if (key==='temperature') body['temp_limit'] = numVal;
      else if (key==='humidity') body['humidity_limit'] = numVal;
      else body[key+'_limit'] = numVal;
      fetch(`${import.meta.env.VITE_API_URL||''}/iot/config`, {
        method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)
      }).catch(()=>{});
    }
  };

  return (
    <div>
      {/* Status bar */}
      <div style={{ display:'flex', alignItems:'center', gap:12, background:'#fff', padding:'10px 16px', borderRadius:12, marginBottom:16, border:'1px solid #e2e8f0', flexWrap:'wrap' as const }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ width:8, height:8, borderRadius:'50%', background: iotData?'#22c55e':'#f59e0b', display:'inline-block' }} />
          <span style={{ fontSize:13, fontWeight:600, color:'#1e293b' }}>{iotData ? 'Live data from workers' : 'Waiting for sensor data…'}</span>
        </div>
        {lastTime && <span style={{ fontSize:12, color:'#94a3b8', marginLeft:'auto' }}>Last update: {lastTime}</span>}
        <button onClick={() => setShowPipes(v=>!v)} style={{ fontSize:12, padding:'5px 12px', background: showPipes?'#0369a1':'#f1f5f9', color: showPipes?'#fff':'#374151', border:'1px solid #e2e8f0', borderRadius:8, cursor:'pointer' }}>Pipes</button>
        <button onClick={() => setShowLimits(v=>!v)} style={{ fontSize:12, padding:'5px 12px', background: showLimits?'#dc2626':'#f1f5f9', color: showLimits?'#fff':'#374151', border:'1px solid #e2e8f0', borderRadius:8, cursor:'pointer' }}>Limits</button>
      </div>

      {/* Pipe diameter editor */}
      {showPipes && (
        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:'16px 20px', marginBottom:16 }}>
          <div style={{ fontSize:14, fontWeight:700, color:'#0f172a', marginBottom:12 }}>Pipe Diameter Settings</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            {[{label:'Pipe 1 — Temp/Humidity', val:pipe1D, set:setPipe1D, key:'p1'},{label:'Pipe 2 — Gas Sensor', val:pipe2D, set:setPipe2D, key:'p2'}].map(p=>(
              <div key={p.key} style={{ background:'#f8fafc', borderRadius:10, padding:'14px 16px', border:'1px solid #e2e8f0' }}>
                <div style={{ fontSize:12, fontWeight:600, color:'#374151', marginBottom:8 }}>{p.label}</div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <button onClick={()=>p.set(Math.max(0.01,parseFloat((p.val-0.005).toFixed(3))))} style={{ width:32,height:32,borderRadius:8,border:'1px solid #e2e8f0',background:'#fff',fontSize:18,cursor:'pointer' }}>−</button>
                  <div style={{ flex:1,textAlign:'center',fontSize:18,fontWeight:800,color:'#1d4ed8',fontFamily:'monospace' }}>{p.val.toFixed(3)} <span style={{fontSize:12,color:'#94a3b8'}}>m</span></div>
                  <button onClick={()=>p.set(parseFloat((p.val+0.005).toFixed(3)))} style={{ width:32,height:32,borderRadius:8,border:'1px solid #e2e8f0',background:'#fff',fontSize:18,cursor:'pointer' }}>+</button>
                </div>
                <input type="range" min="0.01" max="0.5" step="0.005" value={p.val} onChange={e=>p.set(parseFloat(e.target.value))} style={{width:'100%',marginTop:8,accentColor:'#3b82f6'}} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Limits panel */}
      {showLimits && (
        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:'16px 20px', marginBottom:16 }}>
          <div style={{ fontSize:14, fontWeight:700, color:'#0f172a', marginBottom:12 }}>Alert Limits (Manager sets directly)</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
            <div style={{ background:'#eff6ff', borderRadius:10, padding:'12px 14px', border:'1px solid #bfdbfe' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#1d4ed8', marginBottom:8 }}>Pipe 1 — Temp · Humidity</div>
              {[{key:'temperature',label:'Temperature',unit:'°C'},{key:'humidity',label:'Humidity',unit:'%'}].map(m=>(
                <div key={m.key} style={{ marginBottom:8 }}>
                  <div style={{ fontSize:11, color:'#64748b', marginBottom:4 }}>{m.label} ({m.unit})</div>
                  <input type="number" placeholder="No limit" value={limits[m.key]??''} onBlur={e=>{if(e.target.value)setLimit(m.key,e.target.value);}} onChange={e=>setLimits({...limits,[m.key]:e.target.value})}
                    style={{ width:'100%',padding:'7px 10px',border:'1px solid #bfdbfe',borderRadius:8,fontSize:13,fontFamily:'monospace',fontWeight:600,outline:'none',background:'#fff',color:'#0f172a' }} />
                </div>
              ))}
            </div>
            <div style={{ background:'#fef2f2', borderRadius:10, padding:'12px 14px', border:'1px solid #fecaca' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#dc2626', marginBottom:8 }}>Pipe 2 — Gas Sensor</div>
              <div style={{ fontSize:11, color:'#64748b', marginBottom:4 }}>Gas (ppm)</div>
              <input type="number" placeholder="No limit" value={limits['gas']??''} onBlur={e=>{if(e.target.value)setLimit('gas',e.target.value);}} onChange={e=>setLimits({...limits,gas:e.target.value})}
                style={{ width:'100%',padding:'7px 10px',border:'1px solid #fecaca',borderRadius:8,fontSize:13,fontFamily:'monospace',fontWeight:600,outline:'none',background:'#fff',color:'#0f172a' }} />
            </div>
          </div>
        </div>
      )}

      {/* 2-pipe dashboard */}
      {!iotData ? (
        <div style={{ background:'#fff', borderRadius:16, padding:'48px 24px', textAlign:'center', border:'1px solid #e2e8f0' }}>
          <p style={{ fontSize:16, fontWeight:700, color:'#0f172a', margin:'0 0 6px' }}>No sensor data yet</p>
          <p style={{ fontSize:13, color:'#64748b' }}>Workers' Arduino must be running and sending data</p>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          {/* Pipe 1 */}
          <div style={{ background:'#fff', borderRadius:16, border:'2px solid #3b82f6', overflow:'hidden' }}>
            <div style={{ background:'linear-gradient(135deg,#1e3a8a,#3b82f6)', padding:'14px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div><div style={{ fontSize:13, fontWeight:800, color:'#fff' }}>Pipe 1</div><div style={{ fontSize:11, color:'rgba(255,255,255,.7)' }}>Temperature · Humidity · Air Flow</div></div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,.8)', fontFamily:'monospace' }}>Ø {(pipe1D*100).toFixed(1)} cm</div>
            </div>
            <div style={{ padding:'16px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
                {[{k:'temperature',l:'Temperature',u:'°C',c:'#f97316'},{k:'humidity',l:'Humidity',u:'%',c:'#6366f1'}].map(m=>(
                  <div key={m.k} style={{ background:'#f8fafc', borderRadius:10, padding:'14px', border:`1px solid ${alerted.has(m.k)?'#fca5a5':'#e2e8f0'}`, minHeight:80 }}>
                    <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', marginBottom:4 }}>{m.l}</div>
                    <div style={{ fontSize:22, fontWeight:800, color:alerted.has(m.k)?'#dc2626':m.c, fontFamily:'monospace' }}>
                      {(iotData[m.k]??iotData[m.k==='temperature'?'temp':m.k])?.toFixed(2) ?? '—'} <span style={{fontSize:12,color:'#94a3b8'}}>{m.u}</span>
                    </div>
                  </div>
                ))}
              </div>
              {p1 && (
                <div style={{ background:'#f0f9ff', borderRadius:10, padding:'12px 14px', border:'1px solid #bfdbfe' }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'#1d4ed8', textTransform:'uppercase', marginBottom:8, display:'flex', justifyContent:'space-between' }}>
                    <span>Physics</span>
                    <span style={{ background:p1.regime==='Laminar'?'#dcfce7':p1.regime==='Transition'?'#fef9c3':'#fef2f2', color:p1.regime==='Laminar'?'#16a34a':p1.regime==='Transition'?'#a16207':'#dc2626', padding:'1px 8px', borderRadius:999, fontSize:10 }}>{p1.regime}</span>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                    {[{l:'Velocity',v:p1.v.toFixed(4),u:'m/s'},{l:'Flow Q',v:p1.Q.toFixed(6),u:'m³/s'},{l:'Reynolds',v:p1.Re.toFixed(0),u:''},{l:'Mass Flow',v:p1.mdot.toFixed(6),u:'kg/s'}].map(m=>(
                      <div key={m.l}><div style={{fontSize:9,color:'#64748b',fontWeight:600,textTransform:'uppercase'}}>{m.l}</div><div style={{fontSize:13,fontWeight:700,color:'#1e293b',fontFamily:'monospace'}}>{m.v} <span style={{fontSize:10,color:'#94a3b8'}}>{m.u}</span></div></div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Pipe 2 */}
          <div style={{ background:'#fff', borderRadius:16, border:'2px solid #ef4444', overflow:'hidden' }}>
            <div style={{ background:'linear-gradient(135deg,#7f1d1d,#ef4444)', padding:'14px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div><div style={{ fontSize:13, fontWeight:800, color:'#fff' }}>Pipe 2</div><div style={{ fontSize:11, color:'rgba(255,255,255,.7)' }}>Gas Sensor · Flow Analysis</div></div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,.8)', fontFamily:'monospace' }}>Ø {(pipe2D*100).toFixed(1)} cm</div>
            </div>
            <div style={{ padding:'16px' }}>
              <div style={{ background:'#fef2f2', borderRadius:10, padding:'14px', border:`1px solid ${alerted.has('gas')?'#fca5a5':'#fecaca'}`, marginBottom:14, minHeight:80 }}>
                <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', marginBottom:4 }}>Gas Sensor</div>
                <div style={{ fontSize:22, fontWeight:800, color:alerted.has('gas')?'#dc2626':'#ef4444', fontFamily:'monospace' }}>
                  {iotData.gas?.toFixed(0) ?? '—'} <span style={{fontSize:12,color:'#94a3b8'}}>ppm</span>
                </div>
              </div>
              {p2 && (
                <div style={{ background:'#fff5f5', borderRadius:10, padding:'12px 14px', border:'1px solid #fecaca' }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'#dc2626', textTransform:'uppercase', marginBottom:8, display:'flex', justifyContent:'space-between' }}>
                    <span>Physics</span>
                    <span style={{ background:p2.regime==='Laminar'?'#dcfce7':p2.regime==='Transition'?'#fef9c3':'#fef2f2', color:p2.regime==='Laminar'?'#16a34a':p2.regime==='Transition'?'#a16207':'#dc2626', padding:'1px 8px', borderRadius:999, fontSize:10 }}>{p2.regime}</span>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                    {[{l:'Velocity',v:p2.v.toFixed(4),u:'m/s'},{l:'Flow Q',v:p2.Q.toFixed(6),u:'m³/s'},{l:'Reynolds',v:p2.Re.toFixed(0),u:''},{l:'Dyn. Press',v:p2.q.toFixed(4),u:'Pa'}].map(m=>(
                      <div key={m.l}><div style={{fontSize:9,color:'#64748b',fontWeight:600,textTransform:'uppercase'}}>{m.l}</div><div style={{fontSize:13,fontWeight:700,color:'#1e293b',fontFamily:'monospace'}}>{m.v} <span style={{fontSize:10,color:'#94a3b8'}}>{m.u}</span></div></div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page:    { minHeight:'100vh', background:'#f8fafc', fontFamily:'"Inter",sans-serif' },
  loading: { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f8fafc' },
  spinner: { width:40, height:40, border:'3px solid #e2e8f0', borderTopColor:'#3b82f6', borderRadius:'50%', animation:'spin 1s linear infinite' },
  nav:     { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 32px', background:'#fff', borderBottom:'1px solid #e2e8f0', position:'sticky', top:0, zIndex:50 },
  logo:    { fontSize:17, fontWeight:800, color:'#0f172a' },
  badge:   { fontSize:11, padding:'3px 10px', borderRadius:999, background:'#fef9c3', color:'#a16207', fontWeight:700, border:'1px solid #fde68a' },
  logoutBtn:{ padding:'7px 14px', background:'#fff', color:'#ef4444', border:'1px solid #fecaca', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:600 },
  main:    { maxWidth:1100, margin:'0 auto', padding:'32px 24px' },
  header:  { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 },
  title:   { fontSize:28, fontWeight:800, color:'#0f172a', letterSpacing:'-0.02em' },
  workerBtn:{ padding:'9px 20px', background:'linear-gradient(135deg,#2563eb,#7c3aed)', color:'#fff', border:'none', borderRadius:10, cursor:'pointer', fontSize:13, fontWeight:700 },
  statsRow:{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:24 },
  statCard:{ background:'#fff', borderRadius:16, padding:'24px', border:'1px solid #e2e8f0', textAlign:'center' },
  tabs:    { display:'flex', gap:4, background:'#f1f5f9', borderRadius:12, padding:4, marginBottom:20, width:'fit-content' },
  tab:     { padding:'8px 20px', borderRadius:9, border:'none', background:'transparent', fontSize:13, fontWeight:600, color:'#64748b', cursor:'pointer', fontFamily:'"Inter",sans-serif' },
  tabActive:{ background:'#fff', color:'#1d4ed8', boxShadow:'0 1px 4px rgba(0,0,0,.08)' },
  card:    { background:'#fff', borderRadius:16, border:'1px solid #e2e8f0', overflow:'hidden' },
  empty:   { padding:'48px 24px', textAlign:'center', color:'#94a3b8', fontSize:14 },
  table:   { width:'100%', borderCollapse:'collapse' as const, fontSize:13 },
  th:      { textAlign:'left' as const, padding:'10px 16px', background:'#f8fafc', color:'#64748b', fontWeight:600, fontSize:11, textTransform:'uppercase' as const, letterSpacing:'0.06em', borderBottom:'1px solid #e2e8f0' },
  tr:      { borderBottom:'1px solid #f1f5f9' },
  td:      { padding:'10px 16px', color:'#334155' },
  approveBtn:{ padding:'5px 12px', background:'#dcfce7', color:'#16a34a', border:'1px solid #bbf7d0', borderRadius:7, cursor:'pointer', fontSize:12, fontWeight:600 },
  rejectBtn: { padding:'5px 12px', background:'#fef2f2', color:'#dc2626', border:'1px solid #fecaca', borderRadius:7, cursor:'pointer', fontSize:12, fontWeight:600 },
};
