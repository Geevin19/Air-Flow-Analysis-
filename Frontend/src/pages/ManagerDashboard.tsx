import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

interface Worker { id: number; username: string; email: string; purpose?: string; created_at: string; }
interface LimitReq { id: number; worker_id: number; metric: string; value: number; status: string; created_at: string; }
interface AlertItem { id: number; user_id: number; metric: string; value: number; limit: number; level: string; created_at: string; }

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const [workers, setWorkers]   = useState<Worker[]>([]);
  const [pending, setPending]   = useState<LimitReq[]>([]);
  const [alerts, setAlerts]     = useState<AlertItem[]>([]);
  const [tab, setTab]           = useState<'workers'|'approvals'|'alerts'>('workers');
  const [loading, setLoading]   = useState(true);
  const [user, setUser]         = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const u = await api.get('/users/me');
        setUser(u.data);
        if (u.data.role !== 'manager') { navigate('/dashboard'); return; }
        const [w, p, a] = await Promise.all([
          api.get('/manager/workers'),
          api.get('/limits/pending'),
          api.get('/alerts'),
        ]);
        setWorkers(w.data);
        setPending(p.data);
        setAlerts(a.data);
      } catch { navigate('/login'); }
      finally { setLoading(false); }
    })();
  }, [navigate]);

  const review = async (id: number, action: 'approved'|'rejected') => {
    await api.post(`/limits/${id}/review?action=${action}`);
    setPending(p => p.filter(r => r.id !== id));
  };

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
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:13, color:'#64748b', fontWeight:600 }}>{user?.username}</span>
          <button style={s.logoutBtn} onClick={logout}>Logout</button>
        </div>
      </nav>

      <main style={s.main}>
        <div style={s.header}>
          <h2 style={s.title}>Manager Dashboard</h2>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            {user?.manager_code && (
              <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:10, padding:'8px 16px', fontSize:13 }}>
                Your code: <strong style={{ color:'#1d4ed8', fontFamily:'monospace', letterSpacing:'0.05em' }}>{user.manager_code}</strong>
                <span style={{ fontSize:11, color:'#64748b', marginLeft:8 }}>Share with workers</span>
              </div>
            )}
            <button style={s.workerBtn} onClick={() => navigate('/iot-live')}>Live IoT</button>
          </div>
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
          {(['workers','approvals','alerts'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ ...s.tab, ...(tab===t ? s.tabActive : {}) }}>
              {t === 'workers' ? `Workers (${workers.length})` : t === 'approvals' ? `Approvals (${pending.length})` : `Alerts (${alerts.length})`}
            </button>
          ))}
        </div>

        {/* Workers tab */}
        {tab === 'workers' && (
          <div style={s.card}>
            {workers.length === 0 ? (
              <div style={s.empty}>No workers registered under your account yet.</div>
            ) : (
              <table style={s.table}>
                <thead><tr>{['Username','Email','Purpose','Joined'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {workers.map(w => (
                    <tr key={w.id} style={s.tr}>
                      <td style={s.td}><strong>{w.username}</strong></td>
                      <td style={s.td}>{w.email}</td>
                      <td style={s.td}>{w.purpose || '—'}</td>
                      <td style={s.td}>{new Date(w.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
