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

export default function LiveIoT() {
  const navigate = useNavigate();
  const [latest, setLatest] = useState<Reading | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const [lastTime, setLastTime] = useState('');
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout>;

    function connect() {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => setConnected(true);

      ws.onmessage = (e) => {
        try {
          const data: Reading = JSON.parse(e.data);
          const time = new Date().toLocaleTimeString();
          setLatest(data);
          setLastTime(time);
          // extract only numeric sensor values
          const values: Record<string, number> = {};
          for (const [k, v] of Object.entries(data)) {
            if (k !== 'timestamp' && typeof v === 'number') values[k] = v;
          }
          setHistory(prev => {
            const entry: HistoryEntry = { time, values };
            const next = [...prev, entry];
            return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next;
          });
        } catch { /* ignore bad frames */ }
      };

      ws.onclose = () => {
        setConnected(false);
        reconnectTimer = setTimeout(connect, 3000); // auto-reconnect
      };

      ws.onerror = () => ws.close();
    }

    connect();
    return () => {
      clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, []);

  // All numeric keys except timestamp
  const sensorKeys = latest
    ? Object.keys(latest).filter(k => k !== 'timestamp' && typeof (latest as any)[k] === 'number')
    : [];

  const COLORS: Record<string, string> = {
    pressure: '#2463eb',
    temperature: '#f97316',
    flow_rate: '#06d6f5',
    humidity: '#8b5cf6',
    airflow: '#22c55e',
  };
  const UNITS: Record<string, string> = {
    pressure: 'hPa',
    temperature: '°C',
    flow_rate: 'm/s',
    humidity: '%',
    airflow: '',
  };
  const ICONS: Record<string, string> = {
    pressure: '🌡️',
    temperature: '🌡️',
    flow_rate: '💨',
    humidity: '💧',
    airflow: '📡',
  };

  return (
    <div style={s.page}>
      {/* NAV */}
      <nav style={s.nav}>
        <div style={s.navLeft}>
          <span style={s.logo}>⚡ AeroAuth</span>
          <span style={s.badge}>Live IoT</span>
        </div>
        <button onClick={() => navigate('/dashboard')} style={s.backBtn}>← Dashboard</button>
      </nav>

      <main style={s.main}>
        {/* Status */}
        <div style={s.statusBar}>
          <span style={{ ...s.dot, background: connected ? '#22c55e' : '#ef4444',
            boxShadow: connected ? '0 0 8px #22c55e' : 'none' }} />
          <span style={s.statusTxt}>
            {connected ? 'Connected — waiting for data' : 'Connecting...'}
          </span>
          {lastTime && <span style={s.updatedTxt}>Last reading: {lastTime}</span>}
        </div>

        {/* Metric cards */}
        {sensorKeys.length > 0 ? (
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
        ) : (
          <div style={s.waiting}>
            <div style={s.pulse} />
            <p style={s.waitingTxt}>Waiting for Arduino data...</p>
            <p style={s.waitingHint}>
              Make sure your Arduino/ESP is sending POST to:<br />
              <code style={s.code}>http://&lt;your-pc-ip&gt;:8000/iot/data</code>
            </p>
            <pre style={s.pre}>{`// Arduino JSON body:
{
  "pressure": 101.3,
  "temperature": 25.0,
  "flow_rate": 1.2,
  "humidity": 60.0
}`}</pre>
          </div>
        )}

        {/* Live charts */}
        {history.length > 1 && (
          <div style={s.chartsGrid}>
            {sensorKeys.map(k => (
              <MiniChart
                key={k}
                label={`${k.replace(/_/g, ' ')} ${UNITS[k] ? `(${UNITS[k]})` : ''}`}
                color={COLORS[k] ?? '#6b7280'}
                data={history.map(r => ({ t: r.time, v: r.values[k] ?? 0 }))}
              />
            ))}
          </div>
        )}

        {/* Live table */}
        {history.length > 0 && (
          <div style={s.tableCard}>
            <h3 style={s.tableTitle}>Live Feed <span style={s.count}>{history.length} readings</span></h3>
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
                    <tr key={i} style={{ ...s.tr, background: i === 0 ? '#f0f7ff' : 'transparent' }}>
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
      </main>
    </div>
  );
}

// ── Metric card ──
function MetricCard({ label, value, unit, color, icon }: {
  label: string; value: number; unit: string; color: string; icon: string;
}) {
  return (
    <div style={{ ...s.metricCard, borderTop: `3px solid ${color}` }}>
      <div style={s.metricIcon}>{icon}</div>
      <div style={{ ...s.metricValue, color }}>{Number(value).toFixed(2)}</div>
      {unit && <div style={{ ...s.metricUnit, color }}>{unit}</div>}
      <div style={s.metricLabel}>{label}</div>
    </div>
  );
}

// ── SVG sparkline chart ──
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
        <span style={{ ...s.chartCurrent, color }}>{last.v.toFixed(2)}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 72 }}>
        <defs>
          <linearGradient id={`g${label}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#g${label})`} />
        <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={x(data.length - 1)} cy={y(last.v)} r="3.5" fill={color} />
      </svg>
      <div style={s.chartRange}>
        <span>{min.toFixed(1)}</span><span>{max.toFixed(1)}</span>
      </div>
    </div>
  );
}

// ── Styles ──
const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#f1f5f9', fontFamily: 'Arial, sans-serif' },
  nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px', background: '#fff', boxShadow: '0 1px 8px rgba(0,0,0,.07)' },
  navLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  logo: { fontSize: 20, fontWeight: 800, color: '#1e3a8a' },
  badge: { fontSize: 12, padding: '4px 10px', borderRadius: 999, background: '#dbeafe', color: '#1d4ed8', fontWeight: 700 },
  backBtn: { padding: '8px 16px', background: '#1e3a8a', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 },
  main: { maxWidth: 1100, margin: '0 auto', padding: '28px 24px' },
  statusBar: { display: 'flex', alignItems: 'center', gap: 10, background: '#fff', padding: '10px 16px', borderRadius: 10, marginBottom: 24, boxShadow: '0 1px 6px rgba(0,0,0,.06)', flexWrap: 'wrap' as const },
  dot: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0, transition: 'background .3s' },
  statusTxt: { fontSize: 13, fontWeight: 700, color: '#111827' },
  updatedTxt: { fontSize: 12, color: '#6b7280', marginLeft: 'auto' },
  cards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16, marginBottom: 28 },
  metricCard: { background: '#fff', borderRadius: 12, padding: '20px 16px', boxShadow: '0 2px 10px rgba(0,0,0,.06)', textAlign: 'center' as const },
  metricIcon: { fontSize: 26, marginBottom: 8 },
  metricValue: { fontSize: 28, fontWeight: 800, lineHeight: 1 },
  metricUnit: { fontSize: 13, fontWeight: 600, marginTop: 2 },
  metricLabel: { fontSize: 11, color: '#6b7280', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 1, marginTop: 6 },
  chartsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, marginBottom: 28 },
  chartCard: { background: '#fff', borderRadius: 12, padding: '14px 16px', boxShadow: '0 2px 10px rgba(0,0,0,.06)' },
  chartHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  chartLabel: { fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase' as const, letterSpacing: 1 },
  chartCurrent: { fontSize: 16, fontWeight: 800 },
  chartRange: { display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9ca3af', marginTop: 2 },
  tableCard: { background: '#fff', borderRadius: 12, padding: '20px 24px', boxShadow: '0 2px 10px rgba(0,0,0,.06)' },
  tableTitle: { fontSize: 16, fontWeight: 800, color: '#111827', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 10 },
  count: { fontSize: 12, background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: 999, fontWeight: 600 },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 },
  th: { textAlign: 'left' as const, padding: '8px 12px', background: '#f9fafb', color: '#6b7280', fontWeight: 700, fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: 1, borderBottom: '1px solid #e5e7eb' },
  tr: { borderBottom: '1px solid #f3f4f6', transition: 'background .2s' },
  td: { padding: '7px 12px', color: '#111827' },
  waiting: { textAlign: 'center' as const, padding: '60px 20px', background: '#fff', borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,.06)', marginBottom: 24 },
  pulse: { width: 48, height: 48, borderRadius: '50%', background: '#dbeafe', margin: '0 auto 16px', animation: 'pulse 1.5s ease-in-out infinite' },
  waitingTxt: { fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 8px' },
  waitingHint: { fontSize: 13, color: '#6b7280', lineHeight: 1.8, margin: '0 0 12px' },
  code: { display: 'inline-block', background: '#f1f5f9', padding: '2px 8px', borderRadius: 6, color: '#1d4ed8', fontSize: 13 },
  pre: { background: '#0f172a', color: '#e2e8f0', padding: '12px 16px', borderRadius: 8, fontSize: 12, textAlign: 'left' as const, display: 'inline-block', marginTop: 8 },
};
