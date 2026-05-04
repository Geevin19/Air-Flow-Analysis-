import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';

function satP(Tk: number) { const T=Tk-273.15; return 610.78*Math.exp((17.27*T)/(T+237.3)); }
function calcPhysics(temp: number, hum: number, pipeD = 0.05) {
  const K=0.04, T1=temp+273.15, T2=(temp-2)+273.15;
  const Pv=(hum/100)*satP(T1), rho=(((101325-Pv)/(287.05*T1))+(Pv/(461.5*T1)));
  const mu=1.716e-5*Math.pow(T1/273.15,1.5)*((273.15+110.4)/(T1+110.4));
  const v=Math.sqrt((2*K*(T1-T2))/rho), A=Math.PI*(pipeD/2)**2, Q=A*v;
  const Re=mu>0?(rho*v*pipeD)/mu:0;
  return { v, Q, mdot:rho*Q, Re, regime:Re<2300?'Laminar':Re<4000?'Transition':'Turbulent' };
}
function calcGas(gas: number, pipeD = 0.05) {
  const v=gas/1000, A=Math.PI*(pipeD/2)**2, Q=A*v, rho=1.2, Re=(rho*v*pipeD)/1.8e-5;
  return { v, Q, Re, regime:Re<2300?'Laminar':Re<4000?'Transition':'Turbulent' };
}

export default function WorkerIoT() {
  const { workerId } = useParams<{ workerId: string }>();
  const navigate = useNavigate();
  const [worker, setWorker]     = useState<any>(null);
  const [iotData, setIotData]   = useState<any>(null);
  const [lastTime, setLastTime] = useState('');
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval>|null>(null);

  useEffect(() => {
    // Verify manager access
    api.get('/users/me').then(r => {
      if (r.data.role !== 'manager') { navigate('/dashboard'); return; }
    }).catch(() => navigate('/login'));

    // Load worker info + initial IoT data
    api.get(`/manager/workers/${workerId}/iot`)
      .then(r => {
        setWorker({ id: workerId, username: r.data.worker });
        if (r.data.data && Object.keys(r.data.data).length > 0) {
          setIotData(r.data.data);
          setLastTime(new Date().toLocaleTimeString());
        }
      })
      .catch(() => setError('Worker not found or access denied'))
      .finally(() => setLoading(false));

    // Poll live data every 2s
    pollRef.current = setInterval(async () => {
      try {
        const r = await api.get(`/manager/workers/${workerId}/iot`);
        if (r.data.data && Object.keys(r.data.data).length > 0) {
          setIotData(r.data.data);
          setLastTime(new Date().toLocaleTimeString());
        }
      } catch { /* ignore */ }
    }, 2000);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [workerId, navigate]);

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f8fafc' }}>
      <div style={{ width:40, height:40, border:'3px solid #e2e8f0', borderTopColor:'#3b82f6', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error) return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#f8fafc', fontFamily:'"Inter",sans-serif' }}>
      <div style={{ fontSize:48, marginBottom:16 }}>⚠️</div>
      <div style={{ fontSize:18, fontWeight:700, color:'#dc2626', marginBottom:8 }}>{error}</div>
      <button onClick={() => navigate('/manager')} style={{ padding:'10px 24px', background:'#1d4ed8', color:'#fff', border:'none', borderRadius:10, cursor:'pointer', fontSize:14, fontWeight:600 }}>← Back</button>
    </div>
  );

  const temp = iotData?.temperature;
  const hum  = iotData?.humidity;
  const gas  = iotData?.gas;
  const p1   = (temp != null && hum != null) ? calcPhysics(temp, hum) : null;
  const p2   = gas != null ? calcGas(gas) : null;

  return (
    <div style={{ minHeight:'100vh', background:'#f8fafc', fontFamily:'"Inter",sans-serif' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=JetBrains+Mono:wght@600&display=swap');*{box-sizing:border-box;}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>

      {/* Nav */}
      <nav style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 32px', background:'#fff', borderBottom:'1px solid #e2e8f0', position:'sticky', top:0, zIndex:50 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <img src="/logo.png" alt="" style={{ width:32, height:32, borderRadius:8, objectFit:'contain' }} />
          <span style={{ fontSize:17, fontWeight:800, color:'#0f172a' }}>SmartTracker</span>
          <span style={{ fontSize:11, padding:'3px 10px', borderRadius:999, background:'#fef9c3', color:'#a16207', fontWeight:700, border:'1px solid #fde68a' }}>Manager View</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {lastTime && <span style={{ fontSize:12, color:'#94a3b8' }}>Last update: {lastTime}</span>}
          <button onClick={() => navigate('/manager')}
            style={{ padding:'8px 16px', background:'#0f172a', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600 }}>
            ← Dashboard
          </button>
        </div>
      </nav>

      <main style={{ maxWidth:1100, margin:'0 auto', padding:'32px 24px' }}>
        {/* Header */}
        <div style={{ marginBottom:24 }}>
          <h2 style={{ fontSize:26, fontWeight:800, color:'#0f172a', margin:'0 0 4px' }}>
            {worker?.username}'s IoT Data
          </h2>
          <p style={{ fontSize:14, color:'#64748b', margin:0 }}>Live sensor readings from this worker's Arduino</p>
        </div>

        {/* Status */}
        <div style={{ display:'flex', alignItems:'center', gap:8, background:'#fff', padding:'12px 20px', borderRadius:12, marginBottom:24, border:'1px solid #e2e8f0' }}>
          <span style={{ width:10, height:10, borderRadius:'50%', background: iotData ? '#22c55e' : '#f59e0b', display:'inline-block', animation: iotData ? 'none' : 'pulse 1.5s infinite' }} />
          <span style={{ fontSize:13, fontWeight:600, color:'#1e293b' }}>
            {iotData ? 'Live — receiving sensor data' : 'Waiting for sensor data from this worker…'}
          </span>
        </div>

        {/* No data state */}
        {!iotData ? (
          <div style={{ background:'#fff', borderRadius:16, padding:'64px 24px', textAlign:'center', border:'1px solid #e2e8f0' }}>
            <div style={{ fontSize:56, marginBottom:16 }}>📡</div>
            <p style={{ fontSize:17, fontWeight:700, color:'#0f172a', margin:'0 0 8px' }}>
              {worker?.username} is not connected to IoT
            </p>
            <p style={{ fontSize:14, color:'#64748b', margin:0 }}>
              This worker's Arduino is not currently sending data. Ask them to connect their device.
            </p>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
            {/* Pipe 1 */}
            <div style={{ background:'#fff', borderRadius:20, border:'2px solid #3b82f6', overflow:'hidden', boxShadow:'0 4px 20px rgba(59,130,246,.1)' }}>
              <div style={{ background:'linear-gradient(135deg,#1e3a8a,#3b82f6)', padding:'18px 24px' }}>
                <div style={{ fontSize:15, fontWeight:800, color:'#fff' }}>Pipe 1</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,.7)', marginTop:2 }}>Temperature · Humidity · Air Flow</div>
              </div>
              <div style={{ padding:'20px' }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
                  {[
                    { label:'Temperature', value: temp?.toFixed(2), unit:'°C',  color:'#f97316' },
                    { label:'Humidity',    value: hum?.toFixed(2),  unit:'%',   color:'#6366f1' },
                  ].map(m => (
                    <div key={m.label} style={{ background:'#f8fafc', borderRadius:12, padding:'16px', border:'1px solid #e2e8f0' }}>
                      <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:6 }}>{m.label}</div>
                      <div style={{ fontSize:26, fontWeight:800, color:m.color, fontFamily:'"JetBrains Mono",monospace', lineHeight:1 }}>
                        {m.value ?? '—'} <span style={{ fontSize:13, color:'#94a3b8' }}>{m.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {p1 && (
                  <div style={{ background:'#f0f9ff', borderRadius:12, padding:'14px 16px', border:'1px solid #bfdbfe' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                      <span style={{ fontSize:11, fontWeight:700, color:'#1d4ed8', textTransform:'uppercase' }}>Physics</span>
                      <span style={{ fontSize:11, fontWeight:700, padding:'2px 10px', borderRadius:999,
                        background: p1.regime==='Laminar'?'#dcfce7':p1.regime==='Transition'?'#fef9c3':'#fef2f2',
                        color: p1.regime==='Laminar'?'#16a34a':p1.regime==='Transition'?'#a16207':'#dc2626' }}>
                        {p1.regime}
                      </span>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                      {[
                        { l:'Velocity',  v:p1.v.toFixed(4),    u:'m/s' },
                        { l:'Flow Rate', v:p1.Q.toFixed(6),    u:'m³/s' },
                        { l:'Reynolds',  v:p1.Re.toFixed(0),   u:'' },
                        { l:'Mass Flow', v:p1.mdot.toFixed(6), u:'kg/s' },
                      ].map(m => (
                        <div key={m.l} style={{ background:'#fff', borderRadius:8, padding:'8px 10px', border:'1px solid #dbeafe' }}>
                          <div style={{ fontSize:9, color:'#64748b', fontWeight:700, textTransform:'uppercase' }}>{m.l}</div>
                          <div style={{ fontSize:13, fontWeight:800, color:'#1e293b', fontFamily:'"JetBrains Mono",monospace' }}>{m.v} <span style={{ fontSize:10, color:'#94a3b8' }}>{m.u}</span></div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Pipe 2 */}
            <div style={{ background:'#fff', borderRadius:20, border:'2px solid #ef4444', overflow:'hidden', boxShadow:'0 4px 20px rgba(239,68,68,.1)' }}>
              <div style={{ background:'linear-gradient(135deg,#7f1d1d,#ef4444)', padding:'18px 24px' }}>
                <div style={{ fontSize:15, fontWeight:800, color:'#fff' }}>Pipe 2</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,.7)', marginTop:2 }}>Gas Sensor · Flow Analysis</div>
              </div>
              <div style={{ padding:'20px' }}>
                <div style={{ background:'#fef2f2', borderRadius:12, padding:'16px', border:'1px solid #fecaca', marginBottom:16 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:6 }}>Gas Sensor</div>
                  <div style={{ fontSize:26, fontWeight:800, color:'#ef4444', fontFamily:'"JetBrains Mono",monospace', lineHeight:1 }}>
                    {gas?.toFixed(0) ?? '—'} <span style={{ fontSize:13, color:'#94a3b8' }}>ppm</span>
                  </div>
                </div>
                {p2 && (
                  <div style={{ background:'#fff5f5', borderRadius:12, padding:'14px 16px', border:'1px solid #fecaca' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                      <span style={{ fontSize:11, fontWeight:700, color:'#dc2626', textTransform:'uppercase' }}>Physics</span>
                      <span style={{ fontSize:11, fontWeight:700, padding:'2px 10px', borderRadius:999,
                        background: p2.regime==='Laminar'?'#dcfce7':p2.regime==='Transition'?'#fef9c3':'#fef2f2',
                        color: p2.regime==='Laminar'?'#16a34a':p2.regime==='Transition'?'#a16207':'#dc2626' }}>
                        {p2.regime}
                      </span>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                      {[
                        { l:'Velocity',  v:p2.v.toFixed(4),  u:'m/s' },
                        { l:'Flow Rate', v:p2.Q.toFixed(6),  u:'m³/s' },
                        { l:'Reynolds',  v:p2.Re.toFixed(0), u:'' },
                        { l:'Dyn. Press',v:(0.5*1.2*p2.v*p2.v).toFixed(4), u:'Pa' },
                      ].map(m => (
                        <div key={m.l} style={{ background:'#fff', borderRadius:8, padding:'8px 10px', border:'1px solid #fecaca' }}>
                          <div style={{ fontSize:9, color:'#64748b', fontWeight:700, textTransform:'uppercase' }}>{m.l}</div>
                          <div style={{ fontSize:13, fontWeight:800, color:'#1e293b', fontFamily:'"JetBrains Mono",monospace' }}>{m.v} <span style={{ fontSize:10, color:'#94a3b8' }}>{m.u}</span></div>
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
