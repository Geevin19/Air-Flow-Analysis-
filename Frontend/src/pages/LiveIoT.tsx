import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LiveIoT() {
  const navigate = useNavigate();
  const [rawJson, setRawJson] = useState(
    JSON.stringify(
      {
        sensor_id: 'demo-001',
        timestamp: new Date().toISOString(),
        pressure: 101.3,
        temperature: 25.0,
        flow_rate: 1.2,
      },
      null,
      2,
    ),
  );

  const parsed = useMemo(() => {
    try {
      return JSON.parse(rawJson);
    } catch {
      return null;
    }
  }, [rawJson]);

  return (
    <div style={styles.container}>
      <nav style={styles.nav}>
        <div style={styles.navLeft}>
          <h1 style={styles.logo}>SmartTracker</h1>
          <span style={styles.badge}>Live IoT • Sensor Data</span>
        </div>
        <button onClick={() => navigate('/dashboard')} style={styles.backButton}>
          Back to Dashboard
        </button>
      </nav>

      <main style={styles.main}>
        <div style={styles.card}>
          <h2 style={styles.title}>Live IoT Sensor Data</h2>
          <p style={styles.subtitle}>
            This project currently has no backend endpoint for live sensor streaming. Use this page as the place to wire
            MQTT/WebSocket/HTTP ingestion later. For now, you can paste a sample sensor JSON payload to preview what the UI
            would display.
          </p>

          <div style={styles.statusRow}>
            <div style={styles.statusDot} />
            <div style={styles.statusText}>Not connected</div>
          </div>

          <div style={styles.formRow}>
            <label style={styles.label}>Sensor payload (JSON)</label>
            <textarea
              value={rawJson}
              onChange={(e) => setRawJson(e.target.value)}
              style={styles.textarea}
              spellCheck={false}
            />
            <div style={styles.hint}>{parsed ? 'JSON looks valid.' : 'Invalid JSON.'}</div>
          </div>
        </div>

        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Preview</h3>
          <pre style={styles.pre}>{JSON.stringify(parsed ?? { error: 'Invalid JSON' }, null, 2)}</pre>
        </div>
      </main>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    background:
      'radial-gradient(circle at 10% 10%, rgba(102,126,234,0.18) 0%, rgba(102,126,234,0) 35%), radial-gradient(circle at 90% 20%, rgba(118,75,162,0.14) 0%, rgba(118,75,162,0) 40%), #f6f7ff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 40px',
    background: 'rgba(255,255,255,0.80)',
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
    border: '1px solid rgba(102,126,234,0.12)',
  },
  navLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logo: {
    fontSize: '24px',
    fontWeight: 'bold',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0,
  },
  badge: {
    fontSize: '12px',
    padding: '6px 10px',
    borderRadius: '999px',
    background: 'linear-gradient(135deg, rgba(102,126,234,0.18) 0%, rgba(118,75,162,0.14) 100%)',
    color: '#3949ab',
    fontWeight: 700,
  },
  backButton: {
    padding: '10px 14px',
    backgroundColor: '#1a1a1a',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 700,
  },
  main: {
    padding: '40px',
    maxWidth: '1000px',
    margin: '0 auto',
  },
  card: {
    backgroundColor: 'white',
    padding: '28px',
    borderRadius: '12px',
    boxShadow: '0 16px 50px rgba(15,23,42,0.08)',
    border: '1px solid rgba(102,126,234,0.12)',
    marginBottom: '20px',
  },
  title: {
    fontSize: '26px',
    margin: '0 0 8px 0',
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: '14px',
    margin: '0 0 16px 0',
    color: '#6c757d',
    lineHeight: 1.6,
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 800,
    margin: '0 0 12px 0',
    color: '#1a1a1a',
  },
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    borderRadius: '10px',
    background:
      'linear-gradient(180deg, rgba(102,126,234,0.10) 0%, rgba(255,255,255,1) 70%)',
    border: '1px solid rgba(102,126,234,0.14)',
    marginBottom: '18px',
  },
  statusDot: {
    width: '10px',
    height: '10px',
    borderRadius: '999px',
    backgroundColor: '#f44336',
  },
  statusText: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#1a1a1a',
  },
  formRow: {
    marginBottom: 0,
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 700,
    color: '#1a1a1a',
    marginBottom: '8px',
  },
  textarea: {
    width: '100%',
    minHeight: '220px',
    padding: '12px 14px',
    border: '1px solid rgba(148,163,184,0.9)',
    borderRadius: '10px',
    fontSize: '13px',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    outline: 'none',
    resize: 'vertical',
  },
  hint: {
    marginTop: '8px',
    fontSize: '12px',
    color: '#6c757d',
  },
  pre: {
    margin: 0,
    padding: '14px',
    backgroundColor: '#0b1020',
    color: '#e6edf3',
    borderRadius: '12px',
    overflowX: 'auto',
    fontSize: '12px',
    lineHeight: 1.5,
  },
};
