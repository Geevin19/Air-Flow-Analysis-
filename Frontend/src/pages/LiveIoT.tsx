import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const WS_URL  = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/^http/, 'ws') + '/ws/iot';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const MAX_HIST = 50;

// ── Physics per pipe ──────────────────────────────────────────────────────────
function satP(Tk: number) {
  const T = Tk - 273.15;
  return 610.78 * Math.exp((17.27 * T) / (T + 237.3));
}
function calcPhysics(temp: number, hum: number, pipeD: number, pres = 101325) {
  const K_CAL = 0.04;
  const T1 = temp + 273.15, T2 = (temp - 2) + 273.15;
  const Pv = (hum / 100) * satP(T1), Pd = pres - Pv;
  const rho = (Pd / (287.05 * T1)) + (Pv / (461.5 * T1));
  const mu = 1.716e-5 * Math.pow(T1 / 273.15, 1.5) * ((273.15 + 110.4) / (T1 + 110.4));
  const v = Math.sqrt((2 * K_CAL * (T1 - T2)) / rho);
  const A = Math.PI * (pipeD / 2) ** 2, Q = A * v;
  const Re = mu > 0 ? (rho * v * pipeD) / mu : 0;
  return { rho, v, Q, mdot: rho * Q, q: 0.5 * rho * v * v, Re,
    regime: Re < 2300 ? 'Laminar' : Re < 4000 ? 'Transition' : 'Turbulent' };
}
function calcGasPipe(gas: number, pipeD: number) {
  // Treat gas value as proportional to flow velocity (calibrated)
  const v = gas / 1000;  // rough calibration: 1000 ppm ≈ 1 m/s
  const A = Math.PI * (pipeD / 2) ** 2;
  const Q = A * v;
  const rho = 1.2;  // approx air density
  const Re = (rho * v * pipeD) / 1.8e-5;
  return { v, Q, rho, Re, q: 0.5 * rho * v * v,
    regime: Re < 2300 ? 'Laminar' : Re < 4000 ? 'Transition' : 'Turbulent' };
}

interface Reading { pressure?: number; temperature?: number; temperature_outside?: number; flow_rate?: number; humidity?: number; airflow?: number; timestamp?: string; }
interface HistEntry { time: string; values: Record<string, number>; phys: Record<string, number>; }
type Status = 'idle' | 'connecting' | 'connected' | 'error' | 'disconnected';
interface Toast { id: number; msg: string; metric: string; }

const SENSOR_META: Record<string, { label: string; unit: string; color: string }> = {
  temperature: { label: 'Temperature', unit: '°C',  color: '#f97316' },
  humidity:    { label: 'Humidity',    unit: '%',   color: '#6366f1' },
  gas:         { label: 'Gas',         unit: 'ppm', color: '#ef4444' },
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

// ── Shared idle input styles ──────────────────────────────────────────────────
const idleLabel: React.CSSProperties = { display:'block', fontSize:12, fontWeight:600, color:'#374151', marginBottom:6 };
const idleInput: React.CSSProperties = { width:'100%', padding:'10px 14px', border:'1.5px solid #e2e8f0', borderRadius:10, fontSize:14, color:'#0f172a', background:'#f8fafc', fontFamily:'"Inter",sans-serif', outline:'none' };

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
  const [arduinoIp, setArduinoIp]     = useState(() => localStorage.getItem('arduino_ip') || '192.168.8.102');
  const [showIpEdit, setShowIpEdit]   = useState(false);
  const [newIp, setNewIp]             = useState('');
  const [isWorker, setIsWorker]       = useState(false);
  const [limitPending, setLimitPending] = useState<Set<string>>(new Set());
  const [wifiSsid, setWifiSsid]       = useState(() => localStorage.getItem('arduino_ssid') || '');
  const [wifiPass, setWifiPass]       = useState('');
  const [showWifiChange, setShowWifiChange] = useState(false);
  const [newSsid, setNewSsid]         = useState('');
  const [newPass, setNewPass]         = useState('');
  const [wifiMsg, setWifiMsg]         = useState('');
  const [deviceId, setDeviceId]       = useState(() => localStorage.getItem('arduino_device_id') || 'ARDUINO_001');
  const [isFirstTime]                 = useState(() => !localStorage.getItem('arduino_device_id'));
  // Pipe diameters (user adjustable)
  const [pipe1D, setPipe1D]           = useState(() => parseFloat(localStorage.getItem('pipe1_d') || '0.05'));
  const [pipe2D, setPipe2D]           = useState(() => parseFloat(localStorage.getItem('pipe2_d') || '0.05'));
  const [showPipeEdit, setShowPipeEdit] = useState(false);
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
    ? Object.keys(latest).filter(k => !['timestamp','device_id','pipe_diameter_m','flow_angle_deg','k_calibration'].includes(k) && typeof (latest as any)[k] === 'number')
    : [];

  const physics1 = useMemo(() => {
    if (!latest?.temperature || !latest?.humidity) return null;
    return calcPhysics(latest.temperature, latest.humidity, pipe1D, latest.pressure ?? 101325);
  }, [latest, pipe1D]);

  const physics2 = useMemo(() => {
    if (latest?.gas == null) return null;
    return calcGasPipe(latest.gas, pipe2D);
  }, [latest, pipe2D]);

  // Keep backward compat for checkLimits
  const physics = physics1;

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

  // Check if current user is a worker (needs manager approval for limits)
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch(`${API_URL}/users/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then(u => setIsWorker(u.role === 'worker')).catch(() => {});
    }
  }, []);

  // Push limits to backend — workers request approval, managers set directly
  const pushLimitsToBackend = useCallback(async (key: string, value: string) => {
    const val = parseFloat(value);
    if (isNaN(val)) return;
    const token = localStorage.getItem('token');

    if (isWorker && token) {
      // Worker: send limit request for manager approval
      try {
        await fetch(`${API_URL}/limits/request`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ metric: key, value: val }),
        });
        setLimitPending(p => new Set([...p, key]));
        const id = ++toastId.current;
        setToasts(p => [...p, { id, msg: `Limit request for ${key} sent to manager for approval`, metric: key }]);
        setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 5000);
      } catch { /* ignore */ }
    } else {
      // Manager or no auth: set directly
      const body: Record<string, number> = {};
      const metaKey = key === 'temperature' ? 'temp_limit' : key === 'humidity' ? 'humidity_limit' : key.toLowerCase().replace(/ /g, '_') + '_limit';
      body[metaKey] = val;
      try {
        await fetch(`${API_URL}/iot/config`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } catch { /* ignore */ }
    }
  }, [isWorker]);

  function connect() {
    setStatus('connecting'); setErrorMsg('');
    // Send WiFi credentials to backend so Arduino can pick them up
    if (wifiSsid) {
      fetch(`${API_URL}/iot/wifi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ssid: wifiSsid, password: wifiPass }),
      }).catch(() => {});
    }

    if (isFirstTime) {
      // First time: verify device ID exists before opening dashboard
      fetch(`${API_URL}/iot/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: deviceId.trim(), ip: arduinoIp }),
      }).then(async r => {
        if (!r.ok) {
          const err = await r.json();
          setStatus('error');
          setErrorMsg(err.detail || 'Device not found. Make sure Arduino is running and sending data.');
          return;
        }
        // Save credentials for future visits
        localStorage.setItem('arduino_ip',        arduinoIp);
        localStorage.setItem('arduino_device_id', deviceId.trim());
        localStorage.setItem('arduino_ssid',      wifiSsid);
        openWebSocket();
      }).catch(() => openWebSocket());
    } else {
      // Return visit: skip verification, connect directly
      openWebSocket();
    }
  }

  function openWebSocket() {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    ws.onopen = () => {
      setStatus('connected');
      // Also poll /sensors every 3s for Arduino sketches that POST to /update
      const poll = setInterval(async () => {
        try {
          const res = await fetch(`${API_URL}/sensors`);
          if (res.ok) {
            const data = await res.json();
            if (data.source === 'wifi') {
              const time = new Date().toLocaleTimeString();
              setLatest(data); setLastTime(time);
              setArduinoActive(true);
              if (timerRef.current) clearTimeout(timerRef.current);
              timerRef.current = setTimeout(() => setArduinoActive(false), 5000);
              const values: Record<string, number> = {};
              for (const [k, v] of Object.entries(data))
                if (k !== 'timestamp' && k !== 'source' && typeof v === 'number') values[k] = v;
              const phys: Record<string, number> = {};
              if (data.temp != null && data.humidity != null) {
                const p = calcPhysics(data.temp, data.humidity);
                phys['Air Flow Velocity'] = p.v; phys['Air Density'] = p.rho;
                phys['Dynamic Pressure'] = p.q; phys['Reynolds Number'] = p.Re;
                phys['Mass Flow Rate'] = p.mdot; phys['Volumetric Flow'] = p.Q;
              }
              checkRef.current(values, phys);
              setHistory(prev => { const n = [...prev, { time, values, phys }]; return n.length > MAX_HIST ? n.slice(-MAX_HIST) : n; });
            }
          }
        } catch { /* ignore */ }
      }, 3000);
      (wsRef.current as any)._poll = poll;
    };
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
    ws.onclose = () => {
      if ((wsRef.current as any)?._poll) clearInterval((wsRef.current as any)._poll);
      setStatus(p => p === 'connecting' ? 'error' : 'disconnected'); setErrorMsg('Connection closed.');
    };
    ws.onerror = () => {
      if ((wsRef.current as any)?._poll) clearInterval((wsRef.current as any)._poll);
      setStatus('error'); setErrorMsg('Could not connect. Is the backend running on port 8000?'); ws.close();
    };
  }

  function disconnect() {
    wsRef.current?.close();
    if (timerRef.current) clearTimeout(timerRef.current);
    setStatus('idle'); setLatest(null); setHistory([]); setLastTime(''); setArduinoActive(false);
  }

  useEffect(() => () => { wsRef.current?.close(); if (timerRef.current) clearTimeout(timerRef.current); }, []);

  // Auto-connect on return visits (skip setup screen)
  useEffect(() => {
    if (!isFirstTime) {
      connect();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

          <div style={{ position:'fixed', top:20, right:20, zIndex:1000, display:'flex', flexDirection:'column', gap:10, maxWidth:380 }}>
            {toasts.map(t => (
              <div key={t.id} style={{ background:'#fff', border:'1.5px solid #fca5a5', borderLeft:'4px solid #ef4444', borderRadius:12, padding:'14px 18px', boxShadow:'0 8px 24px rgba(0,0,0,.12)', animation:'slideIn .3s ease', display:'flex', alignItems:'flex-start', gap:12 }}>
                <div style={{ width:32, height:32, borderRadius:8, background:'#fef2f2', border:'1px solid #fecaca', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <div style={{ width:10, height:10, borderRadius:'50%', background:'#ef4444', animation:'pulse 1s infinite' }} />
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'#dc2626', marginBottom:3 }}>Limit Exceeded</div>
                  <div style={{ fontSize:12, color:'#374151', lineHeight:1.5 }}>{t.msg}</div>
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
            <>
              <button onClick={() => setShowWifiChange(v => !v)}
                style={{ ...s.backBtn, background: showWifiChange ? '#7c3aed' : '#0f172a' }}>
                WiFi
              </button>
              <button onClick={() => setShowPipeEdit(v => !v)}
                style={{ ...s.backBtn, background: showPipeEdit ? '#0369a1' : '#0f172a' }}>
                Pipes
              </button>
              <button onClick={() => setShowLimits(v => !v)} style={{ ...s.backBtn, background: showLimits ? '#dc2626' : '#0f172a' }}>
                Limits
              </button>
            </>
          )}
          <button onClick={() => navigate('/dashboard')} style={s.backBtn}>← Dashboard</button>
        </div>
      </nav>

      <main style={s.main}>

        {/* IDLE — only shown on first time or after disconnect */}
        {status === 'idle' && (
          <div style={{ ...s.centerWrap, animation:'fadeUp .4s ease' }}>
            <div style={{ fontSize:56, marginBottom:16 }}>📡</div>
            <h2 style={s.idleTitle}>Connect to Arduino</h2>
            <p style={s.idleSub}>Enter your Arduino's IP address and WiFi credentials to start receiving live sensor data.</p>

            <div style={{ width:'100%', maxWidth:400, textAlign:'left' }}>
              <div style={{ marginBottom:14 }}>
                <label style={idleLabel}>
                  Device ID <span style={{ color:'#ef4444', fontWeight:700 }}>*</span>
                </label>
                <input type="text" value={deviceId} onChange={e => setDeviceId(e.target.value.toUpperCase())}
                  placeholder="e.g. ARDUINO_001"
                  style={{ ...idleInput, fontFamily:'"JetBrains Mono",monospace', fontWeight:700, letterSpacing:'0.05em' }} />
                <p style={{ fontSize:11, color:'#94a3b8', marginTop:4 }}>
                  Must match <code style={{ background:'#f1f5f9', padding:'1px 5px', borderRadius:4 }}>device_id</code> in your Arduino sketch
                </p>
              </div>

              <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:12, padding:'16px', marginBottom:20 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'#374151', marginBottom:12 }}>WiFi Credentials (sent to Arduino)</div>
                <div style={{ marginBottom:10 }}>
                  <label style={idleLabel}>WiFi SSID</label>
                  <input type="text" value={wifiSsid} onChange={e => setWifiSsid(e.target.value)}
                    placeholder="Your WiFi network name"
                    style={idleInput} />
                </div>
                <div>
                  <label style={idleLabel}>WiFi Password</label>
                  <input type="password" value={wifiPass} onChange={e => setWifiPass(e.target.value)}
                    placeholder="Your WiFi password"
                    style={idleInput} />
                </div>
              </div>
            </div>

            <button style={s.connectBtn} onClick={connect}><span>📶</span> Connect via WiFi</button>

            {!isFirstTime && (
              <button onClick={() => { localStorage.removeItem('arduino_device_id'); localStorage.removeItem('arduino_ip'); localStorage.removeItem('arduino_ssid'); window.location.reload(); }}
                style={{ marginTop:12, background:'none', border:'none', color:'#94a3b8', fontSize:12, cursor:'pointer', fontFamily:'"Inter",sans-serif' }}>
                Reset saved device
              </button>
            )}
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
              <span style={{ fontSize:11, color:'#94a3b8', background:'#f1f5f9', padding:'2px 8px', borderRadius:6, fontFamily:'monospace', fontWeight:700 }}>{deviceId}</span>
              {arduinoIp && (
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  {showIpEdit ? (
                    <>
                      <input value={newIp} onChange={e => setNewIp(e.target.value)}
                        placeholder={arduinoIp}
                        style={{ fontSize:12, padding:'3px 8px', border:'1px solid #e2e8f0', borderRadius:6, fontFamily:'monospace', width:140, outline:'none' }} />
                      <button onClick={() => { if (newIp.trim()) setArduinoIp(newIp.trim()); setShowIpEdit(false); setNewIp(''); }}
                        style={{ fontSize:11, padding:'3px 10px', background:'#dcfce7', color:'#16a34a', border:'1px solid #bbf7d0', borderRadius:6, cursor:'pointer' }}>Save</button>
                      <button onClick={() => { setShowIpEdit(false); setNewIp(''); }}
                        style={{ fontSize:11, padding:'3px 8px', background:'#f8fafc', color:'#64748b', border:'1px solid #e2e8f0', borderRadius:6, cursor:'pointer' }}>✕</button>
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize:11, color:'#94a3b8', background:'#f1f5f9', padding:'2px 8px', borderRadius:6, fontFamily:'monospace' }}>{arduinoIp}</span>
                      <button onClick={() => { setNewIp(arduinoIp); setShowIpEdit(true); }}
                        style={{ fontSize:11, padding:'2px 8px', background:'#eff6ff', color:'#3b82f6', border:'1px solid #bfdbfe', borderRadius:6, cursor:'pointer' }}>Change WiFi</button>
                    </>
                  )}
                </div>
              )}
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

            {/* WiFi change panel */}
            {showWifiChange && (
              <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:'16px 20px', marginBottom:16 }}>
                <div style={{ fontSize:14, fontWeight:700, color:'#0f172a', marginBottom:12 }}>Change Arduino WiFi</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                  <div>
                    <label style={{ display:'block', fontSize:11, fontWeight:600, color:'#374151', marginBottom:5 }}>New SSID</label>
                    <input type="text" value={newSsid} onChange={e => setNewSsid(e.target.value)}
                      placeholder="WiFi network name"
                      style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:13, fontFamily:'"Inter",sans-serif', outline:'none' }} />
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:11, fontWeight:600, color:'#374151', marginBottom:5 }}>New Password</label>
                    <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)}
                      placeholder="WiFi password"
                      style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #e2e8f0', borderRadius:8, fontSize:13, fontFamily:'"Inter",sans-serif', outline:'none' }} />
                  </div>
                </div>
                {wifiMsg && <p style={{ fontSize:12, color: wifiMsg.includes('sent')?'#16a34a':'#dc2626', marginBottom:10 }}>{wifiMsg}</p>}
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={async () => {
                    if (!newSsid.trim()) { setWifiMsg('SSID is required'); return; }
                    try {
                      await fetch(`${API_URL}/iot/wifi`, {
                        method:'POST', headers:{'Content-Type':'application/json'},
                        body: JSON.stringify({ ssid: newSsid, password: newPass }),
                      });
                      setWifiMsg(`WiFi credentials sent to Arduino — it will reconnect to "${newSsid}"`);
                      setTimeout(() => { setShowWifiChange(false); setWifiMsg(''); setNewSsid(''); setNewPass(''); }, 3000);
                    } catch { setWifiMsg('Failed to send credentials'); }
                  }} style={{ padding:'8px 18px', background:'linear-gradient(135deg,#2563eb,#7c3aed)', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'"Inter",sans-serif' }}>
                    Send to Arduino
                  </button>
                  <button onClick={() => { setShowWifiChange(false); setWifiMsg(''); }}
                    style={{ padding:'8px 14px', background:'#f8fafc', color:'#64748b', border:'1px solid #e2e8f0', borderRadius:8, cursor:'pointer', fontSize:13, fontFamily:'"Inter",sans-serif' }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Inline active alerts on page */}
            {alertedKeys.size > 0 && (
              <div style={{ background:'#fef2f2', border:'1.5px solid #fca5a5', borderRadius:12, padding:'14px 20px', marginBottom:16 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'#dc2626', marginBottom:10, display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ width:8, height:8, borderRadius:'50%', background:'#ef4444', display:'inline-block', animation:'pulse 1s infinite' }} />
                  {alertedKeys.size} Active Alert{alertedKeys.size > 1 ? 's' : ''}
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {Array.from(alertedKeys).map(key => {
                    const lim = parseFloat(limits[key] ?? '0');
                    const meta = SENSOR_META[key] ?? PHYS_META.find(m => m.key === key);
                    const unit = (meta as any)?.unit ?? '';
                    return (
                      <div key={key} style={{ fontSize:12, color:'#374151', background:'#fff', borderRadius:8, padding:'8px 12px', border:'1px solid #fecaca', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <span><strong>{key}</strong> exceeded limit of <strong>{lim} {unit}</strong></span>
                        <button onClick={() => { const n = new Set(alertedRef.current); n.delete(key); alertedRef.current = n; setAlertedKeys(new Set(n)); }}
                          style={{ background:'none', border:'none', color:'#9ca3af', cursor:'pointer', fontSize:14 }}>×</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Limits panel */}
            {showLimits && (
              <div style={s.limitsCard}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                  <div>
                    <div style={{ fontSize:15, fontWeight:700, color:'#0f172a' }}>Alert Limits — Per Pipe</div>
                    <div style={{ fontSize:12, color:'#94a3b8', marginTop:2 }}>Set max values per pipe — beep + alert when exceeded</div>
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={() => { beep(); const id = ++toastId.current; setToasts(p => [...p, { id, msg: 'Test alert working!', metric: 'test' }]); setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000); }}
                      style={{ fontSize:11, color:'#3b82f6', background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:8, padding:'5px 12px', cursor:'pointer' }}>Test</button>
                    <button onClick={() => { alertedRef.current = new Set(); setAlertedKeys(new Set()); }}
                      style={{ fontSize:11, color:'#64748b', background:'#f1f5f9', border:'1px solid #e2e8f0', borderRadius:8, padding:'5px 12px', cursor:'pointer' }}>Reset</button>
                  </div>
                </div>

                {/* Pipe 1 limits */}
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'#1d4ed8', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10, padding:'6px 12px', background:'#eff6ff', borderRadius:8, border:'1px solid #bfdbfe', display:'inline-block' }}>
                    Pipe 1 — Temperature · Humidity
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:10 }}>
                    {[
                      { key:'temperature', label:'Temperature', unit:'°C' },
                      { key:'humidity',    label:'Humidity',    unit:'%'  },
                    ].map(({ key, label, unit }) => (
                      <LimitInput key={key} metricKey={key} label={label} unit={unit}
                        limits={limits} setLimits={setLimits} limitsRef={limitsRef}
                        alertedKeys={alertedKeys} limitPending={limitPending}
                        pushLimitsToBackend={pushLimitsToBackend} />
                    ))}
                  </div>
                </div>

                {/* Pipe 2 limits */}
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:'#dc2626', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10, padding:'6px 12px', background:'#fef2f2', borderRadius:8, border:'1px solid #fecaca', display:'inline-block' }}>
                    Pipe 2 — Gas Sensor
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:10 }}>
                    {[
                      { key:'gas', label:'Gas', unit:'ppm' },
                    ].map(({ key, label, unit }) => (
                      <LimitInput key={key} metricKey={key} label={label} unit={unit}
                        limits={limits} setLimits={setLimits} limitsRef={limitsRef}
                        alertedKeys={alertedKeys} limitPending={limitPending}
                        pushLimitsToBackend={pushLimitsToBackend} />
                    ))}
                  </div>
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

            {/* ── PIPE DIAMETER EDITOR ── */}
            {showPipeEdit && (
              <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:'16px 20px', marginBottom:16 }}>
                <div style={{ fontSize:14, fontWeight:700, color:'#0f172a', marginBottom:12 }}>Pipe Diameter Settings</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                  {[
                    { label:'Pipe 1 — Temp/Humidity', key:'pipe1', val:pipe1D, set:(v:number)=>{ setPipe1D(v); localStorage.setItem('pipe1_d', String(v)); } },
                    { label:'Pipe 2 — Gas Sensor',    key:'pipe2', val:pipe2D, set:(v:number)=>{ setPipe2D(v); localStorage.setItem('pipe2_d', String(v)); } },
                  ].map(p => (
                    <div key={p.key} style={{ background:'#f8fafc', borderRadius:10, padding:'14px 16px', border:'1px solid #e2e8f0' }}>
                      <div style={{ fontSize:12, fontWeight:600, color:'#374151', marginBottom:8 }}>{p.label}</div>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <button onClick={() => p.set(Math.max(0.01, parseFloat((p.val - 0.005).toFixed(3))))}
                          style={{ width:32, height:32, borderRadius:8, border:'1px solid #e2e8f0', background:'#fff', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>−</button>
                        <div style={{ flex:1, textAlign:'center', fontSize:18, fontWeight:800, color:'#1d4ed8', fontFamily:'monospace' }}>
                          {p.val.toFixed(3)} <span style={{ fontSize:12, color:'#94a3b8' }}>m</span>
                        </div>
                        <button onClick={() => p.set(parseFloat((p.val + 0.005).toFixed(3)))}
                          style={{ width:32, height:32, borderRadius:8, border:'1px solid #e2e8f0', background:'#fff', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>+</button>
                      </div>
                      <input type="range" min="0.01" max="0.5" step="0.005" value={p.val}
                        onChange={e => p.set(parseFloat(e.target.value))}
                        style={{ width:'100%', marginTop:8, accentColor:'#3b82f6' }} />
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#94a3b8', marginTop:2 }}>
                        <span>1 cm</span><span>50 cm</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── 2-PIPE DASHBOARD ── */}
            {(latest?.temperature != null || latest?.gas != null) && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>

                {/* PIPE 1 — Temp + Humidity */}
                <div style={{ background:'#fff', borderRadius:16, border:'2px solid #3b82f6', overflow:'hidden' }}>
                  <div style={{ background:'linear-gradient(135deg,#1e3a8a,#3b82f6)', padding:'14px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:800, color:'#fff' }}>Pipe 1</div>
                      <div style={{ fontSize:11, color:'rgba(255,255,255,.7)' }}>Temperature · Humidity · Air Flow</div>
                    </div>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,.8)', fontFamily:'monospace' }}>Ø {pipe1D*100} cm</div>
                  </div>
                  <div style={{ padding:'16px' }}>
                    {/* Sensor values */}
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
                      {(['temperature','humidity'] as const).filter(k => latest?.[k] != null).map(k => (
                        <div key={k} style={{ background:'#f8fafc', borderRadius:10, padding:'16px 14px', border:`1px solid ${alertedKeys.has(k)?'#fca5a5':'#e2e8f0'}`, minHeight:120 }}>
                          <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>{SENSOR_META[k]?.label}</div>
                          <div style={{ fontSize:22, fontWeight:800, color: alertedKeys.has(k)?'#dc2626':SENSOR_META[k]?.color, fontFamily:'monospace' }}>
                            {((latest as any)[k] as number).toFixed(2)}
                            <span style={{ fontSize:12, color:'#94a3b8', marginLeft:4 }}>{SENSOR_META[k]?.unit}</span>
                          </div>
                          {history.length > 1 && (
                            <MiniSparkline data={history.map(r => r.values[k] ?? 0)} color={SENSOR_META[k]?.color} limit={limits[k] ? parseFloat(limits[k]) : undefined} />
                          )}
                        </div>
                      ))}
                    </div>
                    {/* Physics for pipe 1 */}
                    {physics1 && (
                      <div style={{ background:'#f0f9ff', borderRadius:10, padding:'12px 14px', border:'1px solid #bfdbfe' }}>
                        <div style={{ fontSize:10, fontWeight:700, color:'#1d4ed8', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8, display:'flex', justifyContent:'space-between' }}>
                          <span>Calculated Physics</span>
                          <span style={{ background: physics1.regime==='Laminar'?'#dcfce7':physics1.regime==='Transition'?'#fef9c3':'#fef2f2', color: physics1.regime==='Laminar'?'#16a34a':physics1.regime==='Transition'?'#a16207':'#dc2626', padding:'1px 8px', borderRadius:999, fontSize:10 }}>{physics1.regime}</span>
                        </div>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                          {[
                            { l:'Velocity',    v: physics1.v.toFixed(4),    u:'m/s' },
                            { l:'Flow Rate Q', v: physics1.Q.toFixed(6),    u:'m³/s' },
                            { l:'Reynolds',    v: physics1.Re.toFixed(0),   u:'' },
                            { l:'Mass Flow',   v: physics1.mdot.toFixed(6), u:'kg/s' },
                          ].map(m => (
                            <div key={m.l}>
                              <div style={{ fontSize:9, color:'#64748b', fontWeight:600, textTransform:'uppercase' }}>{m.l}</div>
                              <div style={{ fontSize:13, fontWeight:700, color:'#1e293b', fontFamily:'monospace' }}>{m.v} <span style={{ fontSize:10, color:'#94a3b8' }}>{m.u}</span></div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* PIPE 2 — Gas */}
                <div style={{ background:'#fff', borderRadius:16, border:'2px solid #ef4444', overflow:'hidden' }}>
                  <div style={{ background:'linear-gradient(135deg,#7f1d1d,#ef4444)', padding:'14px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:800, color:'#fff' }}>Pipe 2</div>
                      <div style={{ fontSize:11, color:'rgba(255,255,255,.7)' }}>Gas Sensor · Flow Analysis</div>
                    </div>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,.8)', fontFamily:'monospace' }}>Ø {pipe2D*100} cm</div>
                  </div>
                  <div style={{ padding:'16px' }}>
                    {/* Gas value */}
                    <div style={{ background:'#fef2f2', borderRadius:10, padding:'16px 14px', border:`1px solid ${alertedKeys.has('gas')?'#fca5a5':'#fecaca'}`, marginBottom:14, minHeight:120 }}>
                      <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>Gas Sensor</div>
                      <div style={{ fontSize:22, fontWeight:800, color: alertedKeys.has('gas')?'#dc2626':'#ef4444', fontFamily:'monospace' }}>
                        {latest?.gas?.toFixed(0) ?? '—'}
                        <span style={{ fontSize:12, color:'#94a3b8', marginLeft:4 }}>ppm</span>
                      </div>
                      {history.length > 1 && (
                        <MiniSparkline data={history.map(r => r.values['gas'] ?? 0)} color="#ef4444" limit={limits['gas'] ? parseFloat(limits['gas']) : undefined} />
                      )}
                    </div>
                    {/* Physics for pipe 2 */}
                    {physics2 && (
                      <div style={{ background:'#fff5f5', borderRadius:10, padding:'12px 14px', border:'1px solid #fecaca' }}>
                        <div style={{ fontSize:10, fontWeight:700, color:'#dc2626', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8, display:'flex', justifyContent:'space-between' }}>
                          <span>Calculated Physics</span>
                          <span style={{ background: physics2.regime==='Laminar'?'#dcfce7':physics2.regime==='Transition'?'#fef9c3':'#fef2f2', color: physics2.regime==='Laminar'?'#16a34a':physics2.regime==='Transition'?'#a16207':'#dc2626', padding:'1px 8px', borderRadius:999, fontSize:10 }}>{physics2.regime}</span>
                        </div>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                          {[
                            { l:'Velocity',    v: physics2.v.toFixed(4),  u:'m/s' },
                            { l:'Flow Rate Q', v: physics2.Q.toFixed(6),  u:'m³/s' },
                            { l:'Reynolds',    v: physics2.Re.toFixed(0), u:'' },
                            { l:'Dyn. Press',  v: physics2.q.toFixed(4),  u:'Pa' },
                          ].map(m => (
                            <div key={m.l}>
                              <div style={{ fontSize:9, color:'#64748b', fontWeight:600, textTransform:'uppercase' }}>{m.l}</div>
                              <div style={{ fontSize:13, fontWeight:700, color:'#1e293b', fontFamily:'monospace' }}>{m.v} <span style={{ fontSize:10, color:'#94a3b8' }}>{m.u}</span></div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
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
                      <tr>{['Time','Temperature','Humidity','Gas'].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {[...history].reverse().map((r, i) => (
                        <tr key={i} style={{ background: i===0 ? '#f0f9ff' : 'transparent', borderBottom:'1px solid #f1f5f9' }}>
                          <td style={s.td}>{r.time}</td>
                          {['temperature','humidity','gas'].map(k => (
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

// ── Reusable limit input ──────────────────────────────────────────────────────
function LimitInput({ metricKey, label, unit, limits, setLimits, limitsRef, alertedKeys, limitPending, pushLimitsToBackend }: {
  metricKey: string; label: string; unit: string;
  limits: Record<string,string>; setLimits: (v: Record<string,string>) => void;
  limitsRef: React.MutableRefObject<Record<string,string>>;
  alertedKeys: Set<string>; limitPending: Set<string>;
  pushLimitsToBackend: (key: string, value: string) => void;
}) {
  const exceeded = alertedKeys.has(metricKey);
  const pending  = limitPending.has(metricKey);
  return (
    <div style={{ background: exceeded ? '#fef2f2' : '#f8fafc', border:`1px solid ${exceeded?'#fca5a5':'#e2e8f0'}`, borderRadius:10, padding:'10px 14px' }}>
      <div style={{ fontSize:11, fontWeight:600, color: exceeded?'#dc2626':'#64748b', marginBottom:6, display:'flex', justifyContent:'space-between' }}>
        <span>{label}</span>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          {unit && <span style={{ color:'#94a3b8' }}>{unit}</span>}
          {pending && <span style={{ fontSize:10, color:'#f59e0b', fontWeight:700 }}>Pending</span>}
        </div>
      </div>
      <input type="number" placeholder="No limit" value={limits[metricKey] ?? ''}
        onBlur={e => { if (e.target.value) { const u = { ...limits, [metricKey]: e.target.value }; setLimits(u); limitsRef.current = u; pushLimitsToBackend(metricKey, e.target.value); } }}
        onChange={e => { const u = { ...limits, [metricKey]: e.target.value }; setLimits(u); limitsRef.current = u; }}
        style={{ width:'100%', padding:'7px 10px', border:`1px solid ${pending?'#fde68a':'#e2e8f0'}`, borderRadius:8, fontSize:13, fontFamily:'"JetBrains Mono",monospace', fontWeight:600, outline:'none', background: pending?'#fefce8':'#fff', color:'#0f172a' }} />
    </div>
  );
}

// ── Mini Sparkline (inline chart inside pipe cards) ───────────────────────────
function MiniSparkline({ data, color, limit }: { data: number[]; color: string; limit?: number }) {
  if (data.length < 2) return null;
  const W = 300, H = 40, P = 4;
  const allVals = limit != null ? [...data, limit] : data;
  const min = Math.min(...allVals), max = Math.max(...allVals);
  const range = max - min || 1;
  const x = (i: number) => P + (i / (data.length - 1)) * (W - P * 2);
  const y = (v: number) => P + (1 - (v - min) / range) * (H - P * 2);
  const pts = data.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const gid = `sp${color.replace(/[^a-z0-9]/gi, '')}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', height:36, display:'block', marginTop:6 }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <path d={`${pts} L${x(data.length-1).toFixed(1)},${H} L${P},${H} Z`} fill={`url(#${gid})`} />
      <path d={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(data.length-1)} cy={y(data[data.length-1])} r="3" fill={color} stroke="#fff" strokeWidth="1.5" />
      {limit != null && (
        <line x1={P} y1={y(limit).toFixed(1)} x2={W-P} y2={y(limit).toFixed(1)}
          stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4,3" opacity="0.7" />
      )}
    </svg>
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
