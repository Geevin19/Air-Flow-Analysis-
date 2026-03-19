import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, simulationAPI } from '../services/api';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [simulations, setSimulations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllRecent, setShowAllRecent] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const [userResponse, simulationsResponse] = await Promise.all([
        authAPI.getCurrentUser(),
        simulationAPI.getAll(),
      ]);

      setUser(userResponse.data);
      setSimulations(simulationsResponse.data);
    } catch (error) {
      console.error('Error loading data:', error);
      localStorage.removeItem('token');
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}>Loading...</div>
      </div>
    );
  }

  const recentCount = showAllRecent ? simulations.length : Math.min(4, simulations.length);
  const simulationsToShow = useMemo(() => {
    if (showAllRecent) return simulations;
    return simulations.slice(0, recentCount);
  }, [recentCount, simulations, showAllRecent]);

  return (
    <div style={styles.container}>
      <nav style={styles.nav}>
        <h1 style={styles.logo}>SmartTracker</h1>
        <div style={styles.navRight}>
          <span style={styles.username}>Welcome, {user?.username}</span>
          <button onClick={handleLogout} style={styles.logoutButton}>
            Logout
          </button>
        </div>
      </nav>

      <main style={styles.main}>
        <div style={styles.header}>
          <h2 style={styles.title}>Dashboard</h2>
          <button style={styles.newButton}>+ New Simulation</button>
        </div>

        <div style={styles.stats}>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>📊</div>
            <div>
              <div style={styles.statValue}>{simulations.length}</div>
              <div style={styles.statLabel}>Total Simulations</div>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statIcon}>✅</div>
            <div>
              <div style={styles.statValue}>
                {simulations.filter(s => s.results).length}
              </div>
              <div style={styles.statLabel}>Completed</div>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statIcon}>👤</div>
            <div>
              <div style={styles.statValue}>{user?.purpose || 'N/A'}</div>
              <div style={styles.statLabel}>Purpose</div>
            </div>
          </div>
        </div>

        <div style={styles.section}>
          <div style={styles.sectionHeaderRow}>
            <h3 style={styles.sectionTitle}>Recent Simulations</h3>
            {simulations.length > 0 ? (
              <button
                style={styles.toggleButton}
                onClick={() => setShowAllRecent((v) => !v)}
                aria-label="Toggle recent simulations list"
              >
                {showAllRecent ? 'Show less' : `Show all (${simulations.length})`}
              </button>
            ) : null}
          </div>

          {simulations.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyText}>No simulations yet</p>
              <p style={styles.emptySubtext}>Create your first simulation to get started</p>
            </div>
          ) : (
            <div
              style={{
                ...styles.simulationGrid,
                maxHeight: showAllRecent ? 'none' : 380,
                overflowY: showAllRecent ? 'visible' : 'auto',
                paddingRight: showAllRecent ? 0 : 6,
              }}
            >
              {simulationsToShow.map((sim) => (
                <div key={sim.id} style={styles.simulationCard}>
                  <h4 style={styles.simulationName}>{sim.name}</h4>
                  <p style={styles.simulationDate}>
                    {new Date(sim.created_at).toLocaleDateString()}
                  </p>
                  <div style={styles.simulationStatus}>
                    {sim.results ? (
                      <span style={styles.statusCompleted}>✓ Completed</span>
                    ) : (
                      <span style={styles.statusPending}>⏳ Pending</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <footer style={styles.footer}>
        <div style={styles.footerInner}>
          <div style={styles.footerSection}>
            <div style={styles.footerSectionHeader}>
              <div style={styles.footerSectionTitle}>Simulation (Raw Inputs)</div>
              <div style={styles.footerSectionSubtitle}>Run simulation using manual/raw parameter values</div>
            </div>
            <button onClick={() => navigate('/simulation')} style={styles.footerButton}>
              Open Simulation
            </button>
          </div>

          <div style={styles.footerDivider} />

          <div style={styles.footerSection}>
            <div style={styles.footerSectionHeader}>
              <div style={styles.footerSectionTitle}>Live IoT Sensor Data</div>
              <div style={styles.footerSectionSubtitle}>Use real sensor feed (or paste sensor JSON for now)</div>
            </div>
            <button onClick={() => navigate('/iot-live')} style={styles.footerButtonAlt}>
              Open Live IoT
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#f8f9fa',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    fontSize: '20px',
    color: '#667eea',
  },
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 40px',
    backgroundColor: 'white',
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
  },
  logo: {
    fontSize: '24px',
    fontWeight: 'bold',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0,
  },
  navRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  username: {
    fontSize: '16px',
    color: '#333',
  },
  logoutButton: {
    padding: '8px 20px',
    backgroundColor: '#f44336',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
  },
  main: {
    flex: 1,
    padding: '40px',
    maxWidth: '1400px',
    margin: '0 auto',
    width: '100%',
    paddingBottom: '120px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#1a1a1a',
    margin: 0,
  },
  newButton: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '40px',
  },
  statCard: {
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
  },
  statIcon: {
    fontSize: '40px',
  },
  statValue: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  statLabel: {
    fontSize: '14px',
    color: '#666',
    marginTop: '4px',
  },
  section: {
    background: 'linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(246,247,255,1) 100%)',
    padding: '30px',
    borderRadius: '12px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: '20px',
  },
  sectionHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 12,
    marginBottom: '12px',
  },
  toggleButton: {
    padding: '8px 12px',
    background: 'linear-gradient(135deg, rgba(102,126,234,0.15) 0%, rgba(118,75,162,0.15) 100%)',
    color: '#3949ab',
    border: '1px solid rgba(102,126,234,0.25)',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 800,
    cursor: 'pointer',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
  },
  emptyText: {
    fontSize: '18px',
    color: '#666',
    margin: '0 0 8px 0',
  },
  emptySubtext: {
    fontSize: '14px',
    color: '#999',
    margin: 0,
  },
  simulationGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
  },
  simulationCard: {
    padding: '20px',
    border: '1px solid #e6e9f2',
    borderRadius: '10px',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
    boxShadow: '0 8px 22px rgba(0,0,0,0.03)',
  },
  simulationName: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1a1a1a',
    margin: '0 0 8px 0',
  },
  simulationDate: {
    fontSize: '14px',
    color: '#666',
    margin: '0 0 12px 0',
  },
  simulationStatus: {
    marginTop: '12px',
  },
  statusCompleted: {
    padding: '4px 12px',
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
  },
  statusPending: {
    padding: '4px 12px',
    backgroundColor: '#fff3e0',
    color: '#f57c00',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
  },

  footer: {
    backgroundColor: 'white',
    borderTop: '1px solid #e9ecef',
    padding: '20px 40px',
  },
  footerInner: {
    maxWidth: '1400px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr',
    gap: '24px',
    alignItems: 'center',
  },
  footerDivider: {
    width: '1px',
    height: '52px',
    backgroundColor: '#e9ecef',
    justifySelf: 'center',
  },
  footerSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
  },
  footerSectionHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  footerSectionTitle: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#1a1a1a',
  },
  footerSectionSubtitle: {
    fontSize: '12px',
    color: '#6c757d',
  },
  footerButton: {
    padding: '10px 14px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 700,
    whiteSpace: 'nowrap',
  },
  footerButtonAlt: {
    padding: '10px 14px',
    backgroundColor: '#1a1a1a',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 700,
    whiteSpace: 'nowrap',
  },
};
