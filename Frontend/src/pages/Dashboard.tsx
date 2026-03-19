import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, simulationAPI } from '../services/api';

type Theme = 'light' | 'dark';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [simulations, setSimulations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllRecent, setShowAllRecent] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as Theme) || 'light';
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

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
    } catch (error: any) {
      console.error('Error loading data:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleSimulationClick = (simId: number) => {
    navigate(`/simulation?id=${simId}`);
  };

  const handleDeleteSimulation = async (simId: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    
    if (!window.confirm('Are you sure you want to delete this simulation?')) {
      return;
    }

    try {
      await simulationAPI.delete(simId);
      // Refresh the simulations list
      setSimulations(prev => prev.filter(s => s.id !== simId));
    } catch (error: any) {
      console.error('Error deleting simulation:', error);
      alert('Failed to delete simulation: ' + (error.response?.data?.detail || error.message));
    }
  };

  const recentCount = showAllRecent ? simulations.length : Math.min(4, simulations.length);
  const simulationsToShow = useMemo(() => {
    if (showAllRecent) return simulations;
    return simulations.slice(0, recentCount);
  }, [recentCount, simulations, showAllRecent]);

  if (loading) {
    const styles = getStyles(theme);
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}>
          <div style={styles.spinnerRing}></div>
          <div style={styles.spinnerText}>Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    const styles = getStyles(theme);
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}>Error loading user data. Please try logging in again.</div>
      </div>
    );
  }

  const styles = getStyles(theme);

  return (
    <div style={styles.container}>
      <nav style={styles.nav}>
        <div style={styles.navLeft}>
          <h1 style={styles.logo}>SmartTracker</h1>
          <span style={styles.badge}>Dashboard</span>
        </div>
        <div style={styles.navRight}>
          <button onClick={toggleTheme} style={styles.themeToggle} aria-label="Toggle theme">
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <span style={styles.username}>Welcome, {user?.username}</span>
          <button onClick={handleLogout} style={styles.logoutButton}>
            Logout
          </button>
        </div>
      </nav>

      <main style={styles.main}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Dashboard</h2>
            <p style={styles.subtitle}>Monitor and manage your simulations</p>
          </div>
          <button style={styles.newButton} onClick={() => navigate('/simulation')}>
            <span style={styles.buttonIcon}>+</span> New Simulation
          </button>
        </div>

        <div style={styles.stats}>
          <div style={styles.statCard}>
            <div style={styles.statIconWrapper}>
              <div style={styles.statIcon}>📊</div>
            </div>
            <div style={styles.statContent}>
              <div style={styles.statValue}>{simulations.length}</div>
              <div style={styles.statLabel}>Total Simulations</div>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statIconWrapper}>
              <div style={styles.statIcon}>✅</div>
            </div>
            <div style={styles.statContent}>
              <div style={styles.statValue}>
                {simulations.filter(s => s.results).length}
              </div>
              <div style={styles.statLabel}>Completed</div>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statIconWrapper}>
              <div style={styles.statIcon}>⏳</div>
            </div>
            <div style={styles.statContent}>
              <div style={styles.statValue}>
                {simulations.filter(s => !s.results).length}
              </div>
              <div style={styles.statLabel}>Pending</div>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statIconWrapper}>
              <div style={styles.statIcon}>👤</div>
            </div>
            <div style={styles.statContent}>
              <div style={styles.statValue}>{user?.purpose || 'N/A'}</div>
              <div style={styles.statLabel}>Purpose</div>
            </div>
          </div>
        </div>

        <div style={styles.section}>
          <div style={styles.sectionHeaderRow}>
            <h3 style={styles.sectionTitle}>Recent Simulations</h3>
            {simulations.length > 4 && (
              <button
                style={styles.toggleButton}
                onClick={() => setShowAllRecent((v) => !v)}
                aria-label="Toggle recent simulations list"
              >
                {showAllRecent ? 'Show less' : `Show all (${simulations.length})`}
              </button>
            )}
          </div>

          {simulations.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>📊</div>
              <p style={styles.emptyText}>No simulations yet</p>
              <p style={styles.emptySubtext}>Create your first simulation to get started</p>
              <button style={styles.emptyButton} onClick={() => navigate('/simulation')}>
                Create Simulation
              </button>
            </div>
          ) : (
            <div style={styles.simulationGrid}>
              {simulationsToShow.map((sim) => (
                <div 
                  key={sim.id} 
                  style={styles.simulationCard}
                  onClick={() => handleSimulationClick(sim.id)}
                  role="button"
                  tabIndex={0}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleSimulationClick(sim.id);
                    }
                  }}
                >
                  <div style={styles.cardHeader}>
                    <h4 style={styles.simulationName}>{sim.name}</h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={styles.simulationStatus}>
                        {sim.results ? (
                          <span style={styles.statusCompleted}>✓ Completed</span>
                        ) : (
                          <span style={styles.statusPending}>⏳ Pending</span>
                        )}
                      </div>
                      <button
                        onClick={(e) => handleDeleteSimulation(sim.id, e)}
                        style={styles.deleteButton}
                        aria-label="Delete simulation"
                        title="Delete simulation"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  <p style={styles.simulationDate}>
                    {new Date(sim.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                  {sim.results && (
                    <div style={styles.simulationMeta}>
                      <span style={styles.metaItem}>
                        Mean: {Number(sim.results.mean).toFixed(2)}
                      </span>
                      <span style={styles.metaItem}>
                        Median: {Number(sim.results.median).toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div style={styles.cardFooter}>
                    <span style={styles.viewDetails}>View Details →</span>
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

function getStyles(theme: Theme): { [key: string]: React.CSSProperties } {
  const isDark = theme === 'dark';
  
  return {
    container: {
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: isDark ? '#0f1419' : '#f8f9fa',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      transition: 'background-color 0.3s ease',
    },
    loadingContainer: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? '#0f1419' : '#f8f9fa',
    },
    spinner: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '16px',
    },
    spinnerRing: {
      width: '48px',
      height: '48px',
      border: '4px solid',
      borderColor: isDark ? '#667eea40' : '#667eea20',
      borderTopColor: '#667eea',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
    },
    spinnerText: {
      fontSize: '16px',
      color: isDark ? '#a0aec0' : '#667eea',
      fontWeight: '600',
    },
    nav: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '20px 40px',
      backgroundColor: isDark ? '#1a1f2e' : 'white',
      boxShadow: isDark ? '0 2px 20px rgba(0,0,0,0.3)' : '0 2px 10px rgba(0,0,0,0.05)',
      borderBottom: isDark ? '1px solid #2d3748' : 'none',
      transition: 'all 0.3s ease',
    },
    navLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
    },
    logo: {
      fontSize: '26px',
      fontWeight: '800',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      margin: 0,
      letterSpacing: '-0.5px',
    },
    badge: {
      fontSize: '12px',
      padding: '6px 12px',
      borderRadius: '20px',
      backgroundColor: isDark ? '#667eea20' : '#eef2ff',
      color: isDark ? '#a5b4fc' : '#3949ab',
      fontWeight: '700',
      border: isDark ? '1px solid #667eea40' : 'none',
    },
    navRight: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
    },
    themeToggle: {
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      border: 'none',
      backgroundColor: isDark ? '#2d3748' : '#f3f4f6',
      cursor: 'pointer',
      fontSize: '18px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s ease',
      boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
    },
    username: {
      fontSize: '15px',
      color: isDark ? '#e2e8f0' : '#333',
      fontWeight: '600',
    },
    logoutButton: {
      padding: '10px 20px',
      backgroundColor: isDark ? '#dc2626' : '#f44336',
      color: 'white',
      border: 'none',
      borderRadius: '10px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '700',
      transition: 'all 0.2s ease',
      boxShadow: '0 2px 8px rgba(244, 67, 54, 0.3)',
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
      alignItems: 'flex-start',
      marginBottom: '32px',
    },
    title: {
      fontSize: '36px',
      fontWeight: '800',
      color: isDark ? '#f7fafc' : '#1a1a1a',
      margin: '0 0 8px 0',
      letterSpacing: '-1px',
    },
    subtitle: {
      fontSize: '16px',
      color: isDark ? '#a0aec0' : '#6c757d',
      margin: 0,
    },
    newButton: {
      padding: '14px 28px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      border: 'none',
      borderRadius: '12px',
      cursor: 'pointer',
      fontSize: '16px',
      fontWeight: '700',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      boxShadow: '0 4px 16px rgba(102, 126, 234, 0.4)',
      transition: 'all 0.2s ease',
    },
    buttonIcon: {
      fontSize: '20px',
      fontWeight: '400',
    },
    stats: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
      gap: '20px',
      marginBottom: '40px',
    },
    statCard: {
      backgroundColor: isDark ? '#1a1f2e' : 'white',
      padding: '24px',
      borderRadius: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '20px',
      boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 2px 10px rgba(0,0,0,0.05)',
      border: isDark ? '1px solid #2d3748' : 'none',
      transition: 'all 0.3s ease',
    },
    statIconWrapper: {
      width: '56px',
      height: '56px',
      borderRadius: '14px',
      background: isDark 
        ? 'linear-gradient(135deg, rgba(102,126,234,0.2) 0%, rgba(118,75,162,0.2) 100%)'
        : 'linear-gradient(135deg, rgba(102,126,234,0.1) 0%, rgba(118,75,162,0.1) 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: isDark ? '1px solid #667eea40' : 'none',
    },
    statIcon: {
      fontSize: '28px',
    },
    statContent: {
      flex: 1,
    },
    statValue: {
      fontSize: '32px',
      fontWeight: '800',
      color: isDark ? '#f7fafc' : '#1a1a1a',
      lineHeight: 1,
      marginBottom: '6px',
    },
    statLabel: {
      fontSize: '14px',
      color: isDark ? '#a0aec0' : '#666',
      fontWeight: '600',
    },
    section: {
      background: isDark 
        ? 'linear-gradient(180deg, #1a1f2e 0%, #151a27 100%)'
        : 'linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(246,247,255,1) 100%)',
      padding: '32px',
      borderRadius: '16px',
      boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 2px 10px rgba(0,0,0,0.05)',
      border: isDark ? '1px solid #2d3748' : 'none',
    },
    sectionTitle: {
      fontSize: '22px',
      fontWeight: '800',
      color: isDark ? '#f7fafc' : '#1a1a1a',
      margin: 0,
    },
    sectionHeaderRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px',
    },
    toggleButton: {
      padding: '10px 16px',
      background: isDark 
        ? 'linear-gradient(135deg, rgba(102,126,234,0.2) 0%, rgba(118,75,162,0.2) 100%)'
        : 'linear-gradient(135deg, rgba(102,126,234,0.15) 0%, rgba(118,75,162,0.15) 100%)',
      color: isDark ? '#a5b4fc' : '#3949ab',
      border: isDark ? '1px solid #667eea40' : '1px solid rgba(102,126,234,0.25)',
      borderRadius: '999px',
      fontSize: '13px',
      fontWeight: '800',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    },
    emptyState: {
      textAlign: 'center',
      padding: '80px 20px',
    },
    emptyIcon: {
      fontSize: '64px',
      marginBottom: '16px',
      opacity: 0.5,
    },
    emptyText: {
      fontSize: '20px',
      color: isDark ? '#a0aec0' : '#666',
      margin: '0 0 8px 0',
      fontWeight: '600',
    },
    emptySubtext: {
      fontSize: '15px',
      color: isDark ? '#718096' : '#999',
      margin: '0 0 24px 0',
    },
    emptyButton: {
      padding: '12px 24px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      border: 'none',
      borderRadius: '10px',
      cursor: 'pointer',
      fontSize: '15px',
      fontWeight: '700',
      boxShadow: '0 4px 16px rgba(102, 126, 234, 0.4)',
    },
    simulationGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
      gap: '20px',
    },
    simulationCard: {
      padding: '24px',
      border: isDark ? '1px solid #2d3748' : '1px solid #e6e9f2',
      borderRadius: '14px',
      transition: 'all 0.2s ease',
      backgroundColor: isDark ? '#1a1f2e' : 'white',
      cursor: 'pointer',
      boxShadow: isDark ? '0 2px 12px rgba(0,0,0,0.2)' : '0 2px 12px rgba(0,0,0,0.03)',
    },
    cardHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '12px',
      gap: '12px',
    },
    simulationName: {
      fontSize: '18px',
      fontWeight: '700',
      color: isDark ? '#f7fafc' : '#1a1a1a',
      margin: 0,
      flex: 1,
    },
    deleteButton: {
      width: '32px',
      height: '32px',
      borderRadius: '8px',
      border: 'none',
      backgroundColor: isDark ? '#7f1d1d20' : '#ffebee',
      cursor: 'pointer',
      fontSize: '14px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s ease',
      flexShrink: 0,
    } as React.CSSProperties,
    simulationDate: {
      fontSize: '13px',
      color: isDark ? '#a0aec0' : '#666',
      margin: '0 0 16px 0',
      fontWeight: '500',
    },
    simulationStatus: {
      flexShrink: 0,
    },
    statusCompleted: {
      padding: '6px 12px',
      backgroundColor: isDark ? '#065f4620' : '#e8f5e9',
      color: isDark ? '#34d399' : '#2e7d32',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '700',
      border: isDark ? '1px solid #065f4640' : 'none',
    },
    statusPending: {
      padding: '6px 12px',
      backgroundColor: isDark ? '#78350f20' : '#fff3e0',
      color: isDark ? '#fbbf24' : '#f57c00',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '700',
      border: isDark ? '1px solid #78350f40' : 'none',
    },
    simulationMeta: {
      display: 'flex',
      gap: '16px',
      marginBottom: '12px',
      paddingTop: '12px',
      borderTop: isDark ? '1px solid #2d3748' : '1px solid #f0f0f0',
    },
    metaItem: {
      fontSize: '13px',
      color: isDark ? '#a0aec0' : '#666',
      fontWeight: '600',
    },
    cardFooter: {
      paddingTop: '12px',
      borderTop: isDark ? '1px solid #2d3748' : '1px solid #f0f0f0',
    },
    viewDetails: {
      fontSize: '14px',
      color: '#667eea',
      fontWeight: '700',
    },
    footer: {
      backgroundColor: isDark ? '#1a1f2e' : 'white',
      borderTop: isDark ? '1px solid #2d3748' : '1px solid #e9ecef',
      padding: '24px 40px',
      boxShadow: isDark ? '0 -2px 20px rgba(0,0,0,0.3)' : 'none',
    },
    footerInner: {
      maxWidth: '1400px',
      margin: '0 auto',
      display: 'grid',
      gridTemplateColumns: '1fr auto 1fr',
      gap: '32px',
      alignItems: 'center',
    },
    footerDivider: {
      width: '1px',
      height: '60px',
      backgroundColor: isDark ? '#2d3748' : '#e9ecef',
      justifySelf: 'center',
    },
    footerSection: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '20px',
    },
    footerSectionHeader: {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
    },
    footerSectionTitle: {
      fontSize: '15px',
      fontWeight: '800',
      color: isDark ? '#f7fafc' : '#1a1a1a',
    },
    footerSectionSubtitle: {
      fontSize: '13px',
      color: isDark ? '#a0aec0' : '#6c757d',
      fontWeight: '500',
    },
    footerButton: {
      padding: '12px 20px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      border: 'none',
      borderRadius: '10px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '800',
      whiteSpace: 'nowrap',
      boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
      transition: 'all 0.2s ease',
    },
    footerButtonAlt: {
      padding: '12px 20px',
      backgroundColor: isDark ? '#2d3748' : '#1a1a1a',
      color: 'white',
      border: 'none',
      borderRadius: '10px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '800',
      whiteSpace: 'nowrap',
      boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.2)',
      transition: 'all 0.2s ease',
    },
  };
}
