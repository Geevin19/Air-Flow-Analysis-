import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, simulationAPI } from '../services/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [simulations, setSimulations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userRes, simsRes] = await Promise.all([
          authAPI.getCurrentUser(),
          simulationAPI.getSimulations(),
        ]);
        setUser(userRes.data);
        setSimulations(simsRes.data);
      } catch (err) {
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this simulation?')) return;
    try {
      await simulationAPI.deleteSimulation(id);
      setSimulations(simulations.filter(s => s.id !== id));
    } catch (err) {
      alert('Failed to delete');
    }
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <nav style={styles.nav}>
        <h1 style={styles.logo}>SmartTracker</h1>
        <div style={styles.navRight}>
          <span style={styles.username}>{user?.username}</span>
          <button style={styles.logoutBtn} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </nav>

      <main style={styles.main}>
        <div style={styles.header}>
          <h2 style={styles.title}>Dashboard</h2>
          <button style={styles.newBtn} onClick={() => navigate('/simulation')}>
            New Simulation
          </button>
        </div>

        <div style={styles.stats}>
          <div style={styles.statCard}>
            <div style={styles.statNumber}>{simulations.length}</div>
            <div style={styles.statLabel}>Total Simulations</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statNumber}>
              {simulations.filter(s => s.results).length}
            </div>
            <div style={styles.statLabel}>Completed</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statNumber}>
              {simulations.filter(s => !s.results).length}
            </div>
            <div style={styles.statLabel}>Pending</div>
          </div>
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Simulations</h3>
          {simulations.length === 0 ? (
            <div style={styles.empty}>
              <p style={styles.emptyText}>No simulations yet</p>
              <p style={styles.emptySub}>Create your first simulation</p>
            </div>
          ) : (
            <div style={styles.grid}>
              {simulations.map(sim => (
                <div
                  key={sim.id}
                  style={styles.card}
                  onClick={() => navigate(`/simulation?id=${sim.id}`)}
                >
                  <div style={styles.cardHeader}>
                    <h4 style={styles.cardTitle}>{sim.name}</h4>
                    <button
                      style={styles.deleteBtn}
                      onClick={(e) => handleDelete(sim.id, e)}
                    >
                      ×
                    </button>
                  </div>
                  <div style={styles.cardDate}>
                    {new Date(sim.created_at).toLocaleDateString()}
                  </div>
                  <div style={styles.cardStatus}>
                    {sim.results ? (
                      <span style={styles.statusDone}>Completed</span>
                    ) : (
                      <span style={styles.statusPending}>Pending</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <footer style={styles.footer}>
        <span>© 2026 SmartTracker</span>
      </footer>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#fff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  loading: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#fff',
  },
  spinner: {
    fontSize: '16px',
    color: '#0066FF',
  },
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px 48px',
    borderBottom: '1px solid #0066FF',
  },
  logo: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#0066FF',
    margin: 0,
  },
  navRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
  },
  username: {
    fontSize: '15px',
    color: '#000',
  },
  logoutBtn: {
    padding: '8px 20px',
    background: '#0066FF',
    color: '#fff',
    border: 'none',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.2s',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  main: {
    flex: 1,
    padding: '48px',
    maxWidth: '1400px',
    margin: '0 auto',
    width: '100%',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '48px',
  },
  title: {
    fontSize: '48px',
    fontWeight: 700,
    color: '#000',
    margin: 0,
    letterSpacing: '-1px',
  },
  newBtn: {
    padding: '14px 32px',
    background: '#0066FF',
    color: '#fff',
    border: 'none',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.2s',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1px',
    background: '#0066FF',
    marginBottom: '64px',
  },
  statCard: {
    background: '#fff',
    padding: '32px',
    textAlign: 'center',
  },
  statNumber: {
    fontSize: '48px',
    fontWeight: 700,
    color: '#0066FF',
    marginBottom: '8px',
  },
  statLabel: {
    fontSize: '13px',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  section: {
    marginBottom: '48px',
  },
  sectionTitle: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#000',
    marginBottom: '32px',
  },
  empty: {
    textAlign: 'center',
    padding: '80px 20px',
    border: '1px solid #ddd',
  },
  emptyText: {
    fontSize: '18px',
    color: '#000',
    margin: '0 0 8px 0',
  },
  emptySub: {
    fontSize: '14px',
    color: '#666',
    margin: 0,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '1px',
    background: '#0066FF',
  },
  card: {
    background: '#fff',
    padding: '24px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#000',
    margin: 0,
  },
  deleteBtn: {
    width: '28px',
    height: '28px',
    background: 'transparent',
    border: '1px solid #ddd',
    color: '#666',
    fontSize: '20px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  },
  cardDate: {
    fontSize: '13px',
    color: '#666',
    marginBottom: '16px',
  },
  cardStatus: {
    marginTop: '12px',
  },
  statusDone: {
    display: 'inline-block',
    padding: '4px 12px',
    background: 'transparent',
    border: '1px solid #0066FF',
    color: '#0066FF',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  statusPending: {
    display: 'inline-block',
    padding: '4px 12px',
    background: 'transparent',
    border: '1px solid #666',
    color: '#666',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  footer: {
    padding: '32px 48px',
    borderTop: '1px solid #0066FF',
    textAlign: 'center',
    color: '#666',
    fontSize: '14px',
  },
};
