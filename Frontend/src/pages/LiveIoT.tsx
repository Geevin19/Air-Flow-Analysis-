import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const WS_URL  = 'ws://localhost:8000/ws/iot';
const API_URL = 'http://localhost:8000';
const MAX_HIST = 50;
const PIPE_D = 0.05;
const K_CAL  = 0.04;

function satP(Tk: number) {
  const T = Tk - 273.15;
  return 610.78 * Math.exp((17.27 * T) / (T + 237.3));
}
function calcPhysics(temp: number, hum: number, pres = 101325, tOut?: number) {
  const T1 = temp + 273.15, T2 = (tOut ?? temp - 2) + 273.15;
  const Pv = (hum / 100) * satP(T1), Pd = pres - Pv;
  const rho = (Pd / (287.05 * T1)) + (Pv / (461.5 * T1));
  const mu = 1.716e-5 * Math.pow(T1 / 273.15, 1.5) * ((273.15 + 110.4) / (T1 + 110.4));
  const v = T1 > T2 ? Math.sqrt((2 * K_CAL * (T1 - T2)) / rho) : 0;
  const A = Math.PI * (PIPE_D / 2) ** 2, Q = A * v;
  const Re = mu > 0 ? (rho * v * PIPE_D) / mu : 0;
  return { rho, v, Q, mdot: rho * Q, q: 0.5 * rho * v * v, Re,
    regime: Re < 2300 ? 'Laminar' : Re < 4000 ? 'Transition' : 'Turbulent' };
}

interface Reading { pressure?: number; temperature?: number; temperature_outside?: number; flow_rate?: number; humidity?: number; airflow?: number; timestamp?: string; }
interface HistEntry { time: string; values: Record<string, number>; phys: Record<string, number>; }
type Status = 'idle' | 'connecting' | 'connected' | 'error' | 'disconnected';
interface Toast { id: number; msg: string; metric: string; }

const SENSOR_META: Record<string, { label: string; unit: string; color: string }> = {
  temperature: { label: 'Temperature', unit: '°C',  color: '#f97316' },
  humidity:    { label: 'Humidity',    unit: '%',   color: '#6366f1' },
  pressure:    { label: 'Pressure',    unit: 'Pa',  color: '#0ea5e9' },
  flow_rate:   { label: 'Flow Rate',   unit: 'm/s', color: '#10b981' },
  airflow:     { label: 'Airflow',     unit: 'm/s', color: '#10b981' },
};

const PHYS_META = [
  { key: 'Air Flow Velocity', unit: 'm/s',   color: '#3b82f6', get: (p: ReturnType<typeof calcPhysics>) => p.v    },
  { key: 'Air Density',       unit: 'kg/m³', color: '#8b5cf6', get: (p: ReturnType<typeof calcPhysics>) => p.rho  },
  { key: 'Dynamic Pressure',  unit: 'Pa',    color: '#f59e0b', get: (p: ReturnType<typeof calcPhysics>) => p.q    },
  { key: 'Reynolds Number',   unit: '',      color: '#ef4444', get: (p: ReturnType<typeof calcPhysics>) => p.Re   },
  { key: 'Mass Flow Rate',    unit: 'kg/s',  color: '#10b981', get: (p: ReturnType<typeof calcPhysics>) => p.mdot },
  { key: 'Volumetric Flow',   unit: 'm³/s',  color: '#0ea5e9', get: (p: ReturnType<typeof calcPhysics>) => p.Q    },
];

// ── Beep ──────────────────────────────────────────────────────────────────────
function beep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start(); osc.stop(ctx.currentTime + 0.6);
  } catch { /* ignore */ }
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function LiveIoT() {
  const navigate = useNavigate();
  const [status, setStatus]           = useState<Status>('idle');
  const [latest, setLatest]           = useState<Reading | null>(null);
  const [history, setHistory]         = useState<HistEntry[]>([]);
  const [lastTime, setLastTime]       = useState('');
  const [errorMsg, setErrorMsg]       = useState('');
  const [arduinoActive, setArduinoActive] = useState(false);
  const [toasts, setToasts]           = useState<Toast[]>([]);
  const [limits, setLimits]           = useState<Record<string, string>>({});
  const [showLimits, setShowLimits]   = useState(false);
  const [alertedKeys, setAlertedKeys] = useState<Set<string>>(new Set());
  const wsRef       = useRef<WebSocket | null>(null);
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastId     = useRef(0);
  const limitsRef   = useRef<Record<string, string>>({});
  const alertedRef  = useRef<Set<string>>(new Set());
  const checkRef    = useRef<(v: Record<string,number>, p: Record<string,number>) => void>(() => {});

  // Keep refs in sync with state
  useEffect(() => { limitsRef.current = limits; }, [limits]);
  useEffect(() => { alertedRef.current = alertedKeys; }, [alertedKeys]);

  const sensorKeys = latest
    ? Object.keys(latest).filter(k => k !== 'timestamp' && typeof (latest as any)[k] === 'number')
    : [];

  const physics = useMemo(() => {
    if (!latest?.temperature || !latest?.humidity) return null;
    return calcPhysics(latest.temperature, latest.humidity, latest.pressure ?? 101325, latest.temperature_outside);
  }, [latest]);

  // ── Check limits — always up to date via ref ──
  const checkLimits = useCallback((values: Record<string, number>, physVals: Record<string, number>) => {
    const all = { ...values, ...physVals };
    const currentLimits  = limitsRef.current;
    const currentAlerted = new Set(alertedRef.current);
    let changed = false;

    Object.entries(currentLimits).forEach(([key, limitStr]) => {
      const lim = parseFloat(limitStr);
      if (isNaN(lim) || limitStr.trim() === '') return;
      const val = all[key];
      if (val == null) return;

      if (val > lim && !currentAlerted.has(key)) {
        currentAlerted.add(key);
        changed = true;
        beep();
        const meta = SENSOR_META[key] ?? PHYS_META.find(m => m.key === key);
        const unit = (meta as any)?.unit ?? '';
        const id = ++toastId.current;
        setToasts(p => [...p, { id, msg: `${key} exceeded limit — ${val.toFixed(4)} ${unit} (limit: ${lim} ${unit})`, metric: key }]);
        setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 8000);
        // fire email
        const token = localStorage.getItem('token');
        if (token) {
          fetch(`${API_URL}/iot/alert`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ metric: key, value: val, limit: lim, unit }),
          }).catch(() => {});
        }
      } else if (val <= lim && currentAlerted.has(key)) {
        currentAlerted.delete(key);
        changed = true;
      }
    });

    if (changed) {
      alertedRef.current = currentAlerted;
      setAlertedKeys(new Set(currentAlerted));
    }
  }, []);

  // Keep checkRef always pointing to latest checkLimits
  useEffect(() => { checkRef.current = checkLimits; }, [checkLimits]);

  function connect() {
    setStatus('connecting'); setErrorMsg('');
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    ws.onopen = () => setStatus('connected');
    ws.onmessage = (e) => {
      try {
        const data: Reading = JSON.parse(e.data);
        const time = new Date().toLocaleTimeString();
        setLatest(data); setLastTime(time);
        setArduinoActive(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setArduinoActive(false), 5000);
        const values: Record<string, number> = {};
        for (const [k, v] of Object.entries(data))
          if (k !== 'timestamp' && typeof v === 'number') values[k] = v;
        const phys: Record<string, number> = {};
        if (data.temperature != null && data.humidity != null) {
          const p = calcPhysics(data.temperature, data.humidity, data.pressure ?? 101325, data.temperature_outside);
          phys['Air Flow Velocity'] = p.v; phys['Air Density'] = p.rho;
          phys['Dynamic Pressure'] = p.q; phys['Reynolds Number'] = p.Re;
          phys['Mass Flow Rate'] = p.mdot; phys['Volumetric Flow'] = p.Q;
        }
        checkRef.current(values, phys);
        setHistory(prev => { const n = [...prev, { time, values, phys }]; return n.length > MAX_HIST ? n.slice(-MAX_HIST) : n; });
      } catch { /* ignore */ }
    };
    ws.onclose = () => { setStatus(p => p === 'connecting' ? 'error' : 'disconnected'); setErrorMsg('Connection closed.'); };
    ws.onerror = () => { setStatus('error'); setErrorMsg('Could not connect. Is the backend running on port 8000?'); ws.close(); };
  }

  function disconnect() {
    wsRef.current?.close();
    if (timerRef.current) clearTimeout(timerRef.current);
    setStatus('idle'); setLatest(null); setHistory([]); setLastTime(''); setArduinoActive(false);
  }

  useEffect(() => () => { wsRef.current?.close(); if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const regimeColor = physics?.regime === 'Laminar' ? '#10b981' : physics?.regime === 'Transition' ? '#f59e0b' : '#ef4444';

  // All configurable limit keys
  const limitableKeys = [
    ...Object.keys(SENSOR_META).map(k => ({ key: k, label: SENSOR_META[k].label, unit: SENSOR_META[k].unit })),
    ...PHYS_META.map(m => ({ key: m.key, label: m.key, unit: m.unit })),
  ];

  return (
    <div style={s.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap');
        *{box-sizing:border-box;}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        @keyframes glow{0%,100%{box-shadow:0 0 6px #22c55e80}50%{box-shadow:0 0 16px #22c55e}}
        @keyframes slideIn{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:none}}
        @keyframes slideOut{to{opacity:0;transform:translateX(40px)}}
      `}</style>

      {/* Toast notifications */}
      <div style={{ position:'fixed', top:20, right:20, zIndex:1000, display:'flex', flexDirection:'column', gap:10, maxWidth:380 }}>
        {toasts.map(t => (
          <div key={t.id} style={{ background:'#fff', border:'1.5px solid #fca5a5', borderLeft:'4px solid #ef4444', borderRadius:12, padding:'14px 18px', boxShadow:'0 8px 24px rgba(0,0,0,.12)', animation:'slideIn .3s ease', display:'flex', alignItems:'flex-start', gap:12 }}>
            <div style={{ width:32, height:32, borderRadius:8, background:'#fef2f2', border:'1px solid #fecaca', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <div style={{ width:10, height:10, borderRadius:'50%', background:'#ef4444', animation:'pulse 1s infinite' }} />
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'#dc2626', marginBottom:3 }}>Limit Exceeded</div>
              <div style={{ fontSize:12, color:'#374151', lineHeight:1.5 }}>{t.msg}</div>
              <div style={{ fontSize:11, color:'#9ca3af', marginTop:4 }}>Alert email sent to your inbox</div>
            </div>
            <button onClick={() => setToasts(p => p.filter(x => x.id !== t.id))}
              style={{ background:'none', border:'none', cursor:'pointer', color:'#9ca3af', fontSize:16, padding:0, flexShrink:0 }}>×</button>
          </div>
        ))}
      </div>

      {/* NAV */}
      <nav style={s.nav}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <img src="/logo.png" alt="" style={{ width:32, height:32, objectFit:'contain', borderRadius:8 }} />
          <span style={s.logo}>SmartTracker</span>
          <span style={s.navBadge}>Live IoT</span>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          {status === 'connected' && (
            <button onClick={() => setShowLimits(v => !v)} style={{ ...s.backBtn, background: showLimits ? '#dc2626' : '#0f172a' }}>
              ⚙ Limits
            </button>
          )}
          <button onClick={() => navigate('/dashboard')} style={s.backBtn}>← Dashboard</button>
        </div>
      </nav>

      <main style={s.main}>

        {/* IDLE */}
        {status === 'idle' && (
          <div style={{ ...s.centerWrap, animation:'fadeUp .4s ease' }}>
            <div style={{ fontSize:64, marginBottom:20 }}>📡</div>
            <h2 style={s.idleTitle}>Connect to Arduino</h2>
            <p style={s.idleSub}>Open a live WebSocket connection to start receiving sensor data from your Arduino / ESP device.</p>
            <button style={s.connectBtn} onClick={connect}><span>📶</span> Connect via WiFi</button>
          </div>
        )}

        {/* CONNECTING */}
        {status === 'connecting' && (
          <div style={{ ...s.centerWrap, animation:'fadeUp .4s ease' }}>
            <div style={{ width:56, height:56, border:'4px solid #e2e8f0', borderTopColor:'#3b82f6', borderRadius:'50%', animation:'spin 1s linear infinite', margin:'0 auto 20px' }} />
            <h2 style={s.idleTitle}>Connecting…</h2>
            <p style={s.idleSub}>Opening WebSocket to backend</p>
          </div>
        )}

        {/* ERROR */}
        {(status === 'error' || status === 'disconnected') && (
          <div style={{ ...s.centerWrap, animation:'fadeUp .4s ease' }}>
            <div style={{ fontSize:52, marginBottom:16 }}>⚠️</div>
            <h2 style={{ ...s.idleTitle, color:'#ef4444' }}>Connection Failed</h2>
            <p style={s.idleSub}>{errorMsg}</p>
            <button style={s.connectBtn} onClick={connect}><span>🔄</span> Retry</button>
          </div>
        )}

        {/* CONNECTED */}
        {status === 'connected' && (
          <div style={{ animation:'fadeUp .35s ease' }}>

            {/* Status bar */}
            <div style={s.statusBar}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ width:10, height:10, borderRadius:'50%', background: arduinoActive?'#22c55e':'#f59e0b', display:'inline-block', animation: arduinoActive?'glow 2s infinite':'pulse 1.5s infinite' }} />
                <span style={s.statusTxt}>{arduinoActive ? 'Live — data streaming' : 'Waiting for Arduino…'}</span>
              </div>
              {lastTime && <span style={s.lastTime}>Last update: {lastTime}</span>}
              {alertedKeys.size > 0 && (
                <span style={{ fontSize:12, fontWeight:700, color:'#dc2626', background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:999, padding:'3px 12px', display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ width:7, height:7, borderRadius:'50%', background:'#ef4444', display:'inline-block', animation:'pulse 1s infinite' }} />
                  {alertedKeys.size} limit{alertedKeys.size > 1 ? 's' : ''} exceeded
                </span>
              )}
              <button style={s.disconnectBtn} onClick={disconnect}>Disconnect</button>
            </div>

            {/* Limits panel */}
            {showLimits && (
              <div style={s.limitsCard}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                  <div>
                    <div style={{ fontSize:15, fontWeight:700, color:'#0f172a' }}>Alert Limits</div>
                    <div style={{ fontSize:12, color:'#94a3b8', marginTop:2 }}>Set max values — beep + email alert when exceeded</div>
                  </div>
                  <button onClick={() => { beep(); const id = ++toastId.current; setToasts(p => [...p, { id, msg: 'Test alert — beep and toast are working!', metric: 'test' }]); setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 5000); }}
                    style={{ fontSize:11, color:'#3b82f6', background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:8, padding:'5px 12px', cursor:'pointer' }}>
                    Test Alert
                  </button>
                  <button onClick={() => { alertedRef.current = new Set(); setAlertedKeys(new Set()); }} style={{ fontSize:11, color:'#64748b', background:'#f1f5f9', border:'1px solid #e2e8f0', borderRadius:8, padding:'5px 12px', cursor:'pointer' }}>Reset alerts</button>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:10 }}>
                  {limitableKeys.map(({ key, label, unit }) => (
                    <div key={key} style={{ background: alertedKeys.has(key) ? '#fef2f2' : '#f8fafc', border: `1px solid ${alertedKeys.has(key) ? '#fca5a5' : '#e2e8f0'}`, borderRadius:10, padding:'10px 14px' }}>
                      <div style={{ fontSize:11, fontWeight:600, color: alertedKeys.has(key) ? '#dc2626' : '#64748b', marginBottom:6, display:'flex', justifyContent:'space-between' }}>
                        <span>{label}</span>
                        {unit && <span style={{ color:'#94a3b8' }}>{unit}</span>}
                      </div>
                      <input
                        type="number" placeholder="No limit"
                        value={limits[key] ?? ''}
                        onChange={e => setLimits(p => ({ ...p, [key]: e.target.value }))}
                        style={{ width:'100%', padding:'7px 10px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:13, fontFamily:'"JetBrains Mono",monospace', fontWeight:600, outline:'none', background:'#fff', color:'#0f172a' }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Waiting */}
            {sensorKeys.length === 0 && (
              <div style={s.waitCard}>
                <div style={{ width:48, height:48, borderRadius:'50%', background:'rgba(99,102,241,.1)', margin:'0 auto 16px', animation:'pulse 1.5s infinite' }} />
                <p style={{ fontSize:16, fontWeight:700, color:'#1e293b', margin:'0 0 6px' }}>Waiting for sensor data…</p>
                <p style={{ fontSize:13, color:'#64748b', margin:0 }}>WebSocket open — listening for readings</p>
              </div>
            )}

            {/* Sensor charts */}
            {history.length > 1 && (
              <div style={s.sectionLabel}>Sensor Readings</div>
            )}
            {history.length > 1 && (
              <div style={s.chartsGrid}>
                {sensorKeys.map(k => {
                  const meta = SENSOR_META[k] ?? { label: k.replace(/_/g,' '), unit:'', color:'#6366f1' };
                  const lim = limits[k] ? parseFloat(limits[k]) : undefined;
                  return (
                    <SensorChart key={k} label={meta.label} unit={meta.unit} color={meta.color}
                      current={(latest as any)[k] as number}
                      data={history.map(r => r.values[k] ?? 0)}
                      limit={lim} exceeded={alertedKeys.has(k)} />
                  );
                })}
              </div>
            )}

            {/* Physics panel */}
            {physics && (
              <div style={s.physicsCard}>
                <div style={s.physicsHeader}>
                  <div>
                    <div style={s.physicsTitle}>Calculated Physics</div>
                    <div style={s.physicsSub}>Derived from live sensor readings</div>
                  </div>
                  <div style={{ fontSize:12, fontWeight:700, padding:'4px 14px', borderRadius:999, background: regimeColor+'18', color: regimeColor, border:`1px solid ${regimeColor}40` }}>
                    {physics.regime}
                  </div>
                </div>
                <div style={s.physicsGrid}>
                  {[
                    { label:'Air Flow Velocity', value: physics.v.toFixed(4),    unit:'m/s',   formula:'v = √(2k·ΔT / ρ)' },
                    { label:'Air Density',        value: physics.rho.toFixed(5),  unit:'kg/m³', formula:'ρ = Pd/(Rd·T) + Pv/(Rv·T)' },
                    { label:'Dynamic Pressure',   value: physics.q.toFixed(4),    unit:'Pa',    formula:'q = ½ρv²' },
                    { label:'Reynolds Number',    value: physics.Re.toFixed(1),   unit:'',      formula:'Re = ρvD / μ' },
                    { label:'Mass Flow Rate',     value: physics.mdot.toFixed(6), unit:'kg/s',  formula:'ṁ = ρ · Q' },
                    { label:'Volumetric Flow',    value: physics.Q.toFixed(6),    unit:'m³/s',  formula:'Q = A · v' },
                  ].map(m => {
                    const exceeded = alertedKeys.has(m.label);
                    return (
                      <div key={m.label} style={{ ...s.physicsItem, background: exceeded ? '#fef2f2' : '#fff', borderColor: exceeded ? '#fca5a5' : '#f1f5f9' }}>
                        <div style={s.physicsLabel}>{m.label}</div>
                        <div style={{ ...s.physicsVal, color: exceeded ? '#dc2626' : '#1e293b' }}>
                          {m.value}{m.unit && <span style={s.physicsUnit}> {m.unit}</span>}
                        </div>
                        <div style={s.physicsFormula}>{m.formula}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Physics charts */}
            {history.length > 1 && history.some(h => Object.keys(h.phys).length > 0) && (
              <>
                <div style={s.sectionLabel}>Physics — Live Charts</div>
                <div style={s.chartsGrid}>
                  {PHYS_META.map(({ key, unit, color, get: getVal }) => {
                    const data = history.map(h => h.phys[key] ?? 0);
                    const current = physics ? getVal(physics) : 0;
                    const lim = limits[key] ? parseFloat(limits[key]) : undefined;
                    return (
                      <SensorChart key={key} label={key} unit={unit} color={color}
                        current={current} data={data} limit={lim} exceeded={alertedKeys.has(key)} />
                    );
                  })}
                </div>
              </>
            )}

            {/* Live feed table */}
            {history.length > 0 && (
              <div style={s.tableCard}>
                <div style={s.tableHeader}>
                  <span style={s.tableTitle}>Live Feed</span>
                  <span style={s.countBadge}>{history.length} readings</span>
                </div>
                <div style={{ overflowX:'auto' }}>
                  <table style={s.table}>
                    <thead>
                      <tr>{['Time', ...sensorKeys.map(k => SENSOR_META[k]?.label ?? k)].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {[...history].reverse().map((r, i) => (
                        <tr key={i} style={{ background: i===0 ? '#f0f9ff' : 'transparent', borderBottom:'1px solid #f1f5f9' }}>
                          <td style={s.td}>{r.time}</td>
                          {sensorKeys.map(k => (
                            <td key={k} style={{ ...s.td, fontWeight: i===0?700:400, color: i===0?'#0369a1':'#334155' }}>
                              {r.values[k] != null ? Number(r.values[k]).toFixed(2) : '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// ── Sensor Chart with limit line ──────────────────────────────────────────────
function SensorChart({ label, unit, color, current, data, limit, exceeded }: {
  label: string; unit: string; color: string; current: number;
  data: number[]; limit?: number; exceeded?: boolean;
}) {
  if (data.length < 2) return null;
  const W = 400, H = 90, P = 8;
  const allVals = limit != null ? [...data, limit] : data;
  const min = Math.min(...allVals), max = Math.max(...allVals);
  const range = max - min || 1;
  const x = (i: number) => P + (i / (data.length - 1)) * (W - P * 2);
  const y = (v: number) => P + (1 - (v - min) / range) * (H - P * 2);
  const pts = data.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `${pts} L${x(data.length-1).toFixed(1)},${H} L${P},${H} Z`;
  const id = `g-${label.replace(/\W/g,'')}`;
  const borderColor = exceeded ? '#fca5a5' : '#e2e8f0';
  const cardColor = exceeded ? '#fef2f2' : '#fff';

  return (
    <div style={{ background: cardColor, borderRadius:16, padding:'18px 20px', border:`1.5px solid ${borderColor}`, boxShadow: exceeded ? '0 0 0 3px #fca5a540' : '0 1px 4px rgba(0,0,0,.04)', transition:'all .2s' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
        <div>
          <div style={{ fontSize:11, fontWeight:700, color: exceeded ? '#dc2626' : '#94a3b8', textTransform:'uppercase', letterSpacing:'0.08em' }}>{label}</div>
          {unit && <div style={{ fontSize:10, color:'#cbd5e1', marginTop:1 }}>{unit}</div>}
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:24, fontWeight:800, color: exceeded ? '#dc2626' : color, fontFamily:'"JetBrains Mono",monospace', lineHeight:1 }}>
            {current.toFixed(3)}
            <span style={{ fontSize:11, fontWeight:500, color:'#94a3b8', marginLeft:4 }}>{unit}</span>
          </div>
          {limit != null && (
            <div style={{ fontSize:10, color: exceeded ? '#dc2626' : '#94a3b8', marginTop:2 }}>
              {exceeded ? '🚨' : '⚡'} limit: {limit}
            </div>
          )}
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', height:80, display:'block' }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={exceeded ? '#ef4444' : color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={exceeded ? '#ef4444' : color} stopOpacity="0.01" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${id})`} />
        <path d={pts} fill="none" stroke={exceeded ? '#ef4444' : color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={x(data.length-1)} cy={y(data[data.length-1])} r="4" fill={exceeded ? '#ef4444' : color} stroke="#fff" strokeWidth="2" />
        {/* Limit line */}
        {limit != null && (
          <>
            <line x1={P} y1={y(limit).toFixed(1)} x2={W-P} y2={y(limit).toFixed(1)}
              stroke="#ef4444" strokeWidth="1.5" strokeDasharray="5,4" opacity="0.7" />
            <text x={W-P-2} y={y(limit)-4} textAnchor="end" fontSize="9" fill="#ef4444" opacity="0.8">limit</text>
          </>
        )}
      </svg>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#cbd5e1', marginTop:4 }}>
        <span>{min.toFixed(3)}</span><span>{max.toFixed(3)}</span>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  page:     { minHeight:'100vh', background:'#f8fafc', fontFamily:'"Inter",sans-serif' },
  nav:      { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 32px', background:'#fff', borderBottom:'1px solid #e2e8f0', position:'sticky', top:0, zIndex:50 },
  logo:     { fontSize:17, fontWeight:800, color:'#0f172a' },
  navBadge: { fontSize:11, padding:'3px 10px', borderRadius:999, background:'#eff6ff', color:'#3b82f6', fontWeight:700, border:'1px solid #bfdbfe' },
  backBtn:  { padding:'8px 18px', background:'#0f172a', color:'#fff', border:'none', borderRadius:10, cursor:'pointer', fontSize:13, fontWeight:600 },
  main:     { maxWidth:1100, margin:'0 auto', padding:'32px 24px' },

  centerWrap: { maxWidth:460, margin:'80px auto 0', textAlign:'center' },
  idleTitle:  { fontSize:22, fontWeight:800, color:'#0f172a', margin:'0 0 10px' },
  idleSub:    { fontSize:14, color:'#64748b', lineHeight:1.7, margin:'0 0 28px' },
  connectBtn: { display:'inline-flex', alignItems:'center', gap:10, padding:'13px 32px', background:'linear-gradient(135deg,#3b82f6,#6366f1)', color:'#fff', border:'none', borderRadius:12, cursor:'pointer', fontSize:15, fontWeight:700, boxShadow:'0 4px 16px rgba(99,102,241,.35)' },

  statusBar:    { display:'flex', alignItems:'center', gap:12, background:'#fff', padding:'12px 20px', borderRadius:12, marginBottom:20, border:'1px solid #e2e8f0', flexWrap:'wrap' },
  statusTxt:    { fontSize:13, fontWeight:600, color:'#1e293b' },
  lastTime:     { fontSize:12, color:'#94a3b8', marginLeft:'auto' },
  disconnectBtn:{ padding:'6px 14px', background:'#fff', color:'#ef4444', border:'1px solid #fecaca', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:600 },

  limitsCard: { background:'#fff', borderRadius:16, border:'1px solid #e2e8f0', padding:'20px 24px', marginBottom:20 },
  waitCard:   { background:'#fff', borderRadius:16, padding:'48px 24px', textAlign:'center', border:'1px solid #e2e8f0', marginBottom:20 },
  sectionLabel: { fontSize:12, fontWeight:700, color:'#64748b', textTransform:'uppercase' as const, letterSpacing:'0.08em', marginBottom:12 },
  chartsGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:16, marginBottom:24 },

  physicsCard:   { background:'#fff', borderRadius:16, border:'1px solid #e2e8f0', overflow:'hidden', marginBottom:24 },
  physicsHeader: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'18px 24px', borderBottom:'1px solid #f1f5f9' },
  physicsTitle:  { fontSize:15, fontWeight:800, color:'#0f172a' },
  physicsSub:    { fontSize:12, color:'#94a3b8', marginTop:2 },
  physicsGrid:   { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:0 },
  physicsItem:   { padding:'18px 20px', borderRight:'1px solid #f1f5f9', borderBottom:'1px solid #f1f5f9', transition:'background .15s' },
  physicsLabel:  { fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase' as const, letterSpacing:'0.07em', marginBottom:6 },
  physicsVal:    { fontSize:17, fontWeight:800, fontFamily:'"JetBrains Mono",monospace', lineHeight:1.2 },
  physicsUnit:   { fontSize:11, fontWeight:500, color:'#94a3b8' },
  physicsFormula:{ fontSize:10, color:'#cbd5e1', fontFamily:'"JetBrains Mono",monospace', marginTop:5 },

  tableCard:   { background:'#fff', borderRadius:16, border:'1px solid #e2e8f0', overflow:'hidden' },
  tableHeader: { display:'flex', alignItems:'center', gap:10, padding:'16px 24px', borderBottom:'1px solid #f1f5f9' },
  tableTitle:  { fontSize:14, fontWeight:700, color:'#0f172a' },
  countBadge:  { fontSize:11, background:'#eff6ff', color:'#3b82f6', padding:'2px 8px', borderRadius:999, fontWeight:700, border:'1px solid #bfdbfe' },
  table:       { width:'100%', borderCollapse:'collapse' as const, fontSize:13 },
  th:          { textAlign:'left' as const, padding:'9px 16px', background:'#f8fafc', color:'#64748b', fontWeight:600, fontSize:11, textTransform:'uppercase' as const, letterSpacing:'0.06em', borderBottom:'1px solid #e2e8f0' },
  td:          { padding:'9px 16px', color:'#334155', fontSize:13 },
};
