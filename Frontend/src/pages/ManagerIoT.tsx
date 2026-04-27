import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

const API_URL = import.meta.env.VITE_API_URL || '';

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

export default function ManagerIoT() {
  const navigate = useNavigate();
  const [user, setUser]           = useState<any>(null);
  const [iotData, setIotData]     = useState<any>(null);
  const [lastTime, setLastTime]   = useState('');
  const [limits, setLimits]       = useState<Record<string,string>>({});
  const [showLimits, setShowLimits] = useState(false);
  const [showPipes, setShowPipes]   = useState(false);
  const [pipe1D, setPipe1D]       = useState(0.05);
  const [pipe2D, setPipe2D]       = useState(0.05);
  const [showProfile, setShowProfile] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval>|null>(null);

  useEffect(() => {
    api.get('/users/me').then(r => {
      if (r.data.role !== 'manager') { navigate('/dashboard'); return; }
      setUser(r.data);
    }).catch(() => navigate('/login'));

    const poll = async () => {
      try {
        const r = await api.get('/manager/iot/live');
        if (r.data.latest && Object.keys(r.data.latest).length > 0) {
          setIotData(r.data.latest);
          setLastTime(new Date().toLocaleTimeString());
        }
      } catch { /* ignore */ }
    };
    poll();
    pollRef.current = setInterval(poll, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [navigate]);

  const setLimit = (key: string, val: string) => {
    const updated = { ...limits, [key]: val };
    setLimits(updated);
    const numVal = parseFloat(val);
    if (!isNaN(numVal)) {
      const body: Record<string,number> = {};
      if (key==='temperature') body['temp_limit'] = numVal;
      else if (key==='humidity') body['humidity_limit'] = numVal;
      else body[key+'_limit'] = numVal;
      api.post('/iot/config', body).catch(()=>{});
    }
  };

  const temp = iotData?.temperature ?? iotData?.temp;
  const hum  = iotData?.humidity;
  const gas  = iotData?.gas;
  const p1   = (temp != null && hum != null) ? calcPhysics(temp, hum, pipe1D) : null;
  const p2   = gas != null ? calcGasPipe(gas, pipe2D) : null;

  const logout = () => { localStorage.removeItem('token'); navigate('/login'); };

  return (
    <div style={s.page}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@600&display=swap');*{box-sizing:border-box;}@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>

      {/* NAV */}
      <nav style={s.nav}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <img src="/logo.png" alt="" style={{ width:32, height:32, objectFit:'contain', borderRadius:8 }} />
          <span style={s.logo}>SmartTracker</span>
          <span style={{ fontSize:11, padding:'3px 10px', borderRadius:999, background:'#fef9c3', color:'#a16207', fontWeight:700, border:'1px solid #fde68a' }}>Manager IoT</span>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => setShowPipes(v=>!v)} style={{ ...s.btn, background: showPipes?'#0369a1':'#0f172a' }}>Pipes</button>
          <button onClick={() => setShowLimits(v=>!v)} style={{ ...s.btn, background: showLimits?'#dc2626':'#0f172a' }}>Limits</button>
          <button onClick={() => navigate('/manager')} style={{ ...s.btn, background:'#374151' }}>← Dashboard</button>
          {/* Profile */}
          <div style={{ position:'relative' }} data-profile="true">
            <button onClick={() => setShowProfile(v=>!v)}
              style={{ display:'flex', alignItems:'center', gap:8, background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:10, padding:'7px 14px', cursor:'pointer', fontFamily:'"Inter",sans-serif' }}>
              <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,#f59e0b,#d97706)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700 }}>
                {user?.username?.[0]?.toUpperCase()}
              </div>
              <span style={{ fontSize:13, fontWeight:600, color:'#374151' }}>{user?.username}</span>
            </button>
            {showProfile && (
              <div style={{ position:'absolute', top:'calc(100% + 8px)', right:0, background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, boxShadow:'0 8px 32px rgba(0,0,0,.12)', minWidth:240, zIndex:100, overflow:'hidden' }}>
                <div style={{ background:'linear-gradient(135deg,#1e3a8a,#3b82f6)', padding:'16px 20px' }}>
                  <div style={{ fontSize:15, fontWeight:700, color:'#fff' }}>{user?.username}</div>
                  <div style={{ fontSize:12, color:'rgba(255,255,255,.7)' }}>{user?.email}</div>
                  {user?.manager_code && <div style={{ fontSize:13, fontWeight:800, color:'#93c5fd', fontFamily:'monospace', marginTop:6 }}>{user.manager_code}</div>}
                </div>
                <div style={{ padding:'8px' }}>
                  <button onClick={logout} style={{ width:'100%', padding:'9px 14px', background:'#fef2f2', color:'#dc2626', border:'1px solid #fecaca', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'"Inter",sans-serif', textAlign:'left' as const }}>Logout</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      <main style={s.main}>
        {/* Status bar */}
        <div style={s.statusBar}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background: iotData?'#22c55e':'#f59e0b', display:'inline-block', animation: iotData?'none':'pulse 1.5s infinite' }} />
            <span style={{ fontSize:13, fontWeight:600, color:'#1e293b' }}>{iotData ? 'Live — receiving sensor data' : 'Waiting for sensor data from workers…'}</span>
          </div>
          {lastTime && <span style={{ fontSize:12, color:'#94a3b8', marginLeft:'auto' }}>Last update: {lastTime}</span>}
        </div>

        {/* Pipe diameter editor */}
        {showPipes && (
          <div style={s.panel}>
            <div style={{ fontSize:15, fontWeight:700, color:'#0f172a', marginBottom:16 }}>Pipe Diameter Settings</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              {[{label:'Pipe 1 — Temp/Humidity', val:pipe1D, set:setPipe1D, k:'p1'},{label:'Pipe 2 — Gas Sensor', val:pipe2D, set:setPipe2D, k:'p2'}].map(p=>(
                <div key={p.k} style={{ background:'#f8fafc', borderRadius:12, padding:'16px', border:'1px solid #e2e8f0' }}>
                  <div style={{ fontSize:12, fontWeight:600, color:'#374151', marginBottom:10 }}>{p.label}</div>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <button onClick={()=>p.set(Math.max(0.01,parseFloat((p.val-0.005).toFixed(3))))} style={{ width:36,height:36,borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',fontSize:20,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>−</button>
                    <div style={{ flex:1,textAlign:'center',fontSize:20,fontWeight:800,color:'#1d4ed8',fontFamily:'"JetBrains Mono",monospace' }}>{p.val.toFixed(3)} <span style={{fontSize:13,color:'#94a3b8'}}>m</span></div>
                    <button onClick={()=>p.set(parseFloat((p.val+0.005).toFixed(3)))} style={{ width:36,height:36,borderRadius:10,border:'1px solid #e2e8f0',background:'#fff',fontSize:20,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>+</button>
                  </div>
                  <input type="range" min="0.01" max="0.5" step="0.005" value={p.val} onChange={e=>p.set(parseFloat(e.target.value))} style={{width:'100%',marginTop:10,accentColor:'#3b82f6'}} />
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#94a3b8', marginTop:2 }}><span>1 cm</span><span>50 cm</span></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Limits panel */}
        {showLimits && (
          <div style={s.panel}>
            <div style={{ fontSize:15, fontWeight:700, color:'#0f172a', marginBottom:16 }}>Alert Limits</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              <div style={{ background:'#eff6ff', borderRadius:12, padding:'16px', border:'1px solid #bfdbfe' }}>
                <div style={{ fontSize:12, fontWeight:700, color:'#1d4ed8', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>Pipe 1 — Temp · Humidity</div>
                {[{key:'temperature',label:'Temperature',unit:'°C'},{key:'humidity',label:'Humidity',unit:'%'}].map(m=>(
                  <div key={m.key} style={{ marginBottom:10 }}>
                    <label style={{ display:'block', fontSize:11, fontWeight:600, color:'#374151', marginBottom:5 }}>{m.label} ({m.unit})</label>
                    <input type="number" placeholder="No limit" value={limits[m.key]??''} onBlur={e=>{if(e.target.value)setLimit(m.key,e.target.value);}} onChange={e=>setLimits({...limits,[m.key]:e.target.value})}
                      style={{ width:'100%',padding:'9px 12px',border:'1px solid #bfdbfe',borderRadius:8,fontSize:13,fontFamily:'"JetBrains Mono",monospace',fontWeight:600,outline:'none',background:'#fff',color:'#0f172a' }} />
                  </div>
                ))}
              </div>
              <div style={{ background:'#fef2f2', borderRadius:12, padding:'16px', border:'1px solid #fecaca' }}>
                <div style={{ fontSize:12, fontWeight:700, color:'#dc2626', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>Pipe 2 — Gas Sensor</div>
                <div>
                  <label style={{ display:'block', fontSize:11, fontWeight:600, color:'#374151', marginBottom:5 }}>Gas (ppm)</label>
                  <input type="number" placeholder="No limit" value={limits['gas']??''} onBlur={e=>{if(e.target.value)setLimit('gas',e.target.value);}} onChange={e=>setLimits({...limits,gas:e.target.value})}
                    style={{ width:'100%',padding:'9px 12px',border:'1px solid #fecaca',borderRadius:8,fontSize:13,fontFamily:'"JetBrains Mono",monospace',fontWeight:600,outline:'none',background:'#fff',color:'#0f172a' }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2-pipe dashboard */}
        {!iotData ? (
          <div style={{ background:'#fff', borderRadius:16, padding:'64px 24px', textAlign:'center', border:'1px solid #e2e8f0' }}>
            <div style={{ width:56, height:56, borderRadius:'50%', background:'rgba(99,102,241,.1)', margin:'0 auto 16px', animation:'pulse 1.5s infinite' }} />
            <p style={{ fontSize:17, fontWeight:700, color:'#0f172a', margin:'0 0 6px' }}>Waiting for sensor data…</p>
            <p style={{ fontSize:13, color:'#64748b' }}>Workers' Arduino must be running and sending data to the backend</p>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
            {/* Pipe 1 */}
            <div style={{ background:'#fff', borderRadius:20, border:'2px solid #3b82f6', overflow:'hidden', boxShadow:'0 4px 20px rgba(59,130,246,.1)' }}>
              <div style={{ background:'linear-gradient(135deg,#1e3a8a,#3b82f6)', padding:'18px 24px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:15, fontWeight:800, color:'#fff', letterSpacing:'-0.01em' }}>Pipe 1</div>
                  <div style={{ fontSize:12, color:'rgba(255,255,255,.7)', marginTop:2 }}>Temperature · Humidity · Air Flow</div>
                </div>
                <div style={{ background:'rgba(255,255,255,.15)', borderRadius:8, padding:'4px 10px', fontSize:12, color:'#fff', fontFamily:'"JetBrains Mono",monospace' }}>Ø {(pipe1D*100).toFixed(1)} cm</div>
              </div>
              <div style={{ padding:'20px' }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
                  {[{k:'temperature',l:'Temperature',u:'°C',c:'#f97316'},{k:'humidity',l:'Humidity',u:'%',c:'#6366f1'}].map(m=>(
                    <div key={m.k} style={{ background:'#f8fafc', borderRadius:12, padding:'16px', border:'1px solid #e2e8f0', minHeight:90 }}>
                      <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:6 }}>{m.l}</div>
                      <div style={{ fontSize:26, fontWeight:800, color:m.c, fontFamily:'"JetBrains Mono",monospace', lineHeight:1 }}>
                        {(iotData[m.k]??iotData[m.k==='temperature'?'temp':m.k])?.toFixed(2) ?? '—'}
                        <span style={{ fontSize:13, color:'#94a3b8', marginLeft:4 }}>{m.u}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {p1 && (
                  <div style={{ background:'#f0f9ff', borderRadius:12, padding:'14px 16px', border:'1px solid #bfdbfe' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                      <span style={{ fontSize:11, fontWeight:700, color:'#1d4ed8', textTransform:'uppercase', letterSpacing:'0.07em' }}>Calculated Physics</span>
                      <span style={{ fontSize:11, fontWeight:700, padding:'2px 10px', borderRadius:999, background:p1.regime==='Laminar'?'#dcfce7':p1.regime==='Transition'?'#fef9c3':'#fef2f2', color:p1.regime==='Laminar'?'#16a34a':p1.regime==='Transition'?'#a16207':'#dc2626', border:`1px solid ${p1.regime==='Laminar'?'#bbf7d0':p1.regime==='Transition'?'#fde68a':'#fca5a5'}` }}>{p1.regime}</span>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                      {[{l:'Air Flow Velocity',v:p1.v.toFixed(4),u:'m/s'},{l:'Volumetric Flow',v:p1.Q.toFixed(6),u:'m³/s'},{l:'Reynolds Number',v:p1.Re.toFixed(0),u:''},{l:'Mass Flow Rate',v:p1.mdot.toFixed(6),u:'kg/s'}].map(m=>(
                        <div key={m.l} style={{ background:'#fff', borderRadius:8, padding:'10px 12px', border:'1px solid #dbeafe' }}>
                          <div style={{ fontSize:9, color:'#64748b', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>{m.l}</div>
                          <div style={{ fontSize:14, fontWeight:800, color:'#1e293b', fontFamily:'"JetBrains Mono",monospace' }}>{m.v} <span style={{ fontSize:10, color:'#94a3b8' }}>{m.u}</span></div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Pipe 2 */}
            <div style={{ background:'#fff', borderRadius:20, border:'2px solid #ef4444', overflow:'hidden', boxShadow:'0 4px 20px rgba(239,68,68,.1)' }}>
              <div style={{ background:'linear-gradient(135deg,#7f1d1d,#ef4444)', padding:'18px 24px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:15, fontWeight:800, color:'#fff', letterSpacing:'-0.01em' }}>Pipe 2</div>
                  <div style={{ fontSize:12, color:'rgba(255,255,255,.7)', marginTop:2 }}>Gas Sensor · Flow Analysis</div>
                </div>
                <div style={{ background:'rgba(255,255,255,.15)', borderRadius:8, padding:'4px 10px', fontSize:12, color:'#fff', fontFamily:'"JetBrains Mono",monospace' }}>Ø {(pipe2D*100).toFixed(1)} cm</div>
              </div>
              <div style={{ padding:'20px' }}>
                <div style={{ background:'#fef2f2', borderRadius:12, padding:'16px', border:'1px solid #fecaca', marginBottom:16, minHeight:90 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:6 }}>Gas Sensor</div>
                  <div style={{ fontSize:26, fontWeight:800, color:'#ef4444', fontFamily:'"JetBrains Mono",monospace', lineHeight:1 }}>
                    {iotData.gas?.toFixed(0) ?? '—'}
                    <span style={{ fontSize:13, color:'#94a3b8', marginLeft:4 }}>ppm</span>
                  </div>
                </div>
                {p2 && (
                  <div style={{ background:'#fff5f5', borderRadius:12, padding:'14px 16px', border:'1px solid #fecaca' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                      <span style={{ fontSize:11, fontWeight:700, color:'#dc2626', textTransform:'uppercase', letterSpacing:'0.07em' }}>Calculated Physics</span>
                      <span style={{ fontSize:11, fontWeight:700, padding:'2px 10px', borderRadius:999, background:p2.regime==='Laminar'?'#dcfce7':p2.regime==='Transition'?'#fef9c3':'#fef2f2', color:p2.regime==='Laminar'?'#16a34a':p2.regime==='Transition'?'#a16207':'#dc2626', border:`1px solid ${p2.regime==='Laminar'?'#bbf7d0':p2.regime==='Transition'?'#fde68a':'#fca5a5'}` }}>{p2.regime}</span>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                      {[{l:'Air Flow Velocity',v:p2.v.toFixed(4),u:'m/s'},{l:'Volumetric Flow',v:p2.Q.toFixed(6),u:'m³/s'},{l:'Reynolds Number',v:p2.Re.toFixed(0),u:''},{l:'Dynamic Pressure',v:p2.q.toFixed(4),u:'Pa'}].map(m=>(
                        <div key={m.l} style={{ background:'#fff', borderRadius:8, padding:'10px 12px', border:'1px solid #fecaca' }}>
                          <div style={{ fontSize:9, color:'#64748b', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>{m.l}</div>
                          <div style={{ fontSize:14, fontWeight:800, color:'#1e293b', fontFamily:'"JetBrains Mono",monospace' }}>{m.v} <span style={{ fontSize:10, color:'#94a3b8' }}>{m.u}</span></div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page:      { minHeight:'100vh', background:'#f8fafc', fontFamily:'"Inter",sans-serif' },
  nav:       { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 32px', background:'#fff', borderBottom:'1px solid #e2e8f0', position:'sticky', top:0, zIndex:50 },
  logo:      { fontSize:17, fontWeight:800, color:'#0f172a' },
  btn:       { padding:'8px 16px', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'"Inter",sans-serif' },
  main:      { maxWidth:1100, margin:'0 auto', padding:'32px 24px' },
  statusBar: { display:'flex', alignItems:'center', gap:12, background:'#fff', padding:'12px 20px', borderRadius:12, marginBottom:20, border:'1px solid #e2e8f0', flexWrap:'wrap' as const },
  panel:     { background:'#fff', borderRadius:16, border:'1px solid #e2e8f0', padding:'20px 24px', marginBottom:20 },
};
