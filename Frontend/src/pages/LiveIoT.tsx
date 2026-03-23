import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const WS_URL = 'ws://localhost:8000/ws/iot';
const MAX_HISTORY = 40;

interface Reading {
  pressure?: number;
  temperature?: number;
  flow_rate?: number;
  humidity?: number;
  airflow?: number;
  timestamp?: string;
}

interface HistoryEntry {
  time: string;
  values: Record<string, number>;
}

type Status = 'idle' | 'connecting' | 'connected' | 'error' | 'disconnected';

const COLORS: Record<string, string> = {
  pressure: '#2463eb', temperature: '#f97316',
  flow_rate: '#06b6d4', humidity: '#8b5cf6', airflow: '#22c55e',
};
const UNITS: Record<string, string> = {
  pressure: 'hPa', temperature: '°C', flow_rate: 'm/s', humidity: '%', airflow: '',
};
const ICONS: Record<string, string> = {
  pressure: '🔵', temperature: '🟠', flow_rate: '🩵', humidity: '🟣', airflow: '🟢',
};

export default function LiveIoT() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('idle');
  const [latest, setLatest] = useState<Reading | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [lastTime, setLastTime] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [arduinoActive, setArduinoActive] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const arduinoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sensorKeys = latest
    ? Object.keys(latest).filter(k => k !== 'timestamp' && typeof (latest as any)[k] === 'number')
    : [];

  function connect() {
    setStatus('connecting');
    setErrorMsg('');

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => setStatus('connected');

    ws.onmessage = (e) => {
      try {
        const data: Reading = JSON.parse(e.data);
        const time = new Date().toLocaleTimeString();
        setLatest(data);
        setLastTime(time);

        // Mark Arduino as active; clear after 5s of no data
        setArduinoActive(true);
        if (arduinoTimeoutRef.current) clearTimeout(arduinoTimeoutRef.current);
        arduinoTimeoutRef.current = setTimeout(() => setArduinoActive(false), 5000);

        const values: Record<string, number> = {};
        for (const [k, v] of Object.entries(data)) {
          if (k !== 'timestamp' && typeof v === 'number') values[k] = v;
        }
        setHistory(prev => {
          const next = [...prev, { time, values }];
          return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next;
        });
      } catch { /* ignore */ }
    };

    ws.onclose = () => {
      setStatus(prev => prev === 'connecting' ? 'error' : 'disconnected');
      setErrorMsg('Connection closed. Make sure the backend is running.');
    };

    ws.onerror = () => {
      setStatus('error');
      setErrorMsg('Could not connect to backend. Is it running on port 8000?');
      ws.close();
    };
  }

  function disconnect() {
    wsRef.current?.close();
    if (arduinoTimeoutRef.current) clearTimeout(arduinoTimeoutRef.current);
    setStatus('idle');
    setLatest(null);
    setHistory([]);
    setLastTime('');
    setArduinoActive(false);
  }

  useEffect(() => () => {
    wsRef.current?.close();
    if (arduinoTimeoutRef.current) clearTimeout(arduinoTimeoutRef.current);
  }, []);

  return (
    <div style={s.page}>
      {/* NAV */}
      <nav style={s.nav}>
        <div style={s.navLeft}>
          <img src="/logo.png" alt="SmartTracker" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
          <span style={s.logo}>SmartTracker</span>
          <span style={s.badge}>Live IoT</span>
        </div>
        <button onClick={() => navigate('/dashboard')} style={s.backBtn}>← Dashboard</button>
      </nav>

      <main style={s.main}>

        {/* ── IDLE: big connect screen ── */}
        {status === 'idle' && (
          <div style={s.centerCard}>
            <div style={s.wifiIcon}>📡</div>
            <h2 style={s.centerTitle}>Connect to Arduino via WiFi</h2>
            <p style={s.centerSub}>
              Click the button below to open a live WebSocket connection.<br />
              Your Arduino/ESP must be sending data to the backend.
            </p>
            <button style={s.connectBtn} onClick={connect}>
              <span style={{ fontSize: 20 }}>📶</span> Connect via WiFi
            </button>
          </div>
        )}

        {/* ── CONNECTING ── */}
        {status === 'connecting' && (
          <div style={s.centerCard}>
            <div style={s.spinner} />
            <h2 style={s.centerTitle}>Connecting...</h2>
            <p style={s.centerSub}>Opening WebSocket to backend</p>
          </div>
        )}

        {/* ── ERROR / DISCONNECTED ── */}
        {(status === 'error' || status === 'disconnected') && (
          <div style={s.centerCard}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <h2 style={{ ...s.centerTitle, color: '#dc2626' }}>Connection Failed</h2>
            <p style={s.centerSub}>{errorMsg}</p>
            <button style={s.connectBtn} onClick={connect}>
              <span style={{ fontSize: 20 }}>🔄</span> Retry Connection
            </button>
          </div>
        )}

        {/* ── CONNECTED ── */}
        {status === 'connected' && (
          <>
            {/* Status bar */}
            <div style={s.statusBar}>
              <span style={{
                ...s.dotGreen,
                background: arduinoActive ? '#22c55e' : '#f59e0b',
                boxShadow: arduinoActive ? '0 0 8px #22c55e' : '0 0 8px #f59e0b',
              }} />
              <span style={s.statusTxt}>
                {arduinoActive ? 'Connected — live data streaming' : 'Waiting for Arduino...'}
              </span>
              {lastTime && <span style={s.updatedTxt}>Last reading: {lastTime}</span>}
              <button style={s.disconnectBtn} onClick={disconnect}>Disconnect</button>
            </div>

            {/* No data yet — show calculations */}
            {sensorKeys.length === 0 && (
              <div style={s.waitCard}>
                <div style={s.pulseRing} />
                <p style={s.waitTxt}>Waiting for Arduino to send data...</p>
                <p style={s.waitSub}>WebSocket is open. Listening for sensor readings.</p>
                <div style={{ ...s.calcGrid, marginTop: 28, marginBottom: 0 }}>
                  {[
                    { icon: '💨', label: 'Air Flow Velocity', formula: 'v = Q / A', desc: 'Flow rate divided by cross-section area' },
                    { icon: '🌡️', label: 'Air Density', formula: 'ρ = P / (R·T)', desc: 'Pressure over gas constant × temperature' },
                    { icon: '⚡', label: 'Dynamic Pressure', formula: 'q = ½ρv²', desc: 'Half density × velocity squared' },
                    { icon: '📊', label: 'Reynolds Number', formula: 'Re = ρvD / μ', desc: 'Determines laminar vs turbulent flow' },
                    { icon: '💧', label: 'Mass Flow Rate', formula: 'ṁ = ρ · Q', desc: 'Density × volumetric flow rate' },
                    { icon: '🔵', label: 'Pressure Drop', formula: 'ΔP = P₁ − P₂', desc: 'Inlet pressure minus outlet pressure' },
                  ].map(c => (
                    <div key={c.label} style={s.calcCard}>
                      <span style={s.calcIcon}>{c.icon}</span>
                      <div style={s.calcLabel}>{c.label}</div>
                      <div style={s.calcFormula}>{c.formula}</div>
                      <div style={s.calcDesc}>{c.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Metric cards */}
            {sensorKeys.length > 0 && (
              <div style={s.cards}>
                {sensorKeys.map(k => (
                  <MetricCard
                    key={k}
                    label={k.replace(/_/g, ' ')}
                    value={(latest as any)[k] as number}
                    unit={UNITS[k] ?? ''}
                    color={COLORS[k] ?? '#6b7280'}
                    icon={ICONS[k] ?? '📡'}
                  />
                ))}
              </div>
            )}

            {/* Charts */}
            {history.length > 1 && (
              <div style={s.chartsGrid}>
                {sensorKeys.map(k => (
                  <MiniChart
                    key={k}
                    label={`${k.replace(/_/g, ' ')}${UNITS[k] ? ` (${UNITS[k]})` : ''}`}
                    color={COLORS[k] ?? '#6b7280'}
                    data={history.map(r => ({ t: r.time, v: r.values[k] ?? 0 }))}
                  />
                ))}
              </div>
            )}

            {/* Table */}
            {history.length > 0 && (
              <div style={s.tableCard}>
                <h3 style={s.tableTitle}>
                  Live Feed
                  <span style={s.countBadge}>{history.length} readings</span>
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={s.table}>
                    <thead>
                      <tr>
                        <th style={s.th}>Time</th>
                        {sensorKeys.map(k => <th key={k} style={s.th}>{k.replace(/_/g, ' ')}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {[...history].reverse().map((r, i) => (
                        <tr key={i} style={{ ...s.tr, background: i === 0 ? '#eff6ff' : 'transparent' }}>
                          <td style={s.td}>{r.time}</td>
                          {sensorKeys.map(k => (
                            <td key={k} style={{ ...s.td, fontWeight: i === 0 ? 700 : 400 }}>
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
          </>
        )}
      </main>
    </div>
  );
}

function MetricCard({ label, value, unit, color, icon }: {
  label: string; value: number; unit: string; color: string; icon: string;
}) {
  return (
    <div style={{ ...s.metricCard, borderTop: `3px solid ${color}` }}>
      <div style={s.metricIcon}>{icon}</div>
      <div style={{ ...s.metricValue, color }}>{Number(value).toFixed(2)}</div>
      {unit && <div style={{ fontSize: 12, color, fontWeight: 600, marginTop: 2 }}>{unit}</div>}
      <div style={s.metricLabel}>{label}</div>
    </div>
  );
}

function MiniChart({ label, color, data }: {
  label: string; color: string; data: { t: string; v: number }[];
}) {
  if (data.length < 2) return null;
  const W = 300, H = 80, P = 8;
  const vals = data.map(d => d.v);
  const min = Math.min(...vals), max = Math.max(...vals);
  const range = max - min || 1;
  const x = (i: number) => P + (i / (data.length - 1)) * (W - P * 2);
  const y = (v: number) => P + (1 - (v - min) / range) * (H - P * 2);
  const path = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d.v).toFixed(1)}`).join(' ');
  const area = `${path} L${x(data.length - 1).toFixed(1)},${H} L${P},${H} Z`;
  const last = data[data.length - 1];
  return (
    <div style={s.chartCard}>
      <div style={s.chartHeader}>
        <span style={s.chartLabel}>{label}</span>
        <span style={{ fontSize: 15, fontWeight: 800, color }}>{last.v.toFixed(2)}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 72 }}>
        <defs>
          <linearGradient id={`g${label.replace(/\s/g,'')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#g${label.replace(/\s/g,'')})`} />
        <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={x(data.length - 1)} cy={y(last.v)} r="3.5" fill={color} />
      </svg>
      <div style={s.chartRange}>
        <span>{min.toFixed(1)}</span><span>{max.toFixed(1)}</span>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#f1f5f9', fontFamily: 'Arial, sans-serif' },
  nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px', background: '#fff', boxShadow: '0 1px 8px rgba(0,0,0,.07)' },
  navLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  logo: { fontSize: 20, fontWeight: 800, color: '#1e3a8a' },
  badge: { fontSize: 12, padding: '4px 10px', borderRadius: 999, background: '#dbeafe', color: '#1d4ed8', fontWeight: 700 },
  backBtn: { padding: '8px 16px', background: '#1e3a8a', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 },
  main: { maxWidth: 1100, margin: '0 auto', padding: '48px 24px' },

  // center screens
  centerCard: { background: '#fff', borderRadius: 20, padding: '56px 40px', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,.08)', maxWidth: 520, margin: '0 auto' },
  wifiIcon: { fontSize: 64, marginBottom: 20 },
  centerTitle: { fontSize: 22, fontWeight: 800, color: '#111827', margin: '0 0 10px' },
  centerSub: { fontSize: 14, color: '#6b7280', lineHeight: 1.7, margin: '0 0 28px' },
  endpointBox: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px 20px', marginBottom: 28, textAlign: 'left' },
  endpointLabel: { display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  endpointCode: { display: 'block', fontSize: 13, color: '#1d4ed8', fontFamily: 'monospace', marginBottom: 4 },
  calcGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 28, textAlign: 'left' },
  calcCard: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px' },
  calcIcon: { fontSize: 20, display: 'block', marginBottom: 6 },
  calcLabel: { fontSize: 12, fontWeight: 700, color: '#111827', marginBottom: 3 },
  calcFormula: { fontSize: 13, fontWeight: 800, color: '#2463eb', fontFamily: 'monospace', marginBottom: 3 },
  calcDesc: { fontSize: 11, color: '#6b7280', lineHeight: 1.4 },
  connectBtn: { display: 'inline-flex', alignItems: 'center', gap: 10, padding: '14px 32px', background: 'linear-gradient(135deg,#2463eb,#06b6d4)', color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer', fontSize: 16, fontWeight: 800, boxShadow: '0 4px 20px rgba(36,99,235,.35)', transition: 'transform .15s' },

  // spinner
  spinner: { width: 48, height: 48, border: '4px solid #dbeafe', borderTopColor: '#2463eb', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' },

  // status bar
  statusBar: { display: 'flex', alignItems: 'center', gap: 10, background: '#fff', padding: '10px 16px', borderRadius: 10, marginBottom: 24, boxShadow: '0 1px 6px rgba(0,0,0,.06)', flexWrap: 'wrap' },
  dotGreen: { width: 10, height: 10, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e', flexShrink: 0 },
  statusTxt: { fontSize: 13, fontWeight: 700, color: '#111827' },
  updatedTxt: { fontSize: 12, color: '#6b7280', marginLeft: 'auto' },
  disconnectBtn: { padding: '6px 14px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700 },

  // wait card
  waitCard: { background: '#fff', borderRadius: 16, padding: '48px 24px', textAlign: 'center', boxShadow: '0 2px 10px rgba(0,0,0,.06)', marginBottom: 24 },
  pulseRing: { width: 48, height: 48, borderRadius: '50%', background: '#dbeafe', margin: '0 auto 16px', animation: 'pulse 1.5s ease-in-out infinite' },
  waitTxt: { fontSize: 17, fontWeight: 700, color: '#111827', margin: '0 0 6px' },
  waitSub: { fontSize: 13, color: '#6b7280' },

  // metric cards
  cards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16, marginBottom: 28 },
  metricCard: { background: '#fff', borderRadius: 12, padding: '20px 16px', boxShadow: '0 2px 10px rgba(0,0,0,.06)', textAlign: 'center' },
  metricIcon: { fontSize: 26, marginBottom: 8 },
  metricValue: { fontSize: 28, fontWeight: 800, lineHeight: 1 },
  metricLabel: { fontSize: 11, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginTop: 6 },

  // charts
  chartsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, marginBottom: 28 },
  chartCard: { background: '#fff', borderRadius: 12, padding: '14px 16px', boxShadow: '0 2px 10px rgba(0,0,0,.06)' },
  chartHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  chartLabel: { fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: 1 },
  chartRange: { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9ca3af', marginTop: 2 },

  // table
  tableCard: { background: '#fff', borderRadius: 12, padding: '20px 24px', boxShadow: '0 2px 10px rgba(0,0,0,.06)' },
  tableTitle: { fontSize: 16, fontWeight: 800, color: '#111827', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 10 },
  countBadge: { fontSize: 12, background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: 999, fontWeight: 600 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '8px 12px', background: '#f9fafb', color: '#6b7280', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1px solid #e5e7eb' },
  tr: { borderBottom: '1px solid #f3f4f6', transition: 'background .2s' },
  td: { padding: '7px 12px', color: '#111827' },
};
