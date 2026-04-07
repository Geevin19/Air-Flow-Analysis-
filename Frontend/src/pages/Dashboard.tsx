import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, simulationAPI } from '../services/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser]             = useState<any>(null);
  const [simulations, setSimulations] = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [activeNav, setActiveNav]   = useState<'simulation'|'iot'>('simulation');

  useEffect(() => {
    (async () => {
      try {
        const [u, s] = await Promise.all([authAPI.getCurrentUser(), simulationAPI.getSimulations()]);
        setUser(u.data); setSimulations(s.data);
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

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f8fafc', fontFamily:'"Inter",sans-serif' }}>
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
        .nav-tab:hover{color:#1d4ed8!important;}
      `}</style>

      {/* NAV */}
      <nav style={s.nav}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <img src="/logo.png" alt="" style={{ width:32, height:32, objectFit:'contain', borderRadius:8 }} />
          <span style={s.logo}>SmartTracker</span>
        </div>

        {/* Centre nav tabs */}
        <div style={s.navTabs}>
          <button className="nav-tab" onClick={() => setActiveNav('simulation')}
            style={{ ...s.navTab, ...(activeNav === 'simulation' ? s.navTabActive : {}) }}>
            Simulation
          </button>
          <button className="nav-tab" onClick={() => { setActiveNav('iot'); navigate('/iot-live'); }}
            style={{ ...s.navTab, ...(activeNav === 'iot' ? s.navTabActive : {}) }}>
            Live IoT
          </button>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={s.userChip}>
            <div style={s.avatar}>{user?.username?.[0]?.toUpperCase()}</div>
            <span style={{ fontSize:13, fontWeight:600, color:'#374151' }}>{user?.username}</span>
          </div>
          <button style={s.logoutBtn} onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      <main style={s.main}>
        {/* Header */}
        <div style={s.header}>
          <div>
            <h2 style={s.title}>Dashboard</h2>
            <p style={{ fontSize:14, color:'#64748b', marginTop:4 }}>Welcome back, {user?.username}</p>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button style={s.iotBtn} onClick={() => navigate('/iot-live')}>
              Live IoT
            </button>
            <button style={s.newBtn} onClick={() => navigate('/simulation')}>
              + New Simulation
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={s.statsRow}>
          {[
            { val: simulations.length,                          label:'Total Simulations', color:'#3b82f6' },
            { val: simulations.filter(s => s.results).length,  label:'Completed',          color:'#10b981' },
            { val: simulations.filter(s => !s.results).length, label:'Pending',            color:'#f59e0b' },
          ].map(st => (
            <div key={st.label} style={s.statCard}>
              <div style={{ fontSize:36, fontWeight:800, color: st.color, fontFamily:'"JetBrains Mono",monospace', lineHeight:1 }}>{st.val}</div>
              <div style={{ fontSize:12, color:'#94a3b8', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', marginTop:8 }}>{st.label}</div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
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

        {/* Simulations list */}
        <div style={{ marginTop:32 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <h3 style={{ fontSize:17, fontWeight:700, color:'#0f172a' }}>Saved Simulations</h3>
            <span style={{ fontSize:12, color:'#94a3b8' }}>{simulations.length} total</span>
          </div>

          {simulations.length === 0 ? (
            <div style={s.empty}>
              <p style={{ fontSize:16, fontWeight:700, color:'#0f172a', margin:'0 0 6px' }}>No simulations yet</p>
              <p style={{ fontSize:13, color:'#64748b', margin:'0 0 20px' }}>Create your first simulation to get started</p>
              <button style={{ ...s.newBtn, padding:'10px 24px', fontSize:13 }} onClick={() => navigate('/simulation')}>
                + New Simulation
              </button>
            </div>
          ) : (
            <div style={s.grid}>
              {simulations.map(sim => (
                <div key={sim.id} className="sim-card" style={s.simCard}
                  onClick={() => navigate(`/simulation?id=${sim.id}`)}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.06em' }}>Simulation</div>
                    <button className="del-btn" style={s.delBtn} onClick={e => handleDelete(sim.id, e)}>✕</button>
                  </div>
                  <h4 style={{ fontSize:15, fontWeight:700, color:'#0f172a', margin:'0 0 6px', lineHeight:1.3 }}>{sim.name}</h4>
                  <p style={{ fontSize:12, color:'#94a3b8', margin:'0 0 14px' }}>
                    {new Date(sim.created_at).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}
                  </p>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:999,
                      background: sim.results ? '#dcfce7' : '#fef9c3',
                      color: sim.results ? '#16a34a' : '#a16207',
                      border: `1px solid ${sim.results ? '#bbf7d0' : '#fde68a'}` }}>
                      {sim.results ? 'Completed' : 'Pending'}
                    </span>
                    <span style={{ fontSize:12, color:'#3b82f6', fontWeight:600 }}>View →</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight:'100vh', background:'#f8fafc', fontFamily:'"Inter",sans-serif' },
  nav:  { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 32px', background:'#fff', borderBottom:'1px solid #e2e8f0', position:'sticky', top:0, zIndex:50 },
  logo: { fontSize:17, fontWeight:800, color:'#0f172a' },
  navTabs: { display:'flex', gap:4, background:'#f1f5f9', borderRadius:12, padding:4 },
  navTab: { padding:'8px 20px', borderRadius:9, border:'none', background:'transparent', fontSize:13, fontWeight:600, color:'#64748b', cursor:'pointer', transition:'all .2s', fontFamily:'"Inter",sans-serif' },
  navTabActive: { background:'#fff', color:'#1d4ed8', boxShadow:'0 1px 4px rgba(0,0,0,.08)' },
  userChip: { display:'flex', alignItems:'center', gap:8, background:'#f1f5f9', borderRadius:999, padding:'6px 14px 6px 6px' },
  avatar:   { width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,#3b82f6,#6366f1)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700 },
  logoutBtn:{ padding:'8px 16px', background:'#fff', color:'#ef4444', border:'1px solid #fecaca', borderRadius:10, cursor:'pointer', fontSize:13, fontWeight:600 },
  main:  { maxWidth:1100, margin:'0 auto', padding:'32px 24px' },
  header:{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28 },
  title: { fontSize:30, fontWeight:800, color:'#0f172a', letterSpacing:'-0.02em' },
  newBtn:{ padding:'10px 22px', background:'linear-gradient(135deg,#2563eb,#7c3aed)', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer', boxShadow:'0 2px 10px rgba(37,99,235,.25)' },
  iotBtn:{ padding:'10px 22px', background:'#fff', color:'#6366f1', border:'1.5px solid #c7d2fe', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer' },
  statsRow: { display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:24 },
  statCard: { background:'#fff', borderRadius:16, padding:'24px', border:'1px solid #e2e8f0', textAlign:'center', boxShadow:'0 1px 4px rgba(0,0,0,.04)' },
  quickRow: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:8 },
  quickCard:{ background:'#fff', borderRadius:16, padding:'24px', border:'1px solid #e2e8f0', cursor:'pointer', transition:'all .2s', boxShadow:'0 1px 4px rgba(0,0,0,.04)' },
  grid:  { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:16 },
  simCard:{ background:'#fff', borderRadius:16, padding:'20px', border:'1px solid #e2e8f0', cursor:'pointer', transition:'all .25s', boxShadow:'0 1px 4px rgba(0,0,0,.04)' },
  delBtn:{ width:28, height:28, borderRadius:8, background:'#f8fafc', border:'1px solid #e2e8f0', color:'#94a3b8', fontSize:14, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all .2s', fontFamily:'"Inter",sans-serif' },
  empty: { background:'#fff', borderRadius:16, padding:'60px 24px', textAlign:'center', border:'1px solid #e2e8f0' },
};
