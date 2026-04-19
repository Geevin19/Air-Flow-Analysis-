import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, simulationAPI, api } from '../services/api';

interface AlertItem { id:number; metric:string; value:number; limit:number; level:string; created_at:string; }
interface LimitReq  { id:number; metric:string; value:number; status:string; created_at:string; }

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser]             = useState<any>(null);
  const [manager, setManager]       = useState<any>(null);
  const [simulations, setSimulations] = useState<any[]>([]);
  const [alerts, setAlerts]         = useState<AlertItem[]>([]);
  const [myLimits, setMyLimits]     = useState<LimitReq[]>([]);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState<'simulations'|'alerts'|'limits'>('simulations');
  const [showProfile, setShowProfile] = useState(false);
  // Limit request modal
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitMetric, setLimitMetric] = useState('temperature');
  const [limitValue, setLimitValue]   = useState('');
  const [limitMsg, setLimitMsg]       = useState('');

  useEffect(() => {
    (async () => {
      try {
        const u = await authAPI.getCurrentUser();
        setUser(u.data);
        if (u.data.role === 'manager') { navigate('/manager'); return; }
        const [s, a] = await Promise.all([
          simulationAPI.getSimulations(),
          api.get('/alerts'),
        ]);
        setSimulations(s.data);
        setAlerts(a.data);
        // Load approved limits
        try { const l = await api.get('/limits/approved'); setMyLimits(Object.entries(l.data).map(([metric, value]) => ({ id: 0, metric, value: value as number, status: 'approved', created_at: '' }))); } catch {}
        // Load manager info
        if (u.data.manager_id) {
          try { const mgrs = await api.get('/managers'); setManager(mgrs.data.find((m: any) => m.id === u.data.manager_id)); } catch {}
        }
      } catch { navigate('/login'); }
      finally { setLoading(false); }
    })();
  }, [navigate]);

  const handleLogout = () => { localStorage.removeItem('token'); navigate('/login'); };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this simulation?')) return;
    try { await simulationAPI.deleteSimulation(id); setSimulations(p => p.filter(s => s.id !== id)); }
    catch { alert('Failed to delete'); }
  };

  const submitLimitRequest = async () => {
    if (!limitValue) return;
    try {
      await api.post('/limits/request', { metric: limitMetric, value: parseFloat(limitValue) });
      setLimitMsg('Request sent to your manager for approval.');
      setTimeout(() => { setShowLimitModal(false); setLimitMsg(''); setLimitValue(''); }, 2000);
    } catch (e: any) {
      setLimitMsg(e.response?.data?.detail || 'Failed to send request.');
    }
  };

  // Close profile on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest('[data-profile]')) setShowProfile(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f8fafc' }}>
      <div style={{ width:40, height:40, border:'3px solid #e2e8f0', borderTopColor:'#3b82f6', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={s.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@600&display=swap');
        *{box-sizing:border-box;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .sim-card:hover{transform:translateY(-3px);box-shadow:0 8px 28px rgba(0,0,0,.1)!important;}
        .del-btn:hover{background:#fef2f2!important;border-color:#fca5a5!important;color:#dc2626!important;}
      `}</style>

      {/* NAV */}
      <nav style={s.nav}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <img src="/logo.png" alt="" style={{ width:32, height:32, objectFit:'contain', borderRadius:8 }} />
          <span style={s.logo}>SmartTracker</span>
          <span style={{ fontSize:11, padding:'3px 10px', borderRadius:999, background:'#eff6ff', color:'#3b82f6', fontWeight:700, border:'1px solid #bfdbfe' }}>Worker</span>
        </div>

        <div style={{ display:'flex', gap:4, background:'#f1f5f9', borderRadius:12, padding:4 }}>
          {(['simulations','alerts','limits'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding:'8px 18px', borderRadius:9, border:'none', background: tab===t?'#fff':'transparent', fontSize:13, fontWeight:600, color: tab===t?'#1d4ed8':'#64748b', cursor:'pointer', fontFamily:'"Inter",sans-serif', boxShadow: tab===t?'0 1px 4px rgba(0,0,0,.08)':'none', textTransform:'capitalize' }}>
              {t}{t==='alerts' && alerts.length > 0 ? ` (${alerts.length})` : ''}
            </button>
          ))}
        </div>

        {/* Profile dropdown */}
        <div style={{ position:'relative' }} data-profile="true">
          <button onClick={() => setShowProfile(v => !v)}
            style={{ display:'flex', alignItems:'center', gap:8, background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:10, padding:'7px 14px', cursor:'pointer', fontFamily:'"Inter",sans-serif' }}>
            <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,#3b82f6,#6366f1)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700 }}>
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <span style={{ fontSize:13, fontWeight:600, color:'#374151' }}>{user?.username}</span>
            <span style={{ fontSize:10, color:'#94a3b8' }}>{showProfile?'▲':'▼'}</span>
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
              <div style={{ padding:'14px 20px', borderBottom:'1px solid #f1f5f9' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
                  <span style={{ fontSize:12, color:'#94a3b8' }}>Role</span>
                  <span style={{ fontSize:12, fontWeight:700, color:'#1d4ed8', background:'#eff6ff', padding:'2px 8px', borderRadius:999, border:'1px solid #bfdbfe' }}>Worker</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
                  <span style={{ fontSize:12, color:'#94a3b8' }}>Worker ID</span>
                  <span style={{ fontSize:12, fontWeight:700, color:'#374151', fontFamily:'monospace' }}>#{user?.id}</span>
                </div>
                {manager && (
                  <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8, padding:'10px 12px', marginTop:4 }}>
                    <div style={{ fontSize:11, color:'#64748b', marginBottom:4 }}>Your Manager</div>
                    <div style={{ fontSize:14, fontWeight:700, color:'#16a34a' }}>{manager.username}</div>
                    <div style={{ fontSize:11, color:'#64748b', marginTop:2 }}>{manager.email}</div>
                    {manager.manager_code && <div style={{ fontSize:12, fontFamily:'monospace', color:'#374151', marginTop:4 }}>{manager.manager_code}</div>}
                  </div>
                )}
                {!manager && user?.manager_id && (
                  <div style={{ fontSize:12, color:'#94a3b8', marginTop:8 }}>Manager ID: #{user.manager_id}</div>
                )}
                {!user?.manager_id && (
                  <div style={{ fontSize:12, color:'#f59e0b', marginTop:8 }}>No manager assigned</div>
                )}
              </div>
              <div style={{ padding:'8px' }}>
                <button onClick={handleLogout}
                  style={{ width:'100%', padding:'9px 14px', background:'#fef2f2', color:'#dc2626', border:'1px solid #fecaca', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'"Inter",sans-serif', textAlign:'left' }}>
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      <main style={s.main}>
        <div style={s.header}>
          <div>
            <h2 style={s.title}>Dashboard</h2>
            <p style={{ fontSize:14, color:'#64748b', marginTop:4 }}>Welcome back, {user?.username}</p>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            {user?.manager_id && (
              <button style={{ ...s.iotBtn, background:'#fff', color:'#f59e0b', border:'1.5px solid #fde68a' }} onClick={() => setShowLimitModal(true)}>
                Request Limit
              </button>
            )}
            <button style={s.iotBtn} onClick={() => navigate('/iot-live')}>Live IoT</button>
            <button style={s.newBtn} onClick={() => navigate('/simulation')}>+ New Simulation</button>
          </div>
        </div>

        {/* Stats */}
        <div style={s.statsRow}>
          {[
            { val: simulations.length,                         label:'Simulations',    color:'#3b82f6' },
            { val: alerts.filter(a => a.level==='critical').length, label:'Critical Alerts', color:'#ef4444' },
            { val: alerts.filter(a => a.level==='warning').length,  label:'Warnings',       color:'#f59e0b' },
          ].map(st => (
            <div key={st.label} style={s.statCard}>
              <div style={{ fontSize:36, fontWeight:800, color:st.color, fontFamily:'"JetBrains Mono",monospace', lineHeight:1 }}>{st.val}</div>
              <div style={{ fontSize:12, color:'#94a3b8', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', marginTop:8 }}>{st.label}</div>
            </div>
          ))}
        </div>

        {/* Simulations tab */}
        {tab === 'simulations' && (
          <>
            <div style={s.quickRow}>
              <div style={s.quickCard} onClick={() => navigate('/simulation')}>
                <div style={{ fontSize:12, fontWeight:700, color:'#3b82f6', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>CFD Simulation</div>
                <div style={{ fontSize:15, fontWeight:700, color:'#0f172a', marginBottom:4 }}>3D Pipe Flow Simulation</div>
                <div style={{ fontSize:13, color:'#64748b' }}>Run a new pipe flow simulation with live 3D visualisation</div>
                <div style={{ marginTop:14, fontSize:13, fontWeight:600, color:'#3b82f6' }}>Open →</div>
              </div>
              <div style={s.quickCard} onClick={() => navigate('/iot-live')}>
                <div style={{ fontSize:12, fontWeight:700, color:'#6366f1', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>Live IoT</div>
                <div style={{ fontSize:15, fontWeight:700, color:'#0f172a', marginBottom:4 }}>Live IoT Monitor</div>
                <div style={{ fontSize:13, color:'#64748b' }}>Stream real-time sensor data from your Arduino / ESP32</div>
                <div style={{ marginTop:14, fontSize:13, fontWeight:600, color:'#6366f1' }}>Connect →</div>
              </div>
            </div>
            <div style={{ marginTop:24 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                <h3 style={{ fontSize:17, fontWeight:700, color:'#0f172a' }}>Saved Simulations</h3>
                <span style={{ fontSize:12, color:'#94a3b8' }}>{simulations.length} total</span>
              </div>
              {simulations.length === 0 ? (
                <div style={s.empty}>
                  <p style={{ fontSize:16, fontWeight:700, color:'#0f172a', margin:'0 0 6px' }}>No simulations yet</p>
                  <p style={{ fontSize:13, color:'#64748b', margin:'0 0 20px' }}>Create your first simulation to get started</p>
                  <button style={{ ...s.newBtn, padding:'10px 24px', fontSize:13 }} onClick={() => navigate('/simulation')}>+ New Simulation</button>
                </div>
              ) : (
                <div style={s.grid}>
                  {simulations.map(sim => (
                    <div key={sim.id} className="sim-card" style={s.simCard} onClick={() => navigate(`/simulation?id=${sim.id}`)}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                        <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.06em' }}>Simulation</div>
                        <button className="del-btn" style={s.delBtn} onClick={e => handleDelete(sim.id, e)}>✕</button>
                      </div>
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
          </>
        )}

        {/* Alerts tab */}
        {tab === 'alerts' && (
          <div style={s.card}>
            {alerts.length === 0 ? (
              <div style={s.empty}>No alerts recorded. Your sensor values are within limits.</div>
            ) : (
              <table style={s.table}>
                <thead><tr>{['Metric','Value','Limit','Level','Time'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {alerts.map(a => (
                    <tr key={a.id} style={{ ...s.tr, background: a.level==='critical'?'#fef2f2':'transparent' }}>
                      <td style={s.td}><strong>{a.metric}</strong></td>
                      <td style={{ ...s.td, color: a.level==='critical'?'#dc2626':'#f59e0b', fontWeight:700 }}>{a.value.toFixed(4)}</td>
                      <td style={s.td}>{a.limit}</td>
                      <td style={s.td}>
                        <span style={{ padding:'2px 8px', borderRadius:999, fontSize:11, fontWeight:700, background: a.level==='critical'?'#fef2f2':'#fef9c3', color: a.level==='critical'?'#dc2626':'#a16207', border:`1px solid ${a.level==='critical'?'#fca5a5':'#fde68a'}` }}>
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

        {/* Limits tab */}
        {tab === 'limits' && (
          <div style={s.card}>
            <div style={{ padding:'16px 20px', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ fontSize:15, fontWeight:700, color:'#0f172a' }}>Approved Limits</div>
              {user?.manager_id && <button style={{ ...s.newBtn, padding:'8px 16px', fontSize:12 }} onClick={() => setShowLimitModal(true)}>+ Request New Limit</button>}
            </div>
            {myLimits.length === 0 ? (
              <div style={s.empty}>No approved limits yet. Request a limit from your manager.</div>
            ) : (
              <table style={s.table}>
                <thead><tr>{['Metric','Approved Value','Status'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {myLimits.map((l, i) => (
                    <tr key={i} style={s.tr}>
                      <td style={s.td}><strong>{l.metric}</strong></td>
                      <td style={{ ...s.td, fontFamily:'monospace', fontWeight:700, color:'#16a34a' }}>{l.value}</td>
                      <td style={s.td}><span style={{ padding:'2px 8px', borderRadius:999, fontSize:11, fontWeight:700, background:'#dcfce7', color:'#16a34a', border:'1px solid #bbf7d0' }}>Approved</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </main>

      {/* Limit Request Modal */}
      {showLimitModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200 }}>
          <div style={{ background:'#fff', borderRadius:16, padding:'28px 32px', width:400, boxShadow:'0 16px 48px rgba(0,0,0,.2)' }}>
            <h3 style={{ fontSize:17, fontWeight:700, color:'#0f172a', marginBottom:6 }}>Request Limit Change</h3>
            <p style={{ fontSize:13, color:'#64748b', marginBottom:20 }}>Your manager will approve or reject this request.</p>
            <div style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#374151', marginBottom:6 }}>Metric</label>
              <select value={limitMetric} onChange={e => setLimitMetric(e.target.value)}
                style={{ width:'100%', padding:'10px 14px', border:'1.5px solid #e2e8f0', borderRadius:10, fontSize:14, color:'#0f172a', background:'#f8fafc', fontFamily:'"Inter",sans-serif', outline:'none' }}>
                {['temperature','humidity','pressure','Air Flow Velocity','Air Density','Dynamic Pressure','Reynolds Number','Mass Flow Rate','Volumetric Flow'].map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#374151', marginBottom:6 }}>Max Value</label>
              <input type="number" value={limitValue} onChange={e => setLimitValue(e.target.value)} placeholder="e.g. 35"
                style={{ width:'100%', padding:'10px 14px', border:'1.5px solid #e2e8f0', borderRadius:10, fontSize:14, color:'#0f172a', background:'#f8fafc', fontFamily:'"Inter",sans-serif', outline:'none' }} />
            </div>
            {limitMsg && <p style={{ fontSize:13, color: limitMsg.includes('sent')?'#16a34a':'#dc2626', marginBottom:14 }}>{limitMsg}</p>}
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={submitLimitRequest} style={{ flex:1, padding:'11px', background:'linear-gradient(135deg,#2563eb,#7c3aed)', color:'#fff', border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'"Inter",sans-serif' }}>Send Request</button>
              <button onClick={() => { setShowLimitModal(false); setLimitMsg(''); }} style={{ flex:1, padding:'11px', background:'#f8fafc', color:'#374151', border:'1px solid #e2e8f0', borderRadius:10, fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'"Inter",sans-serif' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page:    { minHeight:'100vh', background:'#f8fafc', fontFamily:'"Inter",sans-serif' },
  nav:     { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 32px', background:'#fff', borderBottom:'1px solid #e2e8f0', position:'sticky', top:0, zIndex:50 },
  logo:    { fontSize:17, fontWeight:800, color:'#0f172a' },
  main:    { maxWidth:1100, margin:'0 auto', padding:'32px 24px' },
  header:  { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28 },
  title:   { fontSize:30, fontWeight:800, color:'#0f172a', letterSpacing:'-0.02em' },
  newBtn:  { padding:'10px 22px', background:'linear-gradient(135deg,#2563eb,#7c3aed)', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer' },
  iotBtn:  { padding:'10px 22px', background:'#fff', color:'#6366f1', border:'1.5px solid #c7d2fe', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer' },
  statsRow:{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:24 },
  statCard:{ background:'#fff', borderRadius:16, padding:'24px', border:'1px solid #e2e8f0', textAlign:'center' },
  quickRow:{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:8 },
  quickCard:{ background:'#fff', borderRadius:16, padding:'24px', border:'1px solid #e2e8f0', cursor:'pointer', transition:'all .2s' },
  grid:    { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:16 },
  simCard: { background:'#fff', borderRadius:16, padding:'20px', border:'1px solid #e2e8f0', cursor:'pointer', transition:'all .25s' },
  delBtn:  { width:28, height:28, borderRadius:8, background:'#f8fafc', border:'1px solid #e2e8f0', color:'#94a3b8', fontSize:14, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'"Inter",sans-serif' },
  empty:   { padding:'48px 24px', textAlign:'center', color:'#94a3b8', fontSize:14 },
  card:    { background:'#fff', borderRadius:16, border:'1px solid #e2e8f0', overflow:'hidden' },
  table:   { width:'100%', borderCollapse:'collapse' as const, fontSize:13 },
  th:      { textAlign:'left' as const, padding:'10px 16px', background:'#f8fafc', color:'#64748b', fontWeight:600, fontSize:11, textTransform:'uppercase' as const, letterSpacing:'0.06em', borderBottom:'1px solid #e2e8f0' },
  tr:      { borderBottom:'1px solid #f1f5f9' },
  td:      { padding:'10px 16px', color:'#334155' },
};
